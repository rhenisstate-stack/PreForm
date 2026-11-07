using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Preform.Api.Models;

public enum SubscriptionInterval
{
    Monthly = 1,
    Quarterly = 2,
    Annual = 3,
    OneTime = 4
}

public enum SubscriptionStatus
{
    Active = 1,
    PastDue = 2,
    Cancelled = 3,
    Expired = 4,
    Suspended = 5,
    Revoked = 6
}

public enum PaymentMethod
{
    Card = 1,
    Cash = 2,
    MPesa = 3,
    BankTransfer = 4,
    DirectDeposit = 5,
    Other = 6
}

public enum PaymentVerificationStatus
{
    PendingVerification = 1,
    Verified = 2,
    Rejected = 3,
    Refunded = 4,
    Reversed = 5,
    Cancelled = 6
}

public enum PlanPublicationStatus
{
    Draft = 1,
    Published = 2,
    Archived = 3
}

public enum OrderStatus
{
    Pending = 1,
    Completed = 2,
    Failed = 3,
    Cancelled = 4,
    Refunded = 5
}

[Table("SubscriptionPlans", Schema = "public")]
public class SubscriptionPlan
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string Slug { get; set; } = string.Empty;

    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(64)]
    public string Code { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(256)]
    public string? Audience { get; set; }

    [Required]
    [MaxLength(32)]
    public string Pathway { get; set; } = "RN"; // "RN", "PN", "Both"

    [Required]
    [MaxLength(64)]
    public string PlanType { get; set; } = "pro"; // "starter", "pro", "premium", "readiness"

    public int PriceCents { get; set; } = 5900;

    public int? OriginalPriceCents { get; set; }

    [MaxLength(10)]
    public string Currency { get; set; } = "USD";

    public SubscriptionInterval Interval { get; set; } = SubscriptionInterval.Monthly;

    [MaxLength(32)]
    public string BillingInterval { get; set; } = "month"; // "month", "quarter", "one-time"

    [MaxLength(64)]
    public string? DurationLabel { get; set; }

    public string FeaturesJson { get; set; } = "[]";

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

    public string EntitlementsJson { get; set; } = "[\"rn\"]";

    public PlanPublicationStatus PublicationStatus { get; set; } = PlanPublicationStatus.Published;

    public int Version { get; set; } = 1;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("UserSubscriptions", Schema = "public")]
public class UserSubscription
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    [Required]
    [MaxLength(128)]
    public string PlanId { get; set; } = string.Empty;
    public SubscriptionPlan Plan { get; set; } = null!;

    [MaxLength(128)]
    public string? OrderId { get; set; }
    public Order? Order { get; set; }

    [Required]
    [MaxLength(32)]
    public string Pathway { get; set; } = "rn"; // "rn", "pn", "both"

    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Active;

    public DateTime StartsAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMonths(1);

    public DateTime? CancelledAt { get; set; }

    public DateTime? SuspendedAt { get; set; }

    [MaxLength(512)]
    public string? SuspensionReason { get; set; }

    [MaxLength(128)]
    public string? CancelledBy { get; set; }

    public DateTime? ExtendedAt { get; set; }

    [MaxLength(128)]
    public string? ExtendedBy { get; set; }

    public bool IsManual { get; set; } = false;

    [MaxLength(128)]
    public string? ManualAuthorizationId { get; set; }

    [MaxLength(1024)]
    public string? Notes { get; set; }
}

[Table("Orders", Schema = "public")]
public class Order
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    [Required]
    [MaxLength(128)]
    public string PlanId { get; set; } = string.Empty;
    public SubscriptionPlan Plan { get; set; } = null!;

    public int AmountCents { get; set; }

    [MaxLength(10)]
    public string Currency { get; set; } = "USD";

    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    [MaxLength(64)]
    public string Provider { get; set; } = "simulated"; // "stripe", "paypal", "simulated"

    [MaxLength(256)]
    public string? ProviderSessionId { get; set; }

    [MaxLength(256)]
    public string? ProviderPaymentId { get; set; }

    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Card;

    [MaxLength(128)]
    public string? ReceiptNumber { get; set; }

    [MaxLength(128)]
    public string? TransactionReference { get; set; }

    [MaxLength(2048)]
    public string? Notes { get; set; }

    [MaxLength(1024)]
    public string? PaymentEvidenceUrl { get; set; }

    [MaxLength(128)]
    public string? VerifiedBy { get; set; }

    public DateTime? VerifiedAt { get; set; }

    [MaxLength(128)]
    public string? ManualAuthorizationId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<PaymentTransaction> Transactions { get; set; } = new List<PaymentTransaction>();
}

