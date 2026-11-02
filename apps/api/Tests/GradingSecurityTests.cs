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

        var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);
        var service = new ResponseValidationService(context, resolver);
        var controller = new ExamAttemptsController(context, NullLogger<ExamAttemptsController>.Instance, service)
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
}
