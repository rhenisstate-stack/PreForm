using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.Services.Monitoring;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/admin/monitoring")]
[Authorize(Policy = "RequireAdmin")]
public class AdminMonitoringController : ControllerBase
{
    private readonly IOperationalMonitoringService _monitoringService;

    public AdminMonitoringController(IOperationalMonitoringService monitoringService)
    {
        _monitoringService = monitoringService;
    }

    [HttpGet("health")]
    public async Task<IActionResult> GetHealth(CancellationToken ct)
    {
        var health = await _monitoringService.GetOperationalHealthAsync(ct);
        return Ok(new { success = true, data = health });
    }
}
