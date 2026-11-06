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

public class TwoTierReauthenticationPolicyTests
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
        string callerUserId = "usr_reauth_test")
    {
        var responseValidation = new ResponseValidationService(context);
        var attemptQuestionService = new AttemptQuestionService(context, responseValidation);
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
    public async Task Reauthenticate_InvoluntaryInterruption_WithValidPassword_Succeeds()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var hasher = new PasswordHasher<User>();
        var user = new User
        {
            Id = "usr_involuntary",
            Email = "involuntary@example.com",
            DisplayName = "Involuntary Learner",
            IsActive = true,
            AccountStatus = "Active",
            Pathway = "rn"
        };
        user.PasswordHash = hasher.HashPassword(user, "SecurePass123!");

        var exam = new Exam
        {
            Id = "exam_rn_test",
            Title = "NCLEX-RN Test",
            Pathway = "rn",
            ExamType = ExamType.CAT,
            TimeLimitMinutes = 300
        };
        var attempt = new ExamAttempt
        {
            Id = "att_involuntary",
            UserId = user.Id,
            ExamId = exam.Id,
            Exam = exam,
            User = user,
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow.AddMinutes(-10)
        };
        var plan = new SubscriptionPlan { Id = "plan_1", Name = "Pro", Pathway = "RN" };
        var sub = new UserSubscription
        {
            Id = "sub_inv",
            UserId = user.Id,
            PlanId = plan.Id,
            Pathway = "rn",
            Status = SubscriptionStatus.Active,
            ExpiresAt = DateTime.UtcNow.AddDays(14)
        };
        var interruptedSession = new UserSession
        {
            Id = "sess_inv",
            UserId = user.Id,
            SessionTokenHash = "hash1",
            Revoked = true,
            RevokedAt = DateTime.UtcNow.AddMinutes(-2),
            RevocationReason = "HeartbeatExpiry" // Involuntary Tier 1 trigger
        };

        context.Users.Add(user);
        context.Exams.Add(exam);
        context.ExamAttempts.Add(attempt);
        context.SubscriptionPlans.Add(plan);
        context.UserSubscriptions.Add(sub);
        context.UserSessions.Add(interruptedSession);
        await context.SaveChangesAsync();

        var rateLimiting = new PostgresRateLimitingService(context, NullLogger<PostgresRateLimitingService>.Instance);
        var entitlement = new UserEntitlementService(context, NullLogger<UserEntitlementService>.Instance);
        var controller = CreateController(context, rateLimiting, entitlement, user.Id);

        var request = new ReauthenticateAttemptRequest
        {
            Password = "SecurePass123!",
            Email = user.Email,
            ClientId = "cid_0123456789abcdef0123456789abcdef"
        };

        var actionResult = await controller.ReauthenticateAttempt(attempt.Id, request, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        Assert.NotNull(okResult.Value);

        var audit = await context.AuditLogs.FirstOrDefaultAsync(al => al.Action == "ExamAttemptReauthenticated");
        Assert.NotNull(audit);
    }

    [Fact]
    public async Task Reauthenticate_AdminRevocationHold_Returns403AdminRevocationHold()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var hasher = new PasswordHasher<User>();
        var user = new User
        {
            Id = "usr_admin_revoked",
            Email = "adminrevoked@example.com",
            DisplayName = "Revoked Learner",
            IsActive = true,
            AccountStatus = "Active",
            Pathway = "rn"
        };
        user.PasswordHash = hasher.HashPassword(user, "SecurePass123!");

        var exam = new Exam
        {
            Id = "exam_rn_test_2",
            Title = "NCLEX-RN Test",
            Pathway = "rn",
            ExamType = ExamType.CAT,
            TimeLimitMinutes = 300
        };
        var attempt = new ExamAttempt
        {
            Id = "att_admin_revoked",
            UserId = user.Id,
            ExamId = exam.Id,
            Exam = exam,
            User = user,
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow.AddMinutes(-10)
        };
        var plan = new SubscriptionPlan { Id = "plan_2", Name = "Pro", Pathway = "RN" };
        var sub = new UserSubscription
        {
            Id = "sub_adm",
            UserId = user.Id,
            PlanId = plan.Id,
            Pathway = "rn",
            Status = SubscriptionStatus.Active,
            ExpiresAt = DateTime.UtcNow.AddDays(14)
        };
        var adminRevokedSession = new UserSession
        {
            Id = "sess_adm",
            UserId = user.Id,
            SessionTokenHash = "hash2",
            Revoked = true,
            RevokedAt = DateTime.UtcNow.AddMinutes(-2),
            RevocationReason = "AdminRevoked: Security Violation Detected" // Tier 2 trigger
        };

        context.Users.Add(user);
        context.Exams.Add(exam);
        context.ExamAttempts.Add(attempt);
        context.SubscriptionPlans.Add(plan);
        context.UserSubscriptions.Add(sub);
        context.UserSessions.Add(adminRevokedSession);
        await context.SaveChangesAsync();

        var rateLimiting = new PostgresRateLimitingService(context, NullLogger<PostgresRateLimitingService>.Instance);
        var entitlement = new UserEntitlementService(context, NullLogger<UserEntitlementService>.Instance);
        var controller = CreateController(context, rateLimiting, entitlement, user.Id);

        var request = new ReauthenticateAttemptRequest
        {
            Password = "SecurePass123!",
            Email = user.Email,
            ClientId = "cid_0123456789abcdef0123456789abcdef"
        };

        var actionResult = await controller.ReauthenticateAttempt(attempt.Id, request, CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status403Forbidden, objectResult.StatusCode);

        // Verify audit log for admin hold
        var audit = await context.AuditLogs.FirstOrDefaultAsync(al => al.Action == "ReauthenticationBlockedAdminHold");
        Assert.NotNull(audit);
        Assert.Equal("Warning", audit.Severity);
    }

    [Fact]
    public async Task Reauthenticate_SuspendedAccount_Returns403AccountSuspended()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var hasher = new PasswordHasher<User>();
        var user = new User
        {
            Id = "usr_suspended_reauth",
            Email = "suspended_reauth@example.com",
            DisplayName = "Suspended Learner",
            IsActive = true,
            AccountStatus = "Suspended",
            SuspensionReason = "Institutional investigation",
            Pathway = "rn"
        };
        user.PasswordHash = hasher.HashPassword(user, "SecurePass123!");

        var exam = new Exam
        {
            Id = "exam_rn_test_3",
            Title = "NCLEX-RN Test",
            Pathway = "rn",
            ExamType = ExamType.CAT,
            TimeLimitMinutes = 300
        };
        var attempt = new ExamAttempt
        {
            Id = "att_suspended",
            UserId = user.Id,
            ExamId = exam.Id,
            Exam = exam,
            User = user,
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow.AddMinutes(-10)
        };

        context.Users.Add(user);
        context.Exams.Add(exam);
        context.ExamAttempts.Add(attempt);
        await context.SaveChangesAsync();

        var rateLimiting = new PostgresRateLimitingService(context, NullLogger<PostgresRateLimitingService>.Instance);
        var entitlement = new UserEntitlementService(context, NullLogger<UserEntitlementService>.Instance);
        var controller = CreateController(context, rateLimiting, entitlement, user.Id);

        var request = new ReauthenticateAttemptRequest
        {
            Password = "SecurePass123!",
            Email = user.Email,
            ClientId = "cid_0123456789abcdef0123456789abcdef"
        };

        var actionResult = await controller.ReauthenticateAttempt(attempt.Id, request, CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status403Forbidden, objectResult.StatusCode);
    }
}
