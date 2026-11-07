using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Preform.Api.Models;

/// <summary>
/// Personal study folders for organizing learner notes.
/// Strictly owned by the authenticated learner.
/// </summary>
[Table("StudyFolders", Schema = "public")]
public class StudyFolder
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(32)]
    public string Color { get; set; } = "teal"; // e.g. "teal", "navy", "amber", "indigo", "rose"

    [MaxLength(64)]
    public string Icon { get; set; } = "Folder";

    public int DisplayOrder { get; set; } = 0;

    public bool IsArchived { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<StudyNote> Notes { get; set; } = new List<StudyNote>();
}

/// <summary>
/// Learner personal digital study notes with rich-text structured JSON persistence,
/// tagging, curriculum taxonomy alignment, and soft-delete recovery.
/// </summary>
[Table("StudyNotes", Schema = "public")]
public class StudyNote
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    [MaxLength(128)]
    public string? FolderId { get; set; }
    public StudyFolder? Folder { get; set; }

    [Required]
    [MaxLength(256)]
    public string Title { get; set; } = "Untitled Note";

    /// <summary>Validated editor structured JSON (e.g., TipTap/ProseMirror or rich document schema).</summary>
    [Required]
    public string ContentJson { get; set; } = "{}";

    /// <summary>Plaintext extraction for high-speed full-text search.</summary>
    public string ContentPlainText { get; set; } = string.Empty;

    /// <summary>"rn" | "pn" | "both" — ensures RN and PN notes remain segregated.</summary>
    [Required]
    [MaxLength(10)]
    public string Programme { get; set; } = "rn";

    [MaxLength(128)]
    public string? SubjectDomainId { get; set; }

    [MaxLength(128)]
    public string? TopicSlug { get; set; }

    [MaxLength(160)]
    public string? TopicTitle { get; set; }

    [MaxLength(32)]
    public string? ClientNeedId { get; set; }

    /// <summary>JSON array of string tags: e.g. ["cardiology", "pharmacology", "high-yield"].</summary>
    public string TagsJson { get; set; } = "[]";

    public bool IsPinned { get; set; } = false;
    public bool IsFavourite { get; set; } = false;
    public bool IsArchived { get; set; } = false;
    public bool IsDeleted { get; set; } = false; // Soft deletion support

    public int WordCount { get; set; } = 0;
    public int CharacterCount { get; set; } = 0;

    public DateTime LastEditedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<StudyNoteVersion> Versions { get; set; } = new List<StudyNoteVersion>();
}

/// <summary>
/// Revision history snapshot for personal notes.
/// </summary>
[Table("StudyNoteVersions", Schema = "public")]
public class StudyNoteVersion
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string NoteId { get; set; } = string.Empty;
    public StudyNote Note { get; set; } = null!;

    [Required]
    [MaxLength(256)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string ContentJson { get; set; } = "{}";

    public int WordCount { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Preserved flashcard review session tracking session progress, duration,
/// accuracy, and topic retention analytics.
/// </summary>
[Table("StudyReviewSessions", Schema = "public")]
public class StudyReviewSession
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    [MaxLength(128)]
    public string? DeckId { get; set; }
    public FlashcardDeck? Deck { get; set; }

    /// <summary>"all_due" | "deck" | "topic" | "difficult" | "favourites" | "random"</summary>
    [Required]
    [MaxLength(32)]
    public string Mode { get; set; } = "all_due";

    [Required]
    [MaxLength(10)]
    public string Programme { get; set; } = "rn";

    [MaxLength(128)]
    public string? TopicSlug { get; set; }

    [MaxLength(160)]
    public string? TopicTitle { get; set; }

    /// <summary>Filter criteria used when initiating the session.</summary>
    public string FilterCriteriaJson { get; set; } = "{}";

    public int TotalCards { get; set; } = 0;
    public int CardsReviewed { get; set; } = 0;
    public int CardsCorrect { get; set; } = 0;
    public int CardsDifficult { get; set; } = 0;
    public int CardsMissed { get; set; } = 0;

    public double AccuracyPercentage { get; set; } = 0.0;

    public int DurationSeconds { get; set; } = 0;

    /// <summary>"in_progress" | "completed" | "interrupted"</summary>
    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = "in_progress";

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public ICollection<StudyReviewSessionItem> Items { get; set; } = new List<StudyReviewSessionItem>();
}

/// <summary>
/// Cards presented within a preserved review session.
/// </summary>
[Table("StudyReviewSessionItems", Schema = "public")]
public class StudyReviewSessionItem
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string SessionId { get; set; } = string.Empty;
    public StudyReviewSession Session { get; set; } = null!;

    [Required]
    [MaxLength(128)]
    public string FlashcardId { get; set; } = string.Empty;
    public Flashcard Flashcard { get; set; } = null!;

    /// <summary>0 = Again, 1 = Hard, 2 = Good, 3 = Easy.</summary>
    public int RecallRating { get; set; }

    public int ResponseTimeMs { get; set; } = 0;

    public DateTime ReviewedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Reusable topic quiz configuration template.
/// </summary>
[Table("TopicQuizConfigurations", Schema = "public")]
public class TopicQuizConfiguration
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    [Required]
    [MaxLength(160)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(10)]
    public string Programme { get; set; } = "rn";

    [MaxLength(128)]
    public string? SubjectDomainId { get; set; }

    [MaxLength(128)]
    public string? TopicSlug { get; set; }

    [MaxLength(160)]
    public string? TopicTitle { get; set; }

    [MaxLength(32)]
    public string? ClientNeedId { get; set; }

    public int QuestionCount { get; set; } = 10;

    [MaxLength(32)]
    public string Difficulty { get; set; } = "all"; // "easy" | "moderate" | "hard" | "all"

    public int TimeLimitMinutes { get; set; } = 0; // 0 = untimed

    public bool ImmediateFeedback { get; set; } = true;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<TopicQuizAttempt> Attempts { get; set; } = new List<TopicQuizAttempt>();
}

