using System.ComponentModel.DataAnnotations;

namespace Preform.Api.DTOs;

public class CheckoutRequest
{
    [Required]
    public string PlanId { get; set; } = string.Empty;

    public string? Pathway { get; set; }

    public string? PromoCode { get; set; }

    public string? SuccessUrl { get; set; }

    public string? CancelUrl { get; set; }
}

public class CheckoutResponse
{
    public bool Success { get; set; }
    public string? OrderId { get; set; }
    public string? SessionUrl { get; set; }
    public bool IsSimulated { get; set; }
    public string? Message { get; set; }
    public string? Error { get; set; }
    public int? OriginalAmountCents { get; set; }
    public int? DiscountAmountCents { get; set; }
    public int? FinalAmountCents { get; set; }
    public string? PromoCodeApplied { get; set; }
}

public class ValidatePromoRequest
{
    [Required]
    public string Code { get; set; } = string.Empty;

    public string? PlanId { get; set; }
}

public class PromoDiscountDto
{
    public bool Valid { get; set; }
    public string Code { get; set; } = string.Empty;
    public decimal DiscountPercent { get; set; }
    public int DiscountCents { get; set; }
    public int OriginalPriceCents { get; set; }
    public int FinalPriceCents { get; set; }
    public string? Message { get; set; }
    public string? Error { get; set; }
}

public class EntitlementsResponse
{
    public bool Success { get; set; } = true;
    public string UserId { get; set; } = string.Empty;
    public string ActivePlan { get; set; } = string.Empty;
    public List<string> Pathways { get; set; } = new();
    public List<string> Entitlements { get; set; } = new();
    public List<UserSubscriptionSummaryDto> Subscriptions { get; set; } = new();
}

public class UserSubscriptionSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string StartsAt { get; set; } = string.Empty;
    public string ExpiresAt { get; set; } = string.Empty;
}

public class PaymentWebhookRequest
{
    [Required]
    public string EventId { get; set; } = string.Empty;

    [Required]
    public string EventType { get; set; } = string.Empty; // e.g. "payment_intent.succeeded", "checkout.session.completed", "customer.subscription.deleted"

    public string? OrderId { get; set; }

    public string? ProviderSessionId { get; set; }

    public int AmountCents { get; set; }

    public string? RawPayload { get; set; }
}
