using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/client-needs")]
public class ClientNeedsController : ControllerBase
{
    private readonly ICurriculumService _curriculumService;
    private readonly ILogger<ClientNeedsController> _logger;

    public ClientNeedsController(ICurriculumService curriculumService, ILogger<ClientNeedsController> logger)
    {
        _curriculumService = curriculumService;
        _logger = logger;
    }

    [HttpGet]
    [Authorize(Policy = "Permission:content.view")]
    public async Task<IActionResult> GetClientNeeds(
        [FromQuery] string? pathway = null,
        [FromQuery] bool activeOnly = false,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        var clientNeeds = await _curriculumService.GetClientNeedsAsync(pathway, activeOnly, ct);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            clientNeeds = clientNeeds.Where(c =>
                c.Name.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                c.Code.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                c.Description.Contains(s, StringComparison.OrdinalIgnoreCase)).ToList();
        }
        return Ok(new { success = true, clientNeeds });
    }

    [HttpGet("{id}")]
    [Authorize(Policy = "Permission:content.view")]
    public async Task<IActionResult> GetClientNeedById(string id, CancellationToken ct = default)
    {
        var clientNeed = await _curriculumService.GetClientNeedByIdAsync(id, ct);
        if (clientNeed == null) return NotFound(new ProblemDetails { Status = 404, Title = "Client Need Not Found", Detail = $"Client Need '{id}' was not found." });
        return Ok(new { success = true, clientNeed });
    }

    [HttpPost]
    [Authorize(Policy = "Permission:content.create")]
    public async Task<IActionResult> CreateClientNeed([FromBody] CreateClientNeedRequest request, CancellationToken ct = default)
    {
        try
        {
            var created = await _curriculumService.CreateClientNeedAsync(request, ct);
            return CreatedAtAction(nameof(GetClientNeedById), new { id = created.Id }, new { success = true, clientNeed = created });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Status = 400, Title = "Invalid Client Need", Detail = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "Permission:content.edit")]
    public async Task<IActionResult> UpdateClientNeed(string id, [FromBody] UpdateClientNeedRequest request, CancellationToken ct = default)
    {
        try
        {
            var updated = await _curriculumService.UpdateClientNeedAsync(id, request, ct);
            if (updated == null) return NotFound(new ProblemDetails { Status = 404, Title = "Client Need Not Found", Detail = $"Client Need '{id}' was not found." });
            return Ok(new { success = true, clientNeed = updated });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Status = 400, Title = "Invalid Client Need", Detail = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "Permission:content.edit")]
    public async Task<IActionResult> DeleteClientNeed(string id, CancellationToken ct = default)
    {
        try
        {
            var deleted = await _curriculumService.DeleteClientNeedAsync(id, ct);
            if (!deleted) return NotFound(new ProblemDetails { Status = 404, Title = "Client Need Not Found", Detail = $"Client Need '{id}' was not found." });
            return Ok(new { success = true, message = "Client Need deleted successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ProblemDetails { Status = 409, Title = "Cannot Delete Client Need", Detail = ex.Message });
        }
    }
}
