using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Preform.Api.DTOs;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/examinations")]
public class ExaminationsController : ControllerBase
{
    private readonly IExaminationCodeService _codeService;
    private readonly IExamLifecycleService _lifecycleService;
    private readonly ILogger<ExaminationsController> _logger;

    public ExaminationsController(
        IExaminationCodeService codeService,
        IExamLifecycleService lifecycleService,
        ILogger<ExaminationsController> logger)
    {
        _codeService = codeService;
        _lifecycleService = lifecycleService;
        _logger = logger;
    }

    private string? ResolveActorId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
    }

    [HttpGet]
    public async Task<IActionResult> GetExaminations([FromQuery] string? pathway, CancellationToken ct)
    {
        var examinations = await _lifecycleService.GetExaminationsAsync(pathway, User, ct);
        return Ok(new { success = true, examinations });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetExamination(string id, CancellationToken ct)
    {
        var examination = await _lifecycleService.GetExaminationAsync(id, User, ct);
        if (examination == null)
        {
            return NotFound(new { success = false, error = $"Examination '{id}' not found or not accessible." });
        }
        return Ok(new { success = true, examination });
    }

    [HttpPost]
    public async Task<IActionResult> CreateExamination([FromBody] CreateExaminationRequest request, CancellationToken ct)
    {
        var actorId = ResolveActorId();
        if (string.IsNullOrWhiteSpace(actorId))
        {
            return Unauthorized(new { success = false, error = "Authentication required." });
        }

        var role = RoleHierarchy.GetEffectiveRole(User);
        if (!string.Equals(role, RoleHierarchy.RoleExamManager, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(role, RoleHierarchy.RoleAdmin, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(role, RoleHierarchy.RoleSuperAdmin, StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "Forbidden: Only Exam Managers or Administrators can create examinations." });
        }

        try
        {
            var examination = await _codeService.CreateExaminationAsync(request, actorId, ct);
            return CreatedAtAction(nameof(GetExamination), new { id = examination.Id }, new
            {
                success = true,
                examination = new
                {
                    examination.Id,
                    examination.Pathway,
                    examination.Code,
                    examination.Title,
                    examination.CreatedAt,
                    examination.CreatedBy
                }
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status422UnprocessableEntity, new { success = false, error = ex.Message });
        }
    }

    [HttpGet("revisions/{revisionId}")]
    public async Task<IActionResult> GetRevision(string revisionId, CancellationToken ct)
    {
        var revision = await _lifecycleService.GetRevisionAsync(revisionId, User, ct);
        if (revision == null)
        {
            return NotFound(new { success = false, error = $"Exam revision '{revisionId}' not found or not accessible." });
        }
        return Ok(new { success = true, revision });
    }

    [HttpPost("{id}/revisions")]
    public async Task<IActionResult> CreateRevision(string id, [FromBody] CreateRevisionRequest request, CancellationToken ct)
    {
        return await ExecuteLifecycleActionAsync(async () =>
        {
            var revision = await _lifecycleService.CreateRevisionAsync(id, request, User, ct);
            return CreatedAtAction(nameof(GetRevision), new { revisionId = revision.Id }, new { success = true, revision });
        });
    }

    [HttpPost("revisions/{revisionId}/submit")]
    public async Task<IActionResult> SubmitForReview(string revisionId, [FromBody] TransitionRevisionRequest request, CancellationToken ct)
    {
        return await ExecuteLifecycleActionAsync(async () =>
        {
            var revision = await _lifecycleService.SubmitForReviewAsync(revisionId, request.ConcurrencyToken, User, ct);
            return Ok(new { success = true, revision });
        });
    }

    [HttpPost("revisions/{revisionId}/recommend")]
    public async Task<IActionResult> RecommendApproval(string revisionId, [FromBody] TransitionRevisionRequest request, CancellationToken ct)
    {
        return await ExecuteLifecycleActionAsync(async () =>
        {
            var revision = await _lifecycleService.RecommendApprovalAsync(revisionId, request.ConcurrencyToken, request.Notes, User, ct);
            return Ok(new { success = true, revision });
        });
    }

    [HttpPost("revisions/{revisionId}/return")]
    public async Task<IActionResult> ReturnForChanges(string revisionId, [FromBody] TransitionRevisionRequest request, CancellationToken ct)
    {
        return await ExecuteLifecycleActionAsync(async () =>
        {
            if (string.IsNullOrWhiteSpace(request.Reason))
            {
                return BadRequest(new { success = false, error = "A non-empty reason is required when returning revision for changes." });
            }
            var revision = await _lifecycleService.ReturnForChangesAsync(revisionId, request.ConcurrencyToken, request.Reason, User, ct);
            return Ok(new { success = true, revision });
        });
    }

    [HttpPost("revisions/{revisionId}/approve")]
    public async Task<IActionResult> ApproveRevision(string revisionId, [FromBody] TransitionRevisionRequest request, CancellationToken ct)
    {
        return await ExecuteLifecycleActionAsync(async () =>
        {
            var revision = await _lifecycleService.ApproveAsync(revisionId, request.ConcurrencyToken, User, ct);
            return Ok(new { success = true, revision });
        });
    }

    [HttpPost("revisions/{revisionId}/publish")]
    public async Task<IActionResult> PublishRevision(string revisionId, [FromBody] TransitionRevisionRequest request, CancellationToken ct)
    {
        return await ExecuteLifecycleActionAsync(async () =>
        {
            var revision = await _lifecycleService.PublishAsync(revisionId, request.ConcurrencyToken, User, ct);
            return Ok(new { success = true, revision });
        });
    }

    [HttpPost("revisions/{revisionId}/archive")]
    public async Task<IActionResult> ArchiveRevision(string revisionId, [FromBody] TransitionRevisionRequest request, CancellationToken ct)
    {
        return await ExecuteLifecycleActionAsync(async () =>
        {
            var revision = await _lifecycleService.ArchiveAsync(revisionId, request.ConcurrencyToken, request.Reason, User, ct);
            return Ok(new { success = true, revision });
        });
    }

    [HttpPost("revisions/{revisionId}/restore")]
    public async Task<IActionResult> RestoreRevision(string revisionId, [FromBody] TransitionRevisionRequest request, CancellationToken ct)
    {
        return await ExecuteLifecycleActionAsync(async () =>
        {
            if (string.IsNullOrWhiteSpace(request.Reason))
            {
                return BadRequest(new { success = false, error = "A mandatory reason is required for restoration override." });
            }
            var revision = await _lifecycleService.RestoreAsync(revisionId, request.ConcurrencyToken, request.Reason, User, ct);
            return Ok(new { success = true, revision });
        });
    }

    [HttpPost("revisions/{revisionId}/retire")]
    public async Task<IActionResult> RetireRevision(string revisionId, [FromBody] TransitionRevisionRequest request, CancellationToken ct)
    {
        return await ExecuteLifecycleActionAsync(async () =>
        {
            var revision = await _lifecycleService.RetireAsync(revisionId, request.ConcurrencyToken, request.Reason, User, ct);
            return Ok(new { success = true, revision });
        });
    }

    [HttpPost("revisions/{revisionId}/emergency-retire")]
    public async Task<IActionResult> EmergencyRetire(string revisionId, [FromBody] TransitionRevisionRequest request, CancellationToken ct)
    {
        return await ExecuteLifecycleActionAsync(async () =>
        {
            if (string.IsNullOrWhiteSpace(request.Reason))
            {
                return BadRequest(new { success = false, error = "A mandatory reason is required for emergency retirement override." });
            }
            var revision = await _lifecycleService.EmergencyRetireAsync(revisionId, request.ConcurrencyToken, request.Reason, User, ct);
            return Ok(new { success = true, revision });
        });
    }

    private async Task<IActionResult> ExecuteLifecycleActionAsync(Func<Task<IActionResult>> action)
    {
        try
        {
            return await action();
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex, "Concurrency conflict during exam lifecycle transition.");
            return StatusCode(StatusCodes.Status409Conflict, new
            {
                success = false,
                error = "ConcurrencyConflict",
                message = ex.Message
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status422UnprocessableEntity, new { success = false, error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during exam lifecycle transition.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { success = false, error = "An internal error occurred." });
        }
    }
}
