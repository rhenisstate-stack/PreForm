using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/admin/subscriptions")]
[Authorize(Policy = "RequireAdmin")]
public class AdminSubscriptionsController : ControllerBase
{
    private readonly ISubscriptionService _subscriptionService;

    public AdminSubscriptionsController(ISubscriptionService subscriptionService)
    {
        _subscriptionService = subscriptionService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllPlans(CancellationToken cancellationToken)
    {
        var catalog = await _subscriptionService.GetAllPlansAsync(cancellationToken);
        return Ok(catalog);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePlan([FromBody] CreateSubscriptionPlanDto dto, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, error = "Validation failed for subscription plan." });
        }

        var actorUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        try
        {
            var plan = await _subscriptionService.CreatePlanAsync(dto, actorUserId, cancellationToken);
            return CreatedAtAction(nameof(SubscriptionsController.GetPlanById), "Subscriptions", new { idOrSlug = plan.Slug }, new { success = true, plan });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, error = ex.Message });
        }
    }

    [HttpPut("{idOrSlug}")]
    public async Task<IActionResult> UpdatePlan(string idOrSlug, [FromBody] UpdateSubscriptionPlanDto dto, CancellationToken cancellationToken)
    {
        var actorUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var plan = await _subscriptionService.UpdatePlanAsync(idOrSlug, dto, actorUserId, cancellationToken);

        if (plan == null)
        {
            return NotFound(new { success = false, error = "Subscription plan not found." });
        }

        return Ok(new { success = true, plan });
    }

    [HttpDelete("{idOrSlug}")]
    public async Task<IActionResult> ArchivePlan(string idOrSlug, CancellationToken cancellationToken)
    {
        var actorUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var success = await _subscriptionService.ArchivePlanAsync(idOrSlug, actorUserId, cancellationToken);

        if (!success)
        {
            return NotFound(new { success = false, error = "Subscription plan not found." });
        }

        return Ok(new { success = true, message = "Subscription plan successfully archived." });
    }

    [HttpPost("{idOrSlug}/restore")]
    public async Task<IActionResult> RestorePlan(string idOrSlug, CancellationToken cancellationToken)
    {
        var actorUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var success = await _subscriptionService.RestorePlanAsync(idOrSlug, actorUserId, cancellationToken);

        if (!success)
        {
            return NotFound(new { success = false, error = "Subscription plan not found." });
        }

        return Ok(new { success = true, message = "Subscription plan successfully restored." });
    }

    [HttpPost("{idOrSlug}/duplicate")]
    public async Task<IActionResult> DuplicatePlan(string idOrSlug, CancellationToken cancellationToken)
    {
        var actorUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var result = await _subscriptionService.DuplicatePlanAsync(idOrSlug, actorUserId, cancellationToken);

        if (!result.Success)
        {
            return BadRequest(new { success = false, error = result.Error });
        }

        return Ok(new { success = true, plan = result.Plan, message = "Plan duplicated successfully as draft." });
    }

    [HttpDelete("{idOrSlug}/hard-delete")]
    [Authorize(Policy = "RequireSuperAdmin")]
    public async Task<IActionResult> HardDeletePlan(string idOrSlug, CancellationToken cancellationToken)
    {
        var actorUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var result = await _subscriptionService.DeletePlanAsync(idOrSlug, actorUserId, cancellationToken);

        if (!result.Success)
        {
            return Conflict(new { success = false, error = result.Error });
        }

        return Ok(new { success = true, message = "Subscription plan permanently deleted." });
    }

    [HttpPut("{idOrSlug}/publication-status")]
    public async Task<IActionResult> UpdatePublicationStatus(string idOrSlug, [FromBody] UpdatePublicationStatusRequest request, CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<Preform.Api.Models.PlanPublicationStatus>(request.Status, true, out var status))
        {
            return BadRequest(new { success = false, error = "Invalid publication status. Supported: Draft, Published, Archived." });
        }

        var actorUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var success = await _subscriptionService.UpdatePublicationStatusAsync(idOrSlug, status, actorUserId, cancellationToken);

        if (!success)
        {
            return NotFound(new { success = false, error = "Subscription plan not found." });
        }

        return Ok(new { success = true, message = $"Subscription plan status set to {status}." });
    }

    // ── Appearance Endpoints ──

    [HttpGet("appearance")]
    public async Task<IActionResult> GetPlanAppearance([FromQuery] string? planId, CancellationToken cancellationToken)
    {
        var appearance = await _subscriptionService.GetPlanAppearanceAsync(planId, cancellationToken);
        return Ok(new { success = true, appearance });
    }

    [HttpPost("appearance")]
    [Authorize(Policy = "RequireSuperAdmin")]
    public async Task<IActionResult> SavePlanAppearance([FromQuery] string? planId, [FromBody] UpdatePlanAppearanceDto dto, CancellationToken cancellationToken)
    {
        var actorUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var appearance = await _subscriptionService.SavePlanAppearanceAsync(planId, dto, actorUserId, cancellationToken);
        return Ok(new { success = true, appearance, message = dto.PublishImmediately ? "Appearance published successfully." : "Draft appearance saved." });
    }

    [HttpPost("appearance/revert")]
    [Authorize(Policy = "RequireSuperAdmin")]
    public async Task<IActionResult> RevertPlanAppearance([FromQuery] string? planId, CancellationToken cancellationToken)
    {
        var actorUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var appearance = await _subscriptionService.RevertToPreviousAppearanceAsync(planId, actorUserId, cancellationToken);

        if (appearance == null)
        {
            return BadRequest(new { success = false, error = "No previous published version found to revert to." });
        }

        return Ok(new { success = true, appearance, message = "Appearance reverted to previous published version." });
    }

    // ── Entitlement Configuration Endpoints ──

    [HttpGet("entitlements/definitions")]
    public async Task<IActionResult> GetEntitlementDefinitions(CancellationToken cancellationToken)
    {
        var definitions = await _subscriptionService.GetEntitlementDefinitionsAsync(cancellationToken);
        return Ok(new { success = true, definitions });
    }

    [HttpGet("{id}/entitlements")]
    public async Task<IActionResult> GetPlanEntitlements(string id, CancellationToken cancellationToken)
    {
        var entitlements = await _subscriptionService.GetPlanEntitlementsAsync(id, cancellationToken);
        return Ok(new { success = true, planId = id, entitlements });
    }

    [HttpPut("{id}/entitlements")]
    [Authorize(Policy = "RequireSuperAdmin")]
    public async Task<IActionResult> ConfigurePlanEntitlements(string id, [FromBody] ConfigurePlanEntitlementsDto dto, CancellationToken cancellationToken)
    {
        var actorUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var success = await _subscriptionService.ConfigurePlanEntitlementsAsync(id, dto.EntitlementCodes, actorUserId, cancellationToken);

        if (!success)
        {
            return NotFound(new { success = false, error = "Subscription plan not found." });
        }

        return Ok(new { success = true, message = "Plan entitlements successfully updated." });
    }
}

public class UpdatePublicationStatusRequest
{
    public string Status { get; set; } = "Published";
}
