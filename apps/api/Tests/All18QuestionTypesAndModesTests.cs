using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Controllers;
using Preform.Api.Data;
using Preform.Api.Models;
using Preform.Api.Services;
using Preform.Api.Services.Grading;
using Xunit;

namespace Preform.Api.Tests;

public class All18QuestionTypesAndModesTests
{
    private static readonly JsonSerializerOptions CamelCaseJson = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public static IEnumerable<object[]> All54TypeModeCombinations()
    {
        var modes = new[] { "Review", "Exam", "Tutor" };
        foreach (var descriptor in QuestionTypeRegistry.Instance.All)
        {
            foreach (var mode in modes)
            {
                yield return new object[] { descriptor.Key, mode };
            }
        }
    }

    private static AppDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        return new AppDbContext(options);
    }

    private static ExamAttemptsController CreateController(AppDbContext context, string userId)
    {
        var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);
        var validationService = new ResponseValidationService(context, resolver);
        var questionService = new AttemptQuestionService(context);
        var controller = new ExamAttemptsController(
            context,
            NullLogger<ExamAttemptsController>.Instance,
            validationService,
            questionService);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Role, "candidate"),
            new Claim("role", "candidate"),
        };
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")),
            },
        };
        return controller;
    }

    internal static (Question question, SubmitAnswerRequest validRequest, SubmitAnswerRequest wrongRequest) BuildQuestionAndRequests(
        string questionTypeKey,
        string questionId)
    {
        var q = new Question
        {
            Id = questionId,
            Stem = $"Clinical item for {questionTypeKey}",
            Pathway = "rn",
            QuestionTypeKey = questionTypeKey,
            Status = QuestionStatus.Published,
            OverallRationale = $"Authoritative rationale for {questionTypeKey}.",
            Instructions = $"Follow instructions for {questionTypeKey}.",
        };

        // 7 option-based types
        if (questionTypeKey is "single-choice" or "multiple-choice" or "sata" or "checkbox" or "image-based" or "multiple-image" or "true-false")
        {
            bool multi = questionTypeKey is "multiple-choice" or "sata" or "checkbox" or "multiple-image";
            q.Options = new List<QuestionOption>
            {
                new() { Id = $"{questionId}_o0", QuestionId = questionId, OptionKey = "A", Content = "Option A", IsCorrect = true, DisplayOrder = 0 },
                new() { Id = $"{questionId}_o1", QuestionId = questionId, OptionKey = "B", Content = multi ? "Option B" : "Distractor B", IsCorrect = multi, DisplayOrder = 1 },
            };
            if (questionTypeKey != "true-false")
            {
                q.Options.Add(new QuestionOption { Id = $"{questionId}_o2", QuestionId = questionId, OptionKey = "C", Content = "Distractor C", IsCorrect = false, DisplayOrder = 2 });
            }

            var correctIndices = multi ? new List<int> { 0, 1 } : new List<int> { 0 };
            var wrongIndices = questionTypeKey == "true-false" ? new List<int> { 1 } : new List<int> { 2 };

            return (
                q,
                new SubmitAnswerRequest { QuestionId = questionId, SelectedOptionIndices = correctIndices, TimeSpentSeconds = 12 },
                new SubmitAnswerRequest { QuestionId = questionId, SelectedOptionIndices = wrongIndices, TimeSpentSeconds = 12 }
            );
        }

        // 11 structured/NGN types
        (string structuredJson, string validRespJson, string wrongRespJson) = questionTypeKey switch
        {
            "drag-drop" => (
                """{"categories":["Priority","Routine"],"items":[{"id":"dd-1","text":"Epinephrine","targetCategory":"Priority"},{"id":"dd-2","text":"Vitals","targetCategory":"Routine"}]}""",
                """{"assignments":{"dd-1":"Priority","dd-2":"Routine"}}""",
                """{"assignments":{"dd-1":"Routine","dd-2":"Priority"}}"""
            ),
            "ordering" => (
                """{"steps":["Verify","Hygiene","Administer"],"correctOrder":[0,1,2]}""",
                """{"order":[0,1,2]}""",
                """{"order":[2,1,0]}"""
            ),
            "case-study" => (
                """{"scenarioTitle":"Sepsis","cjmmItems":[{"itemNumber":1,"cjmmStep":"Recognize Cues","stem":"Pick","options":["BP 84/50","Temp 37"],"correctAnswers":["BP 84/50"]}]}""",
                """{"answers":{"1":["BP 84/50"]}}""",
                """{"answers":{"1":["Temp 37"]}}"""
            ),
            "essay" => (
                """{"rubricCriteria":["SBAR"],"minWords":3,"maxWords":50}""",
                """{"text":"Client has acute dyspnea requiring immediate assessment."}""",
                """{"text":"Short"}"""
            ),
            "matching" => (
                """{"pairs":[{"id":"m-1","term":"Naloxone","definition":"Opioid antagonist"},{"id":"m-2","term":"Protamine","definition":"Heparin antidote"}]}""",
                """{"matches":{"m-1":"Opioid antagonist","m-2":"Heparin antidote"}}""",
                """{"matches":{"m-1":"Heparin antidote","m-2":"Opioid antagonist"}}"""
            ),
            "fill-blank" => (
                """{"templateText":"Check {{blank_1}} pulse.","blanks":[{"id":"blank_1","acceptedAnswers":["apical"]}],"caseSensitive":false}""",
                """{"blanks":{"blank_1":"apical"}}""",
                """{"blanks":{"blank_1":"radial"}}"""
            ),
            "matrix" => (
                """{"rows":["Hypotension","JVD"],"columns":["Tamponade","Shock"],"correctCells":["0:0","1:0"]}""",
                """{"selectedCells":["0:0","1:0"]}""",
                """{"selectedCells":["0:1"]}"""
            ),
            "numeric" => (
                """{"correctValue":125,"tolerance":0,"unit":"mL/hr"}""",
                """{"value":125}""",
                """{"value":200}"""
            ),
            "tabular" => (
                """{"headers":["Intervention","Indicated","Contraindicated"],"findings":[{"finding":"Monitor ECG","classification":"Indicated"}]}""",
                """{"classifications":{"0":"Indicated"}}""",
                """{"classifications":{"0":"Contraindicated"}}"""
            ),
            "short-answer" => (
                """{"acceptedKeywords":["epinephrine","airway"],"maxCharacters":200}""",
                """{"text":"Administer epinephrine and maintain airway."}""",
                """{"text":"Give oral water only."}"""
            ),
            "dynamic-lab" => (
                """{"interactionMode":"bowtie","correctCondition":"Hyperkalemia","correctActions":["Calcium gluconate"],"correctParameters":["ECG"]}""",
                """{"condition":"Hyperkalemia","actions":["Calcium gluconate"],"parameters":["ECG"]}""",
                """{"condition":"Hypokalemia","actions":[],"parameters":[]}"""
            ),
            _ => throw new ArgumentOutOfRangeException(nameof(questionTypeKey)),
        };

        q.StructuredContentJson = structuredJson;

        using var validDoc = JsonDocument.Parse(validRespJson);
        using var wrongDoc = JsonDocument.Parse(wrongRespJson);

        return (
            q,
            new SubmitAnswerRequest { QuestionId = questionId, StructuredResponse = validDoc.RootElement.Clone(), TimeSpentSeconds = 15 },
            new SubmitAnswerRequest { QuestionId = questionId, StructuredResponse = wrongDoc.RootElement.Clone(), TimeSpentSeconds = 15 }
        );
    }

    [Theory]
    [MemberData(nameof(All54TypeModeCombinations))]
    public async Task All54_QuestionTypesAndModes_EndToEndLifecycle_Succeeds(string questionTypeKey, string mode)
    {
        var dbName = $"54combo_{questionTypeKey}_{mode}_{Guid.NewGuid():N}";
        using var context = CreateInMemoryContext(dbName);

        var userId = "cand_54_" + Guid.NewGuid().ToString("N");
        context.Users.Add(new User
        {
            Id = userId,
            Email = $"{userId}@nursing.edu",
            DisplayName = "54-Combo Learner",
            PasswordHash = "hash",
            Pathway = "rn",
            ActivePlan = "NCLEX-RN Complete",
            IsActive = true,
        });

        var (examType, reviewPolicy, timeLimit) = mode switch
        {
            "Review" => (ExamType.Practice, ExaminationReviewPolicy.Immediate, 0),
            "Exam" => (ExamType.DiagnosticReadiness, ExaminationReviewPolicy.AfterExamSubmission, 60),
            "Tutor" => (ExamType.CAT, ExaminationReviewPolicy.Immediate, 0),
            _ => throw new ArgumentOutOfRangeException(nameof(mode)),
        };

        var exam = new Exam
        {
            Id = $"exam_{questionTypeKey}_{mode}",
            Title = $"{mode} Exam for {questionTypeKey}",
            Pathway = "rn",
            ExamType = examType,
            ReviewPolicy = reviewPolicy,
            TimeLimitMinutes = timeLimit,
            PassingScorePercent = 75m,
            IsPublished = true,
            LifecycleState = ExamLifecycleState.Published,
            ShowRationales = true,
            ShowScoreImmediately = true,
        };
        context.Exams.Add(exam);

        var (question, validReq, _) = BuildQuestionAndRequests(questionTypeKey, $"q_{questionTypeKey}_{mode}");
        context.Questions.Add(question);
        context.ExamQuestions.Add(new ExamQuestion
        {
            Id = $"eq_{questionTypeKey}_{mode}",
            ExamId = exam.Id,
            QuestionId = question.Id,
            DisplayOrder = 1,
        });
        await context.SaveChangesAsync();

        var controller = CreateController(context, userId);

        // 1. Start Attempt
        var startResult = await controller.StartAttempt(new StartAttemptRequest { ExamId = exam.Id, Pathway = "rn" }, CancellationToken.None);
        var createdResult = Assert.IsType<CreatedAtActionResult>(startResult);
        var startJson = JsonSerializer.Serialize(createdResult.Value, CamelCaseJson);
        using var startDoc = JsonDocument.Parse(startJson);
        var attemptId = startDoc.RootElement.GetProperty("attemptId").GetString()!;

        // 2. Deliver InProgress Attempt & verify answer keys are hidden
        var getInProgress = Assert.IsType<OkObjectResult>(await controller.GetAttemptById(attemptId, CancellationToken.None));
        using var inProgDoc = JsonDocument.Parse(JsonSerializer.Serialize(getInProgress.Value, CamelCaseJson));
        var inProgAttempt = inProgDoc.RootElement.GetProperty("attempt");
        var deliveredQ = Assert.Single(inProgAttempt.GetProperty("questions").EnumerateArray().ToList());
        Assert.Equal(questionTypeKey, deliveredQ.GetProperty("questionType").GetString());
        Assert.False(deliveredQ.TryGetProperty("correctAnswerIndices", out _));
        Assert.False(deliveredQ.TryGetProperty("rationale", out _));
        if (deliveredQ.TryGetProperty("structuredContentJson", out var scProp) && scProp.ValueKind == JsonValueKind.String)
        {
            var sc = scProp.GetString()!;
            Assert.DoesNotContain("correctOrder", sc);
            Assert.DoesNotContain("correctAnswers", sc);
            Assert.DoesNotContain("correctCells", sc);
            Assert.DoesNotContain("correctValue", sc);
            Assert.DoesNotContain("acceptedAnswers", sc);
            Assert.DoesNotContain("correctCondition", sc);
        }

        // 3. Submit Response & verify Mode-specific immediate disclosure rules
        var submitRespResult = Assert.IsType<OkObjectResult>(await controller.SubmitResponse(attemptId, validReq, CancellationToken.None));
        using var respDoc = JsonDocument.Parse(JsonSerializer.Serialize(submitRespResult.Value, CamelCaseJson));
        if (questionTypeKey == "essay")
        {
            Assert.True(respDoc.RootElement.GetProperty("pendingManualReview").GetBoolean());
            Assert.True(respDoc.RootElement.GetProperty("isCorrect").ValueKind == JsonValueKind.Null);
            Assert.True(respDoc.RootElement.GetProperty("scoreAwarded").ValueKind == JsonValueKind.Null);
        }
        else if (mode == "Exam")
        {
            Assert.True(respDoc.RootElement.GetProperty("isCorrect").ValueKind == JsonValueKind.Null);
            Assert.True(respDoc.RootElement.GetProperty("scoreAwarded").ValueKind == JsonValueKind.Null);
        }
        else
        {
            Assert.True(respDoc.RootElement.GetProperty("isCorrect").GetBoolean());
            Assert.Equal(1.0m, respDoc.RootElement.GetProperty("scoreAwarded").GetDecimal());
        }

        // 4. Resume InProgress Attempt & verify response persisted
        var resumeResult = Assert.IsType<OkObjectResult>(await controller.GetAttemptById(attemptId, CancellationToken.None));
        using var resumeDoc = JsonDocument.Parse(JsonSerializer.Serialize(resumeResult.Value, CamelCaseJson));
        var persistedResp = Assert.Single(resumeDoc.RootElement.GetProperty("attempt").GetProperty("responses").EnumerateArray().ToList());
        Assert.Equal(question.Id, persistedResp.GetProperty("questionId").GetString());

        // 5. Finalize Attempt & verify scoring + rationale review
        var finalizeResult = Assert.IsType<OkObjectResult>(await controller.SubmitAndCompleteAttempt(attemptId, CancellationToken.None));
        using var finDoc = JsonDocument.Parse(JsonSerializer.Serialize(finalizeResult.Value, CamelCaseJson));
        if (questionTypeKey == "essay")
        {
            Assert.Equal(1, finDoc.RootElement.GetProperty("pendingManualReviewCount").GetInt32());
            Assert.Equal(0.0m, finDoc.RootElement.GetProperty("scorePercent").GetDecimal());
        }
        else
        {
            Assert.Equal(100.0m, finDoc.RootElement.GetProperty("scorePercent").GetDecimal());
            Assert.True(finDoc.RootElement.GetProperty("passed").GetBoolean());
        }

        var reviewResult = Assert.IsType<OkObjectResult>(await controller.GetAttemptById(attemptId, CancellationToken.None));
        using var revDoc = JsonDocument.Parse(JsonSerializer.Serialize(reviewResult.Value, CamelCaseJson));
        var revQ = Assert.Single(revDoc.RootElement.GetProperty("attempt").GetProperty("questions").EnumerateArray().ToList());
        Assert.Equal(question.OverallRationale, revQ.GetProperty("rationale").GetString());
    }

    [Theory]
    [MemberData(nameof(All54TypeModeCombinations))]
    public async Task All54_WrongAnswers_ScoreZeroOrPartial_NeverFullCredit(string questionTypeKey, string mode)
    {
        var dbName = $"54wrong_{questionTypeKey}_{mode}_{Guid.NewGuid():N}";
        using var context = CreateInMemoryContext(dbName);

        var userId = "cand_wrong_" + Guid.NewGuid().ToString("N");
        context.Users.Add(new User
        {
            Id = userId,
            Email = $"{userId}@nursing.edu",
            DisplayName = "Wrong Answer Learner",
            PasswordHash = "hash",
            Pathway = "rn",
            IsActive = true,
        });

        var exam = new Exam
        {
            Id = $"exam_w_{questionTypeKey}_{mode}",
            Title = "Wrong Answer Test",
            Pathway = "rn",
            ExamType = mode == "Exam" ? ExamType.DiagnosticReadiness : ExamType.Practice,
            ReviewPolicy = mode == "Exam" ? ExaminationReviewPolicy.AfterExamSubmission : ExaminationReviewPolicy.Immediate,
            IsPublished = true,
            LifecycleState = ExamLifecycleState.Published,
        };
        context.Exams.Add(exam);

        var (question, _, wrongReq) = BuildQuestionAndRequests(questionTypeKey, $"qw_{questionTypeKey}_{mode}");
        context.Questions.Add(question);
        context.ExamQuestions.Add(new ExamQuestion { Id = $"eqw_{questionTypeKey}_{mode}", ExamId = exam.Id, QuestionId = question.Id, DisplayOrder = 1 });
        await context.SaveChangesAsync();

        var controller = CreateController(context, userId);
        var startResult = Assert.IsType<CreatedAtActionResult>(await controller.StartAttempt(new StartAttemptRequest { ExamId = exam.Id, Pathway = "rn" }, CancellationToken.None));
        using var startDoc = JsonDocument.Parse(JsonSerializer.Serialize(startResult.Value));
        var attemptId = startDoc.RootElement.GetProperty("attemptId").GetString()!;

        await controller.SubmitResponse(attemptId, wrongReq, CancellationToken.None);
        var finResult = Assert.IsType<OkObjectResult>(await controller.SubmitAndCompleteAttempt(attemptId, CancellationToken.None));
        using var finDoc = JsonDocument.Parse(JsonSerializer.Serialize(finResult.Value));
        Assert.Equal(0.0m, finDoc.RootElement.GetProperty("scorePercent").GetDecimal());
        Assert.False(finDoc.RootElement.GetProperty("passed").GetBoolean());
    }
}

