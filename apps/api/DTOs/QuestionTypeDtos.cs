using System.ComponentModel.DataAnnotations;
using Preform.Api.Models;

namespace Preform.Api.DTOs;

/// <summary>
/// Response DTO for a single question-type definition.
/// Intended for read-only catalogue consumption. Never exposes answer keys,
/// internal scoring configuration, or private authoring metadata.
/// </summary>
public class QuestionTypeDto
{
    [Required]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string Key { get; set; } = string.Empty;

    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(512)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(64)]
    public string Category { get; set; } = string.Empty;

    [MaxLength(64)]
    public string SupportedScoring { get; set; } = string.Empty;

    /// <summary>
    /// Bitmask of technical capabilities (see QuestionTypeCapability).
    /// </summary>
    public int CapabilityFlags { get; set; }

    /// <summary>
    /// Human-readable list of capability names for frontend consumption.
    /// </summary>
    public List<string> Capabilities { get; set; } = new();

    /// <summary>
    /// Implementation maturity status (Catalogued, ContractDefined, etc.).
    /// </summary>
    [MaxLength(32)]
    public string ImplementationStatus { get; set; } = string.Empty;

    public bool IsActive { get; set; }
    public int DisplayOrder { get; set; }
}

/// <summary>
/// Response envelope for the question-type catalogue list endpoint.
/// Follows existing API convention: { success, count, items }.
/// </summary>
public class QuestionTypeCatalogueResponse
{
    public bool Success { get; set; } = true;
    public int Count { get; set; }
    public List<QuestionTypeDto> Items { get; set; } = new();
}

/// <summary>
/// Request to validate whether a question-type key is known and active.
/// </summary>
public class ValidateQuestionTypeRequest
{
    [Required]
    [MaxLength(64)]
    public string Key { get; set; } = string.Empty;
}

/// <summary>
/// Response for question-type key validation.
/// </summary>
public class ValidateQuestionTypeResponse
{
    public bool Valid { get; set; }
    public bool IsActive { get; set; }
    public string? Key { get; set; }
    public string? Error { get; set; }
}
