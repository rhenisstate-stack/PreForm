using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/programmes")]
public class ProgrammesController : ControllerBase
{
    private readonly IProgrammeService _programmeService;

    public ProgrammesController(IProgrammeService programmeService)
    {
        _programmeService = programmeService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProgrammeDto>>> GetProgrammes(CancellationToken cancellationToken)
    {
        var programmes = await _programmeService.GetAllProgrammesAsync(cancellationToken);
        return Ok(programmes);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProgrammeDto>> GetProgramme(string id, CancellationToken cancellationToken)
    {
        var programme = await _programmeService.GetProgrammeByIdAsync(id, cancellationToken);
        if (programme is null)
        {
            return NotFound();
        }
        return Ok(programme);
    }

    [HttpGet("code/{code}")]
    public async Task<ActionResult<ProgrammeDto>> GetProgrammeByCode(string code, CancellationToken cancellationToken)
    {
        var programme = await _programmeService.GetProgrammeByCodeAsync(code, cancellationToken);
        if (programme is null)
        {
            return NotFound();
        }
        return Ok(programme);
    }

    [HttpPost]
    public async Task<ActionResult<ProgrammeDto>> CreateProgramme(CreateProgrammeRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var programme = await _programmeService.CreateProgrammeAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetProgramme), new { id = programme.Id }, programme);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }
}
