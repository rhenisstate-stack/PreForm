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

public class LearnerSecurityControllerTests
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

    private SecurityController CreateController(AppDbContext context, string? userId, string? sessionId = null)
    {
        var sessionSecurityService = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);
        var controller = new SecurityController(context, sessionSecurityService, NullLogger<SecurityController>.Instance);

        var httpContext = new DefaultHttpContext();
        if (!string.IsNullOrWhiteSpace(userId))
        {
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, userId),
                new(ClaimTypes.Email, $"{userId}@example.com"),
                new(ClaimTypes.Role, "candidate"),
                new(ClaimTypes.Name, "Test Candidate")
            };
            if (!string.IsNullOrWhiteSpace(sessionId))
            {
                claims.Add(new Claim("sessionId", sessionId));
            }
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

    private async Task<User> SeedUserWithSessionsAsync(AppDbContext context, string userId, int sessionCount)
    {
        var user = new User
        {
            Id = userId,
            Email = $"{userId}@example.com",
            DisplayName = $"Learner {userId}",
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
                MaxConcurrentSessions = 5,
                MaxSessionsPerClient = 1,
                IdleTimeoutMinutes = 300,
                AbsoluteTimeoutMinutes = 10080,
                IsActive = true
            });
        }

        for (int i = 1; i <= sessionCount; i++)
        {
            context.UserSessions.Add(new UserSession
            {
                Id = $"sess_{userId}_{i}",
                UserId = userId,
                Email = user.Email,
                Role = "candidate",
                DisplayName = user.DisplayName,
                TokenHash = $"hash_{userId}_{i}",
                CsrfToken = $"csrf_{userId}_{i}",
                ClientId = $"cid_{userId}_{i:D32}",
                DeviceLabel = $"Browser {i} on Windows",
                UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
                LastIpAddress = $"192.168.1.{i}",
                CreatedAt = DateTime.UtcNow.AddHours(-i),
                LastActiveAt = DateTime.UtcNow.AddMinutes(-i * 10),
                IdleExpiresAt = DateTime.UtcNow.AddHours(4),
                AbsoluteExpiresAt = DateTime.UtcNow.AddDays(6),
                Revoked = false,
                SecurityVersion = 1
            });
        }

        await context.SaveChangesAsync();
        return user;
    }

    [Fact]
    public async Task GetActiveSessions_ReturnsOnlyOwnedSessions_AndExcludesSensitiveData()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);

        await SeedUserWithSessionsAsync(context, "user_alice", 2);
        await SeedUserWithSessionsAsync(context, "user_bob", 1);

        var controller = CreateController(context, "user_alice", "sess_user_alice_1");
        var result = await controller.GetActiveSessions(CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<LearnerSessionsResponseDto>(okResult.Value);

        Assert.True(response.Success);
        Assert.Equal(2, response.Sessions.Count);
        Assert.All(response.Sessions, s => Assert.StartsWith("sess_user_alice", s.Id));

        // Check current session flag
        var currentSession = response.Sessions.First(s => s.Id == "sess_user_alice_1");
        Assert.True(currentSession.IsCurrent);

        var otherSession = response.Sessions.First(s => s.Id == "sess_user_alice_2");
        Assert.False(otherSession.IsCurrent);

        // Verify DeviceLabel and metadata
        Assert.Equal("Browser 1 on Windows", currentSession.DeviceLabel);
        Assert.Equal("192.168.1.1", currentSession.LastIpAddress);
    }

    [Fact]
    public async Task GetActiveSessions_Unauthenticated_ReturnsUnauthorized()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);

        var controller = CreateController(context, null);
        var result = await controller.GetActiveSessions(CancellationToken.None);

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task RevokeSession_OwnedSession_SucceedsAndSetsRevoked()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);

        await SeedUserWithSessionsAsync(context, "user_alice", 2);

        var controller = CreateController(context, "user_alice", "sess_user_alice_1");
        var result = await controller.RevokeSession("sess_user_alice_2", CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<RevokeSessionResultDto>(okResult.Value);
        Assert.True(response.Success);

        var sessionInDb = await context.UserSessions.FindAsync("sess_user_alice_2");
        Assert.NotNull(sessionInDb);
        Assert.True(sessionInDb.Revoked);
        Assert.Equal("UserRevocation", sessionInDb.RevocationReason);
    }

    [Fact]
    public async Task RevokeSession_AnotherUserSession_Returns403Forbidden()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);

        await SeedUserWithSessionsAsync(context, "user_alice", 1);
        await SeedUserWithSessionsAsync(context, "user_bob", 1);

        var controller = CreateController(context, "user_alice", "sess_user_alice_1");
        // Alice attempts to revoke Bob's session
        var result = await controller.RevokeSession("sess_user_bob_1", CancellationToken.None);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);

        // Bob's session remains active
        var bobSession = await context.UserSessions.FindAsync("sess_user_bob_1");
        Assert.NotNull(bobSession);
        Assert.False(bobSession.Revoked);

        // Audit log recorded the attempt
        var audit = await context.AuditLogs.FirstOrDefaultAsync(a => a.Action == "UnauthorizedSessionRevocationAttempt");
        Assert.NotNull(audit);
        Assert.Equal("user_alice", audit.ActorId);
    }

    [Fact]
    public async Task RevokeSession_NonExistentSession_Returns404NotFound()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);

        await SeedUserWithSessionsAsync(context, "user_alice", 1);

        var controller = CreateController(context, "user_alice", "sess_user_alice_1");
        var result = await controller.RevokeSession("sess_non_existent", CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task RevokeOtherSessions_PreservesCurrentSession_RevokesOthers()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);

        await SeedUserWithSessionsAsync(context, "user_alice", 3);

        var controller = CreateController(context, "user_alice", "sess_user_alice_1");
        var result = await controller.RevokeOtherSessions(CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<RevokeSessionResultDto>(okResult.Value);
        Assert.True(response.Success);
        Assert.Equal(2, response.RevokedCount);

        // Current session remains unrevoked
        var currentSession = await context.UserSessions.FindAsync("sess_user_alice_1");
        Assert.NotNull(currentSession);
        Assert.False(currentSession.Revoked);

        // Others are revoked
        var session2 = await context.UserSessions.FindAsync("sess_user_alice_2");
        var session3 = await context.UserSessions.FindAsync("sess_user_alice_3");
        Assert.NotNull(session2);
        Assert.True(session2.Revoked);
        Assert.NotNull(session3);
        Assert.True(session3.Revoked);
    }

    [Fact]
    public async Task RevokeAllSessions_RevokesAllSessionsIncludingCurrent()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);

        await SeedUserWithSessionsAsync(context, "user_alice", 2);

        var controller = CreateController(context, "user_alice", "sess_user_alice_1");
        var result = await controller.RevokeAllSessions(CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<RevokeSessionResultDto>(okResult.Value);
        Assert.True(response.Success);
        Assert.Equal(2, response.RevokedCount);

        var allSessions = await context.UserSessions.Where(s => s.UserId == "user_alice").ToListAsync();
        Assert.All(allSessions, s => Assert.True(s.Revoked));
    }

    [Fact]
    public async Task GetSecurityEvents_ReturnsLearnerScopedAndSanitizedEvents()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateDbContext(dbName);

        var alice = await SeedUserWithSessionsAsync(context, "user_alice", 1);
        var bob = await SeedUserWithSessionsAsync(context, "user_bob", 1);

        // Seed audit logs for Alice
        context.AuditLogs.AddRange(
            new AuditLog
            {
                ActorId = alice.Id,
                Action = "UserLoginSuccess",
                EntityType = "User",
                EntityId = alice.Id,
                Description = "User logged in",
                Outcome = "Success",
                IpAddress = "192.168.1.10",
                Timestamp = DateTime.UtcNow.AddMinutes(-30)
            },
            new AuditLog
            {
                ActorId = alice.Id,
                Action = "PasswordChanged",
                EntityType = "User",
                EntityId = alice.Id,
                Description = "Password changed",
                Outcome = "Success",
                IpAddress = "192.168.1.10",
                Timestamp = DateTime.UtcNow.AddMinutes(-10)
            },
            // Bob's audit log
            new AuditLog
            {
                ActorId = bob.Id,
                Action = "UserLoginSuccess",
                EntityType = "User",
                EntityId = bob.Id,
                Description = "Bob logged in",
                Outcome = "Success",
                IpAddress = "10.0.0.1",
                Timestamp = DateTime.UtcNow.AddMinutes(-5)
            }
        );
        await context.SaveChangesAsync();

        var controller = CreateController(context, "user_alice", "sess_user_alice_1");
        var result = await controller.GetSecurityEvents(CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<SecurityEventsResponseDto>(okResult.Value);

        Assert.True(response.Success);
        Assert.Equal(2, response.Events.Count);
        // Ordered newest first
        Assert.Equal("PasswordChanged", response.Events[0].Action);
        Assert.Equal("Password changed successfully", response.Events[0].Description);
        Assert.Equal("UserLoginSuccess", response.Events[1].Action);
        Assert.Equal("Signed in successfully", response.Events[1].Description);

        // Excludes Bob's log
        Assert.DoesNotContain(response.Events, e => e.Description.Contains("Bob"));
    }
}
