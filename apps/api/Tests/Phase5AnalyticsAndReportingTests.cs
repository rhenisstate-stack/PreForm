using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Controllers;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services.Analytics;
using Preform.Api.Services.Monitoring;
using Xunit;

namespace Preform.Api.Tests;

public class Phase5AnalyticsAndReportingTests
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

    [Fact]
    public async Task LearnerAnalytics_Summary_ComputesAuthoritativeMetricsFromCompletedAttempts()
    {
        var db = CreateInMemoryContext(Guid.NewGuid().ToString());
        var userId = "learner_001";

        db.Users.Add(new User { Id = userId, Email = "learner@test.com", DisplayName = "Learner One", Pathway = "rn" });

        var exam1 = new Exam { Id = "exam_1", Title = "Practice Exam 1", ExamType = ExamType.Practice, Pathway = "rn" };
        var exam2 = new Exam { Id = "exam_2", Title = "Diagnostic RAT", ExamType = ExamType.DiagnosticReadiness, Pathway = "rn" };
        db.Exams.AddRange(exam1, exam2);

        var startedAt = DateTime.UtcNow.AddHours(-3);
        var completedAt1 = startedAt.AddMinutes(45);
        var completedAt2 = startedAt.AddMinutes(60);

        // 2 Completed attempts, 1 InProgress attempt
        db.ExamAttempts.AddRange(
            new ExamAttempt { Id = "att_1", UserId = userId, ExamId = "exam_1", Status = AttemptStatus.Completed, ScorePercent = 80.0m, Passed = true, StartedAt = startedAt, CompletedAt = completedAt1 },
            new ExamAttempt { Id = "att_2", UserId = userId, ExamId = "exam_2", Status = AttemptStatus.Completed, ScorePercent = 60.0m, Passed = false, StartedAt = startedAt, CompletedAt = completedAt2 },
            new ExamAttempt { Id = "att_3", UserId = userId, ExamId = "exam_1", Status = AttemptStatus.InProgress, ScorePercent = 0.0m, Passed = false, StartedAt = DateTime.UtcNow }
        );

        // Add 5 responses
        for (int i = 0; i < 5; i++)
        {
            db.AttemptResponses.Add(new AttemptResponse
            {
                Id = $"resp_{i}",
                ExamAttemptId = "att_1",
                QuestionId = $"q_{i}",
                IsCorrect = i < 4,
                ScoreAwarded = i < 4 ? 1m : 0m,
                GradingState = ResponseGradingState.Graded,
                TimeSpentSeconds = 30
            });
        }

        await db.SaveChangesAsync();

        var service = new LearnerAnalyticsService(db);
        var summary = await service.GetSummaryAsync(userId);

        Assert.Equal(2, summary.TotalCompletedAttempts);
        Assert.Equal(5, summary.TotalPracticeQuestions);
        Assert.Equal(70.0m, summary.AverageScorePercent); // (80 + 60) / 2 = 70.0
        Assert.Equal(50.0m, summary.OverallPassRate); // 1 passed out of 2 = 50%
        Assert.True(summary.TotalDurationMinutes > 0);
        Assert.NotNull(summary.LastAssessmentDate);
        Assert.Equal("Borderline", summary.CurrentReadinessTier); // 60% on latest
    }

    [Fact]
    public async Task LearnerAnalytics_ClientNeeds_BreaksDownAcross8CanonicalCategories()
    {
        var db = CreateInMemoryContext(Guid.NewGuid().ToString());
        var userId = "learner_cn_001";

        db.Users.Add(new User { Id = userId, Email = "learner_cn@test.com", DisplayName = "Learner CN", Pathway = "rn" });

        var exam = new Exam { Id = "exam_cn", Title = "CAT Exam", ExamType = ExamType.CAT };
        db.Exams.Add(exam);

        var attempt = new ExamAttempt
        {
            Id = "att_cn",
            UserId = userId,
            ExamId = "exam_cn",
            Status = AttemptStatus.Completed,
            ScorePercent = 75m,
            Passed = true
        };
        db.ExamAttempts.Add(attempt);

        // Setup Client Need entities
        var cnMoc = new ClientNeed { Id = "cn_moc", Code = ClientNeedCategory.MOC, Name = "Management of Care" };
        var cnSic = new ClientNeed { Id = "cn_sic", Code = ClientNeedCategory.SIC, Name = "Safety and Infection Control" };
        db.ClientNeeds.AddRange(cnMoc, cnSic);

        var qMoc1 = new Question { Id = "q_moc_1", ClientNeedId = "cn_moc", QuestionTypeKey = "single-choice", Stem = "MOC Stem 1" };
        var qMoc2 = new Question { Id = "q_moc_2", ClientNeedId = "cn_moc", QuestionTypeKey = "single-choice", Stem = "MOC Stem 2" };
        var qSic1 = new Question { Id = "q_sic_1", ClientNeedId = "cn_sic", QuestionTypeKey = "single-choice", Stem = "SIC Stem 1" };
        db.Questions.AddRange(qMoc1, qMoc2, qSic1);

        db.AttemptResponses.AddRange(
            new AttemptResponse { Id = "r_1", ExamAttemptId = "att_cn", QuestionId = "q_moc_1", IsCorrect = true, GradingState = ResponseGradingState.Graded },
            new AttemptResponse { Id = "r_2", ExamAttemptId = "att_cn", QuestionId = "q_moc_2", IsCorrect = false, GradingState = ResponseGradingState.Graded },
            new AttemptResponse { Id = "r_3", ExamAttemptId = "att_cn", QuestionId = "q_sic_1", IsCorrect = true, GradingState = ResponseGradingState.Graded }
        );

        await db.SaveChangesAsync();

        var service = new LearnerAnalyticsService(db);
        var mastery = await service.GetClientNeedsMasteryAsync(userId);

        Assert.Equal(8, mastery.Count); // All 8 canonical categories must be returned

        var moc = mastery.First(m => m.CategoryCode == ClientNeedCategory.MOC);
        Assert.Equal(2, moc.TotalAssessedQuestions);
        Assert.Equal(1, moc.CorrectCount);
        Assert.Equal(50.0m, moc.AccuracyPercent);
        Assert.True(moc.IsLowSample); // total 2 < 5

        var sic = mastery.First(m => m.CategoryCode == ClientNeedCategory.SIC);
        Assert.Equal(1, sic.TotalAssessedQuestions);
        Assert.Equal(1, sic.CorrectCount);
        Assert.Equal(100.0m, sic.AccuracyPercent);

        var pha = mastery.First(m => m.CategoryCode == ClientNeedCategory.PHA);
        Assert.Equal(0, pha.TotalAssessedQuestions);
        Assert.Equal("Unassessed", pha.PerformanceTier);
    }

    [Fact]
    public async Task LearnerAnalytics_ReadinessTrend_TracksDiagnosticProgress()
    {
        var db = CreateInMemoryContext(Guid.NewGuid().ToString());
        var userId = "learner_trend";

        db.Users.Add(new User { Id = userId, Email = "trend@test.com", DisplayName = "Trend Learner" });

        var ratExam = new Exam { Id = "rat_exam", Title = "Readiness Assessment 1", ExamType = ExamType.DiagnosticReadiness };
        db.Exams.Add(ratExam);

        var now = DateTime.UtcNow;
        db.ExamAttempts.AddRange(
            new ExamAttempt { Id = "rat_1", UserId = userId, ExamId = "rat_exam", Status = AttemptStatus.Completed, ScorePercent = 58m, StartedAt = now.AddDays(-7), CompletedAt = now.AddDays(-7).AddMinutes(75) },
            new ExamAttempt { Id = "rat_2", UserId = userId, ExamId = "rat_exam", Status = AttemptStatus.Completed, ScorePercent = 78m, StartedAt = now.AddDays(-1), CompletedAt = now.AddDays(-1).AddMinutes(70) }
        );

        await db.SaveChangesAsync();

        var service = new LearnerAnalyticsService(db);
        var trend = await service.GetReadinessTrendAsync(userId);

        Assert.Equal(2, trend.TotalDiagnosticAttempts);
        Assert.Equal(78m, trend.LatestScorePercent);
        Assert.Equal("Very High", trend.LatestTier);
        Assert.Equal(2, trend.Attempts.Count);
        Assert.Equal("Borderline", trend.Attempts[0].ReadinessTier);
        Assert.Equal("Very High", trend.Attempts[1].ReadinessTier);
    }

    [Fact]
    public async Task LearnerAnalytics_Recommendations_GeneratesTargetedActions()
    {
        var db = CreateInMemoryContext(Guid.NewGuid().ToString());
        var userId = "learner_recs";

        db.Users.Add(new User { Id = userId, Email = "recs@test.com", DisplayName = "Recs Learner" });

        var exam = new Exam { Id = "exam_r", Title = "Assessment Exam" };
        db.Exams.Add(exam);

        var attempt = new ExamAttempt { Id = "att_r", UserId = userId, ExamId = "exam_r", Status = AttemptStatus.Completed, ScorePercent = 55m };
        db.ExamAttempts.Add(attempt);

        var cn = new ClientNeed { Id = "cn_pha", Code = ClientNeedCategory.PHA, Name = "Pharmacological Therapies" };
        db.ClientNeeds.Add(cn);

        // 4 questions in PHA, 1 correct = 25% accuracy (below 65%)
        for (int i = 0; i < 4; i++)
        {
            var q = new Question { Id = $"q_pha_{i}", ClientNeedId = "cn_pha", Stem = $"Stem {i}" };
            db.Questions.Add(q);
            db.AttemptResponses.Add(new AttemptResponse
            {
                Id = $"r_pha_{i}",
                ExamAttemptId = "att_r",
                QuestionId = q.Id,
                IsCorrect = i == 0,
                GradingState = ResponseGradingState.Graded
            });
        }

        await db.SaveChangesAsync();

        var service = new LearnerAnalyticsService(db);
        var recs = await service.GetRecommendationsAsync(userId);

        Assert.NotEmpty(recs);
        // Should recommend remediation in Pharmacological Therapies
        var remediation = recs.FirstOrDefault(r => r.Category == "Remediation");
        Assert.NotNull(remediation);
        Assert.Contains("Pharmacological", remediation.Title);
        Assert.Equal("High", remediation.Priority);
    }

    [Fact]
    public async Task LearnerAnalyticsController_EnforcesOwnership_RejectsUnauthorizedAccess()
    {
        var db = CreateInMemoryContext(Guid.NewGuid().ToString());
        var service = new LearnerAnalyticsService(db);

        var controller = new LearnerAnalyticsController(service);

        // Caller identity is "candidate_1" with role "candidate"
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "candidate_1"),
            new Claim(ClaimTypes.Role, "candidate")
        };
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")) }
        };

        // Attempting to access candidate_2's analytics must return 403 Forbidden
        var result = await controller.GetSummary("candidate_2");
        var objResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, objResult.StatusCode);

        // Accessing own analytics should succeed
        var ownResult = await controller.GetSummary("candidate_1");
        var okResult = Assert.IsType<OkObjectResult>(ownResult);
        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
    }

    [Fact]
    public async Task AdminReportingService_OverviewMetrics_AggregatesPlatformTotals()
    {
        var db = CreateInMemoryContext(Guid.NewGuid().ToString());

        // Add 2 candidates and 1 admin
        var candRole = new Role { Id = "role_cand", Name = "candidate" };
        var adminRole = new Role { Id = "role_admin", Name = "admin" };
        db.Roles.AddRange(candRole, adminRole);

        var u1 = new User { Id = "u1", Email = "c1@test.com", DisplayName = "C1" };
        var u2 = new User { Id = "u2", Email = "c2@test.com", DisplayName = "C2" };
        var uAdmin = new User { Id = "u3", Email = "admin@test.com", DisplayName = "Admin" };
        db.Users.AddRange(u1, u2, uAdmin);

        db.UserRoles.AddRange(
            new UserRole { UserId = "u1", RoleId = "role_cand" },
            new UserRole { UserId = "u2", RoleId = "role_cand" },
            new UserRole { UserId = "u3", RoleId = "role_admin" }
        );

        // Add questions: 3 published, 1 in review
        db.Questions.AddRange(
            new Question { Id = "q1", Status = QuestionStatus.Published, Stem = "Q1" },
            new Question { Id = "q2", Status = QuestionStatus.Published, Stem = "Q2" },
            new Question { Id = "q3", Status = QuestionStatus.Published, Stem = "Q3" },
            new Question { Id = "q4", Status = QuestionStatus.InReview, Stem = "Q4" }
        );

        // Add exam
        var exam = new Exam { Id = "exam_admin", Title = "Published Exam", LifecycleState = ExamLifecycleState.Published };
        db.Exams.Add(exam);

        // Add attempt
        db.ExamAttempts.Add(new ExamAttempt
        {
            Id = "att_admin",
            UserId = "u1",
            ExamId = "exam_admin",
            Status = AttemptStatus.Completed,
            ScorePercent = 82m,
            Passed = true,
            StartedAt = DateTime.UtcNow.AddDays(-2),
            CompletedAt = DateTime.UtcNow.AddDays(-2).AddMinutes(50)
        });

        await db.SaveChangesAsync();

        var service = new AdminReportingService(db);
        var metrics = await service.GetOverviewMetricsAsync();

        Assert.Equal(2, metrics.TotalLearners);
        Assert.Equal(4, metrics.TotalQuestions);
        Assert.Equal(3, metrics.PublishedQuestions);
        Assert.Equal(1, metrics.ReviewQueueCount);
        Assert.Equal(1, metrics.PublishedExamsCount);
        Assert.Equal(1, metrics.TotalCompletedAttempts);
        Assert.Equal(82.0m, metrics.AverageCohortScorePercent);
    }

    [Fact]
    public async Task AdminReportingService_AssessmentReport_CalculatesScoreDistributionAndBreakdowns()
    {
        var db = CreateInMemoryContext(Guid.NewGuid().ToString());

        var family = new Examination { Id = "fam_1", Code = "RN-EX-000001", Title = "Comprehensive RN CAT", Pathway = "rn" };
        db.Examinations.Add(family);

        var exam = new Exam { Id = "exam_b", ExaminationId = "fam_1", Title = "Comprehensive RN CAT Rev 1", Pathway = "rn" };
        db.Exams.Add(exam);

        db.ExamAttempts.AddRange(
            new ExamAttempt { Id = "a1", ExamId = "exam_b", Status = AttemptStatus.Completed, ScorePercent = 45m, Passed = false, StartedAt = DateTime.UtcNow.AddHours(-5), CompletedAt = DateTime.UtcNow.AddHours(-4) },
            new ExamAttempt { Id = "a2", ExamId = "exam_b", Status = AttemptStatus.Completed, ScorePercent = 72m, Passed = false, StartedAt = DateTime.UtcNow.AddHours(-4), CompletedAt = DateTime.UtcNow.AddHours(-3) },
            new ExamAttempt { Id = "a3", ExamId = "exam_b", Status = AttemptStatus.Completed, ScorePercent = 85m, Passed = true, StartedAt = DateTime.UtcNow.AddHours(-3), CompletedAt = DateTime.UtcNow.AddHours(-2) },
            new ExamAttempt { Id = "a4", ExamId = "exam_b", Status = AttemptStatus.Abandoned, ScorePercent = 0m, Passed = false, StartedAt = DateTime.UtcNow.AddHours(-2) }
        );

        await db.SaveChangesAsync();

        var service = new AdminReportingService(db);
        var report = await service.GetAssessmentReportAsync(new AssessmentReportFilter());

        Assert.Equal(4, report.TotalAttempts);
        Assert.Equal(3, report.CompletedAttempts);
        Assert.Equal(1, report.AbandonedAttempts);
        Assert.Equal(75.0m, report.CompletionRate); // 3 / 4 = 75%
        Assert.Equal(25.0m, report.AbandonmentRate); // 1 / 4 = 25%
        Assert.Equal(67.3m, report.AverageScorePercent); // (45 + 72 + 85) / 3 = 67.33%
        Assert.Equal(33.3m, report.PassRate); // 1 / 3 = 33.3%

        // Verify score distribution buckets
        Assert.Equal(7, report.ScoreDistribution.Count);
        var b0to49 = report.ScoreDistribution.First(b => b.BucketLabel.Contains("49"));
        Assert.Equal(1, b0to49.Count);

        var b70to74 = report.ScoreDistribution.First(b => b.BucketLabel.Contains("74"));
        Assert.Equal(1, b70to74.Count);

        var b80to89 = report.ScoreDistribution.First(b => b.BucketLabel.Contains("89"));
        Assert.Equal(1, b80to89.Count);

        // Verify examination breakdown
        Assert.Single(report.ExaminationBreakdowns);
        Assert.Equal("RN-EX-000001", report.ExaminationBreakdowns[0].Code);
    }

    [Fact]
    public async Task QuestionAnalyticsService_ComputesDeliveryAndDistractorStatistics()
    {
        var db = CreateInMemoryContext(Guid.NewGuid().ToString());

        var q = new Question
        {
            Id = "q_perf_1",
            Code = "QN-000101",
            Stem = "A client exhibits signs of digoxin toxicity. What is the priority nursing intervention?",
            Pathway = "rn",
            QuestionTypeKey = "single-choice",
            Difficulty = QuestionDifficulty.Moderate
        };
        db.Questions.Add(q);

        var optA = new QuestionOption { Id = "opt_a", QuestionId = "q_perf_1", OptionKey = "A", Content = "Check apical pulse", IsCorrect = true, DisplayOrder = 1 };
        var optB = new QuestionOption { Id = "opt_b", QuestionId = "q_perf_1", OptionKey = "B", Content = "Administer potassium", IsCorrect = false, DisplayOrder = 2 };
        var optC = new QuestionOption { Id = "opt_c", QuestionId = "q_perf_1", OptionKey = "C", Content = "Encourage ambulation", IsCorrect = false, DisplayOrder = 3 };
        db.QuestionOptions.AddRange(optA, optB, optC);

        // Deliveries
        db.ExamAttemptQuestions.AddRange(
            new ExamAttemptQuestion { Id = "eaq_1", ExamAttemptId = "att_1", QuestionId = "q_perf_1" },
            new ExamAttemptQuestion { Id = "eaq_2", ExamAttemptId = "att_2", QuestionId = "q_perf_1" },
            new ExamAttemptQuestion { Id = "eaq_3", ExamAttemptId = "att_3", QuestionId = "q_perf_1" }
        );

        // 3 Completed attempts
        db.ExamAttempts.AddRange(
            new ExamAttempt { Id = "att_1", Status = AttemptStatus.Completed },
            new ExamAttempt { Id = "att_2", Status = AttemptStatus.Completed },
            new ExamAttempt { Id = "att_3", Status = AttemptStatus.Completed }
        );

        // Responses: 2 chose A (correct), 1 chose B (distractor)
        db.AttemptResponses.AddRange(
            new AttemptResponse { Id = "r_1", ExamAttemptId = "att_1", QuestionId = "q_perf_1", SelectedOptionsJson = "[\"A\"]", IsCorrect = true, TimeSpentSeconds = 40, GradingState = ResponseGradingState.Graded },
            new AttemptResponse { Id = "r_2", ExamAttemptId = "att_2", QuestionId = "q_perf_1", SelectedOptionsJson = "[\"A\"]", IsCorrect = true, TimeSpentSeconds = 50, GradingState = ResponseGradingState.Graded },
            new AttemptResponse { Id = "r_3", ExamAttemptId = "att_3", QuestionId = "q_perf_1", SelectedOptionsJson = "[\"B\"]", IsCorrect = false, TimeSpentSeconds = 60, GradingState = ResponseGradingState.Graded }
        );

        await db.SaveChangesAsync();

        var service = new QuestionAnalyticsService(db);
        var detail = await service.GetQuestionPerformanceDetailAsync("q_perf_1");

        Assert.NotNull(detail);
        Assert.Equal(3, detail.TimesDelivered);
        Assert.Equal(3, detail.TimesAnswered);
        Assert.Equal(2, detail.CorrectResponseCount);
        Assert.Equal(66.7m, detail.CorrectResponseRate);
        Assert.Equal(50, detail.AverageTimeSpentSeconds);

        Assert.Equal(3, detail.DistractorAnalysis.Count);
        var a = detail.DistractorAnalysis.First(d => d.OptionKey == "A");
        Assert.Equal(2, a.SelectionCount);
        Assert.Equal(66.7m, a.SelectionRate);

        var b = detail.DistractorAnalysis.First(d => d.OptionKey == "B");
        Assert.Equal(1, b.SelectionCount);
        Assert.Equal(33.3m, b.SelectionRate);

        var c = detail.DistractorAnalysis.First(d => d.OptionKey == "C");
        Assert.Equal(0, c.SelectionCount);
        Assert.Equal(0m, c.SelectionRate);
    }

    [Fact]
    public void CsvExportService_GeneratesValidRfc4180Content()
    {
        var exportService = new CsvExportService();

        var report = new AssessmentReportDto
        {
            TotalAttempts = 100,
            CompletedAttempts = 90,
            AbandonedAttempts = 10,
            CompletionRate = 90.0m,
            AbandonmentRate = 10.0m,
            AverageScorePercent = 74.5m,
            PassRate = 68.0m,
            AverageDurationMinutes = 55,
            ScoreDistribution = new List<ScoreDistributionBucketDto>
            {
                new() { BucketLabel = "70–74%", Count = 25, Percentage = 27.8m }
            },
            ExaminationBreakdowns = new List<ExaminationAssessmentBreakdownDto>
            {
                new() { Code = "RN-EX-000001", Title = "Comprehensive RN CAT, Part 1", Pathway = "rn", TotalAttempts = 100, CompletedAttempts = 90, AverageScorePercent = 74.5m, PassRate = 68.0m, AverageDurationMinutes = 55 }
            }
        };

        var bytes = exportService.ExportAssessmentReport(report);
        Assert.NotNull(bytes);
        Assert.True(bytes.Length > 0);

        var text = Encoding.UTF8.GetString(bytes);
        Assert.Contains("ASSESSMENT PERFORMANCE REPORT", text);
        Assert.Contains("Total Attempts,100", text);
        Assert.Contains("\"Comprehensive RN CAT, Part 1\"", text); // Quotes applied for comma in title
    }

    [Fact]
    public async Task OperationalMonitoringService_MeasuresHealthAndMetrics()
    {
        var db = CreateInMemoryContext(Guid.NewGuid().ToString());

        db.UserSessions.Add(new UserSession
        {
            Id = "sess_1",
            UserId = "user_1",
            Email = "u1@test.com",
            Role = "candidate",
            Revoked = false,
            IdleExpiresAt = DateTime.UtcNow.AddHours(2),
            AbsoluteExpiresAt = DateTime.UtcNow.AddDays(1)
        });

        db.AuditLogs.Add(new AuditLog
        {
            Id = "audit_1",
            ActorId = "user_1",
            Action = "UserLogin",
            Outcome = "Success",
            Timestamp = DateTime.UtcNow.AddHours(-1)
        });

        await db.SaveChangesAsync();

        var service = new OperationalMonitoringService(db);
        var health = await service.GetOperationalHealthAsync();

        Assert.Equal("Healthy", health.Status);
        Assert.Equal("Healthy", health.DatabaseStatus);
        Assert.Equal(1, health.TotalActiveSessions);
        Assert.Equal(1, health.ActiveUsers);
        Assert.NotEmpty(health.ServerUptime);
        Assert.True(health.CommittedMemoryMb > 0);
        Assert.Equal(1, health.AuditEventsLast24Hours);
    }
}
