using System.Security.Claims;
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
using Preform.Api.Services.RateLimiting;
using Xunit;

namespace Preform.Api.Tests;

public class DistributedReauthRateLimitingTests
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

    private ExamAttemptsController CreateController(
        AppDbContext context,
        ISharedRateLimitingService rateLimitingService,
        IUserEntitlementService entitlementService,
        string callerUserId = "usr_ratelimit_test")
    {
        var responseValidation = new ResponseValidationService(context, new QuestionGraderResolver(QuestionTypeRegistry.Instance));
        var attemptQuestionService = new AttemptQuestionService(context);
        var passwordHasher = new PasswordHasher<User>();
        var sessionSecurity = new SessionSecurityService(context, NullLogger<SessionSecurityService>.Instance);

        var controller = new ExamAttemptsController(
            context,
            NullLogger<ExamAttemptsController>.Instance,
            responseValidation,
            attemptQuestionService,
            sessionSecurity,
            passwordHasher,
            rateLimitingService,
            null,
            entitlementService);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, callerUserId),
            new(ClaimTypes.Email, $"{callerUserId}@prepford.com"),
            new(ClaimTypes.Role, "candidate"),
            new("role", "candidate")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(identity),
                Connection = { RemoteIpAddress = System.Net.IPAddress.Parse("127.0.0.1") }
            }
        };

        return controller;
    }

    [Fact]
    public async Task Reauthenticate_ExceedingFailedAttempts_Returns429TooManyRequestsWithRetryAfter()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var hasher = new PasswordHasher<User>();
        var user = new User
        {
            Id = "usr_bruteforce",
            Email = "target@example.com",
            DisplayName = "Target User",
            IsActive = true,
            AccountStatus = "Active",
            Pathway = "rn"
        };
        user.PasswordHash = hasher.HashPassword(user, "CorrectPassword123!");

        var exam = new Exam
        {
            Id = "exam_rn_rl",
            Title = "NCLEX-RN Test",
            Pathway = "rn",
            ExamType = ExamType.CAT,
            TimeLimitMinutes = 300
        };
        var attempt = new ExamAttempt
        {
            Id = "att_rl_test",
            UserId = user.Id,
            ExamId = exam.Id,
            Exam = exam,
            User = user,
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow.AddMinutes(-5)
        };
        var plan = new SubscriptionPlan { Id = "plan_rl", Name = "Pro", Pathway = "RN" };
        var sub = new UserSubscription
        {
            Id = "sub_rl",
            UserId = user.Id,
            PlanId = plan.Id,
            Pathway = "rn",
            Status = SubscriptionStatus.Active,
            ExpiresAt = DateTime.UtcNow.AddDays(14)
        };

        context.Users.Add(user);
        context.Exams.Add(exam);
        context.ExamAttempts.Add(attempt);
        context.SubscriptionPlans.Add(plan);
        context.UserSubscriptions.Add(sub);
        await context.SaveChangesAsync();

        var rateLimiting = new PostgresRateLimitingService(context, NullLogger<PostgresRateLimitingService>.Instance);
        var entitlement = new UserEntitlementService(context, NullLogger<UserEntitlementService>.Instance);
        var controller = CreateController(context, rateLimiting, entitlement, user.Id);

        var badRequest = new ReauthenticateAttemptRequest
        {
            Password = "WrongPassword!",
            Email = user.Email,
            ClientId = "cid_0123456789abcdef0123456789abcdef"
        };

        // Submit 5 failed attempts
        for (int i = 0; i < 5; i++)
        {
            var res = await controller.ReauthenticateAttempt(attempt.Id, badRequest, CancellationToken.None);
            Assert.IsType<UnauthorizedObjectResult>(res);
        }

        // 6th attempt must be blocked by rate limit with 429 Too Many Requests
        var blockedRes = await controller.ReauthenticateAttempt(attempt.Id, badRequest, CancellationToken.None);
        var objectResult = Assert.IsType<ObjectResult>(blockedRes);
        Assert.Equal(StatusCodes.Status429TooManyRequests, objectResult.StatusCode);

        Assert.True(controller.Response.Headers.ContainsKey("Retry-After"));
    }
}
