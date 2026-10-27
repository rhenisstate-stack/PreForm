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

[Table("QuestionTypeDefinitions", Schema = "public")]
public class QuestionTypeDefinition
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(64)]
    public string Key { get; set; } = string.Empty; // e.g. "single-choice", "sata", "drag-drop", etc.

    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(512)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(64)]
    public string Category { get; set; } = "Traditional"; // "Traditional", "NGN", "Clinical"

    [MaxLength(64)]
    public string SupportedScoring { get; set; } = "ExactMatch"; // "ExactMatch", "PartialCredit", "ManualReview"

    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; } = 0;
}

[Table("Questions", Schema = "public")]
public class Question
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(10)]
    public string Pathway { get; set; } = "rn"; // "rn" or "pn"

    public string? TopicId { get; set; }
    public Topic? Topic { get; set; }

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

    public string? OverallRationale { get; set; }

    public string? CreatedById { get; set; }
    public User? CreatedBy { get; set; }

    public string? ReviewedById { get; set; }
    public User? ReviewedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<QuestionOption> Options { get; set; } = new List<QuestionOption>();
    public ICollection<QuestionVersion> Versions { get; set; } = new List<QuestionVersion>();
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

    public string? CreatedById { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
