using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Preform.Api.Models;

public enum SubscriptionInterval
{
    Monthly = 1,
    Quarterly = 2,
    Annual = 3
}

public enum SubscriptionStatus
{
    Active = 1,
    PastDue = 2,
    Cancelled = 3,
    Expired = 4
}

[Table("SubscriptionPlans", Schema = "public")]
public class SubscriptionPlan
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string Code { get; set; } = string.Empty; // e.g. "nclex-rn-pro", "all-access"

    public int PriceCents { get; set; } = 5900;

    public SubscriptionInterval Interval { get; set; } = SubscriptionInterval.Monthly;

    public string FeaturesJson { get; set; } = "[]";

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("UserSubscriptions", Schema = "public")]
public class UserSubscription
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    [Required]
    public string PlanId { get; set; } = string.Empty;
    public SubscriptionPlan Plan { get; set; } = null!;

    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Active;

    public DateTime StartsAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMonths(1);

    public DateTime? CancelledAt { get; set; }
}
