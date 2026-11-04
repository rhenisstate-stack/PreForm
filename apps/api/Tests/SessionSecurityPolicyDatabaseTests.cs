using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Data;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class SessionSecurityPolicyDatabaseTests
{
    private AppDbContext CreateInMemoryDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        var context = new AppDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }

    [Fact]
    public void SessionSecurityPolicy_Model_HasExpectedDefaultValues()
    {
        var policy = new SessionSecurityPolicy();

        Assert.Equal("global_policy", policy.Id);
        Assert.Equal(2, policy.MaxConcurrentSessions);
        Assert.Equal(1, policy.MaxSessionsPerClient);
        Assert.Equal(300, policy.IdleTimeoutMinutes);
        Assert.Equal(10080, policy.AbsoluteTimeoutMinutes);
        Assert.True(policy.EnforceFingerprint);
        Assert.False(policy.EnforceIpConsistency);
        Assert.True(policy.AllowIpDrift);
        Assert.True(policy.RotateOnLogin);
        Assert.True(policy.RotateOnPrivilegeChange);
        Assert.True(policy.RotateOnPasswordChange);
        Assert.Equal(1, policy.PolicyVersion);
        Assert.True(policy.IsActive);
        Assert.Equal("system", policy.UpdatedBy);
    }

    [Fact]
    public void UserSession_Model_HasExpectedDefaultValues()
    {
        var session = new UserSession();

        Assert.NotNull(session.Id);
        Assert.Equal(string.Empty, session.ClientId);
        Assert.Equal(1, session.SecurityVersion);
        Assert.True(session.IdleExpiresAt > DateTime.UtcNow.AddMinutes(290));
        Assert.True(session.AbsoluteExpiresAt > DateTime.UtcNow.AddDays(6));
        Assert.Null(session.RevokedAt);
        Assert.Null(session.RevocationReason);
        Assert.Null(session.LastIpAddress);
        Assert.Null(session.UserAgent);
        Assert.Null(session.DeviceLabel);
        Assert.Null(session.FingerprintHash);
        Assert.False(session.Revoked);
    }

    [Fact]
    public void User_Model_HasExpectedSecurityVersionDefault()
    {
        var user = new User();
        Assert.Equal(1, user.SecurityVersion);
    }

    [Fact]
    public async Task DbContext_CanAddAndRetrieve_SessionSecurityPolicy()
    {
        using var context = CreateInMemoryDbContext("SessionSecurityPolicy_Db");

        var policy = new SessionSecurityPolicy
        {
            Id = "custom_policy",
            MaxConcurrentSessions = 3,
            MaxSessionsPerClient = 2,
            IdleTimeoutMinutes = 120,
            AbsoluteTimeoutMinutes = 5000,
            EnforceFingerprint = false,
            EnforceIpConsistency = true,
            AllowIpDrift = false,
            RotateOnLogin = true,
            RotateOnPrivilegeChange = true,
            RotateOnPasswordChange = true,
            PolicyVersion = 2,
            UpdatedAt = DateTime.UtcNow,
            UpdatedBy = "admin_user_01",
            IsActive = true
        };

        context.SessionSecurityPolicies.Add(policy);
        await context.SaveChangesAsync();

        var retrieved = await context.SessionSecurityPolicies.FindAsync("custom_policy");

        Assert.NotNull(retrieved);
        Assert.Equal("custom_policy", retrieved.Id);
        Assert.Equal(3, retrieved.MaxConcurrentSessions);
        Assert.Equal(2, retrieved.MaxSessionsPerClient);
        Assert.Equal(120, retrieved.IdleTimeoutMinutes);
        Assert.Equal(5000, retrieved.AbsoluteTimeoutMinutes);
        Assert.False(retrieved.EnforceFingerprint);
        Assert.True(retrieved.EnforceIpConsistency);
        Assert.False(retrieved.AllowIpDrift);
        Assert.Equal(2, retrieved.PolicyVersion);
        Assert.Equal("admin_user_01", retrieved.UpdatedBy);
    }

    [Fact]
    public async Task DbContext_CanPersistUserSessionWithSecurityMetadata()
    {
        using var context = CreateInMemoryDbContext("UserSessionSecurity_Db");

        var user = new User
        {
            Id = "usr_sec_test_01",
            Email = "security.candidate@prepford.com",
            DisplayName = "Security Candidate",
            SecurityVersion = 1
        };
        context.Users.Add(user);

        var session = new UserSession
        {
            Id = "sess_sec_test_01",
            UserId = user.Id,
            Email = user.Email,
            Role = "candidate",
            DisplayName = user.DisplayName,
            TokenHash = "token_hash_abc123",
            CsrfToken = "csrf_token_abc123",
            ClientId = "client_browser_xyz",
            IdleExpiresAt = DateTime.UtcNow.AddMinutes(300),
            AbsoluteExpiresAt = DateTime.UtcNow.AddDays(7),
            LastIpAddress = "192.168.1.100",
            UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            DeviceLabel = "Chrome 130 on Windows 11",
            FingerprintHash = "fingerprint_hash_123",
            SecurityVersion = 1
        };
        context.UserSessions.Add(session);
        await context.SaveChangesAsync();

        var saved = await context.UserSessions.FindAsync("sess_sec_test_01");

        Assert.NotNull(saved);
        Assert.Equal("client_browser_xyz", saved.ClientId);
        Assert.Equal("192.168.1.100", saved.LastIpAddress);
        Assert.Equal("Chrome 130 on Windows 11", saved.DeviceLabel);
        Assert.Equal("fingerprint_hash_123", saved.FingerprintHash);
        Assert.Equal(1, saved.SecurityVersion);
    }

    [Fact]
    public async Task CatalogSeeder_SeedsDefaultSessionSecurityPolicy_Idempotently()
    {
        using var context = CreateInMemoryDbContext("CatalogSeeder_SessionPolicy_Db");

        // First execution: Seeds the policy
        await CatalogSeeder.SeedAsync(context, NullLogger.Instance);

        var policy = await context.SessionSecurityPolicies.FirstOrDefaultAsync(p => p.Id == "global_policy");
        Assert.NotNull(policy);
        Assert.Equal("global_policy", policy.Id);
        Assert.Equal(2, policy.MaxConcurrentSessions);
        Assert.Equal(1, policy.MaxSessionsPerClient);
        Assert.Equal(300, policy.IdleTimeoutMinutes);
        Assert.Equal(10080, policy.AbsoluteTimeoutMinutes);
        Assert.True(policy.EnforceFingerprint);
        Assert.False(policy.EnforceIpConsistency);
        Assert.True(policy.AllowIpDrift);
        Assert.True(policy.RotateOnLogin);
        Assert.True(policy.RotateOnPrivilegeChange);
        Assert.True(policy.RotateOnPasswordChange);
        Assert.Equal(1, policy.PolicyVersion);
        Assert.True(policy.IsActive);

        // Second execution: Idempotent no-op
        await CatalogSeeder.SeedAsync(context, NullLogger.Instance);

        var policyCount = await context.SessionSecurityPolicies.CountAsync(p => p.Id == "global_policy");
        Assert.Equal(1, policyCount);
    }
}