/// <summary>
/// Learner topic quiz attempt record with scoring, timer, and Client Needs performance.
/// </summary>
[Table("TopicQuizAttempts", Schema = "public")]
public class TopicQuizAttempt
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    [MaxLength(128)]
    public string? ConfigurationId { get; set; }
    public TopicQuizConfiguration? Configuration { get; set; }

    [Required]
    [MaxLength(160)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(10)]
    public string Programme { get; set; } = "rn";

    [MaxLength(128)]
    public string? TopicSlug { get; set; }

    [MaxLength(160)]
    public string? TopicTitle { get; set; }

    [MaxLength(32)]
    public string? ClientNeedId { get; set; }

    public int TotalQuestions { get; set; } = 0;
    public int CorrectCount { get; set; } = 0;
    public int IncorrectCount { get; set; } = 0;

    public double ScorePercentage { get; set; } = 0.0;
    public int TimeSpentSeconds { get; set; } = 0;

    /// <summary>"in_progress" | "completed" | "abandoned"</summary>
    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = "in_progress";

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public ICollection<TopicQuizResponse> Responses { get; set; } = new List<TopicQuizResponse>();
}

/// <summary>
/// Individual question response within a topic quiz attempt, sourcing from canonical Questions.
/// </summary>
[Table("TopicQuizResponses", Schema = "public")]
public class TopicQuizResponse
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string AttemptId { get; set; } = string.Empty;
    public TopicQuizAttempt Attempt { get; set; } = null!;

    [Required]
    [MaxLength(128)]
    public string QuestionId { get; set; } = string.Empty;
    public Question Question { get; set; } = null!;

    /// <summary>JSON array of selected option indices: e.g. [0] or [1, 3].</summary>
    public string SelectedOptionIndicesJson { get; set; } = "[]";

    public bool IsCorrect { get; set; } = false;

    public int TimeSpentSeconds { get; set; } = 0;

    public bool FlaggedForReview { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Official Study Guide Categories managed by administrators.
/// </summary>
[Table("StudyGuideCategories", Schema = "public")]
public class StudyGuideCategory
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string Slug { get; set; } = string.Empty;

    [Required]
    [MaxLength(160)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(64)]
    public string ShortTitle { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(64)]
    public string Badge { get; set; } = "Core";

    [MaxLength(64)]
    public string IconName { get; set; } = "BookOpen";

    [MaxLength(32)]
    public string ColorTheme { get; set; } = "teal";

    public int DisplayOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CuratedStudyGuide> Guides { get; set; } = new List<CuratedStudyGuide>();
}

/// <summary>
/// Official published and versioned study guides authored by administrators and clinical educators.
/// </summary>
[Table("CuratedStudyGuides", Schema = "public")]
public class CuratedStudyGuide
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string CategoryId { get; set; } = string.Empty;
    public StudyGuideCategory Category { get; set; } = null!;

    [Required]
    [MaxLength(128)]
    public string Slug { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Summary { get; set; } = string.Empty;

    [MaxLength(32)]
    public string ReadTime { get; set; } = "5 min read";

    [MaxLength(32)]
    public string Difficulty { get; set; } = "High-Yield"; // "Fundamental" | "High-Yield" | "Advanced"

    /// <summary>"rn" | "pn" | "both"</summary>
    [Required]
    [MaxLength(10)]
    public string Programme { get; set; } = "both";

    [MaxLength(32)]
    public string? ClientNeedId { get; set; }

    /// <summary>JSON array of key takeaways strings.</summary>
    public string ClinicalKeyTakeawaysJson { get; set; } = "[]";

    /// <summary>Structured JSON sections: [{ heading, body, keyPoints, clinicalAlert }].</summary>
    [Required]
    public string ContentJson { get; set; } = "[]";

    /// <summary>"Draft" | "PendingReview" | "Approved" | "Published" | "Archived"</summary>
    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = "Published";

    public DateTime? PublishedAt { get; set; }
    public DateTime? ScheduledPublishAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CuratedGuideVersion> Versions { get; set; } = new List<CuratedGuideVersion>();
}

/// <summary>
/// Version history for official curated study guides.
/// </summary>
[Table("CuratedGuideVersions", Schema = "public")]
public class CuratedGuideVersion
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string GuideId { get; set; } = string.Empty;
    public CuratedStudyGuide Guide { get; set; } = null!;

    public int VersionNumber { get; set; } = 1;

    [Required]
    [MaxLength(256)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string ContentJson { get; set; } = "[]";

    [MaxLength(128)]
    public string CreatedBy { get; set; } = string.Empty;

    [MaxLength(512)]
    public string ChangeSummary { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
