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

public class Phase3AssessmentTests
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

    private static (ExamAttemptsController controller, AssessmentSelectionService selectionService, AppDbContext db) CreateController(string dbName, string userId = "cand_p3_1")
    {
        var db = CreateInMemoryContext(dbName);

        // Seed candidate user
        db.Users.Add(new User
        {
            Id = userId,
            Email = $"{userId}@test.com",
            DisplayName = "Test Candidate",
            Pathway = "rn",
            IsActive = true
        });
        db.SaveChanges();

        var registry = QuestionTypeRegistry.Instance;
        var selectionService = new AssessmentSelectionService(db, registry);
        var resolver = new QuestionGraderResolver(registry);
        var validationService = new ResponseValidationService(db, resolver);
        var attemptQuestionService = new AttemptQuestionService(db);

        var controller = new ExamAttemptsController(
            db,
            NullLogger<ExamAttemptsController>.Instance,
            validationService,
            attemptQuestionService,
            sessionSecurityService: null,
            passwordHasher: null,
            rateLimitingService: null,
            assessmentSelectionService: selectionService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, userId),
                        new Claim(ClaimTypes.Role, "candidate")
                    }, "TestAuth"))
                }
            }
        };

        return (controller, selectionService, db);
    }

    private static Question SeedQuestion(
        AppDbContext db,
        string id,
        string pathway,
        QuestionStatus status,
        string questionTypeKey = "single-choice",
        string? clientNeedId = null,
        int correctOptionIndex = 0)
    {
        var q = new Question
        {
            Id = id,
            Code = $"QN-{id}",
            Pathway = pathway,
            Status = status,
            QuestionTypeKey = questionTypeKey,
            ClientNeedId = clientNeedId,
            Stem = $"Question stem for {id}",
            OverallRationale = $"Clinical rationale explaining {id}",
            Options = new List<QuestionOption>
            {
                new() { Id = $"{id}_opt_0", OptionKey = "A", Content = "Option A", DisplayOrder = 0, IsCorrect = correctOptionIndex == 0 },
                new() { Id = $"{id}_opt_1", OptionKey = "B", Content = "Option B", DisplayOrder = 1, IsCorrect = correctOptionIndex == 1 },
                new() { Id = $"{id}_opt_2", OptionKey = "C", Content = "Option C", DisplayOrder = 2, IsCorrect = correctOptionIndex == 2 },
                new() { Id = $"{id}_opt_3", OptionKey = "D", Content = "Option D", DisplayOrder = 3, IsCorrect = correctOptionIndex == 3 }
            }
        };
        db.Questions.Add(q);
        return q;
    }

    [Fact]
    public async Task AssessmentSelection_OnlySelectsPublishedQuestions()
    {
        var (controller, selectionService, db) = CreateController("P3_Select_PublishedOnly");

        // Seed 1 published, 1 draft, 1 in-review, 1 archived question
        SeedQuestion(db, "q_pub_1", "rn", QuestionStatus.Published);
        SeedQuestion(db, "q_draft_1", "rn", QuestionStatus.Draft);
        SeedQuestion(db, "q_review_1", "rn", QuestionStatus.InReview);
        SeedQuestion(db, "q_archived_1", "rn", QuestionStatus.Archived);
        await db.SaveChangesAsync();

        var result = await selectionService.SelectQuestionsAsync(new AssessmentSelectionRequest
        {
            Pathway = "rn",
            QuestionCount = 1,
            ExamType = ExamType.Practice
        });

        Assert.True(result.Success);
        Assert.Single(result.SelectedQuestions);
        Assert.Equal("q_pub_1", result.SelectedQuestions[0].Question.Id);
    }

    [Fact]
    public async Task AssessmentSelection_ExcludesUnsupportedNGNTypes()
    {
        var (controller, selectionService, db) = CreateController("P3_Select_ExcludeNGN");

        // Seed 1 traditional published question and 2 NGN published questions (drag-drop, case-study)
        SeedQuestion(db, "q_trad_1", "rn", QuestionStatus.Published, "single-choice");
        SeedQuestion(db, "q_ngn_1", "rn", QuestionStatus.Published, "drag-drop");
        SeedQuestion(db, "q_ngn_2", "rn", QuestionStatus.Published, "case-study");
        await db.SaveChangesAsync();

        var result = await selectionService.SelectQuestionsAsync(new AssessmentSelectionRequest
        {
            Pathway = "rn",
            QuestionCount = 1,
            ExamType = ExamType.Practice
        });

        Assert.True(result.Success);
        Assert.Single(result.SelectedQuestions);
        Assert.Equal("q_trad_1", result.SelectedQuestions[0].Question.Id);
    }

    [Fact]
    public async Task AssessmentSelection_EnforcesPathwayFilter()
    {
        var (controller, selectionService, db) = CreateController("P3_Select_Pathway");

        SeedQuestion(db, "q_rn_1", "rn", QuestionStatus.Published);
        SeedQuestion(db, "q_pn_1", "pn", QuestionStatus.Published);
        SeedQuestion(db, "q_both_1", "both", QuestionStatus.Published);
        await db.SaveChangesAsync();

        // Request PN
        var pnResult = await selectionService.SelectQuestionsAsync(new AssessmentSelectionRequest
        {
            Pathway = "pn",
            QuestionCount = 2,
            ExamType = ExamType.Practice
        });

        Assert.True(pnResult.Success);
        Assert.Equal(2, pnResult.SelectedQuestions.Count);
        Assert.All(pnResult.SelectedQuestions, sq => Assert.Contains(sq.Question.Pathway, new[] { "pn", "both" }));
        Assert.DoesNotContain(pnResult.SelectedQuestions, sq => sq.Question.Id == "q_rn_1");
    }

    [Fact]
    public async Task AssessmentSelection_InsufficientQuestions_ReturnsProblemDetails()
    {
        var (controller, selectionService, db) = CreateController("P3_Select_Insufficient");

        SeedQuestion(db, "q_only_1", "rn", QuestionStatus.Published);
        await db.SaveChangesAsync();

        var result = await selectionService.SelectQuestionsAsync(new AssessmentSelectionRequest
        {
            Pathway = "rn",
            QuestionCount = 5,
            ExamType = ExamType.Practice
        });

        Assert.False(result.Success);
        Assert.Equal("INSUFFICIENT_QUESTIONS", result.ErrorCode);
        Assert.Contains("Insufficient published questions", result.ErrorMessage);
    }

    [Fact]
    public async Task AssessmentSelection_DiagnosticReadiness_BalancesAcrossClientNeeds()
    {
        var (controller, selectionService, db) = CreateController("P3_Select_RAT_Balance");

        // Seed 4 distinct client needs with 2 questions each
        for (var cn = 1; cn <= 4; cn++)
        {
            var cnId = $"cn_{cn}";
            db.ClientNeeds.Add(new ClientNeed { Id = cnId, Code = $"CN{cn}", Name = $"Category {cn}" });
            SeedQuestion(db, $"q_cn{cn}_1", "rn", QuestionStatus.Published, clientNeedId: cnId);
            SeedQuestion(db, $"q_cn{cn}_2", "rn", QuestionStatus.Published, clientNeedId: cnId);
        }
        await db.SaveChangesAsync();

        var result = await selectionService.SelectQuestionsAsync(new AssessmentSelectionRequest
        {
            Pathway = "rn",
            QuestionCount = 4,
            ExamType = ExamType.DiagnosticReadiness
        });

        Assert.True(result.Success);
        Assert.Equal(4, result.SelectedQuestions.Count);
        // All 4 distinct client needs represented in balanced selection
        var distinctNeeds = result.SelectedQuestions.Select(sq => sq.Question.ClientNeedId).Distinct().Count();
        Assert.Equal(4, distinctNeeds);
    }

    [Fact]
    public async Task StartAttempt_ConcurrencyGuard_ResumesExistingActiveAttempt()
    {
        var (controller, selectionService, db) = CreateController("P3_Concurrency_Resume");

        for (var i = 1; i <= 5; i++)
        {
            SeedQuestion(db, $"q_conc_{i}", "rn", QuestionStatus.Published);
        }
        await db.SaveChangesAsync();

        // Start initial attempt
        var startResult = await controller.StartAttempt(new StartAttemptRequest
        {
            Pathway = "rn",
            TestType = "practice",
            QuestionCount = 3
        }, CancellationToken.None);

        var okResult = Assert.IsType<CreatedAtActionResult>(startResult);
        var firstAttemptId = okResult.RouteValues?["id"]?.ToString();
        Assert.NotNull(firstAttemptId);

        // Call StartAttempt again for the same exam type without finishing the first
        var secondResult = await controller.StartAttempt(new StartAttemptRequest
        {
            Pathway = "rn",
            TestType = "practice",
            QuestionCount = 3
        }, CancellationToken.None);

        var resumeOk = Assert.IsType<OkObjectResult>(secondResult);
        var resumedAttemptId = resumeOk.Value?.GetType().GetProperty("attemptId")?.GetValue(resumeOk.Value)?.ToString();
        var isResumed = (bool)(resumeOk.Value?.GetType().GetProperty("resumed")?.GetValue(resumeOk.Value) ?? false);

        Assert.True(isResumed);
        Assert.Equal(firstAttemptId, resumedAttemptId);

        // Verify only 1 attempt row was created in database
        Assert.Equal(1, await db.ExamAttempts.CountAsync(ea => ea.UserId == "cand_p3_1"));
    }

    [Fact]
    public async Task StartAttempt_ExpiredAttempt_AutoFinalizesAndAllowsNewAttempt()
    {
        var (controller, selectionService, db) = CreateController("P3_Concurrency_Expired");

        for (var i = 1; i <= 5; i++)
        {
            SeedQuestion(db, $"q_exp_{i}", "rn", QuestionStatus.Published);
        }
        await db.SaveChangesAsync();

        // Pre-create an expired attempt (time limit 60 mins, started 120 mins ago)
        var exam = new Exam
        {
            Id = "exam_rn_practice",
            Title = "NCLEX-RN Practice Examination",
            Pathway = "rn",
            ExamType = ExamType.Practice,
            TimeLimitMinutes = 60,
            IsPublished = true,
            LifecycleState = ExamLifecycleState.Published
        };
        db.Exams.Add(exam);

        var expiredAttempt = new ExamAttempt
        {
            Id = "att_expired_1",
            UserId = "cand_p3_1",
            ExamId = exam.Id,
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow.AddMinutes(-120)
        };
        db.ExamAttempts.Add(expiredAttempt);
        await db.SaveChangesAsync();

        // Start attempt: should auto-finalize expired attempt and start a fresh attempt
        var result = await controller.StartAttempt(new StartAttemptRequest
        {
            Pathway = "rn",
            TestType = "practice",
            QuestionCount = 3
        }, CancellationToken.None);

        var createdResult = Assert.IsType<CreatedAtActionResult>(result);
        var newAttemptId = createdResult.RouteValues?["id"]?.ToString();
        Assert.NotEqual("att_expired_1", newAttemptId);

        // Old attempt must now be Completed
        var oldAttempt = await db.ExamAttempts.SingleAsync(ea => ea.Id == "att_expired_1");
        Assert.Equal(AttemptStatus.Completed, oldAttempt.Status);
    }

    [Fact]
    public async Task StartAttempt_CreatesImmutableQuestionSnapshot()
    {
        var (controller, selectionService, db) = CreateController("P3_Snapshot_Creation");

        SeedQuestion(db, "q_snap_1", "rn", QuestionStatus.Published, correctOptionIndex: 1);
        await db.SaveChangesAsync();

        var result = await controller.StartAttempt(new StartAttemptRequest
        {
            Pathway = "rn",
            TestType = "practice",
            QuestionCount = 1
        }, CancellationToken.None);

        var okResult = Assert.IsType<CreatedAtActionResult>(result);
        var attemptId = okResult.RouteValues?["id"]?.ToString()!;

        var attempt = await db.ExamAttempts.SingleAsync(ea => ea.Id == attemptId);
        Assert.NotNull(attempt.MetadataSnapshot);

        using var doc = JsonDocument.Parse(attempt.MetadataSnapshot);
        var root = doc.RootElement;
        Assert.True(root.TryGetProperty("questions", out var questionsEl));
        Assert.Equal(1, questionsEl.GetArrayLength());

        var qEl = questionsEl[0];
        Assert.Equal("q_snap_1", qEl.GetProperty("id").GetString());
        Assert.Equal("Question stem for q_snap_1", qEl.GetProperty("stem").GetString());
        Assert.Equal("Clinical rationale explaining q_snap_1", qEl.GetProperty("explanation").GetString());
    }

    [Fact]
    public async Task GetAttemptById_InProgress_ProtectsAnswerKeysAndRationales()
    {
        var (controller, selectionService, db) = CreateController("P3_Delivery_Protected");

        SeedQuestion(db, "q_prot_1", "rn", QuestionStatus.Published, correctOptionIndex: 2);
        await db.SaveChangesAsync();

        var startResult = await controller.StartAttempt(new StartAttemptRequest
        {
            Pathway = "rn",
            TestType = "practice",
            QuestionCount = 1
        }, CancellationToken.None);

        var attemptId = ((CreatedAtActionResult)startResult).RouteValues?["id"]?.ToString()!;

        // Candidate retrieves the in-progress attempt
        var getResult = await controller.GetAttemptById(attemptId, CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(getResult);

        var attemptDto = okResult.Value?.GetType().GetProperty("attempt")?.GetValue(okResult.Value) as CandidateAttemptDetailDto;
        Assert.NotNull(attemptDto);
        Assert.Equal("InProgress", attemptDto.Status);
        Assert.Null(attemptDto.ScorePercent);
        Assert.Null(attemptDto.Passed);
        Assert.Null(attemptDto.MetadataSnapshot); // Hidden while InProgress

        Assert.Single(attemptDto.Questions);
        var q = attemptDto.Questions[0];
        Assert.Equal("q_prot_1", q.Id);
        Assert.Equal(4, q.Options.Count);
        // Answer keys and rationales MUST be null during InProgress
        Assert.Null(q.CorrectAnswerIndices);
        Assert.Null(q.Rationale);
    }

    [Fact]
    public async Task GetAttemptById_Completed_DisclosesAnswerKeysAndRationales()
    {
        var (controller, selectionService, db) = CreateController("P3_Delivery_Completed");

        SeedQuestion(db, "q_comp_1", "rn", QuestionStatus.Published, correctOptionIndex: 1);
        await db.SaveChangesAsync();

        var startResult = await controller.StartAttempt(new StartAttemptRequest
        {
            Pathway = "rn",
            TestType = "practice",
            QuestionCount = 1
        }, CancellationToken.None);

        var attemptId = ((CreatedAtActionResult)startResult).RouteValues?["id"]?.ToString()!;

        // Submit answer and finalize
        await controller.SubmitResponse(attemptId, new SubmitAnswerRequest
        {
            QuestionId = "q_comp_1",
            SelectedOptionIndices = new List<int> { 1 },
            TimeSpentSeconds = 30
        }, CancellationToken.None);

        await controller.SubmitAndCompleteAttempt(attemptId, CancellationToken.None);

        // Retrieve completed attempt
        var getResult = await controller.GetAttemptById(attemptId, CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(getResult);
        var attemptDto = (CandidateAttemptDetailDto)okResult.Value!.GetType().GetProperty("attempt")!.GetValue(okResult.Value)!;

        Assert.Equal("Completed", attemptDto.Status);
        Assert.Equal(100.0m, attemptDto.ScorePercent);
        Assert.True(attemptDto.Passed);
        Assert.Equal("Very High", attemptDto.PerformanceTier);

        // Disclosed upon completion
        Assert.Single(attemptDto.Questions);
        var q = attemptDto.Questions[0];
        Assert.NotNull(q.CorrectAnswerIndices);
        Assert.Equal(new[] { 1 }, q.CorrectAnswerIndices);
        Assert.Equal("Clinical rationale explaining q_comp_1", q.Rationale);
    }

    [Fact]
    public async Task SubmitResponse_ExpiredDeadline_Returns410Gone()
    {
        var (controller, selectionService, db) = CreateController("P3_Deadline_Expired");

        var exam = new Exam
        {
            Id = "exam_timed_10m",
            Title = "Timed Exam",
            Pathway = "rn",
            TimeLimitMinutes = 10,
            IsPublished = true,
            LifecycleState = ExamLifecycleState.Published
        };
        db.Exams.Add(exam);

        SeedQuestion(db, "q_dead_1", "rn", QuestionStatus.Published);

        var attempt = new ExamAttempt
        {
            Id = "att_timed_expired",
            UserId = "cand_p3_1",
            ExamId = exam.Id,
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow.AddMinutes(-20) // Started 20 mins ago for 10 min exam
        };
        db.ExamAttempts.Add(attempt);
        await db.SaveChangesAsync();

        var result = await controller.SubmitResponse("att_timed_expired", new SubmitAnswerRequest
        {
            QuestionId = "q_dead_1",
            SelectedOptionIndices = new List<int> { 0 },
            TimeSpentSeconds = 15
        }, CancellationToken.None);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status410Gone, statusResult.StatusCode);

        // Attempt should be marked Completed
        var updated = await db.ExamAttempts.SingleAsync(ea => ea.Id == "att_timed_expired");
        Assert.Equal(AttemptStatus.Completed, updated.Status);
    }

    [Fact]
    public async Task SubmitResponse_InvalidQuestionMembership_Rejects()
    {
        var (controller, selectionService, db) = CreateController("P3_Membership_Reject");

        SeedQuestion(db, "q_mem_valid", "rn", QuestionStatus.Published);
        SeedQuestion(db, "q_mem_alien", "rn", QuestionStatus.Published);
        await db.SaveChangesAsync();

        var startResult = await controller.StartAttempt(new StartAttemptRequest
        {
            Pathway = "rn",
            TestType = "practice",
            QuestionCount = 1
        }, CancellationToken.None);

        var attemptId = ((CreatedAtActionResult)startResult).RouteValues?["id"]?.ToString()!;

        // Attempt to submit an answer for a question not assigned to this attempt
        var result = await controller.SubmitResponse(attemptId, new SubmitAnswerRequest
        {
            QuestionId = "q_mem_alien",
            SelectedOptionIndices = new List<int> { 0 },
            TimeSpentSeconds = 10
        }, CancellationToken.None);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, statusResult.StatusCode);
    }

    [Fact]
    public async Task SubmitAndCompleteAttempt_CalculatesScoreAndPerformanceTiers()
    {
        var (controller, selectionService, db) = CreateController("P3_Scoring_Tiers");

        var q1 = SeedQuestion(db, "q_sc_1", "rn", QuestionStatus.Published, correctOptionIndex: 0);
        var q2 = SeedQuestion(db, "q_sc_2", "rn", QuestionStatus.Published, correctOptionIndex: 1);
        var q3 = SeedQuestion(db, "q_sc_3", "rn", QuestionStatus.Published, correctOptionIndex: 2);
        var q4 = SeedQuestion(db, "q_sc_4", "rn", QuestionStatus.Published, correctOptionIndex: 3);
        await db.SaveChangesAsync();

        var exam = await controller.StartAttempt(new StartAttemptRequest
        {
            Pathway = "rn",
            TestType = "practice",
            QuestionCount = 4
        }, CancellationToken.None);

        var attemptId = ((CreatedAtActionResult)exam).RouteValues?["id"]?.ToString()!;

        // Answer 3 correct out of 4 (75% -> Very High)
        await controller.SubmitResponse(attemptId, new SubmitAnswerRequest { QuestionId = "q_sc_1", SelectedOptionIndices = new List<int> { 0 } }, CancellationToken.None);
        await controller.SubmitResponse(attemptId, new SubmitAnswerRequest { QuestionId = "q_sc_2", SelectedOptionIndices = new List<int> { 1 } }, CancellationToken.None);
        await controller.SubmitResponse(attemptId, new SubmitAnswerRequest { QuestionId = "q_sc_3", SelectedOptionIndices = new List<int> { 2 } }, CancellationToken.None);
        await controller.SubmitResponse(attemptId, new SubmitAnswerRequest { QuestionId = "q_sc_4", SelectedOptionIndices = new List<int> { 0 } }, CancellationToken.None); // incorrect

        var completeResult = await controller.SubmitAndCompleteAttempt(attemptId, CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(completeResult);

        var scorePercent = (decimal)okResult.Value!.GetType().GetProperty("scorePercent")!.GetValue(okResult.Value)!;
        var passed = (bool)okResult.Value!.GetType().GetProperty("passed")!.GetValue(okResult.Value)!;
        var tier = (string)okResult.Value!.GetType().GetProperty("performanceTier")!.GetValue(okResult.Value)!;

        Assert.Equal(75.0m, scorePercent);
        Assert.True(passed);
        Assert.Equal("Very High", tier);
    }

    [Fact]
    public async Task AssessmentsController_Available_ReturnsAssessmentsWithResumptionState()
    {
        var db = CreateInMemoryContext("P3_Assessments_Discovery");
        db.Users.Add(new User { Id = "cand_discovery_1", Email = "disc@test.com", Pathway = "rn", IsActive = true });
        await db.SaveChangesAsync();

        var controller = new AssessmentsController(db, NullLogger<AssessmentsController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, "cand_discovery_1"),
                        new Claim(ClaimTypes.Role, "candidate")
                    }, "TestAuth"))
                }
            }
        };

        var result = await controller.GetAvailableAssessments("rn", CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(result);

        var assessments = okResult.Value?.GetType().GetProperty("assessments")?.GetValue(okResult.Value) as List<AvailableAssessmentDto>;
        Assert.NotNull(assessments);
        Assert.Contains(assessments, a => a.ExamType == "DiagnosticReadiness");
        Assert.Contains(assessments, a => a.ExamType == "Practice");
        Assert.Contains(assessments, a => a.ExamType == "CAT");
    }
}
