using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/health")]
public class HealthController : ControllerBase
{
    private readonly HealthCheckService _healthCheckService;

    public HealthController(HealthCheckService healthCheckService)
    {
        _healthCheckService = healthCheckService;
    }

    [HttpGet("live")]
    public async Task<IActionResult> Live()
    {
        return Ok(new { status = "ok" });
    }

    [HttpGet("ready")]
    public async Task<IActionResult> Ready()
    {
        var report = await _healthCheckService.CheckHealthAsync();

        if (report.Status == Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Healthy)
        {
            return Ok(new { status = "ready" });
        }

        return StatusCode(503, new { status = "not ready", error = "Service unavailable" });
    }
}
