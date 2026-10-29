using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/subscriptions")]
public class SubscriptionsController : ControllerBase
{
    private readonly ISubscriptionService _subscriptionService;

    public SubscriptionsController(ISubscriptionService subscriptionService)
    {
        _subscriptionService = subscriptionService;
    }

    [HttpGet]
    public async Task<IActionResult> GetActivePlans(CancellationToken cancellationToken)
    {
        var catalog = await _subscriptionService.GetActivePlansAsync(cancellationToken);
        return Ok(catalog);
    }

    [HttpGet("{idOrSlug}")]
    public async Task<IActionResult> GetPlanById(string idOrSlug, CancellationToken cancellationToken)
    {
        var plan = await _subscriptionService.GetPlanByIdOrSlugAsync(idOrSlug, cancellationToken);
        if (plan is null)
        {
            return NotFound(new { success = false, error = "Subscription plan not found." });
        }

        return Ok(new { success = true, plan });
    }
}