[Table("PaymentTransactions", Schema = "public")]
public class PaymentTransaction
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [MaxLength(128)]
    public string? OrderId { get; set; }
    public Order? Order { get; set; }

    [Required]
    [MaxLength(128)]
    public string ProviderEventId { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string EventType { get; set; } = string.Empty;

    public int AmountCents { get; set; }

    [MaxLength(32)]
    public string Status { get; set; } = "processed";

    public string PayloadJson { get; set; } = "{}";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("ManualSubscriptionAuthorizations", Schema = "public")]
public class ManualSubscriptionAuthorization
{
    [Key]
    public string Id { get; set; } = "man_auth_" + Guid.NewGuid().ToString("N");

    [Required]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    [Required]
    [MaxLength(128)]
    public string PlanId { get; set; } = string.Empty;
    public SubscriptionPlan Plan { get; set; } = null!;

    [Required]
    [MaxLength(32)]
    public string Pathway { get; set; } = "rn";

    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;

    public int AmountCents { get; set; }

    [MaxLength(10)]
    public string Currency { get; set; } = "USD";

    [MaxLength(128)]
    public string? TransactionReference { get; set; }

    [MaxLength(128)]
    public string? ReceiptNumber { get; set; }

    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

    [MaxLength(1024)]
    public string? EvidenceUrl { get; set; }

    [MaxLength(2048)]
    public string? Notes { get; set; }

    public PaymentVerificationStatus Status { get; set; } = PaymentVerificationStatus.PendingVerification;

    [MaxLength(128)]
    public string RequestedByAdminId { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? VerifiedByAdminId { get; set; }

    [MaxLength(1024)]
    public string? RejectionReason { get; set; }

    [MaxLength(128)]
    public string? SubscriptionId { get; set; }
    public UserSubscription? Subscription { get; set; }

    [MaxLength(128)]
    public string? OrderId { get; set; }
    public Order? Order { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? VerifiedAt { get; set; }
}

[Table("SubscriptionPlanAppearances", Schema = "public")]
public class SubscriptionPlanAppearance
{
    [Key]
    public string Id { get; set; } = "appr_" + Guid.NewGuid().ToString("N");

    [MaxLength(128)]
    public string? PlanId { get; set; } // null represents global default template
    public SubscriptionPlan? Plan { get; set; }

    public int Version { get; set; } = 1;
    public bool IsPublished { get; set; } = true;

    public string TypographyJson { get; set; } = "{}";
    public string ColorsJson { get; set; } = "{}";
    public string CardStylingJson { get; set; } = "{}";
    public string ButtonStylingJson { get; set; } = "{}";
    public string LayoutJson { get; set; } = "{}";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [MaxLength(128)]
    public string? CreatedBy { get; set; }
    public DateTime? PublishedAt { get; set; }
    [MaxLength(128)]
    public string? PublishedBy { get; set; }
}

[Table("EntitlementDefinitions", Schema = "public")]
public class EntitlementDefinition
{
    [Key]
    [MaxLength(64)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(64)]
    public string Category { get; set; } = "General";

    [MaxLength(512)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(32)]
    public string CoursePathway { get; set; } = "Both"; // "RN", "PN", "Both"

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("SubscriptionPlanEntitlements", Schema = "public")]
public class SubscriptionPlanEntitlement
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    [Required]
    [MaxLength(128)]
    public string PlanId { get; set; } = string.Empty;
    public SubscriptionPlan Plan { get; set; } = null!;

    [Required]
    [MaxLength(64)]
    public string EntitlementCode { get; set; } = string.Empty;
    public EntitlementDefinition Entitlement { get; set; } = null!;

    public int? UsageLimit { get; set; } // null = unlimited

    public string MetadataJson { get; set; } = "{}";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
