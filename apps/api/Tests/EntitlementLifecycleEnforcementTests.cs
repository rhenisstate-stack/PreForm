using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
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

public class EntitlementLifecycleEnforcementTests
{
    private AppDbContext CreateDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        var context = new AppDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }

    private ExamAttemptsController CreateExamAttemptsController(
        AppDbContext context,
        IUserEntitlementService entitlementService,
        string callerUserId = "usr_candidate_01",
        string callerRole = "candidate")
    {
        var responseValidation = new ResponseValidationService(context, new QuestionGraderResolver(QuestionTypeRegistry.Instance));
        var attemptQuestionService = new AttemptQuestionService(context);
        var passwordHasher = new PasswordHasher<User>();

        var controller = new ExamAttemptsController(
            context,
            NullLogger<ExamAttemptsController>.Instance,
            responseValidation,
            attemptQuestionService,
            null,
            passwordHasher,
            null,
            null,
            entitlementService);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, callerUserId),
            new(ClaimTypes.Email, $"{callerUserId}@prepford.com"),
            new(ClaimTypes.Role, callerRole),
            new("role", callerRole)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };

        return controller;
    }

    [Fact]
    public async Task EvaluateEntitlement_UserWithoutSubscription_ReturnsEntitlementRequired()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var user = new User
        {
            Id = "usr_no_sub",
            Email = "nosub@example.com",
            DisplayName = "No Sub",
            IsActive = true,
            AccountStatus = "Active",
            Pathway = "rn"
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var service = new UserEntitlementService(context, NullLogger<UserEntitlementService>.Instance);
        var result = await service.EvaluateEntitlementAsync("usr_no_sub", "rn");

        Assert.False(result.IsEntitled);
        Assert.Equal("ENTITLEMENT_REQUIRED", result.ErrorCode);
        Assert.Equal("None", result.Status);
    }

    [Fact]
    public async Task EvaluateEntitlement_ExpiredSubscription_ReturnsEntitlementExpired()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var user = new User
        {
            Id = "usr_expired",
            Email = "expired@example.com",
            DisplayName = "Expired User",
            IsActive = true,
            AccountStatus = "Active",
            Pathway = "rn"
        };
        var plan = new SubscriptionPlan
        {
            Id = "plan_rn_test",
            Slug = "rn-test",
            Name = "NCLEX-RN Test",
            Pathway = "RN",
            PriceCents = 1000
        };
        var sub = new UserSubscription
        {
            Id = "sub_exp",
            UserId = user.Id,
            PlanId = plan.Id,
            Pathway = "rn",
            Status = SubscriptionStatus.Active,
            StartsAt = DateTime.UtcNow.AddDays(-30),
            ExpiresAt = DateTime.UtcNow.AddMinutes(-5) // Expired
        };
        context.Users.Add(user);
        context.SubscriptionPlans.Add(plan);
        context.UserSubscriptions.Add(sub);
        await context.SaveChangesAsync();

        var service = new UserEntitlementService(context, NullLogger<UserEntitlementService>.Instance);
        var result = await service.EvaluateEntitlementAsync(user.Id, "rn");

        Assert.False(result.IsEntitled);
        Assert.Equal("ENTITLEMENT_EXPIRED", result.ErrorCode);
        Assert.Equal("Expired", result.Status);
    }

    [Fact]
    public async Task EvaluateEntitlement_SuspendedAccount_ReturnsAccountSuspended()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var user = new User
        {
            Id = "usr_suspended",
            Email = "suspended@example.com",
            DisplayName = "Suspended User",
            IsActive = true,
            AccountStatus = "Suspended",
            SuspensionReason = "Policy violation",
            Pathway = "rn"
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var service = new UserEntitlementService(context, NullLogger<UserEntitlementService>.Instance);
        var result = await service.EvaluateEntitlementAsync(user.Id, "rn");

        Assert.False(result.IsEntitled);
        Assert.Equal("ACCOUNT_SUSPENDED", result.ErrorCode);
        Assert.Equal("AccountSuspended", result.Status);
    }

    [Fact]
    public async Task EvaluateEntitlement_PathwayMismatch_ReturnsPathwayNotEntitled()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var user = new User
        {
            Id = "usr_pn_only",
            Email = "pn@example.com",
            DisplayName = "PN User",
            IsActive = true,
            AccountStatus = "Active",
            Pathway = "pn"
        };
        var plan = new SubscriptionPlan
        {
            Id = "plan_pn",
            Slug = "pn-plan",
            Name = "NCLEX-PN Pack",
            Pathway = "PN",
            PriceCents = 1000
        };
        var sub = new UserSubscription
        {
            Id = "sub_pn",
            UserId = user.Id,
            PlanId = plan.Id,
            Pathway = "pn",
            Status = SubscriptionStatus.Active,
            StartsAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };
        context.Users.Add(user);
        context.SubscriptionPlans.Add(plan);
        context.UserSubscriptions.Add(sub);
        await context.SaveChangesAsync();

        var service = new UserEntitlementService(context, NullLogger<UserEntitlementService>.Instance);
        var result = await service.EvaluateEntitlementAsync(user.Id, "rn"); // Requesting RN with PN sub

        Assert.False(result.IsEntitled);
        Assert.Equal("PATHWAY_NOT_ENTITLED", result.ErrorCode);
        Assert.Equal("PathwayMismatch", result.Status);
    }

    [Fact]
    public async Task EvaluateEntitlement_BothPathwayPlan_EntitlesRNAndPN()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var user = new User
        {
            Id = "usr_dual",
            Email = "dual@example.com",
            DisplayName = "Dual User",
            IsActive = true,
            AccountStatus = "Active",
            Pathway = "both"
        };
        var plan = new SubscriptionPlan
        {
            Id = "plan_both",
            Slug = "both-plan",
            Name = "NCLEX-RN & PN Complete",
            Pathway = "Both",
            PriceCents = 2000
        };
        var sub = new UserSubscription
        {
            Id = "sub_both",
            UserId = user.Id,
            PlanId = plan.Id,
            Pathway = "both",
            Status = SubscriptionStatus.Active,
            StartsAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };
        context.Users.Add(user);
        context.SubscriptionPlans.Add(plan);
        context.UserSubscriptions.Add(sub);
        await context.SaveChangesAsync();

        var service = new UserEntitlementService(context, NullLogger<UserEntitlementService>.Instance);
        var rnResult = await service.EvaluateEntitlementAsync(user.Id, "rn");
        var pnResult = await service.EvaluateEntitlementAsync(user.Id, "pn");

        Assert.True(rnResult.IsEntitled);
        Assert.True(pnResult.IsEntitled);
    }

    [Fact]
    public async Task EvaluateExamAccess_AdminRole_BypassesAndAuditsEntitlementBypass()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var adminUser = new User
        {
            Id = "usr_superadmin",
            Email = "admin@prepford.com",
            DisplayName = "Super Admin",
            IsActive = true,
            AccountStatus = "Active"
        };
        var adminRole = new Role { Id = "role_superadmin", Name = "superadmin" };
        var userRole = new UserRole { UserId = adminUser.Id, RoleId = adminRole.Id, Role = adminRole };
        adminUser.UserRoles.Add(userRole);

        context.Users.Add(adminUser);
        context.Roles.Add(adminRole);
        context.UserRoles.Add(userRole);
        await context.SaveChangesAsync();

        var service = new UserEntitlementService(context, NullLogger<UserEntitlementService>.Instance);
        var result = await service.EvaluateExamAccessAsync(adminUser.Id, "rn", "exam_test_01");

        Assert.True(result.IsEntitled);
        Assert.True(result.IsBypassed);
        Assert.Equal("Administrative Override", result.PlanName);

        var audit = await context.AuditLogs.FirstOrDefaultAsync(al => al.Action == "EntitlementBypass");
        Assert.NotNull(audit);
        Assert.Equal(adminUser.Id, audit.ActorId);
        Assert.Equal("Warning", audit.Severity);
    }

    [Fact]
    public async Task StartAttempt_WithoutEntitlement_Returns403EntitlementRequired()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var user = new User
        {
            Id = "usr_learner_no_sub",
            Email = "learner@example.com",
            DisplayName = "Learner",
            IsActive = true,
            AccountStatus = "Active"
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var entitlementService = new UserEntitlementService(context, NullLogger<UserEntitlementService>.Instance);
        var controller = CreateExamAttemptsController(context, entitlementService, user.Id);

        var actionResult = await controller.StartAttempt(new StartAttemptRequest { Pathway = "rn" }, CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status403Forbidden, objectResult.StatusCode);

        // Verify audit log
        var audit = await context.AuditLogs.FirstOrDefaultAsync(al => al.Action == "ExamAttemptBlockedEntitlement");
        Assert.NotNull(audit);
    }

    [Fact]
    public async Task ResumeAttempt_WithExpiredEntitlement_Returns403EntitlementExpired()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var user = new User
        {
            Id = "usr_resumer",
            Email = "resumer@example.com",
            DisplayName = "Resumer",
            IsActive = true,
            AccountStatus = "Active"
        };
        var exam = new Exam
        {
            Id = "exam_rn_adaptive_cat",
            Title = "NCLEX-RN Adaptive CAT",
            Pathway = "rn",
            ExamType = ExamType.CAT,
            TimeLimitMinutes = 300
        };
        var attempt = new ExamAttempt
        {
            Id = "att_to_resume",
            UserId = user.Id,
            ExamId = exam.Id,
            Exam = exam,
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow.AddMinutes(-30)
        };

        // Subscription expired 10 minutes ago
        var plan = new SubscriptionPlan { Id = "plan_p", Name = "Pro", Pathway = "RN" };
        var sub = new UserSubscription
        {
            Id = "sub_res",
            UserId = user.Id,
            PlanId = plan.Id,
            Pathway = "rn",
            Status = SubscriptionStatus.Active,
            ExpiresAt = DateTime.UtcNow.AddMinutes(-10)
        };

        context.Users.Add(user);
        context.Exams.Add(exam);
        context.ExamAttempts.Add(attempt);
        context.SubscriptionPlans.Add(plan);
        context.UserSubscriptions.Add(sub);
        await context.SaveChangesAsync();

        var entitlementService = new UserEntitlementService(context, NullLogger<UserEntitlementService>.Instance);
        var controller = CreateExamAttemptsController(context, entitlementService, user.Id);

        var actionResult = await controller.GetAttemptById(attempt.Id, CancellationToken.None);

        var objectResult = Assert.IsType<ObjectResult>(actionResult);
        Assert.Equal(StatusCodes.Status403Forbidden, objectResult.StatusCode);

        // Attempt must NOT be deleted
        var persistedAttempt = await context.ExamAttempts.FindAsync(attempt.Id);
        Assert.NotNull(persistedAttempt);
        Assert.Equal(AttemptStatus.InProgress, persistedAttempt.Status);
    }
}
