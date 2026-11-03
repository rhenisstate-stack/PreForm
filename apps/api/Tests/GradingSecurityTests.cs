using System.Security.Claims;
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

public class GradingSecurityTests
{
    private static AppDbContext CreateInMemoryContext(string databaseName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;
        return new AppDbContext(options);
    }

    private static async Task SeedAttemptAndQuestion(AppDbContext context, string attemptId, string userId, string questionId, int correctOptionIndex)
    {
        var options = new List<QuestionOption>();
        for (int i = 0; i < 4; i++)
        {
            options.Add(new QuestionOption
            {
                Id = $"opt_{questionId}_{i}",
                QuestionId = questionId,
                OptionKey = ((char)('A' + i)).ToString(),
                Content = $"Option {((char)('A' + i))}",
                IsCorrect = i == correctOptionIndex,
                DisplayOrder = i,
            });
        }

        context.Questions.Add(new Question
        {
            Id = questionId,
            Stem = "Security test question",
            QuestionTypeKey = "single-choice",
            Pathway = "rn",
            Status = QuestionStatus.Published,
            Options = options,
        });

        context.ExamAttempts.Add(new ExamAttempt
        {
            Id = attemptId,
            UserId = userId,
            ExamId = "exam-sec-1",
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow,
        });

        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task ClientSuppliedIsCorrectTrue_CannotForceCorrectResult_WhenAnswerIsWrong()
    {
        using var context = CreateInMemoryContext("Sec_Svc_ClientTrue_WrongAnswer");
        var attemptId = "att_sec_svc_ct";
        var questionId = "q_sec_svc_ct";
        await SeedAttemptAndQuestion(context, attemptId, "user_sec_svc", questionId, correctOptionIndex: 2);

        var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);
        var service = new ResponseValidationService(context, resolver);

        // Client submits wrong answer (index 0) but claims IsCorrect=true and ScoreAwarded=100
        var result = await service.ValidateAndGradeAsync(
            attemptId, questionId, new List<int> { 0 }, 30, CancellationToken.None);

        if (!result.Valid) Console.WriteLine($"VALIDATION ERROR: {result.Error}");
        Assert.True(result.Valid, result.Error ?? "No error message");
        Assert.False(result.Grading!.IsCorrect, "Server must not trust client-supplied IsCorrect=true for a wrong answer.");
        Assert.Equal(0, result.Grading.ScoreAwarded);
        Assert.True(result.AutomaticGradingPossible);
    }

    [Fact]
    public async Task ClientSuppliedIsCorrectFalse_CannotForceIncorrectResult_WhenAnswerIsRight()
    {
        using var context = CreateInMemoryContext("Sec_Svc_ClientFalse_RightAnswer");
        var attemptId = "att_sec_svc_cf";
        var questionId = "q_sec_svc_cf";
        await SeedAttemptAndQuestion(context, attemptId, "user_sec_svc", questionId, correctOptionIndex: 0);

        var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);
        var service = new ResponseValidationService(context, resolver);

        // Client submits right answer (index 0) but claims IsCorrect=false and ScoreAwarded=0
        var result = await service.ValidateAndGradeAsync(
            attemptId, questionId, new List<int> { 0 }, 30, CancellationToken.None);

