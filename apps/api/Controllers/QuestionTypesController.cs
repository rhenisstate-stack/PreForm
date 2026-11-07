using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

/// <summary>
/// Read-only question-type catalogue.
/// Exposes canonical keys, display metadata, capability flags, and implementation status.
/// Does NOT expose answer keys, scoring secrets, or private authoring metadata.
/// </summary>
[ApiController]
[Route("api/v1/question-types")]
public class QuestionTypesController : ControllerBase
{
    private readonly IQuestionTypeService _questionTypeService;

    public QuestionTypesController(IQuestionTypeService questionTypeService)
    {
        _questionTypeService = questionTypeService;
    }

    /// <summary>
    /// Returns all active question-type definitions, ordered by display order.
    /// Public metadata endpoint — no answer keys or private grading configuration is exposed.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<QuestionTypeCatalogueResponse>> GetQuestionTypes(CancellationToken cancellationToken = default)
    {
        var types = await _questionTypeService.GetAllQuestionTypesAsync(cancellationToken);
        return Ok(new QuestionTypeCatalogueResponse
        {
            Success = true,
            Count = types.Count,
            Items = types,
        });
    }

    /// <summary>
    /// Returns a single question-type definition by canonical key.
    /// </summary>
    [HttpGet("{key}")]
    public async Task<ActionResult<QuestionTypeDto>> GetQuestionType(string key, CancellationToken cancellationToken = default)
    {
        var type = await _questionTypeService.GetQuestionTypeByKeyAsync(key, cancellationToken);
        if (type == null)
        {
            return NotFound(new { success = false, error = "Question type not found." });
        }
        return Ok(type);
    }

    /// <summary>
    /// Validates whether a question-type key is known and active.
    /// Useful for client-side validation before submitting question-type-specific requests.
    /// </summary>
    [HttpPost("validate")]
    public async Task<ActionResult<ValidateQuestionTypeResponse>> ValidateQuestionType([FromBody] ValidateQuestionTypeRequest request, CancellationToken cancellationToken = default)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new ValidateQuestionTypeResponse
            {
                Valid = false,
                Error = "Invalid validation request.",
            });
        }

        var result = await _questionTypeService.ValidateQuestionTypeKeyAsync(request.Key, cancellationToken);
        return Ok(result);
    }
}
