using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/checkout")]
[Authorize]
public class CheckoutController : ControllerBase
{
    private readonly ICheckoutService _checkoutService;

    public CheckoutController(ICheckoutService checkoutService)
    {
        _checkoutService = checkoutService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateCheckoutSession([FromBody] CheckoutRequest request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { success = false, error = "Authentication is required to initiate checkout." });
        }

        var response = await _checkoutService.CreateCheckoutSessionAsync(userId, request, cancellationToken);
        if (!response.Success)
        {
            return BadRequest(response);
        }

        return Ok(response);
    }

    [HttpPost("validate-promo")]
    [AllowAnonymous]
    public IActionResult ValidatePromoCode([FromBody] ValidatePromoRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new PromoDiscountDto
            {
                Valid = false,
                Error = "Please enter a promotional code."
            });
        }

        var result = _checkoutService.ValidatePromoCode(request.Code, request.PlanId);
        if (!result.Valid)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }
}
