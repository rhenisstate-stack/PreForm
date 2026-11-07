using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

public interface ISubscriptionService
{
    Task<SubscriptionCatalogDto> GetActivePlansAsync(CancellationToken cancellationToken = default);
    Task<SubscriptionCatalogDto> GetAllPlansAsync(CancellationToken cancellationToken = default);
    Task<SubscriptionPlanDto?> GetPlanByIdOrSlugAsync(string idOrSlug, CancellationToken cancellationToken = default);
    Task<SubscriptionPlanDto> CreatePlanAsync(CreateSubscriptionPlanDto dto, string? actorUserId = null, CancellationToken cancellationToken = default);
    Task<SubscriptionPlanDto?> UpdatePlanAsync(string idOrSlug, UpdateSubscriptionPlanDto dto, string? actorUserId = null, CancellationToken cancellationToken = default);
    Task<bool> ArchivePlanAsync(string idOrSlug, string? actorUserId = null, CancellationToken cancellationToken = default);
    Task<bool> RestorePlanAsync(string idOrSlug, string? actorUserId = null, CancellationToken cancellationToken = default);
    Task<(bool Success, string? Error, SubscriptionPlanDto? Plan)> DuplicatePlanAsync(string idOrSlug, string? actorUserId = null, CancellationToken cancellationToken = default);
    Task<(bool Success, string? Error)> DeletePlanAsync(string idOrSlug, string? actorUserId = null, CancellationToken cancellationToken = default);
    Task<bool> UpdatePublicationStatusAsync(string idOrSlug, PlanPublicationStatus status, string? actorUserId = null, CancellationToken cancellationToken = default);

    // Appearance
    Task<SubscriptionPlanAppearanceDto?> GetPlanAppearanceAsync(string? planId = null, CancellationToken cancellationToken = default);
    Task<SubscriptionPlanAppearanceDto> SavePlanAppearanceAsync(string? planId, UpdatePlanAppearanceDto dto, string? actorUserId = null, CancellationToken cancellationToken = default);
    Task<SubscriptionPlanAppearanceDto?> RevertToPreviousAppearanceAsync(string? planId, string? actorUserId = null, CancellationToken cancellationToken = default);

    // Entitlements
    Task<List<EntitlementDefinitionDto>> GetEntitlementDefinitionsAsync(CancellationToken cancellationToken = default);
    Task<List<string>> GetPlanEntitlementsAsync(string planId, CancellationToken cancellationToken = default);
    Task<bool> ConfigurePlanEntitlementsAsync(string planId, List<string> entitlementCodes, string? actorUserId = null, CancellationToken cancellationToken = default);
}

public class SubscriptionService : ISubscriptionService
{
    private readonly AppDbContext _context;
    private readonly ILogger<SubscriptionService> _logger;

