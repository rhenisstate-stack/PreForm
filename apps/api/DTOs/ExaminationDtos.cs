using System.ComponentModel.DataAnnotations;
using Preform.Api.Models;

namespace Preform.Api.DTOs;

public sealed class CreateExaminationRequest
{
    [Required]
    [MaxLength(10)]
    public string Pathway { get; set; } = "rn"; // "rn" or "pn"

    [Required]
    [MaxLength(128)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? InitialRevisionTitle { get; set; }

    [MaxLength(1024)]
    public string? Description { get; set; }

    public ExamType ExamType { get; set; } = ExamType.Practice;

    public int TimeLimitMinutes { get; set; } = 0;

    public decimal PassingScorePercent { get; set; } = 75.0m;
}

public sealed class ExaminationDto
{
    public string Id { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string? CurrentRevisionId { get; set; }
    public string? SuccessorExaminationId { get; set; }
    public ExamRevisionDto? CurrentRevision { get; set; }
    public List<ExamRevisionDto> Revisions { get; set; } = new();
}

public sealed class ExamRevisionDto
{
    public string Id { get; set; } = string.Empty;
    public string ExaminationId { get; set; } = string.Empty;
    public string? ExaminationCode { get; set; }
    public int RevisionNumber { get; set; }
    public string LifecycleState { get; set; } = string.Empty;
    public long ConcurrencyToken { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public ExamType ExamType { get; set; }
    public int TimeLimitMinutes { get; set; }
    public decimal PassingScorePercent { get; set; }
    public bool IsPublished { get; set; }
    public int QuestionCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string? SubmittedBy { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public string? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? PublishedBy { get; set; }
    public DateTime? PublishedAt { get; set; }
    public string? ArchivedBy { get; set; }
    public DateTime? ArchivedAt { get; set; }
    public string? RetiredBy { get; set; }
    public DateTime? RetiredAt { get; set; }
}

public sealed class CreateRevisionRequest
{
    [Required]
    [MaxLength(128)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    public ExamType ExamType { get; set; } = ExamType.Practice;

    public int TimeLimitMinutes { get; set; } = 0;

    public decimal PassingScorePercent { get; set; } = 75.0m;
}

public sealed class TransitionRevisionRequest
{
    [Required]
    public long ConcurrencyToken { get; set; }

    public string? Reason { get; set; }
    public string? Notes { get; set; }
}

public sealed class EmergencyOverrideRequest
{
    [Required]
    public long ConcurrencyToken { get; set; }

    [Required]
    [MaxLength(32)]
    public string Action { get; set; } = string.Empty; // "restore" or "retire"

    [Required]
    [MinLength(5)]
    [MaxLength(1024)]
    public string Reason { get; set; } = string.Empty;
}

// ── P3.2 Examination Authoring & Membership DTOs ────────────────────────────

public sealed class UpdateRevisionMetadataRequest
{
    [Required]
    [MaxLength(128)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    public ExamType ExamType { get; set; } = ExamType.Practice;

    [Range(0, 720, ErrorMessage = "Time limit must be between 0 (untimed) and 720 minutes.")]
    public int TimeLimitMinutes { get; set; } = 0;

    [Range(0.0, 100.0, ErrorMessage = "Passing score percent must be between 0.0 and 100.0.")]
    public decimal PassingScorePercent { get; set; } = 75.0m;

    [Required]
    public long ConcurrencyToken { get; set; }
}

public sealed class RevisionValidationResultDto
{
    public string RevisionId { get; set; } = string.Empty;
    public bool IsValid { get; set; }
    public int QuestionCount { get; set; }
    public long ConcurrencyToken { get; set; }
    public string LifecycleState { get; set; } = string.Empty;
    public List<string> Issues { get; set; } = new();
}

public sealed class AddExamQuestionRequest
{
    [Required]
    public string QuestionId { get; set; } = string.Empty;

    public int? DisplayOrder { get; set; }

    [Required]
    public long ConcurrencyToken { get; set; }
}

public sealed class RemoveExamQuestionRequest
{
    [Required]
    public long ConcurrencyToken { get; set; }
}

public sealed class QuestionOrderItem
{
    [Required]
    public string QuestionId { get; set; } = string.Empty;

    [Required]
    public int DisplayOrder { get; set; }
}

public sealed class ReorderExamQuestionsRequest
{
    [Required]
    public List<QuestionOrderItem> Items { get; set; } = new();

    [Required]
    public long ConcurrencyToken { get; set; }
}

public sealed class ExamQuestionMembershipDto
{
    public string Id { get; set; } = string.Empty;
    public string ExamId { get; set; } = string.Empty;
    public string QuestionId { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public string Stem { get; set; } = string.Empty;
    public string QuestionTypeKey { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int OptionCount { get; set; }
}

public sealed class UpdateExaminationFamilyRequest
{
    [Required]
    [MaxLength(128)]
    public string Title { get; set; } = string.Empty;
}

public sealed class DiscardDraftRevisionRequest
{
    [Required]
    public long ConcurrencyToken { get; set; }
}
