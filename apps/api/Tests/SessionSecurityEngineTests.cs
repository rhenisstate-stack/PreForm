using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Data;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class SessionSecurityEngineTests
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

    private async Task<User> SeedUserAsync(AppDbContext context, string id = "user_test_01", string email = "learner@example.com")
    {
        var user = new User
        {
            Id = id,
            Email = email,
            DisplayName = "Test Learner",
            IsActive = true,
            SecurityVersion = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Users.Add(user);

        // Seed default policy if not present
        if (!await context.SessionSecurityPolicies.AnyAsync(p => p.Id == "global_policy"))
        {
            context.SessionSecurityPolicies.Add(new SessionSecurityPolicy
            {
                Id = "global_policy",
                MaxConcurrentSessions = 2,
                MaxSessionsPerClient = 1,
                IdleTimeoutMinutes = 300,
                AbsoluteTimeoutMinutes = 10080,
                IsActive = true
            });
        }

        await context.SaveChangesAsync();
        return user;
    }

    [Fact]
    public async Task ConcurrencyLimit_AllowsUpToTwoSessions_AndRejectsThird()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        // 1st login (Client 1) -> Success
        var res1 = await service.CreateOrRotateSessionAsync(user, "candidate", "client_1", "127.0.0.1", "Mozilla/5.0 Windows", null, false);
        Assert.True(res1.Success);
        Assert.NotNull(res1.Token);
        Assert.NotNull(res1.Session);

        // 2nd login (Client 2) -> Success
        var res2 = await service.CreateOrRotateSessionAsync(user, "candidate", "client_2", "127.0.0.1", "Mozilla/5.0 Mac", null, false);
        Assert.True(res2.Success);
        Assert.NotNull(res2.Token);
        Assert.NotNull(res2.Session);

        // 3rd login (Client 3) -> Rejected
        var res3 = await service.CreateOrRotateSessionAsync(user, "candidate", "client_3", "127.0.0.1", "Mozilla/5.0 iPhone", null, false);
        Assert.False(res3.Success);
        Assert.Equal("CONCURRENT_SESSION_LIMIT_EXCEEDED", res3.ErrorCode);
        Assert.Contains("Maximum concurrent session limit of 2 reached", res3.ErrorMessage);
    }

    [Fact]
    public async Task ThirdLoginRejection_PreservesExistingActiveSessions()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var res1 = await service.CreateOrRotateSessionAsync(user, "candidate", "client_1", "10.0.0.1", "Browser 1", null, false);
        var res2 = await service.CreateOrRotateSessionAsync(user, "candidate", "client_2", "10.0.0.2", "Browser 2", null, false);

        // 3rd login attempted and rejected
        var res3 = await service.CreateOrRotateSessionAsync(user, "candidate", "client_3", "10.0.0.3", "Browser 3", null, false);
        Assert.False(res3.Success);

        // Assert existing sessions 1 and 2 remain active and unrevoked
        var session1InDb = await context.UserSessions.FindAsync(res1.Session!.Id);
        var session2InDb = await context.UserSessions.FindAsync(res2.Session!.Id);

        Assert.NotNull(session1InDb);
        Assert.False(session1InDb.Revoked);
        Assert.Null(session1InDb.RevokedAt);

        Assert.NotNull(session2InDb);
        Assert.False(session2InDb.Revoked);
        Assert.Null(session2InDb.RevokedAt);

        var val1 = await service.ValidateSessionAsync(res1.Token!, isToken: true);
        var val2 = await service.ValidateSessionAsync(res2.Token!, isToken: true);

        Assert.True(val1.IsValid);
        Assert.True(val2.IsValid);
    }

    [Fact]
    public async Task SameClientLogin_RotatesExistingSession_AndDoesNotExceedLimit()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        // Client 1 login
        var res1 = await service.CreateOrRotateSessionAsync(user, "candidate", "client_1", "10.0.0.1", "Browser 1", null, false);
        // Client 2 login (now 2 active sessions)
        var res2 = await service.CreateOrRotateSessionAsync(user, "candidate", "client_2", "10.0.0.2", "Browser 2", null, false);

        // Client 1 logs in again (same browser client)
        var res1Second = await service.CreateOrRotateSessionAsync(user, "candidate", "client_1", "10.0.0.1", "Browser 1", null, false);

        Assert.True(res1Second.Success);
        Assert.NotEqual(res1.Session!.Id, res1Second.Session!.Id);

        // Previous session for client_1 must be revoked with ReplacedBySameClient
        var oldSession1 = await context.UserSessions.FindAsync(res1.Session.Id);
        Assert.NotNull(oldSession1);
        Assert.True(oldSession1.Revoked);
        Assert.Equal("ReplacedBySameClient", oldSession1.RevocationReason);

        // Active session count for user remains exactly 2
        var activeSessions = await service.GetActiveSessionsForUserAsync(user.Id);
        Assert.Equal(2, activeSessions.Count);
        Assert.Contains(activeSessions, s => s.Id == res2.Session!.Id);
        Assert.Contains(activeSessions, s => s.Id == res1Second.Session!.Id);
    }

    [Fact]
    public async Task IdleTimeoutBoundary_MarksSessionExpired()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var res = await service.CreateOrRotateSessionAsync(user, "candidate", "client_1", "10.0.0.1", "Browser", null, false);
        var session = await context.UserSessions.FindAsync(res.Session!.Id);

        // Artificially age the session beyond idle timeout
        session!.IdleExpiresAt = DateTime.UtcNow.AddMinutes(-5);
        await context.SaveChangesAsync();

        var val = await service.ValidateSessionAsync(res.Token!, isToken: true);

        Assert.False(val.IsValid);
        Assert.Equal("SESSION_IDLE_TIMEOUT", val.FailureCode);

        // Datastore session should be marked revoked
        var updated = await context.UserSessions.FindAsync(res.Session.Id);
        Assert.True(updated!.Revoked);
        Assert.Equal("IdleTimeout", updated.RevocationReason);
    }

    [Fact]
    public async Task AbsoluteTimeoutBoundary_MarksSessionExpired()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var res = await service.CreateOrRotateSessionAsync(user, "candidate", "client_1", "10.0.0.1", "Browser", null, false);
        var session = await context.UserSessions.FindAsync(res.Session!.Id);

        // Artificially age the session beyond absolute timeout
        session!.AbsoluteExpiresAt = DateTime.UtcNow.AddMinutes(-1);
        await context.SaveChangesAsync();

        var val = await service.ValidateSessionAsync(res.Token!, isToken: true);

        Assert.False(val.IsValid);
        Assert.Equal("SESSION_ABSOLUTE_TIMEOUT", val.FailureCode);

        var updated = await context.UserSessions.FindAsync(res.Session.Id);
        Assert.True(updated!.Revoked);
        Assert.Equal("AbsoluteTimeout", updated.RevocationReason);
    }

    [Fact]
    public async Task EffectiveExpiration_ReturnsEarlierOfIdleAndAbsolute()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var res = await service.CreateOrRotateSessionAsync(user, "candidate", "client_1", "10.0.0.1", "Browser", null, false);
        var session = await context.UserSessions.FindAsync(res.Session!.Id);

        // Case A: Idle is earlier
        var idleDate = DateTime.UtcNow.AddHours(2);
        var absDate = DateTime.UtcNow.AddHours(24);
        session!.IdleExpiresAt = idleDate;
        session.AbsoluteExpiresAt = absDate;
        await context.SaveChangesAsync();

        var valA = await service.ValidateSessionAsync(res.Token!, isToken: true);
        Assert.True(valA.IsValid);
        Assert.Equal(idleDate, valA.EffectiveExpiry);

        // Case B: Absolute is earlier
        session.IdleExpiresAt = DateTime.UtcNow.AddHours(48);
        session.AbsoluteExpiresAt = DateTime.UtcNow.AddHours(12);
        await context.SaveChangesAsync();

        var valB = await service.ValidateSessionAsync(res.Token!, isToken: true);
        Assert.True(valB.IsValid);
        Assert.Equal(session.AbsoluteExpiresAt, valB.EffectiveExpiry);
    }

    [Fact]
    public async Task QualifyingActivity_ThrottlesDatabaseWrites_AndExtendsIdle()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var res = await service.CreateOrRotateSessionAsync(user, "candidate", "client_1", "10.0.0.1", "Browser", null, false);
        var originalActive = res.Session!.LastActiveAt;

        // Validation immediately (elapsed < 5 minutes) -> Should NOT update LastActiveAt in DB
        var val1 = await service.ValidateSessionAsync(res.Token!, isToken: true, isQualifyingActivity: true);
        Assert.True(val1.IsValid);

        var sessionCheck1 = await context.UserSessions.FindAsync(res.Session.Id);
        Assert.Equal(originalActive, sessionCheck1!.LastActiveAt);

        // Now artificially advance LastActiveAt to 10 minutes ago
        var tenMinutesAgo = DateTime.UtcNow.AddMinutes(-10);
        sessionCheck1.LastActiveAt = tenMinutesAgo;
        await context.SaveChangesAsync();

        // Validation with qualifying activity -> Should update LastActiveAt and extend IdleExpiresAt
        var val2 = await service.ValidateSessionAsync(res.Token!, isToken: true, isQualifyingActivity: true);
        Assert.True(val2.IsValid);

        var sessionCheck2 = await context.UserSessions.FindAsync(res.Session.Id);
        Assert.True(sessionCheck2!.LastActiveAt > tenMinutesAgo);
        Assert.True(sessionCheck2.IdleExpiresAt > DateTime.UtcNow.AddMinutes(290));
    }

    [Fact]
    public async Task NonQualifyingActivity_DoesNotExtendIdleTimeout()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var res = await service.CreateOrRotateSessionAsync(user, "candidate", "client_1", "10.0.0.1", "Browser", null, false);
        var session = await context.UserSessions.FindAsync(res.Session!.Id);

        var tenMinutesAgo = DateTime.UtcNow.AddMinutes(-10);
        var initialIdle = session!.IdleExpiresAt;
        session.LastActiveAt = tenMinutesAgo;
        await context.SaveChangesAsync();

        // Validate with isQualifyingActivity = false (e.g. background sync or health check)
        var val = await service.ValidateSessionAsync(res.Token!, isToken: true, isQualifyingActivity: false);
        Assert.True(val.IsValid);

        var sessionCheck = await context.UserSessions.FindAsync(res.Session.Id);
        Assert.Equal(tenMinutesAgo, sessionCheck!.LastActiveAt);
        Assert.Equal(initialIdle, sessionCheck.IdleExpiresAt);
    }

    [Fact]
    public async Task SecurityVersionMismatch_ImmediatelyRevokesSession()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var res = await service.CreateOrRotateSessionAsync(user, "candidate", "client_1", "10.0.0.1", "Browser", null, false);

        // Invalidate security version (e.g. password changed or privileges updated)
        await service.InvalidateUserSecurityVersionAsync(user.Id, "PasswordReset");

        var val = await service.ValidateSessionAsync(res.Token!, isToken: true);
        Assert.False(val.IsValid);
        Assert.Equal("SECURITY_VERSION_CHANGED", val.FailureCode);

        var sessionCheck = await context.UserSessions.FindAsync(res.Session!.Id);
        Assert.True(sessionCheck!.Revoked);
        Assert.Equal("PrivilegeOrSecurityVersionChanged", sessionCheck.RevocationReason);
    }

    [Fact]
    public async Task InactiveAccount_RejectsLoginAndFailsValidation()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var res = await service.CreateOrRotateSessionAsync(user, "candidate", "client_1", "10.0.0.1", "Browser", null, false);
        Assert.True(res.Success);

        // Deactivate user account
        user.IsActive = false;
        await context.SaveChangesAsync();

        // 1. Validation fails
        var val = await service.ValidateSessionAsync(res.Token!, isToken: true);
        Assert.False(val.IsValid);
        Assert.Equal("ACCOUNT_INACTIVE", val.FailureCode);

        // 2. New login attempt rejected
        var newLogin = await service.CreateOrRotateSessionAsync(user, "candidate", "client_2", "10.0.0.1", "Browser", null, false);
        Assert.False(newLogin.Success);
        Assert.Equal("ACCOUNT_INACTIVE", newLogin.ErrorCode);
    }

    [Fact]
    public async Task CrossUserSessionIsolation_RevokeOthersOnlyAffectsTargetUser()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var userA = await SeedUserAsync(context, "user_A", "userA@example.com");
        var userB = await SeedUserAsync(context, "user_B", "userB@example.com");
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var sA1 = await service.CreateOrRotateSessionAsync(userA, "candidate", "client_A1", "10.0.0.1", "Browser", null, false);
        var sA2 = await service.CreateOrRotateSessionAsync(userA, "candidate", "client_A2", "10.0.0.2", "Browser", null, false);
        var sB1 = await service.CreateOrRotateSessionAsync(userB, "candidate", "client_B1", "10.0.0.3", "Browser", null, false);

        // User A revokes their other sessions keeping sA1
        var revokedCount = await service.RevokeOtherSessionsAsync(userA.Id, sA1.Session!.Id, userA.Id);
        Assert.Equal(1, revokedCount);

        // sA1 is still active
        var checkA1 = await context.UserSessions.FindAsync(sA1.Session.Id);
        Assert.False(checkA1!.Revoked);

        // sA2 is revoked
        var checkA2 = await context.UserSessions.FindAsync(sA2.Session!.Id);
        Assert.True(checkA2!.Revoked);

        // User B's session sB1 must remain active and completely untouched
        var checkB1 = await context.UserSessions.FindAsync(sB1.Session!.Id);
        Assert.False(checkB1!.Revoked);
    }

    [Fact]
    public async Task ConcurrentLoginRace_ThreadSafety_GuaranteesLimitEnforcement()
    {
        var dbName = Guid.NewGuid().ToString();
        using var initContext = CreateDbContext(dbName);
        var user = await SeedUserAsync(initContext, "user_race", "race@example.com");

        const int attempts = 8;
        var tasks = new Task<SessionCreationResult>[attempts];

        for (int i = 0; i < attempts; i++)
        {
            var clientId = $"client_race_{i}";
            tasks[i] = Task.Run(async () =>
            {
                // Each concurrent request uses its own DbContext instance as in ASP.NET Core DI
                using var requestContext = CreateDbContext(dbName);
                var requestUser = await requestContext.Users.FindAsync(user.Id);
                var service = new SessionSecurityService(requestContext, NullLogger<SessionSecurityService>.Instance);
                return await service.CreateOrRotateSessionAsync(
                    requestUser!,
                    "candidate",
                    clientId,
                    "127.0.0.1",
                    "Mozilla/5.0 Test",
                    null,
                    false);
            });
        }

        var results = await Task.WhenAll(tasks);

        var successCount = results.Count(r => r.Success);
        var rejectedCount = results.Count(r => !r.Success && r.ErrorCode == "CONCURRENT_SESSION_LIMIT_EXCEEDED");

        // Exactly 2 must succeed (the default max concurrency), and 6 must be rejected
        Assert.Equal(2, successCount);
        Assert.Equal(attempts - 2, rejectedCount);

        // Confirm DB state has exactly 2 active sessions
        using var verifyContext = CreateDbContext(dbName);
        var activeCount = await verifyContext.UserSessions.CountAsync(s => s.UserId == user.Id && !s.Revoked);
        Assert.Equal(2, activeCount);
    }

    [Fact]
    public async Task AuditLogs_DoNotExposeRawTokensOrSecrets()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var res = await service.CreateOrRotateSessionAsync(user, "candidate", "client_1", "192.168.1.100", "Mozilla/5.0", null, false);
        await service.RevokeSessionAsync(res.Session!.Id, "UserTestRevoke", user.Id);

        var logs = await context.AuditLogs.Where(l => l.ActorId == user.Id).ToListAsync();

        Assert.NotEmpty(logs);
        foreach (var log in logs)
        {
            Assert.DoesNotContain(res.Token!, log.Description);
            Assert.DoesNotContain("prf_sess_", log.Description);
            Assert.DoesNotContain("password", log.Description.ToLowerInvariant());
        }
    }
}