    public SubscriptionService(AppDbContext context, ILogger<SubscriptionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public static SubscriptionPlanDto MapToDto(SubscriptionPlan p)
    {
        var features = new List<string>();
        try
        {
            if (!string.IsNullOrWhiteSpace(p.FeaturesJson))
            {
                features = JsonSerializer.Deserialize<List<string>>(p.FeaturesJson) ?? new List<string>();
            }
        }
        catch { }

        var entitlements = new List<string>();
        try
        {
            if (!string.IsNullOrWhiteSpace(p.EntitlementsJson))
            {
                entitlements = JsonSerializer.Deserialize<List<string>>(p.EntitlementsJson) ?? new List<string>();
            }
        }
        catch
        {
            entitlements = p.Pathway == "Both" ? new List<string> { "rn", "pn" } : new List<string> { p.Pathway.ToLowerInvariant() };
        }

        return new SubscriptionPlanDto
        {
            Id = p.Id,
            Slug = p.Slug,
            Name = p.Name,
            Description = p.Description,
            Audience = p.Audience,
            Pathway = p.Pathway,
            PlanType = p.PlanType,
            Price = p.PriceCents / 100,
            PriceCents = p.PriceCents,
            OriginalPrice = p.OriginalPriceCents.HasValue ? p.OriginalPriceCents.Value / 100 : null,
            OriginalPriceCents = p.OriginalPriceCents,
            Currency = p.Currency,
            BillingInterval = p.BillingInterval,
            DurationLabel = p.DurationLabel,
            Features = features,
            Popular = p.Popular,
            BgColour = p.BgColour,
            AccentColour = p.AccentColour,
            TextColour = p.TextColour,
            BadgeText = p.BadgeText,
            DisplayOrder = p.DisplayOrder,
            IsActive = p.IsActive,
            PublicationStatus = p.PublicationStatus.ToString().ToLowerInvariant(),
            Version = p.Version,
            Entitlements = entitlements
        };
    }

    public async Task<SubscriptionCatalogDto> GetActivePlansAsync(CancellationToken cancellationToken = default)
    {
        var plans = await _context.SubscriptionPlans
            .Where(p => p.IsActive)
            .OrderBy(p => p.DisplayOrder)
            .ThenBy(p => p.Name)
            .ToListAsync(cancellationToken);

        return new SubscriptionCatalogDto
        {
            Success = true,
            Count = plans.Count,
            Plans = plans.Select(MapToDto).ToList()
        };
    }

    public async Task<SubscriptionCatalogDto> GetAllPlansAsync(CancellationToken cancellationToken = default)
    {
        var plans = await _context.SubscriptionPlans
            .OrderBy(p => p.DisplayOrder)
            .ThenBy(p => p.Name)
            .ToListAsync(cancellationToken);

        return new SubscriptionCatalogDto
        {
            Success = true,
            Count = plans.Count,
            Plans = plans.Select(MapToDto).ToList()
        };
    }

    public async Task<SubscriptionPlanDto?> GetPlanByIdOrSlugAsync(string idOrSlug, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idOrSlug)) return null;
        var normalized = idOrSlug.Trim().ToLowerInvariant();

