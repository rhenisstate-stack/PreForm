using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Controllers;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class MonetizationManagementTests
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

    [Fact]
    public async Task DuplicatePlan_CreatesNewDraftPlan_WithIncrementedVersion()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var subscriptionService = new SubscriptionService(context, NullLogger<SubscriptionService>.Instance);

        var originalPlan = new SubscriptionPlan
        {
            Id = "plan_rn_pro",
            Slug = "rn-pro",
            Name = "NCLEX-RN Pro Preparation",
            Description = "Comprehensive RN curriculum",
            PriceCents = 5900,
            Currency = "USD",
            BillingInterval = "month",
            Pathway = "RN",
            PlanType = "pro",
            IsActive = true,
            PublicationStatus = PlanPublicationStatus.Published,
            Version = 1,
            FeaturesJson = "[\"QBank\",\"Rationales\"]"
        };
        context.SubscriptionPlans.Add(originalPlan);
        await context.SaveChangesAsync();

        var (success, error, duplicatedDto) = await subscriptionService.DuplicatePlanAsync("plan_rn_pro", "usr_admin_01");

        Assert.True(success);
        Assert.NotNull(duplicatedDto);
        Assert.NotEqual(originalPlan.Id, duplicatedDto.Id);
        Assert.Contains("Copy", duplicatedDto.Name);
        Assert.Equal("Draft", duplicatedDto.PublicationStatus);
        Assert.Equal(2, duplicatedDto.Version);

        var storedCopy = await context.SubscriptionPlans.FindAsync(duplicatedDto.Id);
        Assert.NotNull(storedCopy);
        Assert.Equal(5900, storedCopy.PriceCents);
    }

    [Fact]
    public async Task DeletePlan_GuardsAgainstActiveSubscriptions_AndAllowsDeletingUnusedPlan()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var subscriptionService = new SubscriptionService(context, NullLogger<SubscriptionService>.Instance);

        var planWithSubs = new SubscriptionPlan
        {
            Id = "plan_with_subs",
            Slug = "plan-with-subs",
            Name = "Plan With Active Subs",
            PriceCents = 4900,
            Pathway = "RN",
            IsActive = true
        };
        var planUnused = new SubscriptionPlan
        {
            Id = "plan_unused",
            Slug = "plan-unused",
            Name = "Unused Plan",
            PriceCents = 2900,
            Pathway = "PN",
            IsActive = false
        };
        context.SubscriptionPlans.AddRange(planWithSubs, planUnused);

        // Add active user subscription
        context.UserSubscriptions.Add(new UserSubscription
        {
            Id = "sub_01",
            UserId = "usr_candidate_01",
            PlanId = "plan_with_subs",
            Status = SubscriptionStatus.Active,
            StartsAt = DateTime.UtcNow.AddDays(-5),
            ExpiresAt = DateTime.UtcNow.AddDays(25)
        });
        await context.SaveChangesAsync();

        // Attempting to delete planWithSubs must throw InvalidOperationException
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            subscriptionService.DeletePlanAsync("plan_with_subs"));

        // Deleting unused plan succeeds
        var (deleteSuccess, deleteError) = await subscriptionService.DeletePlanAsync("plan_unused");
        Assert.True(deleteSuccess);
        Assert.Null(await context.SubscriptionPlans.FindAsync("plan_unused"));
    }

    [Fact]
    public async Task ManualAuthorization_RecordAndVerify_AtomicallyActivatesSubscription()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());

        var user = new User
        {
            Id = "usr_cand_offline",
            Email = "offline.learner@prepford.com",
            DisplayName = "Ada Lovelace",
            AccountStatus = "Active",
            IsActive = true,
            Pathway = "pn"
        };
        var plan = new SubscriptionPlan
        {
            Id = "plan_pn_pro",
            Slug = "pn-pro",
            Name = "NCLEX-PN Pro Prep",
            PriceCents = 5900,
            Currency = "USD",
            Pathway = "PN",
            IsActive = true
        };
        context.Users.Add(user);
        context.SubscriptionPlans.Add(plan);
        await context.SaveChangesAsync();

        var controller = new AdminMonetizationController(
            context,
            NullLogger<AdminMonetizationController>.Instance);

        var adminClaims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "usr_admin_01"),
            new(ClaimTypes.Email, "admin@prepford.com"),
            new(ClaimTypes.Role, "superadmin")
        };
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(adminClaims, "TestAuth")) }
        };

        // 1. Record manual payment without auto-verify
        var recordDto = new RecordManualPaymentDto
        {
            UserId = "usr_cand_offline",
            PlanId = "plan_pn_pro",
            PaymentMethod = "M-Pesa",
            Amount = 59,
            Currency = "USD",
            TransactionReference = "MPESA-TEST-9988",
            ReceiptNumber = "REC-9988",
            AutoVerifyAndActivate = false
        };

        var recordRes = await controller.RecordManualPayment(recordDto, CancellationToken.None);
        var recordOk = Assert.IsType<OkObjectResult>(recordRes);
        var recordData = recordOk.Value;
        Assert.NotNull(recordData);

        var authId = recordData.GetType().GetProperty("authorizationId")?.GetValue(recordData) as string;
        Assert.False(string.IsNullOrWhiteSpace(authId));

        var storedAuth = await context.ManualSubscriptionAuthorizations.FindAsync(authId);
        Assert.NotNull(storedAuth);
        Assert.Equal(PaymentVerificationStatus.PendingVerification, storedAuth.Status);

        // User should not yet have active plan
        var userBeforeVerify = await context.Users.FindAsync("usr_cand_offline");
        Assert.Null(userBeforeVerify!.ActivePlan);

        // 2. Verify payment
        var verifyDto = new VerifyManualPaymentDto
        {
            Approved = true,
            Notes = "Bank deposit verified against statement"
        };

        var verifyRes = await controller.VerifyManualPayment(authId, verifyDto, CancellationToken.None);
        var verifyOk = Assert.IsType<OkObjectResult>(verifyRes);

        // 3. Check atomic activation
        var reloadedAuth = await context.ManualSubscriptionAuthorizations.FindAsync(authId);
        Assert.Equal(PaymentVerificationStatus.Verified, reloadedAuth!.Status);
        Assert.Equal("usr_admin_01", reloadedAuth.VerifiedByAdminId);

        var activeSubscription = await context.UserSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == "usr_cand_offline" && s.PlanId == "plan_pn_pro");
        Assert.NotNull(activeSubscription);
        Assert.Equal(SubscriptionStatus.Active, activeSubscription.Status);
        Assert.True(activeSubscription.IsManual);
        Assert.Equal(authId, activeSubscription.ManualAuthorizationId);

        var updatedUser = await context.Users.FindAsync("usr_cand_offline");
        Assert.Equal("plan_pn_pro", updatedUser!.ActivePlan);
        Assert.Equal("PN", updatedUser.Pathway);
    }

    [Fact]
    public async Task LearnerSubscriptionLifecycle_Extend_Suspend_Reinstate_Cancel()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());

        var user = new User
        {
            Id = "usr_lifecycle_candidate",
            Email = "candidate@prepford.com",
            DisplayName = "Candidate User",
            AccountStatus = "Active",
            IsActive = true,
            ActivePlan = "plan_rn_pro",
            Pathway = "rn"
        };
        var plan = new SubscriptionPlan
        {
            Id = "plan_rn_pro",
            Slug = "rn-pro",
            Name = "RN Pro",
            PriceCents = 5900,
            Pathway = "RN",
            IsActive = true
        };
        var subscription = new UserSubscription
        {
            Id = "sub_lifecycle_01",
            UserId = "usr_lifecycle_candidate",
            PlanId = "plan_rn_pro",
            Status = SubscriptionStatus.Active,
            StartsAt = DateTime.UtcNow.AddDays(-10),
            ExpiresAt = DateTime.UtcNow.AddDays(20)
        };
        context.Users.Add(user);
        context.SubscriptionPlans.Add(plan);
        context.UserSubscriptions.Add(subscription);
        await context.SaveChangesAsync();

        var controller = new AdminMonetizationController(
            context,
            NullLogger<AdminMonetizationController>.Instance);

        var adminClaims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "usr_admin_01"),
            new(ClaimTypes.Email, "admin@prepford.com"),
            new(ClaimTypes.Role, "admin")
        };
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(adminClaims, "TestAuth")) }
        };

        // 1. Extend subscription by 30 days
        var extendRes = await controller.ExtendSubscription(
            "sub_lifecycle_01",
            new ExtendSubscriptionDto { AdditionalDays = 30, Notes = "Granted 30 bonus days" },
            CancellationToken.None);
        Assert.IsType<OkObjectResult>(extendRes);

        var extendedSub = await context.UserSubscriptions.FindAsync("sub_lifecycle_01");
        Assert.True(extendedSub!.ExpiresAt > DateTime.UtcNow.AddDays(45));

        // 2. Suspend subscription
        var suspendRes = await controller.SuspendSubscription(
            "sub_lifecycle_01",
            new SuspendSubscriptionDto { Reason = "Payment review inquiry" },
            CancellationToken.None);
        Assert.IsType<OkObjectResult>(suspendRes);

        var suspendedSub = await context.UserSubscriptions.FindAsync("sub_lifecycle_01");
        Assert.Equal(SubscriptionStatus.Suspended, suspendedSub!.Status);

        // 3. Reinstate subscription
        var reinstateRes = await controller.ReinstateSubscription("sub_lifecycle_01", CancellationToken.None);
        Assert.IsType<OkObjectResult>(reinstateRes);

        var reinstatedSub = await context.UserSubscriptions.FindAsync("sub_lifecycle_01");
        Assert.Equal(SubscriptionStatus.Active, reinstatedSub!.Status);

        // 4. Cancel subscription
        var cancelRes = await controller.CancelSubscription(
            "sub_lifecycle_01",
            new CancelSubscriptionDto { Reason = "Candidate requested cancellation" },
            CancellationToken.None);
        Assert.IsType<OkObjectResult>(cancelRes);

        var cancelledSub = await context.UserSubscriptions.FindAsync("sub_lifecycle_01");
        Assert.Equal(SubscriptionStatus.Cancelled, cancelledSub!.Status);
    }

    [Fact]
    public async Task UserEntitlementService_AuthoritativeFeatureAccess_EnforcesCourseIsolation()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var entitlementService = new UserEntitlementService(context, NullLogger<UserEntitlementService>.Instance);

        var userRnOnly = new User { Id = "usr_rn_only", Email = "rn@prepford.com", DisplayName = "RN Only", AccountStatus = "Active", IsActive = true, Pathway = "rn" };
        var userDual = new User { Id = "usr_dual", Email = "dual@prepford.com", DisplayName = "Dual User", AccountStatus = "Active", IsActive = true, Pathway = "rn" };

        var rnPlan = new SubscriptionPlan { Id = "plan_rn", Pathway = "RN", PriceCents = 2900, IsActive = true, EntitlementsJson = "[\"rn\",\"practice_exams\"]" };
        var dualPlan = new SubscriptionPlan { Id = "plan_dual", Pathway = "Both", PriceCents = 8900, IsActive = true, EntitlementsJson = "[\"rn\",\"pn\",\"practice_exams\"]" };

        context.Users.AddRange(userRnOnly, userDual);
        context.SubscriptionPlans.AddRange(rnPlan, dualPlan);

        // RN User has active RN subscription
        context.UserSubscriptions.Add(new UserSubscription
        {
            Id = "sub_rn",
            UserId = "usr_rn_only",
            PlanId = "plan_rn",
            Status = SubscriptionStatus.Active,
            StartsAt = DateTime.UtcNow.AddDays(-1),
            ExpiresAt = DateTime.UtcNow.AddDays(29)
        });

        // Dual User has active dual subscription
        context.UserSubscriptions.Add(new UserSubscription
        {
            Id = "sub_dual",
            UserId = "usr_dual",
            PlanId = "plan_dual",
            Status = SubscriptionStatus.Active,
            StartsAt = DateTime.UtcNow.AddDays(-1),
            ExpiresAt = DateTime.UtcNow.AddDays(89)
        });

        await context.SaveChangesAsync();

        // 1. RN candidate has RN access, but NOT PN access
        var rnUserRnEval = await entitlementService.EvaluateEntitlementAsync("usr_rn_only", "rn");
        Assert.True(rnUserRnEval.IsEntitled);

        var rnUserPnEval = await entitlementService.EvaluateEntitlementAsync("usr_rn_only", "pn");
        Assert.False(rnUserPnEval.IsEntitled);

        // 2. Dual candidate has BOTH RN and PN access
        var dualUserRnEval = await entitlementService.EvaluateEntitlementAsync("usr_dual", "rn");
        Assert.True(dualUserRnEval.IsEntitled);

        var dualUserPnEval = await entitlementService.EvaluateEntitlementAsync("usr_dual", "pn");
        Assert.True(dualUserPnEval.IsEntitled);

        // 3. Feature-level entitlement checks
        var qbankAccess = await entitlementService.EvaluateFeatureAccessAsync("usr_rn_only", "practice_exams");
        Assert.True(qbankAccess.IsEntitled);

        // Unsubscribed user has no access
        var noSubAccess = await entitlementService.EvaluateFeatureAccessAsync("usr_no_sub", "practice_exams");
        Assert.False(noSubAccess.IsEntitled);
    }
}
