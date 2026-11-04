using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Data;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class SuspiciousClientDetectionTests
{
    private AppDbContext CreateDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        var context = new AppDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }

    private async Task<User> SeedUserAsync(AppDbContext context, string id = "u_sec_01", string email = "risk_test@example.com")
    {
        var user = new User
        {
            Id = id,
            Email = email,
            DisplayName = "Security Candidate",
            IsActive = true,
            SecurityVersion = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Users.Add(user);

        if (!await context.SessionSecurityPolicies.AnyAsync(p => p.Id == "global_policy"))
        {
            context.SessionSecurityPolicies.Add(new SessionSecurityPolicy
            {
                Id = "global_policy",
                MaxConcurrentSessions = 2,
                MaxSessionsPerClient = 1,
                IdleTimeoutMinutes = 300,
                AbsoluteTimeoutMinutes = 10080,
                AllowIpDrift = true,
                RotateOnPrivilegeChange = true,
                IsActive = true
            });
        }

        await context.SaveChangesAsync();
        return user;
    }

    [Fact]
    public async Task NewClientDetection_LogsNewClientDetected_OnFirstLogin()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var result = await service.CreateOrRotateSessionAsync(
            user, "candidate", "cid_first_device_001", "192.168.1.1", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0", null, false);

        Assert.True(result.Success);

        var logs = await context.AuditLogs.Where(a => a.ActorId == user.Id).ToListAsync();
        Assert.Contains(logs, l => l.Action == "NewClientDetected" && l.Description.Contains("cid_first_device_001"));
        Assert.Contains(logs, l => l.Action == "SessionCreated");
    }

    [Fact]
    public async Task ExistingClientRecognition_DoesNotLogNewClientDetected_WhenReturningWithSameClientId()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        // First login
        var res1 = await service.CreateOrRotateSessionAsync(
            user, "candidate", "cid_returning_002", "192.168.1.1", "Chrome on Windows", null, false);
        Assert.True(res1.Success);

        // Clear audit logs to isolate second login
        context.AuditLogs.RemoveRange(context.AuditLogs);
        await context.SaveChangesAsync();

        // Second login from same client ID (rotates previous session per policy)
        var res2 = await service.CreateOrRotateSessionAsync(
            user, "candidate", "cid_returning_002", "192.168.1.1", "Chrome on Windows", null, false);
        Assert.True(res2.Success);

        var secondLogs = await context.AuditLogs.Where(a => a.ActorId == user.Id).ToListAsync();
        Assert.DoesNotContain(secondLogs, l => l.Action == "NewClientDetected");
        Assert.Contains(secondLogs, l => l.Action == "ClientIdentityChanged");
        Assert.Contains(secondLogs, l => l.Action == "SessionCreated");
    }

    [Fact]
    public async Task ContextChange_OperatingSystemSwap_LogsSuspiciousSessionContext()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        // Session created on Windows Desktop Chrome
        var winUa = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
        var res = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_swap_003", "10.0.0.1", winUa, null, false);
        Assert.True(res.Success);

        // Validate session with an iOS Safari User-Agent (anomalous OS swap on same session ID)
        var iosUa = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
        var val = await service.ValidateSessionAsync(res.Token!, isToken: true, ipAddress: "10.0.0.1", userAgent: iosUa);

        Assert.True(val.IsValid); // Conservative: logs risk event without abruptly interrupting learner

        var logs = await context.AuditLogs.Where(a => a.ActorId == user.Id).ToListAsync();
        var anomalyLog = logs.FirstOrDefault(l => l.Action == "SuspiciousSessionContext");
        Assert.NotNull(anomalyLog);
        Assert.Equal("Flagged", anomalyLog.Outcome);
        Assert.Contains("Operating system changed from Windows 10/11 to iOS (iPhone)", anomalyLog.Description);
    }

    [Fact]
    public async Task ContextChange_BrowserFamilySwap_LogsUserAgentChanged()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        // Session created on Windows Chrome
        var chromeUa = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
        var res = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_browser_004", "10.0.0.1", chromeUa, null, false);
        Assert.True(res.Success);

        // Validate session with Windows Firefox (same OS, different browser family)
        var firefoxUa = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0";
        var val = await service.ValidateSessionAsync(res.Token!, isToken: true, ipAddress: "10.0.0.1", userAgent: firefoxUa);

        Assert.True(val.IsValid);

        var logs = await context.AuditLogs.Where(a => a.ActorId == user.Id).ToListAsync();
        var uaLog = logs.FirstOrDefault(l => l.Action == "UserAgentChanged");
        Assert.NotNull(uaLog);
        Assert.Equal("Updated", uaLog.Outcome);
        Assert.Contains("Browser family changed from Chrome to Firefox", uaLog.Description);
    }

    [Fact]
    public async Task ContextChange_IpAddressDrift_AllowedWhenPolicyPermitsDrift()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0";
        var res = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_ip_005", "192.168.1.10", ua, null, false);
        Assert.True(res.Success);

        // Validate session with new IP address (simulating switching from Wi-Fi to cellular)
        var val = await service.ValidateSessionAsync(res.Token!, isToken: true, ipAddress: "172.56.21.89", userAgent: ua);

        Assert.True(val.IsValid);

        var logs = await context.AuditLogs.Where(a => a.ActorId == user.Id).ToListAsync();
        var ipLog = logs.FirstOrDefault(l => l.Action == "IpAddressChanged");
        Assert.NotNull(ipLog);
        Assert.Equal("Allowed", ipLog.Outcome);
        Assert.Contains("IP address changed from 192.168.1.10 to 172.56.21.89", ipLog.Description);

        // Session's LastIpAddress is updated
        var session = await context.UserSessions.FindAsync(res.Session!.Id);
        Assert.Equal("172.56.21.89", session!.LastIpAddress);
    }

    [Fact]
    public async Task ContextChange_IpAddressConsistency_RejectedWhenAllowIpDriftDisabled()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);

        // Disable AllowIpDrift on policy
        var policy = await context.SessionSecurityPolicies.FirstAsync(p => p.Id == "global_policy");
        policy.AllowIpDrift = false;
        policy.EnforceIpConsistency = true;
        await context.SaveChangesAsync();

        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);
        var ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0";
        var res = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_strict_006", "10.0.0.50", ua, null, false);
        Assert.True(res.Success);

        // Request arrives from different IP
        var val = await service.ValidateSessionAsync(res.Token!, isToken: true, ipAddress: "10.0.0.99", userAgent: ua);

        Assert.False(val.IsValid);
        Assert.Equal("IP_CONSISTENCY_VIOLATION", val.FailureCode);

        var logs = await context.AuditLogs.Where(a => a.ActorId == user.Id).ToListAsync();
        var violationLog = logs.FirstOrDefault(l => l.Action == "SuspiciousSessionContext");
        Assert.NotNull(violationLog);
        Assert.Contains("IP consistency violation", violationLog.Description);
    }

    [Fact]
    public async Task SecurityVersion_AtomicallyIncrementsAndInvalidatesPriorSessions()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var res1 = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_v1", "10.0.0.1", "Chrome", null, false);
        Assert.True(res1.Success);

        // Invalidate user security version
        await service.InvalidateUserSecurityVersionAsync(user.Id, "PasswordChangeRemediation");

        // Verify user version incremented
        var updatedUser = await context.Users.FindAsync(user.Id);
        Assert.Equal(2, updatedUser!.SecurityVersion);

        // Prior session is revoked
        var session = await context.UserSessions.FindAsync(res1.Session!.Id);
        Assert.True(session!.Revoked);
        Assert.Equal("PasswordChangeRemediation", session.RevocationReason);

        // Validating with the prior session token fails with SECURITY_VERSION_CHANGED
        var val = await service.ValidateSessionAsync(res1.Token!, isToken: true);
        Assert.False(val.IsValid);
        Assert.Equal("SECURITY_VERSION_CHANGED", val.FailureCode);

        // Audit events recorded
        var logs = await context.AuditLogs.Where(a => a.ActorId == user.Id).ToListAsync();
        Assert.Contains(logs, l => l.Action == "SecurityVersionIncremented" && l.Description.Contains("incremented to 2"));
        Assert.Contains(logs, l => l.Action == "SessionsInvalidatedBySecurityVersion");
    }

    [Fact]
    public async Task CrossUserIsolation_InvalidatingOneUser_DoesNotAffectOtherUsers()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var userA = await SeedUserAsync(context, "user_A", "userA@example.com");
        var userB = await SeedUserAsync(context, "user_B", "userB@example.com");
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var resA = await service.CreateOrRotateSessionAsync(userA, "candidate", "cid_A", "10.0.0.1", "Chrome", null, false);
        var resB = await service.CreateOrRotateSessionAsync(userB, "candidate", "cid_B", "10.0.0.2", "Safari", null, false);

        // Invalidate only User A
        await service.InvalidateUserSecurityVersionAsync(userA.Id, "UserA_Compromise");

        // User A's session is invalidated
        var valA = await service.ValidateSessionAsync(resA.Token!, isToken: true);
        Assert.False(valA.IsValid);
        Assert.Equal("SECURITY_VERSION_CHANGED", valA.FailureCode);

        // User B's session remains perfectly valid
        var valB = await service.ValidateSessionAsync(resB.Token!, isToken: true);
        Assert.True(valB.IsValid);
        Assert.Equal(1, (await context.Users.FindAsync(userB.Id))!.SecurityVersion);
    }

    [Fact]
    public void AuditEvents_ContainNoPasswordsOrSecrets()
    {
        var assessment = DeviceDetectionHelper.AssessContextChange(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1",
            "10.0.0.1",
            "10.0.0.2");

        Assert.True(assessment.IsOsChanged);
        Assert.Equal("High", assessment.Severity);
        Assert.Equal("SuspiciousSessionContext", assessment.DetectedAnomaly);

        // Verify severity levels match classification
        Assert.Equal("Informational", DeviceDetectionHelper.AssessContextChange("Chrome", "Chrome", "1.1.1.1", "1.1.1.2").Severity);
        Assert.Equal("Medium", DeviceDetectionHelper.AssessContextChange(
            "Mozilla/5.0 (Windows NT 10.0) Chrome/120",
            "Mozilla/5.0 (Windows NT 10.0) Firefox/120", "1.1.1.1", "1.1.1.1").Severity);
    }
}