        var plan = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id.ToLower() == normalized || p.Slug.ToLower() == normalized || p.Code.ToLower() == normalized, cancellationToken);

        return plan != null ? MapToDto(plan) : null;
    }

    public async Task<SubscriptionPlanDto> CreatePlanAsync(CreateSubscriptionPlanDto dto, string? actorUserId = null, CancellationToken cancellationToken = default)
    {
        var normalizedSlug = dto.Slug.Trim().ToLowerInvariant();
        if (await _context.SubscriptionPlans.AnyAsync(p => p.Slug.ToLower() == normalizedSlug || p.Id.ToLower() == normalizedSlug, cancellationToken))
        {
            throw new InvalidOperationException($"A subscription plan with slug or ID '{normalizedSlug}' already exists.");
        }

        var now = DateTime.UtcNow;
        var priceCents = (int)Math.Round(dto.Price * 100);
        var originalPriceCents = dto.OriginalPrice.HasValue ? (int?)Math.Round(dto.OriginalPrice.Value * 100) : null;

        var entitlements = dto.Entitlements ?? (dto.Pathway.Equals("Both", StringComparison.OrdinalIgnoreCase)
            ? new List<string> { "rn", "pn" }
            : new List<string> { dto.Pathway.ToLowerInvariant() });

        var plan = new SubscriptionPlan
        {
            Id = normalizedSlug,
            Slug = normalizedSlug,
            Code = normalizedSlug,
            Name = dto.Name.Trim(),
            Description = dto.Description.Trim(),
            Audience = dto.Audience?.Trim(),
            Pathway = dto.Pathway,
            PlanType = dto.PlanType,
            PriceCents = priceCents,
            OriginalPriceCents = originalPriceCents,
            Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "USD" : dto.Currency.ToUpperInvariant(),
            Interval = dto.BillingInterval.ToLowerInvariant() switch
            {
                "quarter" => SubscriptionInterval.Quarterly,
                "annual" => SubscriptionInterval.Annual,
                "one-time" => SubscriptionInterval.OneTime,
                _ => SubscriptionInterval.Monthly
            },
            BillingInterval = dto.BillingInterval.ToLowerInvariant(),
            DurationLabel = dto.DurationLabel?.Trim(),
            FeaturesJson = JsonSerializer.Serialize(dto.Features ?? new List<string>()),
            Popular = dto.Popular,
            BgColour = dto.BgColour?.Trim(),
            AccentColour = dto.AccentColour?.Trim(),
            TextColour = dto.TextColour?.Trim(),
            BadgeText = dto.BadgeText?.Trim(),
            DisplayOrder = dto.DisplayOrder,
            IsActive = dto.IsActive,
            EntitlementsJson = JsonSerializer.Serialize(entitlements),
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.SubscriptionPlans.Add(plan);

        if (!string.IsNullOrWhiteSpace(actorUserId))
        {
            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = actorUserId,
                Action = "SubscriptionPlanCreated",
                EntityType = "SubscriptionPlan",
                EntityId = plan.Id,
                Description = $"Created plan '{plan.Name}' (${dto.Price})",
                Outcome = "Success",
                Timestamp = now
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return MapToDto(plan);
    }

    public async Task<SubscriptionPlanDto?> UpdatePlanAsync(string idOrSlug, UpdateSubscriptionPlanDto dto, string? actorUserId = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idOrSlug)) return null;
        var normalized = idOrSlug.Trim().ToLowerInvariant();

        var plan = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id.ToLower() == normalized || p.Slug.ToLower() == normalized, cancellationToken);

        if (plan == null) return null;

        var now = DateTime.UtcNow;

        if (dto.Name != null) plan.Name = dto.Name.Trim();
        if (dto.Description != null) plan.Description = dto.Description.Trim();
        if (dto.Audience != null) plan.Audience = dto.Audience.Trim();
        if (dto.Pathway != null) plan.Pathway = dto.Pathway;
        if (dto.PlanType != null) plan.PlanType = dto.PlanType;
        if (dto.Price.HasValue) plan.PriceCents = (int)Math.Round(dto.Price.Value * 100);
        if (dto.OriginalPrice.HasValue) plan.OriginalPriceCents = (int)Math.Round(dto.OriginalPrice.Value * 100);
        if (dto.Currency != null) plan.Currency = dto.Currency.ToUpperInvariant();
        if (dto.BillingInterval != null)
        {
            plan.BillingInterval = dto.BillingInterval.ToLowerInvariant();
            plan.Interval = plan.BillingInterval switch
            {
                "quarter" => SubscriptionInterval.Quarterly,
                "annual" => SubscriptionInterval.Annual,
                "one-time" => SubscriptionInterval.OneTime,
                _ => SubscriptionInterval.Monthly
            };
        }
        if (dto.DurationLabel != null) plan.DurationLabel = dto.DurationLabel.Trim();
        if (dto.Features != null) plan.FeaturesJson = JsonSerializer.Serialize(dto.Features);
        if (dto.Popular.HasValue) plan.Popular = dto.Popular.Value;
        if (dto.BgColour != null) plan.BgColour = dto.BgColour.Trim();
        if (dto.AccentColour != null) plan.AccentColour = dto.AccentColour.Trim();
        if (dto.TextColour != null) plan.TextColour = dto.TextColour.Trim();
        if (dto.BadgeText != null) plan.BadgeText = dto.BadgeText.Trim();
        if (dto.DisplayOrder.HasValue) plan.DisplayOrder = dto.DisplayOrder.Value;
        if (dto.IsActive.HasValue) plan.IsActive = dto.IsActive.Value;
        if (dto.Entitlements != null) plan.EntitlementsJson = JsonSerializer.Serialize(dto.Entitlements);

        plan.UpdatedAt = now;

        if (!string.IsNullOrWhiteSpace(actorUserId))
        {
            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = actorUserId,
                Action = "SubscriptionPlanUpdated",
                EntityType = "SubscriptionPlan",
                EntityId = plan.Id,
                Description = $"Updated plan '{plan.Name}'",
                Outcome = "Success",
                Timestamp = now
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return MapToDto(plan);
    }

    public async Task<bool> ArchivePlanAsync(string idOrSlug, string? actorUserId = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idOrSlug)) return false;
        var normalized = idOrSlug.Trim().ToLowerInvariant();

        var plan = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id.ToLower() == normalized || p.Slug.ToLower() == normalized, cancellationToken);

        if (plan == null) return false;

        var now = DateTime.UtcNow;
        plan.IsActive = false;
        plan.UpdatedAt = now;

        if (!string.IsNullOrWhiteSpace(actorUserId))
        {
            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = actorUserId,
                Action = "SubscriptionPlanArchived",
                EntityType = "SubscriptionPlan",
                EntityId = plan.Id,
                Description = $"Soft-deleted / archived plan '{plan.Name}'",
                Outcome = "Success",
                Timestamp = now
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> RestorePlanAsync(string idOrSlug, string? actorUserId = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idOrSlug)) return false;
        var normalized = idOrSlug.Trim().ToLowerInvariant();

        var plan = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id.ToLower() == normalized || p.Slug.ToLower() == normalized, cancellationToken);

        if (plan == null) return false;

        var now = DateTime.UtcNow;
        plan.IsActive = true;
        plan.PublicationStatus = PlanPublicationStatus.Published;
        plan.UpdatedAt = now;

        if (!string.IsNullOrWhiteSpace(actorUserId))
        {
            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = actorUserId,
                Action = "SubscriptionPlanRestored",
                EntityType = "SubscriptionPlan",
                EntityId = plan.Id,
                Description = $"Restored archived plan '{plan.Name}' to active published state",
                Outcome = "Success",
                Timestamp = now
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<(bool Success, string? Error, SubscriptionPlanDto? Plan)> DuplicatePlanAsync(string idOrSlug, string? actorUserId = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idOrSlug)) return (false, "Plan identifier is required.", null);
        var normalized = idOrSlug.Trim().ToLowerInvariant();

        var original = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id.ToLower() == normalized || p.Slug.ToLower() == normalized, cancellationToken);

        if (original == null) return (false, "Original plan not found.", null);

        var now = DateTime.UtcNow;
        var suffix = Guid.NewGuid().ToString("N")[..6];
        var duplicateSlug = $"{original.Slug}-copy-{suffix}";

        var duplicatedPlan = new SubscriptionPlan
        {
            Id = Guid.NewGuid().ToString("N"),
            Slug = duplicateSlug,
            Name = $"{original.Name} (Copy)",
            Code = string.IsNullOrWhiteSpace(original.Code) ? duplicateSlug : $"{original.Code}-copy-{suffix}",
            Description = original.Description,
            Audience = original.Audience,
            Pathway = original.Pathway,
            PlanType = original.PlanType,
            PriceCents = original.PriceCents,
            OriginalPriceCents = original.OriginalPriceCents,
            Currency = original.Currency,
            Interval = original.Interval,
            BillingInterval = original.BillingInterval,
            DurationLabel = original.DurationLabel,
            FeaturesJson = original.FeaturesJson,
            Popular = false,
            BgColour = original.BgColour,
            AccentColour = original.AccentColour,
            TextColour = original.TextColour,
            BadgeText = original.BadgeText,
            DisplayOrder = original.DisplayOrder + 1,
            IsActive = false,
            PublicationStatus = PlanPublicationStatus.Draft,
            Version = 1,
            EntitlementsJson = original.EntitlementsJson,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.SubscriptionPlans.Add(duplicatedPlan);

        if (!string.IsNullOrWhiteSpace(actorUserId))
        {
            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = actorUserId,
                Action = "SubscriptionPlanDuplicated",
                EntityType = "SubscriptionPlan",
                EntityId = duplicatedPlan.Id,
                Description = $"Duplicated plan '{original.Name}' to '{duplicatedPlan.Name}' ({duplicateSlug})",
                Outcome = "Success",
                Timestamp = now
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return (true, null, MapToDto(duplicatedPlan));
    }

    public async Task<(bool Success, string? Error)> DeletePlanAsync(string idOrSlug, string? actorUserId = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idOrSlug)) return (false, "Plan identifier is required.");
        var normalized = idOrSlug.Trim().ToLowerInvariant();

        var plan = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id.ToLower() == normalized || p.Slug.ToLower() == normalized, cancellationToken);

        if (plan == null) return (false, "Plan not found.");

        // Financial & Access Invariant Guard: Prevent hard deletion if referenced
        var hasSubscriptions = await _context.UserSubscriptions.AnyAsync(s => s.PlanId == plan.Id, cancellationToken);
        if (hasSubscriptions)
        {
            return (false, "Cannot permanently delete plan: Active or historical candidate subscriptions are linked to this plan. Please archive the plan instead to preserve audit records.");
        }

        var hasOrders = await _context.Orders.AnyAsync(o => o.PlanId == plan.Id, cancellationToken);
        if (hasOrders)
        {
            return (false, "Cannot permanently delete plan: Financial transaction records and orders exist for this plan. Please archive the plan instead.");
        }

        var now = DateTime.UtcNow;
        _context.SubscriptionPlans.Remove(plan);

        if (!string.IsNullOrWhiteSpace(actorUserId))
        {
            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = actorUserId,
                Action = "SubscriptionPlanDeleted",
                EntityType = "SubscriptionPlan",
                EntityId = plan.Id,
                Description = $"Permanently deleted unused plan '{plan.Name}' ({plan.Slug})",
                Outcome = "Success",
                Timestamp = now
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return (true, null);
    }

    public async Task<bool> UpdatePublicationStatusAsync(string idOrSlug, PlanPublicationStatus status, string? actorUserId = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idOrSlug)) return false;
        var normalized = idOrSlug.Trim().ToLowerInvariant();

        var plan = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id.ToLower() == normalized || p.Slug.ToLower() == normalized, cancellationToken);

        if (plan == null) return false;

        var now = DateTime.UtcNow;
        plan.PublicationStatus = status;
        plan.IsActive = (status == PlanPublicationStatus.Published);
        plan.UpdatedAt = now;

        if (!string.IsNullOrWhiteSpace(actorUserId))
        {
            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = actorUserId,
                Action = "SubscriptionPlanPublicationStatusUpdated",
                EntityType = "SubscriptionPlan",
                EntityId = plan.Id,
                Description = $"Set plan '{plan.Name}' status to {status}",
                Outcome = "Success",
                Timestamp = now
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    // ── Appearance Customization ──

    public async Task<SubscriptionPlanAppearanceDto?> GetPlanAppearanceAsync(string? planId = null, CancellationToken cancellationToken = default)
    {
        var query = _context.SubscriptionPlanAppearances.AsQueryable();
        if (!string.IsNullOrWhiteSpace(planId))
        {
            query = query.Where(a => a.PlanId == planId);
        }
        else
        {
            query = query.Where(a => a.PlanId == null);
        }

        var appearance = await query
            .OrderByDescending(a => a.Version)
            .FirstOrDefaultAsync(cancellationToken);

        if (appearance == null)
        {
            return new SubscriptionPlanAppearanceDto
            {
                Id = "appr_default",
                PlanId = planId,
                Version = 1,
                IsPublished = true,
                TypographyJson = "{\"fontFamily\":\"sans\",\"headingSize\":\"1.5rem\",\"priceSize\":\"2.25rem\",\"descriptionSize\":\"0.875rem\",\"featureListSize\":\"0.875rem\",\"lineHeight\":\"1.5\",\"letterSpacing\":\"normal\",\"textAlign\":\"left\"}",
                ColorsJson = "{\"titleColor\":\"#1e293b\",\"priceColor\":\"#0f766e\",\"descriptionColor\":\"#64748b\",\"featureTextColor\":\"#334155\",\"billingPeriodColor\":\"#64748b\",\"badgeBgColor\":\"#0f766e\",\"badgeTextColor\":\"#ffffff\",\"buttonBgColor\":\"#0f766e\",\"buttonTextColor\":\"#ffffff\"}",
                CardStylingJson = "{\"backgroundColor\":\"#ffffff\",\"borderColor\":\"#e2e8f0\",\"borderWidth\":\"1px\",\"borderRadius\":\"1.5rem\",\"shadow\":\"md\",\"hoverEffect\":\"elevate\",\"recommendedBgColor\":\"#f0fdfa\"}",
                ButtonStylingJson = "{\"backgroundColor\":\"#0f766e\",\"textColor\":\"#ffffff\",\"borderRadius\":\"0.75rem\",\"fontSize\":\"0.875rem\",\"hoverBgColor\":\"#0d9488\",\"hoverTextColor\":\"#ffffff\",\"label\":\"Choose Plan\"}",
                LayoutJson = "{\"padding\":\"1.5rem\",\"cardWidth\":\"100%\",\"cardSpacing\":\"1.5rem\",\"featureListSpacing\":\"0.75rem\",\"badgePosition\":\"top-right\"}",
                CreatedAt = DateTime.UtcNow
            };
        }

        return new SubscriptionPlanAppearanceDto
        {
            Id = appearance.Id,
            PlanId = appearance.PlanId,
            Version = appearance.Version,
            IsPublished = appearance.IsPublished,
            TypographyJson = appearance.TypographyJson,
            ColorsJson = appearance.ColorsJson,
            CardStylingJson = appearance.CardStylingJson,
            ButtonStylingJson = appearance.ButtonStylingJson,
            LayoutJson = appearance.LayoutJson,
            CreatedAt = appearance.CreatedAt,
            CreatedBy = appearance.CreatedBy,
            PublishedAt = appearance.PublishedAt,
            PublishedBy = appearance.PublishedBy
        };
    }

    public async Task<SubscriptionPlanAppearanceDto> SavePlanAppearanceAsync(string? planId, UpdatePlanAppearanceDto dto, string? actorUserId = null, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        var latestVersion = await _context.SubscriptionPlanAppearances
            .Where(a => a.PlanId == planId)
            .OrderByDescending(a => a.Version)
            .Select(a => a.Version)
            .FirstOrDefaultAsync(cancellationToken);

        var appearance = new SubscriptionPlanAppearance
        {
            Id = "appr_" + Guid.NewGuid().ToString("N"),
            PlanId = planId,
            Version = latestVersion + 1,
            IsPublished = dto.PublishImmediately,
            TypographyJson = dto.TypographyJson ?? "{}",
            ColorsJson = dto.ColorsJson ?? "{}",
            CardStylingJson = dto.CardStylingJson ?? "{}",
            ButtonStylingJson = dto.ButtonStylingJson ?? "{}",
            LayoutJson = dto.LayoutJson ?? "{}",
            CreatedAt = now,
            CreatedBy = actorUserId,
            PublishedAt = dto.PublishImmediately ? now : null,
            PublishedBy = dto.PublishImmediately ? actorUserId : null
        };

        _context.SubscriptionPlanAppearances.Add(appearance);

        if (!string.IsNullOrWhiteSpace(actorUserId))
        {
            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = actorUserId,
                Action = dto.PublishImmediately ? "SubscriptionAppearancePublished" : "SubscriptionAppearanceSavedDraft",
                EntityType = "SubscriptionPlanAppearance",
                EntityId = appearance.Id,
                Description = $"Saved appearance version {appearance.Version} for {(planId == null ? "Global Default" : $"Plan {planId}")}",
                Outcome = "Success",
                Timestamp = now
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new SubscriptionPlanAppearanceDto
        {
            Id = appearance.Id,
            PlanId = appearance.PlanId,
            Version = appearance.Version,
            IsPublished = appearance.IsPublished,
            TypographyJson = appearance.TypographyJson,
            ColorsJson = appearance.ColorsJson,
            CardStylingJson = appearance.CardStylingJson,
            ButtonStylingJson = appearance.ButtonStylingJson,
            LayoutJson = appearance.LayoutJson,
            CreatedAt = appearance.CreatedAt,
            CreatedBy = appearance.CreatedBy,
            PublishedAt = appearance.PublishedAt,
            PublishedBy = appearance.PublishedBy
        };
    }

    public async Task<SubscriptionPlanAppearanceDto?> RevertToPreviousAppearanceAsync(string? planId, string? actorUserId = null, CancellationToken cancellationToken = default)
    {
        var priorVersions = await _context.SubscriptionPlanAppearances
            .Where(a => a.PlanId == planId && a.IsPublished)
            .OrderByDescending(a => a.Version)
            .Skip(1)
            .FirstOrDefaultAsync(cancellationToken);

        if (priorVersions == null) return null;

        var saveDto = new UpdatePlanAppearanceDto
        {
            TypographyJson = priorVersions.TypographyJson,
            ColorsJson = priorVersions.ColorsJson,
            CardStylingJson = priorVersions.CardStylingJson,
            ButtonStylingJson = priorVersions.ButtonStylingJson,
            LayoutJson = priorVersions.LayoutJson,
            PublishImmediately = true
        };

        return await SavePlanAppearanceAsync(planId, saveDto, actorUserId, cancellationToken);
    }

    // ── Entitlements ──

    public async Task<List<EntitlementDefinitionDto>> GetEntitlementDefinitionsAsync(CancellationToken cancellationToken = default)
    {
        var definitions = await _context.EntitlementDefinitions
            .OrderBy(e => e.Category)
            .ThenBy(e => e.Name)
            .ToListAsync(cancellationToken);

        if (definitions.Count == 0)
        {
            // Seed default catalog
            var defaultDefinitions = new List<EntitlementDefinition>
            {
                new() { Code = "practice_exams", Name = "Practice Examinations", Category = "Examinations", Description = "Access to full NCLEX-style practice exams", CoursePathway = "Both" },
                new() { Code = "custom_tests", Name = "Custom Standalone Tests", Category = "Examinations", Description = "Build custom tests filtered by Client Needs and domain", CoursePathway = "Both" },
                new() { Code = "rats", Name = "Readiness Assessment Tests", Category = "Assessments", Description = "CAT-based predictive NCLEX readiness tests", CoursePathway = "Both" },
                new() { Code = "study_guide", Name = "7-Domain Clinical Study Guide", Category = "Learning", Description = "Full access to NCLEX core clinical curriculum notes", CoursePathway = "Both" },
                new() { Code = "flashcards", Name = "AI Study Studio Flashcards", Category = "Learning", Description = "Custom and pre-curated nursing flashcard decks", CoursePathway = "Both" },
                new() { Code = "spaced_repetition", Name = "Spaced Repetition Review Engine", Category = "Learning", Description = "Automated cognitive recall and review schedule", CoursePathway = "Both" },
                new() { Code = "quizzes", Name = "Topic & Category Quizzes", Category = "Examinations", Description = "Quick-fire micro quizzes by nursing clinical area", CoursePathway = "Both" },
                new() { Code = "performance_reports", Name = "Performance Intelligence", Category = "Analytics", Description = "Detailed diagnostic reports and weak-area analysis", CoursePathway = "Both" }
            };

            _context.EntitlementDefinitions.AddRange(defaultDefinitions);
            await _context.SaveChangesAsync(cancellationToken);
            definitions = defaultDefinitions;
        }

        return definitions.Select(d => new EntitlementDefinitionDto
        {
            Code = d.Code,
            Name = d.Name,
            Category = d.Category,
            Description = d.Description,
            CoursePathway = d.CoursePathway,
            IsActive = d.IsActive
        }).ToList();
    }

    public async Task<List<string>> GetPlanEntitlementsAsync(string planId, CancellationToken cancellationToken = default)
    {
        return await _context.SubscriptionPlanEntitlements
            .Where(e => e.PlanId == planId)
            .Select(e => e.EntitlementCode)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> ConfigurePlanEntitlementsAsync(string planId, List<string> entitlementCodes, string? actorUserId = null, CancellationToken cancellationToken = default)
    {
        var plan = await _context.SubscriptionPlans.FindAsync(new object[] { planId }, cancellationToken);
        if (plan == null) return false;

        var existing = await _context.SubscriptionPlanEntitlements
            .Where(e => e.PlanId == planId)
            .ToListAsync(cancellationToken);

        _context.SubscriptionPlanEntitlements.RemoveRange(existing);

        var now = DateTime.UtcNow;
        foreach (var code in entitlementCodes.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            _context.SubscriptionPlanEntitlements.Add(new SubscriptionPlanEntitlement
            {
                Id = Guid.NewGuid().ToString("N"),
                PlanId = planId,
                EntitlementCode = code.Trim().ToLowerInvariant(),
                CreatedAt = now
            });
        }

        // Keep EntitlementsJson synchronized for backward compatibility
        plan.EntitlementsJson = JsonSerializer.Serialize(entitlementCodes);
        plan.UpdatedAt = now;

        if (!string.IsNullOrWhiteSpace(actorUserId))
        {
            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = actorUserId,
                Action = "PlanEntitlementsConfigured",
                EntityType = "SubscriptionPlan",
                EntityId = plan.Id,
                Description = $"Configured entitlements for plan '{plan.Name}': {string.Join(", ", entitlementCodes)}",
                Outcome = "Success",
                Timestamp = now
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
