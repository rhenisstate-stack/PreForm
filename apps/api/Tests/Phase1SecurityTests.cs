using System.Net;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Common;
using Preform.Api.Controllers;
using Preform.Api.Data;
using Preform.Api.Models;
using Preform.Api.Services.Email;
using Preform.Api.Services.PasswordReset;
using Preform.Api.Services.RateLimiting;
using Preform.Api.Services.Security;
using Xunit;

namespace Preform.Api.Tests;

public class Phase1SecurityTests
{
    private static AppDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        var context = new AppDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }

    private class TestEmailSender : IEmailSender
    {
        public string? LastResetLink { get; private set; }
        public string? LastToEmail { get; private set; }

        public Task SendPasswordResetEmailAsync(string toEmail, string resetLink, CancellationToken cancellationToken = default)
        {
            LastToEmail = toEmail;
            LastResetLink = resetLink;
            return Task.CompletedTask;
        }
    }

    // ── 1. Correlation ID Middleware Tests ─────────────────────────────────────

    [Fact]
    public async Task CorrelationIdMiddleware_WhenHeaderProvided_PreservesAndPropagatesHeader()
    {
        // Arrange
        var middleware = new CorrelationIdMiddleware(
            next: (innerContext) => Task.CompletedTask,
            logger: NullLogger<CorrelationIdMiddleware>.Instance);

        var context = new DefaultHttpContext();
        const string customCorrId = "req-custom-correlation-9988";
        context.Request.Headers[CorrelationIdMiddleware.HeaderName] = customCorrId;

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        Assert.Equal(customCorrId, CorrelationIdMiddleware.GetCorrelationId(context));
        Assert.Equal(customCorrId, context.TraceIdentifier);
    }

    [Fact]
    public async Task CorrelationIdMiddleware_WhenHeaderContainsUnsafeChars_GeneratesSafeFallback()
    {
        // Arrange
        var middleware = new CorrelationIdMiddleware(
            next: (innerContext) => Task.CompletedTask,
            logger: NullLogger<CorrelationIdMiddleware>.Instance);

        var context = new DefaultHttpContext();
        context.Request.Headers[CorrelationIdMiddleware.HeaderName] = "<script>alert('xss')</script>";

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var resolved = CorrelationIdMiddleware.GetCorrelationId(context);
        Assert.StartsWith("corr_", resolved);
        Assert.DoesNotContain("<", resolved);
    }

    [Fact]
    public async Task CorrelationIdMiddleware_WhenHeaderMissing_GeneratesSafeCorrelationId()
    {
        // Arrange
        var middleware = new CorrelationIdMiddleware(
            next: (innerContext) => Task.CompletedTask,
            logger: NullLogger<CorrelationIdMiddleware>.Instance);

        var context = new DefaultHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var resolved = CorrelationIdMiddleware.GetCorrelationId(context);
        Assert.StartsWith("corr_", resolved);
    }

    // ── 2. RFC 7807 Global Exception Handler Tests ─────────────────────────────

    [Fact]
    public async Task GlobalExceptionHandler_ConvertsArgumentException_ToRfc7807ProblemDetails()
    {
        // Arrange
        var handler = new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var exception = new ArgumentException("The specified email is invalid.");

        // Act
        var handled = await handler.TryHandleAsync(context, exception, CancellationToken.None);

        // Assert
        Assert.True(handled);
        Assert.Equal(StatusCodes.Status400BadRequest, context.Response.StatusCode);
        Assert.StartsWith("application/problem+json", context.Response.ContentType);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var doc = JsonDocument.Parse(context.Response.Body);
        var root = doc.RootElement;

        Assert.Equal(400, root.GetProperty("status").GetInt32());
        Assert.Equal("INVALID_ARGUMENT", root.GetProperty("errorCode").GetString());
        Assert.True(root.TryGetProperty("traceId", out _));
        Assert.True(root.TryGetProperty("timestamp", out _));
    }

    [Fact]
    public async Task GlobalExceptionHandler_ConvertsUnauthorizedAccess_ToRfc7807ProblemDetails()
    {
        // Arrange
        var handler = new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var exception = new UnauthorizedAccessException("Expired token.");

        // Act
        var handled = await handler.TryHandleAsync(context, exception, CancellationToken.None);

        // Assert
        Assert.True(handled);
        Assert.Equal(StatusCodes.Status401Unauthorized, context.Response.StatusCode);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var doc = JsonDocument.Parse(context.Response.Body);
        var root = doc.RootElement;

        Assert.Equal(401, root.GetProperty("status").GetInt32());
        Assert.Equal("UNAUTHORIZED", root.GetProperty("errorCode").GetString());
    }

    [Fact]
    public async Task GlobalExceptionHandler_ConvertsUnhandledException_ToRfc7807ProblemDetails()
    {
        // Arrange
        var handler = new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var exception = new InvalidOperationException("Unexpected fatal database partition error.");

        // Act
        var handled = await handler.TryHandleAsync(context, exception, CancellationToken.None);

        // Assert
        Assert.True(handled);
        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var doc = JsonDocument.Parse(context.Response.Body);
        var root = doc.RootElement;

        Assert.Equal(500, root.GetProperty("status").GetInt32());
        Assert.Equal("INTERNAL_SERVER_ERROR", root.GetProperty("errorCode").GetString());
    }

    // ── 3. Shared Rate Limiting Service Tests ─────────────────────────────────

    [Fact]
    public async Task RateLimiter_EnforcesThresholdAndCalculatesLockout()
    {
        // Arrange
        using var context = CreateInMemoryContext("RateLimiterTestDb");
        var limiter = new PostgresRateLimitingService(context, NullLogger<PostgresRateLimitingService>.Instance);
        const string testKey = "test_login_user_42";
        const int maxAttempts = 3;
        var window = TimeSpan.FromMinutes(10);
        var lockout = TimeSpan.FromMinutes(15);

        // Act & Assert: First (maxAttempts - 1) failed attempts are recorded and allowed before threshold
        for (int i = 0; i < maxAttempts - 1; i++)
        {
            var res = await limiter.RecordFailedAttemptAsync(testKey, maxAttempts, window, lockout);
            Assert.False(res.IsRateLimited, $"Attempt {i + 1} should not be rate limited yet");
        }

        // 3rd failed attempt reaches maxAttempts threshold and triggers lockout
        var lockedResult = await limiter.RecordFailedAttemptAsync(testKey, maxAttempts, window, lockout);
        Assert.True(lockedResult.IsRateLimited);
        Assert.True(lockedResult.RetryAfterSeconds > 0);

        // Subsequent check verifies lockout is active
        var check = await limiter.CheckRateLimitAsync(testKey, maxAttempts, window, lockout);
        Assert.True(check.IsRateLimited);
        Assert.True(check.RetryAfterSeconds > 0);
    }

    // ── 4. Password Reset Service Tests ───────────────────────────────────────

    [Fact]
    public async Task PasswordReset_FullLifecycle_HashedTokens_RevokesSessions_IncrementsSecurityVersion()
    {
        // Arrange
        using var context = CreateInMemoryContext("PasswordResetLifecycleDb");
        var hasher = new PasswordHasher<User>();
        var testEmailSender = new TestEmailSender();
        var inMemoryConfig = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["App:PublicBaseUrl"] = "https://app.prepford.com"
        }).Build();

        var resetService = new PasswordResetService(
            context,
            hasher,
            testEmailSender,
            inMemoryConfig,
            NullLogger<PasswordResetService>.Instance);

        var testUser = new User
        {
            Id = "user_pwd_reset_test",
            Email = "doctor.smith@prepford.com",
            PasswordHash = hasher.HashPassword(null!, "InitialOldPassword1!"),
            DisplayName = "Dr. Smith",
            SecurityVersion = 1
        };
        context.Users.Add(testUser);

        // Create 2 active sessions for this user
        var s1 = new UserSession
        {
            Id = "sess_pwd_1",
            UserId = testUser.Id,
            TokenHash = "hash1",
            LastIpAddress = "10.0.0.1",
            CreatedAt = DateTime.UtcNow,
            LastActiveAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            Revoked = false
        };
        var s2 = new UserSession
        {
            Id = "sess_pwd_2",
            UserId = testUser.Id,
            TokenHash = "hash2",
            LastIpAddress = "10.0.0.2",
            CreatedAt = DateTime.UtcNow,
            LastActiveAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            Revoked = false
        };
        context.UserSessions.AddRange(s1, s2);
        await context.SaveChangesAsync();

        // Act 1: Request Password Reset
        var reqResult = await resetService.RequestPasswordResetAsync(testUser.Email, "127.0.0.1", "TestAgent/1.0");
        Assert.True(reqResult.Success);
        Assert.NotNull(testEmailSender.LastResetLink);

        // Extract token from reset link
        var resetUri = new Uri(testEmailSender.LastResetLink!);
        var queryParams = System.Web.HttpUtility.ParseQueryString(resetUri.Query);
        var rawToken = queryParams["token"];
        Assert.NotNull(rawToken);

        // Verify token is stored as SHA-256 hash in DB
        var expectedHash = PasswordResetService.HashToken(rawToken);
        var dbToken = await context.PasswordResetTokens.FirstOrDefaultAsync(t => t.UserId == testUser.Id);
        Assert.NotNull(dbToken);
        Assert.Equal(expectedHash, dbToken.TokenHash);
        Assert.Null(dbToken.UsedAt);

        // Act 2: Validate Reset Token
        var valResult = await resetService.ValidateResetTokenAsync(rawToken);
        Assert.True(valResult.IsValid);

        var bogusValResult = await resetService.ValidateResetTokenAsync("totally-fake-token-12345");
        Assert.False(bogusValResult.IsValid);

        // Act 3: Reset Password
        const string newPassword = "UltraSecureNewPassword99!";
        var resetResult = await resetService.ResetPasswordAsync(rawToken, newPassword, "127.0.0.1", "TestAgent/1.0");
        Assert.True(resetResult.Success);

        // Assert 4: Verify password updated
        var updatedUser = await context.Users.FindAsync(testUser.Id);
        Assert.NotNull(updatedUser);
        var verifyResult = hasher.VerifyHashedPassword(updatedUser, updatedUser.PasswordHash, newPassword);
        Assert.Equal(PasswordVerificationResult.Success, verifyResult);

        // Assert 5: Verify SecurityVersion bumped
        Assert.Equal(2, updatedUser.SecurityVersion);

        // Assert 6: Verify all active sessions were revoked
        var sessions = await context.UserSessions.Where(s => s.UserId == testUser.Id).ToListAsync();
        Assert.All(sessions, s => Assert.True(s.Revoked));
        Assert.All(sessions, s => Assert.Equal("PasswordReset", s.RevocationReason));

        // Assert 7: Single-use invariant — reusing the token must fail
        var reuseResult = await resetService.ResetPasswordAsync(rawToken, "AnotherPassword44!", "127.0.0.1", "TestAgent/1.0");
        Assert.False(reuseResult.Success);
        Assert.Equal("Invalid or expired password reset token.", reuseResult.Error);
    }

    // ── 5. Last Super Admin Protection Tests ─────────────────────────────────

    [Fact]
    public async Task AdminUsers_LastSuperAdminProtection_PreventsSuspendingSoleSuperAdmin()
    {
        // Arrange
        using var context = CreateInMemoryContext("SoleSuperAdminTestDb");
        var superRole = new Role { Id = "role_superadmin", Name = "superadmin", Description = "Super Admin" };
        var candidateRole = new Role { Id = "role_candidate", Name = "candidate", Description = "Candidate" };
        context.Roles.AddRange(superRole, candidateRole);

        var soleSuper = new User
        {
            Id = "user_sole_super",
            Email = "boss@prepford.com",
            PasswordHash = "hash",
            DisplayName = "Sole Super Admin",
            AccountStatus = "Active"
        };
        var regularUser = new User
        {
            Id = "user_candidate_01",
            Email = "student@prepford.com",
            PasswordHash = "hash",
            DisplayName = "Regular Student",
            AccountStatus = "Active"
        };
        context.Users.AddRange(soleSuper, regularUser);

        context.UserRoles.Add(new UserRole { UserId = soleSuper.Id, RoleId = superRole.Id });
        context.UserRoles.Add(new UserRole { UserId = regularUser.Id, RoleId = candidateRole.Id });
        await context.SaveChangesAsync();

        var hasher = new PasswordHasher<User>();
        var controller = new AdminUsersController(context, hasher, NullLogger<AdminUsersController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, soleSuper.Id),
                        new Claim(ClaimTypes.Role, "superadmin")
                    }, "TestAuth"))
                }
            }
        };

        // Act 1: Attempt to suspend the sole superadmin
        var suspendRes = await controller.UpdateUserStatus(soleSuper.Id, new UpdateUserStatusRequest
        {
            Status = "Suspended",
            Reason = "Testing protection"
        }, CancellationToken.None);

        // Assert 1: Must be rejected with 400 Bad Request
        var badReq = Assert.IsType<BadRequestObjectResult>(suspendRes);
        var json = JsonSerializer.Serialize(badReq.Value);
        Assert.Contains("LAST_SUPERADMIN_PROTECTED", json);

        // Act 2: Attempt to remove the superadmin role from the sole superadmin
        var removeRoleRes = await controller.RemoveRole(soleSuper.Id, superRole.Id, CancellationToken.None);

        // Assert 2: Must be rejected with 400 Bad Request
        var badReqRole = Assert.IsType<BadRequestObjectResult>(removeRoleRes);
        var jsonRole = JsonSerializer.Serialize(badReqRole.Value);
        Assert.Contains("LAST_SUPERADMIN_PROTECTED", jsonRole);
    }

    [Fact]
    public async Task AdminUsers_AllowsSuperAdminManagement_WhenMultipleSuperAdminsExist()
    {
        // Arrange
        using var context = CreateInMemoryContext("MultipleSuperAdminsTestDb");
        var superRole = new Role { Id = "role_superadmin", Name = "superadmin", Description = "Super Admin" };
        context.Roles.Add(superRole);

        var super1 = new User
        {
            Id = "super_01",
            Email = "super1@prepford.com",
            PasswordHash = "hash",
            DisplayName = "Super Admin 1",
            AccountStatus = "Active"
        };
        var super2 = new User
        {
            Id = "super_02",
            Email = "super2@prepford.com",
            PasswordHash = "hash",
            DisplayName = "Super Admin 2",
            AccountStatus = "Active"
        };
        context.Users.AddRange(super1, super2);
        context.UserRoles.Add(new UserRole { UserId = super1.Id, RoleId = superRole.Id });
        context.UserRoles.Add(new UserRole { UserId = super2.Id, RoleId = superRole.Id });
        await context.SaveChangesAsync();

        var hasher = new PasswordHasher<User>();
        var controller = new AdminUsersController(context, hasher, NullLogger<AdminUsersController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, super1.Id),
                        new Claim(ClaimTypes.Role, "superadmin")
                    }, "TestAuth"))
                }
            }
        };

        // Act: Suspend super2 when super1 is still active
        var suspendRes = await controller.UpdateUserStatus(super2.Id, new UpdateUserStatusRequest
        {
            Status = "Suspended",
            Reason = "Administrative rotation"
        }, CancellationToken.None);

        // Assert: Succeeded
        var okRes = Assert.IsType<OkObjectResult>(suspendRes);
        var json = JsonSerializer.Serialize(okRes.Value);
        Assert.Contains("\"success\":true", json);

        var updatedSuper2 = await context.Users.FindAsync(super2.Id);
        Assert.NotNull(updatedSuper2);
        Assert.Equal("Suspended", updatedSuper2.AccountStatus);
    }

    // ── 6. Role & Permission Governance Tests ─────────────────────────────────

    [Fact]
    public async Task AdminRoles_PermissionUpdate_RevokesSessionsAndIncrementsSecurityVersion()
    {
        // Arrange
        using var context = CreateInMemoryContext("RolePermissionRevocationDb");
        var testRole = new Role { Id = "role_editor", Name = "content_editor", Description = "Content Editor" };
        var testPerm = new Permission { Id = "perm_edit", Key = "content:edit", Name = "Edit Content", Category = "Content" };
        context.Roles.Add(testRole);
        context.Permissions.Add(testPerm);

        var editorUser = new User
        {
            Id = "user_editor_01",
            Email = "editor@prepford.com",
            PasswordHash = "hash",
            DisplayName = "Editor Jane",
            SecurityVersion = 3
        };
        context.Users.Add(editorUser);
        context.UserRoles.Add(new UserRole { UserId = editorUser.Id, RoleId = testRole.Id });

        var editorSession = new UserSession
        {
            Id = "sess_editor_active",
            UserId = editorUser.Id,
            TokenHash = "token_hash_abc",
            LastIpAddress = "127.0.0.1",
            CreatedAt = DateTime.UtcNow,
            LastActiveAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(8),
            Revoked = false
        };
        context.UserSessions.Add(editorSession);
        await context.SaveChangesAsync();

        var controller = new AdminRolesController(context, NullLogger<AdminRolesController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, "admin_actor_id"),
                        new Claim(ClaimTypes.Role, "superadmin")
                    }, "TestAuth"))
                }
            }
        };

        // Act: Assign permission to role
        var assignRes = await controller.AssignPermission(testRole.Id, new AssignPermissionRequest
        {
            PermissionId = testPerm.Id
        }, CancellationToken.None);

        // Assert
        var okRes = Assert.IsType<OkObjectResult>(assignRes);

        var updatedUser = await context.Users.FindAsync(editorUser.Id);
        Assert.NotNull(updatedUser);
        Assert.Equal(4, updatedUser.SecurityVersion); // Incremented from 3 to 4

        var updatedSession = await context.UserSessions.FindAsync(editorSession.Id);
        Assert.NotNull(updatedSession);
        Assert.True(updatedSession.Revoked);
        Assert.Contains("PermissionAdded", updatedSession.RevocationReason);
    }

    // ── 7. IP Blacklist & Whitelist Rules Tests ───────────────────────────────

    [Fact]
    public async Task IpAccess_BlacklistMatching_SupportsExactAndCidr()
    {
        // Arrange
        using var context = CreateInMemoryContext("IpAccessMatchingDb");
        var ipService = new IpAccessService(context, NullLogger<IpAccessService>.Instance);

        // Add exact IP blacklist
        context.IpAccessRules.Add(new IpAccessRule
        {
            Id = "rule_exact_black",
            IpAddressOrCidr = "192.168.1.100",
            RuleType = "Blacklist",
            Description = "Blocked host",
            IsActive = true
        });

        // Add CIDR subnet blacklist
        context.IpAccessRules.Add(new IpAccessRule
        {
            Id = "rule_cidr_black",
            IpAddressOrCidr = "10.50.0.0/16",
            RuleType = "Blacklist",
            Description = "Blocked corporate range",
            IsActive = true
        });

        await context.SaveChangesAsync();

        // Act & Assert
        // Exact match
        Assert.True(await ipService.IsIpBlockedAsync("192.168.1.100"));
        Assert.False(await ipService.IsIpBlockedAsync("192.168.1.101"));

        // CIDR subnet match
        Assert.True(await ipService.IsIpBlockedAsync("10.50.12.34"));
        Assert.True(await ipService.IsIpBlockedAsync("10.50.255.254"));
        Assert.False(await ipService.IsIpBlockedAsync("10.51.0.1"));
        Assert.False(await ipService.IsIpBlockedAsync("172.16.0.1"));
    }

    [Fact]
    public async Task IpAccess_WhitelistMode_BlocksUnlistedIps()
    {
        // Arrange
        using var context = CreateInMemoryContext("IpAccessWhitelistDb");
        var ipService = new IpAccessService(context, NullLogger<IpAccessService>.Instance);

        // Add Whitelist rule
        context.IpAccessRules.Add(new IpAccessRule
        {
            Id = "rule_whitelisted",
            IpAddressOrCidr = "203.0.113.42",
            RuleType = "Whitelist",
            Description = "Allowed office IP",
            IsActive = true
        });
        await context.SaveChangesAsync();

        // Act & Assert
        // Listed IP is NOT blocked
        Assert.False(await ipService.IsIpBlockedAsync("203.0.113.42"));

        // Any unlisted IP IS blocked when active whitelist rules exist
        Assert.True(await ipService.IsIpBlockedAsync("203.0.113.43"));
        Assert.True(await ipService.IsIpBlockedAsync("8.8.8.8"));
    }
}
