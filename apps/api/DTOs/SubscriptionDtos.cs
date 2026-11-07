using System.ComponentModel.DataAnnotations;

namespace Preform.Api.DTOs;

public class SubscriptionPlanDto
{
    public string Id { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Audience { get; set; }
    public string Pathway { get; set; } = "RN"; // "RN", "PN", "Both"
    public string PlanType { get; set; } = "pro";
    public int Price { get; set; } // in dollars (e.g. 59)
    public int PriceCents { get; set; } // in cents (e.g. 5900)
    public int? OriginalPrice { get; set; }
    public int? OriginalPriceCents { get; set; }
    public string Currency { get; set; } = "USD";
    public string BillingInterval { get; set; } = "month";
    public string? DurationLabel { get; set; }
    public List<string> Features { get; set; } = new();
    public bool Popular { get; set; }
    public string? BgColour { get; set; }
    public string? AccentColour { get; set; }
    public string? TextColour { get; set; }
    public string? BadgeText { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public string PublicationStatus { get; set; } = "published";
    public int Version { get; set; } = 1;
    public List<string> Entitlements { get; set; } = new();
}

public class SubscriptionCatalogDto
{
    public bool Success { get; set; } = true;
    public int Count { get; set; }
    public List<SubscriptionPlanDto> Plans { get; set; } = new();
}

public class CreateSubscriptionPlanDto
{
    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(128)]
    public string Slug { get; set; } = string.Empty;

    [Required]
    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(256)]
    public string? Audience { get; set; }

    [Required]
    public string Pathway { get; set; } = "RN"; // "RN", "PN", "Both"

    [Required]
    public string PlanType { get; set; } = "pro";

    [Required]
    [Range(0, 100000)]
    public decimal Price { get; set; } // Can be passed in dollars

    public decimal? OriginalPrice { get; set; }

    [MaxLength(10)]
    public string Currency { get; set; } = "USD";

    [Required]
    public string BillingInterval { get; set; } = "month"; // "month", "quarter", "one-time"

    [MaxLength(64)]
    public string? DurationLabel { get; set; }

    public List<string> Features { get; set; } = new();

    public bool Popular { get; set; } = false;

    [MaxLength(32)]
    public string? BgColour { get; set; }

    [MaxLength(32)]
    public string? AccentColour { get; set; }

    [MaxLength(32)]
    public string? TextColour { get; set; }

    [MaxLength(64)]
    public string? BadgeText { get; set; }

    public int DisplayOrder { get; set; } = 0;

    public bool IsActive { get; set; } = true;

    public string? PublicationStatus { get; set; } = "published";

    public List<string>? Entitlements { get; set; }
}

public class UpdateSubscriptionPlanDto
{
    [MaxLength(128)]
    public string? Name { get; set; }

    [MaxLength(1024)]
    public string? Description { get; set; }

    [MaxLength(256)]
    public string? Audience { get; set; }

    public string? Pathway { get; set; }

    public string? PlanType { get; set; }

    public decimal? Price { get; set; }

    public decimal? OriginalPrice { get; set; }

    public string? Currency { get; set; }

    public string? BillingInterval { get; set; }

    public string? DurationLabel { get; set; }

    public List<string>? Features { get; set; }

    public bool? Popular { get; set; }

    public string? BgColour { get; set; }

    public string? AccentColour { get; set; }

    public string? TextColour { get; set; }

    public string? BadgeText { get; set; }

    public int? DisplayOrder { get; set; }

    public bool? IsActive { get; set; }

    public string? PublicationStatus { get; set; }

    public List<string>? Entitlements { get; set; }
}

// ── Appearance DTOs ──
public class SubscriptionPlanAppearanceDto
{
    public string Id { get; set; } = string.Empty;
    public string? PlanId { get; set; }
    public int Version { get; set; } = 1;
    public bool IsPublished { get; set; } = true;
    public string TypographyJson { get; set; } = "{}";
    public string ColorsJson { get; set; } = "{}";
    public string CardStylingJson { get; set; } = "{}";
    public string ButtonStylingJson { get; set; } = "{}";
    public string LayoutJson { get; set; } = "{}";
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? PublishedAt { get; set; }
    public string? PublishedBy { get; set; }
}

public class UpdatePlanAppearanceDto
{
    public string? TypographyJson { get; set; }
    public string? ColorsJson { get; set; }
    public string? CardStylingJson { get; set; }
    public string? ButtonStylingJson { get; set; }
    public string? LayoutJson { get; set; }
    public bool PublishImmediately { get; set; } = false;
}

