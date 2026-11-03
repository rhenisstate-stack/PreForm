using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class ExaminationAuthoringTests
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

    private static async Task<Examination> SeedExaminationAsync(AppDbContext context, string pathway = "rn", string creatorId = "mgr_001")
    {
        var examFam = new Examination
        {
            Id = "exam_fam_" + Guid.NewGuid().ToString("N"),
            Pathway = pathway,
            Code = pathway == "rn" ? "RN-EX-000001" : "PN-EX-000001",
            Title = $"NCLEX-{(pathway.ToUpperInvariant())} Comprehensive Licensure Examination",
            CreatedAt = DateTime.UtcNow,
            CreatedBy = creatorId
        };
        context.Examinations.Add(examFam);
        await context.SaveChangesAsync();
        return examFam;
    }

    private static async Task<Exam> SeedRevisionAsync(
        AppDbContext context,
        string examinationId,
        int revisionNumber = 1,
        ExamLifecycleState state = ExamLifecycleState.Draft,
        string pathway = "rn",
        string creatorId = "mgr_001")
    {
        var exam = new Exam
        {
            Id = "rev_" + Guid.NewGuid().ToString("N"),
            ExaminationId = examinationId,
            RevisionNumber = revisionNumber,
            LifecycleState = state,
            ConcurrencyToken = 1,
            Title = $"Revision {revisionNumber}",
            Description = "Initial draft description",
            Pathway = pathway,
            ExamType = ExamType.Practice,
            TimeLimitMinutes = 60,
            PassingScorePercent = 75.0m,
            IsPublished = state == ExamLifecycleState.Published,
            CreatedBy = creatorId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Exams.Add(exam);
        await context.SaveChangesAsync();
        return exam;
    }

    private static async Task<Question> SeedQuestionAsync(
        AppDbContext context,
        string pathway = "rn",
        QuestionStatus status = QuestionStatus.Approved,
        string stem = "Clinical scenario test stem")
    {
        var question = new Question
        {
            Id = "q_" + Guid.NewGuid().ToString("N"),
            Stem = stem,
            Pathway = pathway,
            Status = status,
            QuestionTypeKey = "single-choice",
            Difficulty = QuestionDifficulty.Moderate,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        question.Options.Add(new QuestionOption
        {
            Id = Guid.NewGuid().ToString(),
            QuestionId = question.Id,
            OptionKey = "A",
            Content = "Administer oxygen via nasal cannula",
            IsCorrect = true,
            DisplayOrder = 1
        });

        question.Options.Add(new QuestionOption
        {
            Id = Guid.NewGuid().ToString(),
            QuestionId = question.Id,
            OptionKey = "B",
            Content = "Place patient in Trendelenburg position",
            IsCorrect = false,
            DisplayOrder = 2
        });

        context.Questions.Add(question);
        await context.SaveChangesAsync();
        return question;
    }

    // ── STAGE 1: METADATA AUTHORING & VALIDATION TESTS ─────────────────────────

    [Fact]
    public async Task UpdateRevisionMetadata_DraftState_SucceedsAndIncrementsConcurrencyToken()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var family = await SeedExaminationAsync(context);
        var revision = await SeedRevisionAsync(context, family.Id);

        var service = new ExamLifecycleService(context);
        var managerUser = CreateUserPrincipal("mgr_001", "exam_manager");

        var updateReq = new UpdateRevisionMetadataRequest
        {
            Title = "Updated NCLEX-RN Final Revision",
            Description = "Refined description with clinical instructions.",
            ExamType = ExamType.CAT,
            TimeLimitMinutes = 120,
            PassingScorePercent = 80.0m,
            ConcurrencyToken = 1
        };

        var result = await service.UpdateRevisionMetadataAsync(revision.Id, updateReq, managerUser);

        Assert.Equal("Updated NCLEX-RN Final Revision", result.Title);
        Assert.Equal("Refined description with clinical instructions.", result.Description);
        Assert.Equal(ExamType.CAT, result.ExamType);
        Assert.Equal(120, result.TimeLimitMinutes);
        Assert.Equal(80.0m, result.PassingScorePercent);
        Assert.Equal(2, result.ConcurrencyToken); // Monotonically incremented

        var updatedExam = await context.Exams.FindAsync(revision.Id);
        Assert.NotNull(updatedExam);
        Assert.Equal("Updated NCLEX-RN Final Revision", updatedExam.Title);
        Assert.Equal(2, updatedExam.ConcurrencyToken);

        var audit = await context.AuditLogs.FirstOrDefaultAsync(a => a.Action == "ExamRevisionMetadataUpdated" && a.EntityId == revision.Id);
        Assert.NotNull(audit);
        Assert.Equal("Success", audit.Outcome);
    }

    [Theory]
    [InlineData(ExamLifecycleState.InReview)]
    [InlineData(ExamLifecycleState.Approved)]
    [InlineData(ExamLifecycleState.Published)]
    [InlineData(ExamLifecycleState.Archived)]
    [InlineData(ExamLifecycleState.Retired)]
    public async Task UpdateRevisionMetadata_NonDraftState_ThrowsInvalidOperationException(ExamLifecycleState state)
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var family = await SeedExaminationAsync(context);
        var revision = await SeedRevisionAsync(context, family.Id, state: state);

        var service = new ExamLifecycleService(context);
        var managerUser = CreateUserPrincipal("mgr_001", "exam_manager");

        var updateReq = new UpdateRevisionMetadataRequest
        {
            Title = "Illegal Edit",
            ConcurrencyToken = 1
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.UpdateRevisionMetadataAsync(revision.Id, updateReq, managerUser));

        Assert.Contains("Only Draft revisions can be edited", ex.Message);
    }

    [Fact]
    public async Task UpdateRevisionMetadata_ConcurrencyMismatch_ThrowsDbUpdateConcurrencyException()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var family = await SeedExaminationAsync(context);
        var revision = await SeedRevisionAsync(context, family.Id);

        var service = new ExamLifecycleService(context);
        var managerUser = CreateUserPrincipal("mgr_001", "exam_manager");

        var updateReq = new UpdateRevisionMetadataRequest
        {
            Title = "Stale Edit",
            ConcurrencyToken = 999 // Mismatched token
        };

        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() =>
            service.UpdateRevisionMetadataAsync(revision.Id, updateReq, managerUser));

        var audit = await context.AuditLogs.FirstOrDefaultAsync(a => a.Outcome == "Conflict");
        Assert.NotNull(audit);
    }

    [Theory]
    [InlineData(-1, 75.0)]
    [InlineData(721, 75.0)]
    [InlineData(60, -0.1)]
    [InlineData(60, 100.1)]
    public async Task UpdateRevisionMetadata_InvalidBounds_ThrowsArgumentException(int timeLimit, decimal passingScore)
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var family = await SeedExaminationAsync(context);
        var revision = await SeedRevisionAsync(context, family.Id);

        var service = new ExamLifecycleService(context);
        var managerUser = CreateUserPrincipal("mgr_001", "exam_manager");

        var updateReq = new UpdateRevisionMetadataRequest
        {
            Title = "Bound Test",
            TimeLimitMinutes = timeLimit,
            PassingScorePercent = passingScore,
            ConcurrencyToken = 1
        };

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.UpdateRevisionMetadataAsync(revision.Id, updateReq, managerUser));
    }

    [Fact]
    public async Task ValidateRevision_ReportsIssuesAndPassesWhenCompliant()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var family = await SeedExaminationAsync(context, "rn");
        var revision = await SeedRevisionAsync(context, family.Id, pathway: "rn");

        var service = new ExamLifecycleService(context);
        var managerUser = CreateUserPrincipal("mgr_001", "exam_manager");

        // 1. Initially has 0 questions -> invalid
        var valResult1 = await service.ValidateRevisionAsync(revision.Id, managerUser);
        Assert.False(valResult1.IsValid);
        Assert.Contains(valResult1.Issues, i => i.Contains("at least one question"));

        // 2. Add an eligible question -> valid
        var q1 = await SeedQuestionAsync(context, "rn", QuestionStatus.Approved);
        await service.AddQuestionToRevisionAsync(revision.Id, new AddExamQuestionRequest { QuestionId = q1.Id, ConcurrencyToken = 1 }, managerUser);

        var valResult2 = await service.ValidateRevisionAsync(revision.Id, managerUser);
        Assert.True(valResult2.IsValid);
        Assert.Empty(valResult2.Issues);
    }

    // ── STAGE 2: QUESTION MEMBERSHIP & ORDERING TESTS ──────────────────────────

    [Fact]
    public async Task AddQuestionToRevision_EligibleApprovedQuestion_SucceedsAndBumpsConcurrency()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var family = await SeedExaminationAsync(context, "rn");
        var revision = await SeedRevisionAsync(context, family.Id, pathway: "rn");
        var question = await SeedQuestionAsync(context, "rn", QuestionStatus.Approved);

        var service = new ExamLifecycleService(context);
        var managerUser = CreateUserPrincipal("mgr_001", "exam_manager");

        var result = await service.AddQuestionToRevisionAsync(revision.Id, new AddExamQuestionRequest
        {
            QuestionId = question.Id,
            ConcurrencyToken = 1
        }, managerUser);

        Assert.Equal(question.Id, result.QuestionId);
        Assert.Equal(1, result.DisplayOrder);
        Assert.Equal("Approved", result.Status);

        var updatedExam = await context.Exams.FindAsync(revision.Id);
        Assert.Equal(2, updatedExam!.ConcurrencyToken);

        var count = await context.ExamQuestions.CountAsync(eq => eq.ExamId == revision.Id);
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task AddQuestionToRevision_DuplicateQuestion_ThrowsInvalidOperationException()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var family = await SeedExaminationAsync(context, "rn");
        var revision = await SeedRevisionAsync(context, family.Id, pathway: "rn");
        var question = await SeedQuestionAsync(context, "rn", QuestionStatus.Approved);

        var service = new ExamLifecycleService(context);
        var managerUser = CreateUserPrincipal("mgr_001", "exam_manager");

        await service.AddQuestionToRevisionAsync(revision.Id, new AddExamQuestionRequest { QuestionId = question.Id, ConcurrencyToken = 1 }, managerUser);

        // Attempt duplicate add
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.AddQuestionToRevisionAsync(revision.Id, new AddExamQuestionRequest { QuestionId = question.Id, ConcurrencyToken = 2 }, managerUser));

        Assert.Contains("already associated", ex.Message);
    }

    [Fact]
    public async Task AddQuestionToRevision_PathwayMismatch_ThrowsInvalidOperationException()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var family = await SeedExaminationAsync(context, "rn");
        var revision = await SeedRevisionAsync(context, family.Id, pathway: "rn");
        var pnQuestion = await SeedQuestionAsync(context, "pn", QuestionStatus.Approved);

        var service = new ExamLifecycleService(context);
        var managerUser = CreateUserPrincipal("mgr_001", "exam_manager");

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.AddQuestionToRevisionAsync(revision.Id, new AddExamQuestionRequest { QuestionId = pnQuestion.Id, ConcurrencyToken = 1 }, managerUser));

        Assert.Contains("Pathway mismatch", ex.Message);
    }

    [Theory]
    [InlineData(QuestionStatus.Draft)]
    [InlineData(QuestionStatus.InReview)]
    [InlineData(QuestionStatus.Archived)]
    public async Task AddQuestionToRevision_IneligibleQuestionStatus_ThrowsInvalidOperationException(QuestionStatus status)
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var family = await SeedExaminationAsync(context, "rn");
        var revision = await SeedRevisionAsync(context, family.Id, pathway: "rn");
        var question = await SeedQuestionAsync(context, "rn", status);

        var service = new ExamLifecycleService(context);
        var managerUser = CreateUserPrincipal("mgr_001", "exam_manager");

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.AddQuestionToRevisionAsync(revision.Id, new AddExamQuestionRequest { QuestionId = question.Id, ConcurrencyToken = 1 }, managerUser));

        Assert.Contains("Only Approved or Published questions can be added", ex.Message);
    }

    [Fact]
    public async Task RemoveQuestionFromRevision_SucceedsAndNormalizesDisplayOrder()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var family = await SeedExaminationAsync(context, "rn");
        var revision = await SeedRevisionAsync(context, family.Id, pathway: "rn");
        var q1 = await SeedQuestionAsync(context, "rn", QuestionStatus.Approved, "Q1");
        var q2 = await SeedQuestionAsync(context, "rn", QuestionStatus.Approved, "Q2");
        var q3 = await SeedQuestionAsync(context, "rn", QuestionStatus.Approved, "Q3");

        var service = new ExamLifecycleService(context);
        var managerUser = CreateUserPrincipal("mgr_001", "exam_manager");

        await service.AddQuestionToRevisionAsync(revision.Id, new AddExamQuestionRequest { QuestionId = q1.Id, ConcurrencyToken = 1 }, managerUser);
        await service.AddQuestionToRevisionAsync(revision.Id, new AddExamQuestionRequest { QuestionId = q2.Id, ConcurrencyToken = 2 }, managerUser);
        await service.AddQuestionToRevisionAsync(revision.Id, new AddExamQuestionRequest { QuestionId = q3.Id, ConcurrencyToken = 3 }, managerUser);

        // Remove q2 (which was order 2)
        var removed = await service.RemoveQuestionFromRevisionAsync(revision.Id, q2.Id, 4, managerUser);
        Assert.True(removed);

        var remaining = await service.GetRevisionQuestionsAsync(revision.Id, managerUser);
        Assert.Equal(2, remaining.Count);
        Assert.Equal(q1.Id, remaining[0].QuestionId);
        Assert.Equal(1, remaining[0].DisplayOrder);
        Assert.Equal(q3.Id, remaining[1].QuestionId);
        Assert.Equal(2, remaining[1].DisplayOrder); // re-sequenced to 2
    }

    [Fact]
    public async Task ReorderQuestions_ValidOrdering_SucceedsAndUpdatesDisplayOrders()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var family = await SeedExaminationAsync(context, "rn");
        var revision = await SeedRevisionAsync(context, family.Id, pathway: "rn");
        var q1 = await SeedQuestionAsync(context, "rn", QuestionStatus.Approved, "Q1");
        var q2 = await SeedQuestionAsync(context, "rn", QuestionStatus.Approved, "Q2");

        var service = new ExamLifecycleService(context);
        var managerUser = CreateUserPrincipal("mgr_001", "exam_manager");

        await service.AddQuestionToRevisionAsync(revision.Id, new AddExamQuestionRequest { QuestionId = q1.Id, ConcurrencyToken = 1 }, managerUser);
        await service.AddQuestionToRevisionAsync(revision.Id, new AddExamQuestionRequest { QuestionId = q2.Id, ConcurrencyToken = 2 }, managerUser);

        // Invert order: q2 first, q1 second
        var reorderReq = new ReorderExamQuestionsRequest
        {
            ConcurrencyToken = 3,
            Items = new List<QuestionOrderItem>
            {
                new QuestionOrderItem { QuestionId = q2.Id, DisplayOrder = 1 },
                new QuestionOrderItem { QuestionId = q1.Id, DisplayOrder = 2 }
            }
        };

        var reordered = await service.ReorderQuestionsAsync(revision.Id, reorderReq, managerUser);
        Assert.Equal(q2.Id, reordered[0].QuestionId);
        Assert.Equal(1, reordered[0].DisplayOrder);
        Assert.Equal(q1.Id, reordered[1].QuestionId);
        Assert.Equal(2, reordered[1].DisplayOrder);
    }

    [Fact]
    public async Task ReorderQuestions_MissingOrForeignQuestion_ThrowsArgumentException()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var family = await SeedExaminationAsync(context, "rn");
        var revision = await SeedRevisionAsync(context, family.Id, pathway: "rn");
        var q1 = await SeedQuestionAsync(context, "rn", QuestionStatus.Approved, "Q1");
        var q2 = await SeedQuestionAsync(context, "rn", QuestionStatus.Approved, "Q2");

        var service = new ExamLifecycleService(context);
        var managerUser = CreateUserPrincipal("mgr_001", "exam_manager");

        await service.AddQuestionToRevisionAsync(revision.Id, new AddExamQuestionRequest { QuestionId = q1.Id, ConcurrencyToken = 1 }, managerUser);
        await service.AddQuestionToRevisionAsync(revision.Id, new AddExamQuestionRequest { QuestionId = q2.Id, ConcurrencyToken = 2 }, managerUser);

        // Missing q2
        var incompleteReq = new ReorderExamQuestionsRequest
        {
            ConcurrencyToken = 3,
            Items = new List<QuestionOrderItem>
            {
                new QuestionOrderItem { QuestionId = q1.Id, DisplayOrder = 1 }
            }
        };

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.ReorderQuestionsAsync(revision.Id, incompleteReq, managerUser));
    }

    // ── STAGE 3: FAMILY METADATA & SAFE DRAFT DISCARD TESTS ────────────────────

    [Fact]
    public async Task UpdateExaminationFamily_ValidTitle_Succeeds()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var family = await SeedExaminationAsync(context, "rn");

        var service = new ExamLifecycleService(context);
        var adminUser = CreateUserPrincipal("admin_001", "admin");

        var result = await service.UpdateExaminationFamilyAsync(family.Id, new UpdateExaminationFamilyRequest
        {
            Title = "NCLEX-RN Next Generation Clinical Mastery"
        }, adminUser);

        Assert.Equal("NCLEX-RN Next Generation Clinical Mastery", result.Title);

        var audit = await context.AuditLogs.FirstOrDefaultAsync(a => a.Action == "ExaminationFamilyUpdated" && a.EntityId == family.Id);
        Assert.NotNull(audit);
    }

    [Fact]
    public async Task DiscardDraftRevision_EligibleDraftRevision_SucceedsAndRemovesFromDb()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var family = await SeedExaminationAsync(context, "rn");
        var rev1 = await SeedRevisionAsync(context, family.Id, revisionNumber: 1, state: ExamLifecycleState.Published);
        family.CurrentRevisionId = rev1.Id;
        await context.SaveChangesAsync();

        // Revision 2 is an unused draft
        var rev2 = await SeedRevisionAsync(context, family.Id, revisionNumber: 2, state: ExamLifecycleState.Draft);

        var service = new ExamLifecycleService(context);
        var managerUser = CreateUserPrincipal("mgr_001", "exam_manager");

        var discarded = await service.DiscardDraftRevisionAsync(rev2.Id, 1, managerUser);
        Assert.True(discarded);

        var checkRev2 = await context.Exams.FindAsync(rev2.Id);
        Assert.Null(checkRev2); // Safely deleted

        var audit = await context.AuditLogs.FirstOrDefaultAsync(a => a.Action == "ExamRevisionDiscarded" && a.EntityId == rev2.Id);
        Assert.NotNull(audit);
    }

    [Fact]
    public async Task DiscardDraftRevision_SoleRevision1_ThrowsInvalidOperationException()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var family = await SeedExaminationAsync(context, "rn");
        var rev1 = await SeedRevisionAsync(context, family.Id, revisionNumber: 1, state: ExamLifecycleState.Draft);

        var service = new ExamLifecycleService(context);
        var managerUser = CreateUserPrincipal("mgr_001", "exam_manager");

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.DiscardDraftRevisionAsync(rev1.Id, 1, managerUser));

        Assert.Contains("sole revision", ex.Message);
    }

    [Fact]
    public async Task DiscardDraftRevision_RevisionWithAttempts_ThrowsInvalidOperationException()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var family = await SeedExaminationAsync(context, "rn");
        var rev1 = await SeedRevisionAsync(context, family.Id, revisionNumber: 1, state: ExamLifecycleState.Published);
        family.CurrentRevisionId = rev1.Id;
        await context.SaveChangesAsync();

        var rev2 = await SeedRevisionAsync(context, family.Id, revisionNumber: 2, state: ExamLifecycleState.Draft);

        // Attach an attempt to rev2
        context.ExamAttempts.Add(new ExamAttempt
        {
            Id = "att_" + Guid.NewGuid().ToString("N"),
            ExamId = rev2.Id,
            UserId = "user_001",
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var service = new ExamLifecycleService(context);
        var managerUser = CreateUserPrincipal("mgr_001", "exam_manager");

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.DiscardDraftRevisionAsync(rev2.Id, 1, managerUser));

        Assert.Contains("associated attempts", ex.Message);
    }
}
