using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class PaymentWebhookSecurityTests
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

    private string ComputeHmacSha256(string secret, string payload)
    {
        return Convert.ToHexString(
            HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(payload))
        ).ToLowerInvariant();
    }

    [Fact]
    public async Task ProcessPaymentWebhook_MissingSignatureHeader_RejectedInAllEnvironments()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "WEBHOOK_SIGNING_SECRET", "super-secret-key-32-characters-minimum!" },
                { "ASPNETCORE_ENVIRONMENT", "Development" }
            })
            .Build();

        var service = new CheckoutService(context, config, NullLogger<CheckoutService>.Instance);
        var webhook = new PaymentWebhookRequest
        {
            EventId = "evt_001",
            EventType = "payment_intent.succeeded"
        };

        var result = await service.ProcessPaymentWebhookAsync(webhook, signatureHeader: null);
        Assert.False(result);
    }

    [Fact]
    public async Task ProcessPaymentWebhook_MissingSecretConfiguration_FailsClosed()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "WEBHOOK_SIGNING_SECRET", "" } // Unset
            })
            .Build();

        var service = new CheckoutService(context, config, NullLogger<CheckoutService>.Instance);
        var webhook = new PaymentWebhookRequest
        {
            EventId = "evt_002",
            EventType = "payment_intent.succeeded"
        };

        var result = await service.ProcessPaymentWebhookAsync(webhook, signatureHeader: "some_signature");
        Assert.False(result);
    }

    [Fact]
    public async Task ProcessPaymentWebhook_InvalidSignature_Rejected()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "WEBHOOK_SIGNING_SECRET", "valid-secret-key-32-characters-long!" }
            })
            .Build();

        var service = new CheckoutService(context, config, NullLogger<CheckoutService>.Instance);
        var webhook = new PaymentWebhookRequest
        {
            EventId = "evt_003",
            EventType = "payment_intent.succeeded"
        };

        var result = await service.ProcessPaymentWebhookAsync(webhook, signatureHeader: "invalid_hmac_hex_value");
        Assert.False(result);
    }

    [Fact]
    public async Task ProcessPaymentWebhook_ValidSignature_AcceptedAndEnforcesIdempotency()
    {
        using var context = CreateDbContext(Guid.NewGuid().ToString());
        const string secret = "valid-secret-key-32-characters-long!";
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "WEBHOOK_SIGNING_SECRET", secret }
            })
            .Build();

        var user = new User { Id = "usr_order_test", Email = "buyer@example.com", DisplayName = "Buyer" };
        var plan = new SubscriptionPlan { Id = "plan_paid", Name = "Pro", Pathway = "RN", PriceCents = 4900 };
        var order = new Order
        {
            Id = "ord_001",
            UserId = user.Id,
            PlanId = plan.Id,
            AmountCents = 4900,
            Status = OrderStatus.Pending
        };

        context.Users.Add(user);
        context.SubscriptionPlans.Add(plan);
        context.Orders.Add(order);
        await context.SaveChangesAsync();

        var service = new CheckoutService(context, config, NullLogger<CheckoutService>.Instance);
        var webhook = new PaymentWebhookRequest
        {
            EventId = "evt_unique_101",
            EventType = "payment_intent.succeeded",
            OrderId = order.Id,
            AmountCents = 4900
        };

        var raw = $"{webhook.EventId}|{webhook.EventType}";
        var validSignature = ComputeHmacSha256(secret, raw);

        // First delivery: success
        var firstResult = await service.ProcessPaymentWebhookAsync(webhook, signatureHeader: validSignature);
        Assert.True(firstResult);

        // Verify transaction recorded
        var tx = await context.PaymentTransactions.FirstOrDefaultAsync(t => t.ProviderEventId == "evt_unique_101");
        Assert.NotNull(tx);

        // Second delivery (duplicate): idempotently handled without creating duplicate transactions
        var secondResult = await service.ProcessPaymentWebhookAsync(webhook, signatureHeader: validSignature);
        Assert.True(secondResult);

        var txCount = await context.PaymentTransactions.CountAsync(t => t.ProviderEventId == "evt_unique_101");
        Assert.Equal(1, txCount);
    }
}
