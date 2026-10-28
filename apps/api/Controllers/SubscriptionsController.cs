using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.Models;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/subscriptions")]
public class SubscriptionsController : ControllerBase
{
    private readonly AppDbContext _context;

    public SubscriptionsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetActivePlans(CancellationToken cancellationToken)
    {
        var plans = await _context.SubscriptionPlans
            .Where(p => p.IsActive)
            .OrderBy(p => p.Interval)
            .ThenBy(p => p.PriceCents)
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            count = plans.Count,
            plans
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetPlanById(string id, CancellationToken cancellationToken)
    {
        var plan = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id == id || p.Code == id, cancellationToken);

        if (plan is null)
        {
            return NotFound(new { success = false, error = "Subscription plan not found" });
        }

        return Ok(new { success = true, plan });
    }
}
