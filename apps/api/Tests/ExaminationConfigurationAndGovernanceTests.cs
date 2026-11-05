using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Controllers;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Preform.Api.Services.Grading;
using Xunit;

namespace Preform.Api.Tests;

public class ExaminationConfigurationAndGovernanceTests
{
    private static AppDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        return new AppDbContext(options);
    }

    private static ClaimsPrincipal CreateUserPrincipal(string userId, string role)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Role, role),
            new Claim("role", role)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        return new ClaimsPrincipal(identity);
    }

    private static ExamAttemptsController CreateExamAttemptsController(AppDbContext db)
    {
        var registry = QuestionTypeRegistry.Instance;
        var resolver = new QuestionGraderResolver(registry);
        var validationService = new ResponseValidationService(db, resolver);
        var attemptQuestionService = new AttemptQuestionService(db);
        var selectionService = new AssessmentSelectionService(db, registry);
        return new ExamAttemptsController(
            db,
            NullLogger<ExamAttemptsController>.Instance,
            validationService,
            attemptQuestionService,
            sessionSecurityService: null,
            passwordHasher: null,
            rateLimitingService: null,
            assessmentSelectionService: selectionService);
    }

    private static async Task<(Examination family, Exam revision)> SeedExamFamilyWithRevisionAsync(
        AppDbContext context,
        string pathway = "rn",
        ExamLifecycleState state = ExamLifecycleState.Draft,
        string creatorId = "exam_mgr_01")
    {
        var examFam = new Examination
        {
            Id = "exam_fam_" + Guid.NewGuid().ToString("N"),
            Pathway = pathway,
            Code = pathway == "rn" ? "RN-EX-000001" : "PN-EX-000001",
            Title = $"NCLEX-{(pathway.ToUpperInvariant())} Licensure Examination",
            CreatedBy = creatorId,
            CreatedAt = DateTime.UtcNow
        };
        context.Examinations.Add(examFam);

        var rev = new Exam
        {
            Id = "exam_rev_" + Guid.NewGuid().ToString("N"),
            ExaminationId = examFam.Id,
            RevisionNumber = 1,
            LifecycleState = state,
            ConcurrencyToken = 1,
            Title = examFam.Title + " - Initial Revision",
            Description = "Standard licensure revision",
            Pathway = pathway,
            ExamType = ExamType.Practice,
            TimeLimitMinutes = 60,
            PassingScorePercent = 75.0m,
            IsPublished = state == ExamLifecycleState.Published,
            TargetQuestionCount = 10,
            SelectionStrategy = "Preset",
            ReviewPolicy = "AfterExamSubmission",
            ShowRationales = true,
            ShowScoreImmediately = true,
            IsAvailable = true,
            CreatedBy = creatorId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Exams.Add(rev);

        examFam.CurrentRevisionId = rev.Id;
        await context.SaveChangesAsync();
        return (examFam, rev);
    }

    private static async Task<Question> SeedQuestionAsync(
        AppDbContext context,
        string pathway = "rn",
        string clientNeedCode = "MOC",
        string questionTypeKey = "single-choice",
        QuestionStatus status = QuestionStatus.Published)
    {
        var q = new Question
        {
            Id = "q_" + Guid.NewGuid().ToString("N"),
            Stem = $"Clinical scenario evaluating {clientNeedCode} competency.",
            Pathway = pathway,
            ClientNeedId = clientNeedCode,
            QuestionTypeKey = questionTypeKey,
            Status = status,
            OverallRationale = "Authoritative clinical rationale for testing.",
            Difficulty = QuestionDifficulty.Moderate
        };

        q.Options = new List<QuestionOption>
        {
            new QuestionOption { Id = Guid.NewGuid().ToString(), QuestionId = q.Id, OptionKey = "A", Content = "Option A", IsCorrect = true, DisplayOrder = 0 },
            new QuestionOption { Id = Guid.NewGuid().ToString(), QuestionId = q.Id, OptionKey = "B", Content = "Option B", IsCorrect = false, DisplayOrder = 1 },
            new QuestionOption { Id = Guid.NewGuid().ToString(), QuestionId = q.Id, OptionKey = "C", Content = "Option C", IsCorrect = false, DisplayOrder = 2 },
            new QuestionOption { Id = Guid.NewGuid().ToString(), QuestionId = q.Id, OptionKey = "D", Content = "Option D", IsCorrect = false, DisplayOrder = 3 }
        };

        context.Questions.Add(q);
        await context.SaveChangesAsync();
        return q;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Milestone P4.1 & P4.3: Composition & Blueprint Tests
    // ────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetComposition_DefaultQuotas_SumsToTargetCountAndContainsAllEightClientNeeds()
    {
        var db = CreateInMemoryContext(nameof(GetComposition_DefaultQuotas_SumsToTargetCountAndContainsAllEightClientNeeds));
        var (_, rev) = await SeedExamFamilyWithRevisionAsync(db, "rn", ExamLifecycleState.Draft);
        var service = new ExamLifecycleService(db);
        var admin = CreateUserPrincipal("admin_1", "admin");

        var composition = await service.GetCompositionAsync(rev.Id, admin);

        Assert.NotNull(composition);
        Assert.Equal(rev.Id, composition.RevisionId);
        Assert.Equal(10, composition.TargetQuestionCount);
        Assert.Equal("Preset", composition.SelectionStrategy);
        Assert.Equal(8, composition.ClientNeedQuotas.Count);

        var totalTargetCount = composition.ClientNeedQuotas.Sum(q => q.TargetCount);
        Assert.Equal(composition.TargetQuestionCount, totalTargetCount);

        // Verify the 8 canonical codes
        var expectedCodes = new HashSet<string> { "MOC", "SIC", "HPM", "PSI", "BCC", "PHA", "RRP", "PPT" };
        var actualCodes = composition.ClientNeedQuotas.Select(q => q.ClientNeedCode).ToHashSet();
        Assert.Equal(expectedCodes, actualCodes);
    }

    [Fact]
    public async Task UpdateComposition_ValidQuotas_PersistsAndRecalculatesQuotas()
    {
        var db = CreateInMemoryContext(nameof(UpdateComposition_ValidQuotas_PersistsAndRecalculatesQuotas));
        var (_, rev) = await SeedExamFamilyWithRevisionAsync(db, "rn", ExamLifecycleState.Draft);
        var service = new ExamLifecycleService(db);
        var admin = CreateUserPrincipal("admin_1", "admin");

        var customQuotas = new List<ClientNeedQuotaItem>
        {
            new ClientNeedQuotaItem { ClientNeedCode = "MOC", TargetPercentage = 25m, TargetCount = 5 },
            new ClientNeedQuotaItem { ClientNeedCode = "SIC", TargetPercentage = 25m, TargetCount = 5 },
            new ClientNeedQuotaItem { ClientNeedCode = "PHA", TargetPercentage = 25m, TargetCount = 5 },
            new ClientNeedQuotaItem { ClientNeedCode = "PPT", TargetPercentage = 25m, TargetCount = 5 }
        };

        var request = new UpdateExamCompositionRequest
        {
            TargetQuestionCount = 20,
            SelectionStrategy = "DynamicBalanced",
            ClientNeedQuotas = customQuotas,
            AllowedQuestionTypes = new List<string> { "single-choice", "multiple-choice", "sata" },
            ConcurrencyToken = rev.ConcurrencyToken
        };

        var updated = await service.UpdateCompositionAsync(rev.Id, request, admin);

        Assert.NotNull(updated);
        Assert.Equal(20, updated.TargetQuestionCount);
        Assert.Equal("DynamicBalanced", updated.SelectionStrategy);
        Assert.Equal(4, updated.ClientNeedQuotas.Count);
        Assert.Equal(3, updated.AllowedQuestionTypes.Count);

        var persistedRev = await db.Exams.FindAsync(rev.Id);
        Assert.NotNull(persistedRev);
        Assert.Equal(20, persistedRev.TargetQuestionCount);
        Assert.Equal("DynamicBalanced", persistedRev.SelectionStrategy);
        Assert.False(string.IsNullOrWhiteSpace(persistedRev.CompositionRulesJson));
    }

    [Fact]
    public async Task UpdateComposition_UnsupportedQuestionType_ThrowsInvalidOperationException()
    {
        var db = CreateInMemoryContext(nameof(UpdateComposition_UnsupportedQuestionType_ThrowsInvalidOperationException));
        var (_, rev) = await SeedExamFamilyWithRevisionAsync(db, "rn", ExamLifecycleState.Draft);
        var service = new ExamLifecycleService(db);
        var admin = CreateUserPrincipal("admin_1", "admin");

        var request = new UpdateExamCompositionRequest
        {
            TargetQuestionCount = 10,
            SelectionStrategy = "DynamicBalanced",
            AllowedQuestionTypes = new List<string> { "single-choice", "extended-drag-drop" }, // catalogued NGN type
            ConcurrencyToken = rev.ConcurrencyToken
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.UpdateCompositionAsync(rev.Id, request, admin));

        Assert.Contains("Unsupported question type", ex.Message);
    }

    [Fact]
    public async Task UpdateComposition_StaleConcurrencyToken_ThrowsDbUpdateConcurrencyException()
    {
        var db = CreateInMemoryContext(nameof(UpdateComposition_StaleConcurrencyToken_ThrowsDbUpdateConcurrencyException));
        var (_, rev) = await SeedExamFamilyWithRevisionAsync(db, "rn", ExamLifecycleState.Draft);
        var service = new ExamLifecycleService(db);
        var admin = CreateUserPrincipal("admin_1", "admin");

        var request = new UpdateExamCompositionRequest
        {
            TargetQuestionCount = 15,
            SelectionStrategy = "Preset",
            ConcurrencyToken = 999 // stale token
        };

        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() =>
            service.UpdateCompositionAsync(rev.Id, request, admin));
    }

    // ────────────────────────────────────────────────────────────────────────
    // Milestone P4.6: Readiness Evaluation & Admin Preview Tests
    // ────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetReadinessReport_EmptyTitle_ReturnsBlockingIssue()
    {
        var db = CreateInMemoryContext(nameof(GetReadinessReport_EmptyTitle_ReturnsBlockingIssue));
        var (_, rev) = await SeedExamFamilyWithRevisionAsync(db, "rn", ExamLifecycleState.Draft);
        rev.Title = "   "; // empty title
        await db.SaveChangesAsync();

        var service = new ExamLifecycleService(db);
        var admin = CreateUserPrincipal("admin_1", "admin");

        var report = await service.GetReadinessReportAsync(rev.Id, admin);

        Assert.NotNull(report);
        Assert.Equal("BLOCK", report.OverallStatus);
        Assert.False(report.CanPublish);
        Assert.Contains(report.Checks, c => c.Category == "Metadata" && c.Name == "Title" && c.Status == "BLOCK");
    }

    [Fact]
    public async Task GetReadinessReport_ZeroQuestionsPreset_ReturnsBlockingIssue()
    {
        var db = CreateInMemoryContext(nameof(GetReadinessReport_ZeroQuestionsPreset_ReturnsBlockingIssue));
        var (_, rev) = await SeedExamFamilyWithRevisionAsync(db, "rn", ExamLifecycleState.Draft);
        // rev has 0 questions assigned
        var service = new ExamLifecycleService(db);
        var admin = CreateUserPrincipal("admin_1", "admin");

        var report = await service.GetReadinessReportAsync(rev.Id, admin);

        Assert.NotNull(report);
        Assert.Equal("BLOCK", report.OverallStatus);
        Assert.False(report.CanPublish);
        Assert.Contains(report.Checks, c => c.Category == "QuestionPool" && c.Status == "BLOCK");
    }

    [Fact]
    public async Task GetReadinessReport_AllCriteriaMet_ReturnsPassAndCanPublish()
    {
        var db = CreateInMemoryContext(nameof(GetReadinessReport_AllCriteriaMet_ReturnsPassAndCanPublish));
        var (_, rev) = await SeedExamFamilyWithRevisionAsync(db, "rn", ExamLifecycleState.Draft);
        var q1 = await SeedQuestionAsync(db, "rn", "MOC", "single-choice", QuestionStatus.Approved);
        var q2 = await SeedQuestionAsync(db, "rn", "SIC", "sata", QuestionStatus.Published);

        db.ExamQuestions.Add(new ExamQuestion { ExamId = rev.Id, QuestionId = q1.Id, DisplayOrder = 0 });
        db.ExamQuestions.Add(new ExamQuestion { ExamId = rev.Id, QuestionId = q2.Id, DisplayOrder = 1 });
        await db.SaveChangesAsync();

        var service = new ExamLifecycleService(db);
        var admin = CreateUserPrincipal("admin_1", "admin");

        var report = await service.GetReadinessReportAsync(rev.Id, admin);

        Assert.NotNull(report);
        Assert.Equal("PASS", report.OverallStatus);
        Assert.True(report.CanPublish);
        Assert.All(report.Checks, c => Assert.NotEqual("BLOCK", c.Status));
    }

    [Fact]
    public async Task Publish_WithBlockingReadinessIssues_ThrowsInvalidOperationException()
    {
        var db = CreateInMemoryContext(nameof(Publish_WithBlockingReadinessIssues_ThrowsInvalidOperationException));
        var (_, rev) = await SeedExamFamilyWithRevisionAsync(db, "rn", ExamLifecycleState.Approved);
        // Has 0 questions assigned -> Blocking QuestionPool check
        var service = new ExamLifecycleService(db);
        var admin = CreateUserPrincipal("admin_1", "admin");

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.PublishAsync(rev.Id, rev.ConcurrencyToken, admin));

        Assert.Contains("Cannot publish examination with blocking readiness issues", ex.Message);
    }

    [Fact]
    public async Task Publish_PassingReadiness_FreezesConfigurationSnapshot()
    {
        var db = CreateInMemoryContext(nameof(Publish_PassingReadiness_FreezesConfigurationSnapshot));
        var (_, rev) = await SeedExamFamilyWithRevisionAsync(db, "rn", ExamLifecycleState.Approved);
        var q1 = await SeedQuestionAsync(db, "rn", "MOC", "single-choice", QuestionStatus.Approved);
        db.ExamQuestions.Add(new ExamQuestion { ExamId = rev.Id, QuestionId = q1.Id, DisplayOrder = 0 });
        await db.SaveChangesAsync();

        var service = new ExamLifecycleService(db);
        var admin = CreateUserPrincipal("admin_1", "admin");

        var published = await service.PublishAsync(rev.Id, rev.ConcurrencyToken, admin);

        Assert.NotNull(published);
        Assert.Equal("Published", published.LifecycleState);
        Assert.True(published.IsPublished);
        Assert.False(string.IsNullOrWhiteSpace(published.ConfigurationSnapshotJson));

        var snapshot = JsonSerializer.Deserialize<JsonElement>(published.ConfigurationSnapshotJson);
        Assert.Equal(rev.Title, snapshot.GetProperty("title").GetString());
        Assert.Equal("rn", snapshot.GetProperty("pathway").GetString());
        Assert.Equal(60, snapshot.GetProperty("timeLimitMinutes").GetInt32());
    }

    [Fact]
    public async Task GetAdminPreview_ZeroLearnerSideEffects_ReturnsQuestionsAndRationales()
    {
        var db = CreateInMemoryContext(nameof(GetAdminPreview_ZeroLearnerSideEffects_ReturnsQuestionsAndRationales));
        var (_, rev) = await SeedExamFamilyWithRevisionAsync(db, "rn", ExamLifecycleState.Draft);
        var q1 = await SeedQuestionAsync(db, "rn", "MOC", "single-choice", QuestionStatus.Published);
        db.ExamQuestions.Add(new ExamQuestion { ExamId = rev.Id, QuestionId = q1.Id, DisplayOrder = 0 });
        await db.SaveChangesAsync();

        var initialAttemptsCount = await db.ExamAttempts.CountAsync();
        var initialResponsesCount = await db.AttemptResponses.CountAsync();

        var service = new ExamLifecycleService(db);
        var admin = CreateUserPrincipal("admin_1", "admin");

        var preview = await service.GetAdminPreviewAsync(rev.Id, admin);

        Assert.NotNull(preview);
        Assert.Equal(rev.Id, preview.RevisionId);
        Assert.Equal(1, preview.QuestionCount);
        Assert.Single(preview.Questions);

        var firstQ = preview.Questions[0];
        Assert.Equal(q1.Stem, firstQ.Stem);
        Assert.Equal(4, firstQ.Options.Count);
        Assert.False(string.IsNullOrWhiteSpace(firstQ.Rationale));
        Assert.Contains("A", firstQ.CorrectOptionKeys);

        // Invariant: ZERO learner attempt records created!
        Assert.Equal(initialAttemptsCount, await db.ExamAttempts.CountAsync());
        Assert.Equal(initialResponsesCount, await db.AttemptResponses.CountAsync());
    }

    // ────────────────────────────────────────────────────────────────────────
    // Milestone P4.5: Availability, Attempt Limits & Review Policy Tests
    // ────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task AssessmentsController_FiltersUnavailableAndExpiredExams()
    {
        var db = CreateInMemoryContext(nameof(AssessmentsController_FiltersUnavailableAndExpiredExams));
        var user = new User { Id = "cand_avail_test", Email = "cand@prepford.com", Pathway = "rn", IsActive = true };
        db.Users.Add(user);

        // Exam 1: IsAvailable = false
        var (_, revDisabled) = await SeedExamFamilyWithRevisionAsync(db, "rn", ExamLifecycleState.Published);
        revDisabled.IsAvailable = false;

        // Exam 2: Expired AvailableTo
        var (_, revExpired) = await SeedExamFamilyWithRevisionAsync(db, "rn", ExamLifecycleState.Published);
        revExpired.AvailableTo = DateTime.UtcNow.AddDays(-1);

        // Exam 3: Fully available
        var (_, revActive) = await SeedExamFamilyWithRevisionAsync(db, "rn", ExamLifecycleState.Published);
        revActive.IsAvailable = true;
        revActive.AvailableFrom = DateTime.UtcNow.AddDays(-1);
        revActive.AvailableTo = DateTime.UtcNow.AddDays(10);

        await db.SaveChangesAsync();

        var controller = new AssessmentsController(db, NullLogger<AssessmentsController>.Instance);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(user.Id, "candidate") }
        };

        var result = await controller.GetAvailableAssessments("rn", CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(result);

        var json = JsonSerializer.Serialize(okResult.Value);
        Assert.Contains(revActive.Id, json);
        Assert.DoesNotContain(revDisabled.Id, json);
        Assert.DoesNotContain(revExpired.Id, json);
    }

    [Fact]
    public async Task ExamAttempts_StartAttempt_EnforcesMaxAttemptsAllowed()
    {
        var db = CreateInMemoryContext(nameof(ExamAttempts_StartAttempt_EnforcesMaxAttemptsAllowed));
        var user = new User { Id = "cand_attempts_test", Email = "cand2@prepford.com", Pathway = "rn", IsActive = true };
        db.Users.Add(user);

        var (_, rev) = await SeedExamFamilyWithRevisionAsync(db, "rn", ExamLifecycleState.Published);
        rev.MaxAttemptsAllowed = 1; // max 1 attempt
        var q = await SeedQuestionAsync(db, "rn", "MOC", "single-choice", QuestionStatus.Published);
        db.ExamQuestions.Add(new ExamQuestion { ExamId = rev.Id, QuestionId = q.Id, DisplayOrder = 0 });

        // Simulate 1 existing completed attempt
        db.ExamAttempts.Add(new ExamAttempt
        {
            Id = "att_completed_1",
            UserId = user.Id,
            ExamId = rev.Id,
            Status = AttemptStatus.Completed,
            ScorePercent = 80.0m,
            Passed = true,
            StartedAt = DateTime.UtcNow.AddHours(-2),
            CompletedAt = DateTime.UtcNow.AddHours(-1)
        });
        await db.SaveChangesAsync();

        var controller = CreateExamAttemptsController(db);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(user.Id, "candidate") }
        };

        var startReq = new StartAttemptRequest { ExamId = rev.Id };
        var actionResult = await controller.StartAttempt(startReq, CancellationToken.None);

        var statusResult = Assert.IsType<ObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, statusResult.StatusCode);

        var json = JsonSerializer.Serialize(statusResult.Value);
        Assert.Contains("MAX_ATTEMPTS_REACHED", json);
    }

    [Fact]
    public async Task ExamAttempts_StartAttempt_EnforcesRetakeCooldown()
    {
        var db = CreateInMemoryContext(nameof(ExamAttempts_StartAttempt_EnforcesRetakeCooldown));
        var user = new User { Id = "cand_cooldown_test", Email = "cand3@prepford.com", Pathway = "rn", IsActive = true };
        db.Users.Add(user);

        var (_, rev) = await SeedExamFamilyWithRevisionAsync(db, "rn", ExamLifecycleState.Published);
        rev.MaxAttemptsAllowed = 5;
        rev.RetakeCooldownHours = 24; // 24 hour cooldown
        var q = await SeedQuestionAsync(db, "rn", "MOC", "single-choice", QuestionStatus.Published);
        db.ExamQuestions.Add(new ExamQuestion { ExamId = rev.Id, QuestionId = q.Id, DisplayOrder = 0 });

        // Completed 1 hour ago
        db.ExamAttempts.Add(new ExamAttempt
        {
            Id = "att_cooldown_completed",
            UserId = user.Id,
            ExamId = rev.Id,
            Status = AttemptStatus.Completed,
            StartedAt = DateTime.UtcNow.AddHours(-2),
            CompletedAt = DateTime.UtcNow.AddHours(-1)
        });
        await db.SaveChangesAsync();

        var controller = CreateExamAttemptsController(db);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(user.Id, "candidate") }
        };

        var startReq = new StartAttemptRequest { ExamId = rev.Id };
        var actionResult = await controller.StartAttempt(startReq, CancellationToken.None);

        var statusResult = Assert.IsType<ObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, statusResult.StatusCode);

        var json = JsonSerializer.Serialize(statusResult.Value);
        Assert.Contains("RETAKE_COOLDOWN_ACTIVE", json);
    }

    [Fact]
    public async Task ExamAttempts_GetAttemptById_RespectsReviewPolicyNever()
    {
        var db = CreateInMemoryContext(nameof(ExamAttempts_GetAttemptById_RespectsReviewPolicyNever));
        var user = new User { Id = "cand_review_test", Email = "cand4@prepford.com", Pathway = "rn", IsActive = true };
        db.Users.Add(user);

        var (_, rev) = await SeedExamFamilyWithRevisionAsync(db, "rn", ExamLifecycleState.Published);
        rev.ReviewPolicy = "Never"; // Rationales and answers never revealed!
        rev.ShowRationales = false;

        var q = await SeedQuestionAsync(db, "rn", "MOC", "single-choice", QuestionStatus.Published);
        db.ExamQuestions.Add(new ExamQuestion { ExamId = rev.Id, QuestionId = q.Id, DisplayOrder = 0 });

        var attempt = new ExamAttempt
        {
            Id = "att_review_policy_test",
            UserId = user.Id,
            ExamId = rev.Id,
            Status = AttemptStatus.Completed,
            ScorePercent = 100m,
            Passed = true,
            StartedAt = DateTime.UtcNow.AddMinutes(-30),
            CompletedAt = DateTime.UtcNow
        };
        db.ExamAttempts.Add(attempt);

        db.ExamAttemptQuestions.Add(new ExamAttemptQuestion
        {
            Id = Guid.NewGuid().ToString(),
            ExamAttemptId = attempt.Id,
            QuestionId = q.Id,
            DisplayOrder = 1
        });
        await db.SaveChangesAsync();

        var controller = CreateExamAttemptsController(db);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(user.Id, "candidate") }
        };

        var result = await controller.GetAttemptById(attempt.Id, CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(result);

        var json = JsonSerializer.Serialize(okResult.Value);
        // Correct answer indices and rationales must be null!
        Assert.DoesNotContain("Authoritative clinical rationale for testing", json);
    }
}
