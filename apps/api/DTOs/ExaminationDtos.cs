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

    public int? TargetQuestionCount { get; set; }

    [MaxLength(32)]
    public string? SelectionStrategy { get; set; }

    public string? CompositionRulesJson { get; set; }

    public List<string>? QuestionIds { get; set; }

    public bool? IsAvailable { get; set; }
    public DateTime? AvailableFrom { get; set; }
    public DateTime? AvailableTo { get; set; }
    public int? MaxAttemptsAllowed { get; set; }
    public int? RetakeCooldownHours { get; set; }
    public bool? AllowInterruptedResume { get; set; }

    [MaxLength(32)]
    public string? ReviewPolicy { get; set; }
    public bool? ShowRationales { get; set; }
    public bool? ShowScoreImmediately { get; set; }
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
    public int TargetQuestionCount { get; set; } = 10;
    public string SelectionStrategy { get; set; } = "Preset";
    public string? CompositionRulesJson { get; set; }
    public bool IsAvailable { get; set; } = true;
    public DateTime? AvailableFrom { get; set; }
    public DateTime? AvailableTo { get; set; }
    public int? MaxAttemptsAllowed { get; set; }
    public int RetakeCooldownHours { get; set; }
    public bool AllowInterruptedResume { get; set; } = true;
    public string ReviewPolicy { get; set; } = "AfterExamSubmission";
    public bool ShowRationales { get; set; } = true;
    public bool ShowScoreImmediately { get; set; } = true;
    public string? ConfigurationSnapshotJson { get; set; }
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

    public string? SourceRevisionId { get; set; }

    public bool CopyQuestions { get; set; } = true;
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

    [Range(1, 265, ErrorMessage = "Target question count must be between 1 and 265.")]
    public int? TargetQuestionCount { get; set; }

    [MaxLength(32)]
    public string? SelectionStrategy { get; set; }

    public bool? IsAvailable { get; set; }

    public DateTime? AvailableFrom { get; set; }

    public DateTime? AvailableTo { get; set; }

    public int? MaxAttemptsAllowed { get; set; }

    [Range(0, 720, ErrorMessage = "Retake cooldown must be between 0 and 720 hours.")]
    public int? RetakeCooldownHours { get; set; }

    public bool? AllowInterruptedResume { get; set; }

    [MaxLength(32)]
    public string? ReviewPolicy { get; set; }

    public bool? ShowRationales { get; set; }

    public bool? ShowScoreImmediately { get; set; }

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
    public string? Code { get; set; }
    public int DisplayOrder { get; set; }
    public string Stem { get; set; } = string.Empty;
    public string QuestionTypeKey { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int OptionCount { get; set; }
    public string? ClientNeedId { get; set; }
    public string? ClientNeedCode { get; set; }
    public string? ClientNeedName { get; set; }
    public string? CourseId { get; set; }
    public string? CourseTitle { get; set; }
    public string? SubjectDomainId { get; set; }
    public string? SubjectDomainTitle { get; set; }
    public string? TopicId { get; set; }
    public string? TopicTitle { get; set; }
    public string? OverallRationale { get; set; }
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

// ── P3.3 Examination Library Query & Discovery DTOs ────────────────────────

public sealed class ExaminationQueryParameters
{
    [MaxLength(100)]
    public string? Search { get; set; }

    [MaxLength(10)]
    public string? Pathway { get; set; } // "rn", "pn", or null for all

    [MaxLength(32)]
    public string? RevisionStatus { get; set; } // "Draft", "InReview", "Approved", "Published", "Archived", "Retired"

    public int? ExamType { get; set; } // 1=Practice, 2=CAT, 3=MockSimulation, 4=DiagnosticReadiness (RAT), 5=Standalone

    [MaxLength(32)]
    public string? Module { get; set; } // "standalone", "rats", "practice", or null

    [MaxLength(32)]
    public string? SortBy { get; set; } = "code"; // "title", "code", "pathway", "createdAt", "updatedAt", "revisions", "latestRevisionNumber"

    [MaxLength(4)]
    public string? SortDirection { get; set; } = "asc"; // "asc" or "desc"

    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 20;
}

public sealed class ExamRevisionSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string ExaminationId { get; set; } = string.Empty;
    public string? ExaminationCode { get; set; }
    public int RevisionNumber { get; set; }
    public string LifecycleState { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public ExamType ExamType { get; set; }
    public int TimeLimitMinutes { get; set; }
    public decimal PassingScorePercent { get; set; }
    public bool IsPublished { get; set; }
    public int QuestionCount { get; set; }
    public int TargetQuestionCount { get; set; } = 10;
    public string SelectionStrategy { get; set; } = "Preset";
    public string? CompositionRulesJson { get; set; }
    public bool IsAvailable { get; set; } = true;
    public DateTime? AvailableFrom { get; set; }
    public DateTime? AvailableTo { get; set; }
    public int? MaxAttemptsAllowed { get; set; }
    public int RetakeCooldownHours { get; set; }
    public bool AllowInterruptedResume { get; set; } = true;
    public string ReviewPolicy { get; set; } = "AfterExamSubmission";
    public bool ShowRationales { get; set; } = true;
    public bool ShowScoreImmediately { get; set; } = true;
    public string? ConfigurationSnapshotJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
}

public sealed class ExaminationLibraryItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string? CurrentRevisionId { get; set; }
    public string? SuccessorExaminationId { get; set; }
    public int RevisionCount { get; set; }

    // Distinct representations for active published revision vs latest revision number
    public ExamRevisionSummaryDto? PublishedRevision { get; set; }
    public ExamRevisionSummaryDto? LatestRevision { get; set; }
    public ExamRevisionSummaryDto? CurrentRevision { get; set; }
}

