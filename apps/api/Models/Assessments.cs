using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Preform.Api.Models;

public enum ExamType
{
    Practice = 1,
    CAT = 2,
    MockSimulation = 3,
    DiagnosticReadiness = 4
}

public enum AttemptStatus
{
    InProgress = 1,
    Completed = 2,
    Abandoned = 3
}

public enum ExamLifecycleState
{
    Draft = 1,
    InReview = 2,
    Approved = 3,
    Published = 4,
    Archived = 5,
    Retired = 6
}

/// <summary>
/// Stable examination family identity across revisions (P3.1 Option B).
/// Holds permanent sequential code and pathway identity.
/// </summary>
[Table("Examinations", Schema = "public")]
public class Examination
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(10)]
    public string Pathway { get; set; } = "rn"; // "rn" or "pn"

    [Required]
    [MaxLength(16)]
    public string Code { get; set; } = string.Empty; // e.g. "RN-EX-000001"

    [Required]
    [MaxLength(128)]
    public string Title { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    [MaxLength(128)]
    public string CreatedBy { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? CurrentRevisionId { get; set; }
    public Exam? CurrentRevision { get; set; }

    [MaxLength(128)]
    public string? SuccessorExaminationId { get; set; }
    public Examination? SuccessorExamination { get; set; }

    public ICollection<Exam> Revisions { get; set; } = new List<Exam>();
}

/// <summary>
/// Explicit grading state of an attempt response.
/// A missing or invalid authoritative answer key must never be represented as
/// an incorrect answer; it is represented as Ungraded so the response is
/// excluded from authoritative score calculation and finalization.
/// </summary>
public enum ResponseGradingState
{
    /// <summary>Server graded the response using authoritative answer data.</summary>
    Graded = 1,

    /// <summary>Server could not grade the response because authoritative grading data is missing or invalid (e.g. no answer key). No score meaning is attached to this state.</summary>
    Ungraded = 2,
}

[Table("Exams", Schema = "public")]
public class Exam
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [MaxLength(10)]
    public string Pathway { get; set; } = "rn"; // "rn" or "pn"

    public ExamType ExamType { get; set; } = ExamType.Practice;

    public int TimeLimitMinutes { get; set; } = 0; // 0 for untimed

    public decimal PassingScorePercent { get; set; } = 75.0m;

    public bool IsPublished { get; set; } = false;

    // ── P3.1 Additive Revision, Concurrency & Lifecycle Metadata ──
    [MaxLength(128)]
    public string? ExaminationId { get; set; }
    public Examination? Examination { get; set; }

    public int RevisionNumber { get; set; } = 1;

    public ExamLifecycleState LifecycleState { get; set; } = ExamLifecycleState.Draft;

    public long ConcurrencyToken { get; set; } = 1;

    [Required]
    [MaxLength(128)]
    public string CreatedBy { get; set; } = "system";

    [MaxLength(128)]
    public string? SubmittedBy { get; set; }
    public DateTime? SubmittedAt { get; set; }

    [MaxLength(128)]
    public string? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }

    [MaxLength(128)]
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }

    [MaxLength(128)]
    public string? PublishedBy { get; set; }
    public DateTime? PublishedAt { get; set; }

    [MaxLength(128)]
    public string? ArchivedBy { get; set; }
    public DateTime? ArchivedAt { get; set; }

    [MaxLength(128)]
    public string? RetiredBy { get; set; }
    public DateTime? RetiredAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ExamQuestion> ExamQuestions { get; set; } = new List<ExamQuestion>();
    public ICollection<ExamAttempt> Attempts { get; set; } = new List<ExamAttempt>();
}

[Table("ExamQuestions", Schema = "public")]
public class ExamQuestion
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string ExamId { get; set; } = string.Empty;
    public Exam Exam { get; set; } = null!;

    [Required]
    public string QuestionId { get; set; } = string.Empty;
    public Question Question { get; set; } = null!;

    public int DisplayOrder { get; set; } = 0;
}

[Table("ExamAttempts", Schema = "public")]
public class ExamAttempt
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    [Required]
    public string ExamId { get; set; } = string.Empty;
    public Exam Exam { get; set; } = null!;

    public AttemptStatus Status { get; set; } = AttemptStatus.InProgress;

    public decimal ScorePercent { get; set; } = 0.0m;

    public bool Passed { get; set; } = false;

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// Immutable server-generated metadata snapshot captured at attempt initialization (P3.1 Option A).
    /// Preserves frozen examination title, code, settings and schema version.
    /// Relational question membership remains authoritatively in ExamAttemptQuestions.
    /// </summary>
    [Column(TypeName = "jsonb")]
    public string? MetadataSnapshot { get; set; }

    public ICollection<AttemptResponse> Responses { get; set; } = new List<AttemptResponse>();
}

[Table("AttemptResponses", Schema = "public")]
public class AttemptResponse
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string ExamAttemptId { get; set; } = string.Empty;
    public ExamAttempt ExamAttempt { get; set; } = null!;

    [Required]
    public string QuestionId { get; set; } = string.Empty;
    public Question Question { get; set; } = null!;

    [Required]
    public string SelectedOptionsJson { get; set; } = "[]"; // Serialized JSON array of chosen option keys

    public bool IsCorrect { get; set; } = false;

    public decimal ScoreAwarded { get; set; } = 0.0m;

    /// <summary>
    /// Whether the server authoritatively graded this response.
    /// Graded: IsCorrect/ScoreAwarded are server-derived and authoritative.
    /// Ungraded: authoritative grading data was unavailable (e.g. missing answer key);
    /// IsCorrect/ScoreAwarded carry no meaning and the response is excluded from
    /// score calculation and blocks authoritative finalization.
    /// </summary>
    public ResponseGradingState GradingState { get; set; } = ResponseGradingState.Graded;

    public int TimeSpentSeconds { get; set; } = 0;

    public DateTime AnsweredAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Captures the exact set of questions assigned to an attempt at the time the
/// attempt was created (or, for legacy in-flight attempts, when the question
/// first passes authoritative membership verification). This is the authority
/// used to enforce that a candidate may only answer questions that were
/// actually assigned to their attempt.
/// </summary>
[Table("ExamAttemptQuestions", Schema = "public")]
public class ExamAttemptQuestion
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string ExamAttemptId { get; set; } = string.Empty;
    public ExamAttempt ExamAttempt { get; set; } = null!;

    [Required]
    public string QuestionId { get; set; } = string.Empty;
    public Question Question { get; set; } = null!;

    public int DisplayOrder { get; set; } = 0;

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}