[Collection("PostgreSQL integration tests")]
public class All18QuestionTypesPostgresTests : IClassFixture<PostgresTestFixture>
{
    private readonly PostgresTestFixture _factory;

    public All18QuestionTypesPostgresTests(PostgresTestFixture factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Postgres_All18QuestionTypes_PersistResponsesAndScoresEndToEnd()
    {
        await _factory.InitializePostgresDatabaseAsync();
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var user = new User
        {
            Id = $"usr_18_{suffix}",
            Email = $"all18_{suffix}@nursing.edu",
            DisplayName = "All 18 PG Learner",
            PasswordHash = "hash",
            Pathway = "rn",
            ActivePlan = "NCLEX-RN Complete",
            IsActive = true,
        };
        context.Users.Add(user);

        var exam = new Exam
        {
            Id = $"exam_18_{suffix}",
            Title = "All 18 Question Types PG Verification",
            Pathway = "rn",
            ExamType = ExamType.DiagnosticReadiness,
            ReviewPolicy = ExaminationReviewPolicy.AfterExamSubmission,
            IsPublished = true,
            LifecycleState = ExamLifecycleState.Published,
            ShowRationales = true,
        };
        context.Exams.Add(exam);

        var requests = new List<SubmitAnswerRequest>();
        int order = 1;
        foreach (var descriptor in QuestionTypeRegistry.Instance.All)
        {
            var (q, validReq, _) = All18QuestionTypesAndModesTests.BuildQuestionAndRequests(
                descriptor.Key,
                $"q18_{descriptor.Key}_{suffix}");
            context.Questions.Add(q);
            context.ExamQuestions.Add(new ExamQuestion
            {
                Id = $"eq18_{descriptor.Key}_{suffix}",
                ExamId = exam.Id,
                QuestionId = q.Id,
                DisplayOrder = order++,
            });
            requests.Add(validReq);
        }
        await context.SaveChangesAsync();

        var resolver = scope.ServiceProvider.GetRequiredService<IQuestionGraderResolver>();
        var validationService = scope.ServiceProvider.GetRequiredService<IResponseValidationService>();
        var questionService = scope.ServiceProvider.GetRequiredService<IAttemptQuestionService>();
        var controller = new ExamAttemptsController(
            context,
            NullLogger<ExamAttemptsController>.Instance,
            validationService,
            questionService);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id),
                    new Claim(ClaimTypes.Role, "candidate"),
                    new Claim("role", "candidate"),
                }, "TestAuth")),
            },
        };

        var startRes = Assert.IsType<CreatedAtActionResult>(
            await controller.StartAttempt(new StartAttemptRequest { ExamId = exam.Id, Pathway = "rn" }, CancellationToken.None));
        using var startDoc = JsonDocument.Parse(JsonSerializer.Serialize(startRes.Value));
        var attemptId = startDoc.RootElement.GetProperty("attemptId").GetString()!;

        foreach (var req in requests)
        {
            var subRes = Assert.IsType<OkObjectResult>(await controller.SubmitResponse(attemptId, req, CancellationToken.None));
            using var subDoc = JsonDocument.Parse(JsonSerializer.Serialize(subRes.Value));
            // Exam Mode: must NOT disclose isCorrect before submission
            Assert.True(subDoc.RootElement.GetProperty("isCorrect").ValueKind == JsonValueKind.Null);
        }

        var finRes = Assert.IsType<OkObjectResult>(await controller.SubmitAndCompleteAttempt(attemptId, CancellationToken.None));
        using var finDoc = JsonDocument.Parse(JsonSerializer.Serialize(finRes.Value));
        Assert.Equal(100.0m, finDoc.RootElement.GetProperty("scorePercent").GetDecimal());
        Assert.Equal(17, finDoc.RootElement.GetProperty("correctCount").GetInt32());
        Assert.Equal(1, finDoc.RootElement.GetProperty("pendingManualReviewCount").GetInt32());
        Assert.True(finDoc.RootElement.GetProperty("passed").GetBoolean());
    }
}
