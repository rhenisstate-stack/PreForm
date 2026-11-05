using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/questions")]
public class QuestionsController : ControllerBase
{
    private readonly IQuestionBankService _questionBankService;
    private readonly IAuthorizationService _authorizationService;
    private readonly ILogger<QuestionsController> _logger;

    public QuestionsController(
        IQuestionBankService questionBankService,
        IAuthorizationService authorizationService,
        ILogger<QuestionsController> logger)
    {
        _questionBankService = questionBankService;
        _authorizationService = authorizationService;
        _logger = logger;
    }

    [HttpGet]
    [Authorize(Policy = "Permission:content.view")]
    public async Task<IActionResult> GetQuestions([FromQuery] QuestionQueryParameters query, CancellationToken ct = default)
    {
        var result = await _questionBankService.GetQuestionsAsync(query, ct);
        return Ok(new { success = true, result });
    }

    [HttpGet("{id}")]
    [Authorize(Policy = "Permission:content.view")]
    public async Task<IActionResult> GetQuestionById(string id, CancellationToken ct = default)
    {
        var question = await _questionBankService.GetQuestionByIdAsync(id, ct);
        if (question == null)
        {
            return NotFound(new ProblemDetails
            {
                Status = 404,
                Title = "Question Not Found",
                Detail = $"Question '{id}' was not found."
            });
        }

        return Ok(new { success = true, question });
    }

    [HttpPost]
    [Authorize(Policy = "Permission:content.create")]
    public async Task<IActionResult> CreateQuestion([FromBody] CreateQuestionRequest request, CancellationToken ct = default)
    {
        var authorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";

        try
        {
            var created = await _questionBankService.CreateQuestionAsync(request, authorId, ct);
            return CreatedAtAction(nameof(GetQuestionById), new { id = created.Id }, new { success = true, question = created });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Status = 400,
                Title = "Invalid Question",
                Detail = ex.Message
            });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "Permission:content.edit")]
    public async Task<IActionResult> UpdateQuestion(string id, [FromBody] UpdateQuestionRequest request, CancellationToken ct = default)
    {
        var editorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";

        try
        {
            var updated = await _questionBankService.UpdateQuestionAsync(id, request, editorId, ct);
            if (updated == null)
            {
                return NotFound(new ProblemDetails
                {
                    Status = 404,
                    Title = "Question Not Found",
                    Detail = $"Question '{id}' was not found."
                });
            }

            return Ok(new { success = true, question = updated });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Status = 400,
                Title = "Invalid Question",
                Detail = ex.Message
            });
        }
    }

    [HttpPost("{id}/status")]
    [Authorize]
    public async Task<IActionResult> TransitionStatus(
        string id,
        [FromBody] QuestionStatusTransitionRequest request,
        CancellationToken ct = default)
    {
        // Enforce required permission depending on target status
        string requiredPolicy = request.TargetStatus switch
        {
            QuestionStatus.InReview => "Permission:content.edit",
            QuestionStatus.Approved => "Permission:content.review",
            QuestionStatus.Published => "Permission:content.publish",
            QuestionStatus.Archived => "Permission:content.publish",
            QuestionStatus.Draft => "Permission:content.review", // returning or rejecting requires review permission
            _ => "Permission:content.edit"
        };

        var authResult = await _authorizationService.AuthorizeAsync(User, requiredPolicy);
        if (!authResult.Succeeded)
        {
            return Forbid();
        }

        var actorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";
        var effectiveRole = RoleHierarchy.GetEffectiveRole(User);
        var isSuperAdmin = string.Equals(effectiveRole, "superadmin", StringComparison.OrdinalIgnoreCase);

        try
        {
            var updated = await _questionBankService.TransitionStatusAsync(id, request, actorId, isSuperAdmin, ct);
            if (updated == null)
            {
                return NotFound(new ProblemDetails
                {
                    Status = 404,
                    Title = "Question Not Found",
                    Detail = $"Question '{id}' was not found."
                });
            }

            return Ok(new { success = true, question = updated });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Status = 400,
                Title = "Invalid Status Transition",
                Detail = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Status = 400,
                Title = "Illegal Status Transition",
                Detail = ex.Message
            });
        }
    }

    [HttpGet("{id}/versions")]
    [Authorize(Policy = "Permission:content.view")]
    public async Task<IActionResult> GetQuestionVersions(string id, CancellationToken ct = default)
    {
        var versions = await _questionBankService.GetQuestionVersionsAsync(id, ct);
        return Ok(new { success = true, versions });
    }
}
