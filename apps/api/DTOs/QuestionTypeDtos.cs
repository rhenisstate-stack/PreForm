using System.ComponentModel.DataAnnotations;

namespace Preform.Api.DTOs;

public sealed class QuestionTypeDto
{
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
