using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.Services.Security;

namespace Preform.Api.Controllers;

public class CreateIpRuleRequest
{
    [Required]
    [MaxLength(64)]
    public string IpAddressOrCidr { get; set; } = string.Empty;

    [Required]
    [MaxLength(16)]
    public string RuleType { get; set; } = "Blacklist"; // "Blacklist" or "Whitelist"

    [MaxLength(256)]
    public string Description { get; set; } = string.Empty;

    public DateTime? ExpiresAt { get; set; }
}

public class UpdateIpRuleRequest
{
    [MaxLength(256)]
    public string? Description { get; set; }

    public bool? IsActive { get; set; }

    public DateTime? ExpiresAt { get; set; }
}

[ApiController]
[Route("api/v1/admin/security/ip-rules")]
[Authorize(Policy = "RequireAdmin")]
public class AdminIpRulesController : ControllerBase
{
    private readonly IIpAccessService _ipAccessService;
    private readonly ILogger<AdminIpRulesController> _logger;

    public AdminIpRulesController(IIpAccessService ipAccessService, ILogger<AdminIpRulesController> logger)
    {
        _ipAccessService = ipAccessService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetRules([FromQuery] string? ruleType, [FromQuery] bool? activeOnly, CancellationToken cancellationToken)
    {
        var rules = await _ipAccessService.GetRulesAsync(ruleType, activeOnly, cancellationToken);
        return Ok(new { success = true, rules });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetRuleById(string id, CancellationToken cancellationToken)
    {
        var rule = await _ipAccessService.GetRuleByIdAsync(id, cancellationToken);
        if (rule == null)
        {
            return NotFound(new { success = false, error = "IP rule not found." });
        }
        return Ok(new { success = true, rule });
    }

    [HttpPost]
    public async Task<IActionResult> CreateRule([FromBody] CreateIpRuleRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid || request == null)
        {
            return BadRequest(new { success = false, error = "Invalid IP rule parameters." });
        }

        var creatorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var created = await _ipAccessService.CreateRuleAsync(
            request.IpAddressOrCidr,
            request.RuleType,
            request.Description,
            creatorId,
            request.ExpiresAt,
            cancellationToken);

        return CreatedAtAction(nameof(GetRuleById), new { id = created.Id }, new { success = true, rule = created });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateRule(string id, [FromBody] UpdateIpRuleRequest request, CancellationToken cancellationToken)
    {
        if (request == null)
        {
            return BadRequest(new { success = false, error = "Invalid request payload." });
        }

        var updated = await _ipAccessService.UpdateRuleAsync(
            id,
            request.Description,
            request.IsActive,
            request.ExpiresAt,
            cancellationToken);

        if (updated == null)
        {
            return NotFound(new { success = false, error = "IP rule not found." });
        }

        return Ok(new { success = true, rule = updated });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRule(string id, CancellationToken cancellationToken)
    {
        var deleted = await _ipAccessService.DeleteRuleAsync(id, cancellationToken);
        if (!deleted)
        {
            return NotFound(new { success = false, error = "IP rule not found." });
        }

        return Ok(new { success = true, message = "IP rule successfully deleted." });
    }
}
