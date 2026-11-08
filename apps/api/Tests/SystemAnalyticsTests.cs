using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Controllers;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services.Analytics;
using Xunit;

namespace Preform.Api.Tests;

public class SystemAnalyticsTests
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
    public async Task AdminSystemOverview_ComputesAuthoritativeKpisAndDeltas()
    {
        var db = CreateInMemoryContext(Guid.NewGuid().ToString());

        // Seed users
        var now = DateTime.UtcNow;
        db.Users.AddRange(
            new User { Id = "u1", Email = "u1@test.com", DisplayName = "User 1", Pathway = "rn", CreatedAt = now.AddDays(-5) },
            new User { Id = "u2", Email = "u2@test.com", DisplayName = "User 2", Pathway = "pn", CreatedAt = now.AddDays(-10) },
            new User { Id = "u3", Email = "u3@test.com", DisplayName = "User 3", Pathway = "rn", CreatedAt = now.AddDays(-40) } // Prior period
        );

        // Seed active session
        db.UserSessions.Add(new UserSession
        {
            Id = "s1",
            UserId = "u1",
            Email = "u1@test.com",
            Role = "candidate",
            Revoked = false,
            IdleExpiresAt = now.AddMinutes(30),
            AbsoluteExpiresAt = now.AddDays(1)
        });

        // Seed exam & attempts
        var exam = new Exam { Id = "ex1", Title = "Comprehensive RN Exam", Pathway = "rn" };
        db.Exams.Add(exam);

        db.ExamAttempts.AddRange(
            new ExamAttempt { Id = "a1", UserId = "u1", ExamId = "ex1", Status = AttemptStatus.Completed, ScorePercent = 85m, StartedAt = now.AddDays(-3), CompletedAt = now.AddDays(-3).AddHours(1) },
            new ExamAttempt { Id = "a2", UserId = "u2", ExamId = "ex1", Status = AttemptStatus.Abandoned, ScorePercent = 40m, StartedAt = now.AddDays(-2) },
            new ExamAttempt { Id = "a3", UserId = "u3", ExamId = "ex1", Status = AttemptStatus.Completed, ScorePercent = 75m, StartedAt = now.AddDays(-35), CompletedAt = now.AddDays(-35).AddHours(1) } // Prior
        );

        // Seed orders
        var plan = new SubscriptionPlan { Id = "plan_1", Name = "RN Complete Plan", Pathway = "rn", PriceCents = 4900 };
        db.SubscriptionPlans.Add(plan);

        db.Orders.AddRange(
            new Order { Id = "ord_1", PlanId = "plan_1", Status = OrderStatus.Completed, AmountCents = 4900, CreatedAt = now.AddDays(-4) },
            new Order { Id = "ord_2", PlanId = "plan_1", Status = OrderStatus.Refunded, AmountCents = 1000, CreatedAt = now.AddDays(-2) },
            new Order { Id = "ord_3", PlanId = "plan_1", Status = OrderStatus.Completed, AmountCents = 4900, CreatedAt = now.AddDays(-45) } // Prior
        );

        // Seed questions & study guides
        db.Questions.AddRange(
            new Question { Id = "q1", Stem = "Clinical Q1", Status = QuestionStatus.Published, QuestionTypeKey = "multiple_choice" },
            new Question { Id = "q2", Stem = "Clinical Q2", Status = QuestionStatus.InReview, QuestionTypeKey = "sata" }
        );

        db.CuratedStudyGuides.Add(new CuratedStudyGuide { Id = "g1", Title = "Pharmacology Guide", Status = "Published" });

        await db.SaveChangesAsync();

        var service = new SystemAnalyticsService(db, NullLogger<SystemAnalyticsService>.Instance);
        var overview = await service.GetAdminSystemOverviewAsync(new SystemAnalyticsFilterDto { TimeRange = "30d" });

        Assert.Equal(3, overview.Kpis.TotalUsers);
        Assert.Equal(1, overview.Kpis.ActiveUsers);
        Assert.Equal(2, overview.Kpis.NewRegistrations); // u1 and u2 in past 30 days
        Assert.Equal(2, overview.Kpis.TotalRnLearners);
        Assert.Equal(1, overview.Kpis.TotalPnLearners);
        Assert.Equal(2, overview.Kpis.ExaminationAttempts); // a1 and a2 in past 30 days
        Assert.Equal(1, overview.Kpis.CompletedExaminations); // a1 only
        Assert.Equal(2, overview.Kpis.TotalQuestions);
        Assert.Equal(1, overview.Kpis.PublishedStudyResources);

        // Financials: $49.00 gross - $10.00 refund = $39.00 net
        Assert.Equal(49.00m, overview.Kpis.GrossCollectedRevenue);
        Assert.Equal(10.00m, overview.Kpis.TotalRefunds);
        Assert.Equal(39.00m, overview.Kpis.NetSubscriptionRevenue);

        // 1 pending question in review
        Assert.Equal(1, overview.Kpis.PendingOperationalTasks);

        // Growth delta mathematically calculated: 2 in current 30d vs 1 in prior 30d => +100.0%
        Assert.NotNull(overview.Deltas.UserGrowthPercent);
        Assert.Equal(100.0m, overview.Deltas.UserGrowthPercent.Value);
    }

    [Fact]
    public async Task AdminUserAnalytics_ComputesTrendsAndPathwayDistribution()
    {
        var db = CreateInMemoryContext(Guid.NewGuid().ToString());
        var now = DateTime.UtcNow;

        db.Users.AddRange(
            new User { Id = "u1", Pathway = "rn", CreatedAt = now.AddDays(-2), AccountStatus = "Active", IsActive = true },
            new User { Id = "u2", Pathway = "pn", CreatedAt = now.AddDays(-1), AccountStatus = "Active", IsActive = true },
            new User { Id = "u3", Pathway = "rn", CreatedAt = now.AddDays(-1), AccountStatus = "Suspended", IsActive = true }
        );
        await db.SaveChangesAsync();

        var service = new SystemAnalyticsService(db, NullLogger<SystemAnalyticsService>.Instance);
        var userAnalytics = await service.GetAdminUserAnalyticsAsync(new SystemAnalyticsFilterDto { TimeRange = "7d" });

        Assert.NotEmpty(userAnalytics.RegistrationTrends);
        Assert.Equal(2, userAnalytics.PathwayDistribution.RnCount);
        Assert.Equal(1, userAnalytics.PathwayDistribution.PnCount);
        Assert.Equal(2, userAnalytics.AccountStatusDistribution.Active);
        Assert.Equal(1, userAnalytics.AccountStatusDistribution.Suspended);
    }

    [Fact]
    public async Task AdminExaminationAnalytics_ComputesCompletionAndAbandonmentRates()
    {
        var db = CreateInMemoryContext(Guid.NewGuid().ToString());
        var now = DateTime.UtcNow;

        var exam1 = new Exam { Id = "e1", Title = "CAT Simulator", Pathway = "rn", LifecycleState = ExamLifecycleState.Published };
        var exam2 = new Exam { Id = "e2", Title = "Draft RAT", Pathway = "pn", LifecycleState = ExamLifecycleState.Draft };
        db.Exams.AddRange(exam1, exam2);

        db.ExamAttempts.AddRange(
            new ExamAttempt { Id = "att1", ExamId = "e1", Status = AttemptStatus.Completed, ScorePercent = 80m, StartedAt = now.AddHours(-3), CompletedAt = now.AddHours(-2) },
            new ExamAttempt { Id = "att2", ExamId = "e1", Status = AttemptStatus.Abandoned, ScorePercent = 0m, StartedAt = now.AddHours(-4) }
        );
        await db.SaveChangesAsync();

        var service = new SystemAnalyticsService(db, NullLogger<SystemAnalyticsService>.Instance);
        var examAnalytics = await service.GetAdminExaminationAnalyticsAsync(new SystemAnalyticsFilterDto { TimeRange = "7d" });

        Assert.Equal(1, examAnalytics.LifecycleBreakdown.Published);
        Assert.Equal(1, examAnalytics.LifecycleBreakdown.Draft);
        Assert.Equal(2, examAnalytics.PerformanceBenchmarks.TotalAttempts);
        Assert.Equal(1, examAnalytics.PerformanceBenchmarks.CompletedAttempts);
        Assert.Equal(1, examAnalytics.PerformanceBenchmarks.AbandonedAttempts);
        Assert.Equal(50.0m, examAnalytics.PerformanceBenchmarks.CompletionRatePercent);
        Assert.Equal(50.0m, examAnalytics.PerformanceBenchmarks.AbandonmentRatePercent);
        Assert.Equal(80.0m, examAnalytics.PerformanceBenchmarks.AverageScorePercent);
    }

    [Fact]
    public async Task AdminPlatformActivity_CategorizesEventsAndMasksActorEmail()
    {
        var db = CreateInMemoryContext(Guid.NewGuid().ToString());
        var user = new User { Id = "actor1", Email = "admin.nurse@prepford.com", DisplayName = "Admin Nurse" };
        db.Users.Add(user);

        db.AuditLogs.AddRange(
            new AuditLog { Id = "log1", ActorId = "actor1", Action = "UserRegistered", EntityType = "User", Severity = "Information", Timestamp = DateTime.UtcNow.AddMinutes(-10) },
            new AuditLog { Id = "log2", ActorId = "actor1", Action = "ExamPublished", EntityType = "Examination", Severity = "Information", Timestamp = DateTime.UtcNow.AddMinutes(-5) }
        );
        await db.SaveChangesAsync();

        var service = new SystemAnalyticsService(db, NullLogger<SystemAnalyticsService>.Instance);
        var activity = await service.GetAdminPlatformActivityAsync(new SystemAnalyticsFilterDto { TimeRange = "7d" });

        Assert.Equal(2, activity.RecentTimeline.Count);
        Assert.Contains(activity.VolumeByCategory, v => v.Category == "Users");
        Assert.Contains(activity.VolumeByCategory, v => v.Category == "Examinations");

        // Verify email masking for security
        var item = activity.RecentTimeline.First(t => t.Id == "log1");
        Assert.Equal("Admin Nurse", item.ActorName);
        Assert.StartsWith("a***", item.ActorEmailPreview);
        Assert.EndsWith("@prepford.com", item.ActorEmailPreview);
    }

    [Fact]
    public async Task LearnerDashboardOverview_ComputesTrajectoryAndStreakSeparatelyForRnAndPn()
    {
        var db = CreateInMemoryContext(Guid.NewGuid().ToString());
        var learnerRn = "learner_rn_1";
        var learnerPn = "learner_pn_1";

        db.Users.AddRange(
            new User { Id = learnerRn, Email = "rn@test.com", DisplayName = "RN Learner", Pathway = "rn" },
            new User { Id = learnerPn, Email = "pn@test.com", DisplayName = "PN Learner", Pathway = "pn" }
        );

        var examRn = new Exam { Id = "ex_rn", Title = "RN Medical Surgical", Pathway = "rn" };
        var examPn = new Exam { Id = "ex_pn", Title = "PN Basic Care", Pathway = "pn" };
        db.Exams.AddRange(examRn, examPn);

        var needMoc = new ClientNeed { Id = "cn_moc", Code = "MOC", Name = "Management of Care" };
        var needCc = new ClientNeed { Id = "cn_cc", Code = "CC", Name = "Coordinated Care" };
        db.ClientNeeds.AddRange(needMoc, needCc);

        var qRn = new Question { Id = "q_rn_1", Stem = "RN Q", ClientNeedId = "cn_moc", Pathway = "rn" };
        var qPn = new Question { Id = "q_pn_1", Stem = "PN Q", ClientNeedId = "cn_cc", Pathway = "pn" };
        db.Questions.AddRange(qRn, qPn);

        var yesterday = DateTime.UtcNow.AddDays(-1);
        var today = DateTime.UtcNow;

        // RN attempts
        db.ExamAttempts.AddRange(
            new ExamAttempt { Id = "att_rn_1", UserId = learnerRn, ExamId = "ex_rn", Status = AttemptStatus.Completed, ScorePercent = 80m, StartedAt = yesterday, CompletedAt = yesterday.AddMinutes(30) },
            new ExamAttempt { Id = "att_rn_2", UserId = learnerRn, ExamId = "ex_rn", Status = AttemptStatus.Completed, ScorePercent = 90m, StartedAt = today, CompletedAt = today.AddMinutes(25) }
        );

        db.AttemptResponses.Add(new AttemptResponse
        {
            Id = "resp_rn_1",
            ExamAttemptId = "att_rn_1",
            QuestionId = "q_rn_1",
            IsCorrect = true,
            GradingState = ResponseGradingState.Graded
        });

        await db.SaveChangesAsync();

        var service = new SystemAnalyticsService(db, NullLogger<SystemAnalyticsService>.Instance);

        // Fetch RN Overview
        var rnOverview = await service.GetLearnerDashboardOverviewAsync(learnerRn, "rn", new SystemAnalyticsFilterDto());
        Assert.Equal("rn", rnOverview.Pathway);
        Assert.Equal(2, rnOverview.Kpis.TotalAssessmentsCompleted);
        Assert.Equal(85.0m, rnOverview.Kpis.OverallAccuracyPercent);
        Assert.Equal(2, rnOverview.ScoreTrajectory.Count);
        Assert.Equal("Mastered", rnOverview.Kpis.CurrentReadinessTier); // 90% latest
        Assert.True(rnOverview.StudyConsistency.StreakDays >= 1);

        // Verify RN-specific domain (Management of Care) is present and evaluated
        var moc = rnOverview.DomainMastery.FirstOrDefault(d => d.CategoryCode == "MOC");
        Assert.NotNull(moc);
        Assert.Equal("Mastered", moc.Status);
        Assert.Equal(100.0m, moc.AccuracyPercent);

        // Fetch PN Overview for separate PN learner
        var pnOverview = await service.GetLearnerDashboardOverviewAsync(learnerPn, "pn", new SystemAnalyticsFilterDto());
        Assert.Equal("pn", pnOverview.Pathway);
        Assert.Equal(0, pnOverview.Kpis.TotalAssessmentsCompleted);
        Assert.Equal("Unassessed", pnOverview.Kpis.CurrentReadinessTier);
        // Verify PN has Coordinated Care (CC), NOT Management of Care (MOC)
        Assert.Contains(pnOverview.DomainMastery, d => d.CategoryCode == "CC");
        Assert.DoesNotContain(pnOverview.DomainMastery, d => d.CategoryCode == "MOC");
    }

    [Fact]
    public async Task AnalyticsController_EnforcesRoleAuthorization()
    {
        var db = CreateInMemoryContext(Guid.NewGuid().ToString());
        var service = new SystemAnalyticsService(db, NullLogger<SystemAnalyticsService>.Instance);
        var controller = new AnalyticsController(service);

        // Setup candidate context
        var candidatePrincipal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "candidate_1"),
            new Claim(ClaimTypes.Role, "candidate")
        }, "TestAuth"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext { User = candidatePrincipal }
        };

        // Candidate attempting exam manager endpoint => ForbidResult
        var examRes = await controller.GetExamManagerOverview(new SystemAnalyticsFilterDto(), default);
        Assert.IsType<ForbidResult>(examRes);

        // Candidate attempting instructor endpoint => ForbidResult
        var instRes = await controller.GetInstructorOverview(new SystemAnalyticsFilterDto(), default);
        Assert.IsType<ForbidResult>(instRes);

        // Candidate attempting to access another candidate's learner overview => ForbidResult
        var otherLearnerRes = await controller.GetLearnerDashboardOverview("rn", "other_candidate_2", new SystemAnalyticsFilterDto(), default);
        Assert.IsType<ForbidResult>(otherLearnerRes);

        // Candidate accessing their own learner overview => OkResult
        var ownLearnerRes = await controller.GetLearnerDashboardOverview("rn", "candidate_1", new SystemAnalyticsFilterDto(), default);
        Assert.IsType<OkObjectResult>(ownLearnerRes);
    }
}
