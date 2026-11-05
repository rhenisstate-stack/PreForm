using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Controllers;
using Preform.Api.Data;
using Preform.Api.Models;
using Preform.Api.Services;
using Preform.Api.Services.Grading;
using Xunit;

namespace Preform.Api.Tests;

/// <summary>
/// Phase 8 Final Acceptance Gate — observations on the in-exam reauthentication rate limiter.
/// These tests intentionally DOCUMENT the accepted (process-local, X-Forwarded-For-derivable key)
/// limitation of the Phase 8 limiter while the owner-approved distributed replacement is pending.
/// They assert the CURRENT behavior so any future change away from it is detected.
/// </summary>
public class ReauthRateLimiterObservationTests
{
    private static AppDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new AppDbContext(options);
    }

    private static ExamAttemptsController CreateController(AppDbContext context, string? callerUserId)
    {
        var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);
        var controller = new ExamAttemptsController(
            context,
            NullLogger<ExamAttemptsController>.Instance,
            new ResponseValidationService(context, resolver),
            new AttemptQuestionService(context),
            new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance),
            new PasswordHasher<User>());

        var httpContext = new DefaultHttpContext();
        httpContext.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("198.51.100.7");
        var claims = new List<Claim>();
        if (!string.IsNullOrWhiteSpace(callerUserId))
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, callerUserId));
            claims.Add(new Claim(ClaimTypes.Role, "candidate"));
            claims.Add(new Claim("role", "candidate"));
        }
        httpContext.User = new ClaimsPrincipal(new ClaimsIdentity(claims, callerUserId != null ? "TestAuth" : null));
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        return controller;
    }

    private static async Task<(string AttemptId, string Email)> SeedAttemptAsync(AppDbContext context, string password)
    {
        var hasher = new PasswordHasher<User>();
        var user = new User
        {
            Id = "usr_lim_" + Guid.NewGuid().ToString("N"),
            Email = $"lim_{Guid.NewGuid():N}@prepford.test",
            DisplayName = "Rate Limit Observation Learner",
            IsActive = true,
            SecurityVersion = 1,
            Pathway = "rn",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        user.PasswordHash = hasher.HashPassword(user, password);
        context.Users.Add(user);

        var exam = new Exam
        {
            Id = $"exam_{Guid.NewGuid():N}",
            Title = "Limiter Observation Exam",
            Pathway = "rn",
            TimeLimitMinutes = 60,
            LifecycleState = ExamLifecycleState.Published,
            IsPublished = true
        };
        context.Exams.Add(exam);

        var attempt = new ExamAttempt
        {
            Id = "attempt_lim_" + Guid.NewGuid().ToString("N"),
            UserId = user.Id,
            ExamId = exam.Id,
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow.AddMinutes(-10),
            Exam = exam,
            User = user
        };
        context.ExamAttempts.Add(attempt);
        await context.SaveChangesAsync();
        return (attempt.Id, user.Email);
    }

    private static void SetForwardedFor(ExamAttemptsController controller, string forwardedFor)
    {
        controller.ControllerContext.HttpContext.Request.Headers["X-Forwarded-For"] = forwardedFor;
    }

    private static int? GetStatusCode(IActionResult result)
        => result switch
        {
            ObjectResult o => o.StatusCode,
            StatusCodeResult s => s.StatusCode,
            _ => null
        };

    private static string? GetErrorCode(IActionResult result)
        => (result as ObjectResult)?.Value is { } value
            ? JsonDocument.Parse(JsonSerializer.Serialize(value)).RootElement
                .TryGetProperty("errorCode", out var code) ? code.GetString() : null
            : null;

    [Fact]
    public async Task ReauthRateLimit_RotatingForwardedForHeader_EvadesTheFiveAttemptLockout()
    {
        // DOCUMENTED LIMITATION CANARY: the limiter key is "<first X-Forwarded-For token>:<attemptId>".
        // The X-Forwarded-For header is client-controllable whenever the API is directly reachable,
        // therefore an attacker can rotate the header and never reach 5 failures on a single key.
        ExamAttemptsController.ResetReauthRateLimitsForTesting();
        using var context = CreateInMemoryContext(nameof(ReauthRateLimit_RotatingForwardedForHeader_EvadesTheFiveAttemptLockout));
        var (attemptId, learnerEmail) = await SeedAttemptAsync(context, password: "CorrectPassword123!");

        const int attempts = 10;
        for (int i = 1; i <= attempts; i++)
        {
            var controller = CreateController(context, callerUserId: null);
            SetForwardedFor(controller, $"203.0.113.{i}");

            var result = await controller.ReauthenticateAttempt(
                attemptId,
                new ReauthenticateAttemptRequest { Email = learnerEmail, Password = $"Guess-{i}!" },
                default);

            // Every rotated-IP attempt gets the normal 401 INVALID_CREDENTIALS — never 429.
            Assert.Equal(401, GetStatusCode(result));
            Assert.Equal("INVALID_CREDENTIALS", GetErrorCode(result));
        }
    }

    [Fact]
    public async Task ReauthRateLimit_ConstantForwardedFor_LocksAfterFiveFailures_PerProcessInstance()
    {
        // Baseline: with an unvarying (honest) source, the 5-failure / 15-minute lockout engages.
        // This still holds only within a single API process — the counter is a static in-memory
        // ConcurrentDictionary and is NOT shared across API instances.
        ExamAttemptsController.ResetReauthRateLimitsForTesting();
        using var context = CreateInMemoryContext(nameof(ReauthRateLimit_ConstantForwardedFor_LocksAfterFiveFailures_PerProcessInstance));
        var (attemptId, learnerEmail) = await SeedAttemptAsync(context, password: "CorrectPassword123!");

        for (int i = 1; i <= 6; i++)
        {
            var controller = CreateController(context, callerUserId: null);
            SetForwardedFor(controller, "198.51.100.100");

            var result = await controller.ReauthenticateAttempt(
                attemptId,
                new ReauthenticateAttemptRequest { Email = learnerEmail, Password = $"Guess-{i}!" },
                default);

            Assert.Equal(i <= 5 ? 401 : 429, GetStatusCode(result));
            if (i > 5)
            {
                Assert.Equal("RATE_LIMIT_EXCEEDED", GetErrorCode(result));
            }
        }
    }

    [Fact]
    public async Task ReauthRateLimit_ValidPasswordAfterLockoutIsRestored_ResetPresentForExplicitClearPath()
    {
        // The public reset helper exists solely for deterministic test execution.
        ExamAttemptsController.ResetReauthRateLimitsForTesting();
        using var context = CreateInMemoryContext(nameof(ReauthRateLimit_ValidPasswordAfterLockoutIsRestored_ResetPresentForExplicitClearPath));
        var (attemptId, learnerEmail) = await SeedAttemptAsync(context, password: "CorrectPassword123!");

        // Exhaust 5 bad passwords (honest IP), triggering the lockout.
        for (int i = 1; i <= 5; i++)
        {
            var controller = CreateController(context, callerUserId: null);
            SetForwardedFor(controller, "198.51.100.200");
            var bad = await controller.ReauthenticateAttempt(
                attemptId,
                new ReauthenticateAttemptRequest { Email = learnerEmail, Password = $"Guess-{i}!" },
                default);
            Assert.Equal(401, GetStatusCode(bad));
        }

        // A legitimate owner arriving with the CORRECT password after attacker lockout
        // is currently blocked until lockout expiry — because the rate-limit gate is
        // evaluated BEFORE credential verification, and the key is shared per (ip:attemptId).
        var ownerController = CreateController(context, callerUserId: null);
        SetForwardedFor(ownerController, "198.51.100.201"); // DIFFERENT honest IP does not help either
        var ownerResult = await ownerController.ReauthenticateAttempt(
            attemptId,
            new ReauthenticateAttemptRequest { Email = learnerEmail, Password = "CorrectPassword123!" },
            default);

        // Note: because the owner's IP differs from the attacker's, the owner currently
        // reauthenticates successfully — but the XFF case means both share fate whenever
        // the header matches. This asserts the CURRENT per-(ip:attemptId) keying behavior.
        Assert.Equal(200, GetStatusCode(ownerResult));
    }
}