public sealed class PaginationMetadata
{
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
}

public sealed class ExaminationLibraryResponseDto
{
    public bool Success { get; set; } = true;
    public List<ExaminationLibraryItemDto> Items { get; set; } = new();
    public PaginationMetadata Pagination { get; set; } = new();

    // Backward compatibility: existing consumers expecting examinations array
    public List<ExaminationDto> Examinations { get; set; } = new();
}

public sealed class FamilyRevisionsResponseDto
{
    public bool Success { get; set; } = true;
    public string ExaminationId { get; set; } = string.Empty;
    public string ExaminationCode { get; set; } = string.Empty;
    public string ExaminationTitle { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public List<ExamRevisionDto> Revisions { get; set; } = new();
}

public sealed class DuplicateExaminationRequest
{
    [MaxLength(128)]
    public string? Title { get; set; }

    public string? SourceRevisionId { get; set; }

    [MaxLength(1024)]
    public string? Description { get; set; }

    public int? TimeLimitMinutes { get; set; }

    public decimal? PassingScorePercent { get; set; }
}

public sealed class DuplicateExaminationResponseDto
{
    public bool Success { get; set; } = true;
    public string ExaminationId { get; set; } = string.Empty;
    public string ExaminationCode { get; set; } = string.Empty;
    public string ExaminationTitle { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public string RevisionId { get; set; } = string.Empty;
    public int RevisionNumber { get; set; } = 1;
    public string LifecycleState { get; set; } = "Draft";
    public int QuestionCount { get; set; }
    public ExaminationDto Examination { get; set; } = null!;
}

// ── P4.3 Assessment Composition & Blueprint DTOs ────────────────────────────

public sealed class ClientNeedQuotaItem
{
    [MaxLength(64)]
    public string ClientNeedCode { get; set; } = string.Empty;

    public string ClientNeedId
    {
        get => ClientNeedCode;
        set
        {
            if (!string.IsNullOrWhiteSpace(value))
                ClientNeedCode = value;
        }
    }

    public string ClientNeedName { get; set; } = string.Empty;

    [Range(0.0, 100.0)]
    public decimal TargetPercentage { get; set; }

    [Range(0, 265)]
    public int TargetCount { get; set; }

    public int AvailableCount { get; set; }
}

public sealed class DifficultyDistributionDto
{
    [Range(0, 100)]
    public int EasyPercent { get; set; } = 20;

    [Range(0, 100)]
    public int ModeratePercent { get; set; } = 50;

    [Range(0, 100)]
    public int HardPercent { get; set; } = 30;
}

public sealed class ReadinessThresholdsDto
{
    [Range(0, 100)]
    public decimal LowMin { get; set; } = 0m;

    [Range(0, 100)]
    public decimal LowMax { get; set; } = 54m;

    [Range(0, 100)]
    public decimal BorderlineMin { get; set; } = 55m;

    [Range(0, 100)]
    public decimal BorderlineMax { get; set; } = 64m;

    [Range(0, 100)]
    public decimal HighMin { get; set; } = 65m;

    [Range(0, 100)]
    public decimal HighMax { get; set; } = 79m;

    [Range(0, 100)]
    public decimal VeryHighMin { get; set; } = 80m;

    [Range(0, 100)]
    public decimal VeryHighMax { get; set; } = 100m;

    public decimal LowMinPercent { get => LowMin; set => LowMin = value; }
    public decimal LowMaxPercent { get => LowMax; set => LowMax = value; }
    public decimal BorderlineMinPercent { get => BorderlineMin; set => BorderlineMin = value; }
    public decimal BorderlineMaxPercent { get => BorderlineMax; set => BorderlineMax = value; }
    public decimal HighMinPercent { get => HighMin; set => HighMin = value; }
    public decimal HighMaxPercent { get => HighMax; set => HighMax = value; }
    public decimal VeryHighMinPercent { get => VeryHighMin; set => VeryHighMin = value; }
    public decimal VeryHighMaxPercent { get => VeryHighMax; set => VeryHighMax = value; }
}

public sealed class ExamCompositionDto
{
    public string RevisionId { get; set; } = string.Empty;
    public int TargetQuestionCount { get; set; } = 10;
    public string SelectionStrategy { get; set; } = "Preset";
    public List<ClientNeedQuotaItem> ClientNeedQuotas { get; set; } = new();
    public List<string> AllowedQuestionTypes { get; set; } = new();
    public List<string>? CourseIds { get; set; }
    public List<string>? SubjectIds { get; set; }
    public List<string>? CategoryIds { get; set; }
    public string? Difficulty { get; set; }
    public DifficultyDistributionDto? DifficultyDistribution { get; set; }
    public ReadinessThresholdsDto? ReadinessThresholds { get; set; }
    public string? AssessmentObjectives { get; set; }
    public bool RandomizeQuestions { get; set; } = true;
    public string? QuestionFormatFilter { get; set; }
    public long ConcurrencyToken { get; set; }
}

public sealed class UpdateExamCompositionRequest
{
    [Range(1, 265, ErrorMessage = "Target question count must be between 1 and 265.")]
    public int TargetQuestionCount { get; set; } = 10;

