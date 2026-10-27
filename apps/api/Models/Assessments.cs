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

    public int TimeSpentSeconds { get; set; } = 0;

    public DateTime AnsweredAt { get; set; } = DateTime.UtcNow;
}
