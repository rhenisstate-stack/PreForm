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
using Xunit;

namespace Preform.Api.Tests;

public class ExamContinuityReauthTests
{
    private static AppDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new AppDbContext(options);
    }

    private static (ExamAttemptsController controller, SessionSecurityService sessionSecurity, PasswordHasher<User> hasher) CreateController(
        AppDbContext context,
        string? callerUserId = null,
        string callerRole = "candidate")
    {
        var nullLogger = NullLogger<ExamAttemptsController>.Instance;
        var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);
        var validationService = new ResponseValidationService(context, resolver);
        var questionService = new AttemptQuestionService(context);
        var sessionLogger = NullLogger<SessionSecurityService>.Instance;
        var sessionSecurity = new SessionSecurityService(context, sessionLogger);
        var hasher = new PasswordHasher<User>();

        var controller = new ExamAttemptsController(
            context,
            nullLogger,
            validationService,
            questionService,
            sessionSecurity,
            hasher);

        var claims = new List<Claim>();
        if (!string.IsNullOrWhiteSpace(callerUserId))
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, callerUserId));
            claims.Add(new Claim(ClaimTypes.Role, callerRole));
            claims.Add(new Claim("role", callerRole));
        }

        var identity = new ClaimsIdentity(claims, callerUserId != null ? "TestAuth" : null);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(identity)
            }
        };

        return (controller, sessionSecurity, hasher);
    }

    private static async Task<(User user, Exam exam, ExamAttempt attempt)> SeedExamAttemptAsync(
        AppDbContext context,
        PasswordHasher<User> hasher,
        string userId = "cand_reauth_01",
        string email = "cand_reauth@prepford.com",
        int timeLimitMinutes = 60,
        int elapsedMinutes = 10,
        AttemptStatus status = AttemptStatus.InProgress)
    {
        var user = new User
        {
            Id = userId,
            Email = email,
            DisplayName = "Test Candidate",
            IsActive = true,
            SecurityVersion = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        user.PasswordHash = hasher.HashPassword(user, "SecurePass123!");
        context.Users.Add(user);

        var role = new Role { Id = "role_candidate", Name = "candidate" };
        if (!await context.Roles.AnyAsync(r => r.Id == role.Id))
        {
            context.Roles.Add(role);
        }
        context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id, Role = role });

        if (!await context.SessionSecurityPolicies.AnyAsync(p => p.Id == "global_policy"))
        {
            context.SessionSecurityPolicies.Add(new SessionSecurityPolicy
            {
                Id = "global_policy",
                MaxConcurrentSessions = 5,
                MaxSessionsPerClient = 2,
                IdleTimeoutMinutes = 60,
                AbsoluteTimeoutMinutes = 1440,
                AllowIpDrift = true,
                RotateOnPrivilegeChange = true,
                IsActive = true
            });
        }

        var exam = new Exam
        {
            Id = "exam_" + Guid.NewGuid().ToString("N"),
            Title = "Timed NCLEX-RN Simulation",
            Pathway = "rn",
            ExamType = ExamType.CAT,
            TimeLimitMinutes = timeLimitMinutes,
            PassingScorePercent = 75.0m,
            IsPublished = true,
            LifecycleState = ExamLifecycleState.Published,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Exams.Add(exam);

        var question1 = new Question
        {
            Id = "q_reauth_01",
            Stem = "Clinical prioritization question 1",
            QuestionTypeKey = "single-choice",
            Pathway = "rn",
            Status = QuestionStatus.Published,
            Options = new List<QuestionOption>
            {
                new QuestionOption { Id = "opt_1_0", OptionKey = "0", Content = "Option A", IsCorrect = true, DisplayOrder = 0 },
                new QuestionOption { Id = "opt_1_1", OptionKey = "1", Content = "Option B", IsCorrect = false, DisplayOrder = 1 }
            },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var question2 = new Question
        {
            Id = "q_reauth_02",
            Stem = "Clinical prioritization question 2",
            QuestionTypeKey = "single-choice",
            Pathway = "rn",
            Status = QuestionStatus.Published,
            Options = new List<QuestionOption>
            {
                new QuestionOption { Id = "opt_2_0", OptionKey = "0", Content = "Option A", IsCorrect = false, DisplayOrder = 0 },
                new QuestionOption { Id = "opt_2_1", OptionKey = "1", Content = "Option B", IsCorrect = true, DisplayOrder = 1 }
            },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Questions.AddRange(question1, question2);
        context.ExamQuestions.Add(new ExamQuestion { Id = "eq_01", ExamId = exam.Id, QuestionId = question1.Id, DisplayOrder = 1 });
        context.ExamQuestions.Add(new ExamQuestion { Id = "eq_02", ExamId = exam.Id, QuestionId = question2.Id, DisplayOrder = 2 });

        var startedAt = DateTime.UtcNow.AddMinutes(-elapsedMinutes);
        var attempt = new ExamAttempt
        {
            Id = "att_reauth_" + Guid.NewGuid().ToString("N"),
            UserId = user.Id,
            ExamId = exam.Id,
            Status = status,
            ScorePercent = 0.0m,
            Passed = false,
            StartedAt = startedAt,
            CompletedAt = status == AttemptStatus.Completed ? startedAt.AddMinutes(elapsedMinutes) : null,
            Exam = exam,
            User = user
        };
        context.ExamAttempts.Add(attempt);

        // Add 2 answered responses to verify they remain intact across reauthentication
        var resp1 = new AttemptResponse
        {
            Id = "resp_01",
            ExamAttemptId = attempt.Id,
            QuestionId = question1.Id,
            SelectedOptionsJson = "[0]",
            IsCorrect = true,
            ScoreAwarded = 1.0m,
            GradingState = ResponseGradingState.Graded,
            TimeSpentSeconds = 45,
            AnsweredAt = startedAt.AddMinutes(2)
        };
        var resp2 = new AttemptResponse
        {
            Id = "resp_02",
            ExamAttemptId = attempt.Id,
            QuestionId = question2.Id,
            SelectedOptionsJson = "[1]",
            IsCorrect = true,
            ScoreAwarded = 1.0m,
            GradingState = ResponseGradingState.Graded,
            TimeSpentSeconds = 60,
            AnsweredAt = startedAt.AddMinutes(5)
        };
        context.AttemptResponses.AddRange(resp1, resp2);

        await context.SaveChangesAsync();
        return (user, exam, attempt);
    }

    [Fact]
    public async Task Reauthenticate_WithValidCredentials_PreservesAttemptId_StartedAt_AndResponses_AndCreatesSession()
    {
        using var context = CreateInMemoryContext(nameof(Reauthenticate_WithValidCredentials_PreservesAttemptId_StartedAt_AndResponses_AndCreatesSession));
        var (controller, _, hasher) = CreateController(context);
        var (user, exam, attempt) = await SeedExamAttemptAsync(context, hasher, timeLimitMinutes: 60, elapsedMinutes: 15);

        var originalAttemptId = attempt.Id;
        var originalStartedAt = attempt.StartedAt;

        var request = new ReauthenticateAttemptRequest
        {
            Email = user.Email,
            Password = "SecurePass123!",
            ClientId = "client_desktop_chrome"
        };

        var result = await controller.ReauthenticateAttempt(attempt.Id, request, default);

        var okResult = Assert.IsType<OkObjectResult>(result);
        dynamic data = okResult.Value!;
        Assert.True((bool)data.success);
        Assert.NotNull(data.sessionId);
        Assert.NotNull(data.token);

        // Core Invariants verification
        Assert.Equal(originalAttemptId, (string)data.attempt.id);
        Assert.Equal(originalStartedAt, (DateTime)data.attempt.startedAt);
        Assert.Equal(60, (int)data.attempt.timeLimitMinutes);
        Assert.Equal(2, (int)data.attempt.totalResponses);

        // Authoritative Timer verification: remaining seconds must reflect elapsed time (~45 mins remaining = ~2700s)
        int remainingSeconds = (int)data.attempt.remainingSeconds;
        Assert.True(remainingSeconds > 2600 && remainingSeconds <= 2700, $"Expected remaining seconds ~2700, but got {remainingSeconds}");

        // Verify session was created in DB
        string sessionId = (string)data.sessionId;
        var session = await context.UserSessions.FirstOrDefaultAsync(s => s.Id == sessionId);
        Assert.NotNull(session);
        Assert.Equal(user.Id, session.UserId);
        Assert.Equal(user.SecurityVersion, session.SecurityVersion);

        // Verify Audit Log
        string attemptIdStr = (string)data.attempt.id;
        var audit = await context.AuditLogs.FirstOrDefaultAsync(a => a.Action == "ExamAttemptReauthenticated" && a.EntityId == attemptIdStr);
        Assert.NotNull(audit);
        Assert.Equal(user.Id, audit.ActorId);
    }

    [Fact]
    public async Task Reauthenticate_WithWrongPassword_ReturnsUnauthorized_DoesNotCreateSession()
    {
        using var context = CreateInMemoryContext(nameof(Reauthenticate_WithWrongPassword_ReturnsUnauthorized_DoesNotCreateSession));
        var (controller, _, hasher) = CreateController(context);
        var (user, _, attempt) = await SeedExamAttemptAsync(context, hasher);

        var request = new ReauthenticateAttemptRequest
        {
            Email = user.Email,
            Password = "WrongPassword999!",
            ClientId = "client_mobile_safari"
        };

        var result = await controller.ReauthenticateAttempt(attempt.Id, request, default);

        var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(result);
        dynamic data = unauthorizedResult.Value!;
        Assert.False((bool)data.success);
        Assert.Equal("INVALID_CREDENTIALS", (string)data.errorCode);

        // Assert no session was created
        var sessionsCount = await context.UserSessions.CountAsync();
        Assert.Equal(0, sessionsCount);
    }

    [Fact]
    public async Task Reauthenticate_WithOwnershipMismatch_ReturnsForbidden()
    {
        using var context = CreateInMemoryContext(nameof(Reauthenticate_WithOwnershipMismatch_ReturnsForbidden));
        var (controller, _, hasher) = CreateController(context);
        var (user, _, attempt) = await SeedExamAttemptAsync(context, hasher, userId: "cand_owner_01", email: "owner@prepford.com");

        var request = new ReauthenticateAttemptRequest
        {
            Email = "intruder@prepford.com", // Mismatched candidate email
            Password = "SecurePass123!",
            ClientId = "client_intruder"
        };

        var result = await controller.ReauthenticateAttempt(attempt.Id, request, default);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
        dynamic data = statusResult.Value!;
        Assert.False((bool)data.success);
        Assert.Equal("ATTEMPT_OWNERSHIP_MISMATCH", (string)data.errorCode);
    }

    [Fact]
    public async Task Reauthenticate_WhenAttemptExpired_ReturnsGone_AndMarksAttemptCompleted()
    {
        using var context = CreateInMemoryContext(nameof(Reauthenticate_WhenAttemptExpired_ReturnsGone_AndMarksAttemptCompleted));
        var (controller, _, hasher) = CreateController(context);
        // Elapsed 75 minutes on a 60 minute exam
        var (user, _, attempt) = await SeedExamAttemptAsync(context, hasher, timeLimitMinutes: 60, elapsedMinutes: 75);

        var request = new ReauthenticateAttemptRequest
        {
            Email = user.Email,
            Password = "SecurePass123!",
            ClientId = "client_desktop"
        };

        var result = await controller.ReauthenticateAttempt(attempt.Id, request, default);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status410Gone, statusResult.StatusCode);
        dynamic data = statusResult.Value!;
        Assert.False((bool)data.success);
        Assert.Equal("ATTEMPT_EXPIRED", (string)data.errorCode);

        // Verify attempt was transitioned to Completed with deadline timestamp
        var updatedAttempt = await context.ExamAttempts.FindAsync(attempt.Id);
        Assert.NotNull(updatedAttempt);
        Assert.Equal(AttemptStatus.Completed, updatedAttempt.Status);
        Assert.NotNull(updatedAttempt.CompletedAt);
    }

    [Fact]
    public async Task Reauthenticate_WhenAttemptAlreadyCompleted_ReturnsConflict()
    {
        using var context = CreateInMemoryContext(nameof(Reauthenticate_WhenAttemptAlreadyCompleted_ReturnsConflict));
        var (controller, _, hasher) = CreateController(context);
        var (user, _, attempt) = await SeedExamAttemptAsync(context, hasher, status: AttemptStatus.Completed);

        var request = new ReauthenticateAttemptRequest
        {
            Email = user.Email,
            Password = "SecurePass123!",
            ClientId = "client_desktop"
        };

        var result = await controller.ReauthenticateAttempt(attempt.Id, request, default);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status409Conflict, statusResult.StatusCode);
        dynamic data = statusResult.Value!;
        Assert.False((bool)data.success);
        Assert.Equal("ATTEMPT_NOT_IN_PROGRESS", (string)data.errorCode);
    }

    [Fact]
    public async Task Reauthenticate_WhenAttemptNotFound_ReturnsNotFound()
    {
        using var context = CreateInMemoryContext(nameof(Reauthenticate_WhenAttemptNotFound_ReturnsNotFound));
        var (controller, _, _) = CreateController(context);

        var request = new ReauthenticateAttemptRequest
        {
            Password = "SecurePass123!"
        };

        var result = await controller.ReauthenticateAttempt("nonexistent_attempt_id", request, default);

        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
        dynamic data = notFoundResult.Value!;
        Assert.False((bool)data.success);
        Assert.Equal("ATTEMPT_NOT_FOUND", (string)data.errorCode);
    }

    [Fact]
    public async Task Reauthenticate_EnforcesConcurrentSessionPolicy_WhenLimitExceeded()
    {
        using var context = CreateInMemoryContext(nameof(Reauthenticate_EnforcesConcurrentSessionPolicy_WhenLimitExceeded));
        var (controller, _, hasher) = CreateController(context);
        var (user, _, attempt) = await SeedExamAttemptAsync(context, hasher);

        // Restrict policy to MaxConcurrentSessions = 1
        var policy = await context.SessionSecurityPolicies.FirstAsync(p => p.Id == "global_policy");
        policy.MaxConcurrentSessions = 1;
        await context.SaveChangesAsync();

        // Seed an active session for the candidate on a different client
        context.UserSessions.Add(new UserSession
        {
            Id = "sess_active_01",
            UserId = user.Id,
            Role = "candidate",
            ClientId = "client_existing",
            TokenHash = "hash1",
            CreatedAt = DateTime.UtcNow,
            LastActiveAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(2),
            IdleExpiresAt = DateTime.UtcNow.AddHours(2),
            AbsoluteExpiresAt = DateTime.UtcNow.AddDays(7),
            Revoked = false,
            SecurityVersion = user.SecurityVersion
        });
        await context.SaveChangesAsync();

        var request = new ReauthenticateAttemptRequest
        {
            Email = user.Email,
            Password = "SecurePass123!",
            ClientId = "client_new_device" // Different client device
        };

        var result = await controller.ReauthenticateAttempt(attempt.Id, request, default);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
        dynamic data = statusResult.Value!;
        Assert.False((bool)data.success);
        Assert.Equal("CONCURRENT_SESSION_LIMIT_EXCEEDED", (string)data.errorCode);
    }

    [Fact]
    public async Task Reauthenticate_InactiveAccount_ReturnsForbidden()
    {
        using var context = CreateInMemoryContext(nameof(Reauthenticate_InactiveAccount_ReturnsForbidden));
        var (controller, _, hasher) = CreateController(context);
        var (user, _, attempt) = await SeedExamAttemptAsync(context, hasher);

        // Deactivate account
        user.IsActive = false;
        await context.SaveChangesAsync();

        var request = new ReauthenticateAttemptRequest
        {
            Email = user.Email,
            Password = "SecurePass123!"
        };

        var result = await controller.ReauthenticateAttempt(attempt.Id, request, default);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
        dynamic data = statusResult.Value!;
        Assert.False((bool)data.success);
        Assert.Equal("ACCOUNT_INACTIVE", (string)data.errorCode);
    }

    [Fact]
    public async Task SubmitResponse_WhenDeadlinePassed_RejectsWithAttemptExpired()
    {
        using var context = CreateInMemoryContext(nameof(SubmitResponse_WhenDeadlinePassed_RejectsWithAttemptExpired));
        var (controller, _, hasher) = CreateController(context, callerUserId: "cand_timed_01");
        // Started 70 minutes ago on a 60-minute exam
        var (user, exam, attempt) = await SeedExamAttemptAsync(context, hasher, userId: "cand_timed_01", timeLimitMinutes: 60, elapsedMinutes: 70);

        var submitRequest = new SubmitAnswerRequest
        {
            QuestionId = "q_reauth_01",
            SelectedOptionIndices = new List<int> { 0 },
            TimeSpentSeconds = 30
        };

        var result = await controller.SubmitResponse(attempt.Id, submitRequest, default);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status410Gone, statusResult.StatusCode);
        dynamic data = statusResult.Value!;
        Assert.False((bool)data.success);
        Assert.Equal("ATTEMPT_EXPIRED", (string)data.errorCode);

        // Verify attempt was transitioned to Completed
        var updatedAttempt = await context.ExamAttempts.FindAsync(attempt.Id);
        Assert.NotNull(updatedAttempt);
        Assert.Equal(AttemptStatus.Completed, updatedAttempt.Status);
    }

    [Fact]
    public async Task SubmitResponse_WhenAttemptInProgress_AcceptsAndSavesResponse()
    {
        using var context = CreateInMemoryContext(nameof(SubmitResponse_WhenAttemptInProgress_AcceptsAndSavesResponse));
        var (controller, _, hasher) = CreateController(context, callerUserId: "cand_active_01");
        // Started 10 minutes ago on a 60-minute exam
        var (user, exam, attempt) = await SeedExamAttemptAsync(context, hasher, userId: "cand_active_01", timeLimitMinutes: 60, elapsedMinutes: 10);

        var submitRequest = new SubmitAnswerRequest
        {
            QuestionId = "q_reauth_01",
            SelectedOptionIndices = new List<int> { 0 },
            TimeSpentSeconds = 30
        };

        var result = await controller.SubmitResponse(attempt.Id, submitRequest, default);

        var okResult = Assert.IsType<OkObjectResult>(result);
        dynamic data = okResult.Value!;
        Assert.True((bool)data.success);

        // Verify response was saved
        var savedResponse = await context.AttemptResponses.FirstOrDefaultAsync(r => r.ExamAttemptId == attempt.Id && r.QuestionId == "q_reauth_01");
        Assert.NotNull(savedResponse);
        Assert.Equal("[0]", savedResponse.SelectedOptionsJson);
    }
}
