using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Controllers;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Xunit;

namespace Preform.Api.Tests;

public class PilotGrantSecurityTests
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

    private AdminUsersController CreateController(AppDbContext context, string adminId = "admin_super_01")
    {
        var hasher = new PasswordHasher<User>();
        var controller = new AdminUsersController(context, hasher, NullLogger<AdminUsersController>.Instance);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, adminId),
            new(ClaimTypes.Email, $"{adminId}@prepford.com"),
            new(ClaimTypes.Role, "superadmin"),
            new("role", "superadmin"),
            new(ClaimTypes.Name, "Super Administrator")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(identity)
        };

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };

        return controller;
    }

    [Fact]
    public async Task IssuePilotGrant_ActiveUserAndPlan_CreatesSubscriptionAndAuditLog()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var user = new User
        {
            Id = "candidate_01",
            Email = "candidate1@nursing.edu",
            DisplayName = "Jane Doe",
            IsActive = true,
            AccountStatus = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var plan = new SubscriptionPlan
        {
            Id = "plan_comprehensive_rn",
            Slug = "plan_comprehensive_rn",
            Name = "NCLEX-RN Comprehensive",
            PriceCents = 14900,
            Currency = "USD",
            Interval = SubscriptionInterval.Quarterly,
            Pathway = "rn",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        context.Users.Add(user);
        context.SubscriptionPlans.Add(plan);
        await context.SaveChangesAsync();

        var controller = CreateController(context);
        var request = new IssuePilotGrantRequest
        {
            PlanId = "plan_comprehensive_rn",
            DurationDays = 60,
            Reason = "Phase 7.9 Controlled Pilot Cohort"
        };

        var result = await controller.IssuePilotGrant("candidate_01", request, CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        // Verify user plan was upgraded
        var updatedUser = await context.Users.FindAsync("candidate_01");
        Assert.NotNull(updatedUser);
        Assert.Equal("NCLEX-RN Comprehensive", updatedUser.ActivePlan);

        // Verify UserSubscription was created with pilot_grant order prefix
        var subscription = await context.UserSubscriptions.FirstOrDefaultAsync(s => s.UserId == "candidate_01");
        Assert.NotNull(subscription);
        Assert.Equal(SubscriptionStatus.Active, subscription.Status);
        Assert.StartsWith("pilot_grant_", subscription.OrderId);

        // Verify AuditLog was recorded
        var auditLog = await context.AuditLogs.FirstOrDefaultAsync(a => a.Action == "PilotGrantIssued");
        Assert.NotNull(auditLog);
        Assert.Equal("UserSubscription", auditLog.EntityType);
        Assert.Equal(subscription.Id, auditLog.EntityId);
    }

    [Fact]
    public async Task IssuePilotGrant_DuplicateActiveGrant_ReturnsConflict()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var user = new User
        {
            Id = "candidate_02",
            Email = "candidate2@nursing.edu",
            DisplayName = "John Smith",
            IsActive = true,
            AccountStatus = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var plan = new SubscriptionPlan
        {
            Id = "plan_comprehensive_rn",
            Slug = "plan_comprehensive_rn",
            Name = "NCLEX-RN Comprehensive",
            PriceCents = 14900,
            Currency = "USD",
            Interval = SubscriptionInterval.Quarterly,
            Pathway = "rn",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        var existingSub = new UserSubscription
        {
            Id = Guid.NewGuid().ToString(),
            UserId = "candidate_02",
            PlanId = "plan_comprehensive_rn",
            Pathway = "rn",
            Status = SubscriptionStatus.Active,
            StartsAt = DateTime.UtcNow.AddDays(-1),
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            OrderId = "pilot_grant_existing"
        };
        context.Users.Add(user);
        context.SubscriptionPlans.Add(plan);
        context.UserSubscriptions.Add(existingSub);
        await context.SaveChangesAsync();

        var controller = CreateController(context);
        var request = new IssuePilotGrantRequest
        {
            PlanId = "plan_comprehensive_rn",
            DurationDays = 30
        };

        var result = await controller.IssuePilotGrant("candidate_02", request, CancellationToken.None);
        var conflictResult = Assert.IsType<ConflictObjectResult>(result);
        Assert.NotNull(conflictResult.Value);
    }

    [Fact]
    public async Task IssuePilotGrant_SuspendedUser_ReturnsBadRequest()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var user = new User
        {
            Id = "candidate_03",
            Email = "candidate3@nursing.edu",
            DisplayName = "Inactive Candidate",
            IsActive = false,
            AccountStatus = "Suspended",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var plan = new SubscriptionPlan
        {
            Id = "plan_comprehensive_rn",
            Slug = "plan_comprehensive_rn",
            Name = "NCLEX-RN Comprehensive",
            PriceCents = 14900,
            Currency = "USD",
            Interval = SubscriptionInterval.Quarterly,
            Pathway = "rn",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        context.Users.Add(user);
        context.SubscriptionPlans.Add(plan);
        await context.SaveChangesAsync();

        var controller = CreateController(context);
        var request = new IssuePilotGrantRequest
        {
            PlanId = "plan_comprehensive_rn",
            DurationDays = 30
        };

        var result = await controller.IssuePilotGrant("candidate_03", request, CancellationToken.None);
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(badRequestResult.Value);
    }

    [Fact]
    public async Task RevokePilotGrant_ActiveGrant_CancelsSubscriptionAndRevertsUserPlan()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var user = new User
        {
            Id = "candidate_04",
            Email = "candidate4@nursing.edu",
            DisplayName = "Revoke Candidate",
            IsActive = true,
            AccountStatus = "Active",
            ActivePlan = "NCLEX-RN Comprehensive",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var grantId = "grant_" + Guid.NewGuid().ToString("N");
        var sub = new UserSubscription
        {
            Id = grantId,
            UserId = "candidate_04",
            PlanId = "plan_comprehensive_rn",
            Pathway = "rn",
            Status = SubscriptionStatus.Active,
            StartsAt = DateTime.UtcNow.AddDays(-5),
            ExpiresAt = DateTime.UtcNow.AddDays(25),
            OrderId = "pilot_grant_test"
        };
        context.Users.Add(user);
        context.UserSubscriptions.Add(sub);
        await context.SaveChangesAsync();

        var controller = CreateController(context);
        var result = await controller.RevokePilotGrant("candidate_04", grantId, "Pilot completed", CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        var updatedSub = await context.UserSubscriptions.FindAsync(grantId);
        Assert.NotNull(updatedSub);
        Assert.Equal(SubscriptionStatus.Cancelled, updatedSub.Status);
        Assert.NotNull(updatedSub.CancelledAt);

        var updatedUser = await context.Users.FindAsync("candidate_04");
        Assert.NotNull(updatedUser);
        Assert.Equal("Free", updatedUser.ActivePlan);

        var auditLog = await context.AuditLogs.FirstOrDefaultAsync(a => a.Action == "PilotGrantRevoked");
        Assert.NotNull(auditLog);
        Assert.Equal("UserSubscription", auditLog.EntityType);
        Assert.Equal(grantId, auditLog.EntityId);
    }
}