// ── Manual Authorization DTOs ──
public class RecordManualPaymentDto
{
    [Required]
    public string UserId { get; set; } = string.Empty;

    [Required]
    public string PlanId { get; set; } = string.Empty;

    public string PaymentMethod { get; set; } = "Cash"; // "Cash", "MPesa", "BankTransfer", "DirectDeposit", "Other"

    [Required]
    [Range(0, 1000000)]
    public decimal Amount { get; set; }

    public string Currency { get; set; } = "USD";

    public string? TransactionReference { get; set; }

    public string? ReceiptNumber { get; set; }

    public DateTime? PaymentDate { get; set; }

    public string? EvidenceUrl { get; set; }

    public string? Notes { get; set; }

    public bool AutoVerifyAndActivate { get; set; } = false;
}

public class VerifyManualPaymentDto
{
    [Required]
    public bool Approved { get; set; }

    public string? RejectionReason { get; set; }

    public string? Notes { get; set; }
}

public class ManualAuthorizationResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int AmountCents { get; set; }
    public string Currency { get; set; } = "USD";
    public string? TransactionReference { get; set; }
    public string? ReceiptNumber { get; set; }
    public DateTime PaymentDate { get; set; }
    public string? EvidenceUrl { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = string.Empty;
    public string RequestedByAdminId { get; set; } = string.Empty;
    public string? VerifiedByAdminId { get; set; }
    public string? RejectionReason { get; set; }
    public string? SubscriptionId { get; set; }
    public string? OrderId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? VerifiedAt { get; set; }
}

// ── Learner Subscription Admin DTOs ──
public class AdminLearnerSubscriptionDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime StartsAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public int RemainingDays { get; set; }
    public bool IsManual { get; set; }
    public string? OrderId { get; set; }
    public string? PaymentMethod { get; set; }
    public decimal? AmountPaid { get; set; }
    public DateTime? SuspendedAt { get; set; }
    public string? SuspensionReason { get; set; }
    public DateTime? ExtendedAt { get; set; }
    public string? ExtendedBy { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancelledBy { get; set; }
    public string? Notes { get; set; }
}

public class ExtendSubscriptionDto
{
    [Required]
    [Range(1, 365)]
    public int AdditionalDays { get; set; } = 30;

    public string? Notes { get; set; }
}

public class SuspendSubscriptionDto
{
    [Required]
    [MaxLength(512)]
    public string Reason { get; set; } = string.Empty;
}

public class CancelSubscriptionDto
{
    public string? Reason { get; set; }
    public bool Immediate { get; set; } = true;
}

// ── Revenue Analytics DTOs ──
public class MonetizationAnalyticsSummaryDto
{
    public decimal TotalRevenue { get; set; }
    public decimal CurrentMonthRevenue { get; set; }
    public decimal PreviousMonthRevenue { get; set; }
    public decimal GrossCollected { get; set; }
    public decimal TotalRefunds { get; set; }
    public decimal NetRevenue { get; set; }
    public decimal PendingOfflineAmount { get; set; }

    public int ActiveSubscriptionsCount { get; set; }
    public int PendingAuthorizationsCount { get; set; }
    public int ExpiredSubscriptionsCount { get; set; }
    public int CancelledSubscriptionsCount { get; set; }
    public int SuspendedSubscriptionsCount { get; set; }
    public int OnlineSubscriptionsCount { get; set; }
    public int ManualSubscriptionsCount { get; set; }

    public Dictionary<string, decimal> RevenueByCourse { get; set; } = new();
    public Dictionary<string, decimal> RevenueByPlan { get; set; } = new();
    public Dictionary<string, decimal> RevenueByPaymentMethod { get; set; } = new();

    public List<AdminLearnerSubscriptionDto> RecentActivations { get; set; } = new();
    public List<ManualAuthorizationResponseDto> PendingVerifications { get; set; } = new();
}

public class AdminPaymentTransactionDto
{
    public string Id { get; set; } = string.Empty;
    public string? OrderId { get; set; }
    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public string? UserEmail { get; set; }
    public string? PlanName { get; set; }
    public string ProviderEventId { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int AmountCents { get; set; }
    public string Currency { get; set; } = "USD";
    public string Status { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public string? TransactionReference { get; set; }
    public DateTime CreatedAt { get; set; }
}

// ── Entitlement DTOs ──
public class EntitlementDefinitionDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CoursePathway { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public class ConfigurePlanEntitlementsDto
{
    public List<string> EntitlementCodes { get; set; } = new();
}
