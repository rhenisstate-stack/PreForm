using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Preform.Api.Models;

public enum QuestionDifficulty
{
    Easy = 1,
    Moderate = 2,
    Hard = 3,
    Expert = 4
}

public enum QuestionStatus
{
    Draft = 0,
    InReview = 1,
    Approved = 2,
    Published = 3,
    Archived = 4
}

/// <summary>
/// Bitmask capabilities describing what a question type can do and how it is handled.
/// These are technical capabilities, not clinical validity claims.
/// </summary>
[Flags]
public enum QuestionTypeCapability : int
{
    None = 0,

    /// <summary>Answer is expressed as one or more option keys.</summary>
    SupportsOptions = 1 << 0,

    /// <summary>More than one option may be selected.</summary>
    SupportsMultipleSelections = 1 << 1,

    /// <summary>Question references media assets (images, audio, video).</summary>
    SupportsMedia = 1 << 2,

    /// <summary>Question includes a clinical scenario vignette.</summary>
    SupportsClinicalScenario = 1 << 3,

    SupportsClinicalScenarios = SupportsClinicalScenario,

    /// <summary>Question includes exhibit data (labs, vitals, provider notes).</summary>
    SupportsExhibits = 1 << 4,

    /// <summary>Response payload is structured JSON, not just option indices.</summary>
    SupportsStructuredResponse = 1 << 5,

    /// <summary>Backend can automatically determine correctness.</summary>
    SupportsAutomaticGrading = 1 << 6,

    /// <summary>Requires human/manual review for scoring.</summary>
    SupportsManualGrading = 1 << 7,

    /// <summary>Supports partial credit scoring.</summary>
    SupportsPartialCredit = 1 << 8,

    /// <summary>More than one option can be correct.</summary>
    SupportsMultipleCorrectAnswers = 1 << 9,

    /// <summary>Option order may be randomized per delivery.</summary>
    SupportsRandomizedOptions = 1 << 10,

    /// <summary>Requires a specialized frontend renderer component.</summary>
    RequiresSpecializedRenderer = 1 << 11,

    /// <summary>Requires a specialized frontend answer-input component.</summary>
    RequiresSpecializedInput = 1 << 12,

    /// <summary>Requires type-specific validation beyond the existing option response contract.</summary>
    RequiresSpecializedResponseValidator = 1 << 13,
}

/// <summary>
/// Implementation maturity status for a question type.
/// A type is not "fully supported" simply because it has a database record.
/// </summary>
public enum QuestionTypeStatus
{
    /// <summary>Defined in the catalogue only. No backend contract or behavior.</summary>
    Catalogued = 0,

    /// <summary>Request/response contract is defined.</summary>
    ContractDefined = 1,

    /// <summary>Can be authored and managed in the question bank.</summary>
    AuthoringSupported = 2,

    /// <summary>Can be delivered to candidates and answered.</summary>
    DeliverySupported = 3,

    /// <summary>Backend can automatically grade responses.</summary>
    GradingSupported = 4,

    /// <summary>All capabilities implemented and tested.</summary>
    FullySupported = 5,
}

public enum QuestionScoringMode
{
    AutomaticExactMatch,
    AutomaticPartialCredit,
    Manual,
    NotImplemented,
}

[Table("QuestionTypeDefinitions", Schema = "public")]
public class QuestionTypeDefinition
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(64)]
    public string Key { get; set; } = string.Empty;

    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(512)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(64)]
    public string Category { get; set; } = "Traditional";

    [MaxLength(64)]
    public string SupportedScoring { get; set; } = "ExactMatch";

    /// <summary>
    /// Bitmask of technical capabilities for this question type.
    /// </summary>
    public int CapabilityFlags { get; set; } = (int)QuestionTypeCapability.None;

    /// <summary>
    /// Implementation maturity status. Not automatically upgraded to FullySupported
    /// by seeding — requires implementation and test evidence.
    /// </summary>
    [MaxLength(32)]
    public string ImplementationStatus { get; set; } = nameof(QuestionTypeStatus.Catalogued);

    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; } = 0;

    public bool IsSystemDefined { get; set; } = false;
    public bool IsArchived { get; set; } = false;

    [MaxLength(32)]
    public string SupportedPathways { get; set; } = "both";

    public string? AdminInstructions { get; set; }
    public string? CandidateInstructions { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("Questions", Schema = "public")]
