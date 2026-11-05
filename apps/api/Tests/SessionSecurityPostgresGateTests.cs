using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using Preform.Api.Data;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

/// <summary>
/// Phase 8 Final Acceptance Gate — PostgreSQL-backed session security verification.
/// These tests execute SessionSecurityService against the isolated loopback database
/// (prepford_gateb_verification) so that the advisory-lock code path (which is skipped
/// on non-relational providers) is genuinely exercised.
/// </summary>
[Collection("PostgreSQL integration tests")]
public class SessionSecurityPostgresGateTests : IClassFixture<PostgresTestFixture>
{
    private readonly PostgresTestFixture _factory;

    public SessionSecurityPostgresGateTests(PostgresTestFixture factory)
    {
        _factory = factory;
    }

    private AppDbContext CreatePostgresDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(PostgresTestFixture.ConnectionString)
            .Options;
        return new AppDbContext(options);
    }

    private static SessionSecurityService CreateService(AppDbContext context)
        => new(context, NullLogger<SessionSecurityService>.Instance);

    private async Task<User> SeedUserAsync(AppDbContext context, string id, string email)
    {
        var user = new User
        {
            Id = id,
            Email = email,
            DisplayName = "PG Gate Learner",
            IsActive = true,
            SecurityVersion = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return context.Users.AsNoTracking().First(u => u.Id == id);
    }

    [Fact]
    public async Task AdvisoryLock_ExternalHolder_SerializesSessionCreation_UntilReleased()
    {
        await _factory.InitializePostgresDatabaseAsync();
        var userId = "usr_pgadv_" + Guid.NewGuid().ToString("N");
        await using var seedContext = CreatePostgresDbContext();
        await SeedUserAsync(seedContext, userId, $"pgadv_{Guid.NewGuid():N}@prepford.test");

        // Hold the same advisory lock the service acquires, on an INDEPENDENT connection —
        // simulating a second API instance already serialized for this user.
        await using var externalConnection = new NpgsqlConnection(PostgresTestFixture.ConnectionString);
        await externalConnection.OpenAsync();
        await using var externalTransaction = await externalConnection.BeginTransactionAsync();
        await using (var lockCommand = externalConnection.CreateCommand())
        {
            lockCommand.Transaction = externalTransaction;
            lockCommand.CommandText = "SELECT pg_advisory_xact_lock(hashtext('user_session_' || $1));";
            lockCommand.Parameters.AddWithValue(userId);
            await lockCommand.ExecuteScalarAsync();
        }

        // While the lock is held, session creation must not complete.
        await using var blockedContext = CreatePostgresDbContext();
        var blockedService = CreateService(blockedContext);
        using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => blockedService.CreateOrRotateSessionAsync(
                blockedContext.Users.AsNoTracking().First(u => u.Id == userId),
                "candidate",
                "cid_blocked_holder",
                "127.0.0.1",
                "Mozilla/5.0 Minimal",
                null,
                false,
                timeoutCts.Token));

        // Releasing the advisory lock must allow session creation to proceed.
        await externalTransaction.RollbackAsync();

        await using var retryContext = CreatePostgresDbContext();
        var retryService = CreateService(retryContext);
        var result = await retryService.CreateOrRotateSessionAsync(
            retryContext.Users.AsNoTracking().First(u => u.Id == userId),
            "candidate",
            "cid_after_release",
            "127.0.0.1",
            "Mozilla/5.0 Minimal",
            null,
            false);

        Assert.True(result.Success);
        Assert.NotNull(result.Session);
    }

    [Fact]
    public async Task ConcurrentSessionCreation_AgainstPostgreSql_RespectsMaxConcurrentSessions()
    {
        await _factory.InitializePostgresDatabaseAsync();
        var userId = "usr_pgconc_" + Guid.NewGuid().ToString("N");
        var dbNameId = Guid.NewGuid().ToString("N");
        await using var seedContext = CreatePostgresDbContext();
        await SeedUserAsync(seedContext, userId, $"pgconc_{dbNameId}@prepford.test");

        const int totalRequests = 8;
        var tasks = new Task<SessionCreationResult>[totalRequests];
        for (int i = 0; i < totalRequests; i++)
        {
            var capturedClientId = $"cid_pgconc_{Guid.NewGuid():N}_{i}";
            tasks[i] = Task.Run(async () =>
            {
                await using var requestContext = CreatePostgresDbContext();
                var requestUser = await requestContext.Users.AsNoTracking().FirstAsync(u => u.Id == userId);
                var service = CreateService(requestContext);
                return await service.CreateOrRotateSessionAsync(
                    requestUser!, "candidate", capturedClientId, "127.0.0.1", "Mozilla/5.0 PG", null, false);
            });
        }

        var results = await Task.WhenAll(tasks);

        var successCount = results.Count(r => r.Success);
        var rejectedCount = results.Count(r => !r.Success && r.ErrorCode == "CONCURRENT_SESSION_LIMIT_EXCEEDED");
        Assert.Equal(2, successCount); // Default MaxConcurrentSessions = 2
        Assert.Equal(totalRequests - 2, rejectedCount);

        await using var verifyContext = CreatePostgresDbContext();
        var activeCount = await verifyContext.UserSessions.CountAsync(s => s.UserId == userId && !s.Revoked);
        Assert.Equal(2, activeCount);
    }

    [Fact]
    public async Task ConcurrentSameClientRotation_AgainstPostgreSql_LeavesSingleActiveClientSession()
    {
        await _factory.InitializePostgresDatabaseAsync();
        var userId = "usr_pgrot_" + Guid.NewGuid().ToString("N");
        var sharedClientId = "cid_pgrot_" + Guid.NewGuid().ToString("N");
        await using var seedContext = CreatePostgresDbContext();
        await SeedUserAsync(seedContext, userId, $"pgrot_{Guid.NewGuid():N}@prepford.test");

        var rotationTasks = Enumerable.Range(0, 4).Select(_ => Task.Run(async () =>
        {
            await using var requestContext = CreatePostgresDbContext();
            var requestUser = await requestContext.Users.AsNoTracking().FirstAsync(u => u.Id == userId);
            var service = CreateService(requestContext);
            return await service.CreateOrRotateSessionAsync(
                requestUser!, "candidate", sharedClientId, "127.0.0.1", "Mozilla/5.0 PG Rotation", null, false);
        })).ToArray();

        var rotationResults = await Task.WhenAll(rotationTasks);
        Assert.All(rotationResults, r => Assert.True(r.Success));

        await using var verifyContext = CreatePostgresDbContext();
        var activeClientSessions = await verifyContext.UserSessions
            .CountAsync(s => s.UserId == userId && s.ClientId == sharedClientId && !s.Revoked);
        Assert.Equal(1, activeClientSessions);

        var rotatedSessions = await verifyContext.UserSessions
            .CountAsync(s => s.UserId == userId && s.ClientId == sharedClientId && s.Revoked && s.RevocationReason == "ReplacedBySameClient");
        Assert.True(rotatedSessions >= 1);
    }

    [Fact]
    public async Task SecurityVersionInvalidationRace_AgainstPostgreSql_OldTokensRejectedAfterInvalidateCompletes()
    {
        await _factory.InitializePostgresDatabaseAsync();
        var userId = "usr_pgsev_" + Guid.NewGuid().ToString("N");
        await using var seedContext = CreatePostgresDbContext();
        var user = await SeedUserAsync(seedContext, userId, $"pgsev_{Guid.NewGuid():N}@prepford.test");

        string? tokenA = null;
        string? tokenB = null;
        await using (var setupContext = CreatePostgresDbContext())
        {
            var setupService = CreateService(setupContext);
            var resA = await setupService.CreateOrRotateSessionAsync(
                user, "candidate", "cid_pgsev_A", "10.0.0.1", "Chrome", null, false);
            var resB = await setupService.CreateOrRotateSessionAsync(
                user, "candidate", "cid_pgsev_B", "10.0.0.2", "Firefox", null, false);
            Assert.True(resA.Success && resB.Success);
            tokenA = resA.Token;
            tokenB = resB.Token;
        }

        // Race: security-version invalidation concurrent with authentication attempts on the old token.
        var invalidateTask = Task.Run(async () =>
        {
            await using var ctx = CreatePostgresDbContext();
            var svc = CreateService(ctx);
            await svc.InvalidateUserSecurityVersionAsync(userId, "Phase8GateEnforcedLogout");
        });
        var validateRaceTask = Task.Run(async () =>
        {
            await using var ctx = CreatePostgresDbContext();
            var svc = CreateService(ctx);
            try
            {
                return await svc.ValidateSessionAsync(tokenA!, isToken: true, ipAddress: "10.0.0.1", userAgent: "Chrome");
            }
            catch
            {
                return SessionValidationResult.Fail("RACE_OBSERVED", "Transient race failure.");
            }
        });

        await Task.WhenAll(invalidateTask, validateRaceTask);

        // After invalidation completes, the old tokens must be rejected deterministically.
        await using var verifyContext = CreatePostgresDbContext();
        var verifyService = CreateService(verifyContext);
        var finalValidationA = await verifyService.ValidateSessionAsync(tokenA!, isToken: true);
        var finalValidationB = await verifyService.ValidateSessionAsync(tokenB!, isToken: true);

        Assert.False(finalValidationA.IsValid);
        Assert.False(finalValidationB.IsValid);

        var invalidatedUser = await verifyContext.Users.AsNoTracking().FirstAsync(u => u.Id == userId);
        Assert.Equal(user.SecurityVersion + 1, invalidatedUser.SecurityVersion);
        var allSessionsRevoked = await verifyContext.UserSessions.CountAsync(s => s.UserId == userId && s.Revoked);
        var totalSessions = await verifyContext.UserSessions.CountAsync(s => s.UserId == userId);
        Assert.Equal(totalSessions, allSessionsRevoked);
    }

    [Fact]
    public async Task RevocationAuthenticationRace_AgainstPostgreSql_OldTokenRejectedAfterRevocationCompletes()
    {
        await _factory.InitializePostgresDatabaseAsync();
        var userId = "usr_pgrev_" + Guid.NewGuid().ToString("N");
        await using var seedContext = CreatePostgresDbContext();
        var user = await SeedUserAsync(seedContext, userId, $"pgrev_{Guid.NewGuid():N}@prepford.test");

        var actorUserId = "usr_pgrevadm_" + Guid.NewGuid().ToString("N");
        seedContext.Users.Add(new User
        {
            Id = actorUserId,
            Email = $"pgrevadm_{Guid.NewGuid():N}@prepford.test",
            DisplayName = "PG Gate Admin Actor",
            IsActive = true,
            SecurityVersion = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await seedContext.SaveChangesAsync();

        string? sessionId = null;
        string? token = null;
        await using (var setupContext = CreatePostgresDbContext())
        {
            var setupService = CreateService(setupContext);
            var result = await setupService.CreateOrRotateSessionAsync(
                user, "candidate", "cid_pgrev", "10.0.0.1", "Edge", null, false);
            Assert.True(result.Success);
            sessionId = result.Session!.Id;
            token = result.Token!;
        }

        var revokeTask = Task.Run(async () =>
        {
            await using var ctx = CreatePostgresDbContext();
            var svc = CreateService(ctx);
            return await svc.RevokeSessionAsync(sessionId!, "AdminRevoked", actorUserId);
        });
        var authenticateTask = Task.Run(async () =>
        {
            await using var ctx = CreatePostgresDbContext();
            var svc = CreateService(ctx);
            try
            {
                return await svc.ValidateSessionAsync(token, isToken: true, ipAddress: "10.0.0.1", userAgent: "Edge");
            }
            catch
            {
                return SessionValidationResult.Fail("RACE_OBSERVED", "Transient race failure.");
            }
        });

        await Task.WhenAll(revokeTask, authenticateTask);

        // After administrative revocation completes, the session token must never validate again.
        await using var verifyContext = CreatePostgresDbContext();
        var verifyService = CreateService(verifyContext);
        var postRevocationValidation = await verifyService.ValidateSessionAsync(token, isToken: true);
        Assert.False(postRevocationValidation.IsValid);
        Assert.Equal("SESSION_REVOKED", postRevocationValidation.FailureCode);

        var revokedSession = await verifyContext.UserSessions.AsNoTracking().FirstAsync(s => s.Id == sessionId);
        Assert.True(revokedSession.Revoked);
        Assert.Equal("AdminRevoked", revokedSession.RevocationReason);
    }

    [Fact]
    public async Task SessionPolicyEnforcement_AgainstPostgreSql_ConsumesLivePolicyWithoutCacheLag()
    {
        await _factory.InitializePostgresDatabaseAsync();
        var userId = "usr_pgpol_" + Guid.NewGuid().ToString("N");
        await using var seedContext = CreatePostgresDbContext();
        var user = await SeedUserAsync(seedContext, userId, $"pgpol_{Guid.NewGuid():N}@prepford.test");

        var oldPolicy = (await seedContext.SessionSecurityPolicies.AsNoTracking().FirstAsync(p => p.Id == "global_policy"));
        try
        {
            // Tighten the live policy: a single concurrent session per user.
            var storedPolicy = await seedContext.SessionSecurityPolicies.FirstAsync(p => p.Id == "global_policy");
            storedPolicy.MaxConcurrentSessions = 1;
            await seedContext.SaveChangesAsync();

            await using var secondContext = CreatePostgresDbContext();
            var secondService = CreateService(secondContext);
            var firstSession = await secondService.CreateOrRotateSessionAsync(
                secondContext.Users.AsNoTracking().First(u => u.Id == userId), "candidate",
                "cid_pgpol_first", "127.0.0.1", "Mozilla/5.0 Policy", null, false);
            Assert.True(firstSession.Success);

            // The second login must be rejected against PostgreSQL using the persisted policy.
            await using var thirdContext = CreatePostgresDbContext();
            var thirdService = CreateService(thirdContext);
            var secondSession = await thirdService.CreateOrRotateSessionAsync(
                thirdContext.Users.AsNoTracking().First(u => u.Id == userId), "candidate",
                "cid_pgpol_second", "127.0.0.1", "Mozilla/5.0 Policy", null, false);

            Assert.False(secondSession.Success);
            Assert.Equal("CONCURRENT_SESSION_LIMIT_EXCEEDED", secondSession.ErrorCode);
        }
        finally
        {
            // Restore the original global policy regardless of the outcome.
            await using var restoreContext = CreatePostgresDbContext();
            var restorePolicy = await restoreContext.SessionSecurityPolicies.FirstAsync(p => p.Id == "global_policy");
            restorePolicy.MaxConcurrentSessions = oldPolicy.MaxConcurrentSessions;
            restorePolicy.MaxSessionsPerClient = oldPolicy.MaxSessionsPerClient;
            restorePolicy.IdleTimeoutMinutes = oldPolicy.IdleTimeoutMinutes;
            restorePolicy.AbsoluteTimeoutMinutes = oldPolicy.AbsoluteTimeoutMinutes;
            restorePolicy.PolicyVersion = oldPolicy.PolicyVersion;
            await restoreContext.SaveChangesAsync();
        }
    }
}
