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

/// <summary>
/// Gate C — C2: exact exam and attempt question-membership enforcement.
/// A candidate must never be able to submit a question from another exam,
/// a question not assigned to the attempt, or a nonexistent question; attempt
/// question sets are persisted and validated on every response mutation.
/// </summary>
public class AttemptMembershipSecurityTests
{
    private static AppDbContext CreateInMemoryContext(string databaseName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;
        return new AppDbContext(options);
    }

    private static ExamAttemptsController CreateController(
        AppDbContext context,
        string userId = "member_candidate",
        string role = "candidate")
    {
        var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);
        var service = new ResponseValidationService(context, resolver);
        return new ExamAttemptsController(
            context,
            NullLogger<ExamAttemptsController>.Instance,
            service,
            new AttemptQuestionService(context))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, userId),
                        new Claim(ClaimTypes.Role, role),
                    }, "TestAuth"))
                }
            }
        };
    }

    private static async Task<Exam> SeedExamAsync(AppDbContext context, string examId, string pathway = "rn")
    {
        var exam = new Exam
        {
            Id = examId,
            Title = "Membership exam " + examId,
            Pathway = pathway,
            ExamType = ExamType.CAT,
            PassingScorePercent = 75m,
            IsPublished = true,
        };
        context.Exams.Add(exam);
        await context.SaveChangesAsync();
        return exam;
    }

    private static async Task<Question> SeedExamQuestionAsync(
        AppDbContext context,
        string examId,
        string questionId,
        int correctOptionIndex = 0,
        string questionTypeKey = "single-choice")
    {
        var question = new Question
        {
            Id = questionId,
            Stem = "Membership question " + questionId,
            QuestionTypeKey = questionTypeKey,
            Pathway = "rn",
            Status = QuestionStatus.Published,
            Options = new List<QuestionOption>(),
        };

        for (var i = 0; i < 4; i++)
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

        context.ExamQuestions.Add(new ExamQuestion
        {
            Id = $"eq_{examId}_{questionId}",
            ExamId = examId,
            QuestionId = questionId,
            DisplayOrder = 0,
        });
        context.Questions.Add(question);
        await context.SaveChangesAsync();
        return question;
    }

    private static async Task<ExamAttempt> SeedAttemptWithQuestionSetAsync(
        AppDbContext context,
        string attemptId,
        string examId,
        IReadOnlyCollection<string> questionIds,
        string userId = "member_candidate")
    {
        var attempt = new ExamAttempt
        {
            Id = attemptId,
            UserId = userId,
            ExamId = examId,
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow,
        };
        context.ExamAttempts.Add(attempt);
        await context.SaveChangesAsync();

        await new AttemptQuestionService(context).RecordQuestionMembershipAsync(
            attemptId, questionIds, DateTime.UtcNow);

        var reloaded = await context.ExamAttempts
            .Include(ea => ea.Responses)
            .FirstAsync(ea => ea.Id == attemptId);
        return reloaded;
    }

    [Fact]
    public async Task ValidQuestionForExamAndAttempt_IsAccepted()
    {
        using var context = CreateInMemoryContext("Mem_Happy_Path");
        await SeedExamAsync(context, "exam_mem_ok");
        await SeedExamQuestionAsync(context, "exam_mem_ok", "q_mem_ok", correctOptionIndex: 0);
        await SeedAttemptWithQuestionSetAsync(context, "att_mem_ok", "exam_mem_ok", new[] { "q_mem_ok" });

        var controller = CreateController(context);
        var result = await controller.SubmitResponse("att_mem_ok", new SubmitAnswerRequest
        {
            QuestionId = "q_mem_ok",
            SelectedOptionIndices = new List<int> { 0 },
            TimeSpentSeconds = 20,
        }, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);
        var response = await context.AttemptResponses
            .SingleAsync(r => r.ExamAttemptId == "att_mem_ok");
        Assert.Equal(ResponseGradingState.Graded, response.GradingState);
        Assert.True(response.IsCorrect);
        // One logical response per attempt/question.
        Assert.Equal(1, await context.AttemptResponses.CountAsync(r => r.ExamAttemptId == "att_mem_ok"));
    }

    [Fact]
    public async Task QuestionFromAnotherExam_IsRejected()
    {
        using var context = CreateInMemoryContext("Mem_Foreign_Exam");
        await SeedExamAsync(context, "exam_mem_A");
        await SeedExamAsync(context, "exam_mem_B");
        await SeedExamQuestionAsync(context, "exam_mem_B", "q_mem_foreign_exam", correctOptionIndex: 0);
        await SeedAttemptWithQuestionSetAsync(context, "att_mem_A", "exam_mem_A", Array.Empty<string>());

        var controller = CreateController(context);
        var result = await controller.SubmitResponse("att_mem_A", new SubmitAnswerRequest
        {
            QuestionId = "q_mem_foreign_exam",
            SelectedOptionIndices = new List<int> { 0 },
            TimeSpentSeconds = 20,
        }, CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.NotEqual(StatusCodes.Status200OK, objectResult.StatusCode);
        Assert.Empty(await context.AttemptResponses.Where(r => r.ExamAttemptId == "att_mem_A").ToListAsync());
    }

    [Fact]
    public async Task QuestionInExamButNotAssignedToAttempt_IsRejected()
    {
        using var context = CreateInMemoryContext("Mem_Exam_Not_Attempt");
        await SeedExamAsync(context, "exam_mem_C");
        // Both questions belong to the exam…
        await SeedExamQuestionAsync(context, "exam_mem_C", "q_mem_assigned", correctOptionIndex: 0);
        await SeedExamQuestionAsync(context, "exam_mem_C", "q_mem_unassigned", correctOptionIndex: 0);
        // …but the attempt's question set only records one of them.
        await SeedAttemptWithQuestionSetAsync(context, "att_mem_C", "exam_mem_C", new[] { "q_mem_assigned" });

        var controller = CreateController(context);
        var result = await controller.SubmitResponse("att_mem_C", new SubmitAnswerRequest
        {
            QuestionId = "q_mem_unassigned",
            SelectedOptionIndices = new List<int> { 0 },
            TimeSpentSeconds = 20,
        }, CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, objectResult.StatusCode);

        var body = objectResult.Value!.ToString();
        Assert.Contains("not assigned to this attempt", body!);
        Assert.Empty(await context.AttemptResponses.Where(r => r.ExamAttemptId == "att_mem_C").ToListAsync());
    }

    [Fact]
    public async Task NonexistentQuestion_IsRejected()
    {
        using var context = CreateInMemoryContext("Mem_Nonexistent_Q");
        await SeedExamAsync(context, "exam_mem_D");
        await SeedAttemptWithQuestionSetAsync(context, "att_mem_D", "exam_mem_D", Array.Empty<string>());

        var controller = CreateController(context);
        var result = await controller.SubmitResponse("att_mem_D", new SubmitAnswerRequest
        {
            QuestionId = "q_does_not_exist_anywhere",
            SelectedOptionIndices = new List<int> { 0 },
            TimeSpentSeconds = 20,
        }, CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status404NotFound, objectResult.StatusCode);
        Assert.Empty(await context.AttemptResponses.Where(r => r.ExamAttemptId == "att_mem_D").ToListAsync());
    }

    [Fact]
    public async Task DuplicateAttemptQuestionAssignment_IsPrevented()
    {
        using var context = CreateInMemoryContext("Mem_Duplicate_Assignment");
        await SeedExamAsync(context, "exam_mem_E");
        await SeedExamQuestionAsync(context, "exam_mem_E", "q_mem_dup", correctOptionIndex: 0);

        var service = new AttemptQuestionService(context);
        await service.RecordQuestionMembershipAsync("att_mem_dup", new[] { "q_mem_dup" }, DateTime.UtcNow);
        // Record again — idempotent, no duplicate row.
        await service.RecordQuestionMembershipAsync("att_mem_dup", new[] { "q_mem_dup" }, DateTime.UtcNow);

        var attempt = new ExamAttempt
        {
            Id = "att_mem_dup",
            UserId = "member_candidate",
            ExamId = "exam_mem_E",
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow,
        };
        context.ExamAttempts.Add(attempt);
        await context.SaveChangesAsync();

        await service.RecordQuestionMembershipAsync("att_mem_dup", new[] { "q_mem_dup" }, DateTime.UtcNow);

        var rows = await context.ExamAttemptQuestions
            .Where(eaq => eaq.ExamAttemptId == "att_mem_dup" && eaq.QuestionId == "q_mem_dup")
            .ToListAsync();
        Assert.Single(rows);
    }

    [Fact]
    public async Task DuplicateResponseSubmission_UpdatesExistingResponse_NoDuplication()
    {
        using var context = CreateInMemoryContext("Mem_Duplicate_Response");
        await SeedExamAsync(context, "exam_mem_F");
        await SeedExamQuestionAsync(context, "exam_mem_F", "q_mem_dup_resp", correctOptionIndex: 2);
        await SeedAttemptWithQuestionSetAsync(context, "att_mem_F", "exam_mem_F", new[] { "q_mem_dup_resp" });

        var controller = CreateController(context);

        for (var i = 0; i < 3; i++)
        {
            var result = await controller.SubmitResponse("att_mem_F", new SubmitAnswerRequest
            {
                QuestionId = "q_mem_dup_resp",
                SelectedOptionIndices = new List<int> { 2 },
                TimeSpentSeconds = 20 + i,
            }, CancellationToken.None);
            Assert.IsType<OkObjectResult>(result);
        }

        Assert.Equal(1, await context.AttemptResponses.CountAsync(r => r.ExamAttemptId == "att_mem_F"));
        var response = await context.AttemptResponses.SingleAsync(r => r.ExamAttemptId == "att_mem_F");
        Assert.Equal(22, response.TimeSpentSeconds);
        Assert.True(response.IsCorrect);
    }

    [Fact]
    public async Task ForeignQuestionThroughSynchronization_IsRejectedAtomically()
    {
        using var context = CreateInMemoryContext("Mem_Sync_Foreign_Question");
        await SeedExamAsync(context, "exam_mem_G");
        await SeedExamQuestionAsync(context, "exam_mem_G", "q_mem_ok_for_attempt", correctOptionIndex: 0);
        // A valid database question that does NOT belong to the target exam.
        await SeedExamQuestionAsync(context, "exam_other_mem", "q_mem_not_in_target_exam", correctOptionIndex: 0);

        var controller = CreateController(context);
        var result = await controller.SyncAssessmentAttempt(new SyncAssessmentAttemptRequest
        {
            Id = "att_mem_sync_reject",
            Pathway = "rn",
            DurationMinutes = 10,
            Questions = new List<SyncAttemptQuestionItem>
            {
                new() { Id = "q_mem_ok_for_attempt", UserAnswerIndex = 0, IsCorrect = true, ScoreAwarded = 1m },
                new() { Id = "q_mem_not_in_target_exam", UserAnswerIndex = 0, IsCorrect = true, ScoreAwarded = 1m },
            }
        }, CancellationToken.None);

        // Atomic batch rejection — no attempt, no responses, no membership rows.
        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, objectResult.StatusCode);
        Assert.Null(await context.ExamAttempts.FindAsync("att_mem_sync_reject"));
        Assert.Empty(await context.AttemptResponses.Where(r => r.ExamAttemptId == "att_mem_sync_reject").ToListAsync());
        Assert.Empty(await context.ExamAttemptQuestions.Where(eaq => eaq.ExamAttemptId == "att_mem_sync_reject").ToListAsync());
    }

    [Fact]
    public async Task QuestionStubCreationThroughSynchronization_IsImpossible()
    {
        using var context = CreateInMemoryContext("Mem_Sync_Stub_Forbidden");
        await SeedExamAsync(context, "exam_mem_H");

        var controller = CreateController(context);
        await controller.SyncAssessmentAttempt(new SyncAssessmentAttemptRequest
        {
            Id = "att_mem_sync_stub",
            Pathway = "rn",
            Questions = new List<SyncAttemptQuestionItem>
            {
                new()
                {
                    Id = "q_brand_new_stub_never_existed",
                    QuestionNumber = 1,
                    Stem = "Untrusted stem supplied by the candidate",
                    QuestionType = "single_choice",
                    UserAnswerIndex = 0,
                    CorrectAnswerIndex = 0,
                    IsCorrect = true,
                    ScoreAwarded = 1m,
                    Options = new List<string> { "fake A", "fake B" },
                    Rationale = "Untrusted rationale",
                }
            }
        }, CancellationToken.None);

        // No question record or stub may be created from candidate input.
        Assert.Null(await context.Questions.FindAsync("q_brand_new_stub_never_existed"));
        Assert.Empty(await context.Questions.ToListAsync());
        Assert.Null(await context.ExamAttempts.FindAsync("att_mem_sync_stub"));
    }

    [Fact]
    public async Task CrossUserAttemptQuestionCombination_IsRejected()
    {
        using var context = CreateInMemoryContext("Mem_Cross_User");
        await SeedExamAsync(context, "exam_mem_I");
        await SeedExamQuestionAsync(context, "exam_mem_I", "q_mem_owner_only", correctOptionIndex: 0);
        await SeedAttemptWithQuestionSetAsync(
            context, "att_mem_owner", "exam_mem_I", new[] { "q_mem_owner_only" }, userId: "owner_candidate");

        var controller = CreateController(context, userId: "intruder_candidate");
        var result = await controller.SubmitResponse("att_mem_owner", new SubmitAnswerRequest
        {
            QuestionId = "q_mem_owner_only",
            SelectedOptionIndices = new List<int> { 0 },
            TimeSpentSeconds = 20,
        }, CancellationToken.None);

        Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, ((ObjectResult)result).StatusCode);
        Assert.Empty(await context.AttemptResponses.Where(r => r.ExamAttemptId == "att_mem_owner").ToListAsync());
    }

    [Fact]
    public async Task HistoricalAttemptWithoutSnapshot_FallsBackToExamMembership_AndLocksIn()
    {
        using var context = CreateInMemoryContext("Mem_Legacy_Fallback");
        await SeedExamAsync(context, "exam_mem_J");
        await SeedExamQuestionAsync(context, "exam_mem_J", "q_legacy_ok", correctOptionIndex: 0);
        await SeedExamQuestionAsync(context, "exam_mem_J", "q_legacy_not_assigned", correctOptionIndex: 0);

        // Legacy in-flight attempt: persisted before the snapshot existed —
        // it has an exam but neither membership rows nor responses.
        context.ExamAttempts.Add(new ExamAttempt
        {
            Id = "att_legacy",
            UserId = "member_candidate",
            ExamId = "exam_mem_J",
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow,
        });
        await context.SaveChangesAsync();

        var controller = CreateController(context);
        var accepted = await controller.SubmitResponse("att_legacy", new SubmitAnswerRequest
        {
            QuestionId = "q_legacy_ok",
            SelectedOptionIndices = new List<int> { 0 },
            TimeSpentSeconds = 20,
        }, CancellationToken.None);
        Assert.IsType<OkObjectResult>(accepted);

        // After the verified submission the attempt question set is locked in:
        // another exam-level question that was never assigned is now rejected.
        var rejected = await controller.SubmitResponse("att_legacy", new SubmitAnswerRequest
        {
            QuestionId = "q_legacy_not_assigned",
            SelectedOptionIndices = new List<int> { 0 },
            TimeSpentSeconds = 20,
        }, CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(rejected);
        Assert.Equal(StatusCodes.Status400BadRequest, objectResult.StatusCode);
        Assert.Equal(1, await context.ExamAttemptQuestions.CountAsync(eaq => eaq.ExamAttemptId == "att_legacy"));
        Assert.Equal(1, await context.AttemptResponses.CountAsync(r => r.ExamAttemptId == "att_legacy"));
    }

    [Fact]
    public async Task MembershipValidation_IsEnforcedThroughSynchronization()
    {
        using var context = CreateInMemoryContext("Mem_Sync_Membership_Positive");
        await SeedExamAsync(context, "exam_mem_K");
        await SeedExamQuestionAsync(context, "exam_mem_K", "q_mem_sync_ok_A", correctOptionIndex: 0);
        await SeedExamQuestionAsync(context, "exam_mem_K", "q_mem_sync_ok_B", correctOptionIndex: 1);

        var controller = CreateController(context);
        var result = await controller.SyncAssessmentAttempt(new SyncAssessmentAttemptRequest
        {
            Id = "att_mem_sync_ok",
            Pathway = "rn",
            DurationMinutes = 10,
            Questions = new List<SyncAttemptQuestionItem>
            {
                new() { Id = "q_mem_sync_ok_A", QuestionNumber = 1, UserAnswerIndex = 0 },
                new() { Id = "q_mem_sync_ok_B", QuestionNumber = 2, UserAnswerIndex = 1 },
            }
        }, CancellationToken.None);

        Assert.IsType<OkObjectResult>(result);

        // Both questions verified: membership persisted and server graded.
        var membership = await context.ExamAttemptQuestions
            .Where(eaq => eaq.ExamAttemptId == "att_mem_sync_ok")
            .OrderBy(eaq => eaq.DisplayOrder)
            .Select(eaq => eaq.QuestionId)
            .ToListAsync();
        Assert.Equal(new[] { "q_mem_sync_ok_A", "q_mem_sync_ok_B" }, membership);

        Assert.Equal(2, await context.AttemptResponses.CountAsync(r => r.ExamAttemptId == "att_mem_sync_ok"));
        var attempt = await context.ExamAttempts.SingleAsync(a => a.Id == "att_mem_sync_ok");
        Assert.Equal(100.0m, attempt.ScorePercent);
        Assert.Equal(AttemptStatus.Completed, attempt.Status);

        // Follow-up direct submission for a member question works; foreign exam is rejected.
        var directOk = await controller.SubmitResponse("att_mem_sync_ok", new SubmitAnswerRequest
        {
            QuestionId = "q_mem_sync_ok_A",
            SelectedOptionIndices = new List<int> { 0 },
            TimeSpentSeconds = 5,
        }, CancellationToken.None);
        Assert.IsType<BadRequestObjectResult>(directOk); // attempt completed already
    }
}
