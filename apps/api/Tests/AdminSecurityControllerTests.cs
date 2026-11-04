using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Controllers;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class AdminSecurityControllerTests
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

    private AdminSecurityController CreateController(AppDbContext context, string? role = "superadmin", string adminId = "admin_super_01")
    {
        var sessionSecurityService = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);
        var controller = new AdminSecurityController(context, sessionSecurityService, NullLogger<AdminSecurityController>.Instance);

        var httpContext = new DefaultHttpContext();
        if (!string.IsNullOrWhiteSpace(role))
        {
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, adminId),
                new(ClaimTypes.Email, $"{adminId}@prepford.com"),
                new(ClaimTypes.Role, role),
                new("role", role),
                new(ClaimTypes.Name, "Super Administrator")
            };
            var identity = new ClaimsIdentity(claims, "TestAuth");
            httpContext.User = new ClaimsPrincipal(identity);
        }
        else
        {
            httpContext.User = new ClaimsPrincipal(new ClaimsIdentity());
        }

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };

        return controller;
    }

    private async Task SeedDefaultPolicyAsync(AppDbContext context)
    {
        if (!await context.SessionSecurityPolicies.AnyAsync(p => p.Id == "global_policy"))
        {
            context.SessionSecurityPolicies.Add(new SessionSecurityPolicy
            {
                Id = "global_policy",
                MaxConcurrentSessions = 2,
                MaxSessionsPerClient = 1,
                IdleTimeoutMinutes = 300,
                AbsoluteTimeoutMinutes = 10080,
                EnforceFingerprint = true,
                EnforceIpConsistency = false,
                AllowIpDrift = true,
                RotateOnLogin = true,
                RotateOnPrivilegeChange = true,
                RotateOnPasswordChange = true,
                PolicyVersion = 1,
                IsActive = true
            });
            await context.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task GetSessionPolicy_ReturnsAuthoritativePolicyAndDefaults()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        await SeedDefaultPolicyAsync(context);

        var controller = CreateController(context, "superadmin");
        var result = await controller.GetSessionPolicy(CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var policyDto = Assert.IsType<AdminSessionPolicyDto>(okResult.Value);

        Assert.True(policyDto.Success);
        Assert.Equal(2, policyDto.MaxConcurrentSessions);
        Assert.Equal(1, policyDto.MaxSessionsPerClient);
        Assert.Equal(300, policyDto.IdleTimeoutMinutes);
        Assert.Equal(10080, policyDto.AbsoluteTimeoutMinutes);
        Assert.Equal(1, policyDto.PolicyVersion);

        // System defaults check
        Assert.NotNull(policyDto.Defaults);
        Assert.Equal(2, policyDto.Defaults.MaxConcurrentSessions);
    }

    [Fact]
    public async Task UpdateSessionPolicy_ValidRequest_UpdatesPolicyAndAudits()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        await SeedDefaultPolicyAsync(context);

        var controller = CreateController(context, "superadmin", "superadmin_01");

        var updateReq = new UpdateSessionPolicyRequest
        {
            MaxConcurrentSessions = 3,
            MaxSessionsPerClient = 2,
            IdleTimeoutMinutes = 180,
            AbsoluteTimeoutMinutes = 7200,
            EnforceFingerprint = true,
            EnforceIpConsistency = false,
            AllowIpDrift = true,
            RotateOnLogin = true,
            RotateOnPrivilegeChange = true,
            RotateOnPasswordChange = true,
            PolicyVersion = 1 // matches current version
        };

        var result = await controller.UpdateSessionPolicy(updateReq, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var resObj = okResult.Value;
        Assert.NotNull(resObj);

        // Verify in database
        var policyInDb = await context.SessionSecurityPolicies.FindAsync("global_policy");
        Assert.NotNull(policyInDb);
        Assert.Equal(3, policyInDb.MaxConcurrentSessions);
        Assert.Equal(2, policyInDb.MaxSessionsPerClient);
        Assert.Equal(180, policyInDb.IdleTimeoutMinutes);
        Assert.Equal(7200, policyInDb.AbsoluteTimeoutMinutes);
        Assert.Equal(2, policyInDb.PolicyVersion); // Incremented
        Assert.Equal("superadmin_01", policyInDb.UpdatedBy);

        // Audit log created
        var audit = await context.AuditLogs.FirstOrDefaultAsync(a => a.Action == "SessionPolicyUpdated");
        Assert.NotNull(audit);
        Assert.Equal("superadmin_01", audit.ActorId);
    }

    [Fact]
    public async Task UpdateSessionPolicy_IdleExceedsAbsolute_ReturnsBadRequest()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        await SeedDefaultPolicyAsync(context);

        var controller = CreateController(context, "superadmin");

        var updateReq = new UpdateSessionPolicyRequest
        {
            MaxConcurrentSessions = 2,
            MaxSessionsPerClient = 1,
            IdleTimeoutMinutes = 500,
            AbsoluteTimeoutMinutes = 300, // Invalid: idle > absolute
            PolicyVersion = 1
        };

        var result = await controller.UpdateSessionPolicy(updateReq, CancellationToken.None);
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task UpdateSessionPolicy_VersionMismatch_Returns409Conflict()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        await SeedDefaultPolicyAsync(context);

        var controller = CreateController(context, "superadmin");

        var updateReq = new UpdateSessionPolicyRequest
        {
            MaxConcurrentSessions = 3,
            MaxSessionsPerClient = 1,
            IdleTimeoutMinutes = 120,
            AbsoluteTimeoutMinutes = 1440,
            PolicyVersion = 99 // Stale submitted version
        };

        var result = await controller.UpdateSessionPolicy(updateReq, CancellationToken.None);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status409Conflict, statusResult.StatusCode);
    }

    [Fact]
    public async Task ResetSessionPolicy_RestoresExactCanonicalPlatformDefaults()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);

        // Create customized policy
        context.SessionSecurityPolicies.Add(new SessionSecurityPolicy
        {
            Id = "global_policy",
            MaxConcurrentSessions = 5,
            MaxSessionsPerClient = 3,
            IdleTimeoutMinutes = 60,
            AbsoluteTimeoutMinutes = 1440,
            PolicyVersion = 5,
            IsActive = true
        });
        await context.SaveChangesAsync();

        var controller = CreateController(context, "superadmin", "superadmin_01");
        var result = await controller.ResetSessionPolicy(CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        var policyInDb = await context.SessionSecurityPolicies.FindAsync("global_policy");
        Assert.NotNull(policyInDb);
        Assert.Equal(2, policyInDb.MaxConcurrentSessions);
        Assert.Equal(1, policyInDb.MaxSessionsPerClient);
        Assert.Equal(300, policyInDb.IdleTimeoutMinutes);
        Assert.Equal(10080, policyInDb.AbsoluteTimeoutMinutes);
        Assert.Equal(6, policyInDb.PolicyVersion); // Incremented

        var audit = await context.AuditLogs.FirstOrDefaultAsync(a => a.Action == "SessionPolicyReset");
        Assert.NotNull(audit);
    }

    [Fact]
    public async Task GetSessions_PaginatesAndFiltersByStatusAndSearch()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);

        var now = DateTime.UtcNow;

        var user1 = new User { Id = "u1", Email = "alice@example.com", DisplayName = "Alice RN" };
        var user2 = new User { Id = "u2", Email = "bob@example.com", DisplayName = "Bob PN" };
        context.Users.AddRange(user1, user2);

        // Active session for Alice
        context.UserSessions.Add(new UserSession
        {
            Id = "sess_u1_active",
            UserId = "u1",
            Email = user1.Email,
            DisplayName = user1.DisplayName,
            TokenHash = "hash1",
            DeviceLabel = "Chrome on Windows",
            LastActiveAt = now.AddMinutes(-5),
            IdleExpiresAt = now.AddHours(4),
            AbsoluteExpiresAt = now.AddDays(5),
            Revoked = false
        });

        // Revoked session for Bob
        context.UserSessions.Add(new UserSession
        {
            Id = "sess_u2_revoked",
            UserId = "u2",
            Email = user2.Email,
            DisplayName = user2.DisplayName,
            TokenHash = "hash2",
            DeviceLabel = "Safari on iOS",
            LastActiveAt = now.AddHours(-1),
            IdleExpiresAt = now.AddHours(2),
            AbsoluteExpiresAt = now.AddDays(3),
            Revoked = true,
            RevokedAt = now.AddMinutes(-30),
            RevocationReason = "UserRevoked"
        });

        await context.SaveChangesAsync();

        var controller = CreateController(context, "superadmin");

        // 1. Filter: all
        var allResult = await controller.GetSessions(page: 1, pageSize: 10, status: "all", cancellationToken: CancellationToken.None);
        var allOk = Assert.IsType<OkObjectResult>(allResult);
        var allDto = Assert.IsType<AdminPaginatedSessionsDto>(allOk.Value);
        Assert.Equal(2, allDto.TotalCount);

        // 2. Filter: active only
        var activeResult = await controller.GetSessions(page: 1, pageSize: 10, status: "active", cancellationToken: CancellationToken.None);
        var activeOk = Assert.IsType<OkObjectResult>(activeResult);
        var activeDto = Assert.IsType<AdminPaginatedSessionsDto>(activeOk.Value);
        Assert.Equal(1, activeDto.TotalCount);
        Assert.Equal("sess_u1_active", activeDto.Items[0].Id);
        Assert.Equal("Active", activeDto.Items[0].Status);

        // 3. Search by name
        var searchResult = await controller.GetSessions(page: 1, pageSize: 10, search: "Alice", cancellationToken: CancellationToken.None);
        var searchOk = Assert.IsType<OkObjectResult>(searchResult);
        var searchDto = Assert.IsType<AdminPaginatedSessionsDto>(searchOk.Value);
        Assert.Equal(1, searchDto.TotalCount);
        Assert.Equal("alice@example.com", searchDto.Items[0].UserEmail);
    }

    [Fact]
    public async Task RevokeSession_Admin_SetsRevocationReasonAndAudits()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);

        context.UserSessions.Add(new UserSession
        {
            Id = "sess_target_01",
            UserId = "u_target",
            Email = "target@example.com",
            TokenHash = "hash_target",
            Revoked = false,
            IdleExpiresAt = DateTime.UtcNow.AddHours(2),
            AbsoluteExpiresAt = DateTime.UtcNow.AddDays(1)
        });
        await context.SaveChangesAsync();

        var controller = CreateController(context, "superadmin", "admin_lead_01");
        var result = await controller.RevokeSession("sess_target_01", new AdminRevokeSessionRequest
        {
            Reason = "Suspicious client IP detected"
        }, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        var sessionInDb = await context.UserSessions.FindAsync("sess_target_01");
        Assert.NotNull(sessionInDb);
        Assert.True(sessionInDb.Revoked);
        Assert.Contains("Suspicious client IP detected", sessionInDb.RevocationReason);

        var audit = await context.AuditLogs.FirstOrDefaultAsync(a => a.Action == "AdminRevokeSession");
        Assert.NotNull(audit);
        Assert.Equal("admin_lead_01", audit.ActorId);
    }

    [Fact]
    public async Task RevokeAllUserSessions_Admin_RevokesOnlyTargetUserSessions()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);

        var userTarget = new User { Id = "u_target", Email = "target@example.com", DisplayName = "Target User" };
        var userInnocent = new User { Id = "u_innocent", Email = "innocent@example.com", DisplayName = "Innocent User" };
        context.Users.AddRange(userTarget, userInnocent);

        context.UserSessions.AddRange(
            new UserSession { Id = "s_t1", UserId = "u_target", Email = userTarget.Email, TokenHash = "h1", Revoked = false },
            new UserSession { Id = "s_t2", UserId = "u_target", Email = userTarget.Email, TokenHash = "h2", Revoked = false },
            new UserSession { Id = "s_i1", UserId = "u_innocent", Email = userInnocent.Email, TokenHash = "h3", Revoked = false }
        );
        await context.SaveChangesAsync();

        var controller = CreateController(context, "superadmin", "admin_lead_01");
        var result = await controller.RevokeAllUserSessions("u_target", new AdminRevokeAllUserSessionsRequest
        {
            Reason = "Compromised account credential rotation"
        }, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        // Verify target sessions are revoked
        var s1 = await context.UserSessions.FindAsync("s_t1");
        var s2 = await context.UserSessions.FindAsync("s_t2");
        Assert.NotNull(s1);
        Assert.True(s1.Revoked);
        Assert.NotNull(s2);
        Assert.True(s2.Revoked);

        // Verify innocent user session is untouched
        var si = await context.UserSessions.FindAsync("s_i1");
        Assert.NotNull(si);
        Assert.False(si.Revoked);
    }

    [Fact]
    public async Task GetSecurityMetrics_CalculatesAccurateCounts()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);

        var now = DateTime.UtcNow;

        // 2 active sessions for 2 distinct users
        context.UserSessions.AddRange(
            new UserSession { Id = "s1", UserId = "u1", TokenHash = "h1", Revoked = false, IdleExpiresAt = now.AddHours(2), AbsoluteExpiresAt = now.AddDays(1) },
            new UserSession { Id = "s2", UserId = "u2", TokenHash = "h2", Revoked = false, IdleExpiresAt = now.AddHours(2), AbsoluteExpiresAt = now.AddDays(1) },
            // 1 revoked session in last 24h
            new UserSession { Id = "s3", UserId = "u3", TokenHash = "h3", Revoked = true, RevokedAt = now.AddHours(-2) }
        );

        // 1 limit rejection audit log
        context.AuditLogs.Add(new AuditLog
        {
            Action = "ConcurrentSessionLimitExceeded",
            Timestamp = now.AddHours(-1),
            Outcome = "Conflict",
            Description = "Session limit exceeded"
        });

        await context.SaveChangesAsync();

        var controller = CreateController(context, "superadmin");
        var result = await controller.GetSecurityMetrics(CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var metrics = Assert.IsType<AdminSecurityMetricsDto>(okResult.Value);

        Assert.Equal(2, metrics.TotalActiveSessions);
        Assert.Equal(2, metrics.ActiveUsersCount);
        Assert.Equal(1, metrics.RevokedLast24HoursCount);
        Assert.Equal(1, metrics.LimitRejectionsLast24HoursCount);
    }
}
