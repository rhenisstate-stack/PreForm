using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/entitlements")]
[Authorize]
public class EntitlementsController : ControllerBase
{
    private readonly ICheckoutService _checkoutService;

    public EntitlementsController(ICheckoutService checkoutService)
    {
        _checkoutService = checkoutService;
    }

    [HttpGet]
    public async Task<IActionResult> GetEntitlements(CancellationToken cancellationToken)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { success = false, error = "Authentication is required to view entitlements." });
        }

        var response = await _checkoutService.GetUserEntitlementsAsync(userId, cancellationToken);
        return Ok(response);
    }
}