        if (!result.Valid) Console.WriteLine($"VALIDATION ERROR: {result.Error}");
        Assert.True(result.Valid, result.Error ?? "No error message");
        Assert.True(result.Grading!.IsCorrect, "Server must compute IsCorrect=true for the right answer regardless of client claim.");
        Assert.Equal(1, result.Grading.ScoreAwarded);
        Assert.True(result.AutomaticGradingPossible);
    }

    [Fact]
    public async Task SyncAssessmentAttempt_IgnoresClientSuppliedCorrectnessWhenServerAnswerKeyExists()
    {
        using var context = CreateInMemoryContext("Sec_Sync_IgnoresClientCorrectness");
        var attemptId = "att_sec_sync_server_authoritative";
        var questionId = "q_sec_sync_server_authoritative";
        var examId = "exam_sync_rn";

        context.Exams.Add(new Exam
        {
            Id = examId,
            Title = "Sync Verification Exam",
            Pathway = "rn",
            PassingScorePercent = 75m,
            ExamType = ExamType.CAT,
            IsPublished = true,
        });
        context.ExamQuestions.Add(new ExamQuestion { Id = "eq_sync_rn_1", ExamId = examId, QuestionId = questionId, DisplayOrder = 0 });

        context.Questions.Add(new Question
        {
            Id = questionId,
            Stem = "Which intervention is priority?",
            QuestionTypeKey = "single-choice",
            Pathway = "rn",
            Status = QuestionStatus.Published,
            Options = new List<QuestionOption>
            {
                new() { Id = "opt_1", QuestionId = questionId, OptionKey = "A", Content = "Option A", DisplayOrder = 0, IsCorrect = false },
                new() { Id = "opt_2", QuestionId = questionId, OptionKey = "B", Content = "Option B", DisplayOrder = 1, IsCorrect = true },
                new() { Id = "opt_3", QuestionId = questionId, OptionKey = "C", Content = "Option C", DisplayOrder = 2, IsCorrect = false },
                new() { Id = "opt_4", QuestionId = questionId, OptionKey = "D", Content = "Option D", DisplayOrder = 3, IsCorrect = false },
            }
        });

        await context.SaveChangesAsync();

        var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);
        var service = new ResponseValidationService(context, resolver);
        var attemptQuestionService = new AttemptQuestionService(context);
        var controller = new ExamAttemptsController(context, NullLogger<ExamAttemptsController>.Instance, service, attemptQuestionService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, "candidate_sync_secure"),
                        new Claim(ClaimTypes.Role, "candidate")
                    }, "TestAuth"))
                }
            }
        };

        var result = await controller.SyncAssessmentAttempt(new SyncAssessmentAttemptRequest
        {
            Id = attemptId,
            Name = "Server-authoritative sync",
            ScorePercent = 99m,
            CorrectCount = 1,
            TotalQuestions = 1,
            Pathway = "rn",
            Questions = new List<SyncAttemptQuestionItem>
            {
                new()
                {
                    Id = questionId,
                    QuestionNumber = 1,
                    QuestionType = "single_choice",
                    UserAnswerIndex = 0,
                    CorrectAnswerIndex = 1,
                    IsCorrect = true,
                    ScoreAwarded = 1m
                }
            }
        }, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        var persisted = await context.ExamAttempts
            .Include(ea => ea.Responses)
            .SingleAsync(ea => ea.Id == attemptId);

        Assert.Equal(0m, persisted.ScorePercent);
        Assert.False(persisted.Passed);
        Assert.Single(persisted.Responses);
        Assert.False(persisted.Responses.First().IsCorrect);
        Assert.Equal(0m, persisted.Responses.First().ScoreAwarded);
    }

    [Fact]
    public async Task UnsupportedQuestionType_ReturnsInvalidResult()
    {
        using var context = CreateInMemoryContext("Sec_Svc_UnsupportedType");
        var attemptId = "att_sec_svc_unsupp";
        var questionId = "q_sec_svc_unsupp";

        context.Questions.Add(new Question
        {
            Id = questionId,
            Stem = "Essay question",
            QuestionTypeKey = "essay",
            Pathway = "rn",
            Status = QuestionStatus.Published,
        });

        context.ExamAttempts.Add(new ExamAttempt
        {
            Id = attemptId,
            UserId = "user_sec_svc",
            ExamId = "exam-sec-1",
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow,
        });

        await context.SaveChangesAsync();

        var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);
        var service = new ResponseValidationService(context, resolver);

        var result = await service.ValidateAndGradeAsync(
            attemptId, questionId, new List<int> { 0 }, 30, CancellationToken.None);

        Assert.False(result.Valid);
        Assert.NotNull(result.Error);
        Assert.Contains("essay", result.Error);
        Assert.False(result.AutomaticGradingPossible);
    }

    [Fact]
    public async Task UnknownQuestion_ReturnsInvalidResult()
    {
        using var context = CreateInMemoryContext("Sec_Svc_UnknownQuestion");
        var attemptId = "att_sec_svc_unknown_q";

        context.ExamAttempts.Add(new ExamAttempt
        {
            Id = attemptId,
            UserId = "user_sec_svc",
            ExamId = "exam-sec-1",
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow,
        });

        await context.SaveChangesAsync();

        var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);
        var service = new ResponseValidationService(context, resolver);

        var result = await service.ValidateAndGradeAsync(
            attemptId, "nonexistent-question-id", new List<int> { 0 }, 30, CancellationToken.None);

        Assert.False(result.Valid);
        Assert.NotNull(result.Error);
        Assert.Contains("not found", result.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CompletedAttempt_CannotSubmitResponses()
    {
        using var context = CreateInMemoryContext("Sec_Svc_CompletedAttempt");
        var attemptId = "att_sec_svc_completed";
        var questionId = "q_sec_svc_completed";
        await SeedAttemptAndQuestion(context, attemptId, "user_sec_svc", questionId, correctOptionIndex: 0);

        // Mark attempt as completed
        context.ExamAttempts.First(ea => ea.Id == attemptId).Status = AttemptStatus.Completed;
        await context.SaveChangesAsync();

        var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);
        var service = new ResponseValidationService(context, resolver);

        var result = await service.ValidateAndGradeAsync(
            attemptId, questionId, new List<int> { 0 }, 30, CancellationToken.None);

        Assert.False(result.Valid);
        Assert.NotNull(result.Error);
        Assert.Contains("completed or abandoned", result.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GraderResolver_ReportsSupportedTypesCorrectly()
    {
        var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);

        // Types with automatic grading support
        Assert.True(resolver.IsGradingSupported("single-choice"));
        Assert.True(resolver.IsGradingSupported("true-false"));
        Assert.True(resolver.IsGradingSupported("multiple-choice"));
        Assert.True(resolver.IsGradingSupported("sata"));
        Assert.True(resolver.IsGradingSupported("checkbox"));
        Assert.True(resolver.IsGradingSupported("image-based"));
        Assert.True(resolver.IsGradingSupported("multiple-image"));

        // Types without automatic grading support in P2
        Assert.False(resolver.IsGradingSupported("essay"));
        Assert.False(resolver.IsGradingSupported("drag-drop"));
        Assert.False(resolver.IsGradingSupported("ordering"));
        Assert.False(resolver.IsGradingSupported("case-study"));
        Assert.False(resolver.IsGradingSupported("matching"));
        Assert.False(resolver.IsGradingSupported("fill-blank"));
        Assert.False(resolver.IsGradingSupported("matrix"));
        Assert.False(resolver.IsGradingSupported("numeric"));
        Assert.False(resolver.IsGradingSupported("tabular"));
        Assert.False(resolver.IsGradingSupported("short-answer"));
        Assert.False(resolver.IsGradingSupported("dynamic-lab"));

        // Unknown type
        Assert.False(resolver.IsGradingSupported("nonexistent-type"));
        Assert.Null(resolver.Resolve("nonexistent-type"));
    }

    [Fact]
    public async Task GraderResolver_ReturnsCorrectGraderForSupportedType()
    {
        var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);
        var grader = resolver.Resolve("single-choice");

        Assert.NotNull(grader);
        Assert.Equal("single-choice", grader.QuestionTypeKey);
        Assert.True(grader.SupportsAutomaticGrading);
    }

    // ── Gate C — C1: explicit missing-answer-key / ungraded handling ──────────

    private static async Task<(AppDbContext context, ExamAttemptsController controller)> CreateControllerFixtureAsync(
        string databaseName)
    {
        var context = CreateInMemoryContext(databaseName);
        var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);
        var service = new ResponseValidationService(context, resolver);
        var attemptQuestionService = new AttemptQuestionService(context);
        var controller = new ExamAttemptsController(
            context, NullLogger<ExamAttemptsController>.Instance, service, attemptQuestionService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, "candidate_c1"),
                        new Claim(ClaimTypes.Role, "candidate")
                    }, "TestAuth"))
                }
            }
        };
        return (context, controller);
    }

    private static async Task<Question> SeedExamQuestionAsync(
        AppDbContext context,
        string examId,
        string questionId,
        string questionTypeKey,
        int correctOptionIndex,
        int optionCount = 4)
    {
        // Idempotent per exam: several questions may share one exam.
        var exam = await context.Exams.FirstOrDefaultAsync(e => e.Id == examId);
        if (exam == null)
        {
            exam = new Exam
            {
                Id = examId,
                Title = "Exam " + examId,
                Pathway = "rn",
                ExamType = ExamType.CAT,
                PassingScorePercent = 75m,
                IsPublished = true,
            };
            context.Exams.Add(exam);
        }

        context.ExamQuestions.Add(new ExamQuestion
        {
            Id = "eq_" + questionId,
            ExamId = examId,
            QuestionId = questionId,
            DisplayOrder = 0,
        });

        var question = new Question
        {
            Id = questionId,
            Stem = "C1 question " + questionId,
            QuestionTypeKey = questionTypeKey,
            Pathway = "rn",
            Status = QuestionStatus.Published,
            Options = new List<QuestionOption>(),
        };

        for (var i = 0; i < optionCount; i++)
        {
            question.Options.Add(new QuestionOption
            {
                Id = $"opt_{questionId}_{i}",
                QuestionId = questionId,
                OptionKey = ((char)('A' + i)).ToString(),
                Content = $"Option {((char)('A' + i))}",
                DisplayOrder = i,
                IsCorrect = i == correctOptionIndex,
            });
        }

        context.Questions.Add(question);
        await context.SaveChangesAsync();
        return question;
    }

    private static async Task<ExamAttempt> SeedActiveAttemptAsync(
        AppDbContext context,
        string attemptId,
        string examId,
        ResponseGradingState? seedingState = null,
        string? seedQuestionId = null,
        int correctOptionIndex = 0)
    {
        var attempt = new ExamAttempt
        {
            Id = attemptId,
            UserId = "candidate_c1",
            ExamId = examId,
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow,
        };
        context.ExamAttempts.Add(attempt);

        if (seedQuestionId != null && seedingState != null)
        {
            context.AttemptResponses.Add(new AttemptResponse
            {
                Id = "resp_seed_" + attemptId,
                ExamAttemptId = attemptId,
                QuestionId = seedQuestionId,
                SelectedOptionsJson = "[0]",
                IsCorrect = false,
                ScoreAwarded = 0m,
                GradingState = seedingState.Value,
                TimeSpentSeconds = 30,
                AnsweredAt = DateTime.UtcNow,
            });
        }

        await context.SaveChangesAsync();
        return attempt;
    }

    [Fact]
    public async Task MissingAnswerKey_IsExplicitUngraded_NotAnIncorrectAnswer()
    {
        using var context = CreateInMemoryContext("Sec_MissingAnswerKey_Ungraded");
        var questionId = "q_no_answer_key";

        // Question with options but NO option marked correct (answer key missing).
        var question = new Question
        {
            Id = questionId,
            Stem = "Unkeyed question",
            QuestionTypeKey = "single-choice",
            Pathway = "rn",
            Status = QuestionStatus.Published,
            Options = new List<QuestionOption>
            {
                new() { Id = "opt_nk_0", QuestionId = questionId, OptionKey = "A", Content = "A", DisplayOrder = 0, IsCorrect = false },
                new() { Id = "opt_nk_1", QuestionId = questionId, OptionKey = "B", Content = "B", DisplayOrder = 1, IsCorrect = false },
                new() { Id = "opt_nk_2", QuestionId = questionId, OptionKey = "C", Content = "C", DisplayOrder = 2, IsCorrect = false },
                new() { Id = "opt_nk_3", QuestionId = questionId, OptionKey = "D", Content = "D", DisplayOrder = 3, IsCorrect = false },
            }
        };
        var examId = "exam_missing_key";
        context.Exams.Add(new Exam { Id = examId, Title = "E", Pathway = "rn", PassingScorePercent = 75m });
        context.ExamQuestions.Add(new ExamQuestion { Id = "eq_nk", ExamId = examId, QuestionId = questionId, DisplayOrder = 0 });
        context.Questions.Add(question);
        context.ExamAttempts.Add(new ExamAttempt
        {
            Id = "att_missing_key",
            UserId = "candidate_c1",
            ExamId = examId,
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow,
        });
        await context.SaveChangesAsync();

        var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);
        var service = new ResponseValidationService(context, resolver);

        var result = await service.ValidateAndGradeAsync(
            "att_missing_key", questionId, new List<int> { 0 }, 30, CancellationToken.None);

        // The missing key must NOT be converted into an incorrect answer.
        Assert.False(result.Valid);
        Assert.True(result.Ungraded, "Missing answer key must be reported as an explicit ungraded outcome.");
        Assert.NotNull(result.Error);
        Assert.DoesNotContain("incorrect", result.Error!, StringComparison.OrdinalIgnoreCase);
        Assert.Null(result.Grading);
    }

    [Fact]
    public async Task EmptyOptions_AreExplicitUngraded()
    {
        using var context = CreateInMemoryContext("Sec_EmptyOptions_Ungraded");
        var questionId = "q_no_options";
        var examId = "exam_no_options";
        context.Exams.Add(new Exam { Id = examId, Title = "E", Pathway = "rn", PassingScorePercent = 75m });
        context.ExamQuestions.Add(new ExamQuestion { Id = "eq_no_options", ExamId = examId, QuestionId = questionId, DisplayOrder = 0 });
        context.Questions.Add(new Question
        {
            Id = questionId,
            Stem = "No options",
            QuestionTypeKey = "single-choice",
            Pathway = "rn",
            Status = QuestionStatus.Published,
        });
        context.ExamAttempts.Add(new ExamAttempt
        {
            Id = "att_no_options",
            UserId = "candidate_c1",
            ExamId = examId,
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow,
        });
        await context.SaveChangesAsync();

        var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);
        var service = new ResponseValidationService(context, resolver);

        var result = await service.ValidateAndGradeAsync(
            "att_no_options", questionId, new List<int> { 0 }, 30, CancellationToken.None);

        Assert.False(result.Valid);
        Assert.True(result.Ungraded, "Empty option set equals missing grading data, not an incorrect answer.");
        Assert.Contains("options", result.Error!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task DirectSubmission_MissingAnswerKey_Returns409Conflict_AndPersistsNoResponse()
    {
        var (context, controller) = await CreateControllerFixtureAsync("Sec_Direct_MissingKey_409");
        var questionId = "q_direct_missing_key";
        await SeedExamQuestionAsync(context, "exam_direct_missing_key", questionId, "single-choice", correctOptionIndex: 0);
        // Overwrite the seeded key so the question has options but no correct one.
        foreach (var option in context.QuestionOptions.Where(o => o.QuestionId == questionId))
        {
            option.IsCorrect = false;
        }
        await context.SaveChangesAsync();
        await SeedActiveAttemptAsync(context, "att_direct_missing_key", "exam_direct_missing_key");

        var result = await controller.SubmitResponse("att_direct_missing_key", new SubmitAnswerRequest
        {
            QuestionId = questionId,
            SelectedOptionIndices = new List<int> { 0 },
            IsCorrect = true,
            ScoreAwarded = 100m,
            TimeSpentSeconds = 42,
        }, CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status409Conflict, objectResult.StatusCode);
        Assert.True(objectResult.Value!.GetType().GetProperty("ungradable")!.GetValue(objectResult.Value) is true);

        var persisted = await context.AttemptResponses
            .Where(r => r.ExamAttemptId == "att_direct_missing_key")
            .ToListAsync();
        Assert.Empty(persisted);
        Assert.Equal(0m, (await context.ExamAttempts.SingleAsync(a => a.Id == "att_direct_missing_key")).ScorePercent);
    }

    [Fact]
    public async Task DirectSubmission_OutOfRangeOptionIndex_IsInvalid_409()
    {
        // Covers both: shared logic relies on the validation service reporting it.
        using (var context = CreateInMemoryContext("Sec_Direct_OutOfRange_Service"))
        {
            await SeedAttemptAndQuestion(context, "att_oor", "candidate_c1", "q_oor", correctOptionIndex: 0);
            var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);
            var service = new ResponseValidationService(context, resolver);

            var result = await service.ValidateAndGradeAsync(
                "att_oor", "q_oor", new List<int> { 9 }, 30, CancellationToken.None);

            Assert.False(result.Valid);
            Assert.False(result.Ungraded, "Out-of-range payload is an invalid response, not missing grading data.");
            Assert.Contains("out of range", result.Error!, StringComparison.OrdinalIgnoreCase);
        }

        var (contextWithController, controller) = await CreateControllerFixtureAsync("Sec_Direct_OutOfRange_400");
        await SeedExamQuestionAsync(contextWithController, "exam_oor", "q_oor_ctrl", "single-choice", correctOptionIndex: 0);
        await SeedActiveAttemptAsync(contextWithController, "att_oor_ctrl", "exam_oor");

        var controllerResult = await controller.SubmitResponse("att_oor_ctrl", new SubmitAnswerRequest
        {
            QuestionId = "q_oor_ctrl",
            SelectedOptionIndices = new List<int> { 99 },
            TimeSpentSeconds = 10,
        }, CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(controllerResult);
        Assert.Equal(StatusCodes.Status400BadRequest, objectResult.StatusCode);
        Assert.Empty(await contextWithController.AttemptResponses.ToListAsync());
    }

    [Fact]
    public async Task Sync_MissingAnswerKey_PersistsExplicitUngraded_AndBlocksFinalization()
    {
        var (context, controller) = await CreateControllerFixtureAsync("Sec_Sync_MissingKey_Ungraded");
        var questionId = "q_sync_missing_key";
        await SeedExamQuestionAsync(context, "exam_sync_missing_key", questionId, "single-choice", correctOptionIndex: 0);
        foreach (var option in context.QuestionOptions.Where(o => o.QuestionId == questionId))
        {
            option.IsCorrect = false; // answer key missing
        }
        await context.SaveChangesAsync();

        var result = await controller.SyncAssessmentAttempt(new SyncAssessmentAttemptRequest
        {
            Id = "att_sync_ungraded",
            Name = "Recovery attempt",
            ScorePercent = 100m, // forged — must be ignored
            CorrectCount = 99,
            TotalQuestions = 999,
            Pathway = "rn",
            DurationMinutes = 12,
            Questions = new List<SyncAttemptQuestionItem>
            {
                new()
                {
                    Id = questionId,
                    QuestionNumber = 1,
                    UserAnswerIndex = 1,
                    IsCorrect = true, // forged — must be ignored
                    ScoreAwarded = 999m, // forged — must be ignored
                }
            }
        }, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);

        var attempt = await context.ExamAttempts
            .Include(ea => ea.Responses)
            .SingleAsync(ea => ea.Id == "att_sync_ungraded");

        // Explicit ungraded state, not a misleading incorrect answer.
        var response = Assert.Single(attempt.Responses);
        Assert.Equal(ResponseGradingState.Ungraded, response.GradingState);
        Assert.Equal(0m, response.ScoreAwarded);
        Assert.False(response.IsCorrect);

        // Finalization is blocked: the attempt must not present an authoritative result.
        Assert.Equal(AttemptStatus.InProgress, attempt.Status);
        Assert.Null(attempt.CompletedAt);

        // Attempt question set recorded even for ungradable questions.
        var membership = await context.ExamAttemptQuestions
            .Where(eaq => eaq.ExamAttemptId == attempt.Id)
            .Select(eaq => eaq.QuestionId)
            .ToListAsync();
        Assert.Equal(new[] { questionId }, membership);

        // Final submission is refused with 409 while grading data is missing.
        var submitResult = await controller.SubmitAndCompleteAttempt(attempt.Id, CancellationToken.None);
        var conflict = Assert.IsType<ObjectResult>(submitResult);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
    }

    [Fact]
    public async Task RetryingSync_AfterAnswerKeyRepaired_GradesPreviouslyUngradedResponse()
    {
        var (context, controller) = await CreateControllerFixtureAsync("Sec_Sync_Regrade_AfterRepaired");
        var questionId = "q_regrade_target";
        await SeedExamQuestionAsync(context, "exam_regrade", questionId, "single-choice", correctOptionIndex: 0);
        foreach (var option in context.QuestionOptions.Where(o => o.QuestionId == questionId))
        {
            option.IsCorrect = false; // answer key missing on first synchronization
        }
        await context.SaveChangesAsync();

        var first = await controller.SyncAssessmentAttempt(new SyncAssessmentAttemptRequest
        {
            Id = "att_regrade",
            Pathway = "rn",
            Questions = new List<SyncAttemptQuestionItem>
            {
                new() { Id = questionId, QuestionNumber = 1, UserAnswerIndex = 0 }
            }
        }, CancellationToken.None);

        Assert.IsType<OkObjectResult>(first);
        var attemptBefore = await context.ExamAttempts.Include(ea => ea.Responses).SingleAsync(ea => ea.Id == "att_regrade");
        Assert.Equal(AttemptStatus.InProgress, attemptBefore.Status);
        Assert.Equal(ResponseGradingState.Ungraded, Assert.Single(attemptBefore.Responses).GradingState);

        // Repair: authoritative key becomes available (answer is index 0).
        foreach (var option in context.QuestionOptions.Where(o => o.QuestionId == questionId && o.DisplayOrder == 0))
        {
            option.IsCorrect = true;
        }
        await context.SaveChangesAsync();

        // Retry the same synchronization — must re-grade, never duplicate.
        var second = await controller.SyncAssessmentAttempt(new SyncAssessmentAttemptRequest
        {
            Id = "att_regrade",
            Pathway = "rn",
            Questions = new List<SyncAttemptQuestionItem>
            {
                new() { Id = questionId, QuestionNumber = 1, UserAnswerIndex = 0 }
            }
        }, CancellationToken.None);

        var attemptAfter = await context.ExamAttempts.Include(ea => ea.Responses).SingleAsync(ea => ea.Id == "att_regrade");
        var attemptResponse = Assert.Single(attemptAfter.Responses);
        Assert.Equal(ResponseGradingState.Graded, attemptResponse.GradingState);
        Assert.True(attemptResponse.IsCorrect);
        Assert.Equal(100.0m, attemptAfter.ScorePercent);
        Assert.True(attemptAfter.Passed);
        Assert.Equal(AttemptStatus.Completed, attemptAfter.Status);

        // A completed attempt is never reopened or overwritten by retry.
        var third = await controller.SyncAssessmentAttempt(new SyncAssessmentAttemptRequest
        {
            Id = "att_regrade",
            Pathway = "rn",
            Questions = new List<SyncAttemptQuestionItem>
            {
                new() { Id = questionId, QuestionNumber = 1, UserAnswerIndex = 3 }
            }
        }, CancellationToken.None);

        var attemptFinal = await context.ExamAttempts.Include(ea => ea.Responses).SingleAsync(ea => ea.Id == "att_regrade");
        Assert.Single(attemptFinal.Responses);
        Assert.Equal(AttemptStatus.Completed, attemptFinal.Status);
        Assert.Equal(100.0m, attemptFinal.ScorePercent);
    }

    [Fact]
    public async Task MixedGradedAndUngraded_Submission_IsBlocked()
    {
        var (context, controller) = await CreateControllerFixtureAsync("Sec_Finalize_MixedBlocked");
        var gradedQuestionId = "q_mixed_graded";
        var ungradedQuestionId = "q_mixed_ungraded";
        await SeedExamQuestionAsync(context, "exam_mixed", gradedQuestionId, "single-choice", correctOptionIndex: 0);
        await SeedExamQuestionAsync(context, "exam_mixed", ungradedQuestionId, "single-choice", correctOptionIndex: 0);
        await SeedActiveAttemptAsync(context, "att_mixed", "exam_mixed");

        var membershipQuestions = new[] { gradedQuestionId, ungradedQuestionId };
        var attemptQuestionService = new AttemptQuestionService(context);
        await attemptQuestionService.RecordQuestionMembershipAsync("att_mixed", membershipQuestions, DateTime.UtcNow);

        // Add one graded response for the graded question.
        context.AttemptResponses.Add(new AttemptResponse
        {
            Id = "resp_mixed_graded",
            ExamAttemptId = "att_mixed",
            QuestionId = gradedQuestionId,
            SelectedOptionsJson = "[0]",
            IsCorrect = true,
            ScoreAwarded = 1m,
            GradingState = ResponseGradingState.Graded,
            TimeSpentSeconds = 12,
            AnsweredAt = DateTime.UtcNow,
        });
        // Add one ungraded response (missing key).
        context.AttemptResponses.Add(new AttemptResponse
        {
            Id = "resp_mixed_ungraded",
            ExamAttemptId = "att_mixed",
            QuestionId = ungradedQuestionId,
            SelectedOptionsJson = "[1]",
            IsCorrect = false,
            ScoreAwarded = 0m,
            GradingState = ResponseGradingState.Ungraded,
            TimeSpentSeconds = 12,
            AnsweredAt = DateTime.UtcNow,
        });
        await context.SaveChangesAsync();

        var result = await controller.SubmitAndCompleteAttempt("att_mixed", CancellationToken.None);

        var conflict = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);

        var attempt = await context.ExamAttempts.SingleAsync(a => a.Id == "att_mixed");
        Assert.Equal(AttemptStatus.InProgress, attempt.Status);
        Assert.Null(attempt.CompletedAt);
        // No authoritative percentage over a partially graded answer set.
        Assert.Equal(0m, attempt.ScorePercent);
    }
}
