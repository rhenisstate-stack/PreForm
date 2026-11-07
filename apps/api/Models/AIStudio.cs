using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Preform.Api.Models;

/// <summary>
/// Provider and model settings for AI services (e.g. Google Gemini).
/// Managed by platform administrators.
/// </summary>
[Table("AIProviderConfigurations", Schema = "public")]
public class AIProviderConfiguration
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(64)]
    public string ProviderName { get; set; } = "gemini"; // e.g. "gemini", "mock"

    [Required]
    [MaxLength(64)]
    public string ModelId { get; set; } = "gemini-1.5-flash"; // e.g. "gemini-1.5-flash", "gemini-1.5-pro"

    public bool IsEnabled { get; set; } = true;

    public double Temperature { get; set; } = 0.2;

    public int MaxOutputTokens { get; set; } = 2048;

    public int TimeoutSeconds { get; set; } = 30;

    /// <summary>JSON object with feature toggles: { "notes": true, "flashcards": true, "quizzes": true, "tutor": true, "plans": true, "documents": true }</summary>
    public string FeatureTogglesJson { get; set; } = "{}";

    public int DailyPerUserQuota { get; set; } = 50;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Audit trail for all inbound AI requests with token consumption and latency metrics.
/// </summary>
[Table("AIRequests", Schema = "public")]
public class AIRequest
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    /// <summary>"note_summary" | "flashcard_gen" | "quiz_gen" | "tutor_chat" | "study_plan" | "doc_process"</summary>
    [Required]
    [MaxLength(64)]
    public string Feature { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string Provider { get; set; } = "gemini";

    [Required]
    [MaxLength(64)]
    public string Model { get; set; } = "gemini-1.5-flash";

    public int InputTokens { get; set; } = 0;
    public int OutputTokens { get; set; } = 0;
    public int LatencyMs { get; set; } = 0;

    /// <summary>"success" | "throttled" | "failed" | "rejected_content"</summary>
    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = "success";

    [MaxLength(1024)]
    public string? ErrorMessage { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Aggregated daily usage record for monitoring and cost accounting.
/// </summary>
[Table("AIUsageRecords", Schema = "public")]
public class AIUsageRecord
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;

    public DateTime DateUtc { get; set; }

    public int RequestCount { get; set; } = 0;
    public int TotalInputTokens { get; set; } = 0;
    public int TotalOutputTokens { get; set; } = 0;

    public decimal EstimatedCostUsd { get; set; } = 0m;
}

/// <summary>
/// Learner personalized study plan generated via AI or curated templates.
/// </summary>
[Table("AIStudyPlans", Schema = "public")]
public class AIStudyPlan
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    [Required]
    [MaxLength(160)]
    public string Title { get; set; } = "Personal NCLEX Study Plan";

    public DateTime? TargetExamDate { get; set; }

    public int WeeklyAvailableHours { get; set; } = 15;

    [Required]
    [MaxLength(10)]
    public string Programme { get; set; } = "rn";

    /// <summary>Structured JSON representing weekly schedule and milestone targets.</summary>
    [Required]
    public string PlanJson { get; set; } = "{}";

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Contextual AI clinical tutor conversation thread metadata.
/// </summary>
[Table("AITutorConversations", Schema = "public")]
public class AITutorConversation
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    [MaxLength(128)]
    public string? TopicSlug { get; set; }

    [Required]
    [MaxLength(160)]
    public string Title { get; set; } = "Clinical Dialogue";

    [Required]
    [MaxLength(10)]
    public string Programme { get; set; } = "rn";

    /// <summary>JSON array of messages: [{ id, role, content, timestamp }].</summary>
    [Required]
    public string MessagesJson { get; set; } = "[]";

    public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Moderation and review queue for AI-generated educational content prior to publishing.
/// </summary>
[Table("AIContentReviews", Schema = "public")]
public class AIContentReview
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [MaxLength(128)]
    public string? SourceRequestId { get; set; }

    /// <summary>"flashcard" | "quiz_question" | "study_note"</summary>
    [Required]
    [MaxLength(32)]
    public string ContentType { get; set; } = string.Empty;

    [Required]
    public string DraftPayloadJson { get; set; } = "{}";

    /// <summary>"pending" | "approved" | "rejected" | "modified"</summary>
    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = "pending";

    [MaxLength(128)]
    public string? ReviewerUserId { get; set; }

    [MaxLength(1024)]
    public string? ReviewNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
}
