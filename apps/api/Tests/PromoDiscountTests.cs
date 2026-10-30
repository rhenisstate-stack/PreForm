using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class PromoDiscountTests
{
    private AppDbContext CreateInMemoryDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        var context = new AppDbContext(options);
        context.Database.EnsureCreated();

        // Seed test subscription plan
        if (!context.SubscriptionPlans.Any())
        {
            context.SubscriptionPlans.Add(new SubscriptionPlan
            {
                Id = "rn-pro",
                Slug = "nclex-rn-pro",
                Name = "NCLEX-RN Complete Preparation",
                PriceCents = 5900,
                Currency = "USD",
                Pathway = "RN",
                PlanType = "pro",
                Interval = SubscriptionInterval.Monthly,
                IsActive = true
            });
            context.SubscriptionPlans.Add(new SubscriptionPlan
            {
                Id = "rn-annual",
                Slug = "nclex-rn-annual",
                Name = "NCLEX-RN Annual All-Access Pass",
                PriceCents = 27900,
                Currency = "USD",
                Pathway = "RN",
                PlanType = "premium",
                Interval = SubscriptionInterval.Annual,
                IsActive = true
            });
            context.SaveChanges();
        }

        return context;
    }

    private IConfiguration CreateConfiguration(bool enableMock = true, string env = "development")
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["APP_ENV"] = env,
                ["ENABLE_MOCK_CHECKOUT"] = enableMock ? "true" : "false"
            })
            .Build();
    }

    [Theory]
    [InlineData("FUTURENURSE", 10)]
    [InlineData("NURSE10", 10)]
    [InlineData("PREPFORD10", 10)]
    [InlineData("CLINICAL20", 20)]
    public void ValidatePromoCode_RequiredCodes_ReturnAccurateDiscountPercentages(string code, decimal expectedPercent)
    {
        var context = CreateInMemoryDbContext($"Promo_Validate_{code}");
        var config = CreateConfiguration();
        var service = new CheckoutService(context, config, NullLogger<CheckoutService>.Instance);

        var result = service.ValidatePromoCode(code, planId: "rn-pro", basePriceCents: 5900);

        Assert.True(result.Valid);
        Assert.Equal(expectedPercent, result.DiscountPercent);
        Assert.Equal(5900, result.OriginalPriceCents);

        var expectedDiscountCents = (int)Math.Round(5900 * (expectedPercent / 100m));
        Assert.Equal(expectedDiscountCents, result.DiscountCents);
        Assert.Equal(5900 - expectedDiscountCents, result.FinalPriceCents);
    }

    [Theory]
    [InlineData("futurenurse")]
    [InlineData("FutureNurse")]
    [InlineData("  FUTURENURSE  ")]
    [InlineData(" nurse10 ")]
    [InlineData("clinical20")]
    public void ValidatePromoCode_CaseAndWhitespaceNormalization_Succeeds(string code)
    {
        var context = CreateInMemoryDbContext($"Promo_Normalize_{Guid.NewGuid()}");
        var config = CreateConfiguration();
        var service = new CheckoutService(context, config, NullLogger<CheckoutService>.Instance);

        var result = service.ValidatePromoCode(code, basePriceCents: 10000);

        Assert.True(result.Valid);
        Assert.True(result.DiscountCents > 0);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void ValidatePromoCode_EmptyOrNullCode_ReturnsFriendlyError(string? code)
    {
        var context = CreateInMemoryDbContext($"Promo_Empty_{Guid.NewGuid()}");
        var config = CreateConfiguration();
        var service = new CheckoutService(context, config, NullLogger<CheckoutService>.Instance);

        var result = service.ValidatePromoCode(code);

        Assert.False(result.Valid);
        Assert.Equal("Please enter a promotional code.", result.Error);
    }

    [Theory]
    [InlineData("EXPIRED50")]
    [InlineData("FAKECODE")]
    [InlineData("HACK100")]
    public void ValidatePromoCode_InvalidCode_FailsClosed(string code)
    {
        var context = CreateInMemoryDbContext($"Promo_Invalid_{Guid.NewGuid()}");
        var config = CreateConfiguration();
        var service = new CheckoutService(context, config, NullLogger<CheckoutService>.Instance);

        var result = service.ValidatePromoCode(code);

        Assert.False(result.Valid);
        Assert.Contains("invalid or expired", result.Error);
    }

    [Fact]
    public async Task CreateCheckoutSession_WithValidPromoCode_CalculatesDiscountAndUpdatesOrder()
    {
        var context = CreateInMemoryDbContext("Promo_Checkout_Valid");
        var config = CreateConfiguration(enableMock: true);
        var service = new CheckoutService(context, config, NullLogger<CheckoutService>.Instance);

        // Add test user
        var user = new User
        {
            Id = "cand_test_promo",
            Email = "candidate@prepford.com",
            DisplayName = "Test Candidate",
            IsActive = true
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var request = new CheckoutRequest
        {
            PlanId = "rn-pro",
            PromoCode = "CLINICAL20"
        };

        var response = await service.CreateCheckoutSessionAsync(user.Id, request);

        Assert.True(response.Success);
        Assert.Equal("CLINICAL20", response.PromoCodeApplied);
        Assert.Equal(5900, response.OriginalAmountCents);
        Assert.Equal(1180, response.DiscountAmountCents); // 20% of 5900
        Assert.Equal(4720, response.FinalAmountCents); // 5900 - 1180

        // Verify order in database
        var order = await context.Orders.FindAsync(response.OrderId);
        Assert.NotNull(order);
        Assert.Equal(4720, order.AmountCents); // Authoritative discounted amount
    }

    [Fact]
    public async Task CreateCheckoutSession_WithInvalidPromoCode_FailsClosedWithoutCreatingOrder()
    {
        var context = CreateInMemoryDbContext("Promo_Checkout_Invalid");
        var config = CreateConfiguration(enableMock: true);
        var service = new CheckoutService(context, config, NullLogger<CheckoutService>.Instance);

        var user = new User
        {
            Id = "cand_test_invalid_promo",
            Email = "candidate2@prepford.com",
            DisplayName = "Test Candidate 2",
            IsActive = true
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var request = new CheckoutRequest
        {
            PlanId = "rn-pro",
            PromoCode = "BOGUS99"
        };

        var response = await service.CreateCheckoutSessionAsync(user.Id, request);

        Assert.False(response.Success);
        Assert.Contains("invalid", response.Error);

        // Confirm zero orders created
        var ordersCount = await context.Orders.CountAsync();
        Assert.Equal(0, ordersCount);
    }
}
