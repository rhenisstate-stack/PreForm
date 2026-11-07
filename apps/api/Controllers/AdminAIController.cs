using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Services.AI;

namespace Preform.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireAdmin")]
[Route("api/v1/admin/ai")]
public class AdminAIController : ControllerBase
{
    private readonly IAIGovernanceService _governance;
    private readonly ILogger<AdminAIController> _logger;

    public AdminAIController(IAIGovernanceService governance, ILogger<AdminAIController> logger)
    {
        _governance = governance;
        _logger = logger;
    }

    [HttpGet("configuration")]
    public async Task<IActionResult> GetConfiguration()
    {
        var config = await _governance.GetConfigurationAsync();
        return Ok(new { success = true, config });
    }

    [HttpPut("configuration")]
    public async Task<IActionResult> UpdateConfiguration([FromBody] UpdateAIConfigurationRequest request)
    {
        var config = await _governance.UpdateConfigurationAsync(request);
        return Ok(new { success = true, config });
    }

    [HttpGet("monitoring")]
    public async Task<IActionResult> GetMonitoring([FromQuery] string? userId = null)
    {
        var monitoring = await _governance.GetMonitoringMetricsAsync(userId);
        return Ok(new { success = true, monitoring });
    }
}
