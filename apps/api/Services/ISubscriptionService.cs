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
}
