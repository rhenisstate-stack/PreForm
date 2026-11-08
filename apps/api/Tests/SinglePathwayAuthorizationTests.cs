using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Controllers;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Preform.Api.Services.Analytics;
using Preform.Api.Services.Grading;
using Xunit;

namespace Preform.Api.Tests;

public class SinglePathwayAuthorizationTests
{
    private static AppDbContext CreateInMemoryDb(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        var context = new AppDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }

    private static ControllerContext CreateUserContext(string userId, string role = "candidate")
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new(ClaimTypes.Role, role)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    private static ExamAttemptsController CreateAttemptsController(AppDbContext db, string userId, string role = "candidate")
    {
        var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);
        var validationService = new ResponseValidationService(db, resolver);
        var questionService = new AttemptQuestionService(db);
        return new ExamAttemptsController(
            db,
            NullLogger<ExamAttemptsController>.Instance,
            validationService,
            questionService)
        {
            ControllerContext = CreateUserContext(userId, role)
        };
    }

    [Theory]
    [InlineData("both")]
    [InlineData("all")]
    [InlineData("invalid")]
    [InlineData("")]
    [InlineData(null)]
    public async Task AuthController_Register_Rejects_InvalidOrDualPathway(string? pathway)
    {
        var db = CreateInMemoryDb(Guid.NewGuid().ToString());
        var passwordHasher = new PasswordHasher<User>();
        var sessionSecurity = new SessionSecurityService(db, NullLogger<SessionSecurityService>.Instance);
        var sessionService = new SessionService(sessionSecurity);
        var controller = new AuthController(
            db,
            sessionService,
            sessionSecurity,
            passwordHasher,
            NullLogger<AuthController>.Instance);

        var request = new RegisterRequest
        {
            Email = "candidate@test.com",
            Password = "SecurePassword123!",
            DisplayName = "Test Candidate",
            Pathway = pathway!
        };

        var result = await controller.Register(request, CancellationToken.None);
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var response = Assert.IsType<AuthResponse>(badRequest.Value);
        Assert.False(response.Success);
        Assert.Contains("single examination pathway", response.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("rn", "NCLEX-RN Complete Preparation Plan")]
    [InlineData("pn", "NCLEX-PN Complete Preparation Plan")]
    public async Task AuthController_Register_Accepts_SinglePathway(string pathway, string expectedPlan)
    {
        var db = CreateInMemoryDb(Guid.NewGuid().ToString());
        var passwordHasher = new PasswordHasher<User>();
        var sessionSecurity = new SessionSecurityService(db, NullLogger<SessionSecurityService>.Instance);
        var sessionService = new SessionService(sessionSecurity);
        var controller = new AuthController(
            db,
            sessionService,
            sessionSecurity,
            passwordHasher,
            NullLogger<AuthController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };

        var request = new RegisterRequest
        {
            Email = $"student-{pathway}@test.com",
            Password = "SecurePassword123!",
            DisplayName = $"Student {pathway.ToUpperInvariant()}",
            Pathway = pathway
        };

        var result = await controller.Register(request, CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AuthResponse>(okResult.Value);
        Assert.True(response.Success);

        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        Assert.NotNull(user);
        Assert.Equal(pathway, user.Pathway);
        Assert.Equal(expectedPlan, user.ActivePlan);
    }

    [Fact]
    public async Task ExamAttemptsController_StartAttempt_Rejects_CrossPathway()
    {
        var db = CreateInMemoryDb(Guid.NewGuid().ToString());
        var studentId = "stud_rn_01";
        db.Users.Add(new User { Id = studentId, Email = "student_rn@test.com", DisplayName = "RN Student", Pathway = "rn", IsActive = true });

        var pnExam = new Exam { Id = "exam_pn_1", Title = "PN Readiness Exam", Pathway = "pn", ExamType = ExamType.DiagnosticReadiness };
        db.Exams.Add(pnExam);
        await db.SaveChangesAsync();

        var controller = CreateAttemptsController(db, studentId);

        // 1. Student enrolled in RN passes pathway "pn"
        var requestMismatch = new StartAttemptRequest
        {
            ExamId = pnExam.Id,
            Pathway = "pn"
        };
        var resultMismatch = await controller.StartAttempt(requestMismatch, CancellationToken.None);
        var forbiddenMismatch = Assert.IsType<ObjectResult>(resultMismatch);
        Assert.Equal(StatusCodes.Status403Forbidden, forbiddenMismatch.StatusCode);

        // 2. Student enrolled in RN attempts to create attempt for PN exam even if requested pathway says "rn"
        var requestExamMismatch = new StartAttemptRequest
        {
            ExamId = pnExam.Id,
            Pathway = "rn"
        };
        var resultExamMismatch = await controller.StartAttempt(requestExamMismatch, CancellationToken.None);
        var forbiddenExam = Assert.IsType<ObjectResult>(resultExamMismatch);
        Assert.Equal(StatusCodes.Status403Forbidden, forbiddenExam.StatusCode);
    }

    [Fact]
    public async Task ExamAttemptsController_GetAttempts_Enforces_SinglePathwayScoping()
    {
        var db = CreateInMemoryDb(Guid.NewGuid().ToString());
        var studentId = "stud_rn_02";
        db.Users.Add(new User { Id = studentId, Email = "student_rn2@test.com", DisplayName = "RN Student 2", Pathway = "rn", IsActive = true });

        var rnExam = new Exam { Id = "exam_rn_test", Title = "RN Practice", Pathway = "rn", ExamType = ExamType.Practice };
        var pnExam = new Exam { Id = "exam_pn_test", Title = "PN Practice", Pathway = "pn", ExamType = ExamType.Practice };
        db.Exams.AddRange(rnExam, pnExam);

        // Historical attempt under RN
        db.ExamAttempts.Add(new ExamAttempt
        {
            Id = "att_rn_01",
            UserId = studentId,
            ExamId = rnExam.Id,
            Status = AttemptStatus.Completed,
            StartedAt = DateTime.UtcNow.AddDays(-2),
            CompletedAt = DateTime.UtcNow.AddDays(-2),
            ScorePercent = 80m
        });

        // Rogue or legacy attempt tagged under PN exam
        db.ExamAttempts.Add(new ExamAttempt
        {
            Id = "att_pn_01",
            UserId = studentId,
            ExamId = pnExam.Id,
            Status = AttemptStatus.Completed,
            StartedAt = DateTime.UtcNow.AddDays(-1),
            CompletedAt = DateTime.UtcNow.AddDays(-1),
            ScorePercent = 75m
        });
        await db.SaveChangesAsync();

        var controller = CreateAttemptsController(db, studentId);

        var result = await controller.GetAttempts(userId: studentId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        var attemptsProp = okResult.Value?.GetType().GetProperty("attempts")?.GetValue(okResult.Value) as System.Collections.IEnumerable;
        Assert.NotNull(attemptsProp);
        var attemptList = attemptsProp.Cast<object>().ToList();

        // Must strictly contain only RN attempts
        Assert.Single(attemptList);
        var idVal = attemptList[0].GetType().GetProperty("Id")?.GetValue(attemptList[0]) as string;
        Assert.Equal("att_rn_01", idVal);
    }

    [Fact]
    public async Task ExamAttemptsController_GetAttemptById_Blocks_CrossPathwayAttempt()
    {
        var db = CreateInMemoryDb(Guid.NewGuid().ToString());
        var studentId = "stud_rn_03";
        db.Users.Add(new User { Id = studentId, Email = "student_rn3@test.com", DisplayName = "RN Student 3", Pathway = "rn", IsActive = true });

        var pnExam = new Exam { Id = "exam_pn_target", Title = "PN Exam", Pathway = "pn", ExamType = ExamType.Practice };
        db.Exams.Add(pnExam);

        var crossAttempt = new ExamAttempt
        {
            Id = "att_cross_pn",
            UserId = studentId,
            ExamId = pnExam.Id,
            Status = AttemptStatus.Completed,
            StartedAt = DateTime.UtcNow
        };
        db.ExamAttempts.Add(crossAttempt);
        await db.SaveChangesAsync();

        var controller = CreateAttemptsController(db, studentId);

        var result = await controller.GetAttemptById(crossAttempt.Id, CancellationToken.None);
        var forbiddenResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, forbiddenResult.StatusCode);
    }

    [Fact]
    public async Task AssessmentsController_GetAvailableAssessments_Rejects_CrossPathwayQuery()
    {
        var db = CreateInMemoryDb(Guid.NewGuid().ToString());
        var studentId = "stud_rn_04";
        db.Users.Add(new User { Id = studentId, Email = "student_rn4@test.com", DisplayName = "RN Student 4", Pathway = "rn", IsActive = true });
        await db.SaveChangesAsync();

        var controller = new AssessmentsController(db, NullLogger<AssessmentsController>.Instance)
        {
            ControllerContext = CreateUserContext(studentId, "candidate")
        };

        var result = await controller.GetAvailableAssessments(pathway: "pn", cancellationToken: CancellationToken.None);
        var forbiddenResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, forbiddenResult.StatusCode);
    }

    [Fact]
    public async Task LearnerAnalyticsController_GetOverview_Rejects_CrossPathwayQuery()
    {
        var db = CreateInMemoryDb(Guid.NewGuid().ToString());
        var studentId = "stud_rn_05";
        db.Users.Add(new User { Id = studentId, Email = "student_rn5@test.com", DisplayName = "RN Student 5", Pathway = "rn", IsActive = true });
        await db.SaveChangesAsync();

        var analyticsService = new LearnerAnalyticsService(db);
        var controller = new LearnerAnalyticsController(analyticsService, db)
        {
            ControllerContext = CreateUserContext(studentId, "candidate")
        };

        var result = await controller.GetPerformanceOverview(userId: studentId, pathway: "pn");
        var forbiddenResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, forbiddenResult.StatusCode);
    }

    [Fact]
    public async Task LearnerAnalyticsController_Comparison_Rejects_CrossPathwayAttempts()
    {
        var db = CreateInMemoryDb(Guid.NewGuid().ToString());
        var studentId = "stud_rn_06";
        db.Users.Add(new User { Id = studentId, Email = "student_rn6@test.com", DisplayName = "RN Student 6", Pathway = "rn", IsActive = true });

        var rnExam = new Exam { Id = "exam_comp_rn", Title = "RN Practice", Pathway = "rn", ExamType = ExamType.Practice };
        var pnExam = new Exam { Id = "exam_comp_pn", Title = "PN Practice", Pathway = "pn", ExamType = ExamType.Practice };
        db.Exams.AddRange(rnExam, pnExam);

        var rnAttempt = new ExamAttempt
        {
            Id = "att_comp_rn",
            UserId = studentId,
            ExamId = rnExam.Id,
            Status = AttemptStatus.Completed,
            StartedAt = DateTime.UtcNow.AddDays(-2),
            CompletedAt = DateTime.UtcNow.AddDays(-2),
            ScorePercent = 80m
        };
        var pnAttempt = new ExamAttempt
        {
            Id = "att_comp_pn",
            UserId = studentId,
            ExamId = pnExam.Id,
            Status = AttemptStatus.Completed,
            StartedAt = DateTime.UtcNow.AddDays(-1),
            CompletedAt = DateTime.UtcNow.AddDays(-1),
            ScorePercent = 70m
        };
        db.ExamAttempts.AddRange(rnAttempt, pnAttempt);
        await db.SaveChangesAsync();

        var analyticsService = new LearnerAnalyticsService(db);
        var controller = new LearnerAnalyticsController(analyticsService, db)
        {
            ControllerContext = CreateUserContext(studentId, "candidate")
        };

        var result = await controller.GetAttemptComparison(userId: studentId, attemptId1: rnAttempt.Id, attemptId2: pnAttempt.Id);
        var forbiddenResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, forbiddenResult.StatusCode);
    }

    [Fact]
    public async Task LearnerReportsController_GetPerformanceReport_Rejects_CrossPathwayQuery()
    {
        var db = CreateInMemoryDb(Guid.NewGuid().ToString());
        var studentId = "stud_rn_07";
        db.Users.Add(new User { Id = studentId, Email = "student_rn7@test.com", DisplayName = "RN Student 7", Pathway = "rn", IsActive = true });
        await db.SaveChangesAsync();

        var analyticsService = new LearnerAnalyticsService(db);
        var reportingService = new LearnerReportingService(db, analyticsService);
        var controller = new LearnerReportsController(reportingService, db)
        {
            ControllerContext = CreateUserContext(studentId, "candidate")
        };

        var result = await controller.GetPerformanceReport(userId: studentId, pathway: "pn");
        var forbiddenResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, forbiddenResult.StatusCode);
    }
}
