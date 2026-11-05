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

        // Invalidate security version via InvalidateUserSecurityVersionAsync
        await service.InvalidateUserSecurityVersionAsync(user.Id, "PasswordReset");

        var val = await service.ValidateSessionAsync(res.Token!, isToken: true);
        Assert.False(val.IsValid);
        Assert.Equal("SECURITY_VERSION_CHANGED", val.FailureCode);

        var sessionCheck = await context.UserSessions.FindAsync(res.Session!.Id);
        Assert.True(sessionCheck!.Revoked);
        Assert.Equal("PasswordReset", sessionCheck.RevocationReason);

        // Also verify direct SecurityVersion mismatch without prior revocation
        var user2 = await SeedUserAsync(context, "user_direct_bump", "direct@example.com");
        var res2 = await service.CreateOrRotateSessionAsync(user2, "candidate", "client_2", "10.0.0.1", "Browser", null, false);

        // Manually bump user.SecurityVersion without revoking session
        user2.SecurityVersion++;
        await context.SaveChangesAsync();

        var val2 = await service.ValidateSessionAsync(res2.Token!, isToken: true);
        Assert.False(val2.IsValid);
        Assert.Equal("SECURITY_VERSION_CHANGED", val2.FailureCode);

        var sessionCheck2 = await context.UserSessions.FindAsync(res2.Session!.Id);
        Assert.True(sessionCheck2!.Revoked);
        Assert.Equal("PrivilegeOrSecurityVersionChanged", sessionCheck2.RevocationReason);
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

    [Fact]
    public async Task ValidateSession_BySessionId_AcceptsValidSession()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var res = await service.CreateOrRotateSessionAsync(user, "candidate", "client_1", "10.0.0.1", "Browser", null, false);
        Assert.True(res.Success);

        // Validation by SessionId (Gateway HMAC pathway)
        var val = await service.ValidateSessionAsync(res.Session!.Id, isToken: false);
        Assert.True(val.IsValid);
        Assert.NotNull(val.Session);
        Assert.Equal(res.Session.Id, val.Session.Id);
    }

    [Fact]
    public async Task ValidateSession_BySessionId_RejectsRevokedSession()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var res = await service.CreateOrRotateSessionAsync(user, "candidate", "client_1", "10.0.0.1", "Browser", null, false);
        await service.RevokeSessionAsync(res.Session!.Id, "UserRevocation", user.Id);

        var val = await service.ValidateSessionAsync(res.Session.Id, isToken: false);
        Assert.False(val.IsValid);
        Assert.Equal("SESSION_REVOKED", val.FailureCode);
    }

    [Fact]
    public async Task ValidateSession_BySessionId_RejectsNonExistentSession()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var val = await service.ValidateSessionAsync("sess_unknown_id", isToken: false);
        Assert.False(val.IsValid);
        Assert.Equal("SESSION_NOT_FOUND", val.FailureCode);
    }

    [Fact]
    public async Task ValidateSession_BySessionId_RejectsSecurityVersionMismatch()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var res = await service.CreateOrRotateSessionAsync(user, "candidate", "client_1", "10.0.0.1", "Browser", null, false);

        // Invalidate security version
        await service.InvalidateUserSecurityVersionAsync(user.Id, "RoleChanged");

        var val = await service.ValidateSessionAsync(res.Session!.Id, isToken: false);
        Assert.False(val.IsValid);
        Assert.Equal("SECURITY_VERSION_CHANGED", val.FailureCode);
    }

    [Fact]
    public async Task Lockout_AbsoluteTimeoutExpiredSession_DoesNotConsumeSlotAndIsSwept()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        // Seed an unrevoked but absolute-time-expired session (the defect: it counts today)
        context.UserSessions.Add(new UserSession
        {
            Id = "sess_expired_abs",
            UserId = user.Id,
            Email = user.Email,
            Role = "candidate",
            DisplayName = user.DisplayName,
            TokenHash = "hash_abs",
            CsrfToken = "csrf_abs",
            ClientId = "cid_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            ExpiresAt = DateTime.UtcNow.AddMinutes(-30),
            IdleExpiresAt = DateTime.UtcNow.AddMinutes(-30),
            AbsoluteExpiresAt = DateTime.UtcNow.AddMinutes(-30),
            LastActiveAt = DateTime.UtcNow.AddMinutes(-40),
            SecurityVersion = user.SecurityVersion,
            Revoked = false
        });

        // Plus one healthy session occupying the other slot
        var res1 = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "10.0.0.1", "Browser", null, false);
        Assert.True(res1.Success);

        await context.SaveChangesAsync();

        // Login from a third client: the expired session must not block authentication
        var res2 = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_cccccccccccccccccccccccccccccccc", "10.0.0.2", "Browser 2", null, false);
        Assert.True(res2.Success);

        var swept = await context.UserSessions.FindAsync("sess_expired_abs");
        Assert.NotNull(swept);
        Assert.True(swept.Revoked);
        Assert.Equal(SessionSecurityService.ExpiredSessionSweptReason, swept.RevocationReason);
    }

    [Fact]
    public async Task Lockout_IdleTimeoutExpiredSession_DoesNotConsumeSlotAndIsSwept()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        context.UserSessions.Add(new UserSession
        {
            Id = "sess_expired_idle",
            UserId = user.Id,
            Email = user.Email,
            Role = "candidate",
            DisplayName = user.DisplayName,
            TokenHash = "hash_idle",
            CsrfToken = "csrf_idle",
            ClientId = "cid_dddddddddddddddddddddddddddddddd",
            CreatedAt = DateTime.UtcNow.AddHours(-2),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IdleExpiresAt = DateTime.UtcNow.AddMinutes(-5),
            AbsoluteExpiresAt = DateTime.UtcNow.AddDays(7),
            LastActiveAt = DateTime.UtcNow.AddHours(-2),
            SecurityVersion = user.SecurityVersion,
            Revoked = false
        });
        await context.SaveChangesAsync();

        // Both slots must now be available
        var res1 = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", "10.0.0.1", "Browser", null, false);
        var res2 = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_ffffffffffffffffffffffffffffffff", "10.0.0.2", "Browser 2", null, false);
        Assert.True(res1.Success);
        Assert.True(res2.Success);

        var swept = await context.UserSessions.FindAsync("sess_expired_idle");
        Assert.NotNull(swept);
        Assert.True(swept.Revoked);
        Assert.Equal(SessionSecurityService.ExpiredSessionSweptReason, swept.RevocationReason);
    }

    [Fact]
    public async Task Lockout_SecurityVersionStaleSession_DoesNotConsumeSlotAndIsSweptWithSentinelReason()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        context.UserSessions.Add(new UserSession
        {
            Id = "sess_version_stale",
            UserId = user.Id,
            Email = user.Email,
            Role = "candidate",
            DisplayName = user.DisplayName,
            TokenHash = "hash_stale",
            CsrfToken = "csrf_stale",
            ClientId = "cid_11111111111111111111111111111111",
            CreatedAt = DateTime.UtcNow.AddHours(-1),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IdleExpiresAt = DateTime.UtcNow.AddDays(7),
            AbsoluteExpiresAt = DateTime.UtcNow.AddDays(7),
            LastActiveAt = DateTime.UtcNow.AddHours(-1),
            SecurityVersion = user.SecurityVersion - 1, // stale
            Revoked = false
        });
        await context.SaveChangesAsync();

        var res = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_22222222222222222222222222222222", "10.0.0.1", "Browser", null, false);
        var res3 = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_33333333333333333333333333333333", "10.0.0.2", "Browser 2", null, false);
        Assert.True(res.Success);
        Assert.True(res3.Success);

        var swept = await context.UserSessions.FindAsync("sess_version_stale");
        Assert.NotNull(swept);
        Assert.True(swept.Revoked);
        Assert.Equal(SessionSecurityService.PrivilegeOrSecurityVersionChangedReason, swept.RevocationReason);

        // Validate-path messaging stays consistent with the sentinel reason
        var val = await service.ValidateSessionAsync("sess_version_stale", isToken: false);
        Assert.False(val.IsValid);
        Assert.Equal("SECURITY_VERSION_CHANGED", val.FailureCode);
    }

    [Fact]
    public async Task Lockout_RevokedSession_DoesNotConsumeSlot()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        context.UserSessions.Add(new UserSession
        {
            Id = "sess_revoked_blocked",
            UserId = user.Id,
            Email = user.Email,
            Role = "candidate",
            DisplayName = user.DisplayName,
            TokenHash = "hash_revoked",
            CsrfToken = "csrf_revoked",
            ClientId = "cid_44444444444444444444444444444444",
            CreatedAt = DateTime.UtcNow.AddHours(-1),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IdleExpiresAt = DateTime.UtcNow.AddDays(7),
            AbsoluteExpiresAt = DateTime.UtcNow.AddDays(7),
            LastActiveAt = DateTime.UtcNow.AddHours(-1),
            SecurityVersion = user.SecurityVersion,
            Revoked = true,
            RevokedAt = DateTime.UtcNow,
            RevocationReason = "SessionRevoked"
        });
        await context.SaveChangesAsync();

        var res1 = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_55555555555555555555555555555555", "10.0.0.1", "Browser", null, false);
        var res2 = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_66666666666666666666666666666666", "10.0.0.2", "Browser 2", null, false);
        Assert.True(res1.Success);
        Assert.True(res2.Success);
    }

    [Fact]
    public async Task Lockout_LegacyBackfilledSessions_DoNotConsumeSlots()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        // Reproduce migration 0009 backfill: phantom legacy sessions occupying every slot
        var now = DateTime.UtcNow;
        for (int i = 0; i < 4; i++)
        {
            var sessionId = $"sess_legacy_{i:D2}";
            context.UserSessions.Add(new UserSession
            {
                Id = sessionId,
                UserId = user.Id,
                Email = user.Email,
                Role = "candidate",
                DisplayName = user.DisplayName,
                TokenHash = $"hash_legacy_{i}",
                CsrfToken = $"csrf_legacy_{i}",
                ClientId = "legacy_" + sessionId, // exact backfill pattern
                CreatedAt = now.AddDays(-3),
                ExpiresAt = now.AddDays(4),
                IdleExpiresAt = now.AddDays(4),
                AbsoluteExpiresAt = now.AddDays(4),
                LastActiveAt = now.AddDays(-3),
                SecurityVersion = user.SecurityVersion,
                Revoked = false
            });
        }
        await context.SaveChangesAsync();

        // Login previously impossible with only legacy sessions present; it must succeed now
        var res = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_77777777777777777777777777777777", "10.0.0.1", "Browser", null, false);
        Assert.True(res.Success);

        // Legacy sessions are NOT silently swept by accounting; they are only excluded and
        // decommissioned via explicit recovery.
        var legacyInDb = await context.UserSessions.FindAsync("sess_legacy_00");
        Assert.NotNull(legacyInDb);
        Assert.False(legacyInDb.Revoked);

        // Eligible-session listing must exclude legacy sessions as well
        var listed = await service.GetActiveSessionsForUserAsync(user.Id);
        Assert.NotNull(listed);
        Assert.All(listed, s => Assert.False(s.ClientId!.StartsWith(SessionSecurityService.LegacyBackfilledClientPrefix)));
        Assert.Contains(listed, s => s.Id == res.Session!.Id);
    }

    [Fact]
    public async Task Lockout_LostResponseRetry_DoesNotPermanentlyLockUser()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        // Scenario: the browser holds cid_R for all logins but two sessions were created for it
        // (e.g. an interrupted rotation), reaching the per-client and per-user limits.
        var resA = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_repeataaaaaaaaaaaaaaaaaaaaaaaa", "10.0.0.1", "Browser", null, false);
        Assert.True(resA.Success);

        // A second login from the same client rotates (revokes) the first and creates a new one
        var resB = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_repeataaaaaaaaaaaaaaaaaaaaaaaa", "10.0.0.1", "Browser", null, false);
        Assert.True(resB.Success);

        // First token must no longer authenticate (rotated)
        var valA = await service.ValidateSessionAsync(resA.Session!.Id, isToken: false);
        Assert.False(valA.IsValid);
        Assert.Equal("SESSION_REVOKED", valA.FailureCode);

        // Retry cannot lock the user out: same-client login keeps succeeding
        var resC = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_repeataaaaaaaaaaaaaaaaaaaaaaaa", "10.0.0.1", "Browser", null, false);
        Assert.True(resC.Success);

        var valB = await service.ValidateSessionAsync(resB.Session!.Id, isToken: false);
        Assert.False(valB.IsValid);

        var valC = await service.ValidateSessionAsync(resC.Session!.Id, isToken: false);
        Assert.True(valC.IsValid);
    }

    [Fact]
    public async Task RecoverLoginAccessAsync_SweepsLegacyAndSweepsIneligibleWithoutCredentialsScope()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var other = await SeedUserAsync(context, id: "user_other_01", email: "other@example.com");
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var now = DateTime.UtcNow;
        // Legacy phantom sessions for the user (never claimed by a browser client)
        context.UserSessions.Add(new UserSession
        {
            Id = "sess_recovery_legacy",
            UserId = user.Id,
            Email = user.Email,
            Role = "candidate",
            DisplayName = user.DisplayName,
            TokenHash = "hash_rec_legacy",
            CsrfToken = "csrf_rec_legacy",
            ClientId = "legacy_sess_recovery_legacy",
            CreatedAt = now.AddDays(-3),
            ExpiresAt = now.AddDays(4),
            IdleExpiresAt = now.AddDays(4),
            AbsoluteExpiresAt = now.AddDays(4),
            LastActiveAt = now.AddDays(-3),
            SecurityVersion = user.SecurityVersion,
            Revoked = false
        });
        // Time-expired ineligible session
        context.UserSessions.Add(new UserSession
        {
            Id = "sess_recovery_expired",
            UserId = user.Id,
            Email = user.Email,
            Role = "candidate",
            DisplayName = user.DisplayName,
            TokenHash = "hash_rec_expired",
            CsrfToken = "csrf_rec_expired",
            ClientId = "cid_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            CreatedAt = now.AddHours(-3),
            ExpiresAt = now.AddHours(-1),
            IdleExpiresAt = now.AddHours(-1),
            AbsoluteExpiresAt = now.AddHours(-1),
            LastActiveAt = now.AddHours(-3),
            SecurityVersion = user.SecurityVersion,
            Revoked = false
        });
        // A healthy, unrelated user's session that must NOT be touched
        context.UserSessions.Add(new UserSession
        {
            Id = "sess_recovery_other",
            UserId = other.Id,
            Email = other.Email,
            Role = "candidate",
            DisplayName = other.DisplayName,
            TokenHash = "hash_rec_other",
            CsrfToken = "csrf_rec_other",
            ClientId = "legacy_sess_other_unreachable",
            CreatedAt = now.AddDays(-1),
            ExpiresAt = now.AddDays(6),
            IdleExpiresAt = now.AddDays(6),
            AbsoluteExpiresAt = now.AddDays(6),
            LastActiveAt = now.AddDays(-1),
            SecurityVersion = other.SecurityVersion,
            Revoked = false
        });
        await context.SaveChangesAsync();

        var result = await service.RecoverLoginAccessAsync(user.Id, clearRemainingEligibleSessions: false);

        Assert.True(result.Success);
        // 1 legacy decommissioned + 1 time-expired swept
        Assert.Equal(2, result.SweptIneligibleCount);
        Assert.Equal(0, result.ClearedEligibleCount);

        var legacy = await context.UserSessions.FindAsync("sess_recovery_legacy");
        Assert.True(legacy!.Revoked);
        Assert.Equal(SessionSecurityService.LegacySessionDecommissionedReason, legacy.RevocationReason);

        var expired = await context.UserSessions.FindAsync("sess_recovery_expired");
        Assert.True(expired!.Revoked);
        Assert.Equal(SessionSecurityService.ExpiredSessionSweptReason, expired.RevocationReason);

        // Cross-user protection: the other user's session untouched, and login audit written
        var otherSession = await context.UserSessions.FindAsync("sess_recovery_other");
        Assert.NotNull(otherSession);
        Assert.False(otherSession.Revoked);

        var audits = context.AuditLogs.Where(a => a.Action == "LoginAccessRecovered" && a.EntityId == user.Id).ToList();
        Assert.Single(audits);
        var otherAudits = context.AuditLogs.Where(a => a.Action == "LoginAccessRecovered" && a.EntityId == other.Id).ToList();
        Assert.Empty(otherAudits);
    }

    [Fact]
    public async Task RecoverLoginAccessAsync_ClearRemainingSessions_RequiresExplicitIntentAndNeverTouchesOtherUsers()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var other = await SeedUserAsync(context, id: "user_other_02", email: "other2@example.com");
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var healthy1 = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy", "10.0.0.1", "Browser", null, false);
        var healthy2 = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz", "10.0.0.2", "Browser 2", null, false);
        Assert.True(healthy1.Success);
        Assert.True(healthy2.Success);

        // The unrelated user's live sessions must remain fully intact
        var otherSession = await service.CreateOrRotateSessionAsync(other, "candidate", "cid_othercccccccccccccccccccccccccccc", "10.0.0.3", "Browser", null, false);
        Assert.True(otherSession.Success);

        var result = await service.RecoverLoginAccessAsync(user.Id, clearRemainingEligibleSessions: true);

        Assert.True(result.Success);
        Assert.Equal(0, result.SweptIneligibleCount);
        Assert.Equal(2, result.ClearedEligibleCount);

        var s1 = await context.UserSessions.FindAsync(healthy1.Session!.Id);
        var s2 = await context.UserSessions.FindAsync(healthy2.Session!.Id);
        Assert.True(s1!.Revoked);
        Assert.Equal(SessionSecurityService.LoginAccessRecoveryRevokedReason, s1.RevocationReason);
        Assert.True(s2!.Revoked);
        Assert.Equal(SessionSecurityService.LoginAccessRecoveryRevokedReason, s2.RevocationReason);

        var otherLive = await context.UserSessions.FindAsync(otherSession.Session!.Id);
        Assert.False(otherLive!.Revoked);

        // The locked-out user can now authenticate again
        var res = await service.CreateOrRotateSessionAsync(user, "candidate", "cid_newdddddddddddddddddddddddddddddd", "10.0.0.4", "Browser", null, false);
        Assert.True(res.Success);
    }

    [Fact]
    public async Task GetActiveSessionsForUserAsync_ExcludesSecurityVersionStaleSessions()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);
        var user = await SeedUserAsync(context);
        var service = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var now = DateTime.UtcNow;
        context.UserSessions.Add(new UserSession
        {
            Id = "sess_listing_stale",
            UserId = user.Id,
            Email = user.Email,
            Role = "candidate",
            DisplayName = user.DisplayName,
            TokenHash = "hash_listing_stale",
            CsrfToken = "csrf_listing_stale",
            ClientId = "cid_staleeeeeeeeeeeeeeeeeeeeeeeeeeee",
            CreatedAt = now.AddHours(-1),
            ExpiresAt = now.AddDays(7),
            IdleExpiresAt = now.AddDays(7),
            AbsoluteExpiresAt = now.AddDays(7),
            LastActiveAt = now.AddHours(-1),
            SecurityVersion = user.SecurityVersion - 1,
            Revoked = false
        });
        context.UserSessions.Add(new UserSession
        {
            Id = "sess_listing_legacy",
            UserId = user.Id,
            Email = user.Email,
            Role = "candidate",
            DisplayName = user.DisplayName,
            TokenHash = "hash_listing_legacy",
            CsrfToken = "csrf_listing_legacy",
            ClientId = "legacy_sess_listing_legacy",
            CreatedAt = now.AddHours(-1),
            ExpiresAt = now.AddDays(7),
            IdleExpiresAt = now.AddDays(7),
            AbsoluteExpiresAt = now.AddDays(7),
            LastActiveAt = now.AddHours(-1),
            SecurityVersion = user.SecurityVersion,
            Revoked = false
        });
        await context.SaveChangesAsync();

        var listed = await service.GetActiveSessionsForUserAsync(user.Id);
        Assert.Empty(listed);
    }
}
