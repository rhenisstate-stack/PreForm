using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Preform.Api.DTOs;

public sealed class QuestionTypeDto
{
    [JsonIgnore]
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

    public int DisplayOrder { get; set; }

    public string SupportedScoring { get; set; } = "NotImplemented";

    public List<string> SupportedScoringModes { get; set; } = new();

    public int CapabilityFlags { get; set; }

    public List<string> Capabilities { get; set; } = new();

    public QuestionTypeCapabilitiesDto CapabilityDetails { get; set; } = new();

    [MaxLength(32)]
    public string ImplementationStatus { get; set; } = string.Empty;

    public int ContractVersion { get; set; }

    public bool IsActive { get; set; }

    public bool IsSystemDefined { get; set; }

    public bool IsArchived { get; set; }

    public string SupportedPathways { get; set; } = "both";

    public string? AdminInstructions { get; set; }

    public string? CandidateInstructions { get; set; }

    public int UsedByQuestionCount { get; set; }

    public bool CanDelete { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}

public sealed class QuestionTypeCapabilitiesDto
{
    public bool SupportsOptions { get; set; }
    public bool SupportsMultipleSelections { get; set; }
    public bool SupportsAuthoring { get; set; }
    public bool SupportsDelivery { get; set; }
    public bool SupportsMedia { get; set; }
    public bool SupportsClinicalScenario { get; set; }
    public bool SupportsExhibits { get; set; }
    public bool SupportsStructuredResponse { get; set; }
    public bool SupportsAutomaticGrading { get; set; }
    public bool SupportsManualGrading { get; set; }
    public bool SupportsPartialCredit { get; set; }
    public bool SupportsRandomization { get; set; }
    public bool RequiresSpecializedRenderer { get; set; }
    public bool RequiresSpecializedResponseValidator { get; set; }
}

public sealed class QuestionTypeCatalogueResponse
{
    public bool Success { get; set; } = true;
    public int Count { get; set; }
    public List<QuestionTypeDto> Items { get; set; } = new();
}

public sealed class ValidateQuestionTypeRequest
{
    [Required]
    [MaxLength(64)]
    public string Key { get; set; } = string.Empty;
}

public sealed class ValidateQuestionTypeResponse
{
    public bool Valid { get; set; }
    public bool IsActive { get; set; }
    public string? Key { get; set; }
    public string? Error { get; set; }
}

public sealed class CreateQuestionTypeRequest
{
    [Required]
    [MaxLength(64)]
    [RegularExpression(@"^[a-z0-9]+(-[a-z0-9]+)*$", ErrorMessage = "Key must consist of lowercase alphanumeric words separated by hyphens (e.g. 'custom-drag-rank').")]
    public string Key { get; set; } = string.Empty;

    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(512)]
    public string? Description { get; set; }

    [MaxLength(64)]
    public string Category { get; set; } = "Traditional";

    [MaxLength(64)]
    public string SupportedScoring { get; set; } = "ExactMatch";

    public int CapabilityFlags { get; set; } = 0;

    [MaxLength(32)]
    public string SupportedPathways { get; set; } = "both";

    public string? AdminInstructions { get; set; }

    public string? CandidateInstructions { get; set; }

    public int DisplayOrder { get; set; } = 0;

    public bool IsActive { get; set; } = true;
}

public sealed class UpdateQuestionTypeRequest
{
    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(512)]
    public string? Description { get; set; }

    [MaxLength(64)]
    public string Category { get; set; } = "Traditional";

    [MaxLength(64)]
    public string SupportedScoring { get; set; } = "ExactMatch";

    public int CapabilityFlags { get; set; } = 0;

    [MaxLength(32)]
    public string SupportedPathways { get; set; } = "both";

    public string? AdminInstructions { get; set; }

    public string? CandidateInstructions { get; set; }

    public int DisplayOrder { get; set; } = 0;

    [MaxLength(32)]
    public string? ImplementationStatus { get; set; }
}

public sealed class QuestionTypeQueryParameters
{
    public string? Search { get; set; }
    public string? Category { get; set; }
    public string? Status { get; set; } // "active", "inactive", "archived", "all"
    public string? Classification { get; set; } // "all", "system", "custom"
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string SortBy { get; set; } = "displayOrder";
    public string SortDirection { get; set; } = "asc";
}

public sealed class QuestionTypePagedResponse
{
    public bool Success { get; set; } = true;
    public List<QuestionTypeDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;

    public int TotalActive { get; set; }
    public int TotalInactive { get; set; }
    public int TotalArchived { get; set; }
    public int TotalSystemDefined { get; set; }
    public int TotalCustom { get; set; }
    public int TotalInUse { get; set; }
}