public class Question
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [MaxLength(32)]
    public string? Code { get; set; } // e.g. "QN-000001"

    [Required]
    [MaxLength(10)]
    public string Pathway { get; set; } = "rn"; // "rn", "pn", "both"

    public string? TopicId { get; set; }
    public Topic? Topic { get; set; }

    [MaxLength(128)]
    public string? ClientNeedId { get; set; }
    public ClientNeed? ClientNeed { get; set; }

    [Required]
    [MaxLength(64)]
    public string QuestionTypeKey { get; set; } = "single-choice";

    [Required]
    public string Stem { get; set; } = string.Empty;

    public string? Instructions { get; set; }

    public QuestionDifficulty Difficulty { get; set; } = QuestionDifficulty.Moderate;

    public QuestionStatus Status { get; set; } = QuestionStatus.Draft;

    public int Version { get; set; } = 1;

    public string? ClinicalScenario { get; set; } // Case study vignette / EHR narrative

    public string? ExhibitsJson { get; set; } // Labs, vitals, provider notes

    public string? StructuredContentJson { get; set; } // Validated structured schema for NGN types

    public string? OverallRationale { get; set; }

    [MaxLength(64)]
    public string? CognitiveLevel { get; set; } // e.g. "Application", "Analysis", "Evaluation"

    [MaxLength(64)]
    public string? ClinicalJudgmentStep { get; set; } // e.g. "Recognize Cues", "Analyze Cues", "Prioritize Hypotheses"

    [MaxLength(256)]
    public string? Source { get; set; } // Provenance / Author / Review source

    [MaxLength(512)]
    public string? RejectionReason { get; set; } // Reviewer feedback when returned or rejected

    public DateTime? PublishedAt { get; set; }

    public string? CreatedById { get; set; }
    public User? CreatedBy { get; set; }

    public string? ReviewedById { get; set; }
    public User? ReviewedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<QuestionOption> Options { get; set; } = new List<QuestionOption>();
    public ICollection<QuestionVersion> Versions { get; set; } = new List<QuestionVersion>();
    public ICollection<QuestionMedia> Media { get; set; } = new List<QuestionMedia>();
}

[Table("QuestionOptions", Schema = "public")]
public class QuestionOption
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string QuestionId { get; set; } = string.Empty;
    public Question Question { get; set; } = null!;

    [Required]
    [MaxLength(32)]
    public string OptionKey { get; set; } = string.Empty; // e.g. "A", "B", "1", "2"

    [Required]
    public string Content { get; set; } = string.Empty;

    public int DisplayOrder { get; set; } = 0;

    public bool IsCorrect { get; set; } = false;

    public string? Rationale { get; set; } // Specific clinical rationale for this choice

    public string? DistractorRationale { get; set; } // Why this option is clinically unsafe or distractor

    [MaxLength(512)]
    public string? MediaUrl { get; set; } // Optional image / asset URL for image-based options
}

[Table("QuestionVersions", Schema = "public")]
public class QuestionVersion
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string QuestionId { get; set; } = string.Empty;
    public Question Question { get; set; } = null!;

    public int VersionNumber { get; set; } = 1;

    [Required]
    public string SnapshotJson { get; set; } = string.Empty;

    [MaxLength(512)]
    public string? ChangeSummary { get; set; }

    public QuestionStatus Status { get; set; } = QuestionStatus.Draft;

    public string? CreatedById { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("QuestionMedia", Schema = "public")]
public class QuestionMedia
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string? QuestionId { get; set; }
    public Question? Question { get; set; }

    [MaxLength(64)]
    public string FieldKey { get; set; } = string.Empty;

    [MaxLength(256)]
    public string? FileName { get; set; }

    [Required]
    [MaxLength(64)]
    public string ContentType { get; set; } = "image/png";

    public long FileSizeBytes { get; set; }

    [Required]
    [MaxLength(64)]
    public string Sha256Hash { get; set; } = string.Empty;

    [Required]
    public byte[] ImageData { get; set; } = Array.Empty<byte>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public string? CreatedById { get; set; }
    public User? CreatedBy { get; set; }
}
