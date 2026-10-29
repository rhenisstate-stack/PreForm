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
}
