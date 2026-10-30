using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

public interface ICheckoutService
{
    Task<CheckoutResponse> CreateCheckoutSessionAsync(
        string userId,
        CheckoutRequest request,
        CancellationToken cancellationToken = default);

    Task<EntitlementsResponse> GetUserEntitlementsAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task<bool> ProcessPaymentWebhookAsync(
        PaymentWebhookRequest webhook,
        string? signatureHeader,
        CancellationToken cancellationToken = default);

    PromoDiscountDto ValidatePromoCode(string? code, string? planId = null, int? basePriceCents = null);
}

public class CheckoutService : ICheckoutService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<CheckoutService> _logger;

    public static readonly Dictionary<string, (decimal Percent, string Description)> ActivePromoCodes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            { "FUTURENURSE", (10m, "10% Future Nurse Community Discount") },
            { "NURSE10", (10m, "10% Nursing Student Discount") },
            { "PREPFORD10", (10m, "10% PrepFord Welcome Discount") },
            { "CLINICAL20", (20m, "20% Clinical Excellence Discount") }
        };

    public CheckoutService(
        AppDbContext context,
        IConfiguration configuration,
        ILogger<CheckoutService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public PromoDiscountDto ValidatePromoCode(string? code, string? planId = null, int? basePriceCents = null)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return new PromoDiscountDto
            {
                Valid = false,
                Error = "Please enter a promotional code."
            };
        }

        var cleanCode = code.Trim().ToUpperInvariant();
        if (!ActivePromoCodes.TryGetValue(cleanCode, out var promo))
        {
            return new PromoDiscountDto
            {
                Valid = false,
                Code = cleanCode,
                Error = $"The code '{cleanCode}' is invalid or expired."
            };
        }

        int originalPrice = basePriceCents ?? 0;
        if (originalPrice == 0 && !string.IsNullOrWhiteSpace(planId))
        {
            var plan = _context.SubscriptionPlans.FirstOrDefault(p => p.Id == planId || p.Slug == planId);
            if (plan != null) originalPrice = plan.PriceCents;
        }

        int discountCents = originalPrice > 0 ? (int)Math.Round(originalPrice * (promo.Percent / 100m)) : 0;
        int finalPrice = Math.Max(0, originalPrice - discountCents);

        return new PromoDiscountDto
        {
            Valid = true,
            Code = cleanCode,
            DiscountPercent = promo.Percent,
            DiscountCents = discountCents,
            OriginalPriceCents = originalPrice,
            FinalPriceCents = finalPrice,
            Message = $"{promo.Percent:0}% discount applied: {promo.Description}"
        };
    }

    private string GetAppEnvironment()
    {
        var appEnv = _configuration["APP_ENV"] ?? _configuration["ASPNETCORE_ENVIRONMENT"] ?? "development";
        return appEnv.Trim().ToLowerInvariant();
    }

    private bool IsSandboxCheckoutPermitted()
    {
        var env = GetAppEnvironment();
        if (env == "production" || env == "prod")
        {
            return false;
        }

        var enableMock = _configuration["ENABLE_MOCK_CHECKOUT"];
        return string.Equals(enableMock, "true", StringComparison.OrdinalIgnoreCase);
    }

    public async Task<CheckoutResponse> CreateCheckoutSessionAsync(
        string userId,
        CheckoutRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.PlanId))
        {
            return new CheckoutResponse { Success = false, Error = "Plan ID is required for checkout." };
        }

        var normalizedPlanId = request.PlanId.Trim().ToLowerInvariant();
        var plan = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id.ToLower() == normalizedPlanId || p.Slug.ToLower() == normalizedPlanId, cancellationToken);

        if (plan == null || !plan.IsActive)
        {
            return new CheckoutResponse { Success = false, Error = "Requested plan is inactive or unavailable." };
        }

        var user = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null || !user.IsActive)
        {
            return new CheckoutResponse { Success = false, Error = "Authenticated candidate record not found or inactive." };
        }

        var env = GetAppEnvironment();

        // Strict Production Gate
        if (env == "production" || env == "prod")
        {
            _logger.LogWarning("Checkout attempt in production rejected: Live payment gateway is pending configuration.");
            return new CheckoutResponse
            {
                Success = false,
                Error = "Live payment gateway configuration is pending. Real transactions are temporarily disabled."
            };
        }

        // Sandbox / Staging Checkout
        if (IsSandboxCheckoutPermitted())
        {
            int originalAmountCents = plan.PriceCents;
            int discountAmountCents = 0;
            string? appliedCode = null;

            if (!string.IsNullOrWhiteSpace(request.PromoCode))
            {
                var promoValidation = ValidatePromoCode(request.PromoCode, plan.Id, plan.PriceCents);
                if (!promoValidation.Valid)
                {
                    return new CheckoutResponse
                    {
                        Success = false,
                        Error = promoValidation.Error ?? $"The promotional code '{request.PromoCode}' is invalid."
                    };
                }

                appliedCode = promoValidation.Code;
                discountAmountCents = promoValidation.DiscountCents;
            }

            int finalAmountCents = Math.Max(0, originalAmountCents - discountAmountCents);

            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                var now = DateTime.UtcNow;
                var durationDays = plan.Interval switch
                {
                    SubscriptionInterval.Quarterly => 90,
                    SubscriptionInterval.Annual => 365,
                    SubscriptionInterval.OneTime => 365,
                    _ => 30
                };
                var expiresAt = now.AddDays(durationDays);

                var order = new Order
                {
                    Id = "ord_" + Guid.NewGuid().ToString("N"),
                    UserId = user.Id,
                    PlanId = plan.Id,
                    AmountCents = finalAmountCents,
                    Currency = plan.Currency,
                    Status = OrderStatus.Completed,
                    Provider = "simulated",
                    ProviderSessionId = "sim_sess_" + Guid.NewGuid().ToString("N"),
                    ProviderPaymentId = appliedCode != null ? $"sim_pay_{appliedCode.ToLowerInvariant()}" : "sim_pay_" + Guid.NewGuid().ToString("N"),
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _context.Orders.Add(order);

                var userSub = new UserSubscription
                {
                    Id = "sub_" + Guid.NewGuid().ToString("N"),
                    UserId = user.Id,
                    PlanId = plan.Id,
                    OrderId = order.Id,
                    Pathway = plan.Pathway.ToLowerInvariant(),
                    Status = SubscriptionStatus.Active,
                    StartsAt = now,
                    ExpiresAt = expiresAt
                };
                _context.UserSubscriptions.Add(userSub);

                // Update authoritative User active plan and pathway
                user.ActivePlan = plan.Name;
                if (!string.Equals(plan.Pathway, "both", StringComparison.OrdinalIgnoreCase))
                {
                    user.Pathway = plan.Pathway.ToLowerInvariant();
                }
                user.UpdatedAt = now;

                _context.AuditLogs.Add(new AuditLog
                {
                    ActorId = user.Id,
                    Action = "CheckoutCompleted",
                    EntityType = "Order",
                    EntityId = order.Id,
                    Description = appliedCode != null
                        ? $"Completed simulated purchase of '{plan.Name}' (${finalAmountCents / 100.0:F2}) with {appliedCode} (Discount: ${discountAmountCents / 100.0:F2})"
                        : $"Completed simulated purchase of '{plan.Name}' (${finalAmountCents / 100.0:F2})",
                    Outcome = "Success",
                    Timestamp = now
                });

                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                return new CheckoutResponse
                {
                    Success = true,
                    OrderId = order.Id,
                    SessionUrl = request.SuccessUrl ?? "/dashboard?checkout=success",
                    IsSimulated = true,
                    OriginalAmountCents = originalAmountCents,
                    DiscountAmountCents = discountAmountCents,
                    FinalAmountCents = finalAmountCents,
                    PromoCodeApplied = appliedCode,
                    Message = appliedCode != null
                        ? $"Simulated sandbox transaction completed with {appliedCode} discount (${discountAmountCents / 100.0:F2} off). Paid entitlement activated."
                        : "Simulated sandbox transaction completed. Paid entitlement activated."
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                _logger.LogError(ex, "Transaction failed during simulated checkout.");
                return new CheckoutResponse { Success = false, Error = "An error occurred during transaction processing." };
            }
        }

        return new CheckoutResponse
        {
            Success = false,
            Error = "Checkout is disabled in this environment."
        };
    }

    public async Task<EntitlementsResponse> GetUserEntitlementsAsync(string userId, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null)
        {
            return new EntitlementsResponse { Success = false };
        }

        var now = DateTime.UtcNow;
        var activeSubs = await _context.UserSubscriptions
            .Include(us => us.Plan)
            .Where(us => us.UserId == userId && us.Status == SubscriptionStatus.Active && us.ExpiresAt > now)
            .ToListAsync(cancellationToken);

        var pathways = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var entitlements = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var sub in activeSubs)
        {
            if (sub.Plan != null)
            {
                if (sub.Plan.Pathway.Equals("Both", StringComparison.OrdinalIgnoreCase))
                {
                    pathways.Add("rn");
                    pathways.Add("pn");
                }
                else
                {
                    pathways.Add(sub.Plan.Pathway.ToLowerInvariant());
                }

                try
                {
                    var planEntitlements = JsonSerializer.Deserialize<List<string>>(sub.Plan.EntitlementsJson);
                    if (planEntitlements != null)
                    {
                        foreach (var ent in planEntitlements) entitlements.Add(ent.ToLowerInvariant());
                    }
                }
                catch { }
            }
        }

        if (pathways.Count == 0)
        {
            pathways.Add(user.Pathway.ToLowerInvariant());
        }

        return new EntitlementsResponse
        {
            Success = true,
            UserId = user.Id,
            ActivePlan = user.ActivePlan,
            Pathways = pathways.ToList(),
            Entitlements = entitlements.ToList(),
            Subscriptions = activeSubs.Select(s => new UserSubscriptionSummaryDto
            {
                Id = s.Id,
                PlanId = s.PlanId,
                PlanName = s.Plan?.Name ?? "Plan",
                Pathway = s.Pathway,
                Status = s.Status.ToString(),
                StartsAt = s.StartsAt.ToString("o"),
                ExpiresAt = s.ExpiresAt.ToString("o")
            }).ToList()
        };
    }

    public async Task<bool> ProcessPaymentWebhookAsync(
        PaymentWebhookRequest webhook,
        string? signatureHeader,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(webhook.EventId))
        {
            return false;
        }

        // 1. Signature Verification with Timing-Safe Comparison & Fail-Closed Enforcement
        var env = GetAppEnvironment();
        var isProd = env == "production" || env == "prod";

        if (isProd && string.IsNullOrWhiteSpace(signatureHeader))
        {
            _logger.LogWarning("Webhook rejected in production: Missing required signature header.");
            return false;
        }

        var webhookSecret = _configuration["WEBHOOK_SIGNING_SECRET"] ?? "prepford-default-test-webhook-secret-32-chars!";
        if (!string.IsNullOrWhiteSpace(signatureHeader))
        {
            var raw = webhook.RawPayload ?? $"{webhook.EventId}|{webhook.EventType}";
            var expectedSignature = Convert.ToHexString(
                HMACSHA256.HashData(Encoding.UTF8.GetBytes(webhookSecret), Encoding.UTF8.GetBytes(raw))
            ).ToLowerInvariant();

            var sigBytes = Encoding.UTF8.GetBytes(signatureHeader.Trim().ToLowerInvariant());
            var expectedBytes = Encoding.UTF8.GetBytes(expectedSignature);

            if (sigBytes.Length != expectedBytes.Length || !CryptographicOperations.FixedTimeEquals(sigBytes, expectedBytes))
            {
                _logger.LogWarning("Webhook signature mismatch for event {EventId}", webhook.EventId);
                return false;
            }
        }

        // 2. Idempotency Check: Reject duplicate event delivery
        if (await _context.PaymentTransactions.AnyAsync(pt => pt.ProviderEventId == webhook.EventId, cancellationToken))
        {
            _logger.LogInformation("Webhook event {EventId} already processed. Skipping idempotently.", webhook.EventId);
            return true;
        }

        var now = DateTime.UtcNow;
        var transactionRecord = new PaymentTransaction
        {
            Id = Guid.NewGuid().ToString(),
            OrderId = webhook.OrderId,
            ProviderEventId = webhook.EventId,
            EventType = webhook.EventType,
            AmountCents = webhook.AmountCents,
            Status = "processed",
            PayloadJson = webhook.RawPayload ?? "{}",
            CreatedAt = now
        };
        _context.PaymentTransactions.Add(transactionRecord);

        // 3. Process business event
        if (webhook.EventType == "payment_intent.succeeded" || webhook.EventType == "checkout.session.completed")
        {
            if (!string.IsNullOrWhiteSpace(webhook.OrderId))
            {
                var order = await _context.Orders
                    .Include(o => o.Plan)
                    .Include(o => o.User)
                    .FirstOrDefaultAsync(o => o.Id == webhook.OrderId, cancellationToken);

                if (order != null)
                {
                    order.Status = OrderStatus.Completed;
                    order.UpdatedAt = now;

                    var durationDays = order.Plan?.Interval switch
                    {
                        SubscriptionInterval.Quarterly => 90,
                        SubscriptionInterval.Annual => 365,
                        _ => 30
                    };

                    var sub = new UserSubscription
                    {
                        Id = "sub_" + Guid.NewGuid().ToString("N"),
                        UserId = order.UserId,
                        PlanId = order.PlanId,
                        OrderId = order.Id,
                        Pathway = order.Plan?.Pathway.ToLowerInvariant() ?? "rn",
                        Status = SubscriptionStatus.Active,
                        StartsAt = now,
                        ExpiresAt = now.AddDays(durationDays)
                    };
                    _context.UserSubscriptions.Add(sub);

                    if (order.User != null && order.Plan != null)
                    {
                        order.User.ActivePlan = order.Plan.Name;
                    }
                }
            }
        }
        else if (webhook.EventType == "customer.subscription.deleted")
        {
            if (!string.IsNullOrWhiteSpace(webhook.OrderId))
            {
                var sub = await _context.UserSubscriptions
                    .FirstOrDefaultAsync(s => s.OrderId == webhook.OrderId, cancellationToken);
                if (sub != null)
                {
                    sub.Status = SubscriptionStatus.Cancelled;
                    sub.CancelledAt = now;
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