    [Required]
    [MaxLength(32)]
    public string SelectionStrategy { get; set; } = "Preset";

    public List<ClientNeedQuotaItem> ClientNeedQuotas { get; set; } = new();
    public List<string>? AllowedQuestionTypes { get; set; }
    public List<string>? CourseIds { get; set; }
    public List<string>? SubjectIds { get; set; }
    public List<string>? CategoryIds { get; set; }
    public string? Difficulty { get; set; }
    public DifficultyDistributionDto? DifficultyDistribution { get; set; }
    public ReadinessThresholdsDto? ReadinessThresholds { get; set; }
    public string? AssessmentObjectives { get; set; }
    public bool? RandomizeQuestions { get; set; }
    public string? QuestionFormatFilter { get; set; }

    [Required]
    public long ConcurrencyToken { get; set; }
}

public sealed class QuestionPoolPreviewItem
{
    public string Category { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int RequestedCount { get; set; }
    public int AvailableCount { get; set; }
    public bool IsSufficient { get; set; }
}

public sealed class QuestionPoolPreviewResponse
{
    public bool Success { get; set; } = true;
    public string RevisionId { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public int TargetQuestionCount { get; set; }
    public int TotalEligiblePublishedQuestions { get; set; }
    public bool IsPoolSufficient { get; set; }
    public List<QuestionPoolPreviewItem> ClientNeedBreakdown { get; set; } = new();
    public List<QuestionPoolPreviewItem> QuestionTypeBreakdown { get; set; } = new();
    public List<string> Issues { get; set; } = new();
}

// ── P4.6 Examination Readiness & Admin Preview DTOs ─────────────────────────

public sealed class ExamReadinessCheckItem
{
    public string Category { get; set; } = string.Empty; // "Metadata", "Composition", "QuestionPool", "Policies", "Security"
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = "PASS"; // "PASS", "WARN", "BLOCK"
    public string Message { get; set; } = string.Empty;
}

public sealed class ExamReadinessReportDto
{
    public bool Success { get; set; } = true;
    public string RevisionId { get; set; } = string.Empty;
    public string OverallStatus { get; set; } = "PASS"; // "PASS", "WARN", "BLOCK"
    public bool CanPublish { get; set; }
    public long ConcurrencyToken { get; set; }
    public string LifecycleState { get; set; } = string.Empty;
    public List<ExamReadinessCheckItem> Checks { get; set; } = new();
}

public sealed class AdminExamPreviewOptionDto
{
    public string Id { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string OptionKey { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public string? Rationale { get; set; }
    public string? DistractorRationale { get; set; }
    public string? MediaUrl { get; set; }
    public int DisplayOrder { get; set; }
}

public sealed class AdminExamPreviewQuestionDto
{
    public string Id { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public string Stem { get; set; } = string.Empty;
    public string? Instructions { get; set; }
    public string? ClinicalScenario { get; set; }
    public string? ExhibitsJson { get; set; }
    public string? StructuredContentJson { get; set; }
    public string QuestionType { get; set; } = string.Empty;
    public string QuestionTypeKey { get; set; } = string.Empty;
    public string ClientNeed { get; set; } = string.Empty;
    public string? ClientNeedId { get; set; }
    public string? ClientNeedName { get; set; }
    public string Difficulty { get; set; } = string.Empty;
    public List<AdminExamPreviewOptionDto> Options { get; set; } = new();
    public string? Rationale { get; set; }
    public string? OverallRationale { get; set; }
    public List<string> CorrectOptionKeys { get; set; } = new();
}

public sealed class AdminExamPreviewDto
{
    public bool Success { get; set; } = true;
    public string RevisionId { get; set; } = string.Empty;
    public string ExaminationCode { get; set; } = string.Empty;
    public string ExaminationTitle { get; set; } = string.Empty;
    public string RevisionTitle { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public int TimeLimitMinutes { get; set; }
    public decimal PassingScorePercent { get; set; }
    public int QuestionCount { get; set; }
    public string SelectionStrategy { get; set; } = "Preset";
    public string ReviewPolicy { get; set; } = "AfterExamSubmission";
    public bool ShowRationales { get; set; } = true;
    public List<AdminExamPreviewQuestionDto> Questions { get; set; } = new();
}
