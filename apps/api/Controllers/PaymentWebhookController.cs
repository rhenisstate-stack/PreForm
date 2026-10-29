using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/webhooks/payments")]
[AllowAnonymous]
public class PaymentWebhookController : ControllerBase
{
    private readonly ICheckoutService _checkoutService;
    private readonly ILogger<PaymentWebhookController> _logger;

    public PaymentWebhookController(
        ICheckoutService checkoutService,
        ILogger<PaymentWebhookController> logger)
    {
        _checkoutService = checkoutService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> HandleWebhook(
        [FromBody] PaymentWebhookRequest webhook,
        CancellationToken cancellationToken)
    {
        var signature = Request.Headers["X-Webhook-Signature"].FirstOrDefault()
            ?? Request.Headers["Stripe-Signature"].FirstOrDefault();

        var success = await _checkoutService.ProcessPaymentWebhookAsync(webhook, signature, cancellationToken);
        if (!success)
        {
            return BadRequest(new { success = false, error = "Webhook signature verification or processing failed." });
        }

        return Ok(new { success = true, eventId = webhook.EventId, message = "Event processed successfully." });
    }
}
