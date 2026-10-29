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

    public List<string>? Entitlements { get; set; }
}
