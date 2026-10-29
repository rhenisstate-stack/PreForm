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
    Expired = 4
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
