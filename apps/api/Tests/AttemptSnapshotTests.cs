using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
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

public class AttemptSnapshotTests
{
    private static AppDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        return new AppDbContext(options);
    }

    private static ExamAttemptsController CreateController(AppDbContext context, string userId = "cand_001", string role = "candidate")
    {
        var nullLogger = NullLogger<ExamAttemptsController>.Instance;
        var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);
        var validationService = new ResponseValidationService(context, resolver);
        var questionService = new AttemptQuestionService(context);

        var controller = new ExamAttemptsController(context, nullLogger, validationService, questionService);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Role, role),
            new Claim("role", role)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(identity)
            }
        };

        return controller;
    }

    [Fact]
    public async Task StartAttempt_GeneratesAuthoritativeJsonMetadataSnapshot()
    {
        using var context = CreateInMemoryContext(nameof(StartAttempt_GeneratesAuthoritativeJsonMetadataSnapshot));

        var examFam = new Examination
        {
            Id = "fam_rn_01",
            Code = "RN-EX-000042",
            Pathway = "rn",
            Title = "NCLEX-RN Practice Mock",
            CreatedBy = "mgr_001"
        };
        context.Examinations.Add(examFam);

        var exam = new Exam
        {
            Id = "rev_rn_01",
            ExaminationId = examFam.Id,
            Examination = examFam,
            RevisionNumber = 1,
            LifecycleState = ExamLifecycleState.Published,
            IsPublished = true,
            Title = "NCLEX-RN Practice Mock - Core",
            Description = "Full simulation for RN candidates",
            Pathway = "rn",
            ExamType = ExamType.CAT,
            TimeLimitMinutes = 180,
            PassingScorePercent = 75.0m,
            CreatedBy = "mgr_001",
            PublishedAt = DateTime.UtcNow
        };
        context.Exams.Add(exam);

        var q1 = new Question { Id = "q_snap_01", Stem = "Q1", Pathway = "rn", QuestionTypeKey = "single-choice" };
        var q2 = new Question { Id = "q_snap_02", Stem = "Q2", Pathway = "rn", QuestionTypeKey = "single-choice" };
        context.Questions.AddRange(q1, q2);
        context.ExamQuestions.Add(new ExamQuestion { Id = "eq_1", ExamId = exam.Id, QuestionId = q1.Id, DisplayOrder = 1 });
        context.ExamQuestions.Add(new ExamQuestion { Id = "eq_2", ExamId = exam.Id, QuestionId = q2.Id, DisplayOrder = 2 });
        await context.SaveChangesAsync();

        var controller = CreateController(context, "cand_test_01");

        var result = await controller.StartAttempt(new StartAttemptRequest
        {
            ExamId = exam.Id,
            Pathway = "rn"
        }, CancellationToken.None);

        var createdAtResult = Assert.IsType<CreatedAtActionResult>(result);
        var resJson = JsonSerializer.Serialize(createdAtResult.Value);
        using var resDoc = JsonDocument.Parse(resJson);
        string attemptId = resDoc.RootElement.GetProperty("attemptId").GetString()!;

        // Verify persisted attempt
        var persistedAttempt = await context.ExamAttempts.FindAsync(attemptId);
        Assert.NotNull(persistedAttempt);
        Assert.NotNull(persistedAttempt.MetadataSnapshot);

        using var doc = JsonDocument.Parse(persistedAttempt.MetadataSnapshot);
        var root = doc.RootElement;

        Assert.Equal(1, root.GetProperty("schemaVersion").GetInt32());
        Assert.True(root.TryGetProperty("snapshotCreatedAtUtc", out _));

        // Examination envelope
        var examProp = root.GetProperty("examination");
        Assert.Equal(examFam.Id, examProp.GetProperty("id").GetString());
        Assert.Equal("RN-EX-000042", examProp.GetProperty("code").GetString());
        Assert.Equal("rn", examProp.GetProperty("pathway").GetString());
        Assert.Equal("NCLEX-RN Practice Mock", examProp.GetProperty("title").GetString());

        // Revision envelope
        var revProp = root.GetProperty("revision");
        Assert.Equal(exam.Id, revProp.GetProperty("id").GetString());
        Assert.Equal(1, revProp.GetProperty("revisionNumber").GetInt32());
        Assert.Equal(180, revProp.GetProperty("timeLimitMinutes").GetInt32());
        Assert.Equal(75.0m, revProp.GetProperty("passingScorePercent").GetDecimal());

        // Relational question membership preserved
        var members = await context.ExamAttemptQuestions
            .Where(eaq => eaq.ExamAttemptId == attemptId)
            .OrderBy(eaq => eaq.DisplayOrder)
            .ToListAsync();
        Assert.Equal(2, members.Count);
        Assert.Equal(q1.Id, members[0].QuestionId);
        Assert.Equal(q2.Id, members[1].QuestionId);
    }

    [Fact]
    public async Task StartAttempt_RejectsNonPublishedExams()
    {
        using var context = CreateInMemoryContext(nameof(StartAttempt_RejectsNonPublishedExams));

        var examFam = new Examination { Id = "fam_draft", Code = "RN-EX-000099", Pathway = "rn", Title = "Draft Fam", CreatedBy = "mgr_001" };
        context.Examinations.Add(examFam);

        var draftExam = new Exam
        {
            Id = "exam_in_draft",
            ExaminationId = examFam.Id,
            RevisionNumber = 1,
            LifecycleState = ExamLifecycleState.Draft,
            IsPublished = false,
            Title = "Draft Exam",
            Pathway = "rn",
            CreatedBy = "mgr_001"
        };
        context.Exams.Add(draftExam);
        await context.SaveChangesAsync();

        var controller = CreateController(context, "cand_001");

        var result = await controller.StartAttempt(new StartAttemptRequest
        {
            ExamId = draftExam.Id
        }, CancellationToken.None);

        var objResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, objResult.StatusCode);
    }

    [Fact]
    public async Task GetAttemptById_ProvidesLegacyFallbackWhenMetadataSnapshotIsNull()
    {
        using var context = CreateInMemoryContext(nameof(GetAttemptById_ProvidesLegacyFallbackWhenMetadataSnapshotIsNull));

        var legacyExam = new Exam
        {
            Id = "legacy_exam_01",
            Title = "Legacy NCLEX Practice",
            Pathway = "rn",
            PassingScorePercent = 75.0m,
            IsPublished = true,
            LifecycleState = ExamLifecycleState.Published
        };
        context.Exams.Add(legacyExam);

        var legacyAttempt = new ExamAttempt
        {
            Id = "att_legacy_001",
            UserId = "cand_legacy_01",
            ExamId = legacyExam.Id,
            Exam = legacyExam,
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow.AddMinutes(-30),
            MetadataSnapshot = null // Legacy attempt without snapshot
        };
        context.ExamAttempts.Add(legacyAttempt);
        await context.SaveChangesAsync();

        var controller = CreateController(context, "cand_legacy_01");

        var result = await controller.GetAttemptById(legacyAttempt.Id, CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(result);

        // Serialize and inspect the returned DTO
        var json = JsonSerializer.Serialize(okResult.Value, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        using var doc = JsonDocument.Parse(json);
        var attemptProp = doc.RootElement.GetProperty("attempt");

        Assert.True(attemptProp.TryGetProperty("metadataSnapshot", out var snapshotProp));
        Assert.Equal("legacy_fallback", snapshotProp.GetProperty("snapshotSource").GetString());
        Assert.Equal(1, snapshotProp.GetProperty("schemaVersion").GetInt32());

        // Zero retroactive writes to database
        var unmutatedDbRecord = await context.ExamAttempts.FindAsync(legacyAttempt.Id);
        Assert.Null(unmutatedDbRecord!.MetadataSnapshot);
    }
}
