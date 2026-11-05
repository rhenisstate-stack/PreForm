using System.Net.Http.Json;
using System.Net;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Preform.Api.Data;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

/// <summary>
/// Controller-level regression tests for the concurrent-session lockout defect.
/// Reproduces the reported P0 mechanism — migration-backfilled legacy client
/// identities and stale unrevoked sessions consuming both concurrent slots — at
/// the HTTP boundary, and verifies recovery, rate limiting and no information
/// disclosure. Uses the same in-memory application factory as existing AppTests.
/// </summary>
public class SessionAccountingLockoutTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public SessionAccountingLockoutTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("TestingSessionAccountingLockoutDb"));
            });
        });
    }

    private const string LockoutUserEmail = "lockout.candidate@prepford.com";

    private static string Sha256Hex(string content)
        => Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(content))).ToLowerInvariant();

    private async Task<User> SeedLockedOutUserAsync(AppDbContext db, string password, string email)
    {
        var hasher = new PasswordHasher<User>();
        var user = new User
        {
            Id = "usr_lockout_" + Guid.NewGuid().ToString("N"),
            Email = email,
            DisplayName = "Lockout Candidate",
            IsActive = true,
            SecurityVersion = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        user.PasswordHash = hasher.HashPassword(user, password);
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    /// <summary>
    /// Exact reported defect: all slots consumed by legacy backfilled sessions with
    /// legacy_ || Id client identities. Login from a canonical browser cid_* must succeed.
    /// </summary>
    [Fact]
    public async Task Login_WithLegacyPhantomSessionsOccupyingAllSlots_SucceedsAfterFix()
    {
        string password = "Sup3r-Strong-Nurse-P@ssword2026!";
        var client = _factory.CreateClient();
        string userId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await SeedLockedOutUserAsync(db, password, LockoutUserEmail);
            userId = user.Id;

            // Migration 0009 backfill exactly: 'legacy_' || Id, unrevoked, unexpired lifetimes
            var now = DateTime.UtcNow;
            for (int i = 0; i < 6; i++)
            {
                var legacyId = $"sess_legacybackfix_{userId.Substring(0, 12)}_{i:D2}";
                db.UserSessions.Add(new UserSession
                {
                    Id = legacyId,
                    UserId = userId,
                    Email = user.Email,
                    Role = "candidate",
                    DisplayName = user.DisplayName,
                    TokenHash = $"hash_{legacyId}",
                    CsrfToken = $"csrf_{legacyId}",
                    ClientId = "legacy_" + legacyId,
                    CreatedAt = now.AddDays(-3),
                    ExpiresAt = now.AddDays(4),
                    IdleExpiresAt = now.AddDays(4),
                    AbsoluteExpiresAt = now.AddDays(4),
                    LastActiveAt = now.AddDays(-3),
                    SecurityVersion = user.SecurityVersion,
                    Revoked = false
                });
            }
            await db.SaveChangesAsync();
        }

        var loginRes = await client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            Email = LockoutUserEmail,
            Password = password,
            ClientId = "cid_lockoutbrowser0000000000000000aa"
        });

        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);
        var body = await loginRes.Content.ReadAsStringAsync();
        Assert.Contains("\"success\":true", body);

        // Legacy phantoms are not silently revoked by accounting alone (recovery is explicit)
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var stillUnrevoked = await db.UserSessions.CountAsync(s => s.UserId == userId && !s.Revoked && s.ClientId.StartsWith("legacy_"));
            Assert.Equal(6, stillUnrevoked);

            // A healthy new session exists bound to the browser's canonical client identity
            var newSession = await db.UserSessions.FirstOrDefaultAsync(s => s.UserId == userId && s.ClientId == "cid_lockoutbrowser0000000000000000aa");
            Assert.NotNull(newSession);

            // Repeated login from the same browser rotates instead of accumulating
            var repeat = await client.PostAsJsonAsync("/api/v1/auth/login", new
            {
                Email = LockoutUserEmail,
                Password = password,
                ClientId = "cid_lockoutbrowser0000000000000000aa"
            });
            Assert.Equal(HttpStatusCode.OK, repeat.StatusCode);

            var activeForClient = await db.UserSessions
                .CountAsync(s => s.UserId == userId && s.ClientId == "cid_lockoutbrowser0000000000000000aa" && !s.Revoked);
            Assert.Equal(1, activeForClient);

            var firstSessionIds = await db.UserSessions
                .Where(s => s.UserId == userId && s.ClientId == "cid_lockoutbrowser0000000000000000aa" && s.Revoked)
                .Select(s => s.RevocationReason)
                .ToListAsync();
            Assert.All(firstSessionIds, r => Assert.Equal("ReplacedBySameClient", r));
        }
    }

    [Fact]
    public async Task Register_ThenRepeatedLogin_SameClientRotatesWithNoPhantomOrphans()
    {
        string password = "Another-Strong-Nurse-P@ssword2026!";
        string email = "register.rotation@prepford.com";
        var client = _factory.CreateClient();
        var browserClientId = "cid_registerflow0000000000000000bb";

        var registerRes = await client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            Email = email,
            Password = password,
            DisplayName = "Rotation Candidate",
            Pathway = "rn",
            ClientId = browserClientId
        });
        Assert.Equal(HttpStatusCode.OK, registerRes.StatusCode);

        // Register must no longer create a backend-random phantom identity: the
        // canonical browser cid_* must be persisted on the issued session.
        string registerSessionId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.FirstAsync(u => u.Email == email);
            var session = await db.UserSessions.FirstOrDefaultAsync(s => s.UserId == user.Id);
            Assert.NotNull(session);
            Assert.Equal(browserClientId, session!.ClientId);
            registerSessionId = session.Id;
        }

        // Repeated login from the same browser client: rotation, exactly one active session
        for (int i = 0; i < 3; i++)
        {
            var loginRes = await client.PostAsJsonAsync("/api/v1/auth/login", new
            {
                Email = email,
                Password = password,
                ClientId = browserClientId
            });
            Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.FirstAsync(u => u.Email == email);
            var active = await db.UserSessions.CountAsync(s => s.UserId == user.Id && s.ClientId == browserClientId && !s.Revoked);
            Assert.Equal(1, active);
            // No session for this user was ever created with a non-canonical identity
            var canonicalCount = await db.UserSessions
                .CountAsync(s => s.UserId == user.Id && s.ClientId.StartsWith("cid_"));
            var totalCount = await db.UserSessions.CountAsync(s => s.UserId == user.Id);
            Assert.Equal(totalCount, canonicalCount);

            // The original registration session was rotated away (not silently reused)
            var original = await db.UserSessions.FindAsync(registerSessionId);
            Assert.NotNull(original);
            Assert.True(original!.Revoked);
        }
    }

    [Fact]
    public async Task ChangePassword_PreservesCanonicalClientIdentity()
    {
        string password = "Change-Flow-Strong-P@ssword2026!";
        string email = "password.rotation@prepford.com";
        var client = _factory.CreateClient();
        var browserClientId = "cid_changepwd0000000000000000cc";

        var registerRes = await client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            Email = email,
            Password = password,
            DisplayName = "Password Flow Candidate",
            Pathway = "rn",
            ClientId = browserClientId
        });
        Assert.Equal(HttpStatusCode.OK, registerRes.StatusCode);

        string userId;
        string sessionId;
        string loginToken;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.FirstAsync(u => u.Email == email);
            userId = user.Id;
            var session = await db.UserSessions.FirstAsync(s => s.ClientId == browserClientId && !s.Revoked);
            Assert.NotNull(session);
            sessionId = session!.Id;
        }

        // Obtain a working token for the same client through login (rotation)
        var loginRes = await client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            Email = email,
            Password = password,
            ClientId = browserClientId
        });
        loginRes.EnsureSuccessStatusCode();
        var loginBody = await loginRes.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.True(loginBody!.Success);
        loginToken = loginBody.Token!;
        sessionId = loginBody.SessionId!;

        // Authorize the change-password endpoint with canonical gateway headers pointing to
        // the session, and send the canonical browser clientId exactly as the BFF now does.
        var changePayload = System.Text.Json.JsonSerializer.Serialize(new
        {
            CurrentPassword = password,
            NewPassword = "Rotated-Strong-P@ssword2026!",
            ClientId = browserClientId
        });
        GatewayHmacAndReplaySecurityTests.AddCanonicalHeaders(
            client, "POST", "/api/v1/profile/change-password", userId, email, "candidate",
            Sha256Hex(changePayload));
        client.DefaultRequestHeaders.Add("X-Session-Id", sessionId);

        var changeRes = await client.PostAsync("/api/v1/profile/change-password",
            new StringContent(changePayload, System.Text.Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.OK, changeRes.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            // The rotation session must keep the canonical browser identity, never a phantom
            var rotated = await db.UserSessions.FirstOrDefaultAsync(s => s.UserId == userId && !s.Revoked);
            Assert.NotNull(rotated);
            Assert.Equal(browserClientId, rotated!.ClientId);

            // Prior session was revoked by the security-version invalidation
            var prior = await db.UserSessions.FindAsync(sessionId);
            Assert.NotNull(prior);
            Assert.True(prior!.Revoked);
        }
    }

    [Fact]
    public async Task RecoverSessions_WithInvalidCredentials_ReturnsGeneric401AndRateLimits()
    {
        string password = "Recovery-Strong-P@ssword2026!";
        string email = "recovery.invalid@prepford.com";
        var client = _factory.CreateClient();

        // Unknown account keeps the same generic response as wrong password
        var unknownRes = await client.PostAsJsonAsync("/api/v1/auth/recover-sessions", new
        {
            Email = "no.such.account@prepford.com",
            Password = "whatever-Password123!"
        });
        Assert.Equal(HttpStatusCode.Unauthorized, unknownRes.StatusCode);
        var unknownBody = await unknownRes.Content.ReadAsStringAsync();
        Assert.Contains("INVALID_CREDENTIALS", unknownBody);
        Assert.DoesNotContain("swept", unknownBody);

        // Known account, wrong password: generic 401, no device/session disclosure
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await SeedLockedOutUserAsync(db, password, email);
        }

        for (int i = 0; i < 5; i++)
        {
            var res = await client.PostAsJsonAsync("/api/v1/auth/recover-sessions", new
            {
                Email = email,
                Password = "Wrong-Password-Attempt!" + i
            });
            Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
        }

        // Sixth attempt is rate limited even with correct credentials
        var limited = await client.PostAsJsonAsync("/api/v1/auth/recover-sessions", new
        {
            Email = email,
            Password = password
        });
        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.True(limited.Headers.Contains("Retry-After"));

        AuthController.ResetLoginRecoveryRateLimitsForTesting();
    }

    [Fact]
    public async Task RecoverSessions_WithValidCredentials_RevokesStaleSessionsWithoutDisclosure()
    {
        string password = "Recovery-Success-P@ssword2026!";
        string email = "recovery.success@prepford.com";
        var client = _factory.CreateClient();
        string userId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await SeedLockedOutUserAsync(db, password, email);
            userId = user.Id;

            var now = DateTime.UtcNow;
            db.UserSessions.Add(new UserSession
            {
                Id = "sess_recovery_http_legacy",
                UserId = userId,
                Email = user.Email,
                Role = "candidate",
                DisplayName = user.DisplayName,
                TokenHash = "hash_rec_http",
                CsrfToken = "csrf_rec_http",
                ClientId = "legacy_sess_recovery_http_legacy",
                CreatedAt = now.AddDays(-2),
                ExpiresAt = now.AddDays(5),
                IdleExpiresAt = now.AddDays(5),
                AbsoluteExpiresAt = now.AddDays(5),
                LastActiveAt = now.AddDays(-2),
                SecurityVersion = user.SecurityVersion,
                Revoked = false
            });
            await db.SaveChangesAsync();
        }

        var res = await client.PostAsJsonAsync("/api/v1/auth/recover-sessions", new
        {
            Email = email,
            Password = password,
            ClearRemainingSessions = false
        });

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadAsStringAsync();
        Assert.Contains("\"success\":true", body);
        // No session or device details may be disclosed (counts, ids, device labels)
        Assert.DoesNotContain("sess_", body);
        Assert.DoesNotContain("device", body.ToLowerInvariant());
        Assert.DoesNotContain("sessionid", body.ToLowerInvariant());

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var legacy = await db.UserSessions.FindAsync("sess_recovery_http_legacy");
            Assert.True(legacy!.Revoked);
            Assert.Equal(SessionSecurityService.LegacySessionDecommissionedReason, legacy.RevocationReason);

            var audits = await db.AuditLogs
                .Where(a => a.Action == "LoginAccessRecovered" && a.EntityId == userId)
                .ToListAsync();
            Assert.Single(audits);
            Assert.DoesNotContain(legacy.ClientId!, audits[0].Description!);
        }
    }

    [Fact]
    public async Task RecoverSessions_DoesNotAffectOtherUsersSessions()
    {
        string password = "Recovery-Isolation-P@ssword2026!";
        string email = "recovery.isolation@prepford.com";
        string otherEmail = "recovery.bystander@prepford.com";
        var client = _factory.CreateClient();
        string otherSessionId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await SeedLockedOutUserAsync(db, password, email);
            var other = await SeedLockedOutUserAsync(db, password, otherEmail);
            var hasher = new PasswordHasher<User>();
            var fresh = await db.Users.FindAsync(other.Id);
            fresh!.PasswordHash = hasher.HashPassword(fresh!, password);
            await db.SaveChangesAsync();

            var securityService = scope.ServiceProvider.GetRequiredService<ISessionSecurityService>();
            var otherSession = await securityService.CreateOrRotateSessionAsync(fresh, "candidate", "cid_bystander0000000000000000dd", "10.0.0.9", "Mozilla/5.0", null, false);
            otherSessionId = otherSession.Session!.Id;
        }

        // Requests to recover the user's access must never touch the bystander
        var res = await client.PostAsJsonAsync("/api/v1/auth/recover-sessions", new
        {
            Email = email,
            Password = password,
            ClearRemainingSessions = true
        });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var otherSession = await db.UserSessions.FindAsync(otherSessionId);
            Assert.NotNull(otherSession);
            Assert.False(otherSession!.Revoked);
        }
    }
}
