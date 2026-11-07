using System.ComponentModel.DataAnnotations;
using Preform.Api.Models;

namespace Preform.Api.DTOs;

public class QuestionOptionDto
{
    public string Id { get; set; } = string.Empty;
    public string OptionKey { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsCorrect { get; set; }
    public string? Rationale { get; set; }
    public string? DistractorRationale { get; set; }
    public string? MediaUrl { get; set; }
}

public class CreateQuestionOptionRequest
{
    public string? Id { get; set; }

    [Required]
    [MaxLength(32)]
    public string OptionKey { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    public int DisplayOrder { get; set; } = 0;
    public bool IsCorrect { get; set; } = false;
    public string? Rationale { get; set; }
    public string? DistractorRationale { get; set; }

    [MaxLength(512)]
    public string? MediaUrl { get; set; }
}

public class QuestionSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string Pathway { get; set; } = "rn";
    public string? TopicId { get; set; }
    public string? TopicTitle { get; set; }
    public string? SubcategoryName { get; set; }
    public string? CategoryName { get; set; }
    public string? CourseTitle { get; set; }
    public string? ClientNeedId { get; set; }
    public string? ClientNeedCode { get; set; }
    public string? ClientNeedName { get; set; }
    public string QuestionTypeKey { get; set; } = string.Empty;
    public string QuestionTypeName { get; set; } = string.Empty;
    public string Stem { get; set; } = string.Empty;
    public QuestionDifficulty Difficulty { get; set; }
    public QuestionStatus Status { get; set; }
    public int Version { get; set; }
    public string? CognitiveLevel { get; set; }
    public string? ClinicalJudgmentStep { get; set; }
    public string? CreatedById { get; set; }
    public string? AuthorName { get; set; }
    public string? ReviewedById { get; set; }
    public string? ReviewerName { get; set; }
    public int OptionsCount { get; set; }
    public int ReferencedByExamCount { get; set; }
    public int ReferencedByAttemptCount { get; set; }
    public bool CanDelete => ReferencedByExamCount == 0 && ReferencedByAttemptCount == 0;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
}

public class QuestionDependencyExamDto
{
    public string RevisionId { get; set; } = string.Empty;
    public string ExaminationId { get; set; } = string.Empty;
    public string? ExaminationCode { get; set; }
    public string Title { get; set; } = string.Empty;
    public string LifecycleState { get; set; } = string.Empty;
}

public class QuestionDetailDto
{
    public string Id { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string Pathway { get; set; } = "rn";
    public string? TopicId { get; set; }
    public string? TopicTitle { get; set; }
    public string? SubcategoryId { get; set; }
    public string? SubcategoryName { get; set; }
    public string? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? SubjectDomainId { get; set; }
    public string? SubjectDomainTitle { get; set; }
    public string? CourseId { get; set; }
    public string? CourseTitle { get; set; }
    public string? ClientNeedId { get; set; }
    public string? ClientNeedCode { get; set; }
    public string? ClientNeedName { get; set; }
    public string QuestionTypeKey { get; set; } = string.Empty;
    public string QuestionTypeName { get; set; } = string.Empty;
    public string Stem { get; set; } = string.Empty;
    public string? Instructions { get; set; }
    public QuestionDifficulty Difficulty { get; set; }
    public QuestionStatus Status { get; set; }
    public int Version { get; set; }
    public string? ClinicalScenario { get; set; }
    public string? ExhibitsJson { get; set; }
    public string? StructuredContentJson { get; set; }
    public string? OverallRationale { get; set; }
    public string? CognitiveLevel { get; set; }
    public string? ClinicalJudgmentStep { get; set; }
    public string? Source { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime? PublishedAt { get; set; }
    public string? CreatedById { get; set; }
    public string? AuthorName { get; set; }
    public string? ReviewedById { get; set; }
    public string? ReviewerName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int VersionsCount { get; set; }
    public int ReferencedByExamCount { get; set; }
    public int ReferencedByAttemptCount { get; set; }
    public bool CanDelete => ReferencedByExamCount == 0 && ReferencedByAttemptCount == 0;
    public List<QuestionDependencyExamDto> ReferencedExams { get; set; } = new();
    public List<QuestionOptionDto> Options { get; set; } = new();
}

public class CreateQuestionRequest
{
    [MaxLength(32)]
    public string? Code { get; set; }

    [Required]
    [MaxLength(10)]
    public string Pathway { get; set; } = "rn";

    public string? TopicId { get; set; }

    [MaxLength(128)]
    public string? ClientNeedId { get; set; }

    [Required]
    [MaxLength(64)]
    public string QuestionTypeKey { get; set; } = "single-choice";

    [Required]
    public string Stem { get; set; } = string.Empty;

    public string? Instructions { get; set; }

    public QuestionDifficulty Difficulty { get; set; } = QuestionDifficulty.Moderate;

    public string? ClinicalScenario { get; set; }
    public string? ExhibitsJson { get; set; }
    public string? StructuredContentJson { get; set; }
    public string? OverallRationale { get; set; }

    [MaxLength(64)]
    public string? CognitiveLevel { get; set; }

    [MaxLength(64)]
    public string? ClinicalJudgmentStep { get; set; }

    [MaxLength(256)]
    public string? Source { get; set; }

    public List<CreateQuestionOptionRequest> Options { get; set; } = new();
}

public class UpdateQuestionRequest
{
    [Required]
    [MaxLength(10)]
    public string Pathway { get; set; } = "rn";

    public string? TopicId { get; set; }

    [MaxLength(128)]
    public string? ClientNeedId { get; set; }

    [Required]
    [MaxLength(64)]
    public string QuestionTypeKey { get; set; } = "single-choice";

    [Required]
    public string Stem { get; set; } = string.Empty;

    public string? Instructions { get; set; }

    public QuestionDifficulty Difficulty { get; set; } = QuestionDifficulty.Moderate;

    public string? ClinicalScenario { get; set; }
    public string? ExhibitsJson { get; set; }
    public string? StructuredContentJson { get; set; }
    public string? OverallRationale { get; set; }

    [MaxLength(64)]
    public string? CognitiveLevel { get; set; }

    [MaxLength(64)]
    public string? ClinicalJudgmentStep { get; set; }

    [MaxLength(256)]
    public string? Source { get; set; }

    [MaxLength(512)]
    public string? ChangeSummary { get; set; }

    public List<CreateQuestionOptionRequest> Options { get; set; } = new();
}

public class QuestionStatusTransitionRequest
{
    [Required]
    public QuestionStatus TargetStatus { get; set; }

    [MaxLength(512)]
    public string? RejectionReason { get; set; }

    [MaxLength(512)]
    public string? ChangeSummary { get; set; }
}

public class QuestionVersionDto
{
    public string Id { get; set; } = string.Empty;
    public string QuestionId { get; set; } = string.Empty;
    public int VersionNumber { get; set; }
    public string SnapshotJson { get; set; } = string.Empty;
    public string? ChangeSummary { get; set; }
    public QuestionStatus Status { get; set; }
    public string? CreatedById { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class QuestionQueryParameters
{
    public string? Search { get; set; }
    public string? Type { get; set; }
    public string? Pathway { get; set; }
    public string? TopicId { get; set; }
    public string? SubcategoryId { get; set; }
    public string? CategoryId { get; set; }
    public string? SubjectDomainId { get; set; }
    public string? CourseId { get; set; }
    public string? ClientNeedId { get; set; }
    public QuestionDifficulty? Difficulty { get; set; }
    public QuestionStatus? Status { get; set; }
    public string? CognitiveLevel { get; set; }
    public string? ClinicalJudgmentStep { get; set; }
    public string? AuthorId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string SortBy { get; set; } = "updatedAt";
    public string SortDirection { get; set; } = "desc";
}

public class PaginatedResponse<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}
