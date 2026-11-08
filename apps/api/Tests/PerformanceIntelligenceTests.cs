using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Controllers;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services.Analytics;
using Xunit;

namespace Preform.Api.Tests;

public class PerformanceIntelligenceTests
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

    private static (AppDbContext Db, LearnerAnalyticsService AnalyticsService, LearnerReportingService ReportingService) CreateFixture(string dbName)
    {
        var db = CreateInMemoryContext(dbName);
        var analytics = new LearnerAnalyticsService(db);
        var reporting = new LearnerReportingService(db, analytics);
        return (db, analytics, reporting);
    }

    [Fact]
    public async Task GetOverview_ComputesAuthoritativeAggregates_WithFilters()
    {
        var (db, service, _) = CreateFixture(Guid.NewGuid().ToString());
        var userId = "cand_rn_01";

        db.Users.Add(new User { Id = userId, Email = "cand@test.com", DisplayName = "Candidate RN", Pathway = "rn" });

        var exam1 = new Exam { Id = "ex_rn_1", Title = "RN Practice 1", ExamType = ExamType.Practice, Pathway = "rn" };
        var exam2 = new Exam { Id = "ex_rn_2", Title = "RN RAT 1", ExamType = ExamType.DiagnosticReadiness, Pathway = "rn" };
        db.Exams.AddRange(exam1, exam2);

        var started = DateTime.UtcNow.AddDays(-5);
        var completed1 = started.AddMinutes(40);
        var completed2 = started.AddDays(1).AddMinutes(50);

        // 2 Completed attempts, 1 InProgress, 1 Abandoned
        db.ExamAttempts.AddRange(
            new ExamAttempt { Id = "att_1", UserId = userId, ExamId = "ex_rn_1", Status = AttemptStatus.Completed, ScorePercent = 80m, Passed = true, StartedAt = started, CompletedAt = completed1 },
            new ExamAttempt { Id = "att_2", UserId = userId, ExamId = "ex_rn_2", Status = AttemptStatus.Completed, ScorePercent = 60m, Passed = false, StartedAt = started.AddDays(1), CompletedAt = completed2 },
            new ExamAttempt { Id = "att_3", UserId = userId, ExamId = "ex_rn_1", Status = AttemptStatus.InProgress, ScorePercent = 0m, Passed = false, StartedAt = DateTime.UtcNow },
            new ExamAttempt { Id = "att_4", UserId = userId, ExamId = "ex_rn_1", Status = AttemptStatus.Abandoned, ScorePercent = 0m, Passed = false, StartedAt = started.AddDays(2) }
        );

        // Seed 6 questions and responses
        for (int i = 0; i < 6; i++)
        {
            db.Questions.Add(new Question { Id = $"q_{i}", Pathway = "rn", Stem = $"Question {i}" });
            db.AttemptResponses.Add(new AttemptResponse
            {
                Id = $"resp_{i}",
                ExamAttemptId = i < 3 ? "att_1" : "att_2",
                QuestionId = $"q_{i}",
                IsCorrect = i != 2 && i != 5, // 4 correct, 2 incorrect (66.7%)
                ScoreAwarded = (i != 2 && i != 5) ? 1m : 0m,
                GradingState = ResponseGradingState.Graded,
                TimeSpentSeconds = 45,
                AnsweredAt = started.AddHours(i)
            });
        }

        await db.SaveChangesAsync();

        var filter = new AnalyticsFilterDto { TimeRange = "all", Pathway = "rn" };
        var overview = await service.GetOverviewAsync(userId, filter);

        Assert.Equal(2, overview.TotalCompletedAssessments);
        Assert.Equal(4, overview.TotalStartedAssessments);
        Assert.Equal(1, overview.AbandonedAssessments);
        Assert.Equal(50.0m, overview.CompletionRatePercent); // 2/4 = 50%
        Assert.Equal(6, overview.TotalQuestionsAnswered);
        Assert.Equal(4, overview.CorrectResponsesCount);
        Assert.Equal(2, overview.IncorrectResponsesCount);
        Assert.Equal(66.7m, overview.OverallAccuracyPercent);
        Assert.Equal(70.0m, overview.AverageScorePercent); // (80 + 60) / 2 = 70.0%
        Assert.Equal(90, overview.TotalDurationMinutes); // 40 + 50 = 90 min
        Assert.Equal("Borderline", overview.CurrentReadinessTier); // 60% on latest
    }

    [Fact]
    public async Task GetPerformanceTrends_BuildsTimeOrderedPointsAndCalculatesTrajectory()
    {
        var (db, service, _) = CreateFixture(Guid.NewGuid().ToString());
        var userId = "cand_trend_01";

        db.Users.Add(new User { Id = userId, Email = "trend@test.com", DisplayName = "Trend Tester", Pathway = "rn" });
        var exam = new Exam { Id = "ex_trend", Title = "CAT Mock", ExamType = ExamType.CAT, Pathway = "rn" };
        db.Exams.Add(exam);

        var d1 = DateTime.UtcNow.AddDays(-10);
        var d2 = DateTime.UtcNow.AddDays(-5);
        var d3 = DateTime.UtcNow.AddDays(-1);

        db.ExamAttempts.AddRange(
            new ExamAttempt { Id = "att_t1", UserId = userId, ExamId = "ex_trend", Status = AttemptStatus.Completed, ScorePercent = 60m, StartedAt = d1, CompletedAt = d1.AddMinutes(30) },
            new ExamAttempt { Id = "att_t2", UserId = userId, ExamId = "ex_trend", Status = AttemptStatus.Completed, ScorePercent = 70m, StartedAt = d2, CompletedAt = d2.AddMinutes(35) },
            new ExamAttempt { Id = "att_t3", UserId = userId, ExamId = "ex_trend", Status = AttemptStatus.Completed, ScorePercent = 82m, StartedAt = d3, CompletedAt = d3.AddMinutes(40) }
        );

        await db.SaveChangesAsync();

        var trends = await service.GetPerformanceTrendsAsync(userId, new AnalyticsFilterDto { TimeRange = "all" });

        Assert.Equal(3, trends.Points.Count);
        Assert.Equal(60m, trends.Points[0].ScorePercent);
        Assert.Equal(70m, trends.Points[1].ScorePercent);
        Assert.Equal(82m, trends.Points[2].ScorePercent);
        Assert.Equal(22m, trends.OverallSlope); // 82 - 60 = 22
        Assert.Equal("Accelerating", trends.OverallTrajectory);
    }

    [Fact]
    public async Task GetPerformanceDistribution_PartitionsIntoAccurateBandsAndMedian()
    {
        var (db, service, _) = CreateFixture(Guid.NewGuid().ToString());
        var userId = "cand_dist_01";

        db.Users.Add(new User { Id = userId, Email = "dist@test.com", DisplayName = "Dist Tester", Pathway = "rn" });
        var exam = new Exam { Id = "ex_dist", Title = "Practice Drill", ExamType = ExamType.Practice, Pathway = "rn" };
        db.Exams.Add(exam);

        db.ExamAttempts.AddRange(
            new ExamAttempt { Id = "a1", UserId = userId, ExamId = "ex_dist", Status = AttemptStatus.Completed, ScorePercent = 95m },
            new ExamAttempt { Id = "a2", UserId = userId, ExamId = "ex_dist", Status = AttemptStatus.Completed, ScorePercent = 85m },
            new ExamAttempt { Id = "a3", UserId = userId, ExamId = "ex_dist", Status = AttemptStatus.Completed, ScorePercent = 75m },
            new ExamAttempt { Id = "a4", UserId = userId, ExamId = "ex_dist", Status = AttemptStatus.Completed, ScorePercent = 65m }
        );

        await db.SaveChangesAsync();

        var dist = await service.GetPerformanceDistributionAsync(userId, new AnalyticsFilterDto());

        Assert.Equal(4, dist.TotalAttempts);
        Assert.Equal(80.0m, dist.MedianScorePercent); // (75 + 85) / 2 = 80.0
        Assert.Equal(95m, dist.HighestScorePercent);
        Assert.Equal(65m, dist.LowestScorePercent);

        var band90 = dist.Bands.First(b => b.BandLabel.Contains("90"));
        Assert.Equal(1, band90.AttemptCount);
        Assert.Equal(25.0m, band90.Percentage);
    }

    [Fact]
    public async Task GetCategoryIntelligence_DifferentiatesRNandPNTaxonomies()
    {
        var (db, service, _) = CreateFixture(Guid.NewGuid().ToString());

        var rnCategories = await service.GetCategoryIntelligenceAsync("u1", new AnalyticsFilterDto { Pathway = "rn" });
        var mocRn = rnCategories.First(c => c.CategoryCode == "MOC");
        var phaRn = rnCategories.First(c => c.CategoryCode == "PHA");
        Assert.Equal("Management of Care", mocRn.CategoryName);
        Assert.Equal("Pharmacological and Parenteral Therapies", phaRn.CategoryName);

        var pnCategories = await service.GetCategoryIntelligenceAsync("u2", new AnalyticsFilterDto { Pathway = "pn" });
        var mocPn = pnCategories.First(c => c.CategoryCode == "MOC");
        var phaPn = pnCategories.First(c => c.CategoryCode == "PHA");
        Assert.Equal("Coordinated Care", mocPn.CategoryName);
        Assert.Equal("Pharmacological Therapies", phaPn.CategoryName);
    }

    [Fact]
    public async Task QuestionIntelligence_AggregatesTypesDifficultiesAndClinicalJudgmentSteps()
    {
        var (db, service, _) = CreateFixture(Guid.NewGuid().ToString());
        var userId = "cand_qi_01";

        db.Users.Add(new User { Id = userId, Email = "qi@test.com", DisplayName = "QI Tester", Pathway = "rn" });
        var exam = new Exam { Id = "ex_qi", Title = "Clinical Exam", ExamType = ExamType.Practice, Pathway = "rn" };
        db.Exams.Add(exam);

        var attempt = new ExamAttempt { Id = "att_qi", UserId = userId, ExamId = "ex_qi", Status = AttemptStatus.Completed };
        db.ExamAttempts.Add(attempt);

        // Seed questions with specific types and NCJMM steps
        var q1 = new Question
        {
            Id = "q_sata_1",
            QuestionTypeKey = "sata",
            Difficulty = QuestionDifficulty.Hard,
            ClinicalJudgmentStep = "Analyze Cues",
            Stem = "SATA question 1"
        };
        var q2 = new Question
        {
            Id = "q_sata_2",
            QuestionTypeKey = "sata",
            Difficulty = QuestionDifficulty.Hard,
            ClinicalJudgmentStep = "Analyze Cues",
            Stem = "SATA question 2"
        };
        var q3 = new Question
        {
            Id = "q_sc_1",
            QuestionTypeKey = "single-choice",
            Difficulty = QuestionDifficulty.Easy,
            ClinicalJudgmentStep = "Recognize Cues",
            Stem = "Single choice question 1"
        };

        db.Questions.AddRange(q1, q2, q3);

        db.AttemptResponses.AddRange(
            new AttemptResponse { Id = "r1", ExamAttemptId = "att_qi", QuestionId = "q_sata_1", IsCorrect = false, TimeSpentSeconds = 60, GradingState = ResponseGradingState.Graded },
            new AttemptResponse { Id = "r2", ExamAttemptId = "att_qi", QuestionId = "q_sata_2", IsCorrect = false, TimeSpentSeconds = 70, GradingState = ResponseGradingState.Graded },
            new AttemptResponse { Id = "r3", ExamAttemptId = "att_qi", QuestionId = "q_sc_1", IsCorrect = true, TimeSpentSeconds = 30, GradingState = ResponseGradingState.Graded }
        );

        await db.SaveChangesAsync();

        var qi = await service.GetQuestionIntelligenceAsync(userId, new AnalyticsFilterDto());

        // Check question type
        var sataItem = qi.QuestionTypes.First(qt => qt.QuestionTypeKey == "sata");
        Assert.Equal(2, sataItem.QuestionsAttempted);
        Assert.Equal(0, sataItem.CorrectResponses);
        Assert.Equal(0.0m, sataItem.AccuracyPercent);

        var scItem = qi.QuestionTypes.First(qt => qt.QuestionTypeKey == "single-choice");
        Assert.Equal(1, scItem.QuestionsAttempted);
        Assert.Equal(1, scItem.CorrectResponses);
        Assert.Equal(100.0m, scItem.AccuracyPercent);

        // Check difficulty
        var hardDiff = qi.DifficultyBreakdown.First(d => d.Difficulty == "Hard");
        Assert.Equal(2, hardDiff.QuestionsAttempted);
        Assert.Equal(0, hardDiff.CorrectResponses);

        // Check NCJMM step
        var analyzeCues = qi.ClinicalJudgmentSteps.First(s => s.StepKey == "AnalyzeCues");
        Assert.Equal(2, analyzeCues.QuestionsAttempted);
        Assert.Equal(0, analyzeCues.CorrectResponses);

        // Check recurring error detection
        var sataError = qi.RecurringErrors.FirstOrDefault(e => e.TargetCode == "sata");
        Assert.NotNull(sataError);
        Assert.Equal(2, sataError.IncorrectCount);
    }

    [Fact]
    public async Task QuestionReviewHistory_SuppressesInProgressAndExposesCompletedWithRationales()
    {
        var (db, service, _) = CreateFixture(Guid.NewGuid().ToString());
        var userId = "cand_rev_01";

        db.Users.Add(new User { Id = userId, Email = "rev@test.com", DisplayName = "Review Tester", Pathway = "rn" });
        var exam = new Exam { Id = "ex_rev", Title = "Completed Exam", ExamType = ExamType.Practice, Pathway = "rn" };
        db.Exams.Add(exam);

        var completedAtt = new ExamAttempt { Id = "att_comp", UserId = userId, ExamId = "ex_rev", Status = AttemptStatus.Completed };
        var inProgressAtt = new ExamAttempt { Id = "att_inprog", UserId = userId, ExamId = "ex_rev", Status = AttemptStatus.InProgress };
        db.ExamAttempts.AddRange(completedAtt, inProgressAtt);

        var qComp = new Question { Id = "q_comp", Stem = "Patient with acute asthma...", OverallRationale = "Albuterol is a fast-acting bronchodilator." };
        var qInProg = new Question { Id = "q_inprog", Stem = "Secure in-progress question...", OverallRationale = "Secret rationale" };
        db.Questions.AddRange(qComp, qInProg);

        db.AttemptResponses.AddRange(
            new AttemptResponse { Id = "r_comp", ExamAttemptId = "att_comp", QuestionId = "q_comp", IsCorrect = true, GradingState = ResponseGradingState.Graded, SelectedOptionsJson = "[\"A\"]" },
            new AttemptResponse { Id = "r_inprog", ExamAttemptId = "att_inprog", QuestionId = "q_inprog", IsCorrect = false, GradingState = ResponseGradingState.Graded, SelectedOptionsJson = "[\"B\"]" }
        );

        await db.SaveChangesAsync();

        var review = await service.GetQuestionReviewHistoryAsync(userId, new QuestionReviewFilterDto());

        Assert.Single(review.Items);
        Assert.Equal("q_comp", review.Items[0].QuestionId);
        Assert.Equal("Albuterol is a fast-acting bronchodilator.", review.Items[0].OverallRationale);
        Assert.DoesNotContain(review.Items, r => r.QuestionId == "q_inprog");
    }

    [Fact]
    public async Task AttemptComparison_CalculatesDeltasAcrossAttempts()
    {
        var (db, service, _) = CreateFixture(Guid.NewGuid().ToString());
        var userId = "cand_comp_01";

        db.Users.Add(new User { Id = userId, Email = "comp@test.com", DisplayName = "Comp Tester", Pathway = "rn" });
        var exam = new Exam { Id = "ex_comp", Title = "CAT Exam", ExamType = ExamType.CAT, Pathway = "rn" };
        db.Exams.Add(exam);

        var a1 = new ExamAttempt { Id = "att_c1", UserId = userId, ExamId = "ex_comp", Status = AttemptStatus.Completed, ScorePercent = 65m, StartedAt = DateTime.UtcNow.AddDays(-5), CompletedAt = DateTime.UtcNow.AddDays(-5).AddMinutes(60) };
        var a2 = new ExamAttempt { Id = "att_c2", UserId = userId, ExamId = "ex_comp", Status = AttemptStatus.Completed, ScorePercent = 78m, StartedAt = DateTime.UtcNow.AddDays(-1), CompletedAt = DateTime.UtcNow.AddDays(-1).AddMinutes(45) };
        db.ExamAttempts.AddRange(a1, a2);

        await db.SaveChangesAsync();

        var result = await service.GetAttemptComparisonAsync(userId, "att_c1", "att_c2");

        Assert.Equal(65m, result.Attempt1.ScorePercent);
        Assert.Equal(78m, result.Attempt2.ScorePercent);
        Assert.Equal(13m, result.ScoreDelta);
        Assert.Equal(-15, result.DurationDeltaMinutes);
        Assert.Contains("+13%", result.ProgressSummary);
    }

    [Fact]
    public async Task RecommendationsAndInterventions_LifecycleAndDeltaEvaluation()
    {
        var (db, service, _) = CreateFixture(Guid.NewGuid().ToString());
        var userId = "cand_rec_01";

        db.Users.Add(new User { Id = userId, Email = "rec@test.com", DisplayName = "Rec Tester", Pathway = "rn" });
        var exam = new Exam { Id = "ex_rec", Title = "Practice Test", ExamType = ExamType.Practice, Pathway = "rn" };
        db.Exams.Add(exam);

        var attempt = new ExamAttempt { Id = "att_r1", UserId = userId, ExamId = "ex_rec", Status = AttemptStatus.Completed, ScorePercent = 50m };
        db.ExamAttempts.Add(attempt);

        // Seed 4 PHA responses (3 incorrect = 25% baseline)
        var cnPha = new ClientNeed { Id = "cn_pha", Code = "PHA", Name = "Pharmacological and Parenteral Therapies" };
        db.ClientNeeds.Add(cnPha);

        for (int i = 0; i < 4; i++)
        {
            var q = new Question { Id = $"q_pha_{i}", ClientNeedId = "cn_pha", QuestionTypeKey = "single-choice", Stem = $"Pharm {i}" };
            db.Questions.Add(q);
            db.AttemptResponses.Add(new AttemptResponse
            {
                Id = $"resp_pha_{i}",
                ExamAttemptId = "att_r1",
                QuestionId = $"q_pha_{i}",
                IsCorrect = i == 0, // only 1 correct out of 4 (25%)
                GradingState = ResponseGradingState.Graded
            });
        }

        await db.SaveChangesAsync();

        // 1. Get Recommendations (auto-generates persistent recommendations)
        var recs = await service.GetLearnerRecommendationsAsync(userId, "rn");
        Assert.NotEmpty(recs);

        var phaRec = recs.First(r => r.TargetClientNeedCode == "PHA");
        Assert.Equal("New", phaRec.Status);

        // 2. Start Intervention
        var startReq = new StartInterventionRequest
        {
            RecommendationId = phaRec.Id,
            Title = "Master Pharmacology & IV Calculations",
            Pathway = "rn",
            TargetClientNeedCode = "PHA"
        };

        var intervention = await service.StartInterventionAsync(userId, startReq);
        Assert.Equal(25.0m, intervention.BaselineAccuracyPercent);
        Assert.Equal(4, intervention.BaselineQuestionsAnswered);
        Assert.Equal("Active", intervention.Status);

        // Check recommendation status updated to InProgress
        var updatedRec = await service.UpdateRecommendationStatusAsync(userId, phaRec.Id, new UpdateRecommendationStatusRequest { Status = "Completed" });
        Assert.NotNull(updatedRec);
        Assert.Equal("Completed", updatedRec.Status);
    }

    [Fact]
    public async Task LearnerReportingService_GeneratesValidPdfAndCsvExports()
    {
        var (db, analytics, reporting) = CreateFixture(Guid.NewGuid().ToString());
        var userId = "cand_rep_01";

        db.Users.Add(new User { Id = userId, Email = "rep@test.com", DisplayName = "Report Candidate", Pathway = "rn" });
        var exam = new Exam { Id = "ex_rep", Title = "Diagnostic RAT", ExamType = ExamType.DiagnosticReadiness, Pathway = "rn" };
        db.Exams.Add(exam);

        db.ExamAttempts.Add(new ExamAttempt { Id = "att_rep", UserId = userId, ExamId = "ex_rep", Status = AttemptStatus.Completed, ScorePercent = 76m, StartedAt = DateTime.UtcNow.AddHours(-1), CompletedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var reportDto = await reporting.GenerateReportAsync(userId, new AnalyticsFilterDto { Pathway = "rn" });
        Assert.Equal("Report Candidate", reportDto.LearnerDisplayName);
        Assert.Contains("NCLEX-RN", reportDto.PathwayTitle);

        // CSV Export
        var csvBytes = reporting.ExportReportCsv(reportDto);
        var csvText = Encoding.UTF8.GetString(csvBytes);
        Assert.Contains("PREPFORD NCLEX PERFORMANCE INTELLIGENCE REPORT", csvText);
        Assert.Contains("Report Candidate", csvText);
        Assert.Contains("EXECUTIVE SUMMARY METRICS", csvText);
        Assert.Contains("NCSBN CLIENT NEEDS MASTERY", csvText);

        // PDF Export
        var pdfBytes = reporting.ExportReportPdf(reportDto);
        var pdfText = Encoding.ASCII.GetString(pdfBytes);
        Assert.StartsWith("%PDF-1.4", pdfText);
        Assert.Contains("PREPFORD NCLEX", pdfText);
        Assert.Contains("xref", pdfText);
        Assert.Contains("%%EOF", pdfText);
    }

    [Fact]
    public async Task Security_CrossLearnerAccess_Returns403Forbidden()
    {
        var (db, analytics, _) = CreateFixture(Guid.NewGuid().ToString());
        var controller = new LearnerAnalyticsController(analytics);

        // Caller is candidate_1
        var userClaims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "candidate_1"),
            new Claim(ClaimTypes.Role, "candidate")
        }, "mock"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = userClaims }
        };

        // Attempting to access candidate_2's analytics
        var result = await controller.GetPerformanceOverview(userId: "candidate_2");

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
    }

    [Fact]
    public async Task GetOverview_ZeroAttempts_ReturnsGracefulEmptyMetrics()
    {
        var (db, service, _) = CreateFixture(Guid.NewGuid().ToString());
        var userId = "cand_empty_01";

        db.Users.Add(new User { Id = userId, Email = "empty@test.com", DisplayName = "Empty Candidate", Pathway = "rn" });
        await db.SaveChangesAsync();

        var overview = await service.GetOverviewAsync(userId, new AnalyticsFilterDto());

        Assert.Equal(0, overview.TotalCompletedAssessments);
        Assert.Equal(0, overview.TotalStartedAssessments);
        Assert.Equal(0, overview.TotalQuestionsAnswered);
        Assert.Equal(0m, overview.OverallAccuracyPercent);
        Assert.Equal(0m, overview.AverageScorePercent);
        Assert.Equal(0m, overview.CompletionRatePercent);
        Assert.Equal("Unassessed", overview.CurrentReadinessTier);
        Assert.Empty(overview.KeyStrengths);
    }

    [Fact]
    public async Task GetOverview_DateBoundaryFiltering_RespectsFromAndToDates()
    {
        var (db, service, _) = CreateFixture(Guid.NewGuid().ToString());
        var userId = "cand_date_01";

        db.Users.Add(new User { Id = userId, Email = "date@test.com", DisplayName = "Date Candidate", Pathway = "rn" });
        var exam = new Exam { Id = "ex_date", Title = "Practice Exam", ExamType = ExamType.Practice, Pathway = "rn" };
        db.Exams.Add(exam);

        var pastDate = DateTime.UtcNow.AddDays(-40);
        var recentDate = DateTime.UtcNow.AddDays(-5);

        // Attempt 1: 40 days ago
        db.ExamAttempts.Add(new ExamAttempt
        {
            Id = "att_old",
            UserId = userId,
            ExamId = "ex_date",
            Status = AttemptStatus.Completed,
            ScorePercent = 50m,
            StartedAt = pastDate,
            CompletedAt = pastDate.AddMinutes(30)
        });

        // Attempt 2: 5 days ago
        db.ExamAttempts.Add(new ExamAttempt
        {
            Id = "att_recent",
            UserId = userId,
            ExamId = "ex_date",
            Status = AttemptStatus.Completed,
            ScorePercent = 90m,
            StartedAt = recentDate,
            CompletedAt = recentDate.AddMinutes(30)
        });

        await db.SaveChangesAsync();

        // Filter last 7 days only
        var filter7d = new AnalyticsFilterDto { TimeRange = "7d" };
        var overview7d = await service.GetOverviewAsync(userId, filter7d);

        Assert.Equal(1, overview7d.TotalCompletedAssessments);
        Assert.Equal(90m, overview7d.AverageScorePercent);

        // Filter all time
        var filterAll = new AnalyticsFilterDto { TimeRange = "all" };
        var overviewAll = await service.GetOverviewAsync(userId, filterAll);

        Assert.Equal(2, overviewAll.TotalCompletedAssessments);
        Assert.Equal(70m, overviewAll.AverageScorePercent); // (50 + 90) / 2 = 70
    }

    [Fact]
    public async Task PathwayIsolation_RejectsCrossPathwayPollution()
    {
        var (db, service, _) = CreateFixture(Guid.NewGuid().ToString());
        var userId = "cand_isolate_01";

        db.Users.Add(new User { Id = userId, Email = "iso@test.com", DisplayName = "Iso Candidate", Pathway = "rn" });
        var examRn = new Exam { Id = "ex_iso_rn", Title = "RN Exam", ExamType = ExamType.Practice, Pathway = "rn" };
        var examPn = new Exam { Id = "ex_iso_pn", Title = "PN Exam", ExamType = ExamType.Practice, Pathway = "pn" };
        db.Exams.AddRange(examRn, examPn);

        db.ExamAttempts.AddRange(
            new ExamAttempt { Id = "att_iso_rn", UserId = userId, ExamId = "ex_iso_rn", Status = AttemptStatus.Completed, ScorePercent = 85m },
            new ExamAttempt { Id = "att_iso_pn", UserId = userId, ExamId = "ex_iso_pn", Status = AttemptStatus.Completed, ScorePercent = 60m }
        );

        await db.SaveChangesAsync();

        var rnOverview = await service.GetOverviewAsync(userId, new AnalyticsFilterDto { Pathway = "rn" });
        Assert.Equal(1, rnOverview.TotalCompletedAssessments);
        Assert.Equal(85m, rnOverview.AverageScorePercent);

        var pnOverview = await service.GetOverviewAsync(userId, new AnalyticsFilterDto { Pathway = "pn" });
        Assert.Equal(1, pnOverview.TotalCompletedAssessments);
        Assert.Equal(60m, pnOverview.AverageScorePercent);
    }

    [Fact]
    public async Task CategoryClassification_AppliesAuthoritativeThresholds()
    {
        var (db, service, _) = CreateFixture(Guid.NewGuid().ToString());
        var userId = "cand_class_01";

        db.Users.Add(new User { Id = userId, Email = "class@test.com", DisplayName = "Class Candidate", Pathway = "rn" });
        var exam = new Exam { Id = "ex_class", Title = "Class Exam", ExamType = ExamType.Practice, Pathway = "rn" };
        db.Exams.Add(exam);

        var attempt = new ExamAttempt { Id = "att_class", UserId = userId, ExamId = "ex_class", Status = AttemptStatus.Completed };
        db.ExamAttempts.Add(attempt);

        var cnMoc = new ClientNeed { Id = "cn_moc_class", Code = "MOC", Name = "Management of Care" };
        var cnSic = new ClientNeed { Id = "cn_sic_class", Code = "SIC", Name = "Safety and Infection Control" };
        db.ClientNeeds.AddRange(cnMoc, cnSic);

        // Seed 10 MOC questions: 8 correct (80% -> Strong)
        for (int i = 0; i < 10; i++)
        {
            var q = new Question { Id = $"q_moc_{i}", ClientNeedId = "cn_moc_class", Pathway = "rn" };
            db.Questions.Add(q);
            db.AttemptResponses.Add(new AttemptResponse
            {
                Id = $"r_moc_{i}",
                ExamAttemptId = "att_class",
                QuestionId = $"q_moc_{i}",
                IsCorrect = i < 8,
                GradingState = ResponseGradingState.Graded
            });
        }

        // Seed 3 SIC questions: 1 correct (33.3% but sample size < 5 -> InsufficientData)
        for (int i = 0; i < 3; i++)
        {
            var q = new Question { Id = $"q_sic_{i}", ClientNeedId = "cn_sic_class", Pathway = "rn" };
            db.Questions.Add(q);
            db.AttemptResponses.Add(new AttemptResponse
            {
                Id = $"r_sic_{i}",
                ExamAttemptId = "att_class",
                QuestionId = $"q_sic_{i}",
                IsCorrect = i == 0,
                GradingState = ResponseGradingState.Graded
            });
        }

        await db.SaveChangesAsync();

        var categories = await service.GetCategoryIntelligenceAsync(userId, new AnalyticsFilterDto { Pathway = "rn" });

        var moc = categories.First(c => c.CategoryCode == "MOC");
        Assert.Equal(10, moc.QuestionsAttempted);
        Assert.Equal(80.0m, moc.AccuracyPercent);
        Assert.Equal("Strong", moc.Classification);
        Assert.Equal("High", moc.ConfidenceLevel);

        var sic = categories.First(c => c.CategoryCode == "SIC");
        Assert.Equal(3, sic.QuestionsAttempted);
        Assert.Equal("InsufficientData", sic.Classification);
        Assert.Equal("Low", sic.ConfidenceLevel);
    }

    [Fact]
    public async Task Security_ReportsController_CrossLearnerAccess_Returns403Forbidden()
    {
        var (db, analytics, reporting) = CreateFixture(Guid.NewGuid().ToString());
        var controller = new LearnerReportsController(reporting);

        var userClaims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "candidate_alpha"),
            new Claim(ClaimTypes.Role, "candidate")
        }, "mock"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = userClaims }
        };

        var result = await controller.GetPerformanceReport(userId: "candidate_beta");

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
    }
}
