using System.ComponentModel.DataAnnotations;

namespace Preform.Api.DTOs;

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}

// ==========================================
// 1. Administrative Notes Management DTOs
// ==========================================

public class AdminStudyNoteDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string AuthorEmail { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string? FolderId { get; set; }
    public string? FolderName { get; set; }
    public string Title { get; set; } = string.Empty;
    public string ContentJson { get; set; } = "{}";
    public string ContentPlainText { get; set; } = string.Empty;
    public string Programme { get; set; } = "rn";
    public string? SubjectDomainId { get; set; }
    public string? TopicSlug { get; set; }
    public string? TopicTitle { get; set; }
    public string? ClientNeedId { get; set; }
    public List<string> Tags { get; set; } = new();
    public bool IsPinned { get; set; }
    public bool IsFavourite { get; set; }
    public bool IsArchived { get; set; }
    public string Status { get; set; } = "Draft"; // "Draft", "PendingReview", "Approved", "Published", "Archived"
    public bool IsOfficial { get; set; }
    public string? StudyGuideId { get; set; }
    public int WordCount { get; set; }
    public int CharacterCount { get; set; }
    public DateTime LastEditedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class AdminCreateNoteRequest
{
    [Required]
    [MaxLength(256)]
    public string Title { get; set; } = "Untitled Note";

    [Required]
    public string ContentJson { get; set; } = "{}";

    public string ContentPlainText { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(rn|pn|both)$", ErrorMessage = "Programme must be 'rn', 'pn', or 'both'.")]
    public string Programme { get; set; } = "rn";

    public string? FolderId { get; set; }
    public string? SubjectDomainId { get; set; }
    public string? TopicSlug { get; set; }
    public string? TopicTitle { get; set; }
    public string? ClientNeedId { get; set; }
    public List<string> Tags { get; set; } = new();

    public string Status { get; set; } = "Draft";
    public bool IsOfficial { get; set; } = true;
    public string? StudyGuideId { get; set; }
}

public class AdminUpdateNoteRequest
{
    [Required]
    [MaxLength(256)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string ContentJson { get; set; } = "{}";

    public string ContentPlainText { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(rn|pn|both)$", ErrorMessage = "Programme must be 'rn', 'pn', or 'both'.")]
    public string Programme { get; set; } = "rn";

    public string? FolderId { get; set; }
    public string? SubjectDomainId { get; set; }
    public string? TopicSlug { get; set; }
    public string? TopicTitle { get; set; }
    public string? ClientNeedId { get; set; }
    public List<string> Tags { get; set; } = new();

    public string Status { get; set; } = "Draft";
    public bool IsOfficial { get; set; } = true;
    public string? StudyGuideId { get; set; }
}

public class AdminNoteFilterParameters
{
    public string? Search { get; set; }
    public string? Programme { get; set; }
    public string? Status { get; set; }
    public string? ClientNeedId { get; set; }
    public string? SubjectDomainId { get; set; }
    public string? TopicSlug { get; set; }
    public bool? IsOfficial { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string SortBy { get; set; } = "updatedAt";
    public string SortOrder { get; set; } = "desc";
}

// ==========================================
// 2. Administrative Flashcards Management DTOs
// ==========================================

public class AdminFlashcardDeckDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Programme { get; set; } = "rn";
    public string SourceType { get; set; } = "manual";
    public string SourceReference { get; set; } = string.Empty;
    public string TopicSlug { get; set; } = string.Empty;
    public string TopicTitle { get; set; } = string.Empty;
    public string? ClientNeedId { get; set; }
    public List<string> Tags { get; set; } = new();
    public bool IsArchived { get; set; }
    public bool IsPublished { get; set; }
    public bool IsOfficial { get; set; }
    public int CardCount { get; set; }
    public int DueCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class AdminCreateDeckRequest
{
    [Required]
    [MaxLength(160)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(512)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(rn|pn|both)$", ErrorMessage = "Programme must be 'rn', 'pn', or 'both'.")]
    public string Programme { get; set; } = "rn";

    public string SourceType { get; set; } = "official";
    public string SourceReference { get; set; } = string.Empty;
    public string TopicSlug { get; set; } = string.Empty;
    public string TopicTitle { get; set; } = string.Empty;
    public string? ClientNeedId { get; set; }
    public List<string> Tags { get; set; } = new();
    public bool IsPublished { get; set; } = true;
    public bool IsOfficial { get; set; } = true;
}

public class AdminUpdateDeckRequest
{
    [Required]
    [MaxLength(160)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(512)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(rn|pn|both)$", ErrorMessage = "Programme must be 'rn', 'pn', or 'both'.")]
    public string Programme { get; set; } = "rn";

    public string SourceType { get; set; } = "official";
    public string SourceReference { get; set; } = string.Empty;
    public string TopicSlug { get; set; } = string.Empty;
    public string TopicTitle { get; set; } = string.Empty;
    public string? ClientNeedId { get; set; }
    public List<string> Tags { get; set; } = new();
    public bool IsPublished { get; set; } = true;
    public bool IsOfficial { get; set; } = true;
}

public class AdminFlashcardDto
{
    public string Id { get; set; } = string.Empty;
    public string DeckId { get; set; } = string.Empty;
    public string DeckName { get; set; } = string.Empty;
    public string Front { get; set; } = string.Empty;
    public string Back { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? DiagramUrl { get; set; }
    public string CardStyle { get; set; } = "qa";
    public string Difficulty { get; set; } = "medium";
    public string Programme { get; set; } = "rn";
    public string Status { get; set; } = "active";
    public string? TopicTitle { get; set; }
    public string? ClientNeedId { get; set; }
    public List<string> Tags { get; set; } = new();
    public int DisplayOrder { get; set; }
    public int RepetitionCount { get; set; }
    public double EaseFactor { get; set; }
    public int IntervalDays { get; set; }
    public DateTime DueAt { get; set; }
    public DateTime? LastReviewedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminCreateCardRequest
{
    [Required]
    [MaxLength(512)]
    public string Front { get; set; } = string.Empty;

    [Required]
    [MaxLength(1024)]
    public string Back { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Explanation { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }
    public string? DiagramUrl { get; set; }
    public string CardStyle { get; set; } = "qa";
    public string Difficulty { get; set; } = "medium";
    public string Programme { get; set; } = "rn";
    public List<string> Tags { get; set; } = new();
    public string SourceReference { get; set; } = string.Empty;
}

public class AdminUpdateCardRequest
{
    [Required]
    [MaxLength(512)]
    public string Front { get; set; } = string.Empty;

    [Required]
    [MaxLength(1024)]
    public string Back { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Explanation { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }
    public string? DiagramUrl { get; set; }
    public string CardStyle { get; set; } = "qa";
    public string Difficulty { get; set; } = "medium";
    public string Programme { get; set; } = "rn";
    public List<string> Tags { get; set; } = new();
    public string SourceReference { get; set; } = string.Empty;
}



// ==========================================
// 3. Administrative Review Sessions DTOs
// ==========================================

public class StudyReviewConfigurationDto
{
    public string Id { get; set; } = "global_config";
    public int MaxCardsPerSession { get; set; }
    public int DefaultCardLimit { get; set; }
    public List<string> SupportedModes { get; set; } = new();
    public bool EnableRn { get; set; }
    public bool EnablePn { get; set; }
    public bool RequireSubscription { get; set; }
    public bool AllowCustomDrills { get; set; }
    public int MinIntervalDays { get; set; }
    public double DefaultEaseFactor { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string UpdatedBy { get; set; } = string.Empty;
}

public class UpdateReviewConfigurationRequest
{
    public int MaxCardsPerSession { get; set; } = 50;
    public int DefaultCardLimit { get; set; } = 20;
    public List<string> SupportedModes { get; set; } = new() { "all_due", "deck", "difficult", "favourites", "random" };
    public bool EnableRn { get; set; } = true;
    public bool EnablePn { get; set; } = true;
    public bool RequireSubscription { get; set; } = false;
    public bool AllowCustomDrills { get; set; } = true;
    public int MinIntervalDays { get; set; } = 1;
    public double DefaultEaseFactor { get; set; } = 2.5;
}

public class AdminReviewAnalyticsDto
{
    public int TotalSessions { get; set; }
    public int CompletedSessions { get; set; }
    public int AbandonedSessions { get; set; }
    public double CompletionRate { get; set; }

    public int TotalCardsReviewed { get; set; }
    public double OverallAccuracyPercentage { get; set; }
    public double AverageDurationSeconds { get; set; }

    public List<ReviewSubjectMetricDto> SubjectBreakdown { get; set; } = new();
    public List<ReviewProgrammeMetricDto> ProgrammeBreakdown { get; set; } = new();
    public List<DifficultFlashcardSummaryDto> FrequentlyDifficultCards { get; set; } = new();
    public ReviewSchedulingStatsDto SchedulingStats { get; set; } = new();
}

public class ReviewSubjectMetricDto
{
    public string Subject { get; set; } = string.Empty;
    public int SessionCount { get; set; }
    public double AccuracyPercentage { get; set; }
}

public class ReviewProgrammeMetricDto
{
    public string Programme { get; set; } = string.Empty;
    public int SessionCount { get; set; }
    public int CardsReviewed { get; set; }
    public double AccuracyPercentage { get; set; }
}

public class DifficultFlashcardSummaryDto
{
    public string FlashcardId { get; set; } = string.Empty;
    public string Front { get; set; } = string.Empty;
    public string DeckName { get; set; } = string.Empty;
    public string Programme { get; set; } = string.Empty;
    public int AgainCount { get; set; }
    public int HardCount { get; set; }
    public int TotalReviews { get; set; }
    public double FailureRate { get; set; }
}

public class ReviewSchedulingStatsDto
{
    public int TotalActiveCards { get; set; }
    public int CardsDueToday { get; set; }
    public int CardsDueThisWeek { get; set; }
    public double AverageEaseFactor { get; set; }
}

public class AdminReviewSessionRecordDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string? DeckId { get; set; }
    public string? DeckName { get; set; }
    public string Mode { get; set; } = string.Empty;
    public string Programme { get; set; } = "rn";
    public string? TopicTitle { get; set; }
    public int TotalCards { get; set; }
    public int CardsReviewed { get; set; }
    public int CardsCorrect { get; set; }
    public int CardsDifficult { get; set; }
    public int CardsMissed { get; set; }
    public double AccuracyPercentage { get; set; }
    public int DurationSeconds { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class AdminReviewSessionDetailDto : AdminReviewSessionRecordDto
{
    public List<AdminReviewSessionItemDto> Items { get; set; } = new();
}

public class AdminReviewSessionItemDto
{
    public string Id { get; set; } = string.Empty;
    public string FlashcardId { get; set; } = string.Empty;
    public string Front { get; set; } = string.Empty;
    public string Back { get; set; } = string.Empty;
    public int RecallRating { get; set; }
    public int ResponseTimeMs { get; set; }
    public DateTime ReviewedAt { get; set; }
}

// ==========================================
// 4. Administrative Topic Quizzes DTOs
// ==========================================

public class AdminTopicQuizDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Programme { get; set; } = "rn";
    public string? SubjectDomainId { get; set; }
    public string? TopicSlug { get; set; }
    public string? TopicTitle { get; set; }
    public string? ClientNeedId { get; set; }
    public int QuestionCount { get; set; }
    public string Difficulty { get; set; } = "all";
    public int TimeLimitMinutes { get; set; }
    public bool ImmediateFeedback { get; set; }
    public string FeedbackMode { get; set; } = "immediate";
    public int MaxAttempts { get; set; }
    public int TargetScore { get; set; } = 75;
    public string Status { get; set; } = "Draft"; // "Draft", "Published", "Archived"
    public bool IsPublished { get; set; }
    public bool IsOfficial { get; set; }
    public bool IsArchived { get; set; }
    public List<string> QuestionIds { get; set; } = new();
    public int AttemptCount { get; set; }
    public double AverageScore { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class AdminCreateTopicQuizRequest
{
    [Required]
    [MaxLength(160)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(rn|pn|both)$", ErrorMessage = "Programme must be 'rn', 'pn', or 'both'.")]
    public string Programme { get; set; } = "rn";

    public string? SubjectDomainId { get; set; }
    public string? TopicSlug { get; set; }
    public string? TopicTitle { get; set; }
    public string? ClientNeedId { get; set; }
    public int QuestionCount { get; set; } = 10;
    public string Difficulty { get; set; } = "all";
    public int TimeLimitMinutes { get; set; } = 0;
    public bool ImmediateFeedback { get; set; } = true;
    public string FeedbackMode { get; set; } = "immediate";
    public int MaxAttempts { get; set; } = 0;
    [Range(50, 100, ErrorMessage = "TargetScore must be between 50 and 100.")]
    public int TargetScore { get; set; } = 75;
    public string Status { get; set; } = "Draft";
    public bool IsPublished { get; set; } = false;
    public bool IsOfficial { get; set; } = true;
    public List<string> QuestionIds { get; set; } = new();
}

public class AdminUpdateTopicQuizRequest
{
    [Required]
    [MaxLength(160)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(rn|pn|both)$", ErrorMessage = "Programme must be 'rn', 'pn', or 'both'.")]
    public string Programme { get; set; } = "rn";

    public string? SubjectDomainId { get; set; }
    public string? TopicSlug { get; set; }
    public string? TopicTitle { get; set; }
    public string? ClientNeedId { get; set; }
    public int QuestionCount { get; set; } = 10;
    public string Difficulty { get; set; } = "all";
    public int TimeLimitMinutes { get; set; } = 0;
    public bool ImmediateFeedback { get; set; } = true;
    public string FeedbackMode { get; set; } = "immediate";
    public int MaxAttempts { get; set; } = 0;
    [Range(50, 100, ErrorMessage = "TargetScore must be between 50 and 100.")]
    public int TargetScore { get; set; } = 75;
    public string Status { get; set; } = "Draft";
    public bool IsPublished { get; set; } = false;
    public bool IsOfficial { get; set; } = true;
    public List<string> QuestionIds { get; set; } = new();
}

public class AdminQuizQuestionDto
{
    public string Id { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string Pathway { get; set; } = "rn";
    public string QuestionTypeKey { get; set; } = "single-choice";
    public string Stem { get; set; } = string.Empty;
    public string? Instructions { get; set; }
    public string Difficulty { get; set; } = "Moderate";
    public string Status { get; set; } = "Published";
    public string? OverallRationale { get; set; }
    public string? CognitiveLevel { get; set; }
    public string? ClinicalJudgmentStep { get; set; }
    public string? TopicTitle { get; set; }
    public string? ClientNeedId { get; set; }
    public List<string> Options { get; set; } = new();
}

public class AssignQuizQuestionsRequest
{
    [Required]
    public List<string> QuestionIds { get; set; } = new();
}

public class AIGenerateQuizQuestionsRequest
{
    [Required]
    public string Topic { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(rn|pn)$")]
    public string Programme { get; set; } = "rn";

    public int QuestionCount { get; set; } = 5;
    public string? ClientNeedId { get; set; }
    public string? Difficulty { get; set; } = "moderate";
}

public class AIDraftQuestionDto
{
    public string Stem { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public int CorrectOptionIndex { get; set; }
    public string Rationale { get; set; } = string.Empty;
    public string Difficulty { get; set; } = "moderate";
    public string QuestionTypeKey { get; set; } = "single-choice";
    public bool IsAiGenerated { get; set; } = true;
}

public class AdminQuizAnalyticsDto
{
    public int TotalAttempts { get; set; }
    public int CompletedAttempts { get; set; }
    public double CompletionRate { get; set; }
    public double AverageScore { get; set; }
    public double AverageDurationSeconds { get; set; }

    public List<QuizQuestionPerformanceDto> QuestionPerformance { get; set; } = new();
    public List<QuizTopicMetricDto> TopicPerformance { get; set; } = new();
    public List<QuizProgrammeMetricDto> ProgrammePerformance { get; set; } = new();
    public List<FrequentlyMissedQuestionDto> FrequentlyMissedQuestions { get; set; } = new();
}

public class QuizQuestionPerformanceDto
{
    public string QuestionId { get; set; } = string.Empty;
    public string Stem { get; set; } = string.Empty;
    public string TypeKey { get; set; } = string.Empty;
    public int TimesEncountered { get; set; }
    public int CorrectCount { get; set; }
    public double AccuracyPercentage { get; set; }
}

public class QuizTopicMetricDto
{
    public string Topic { get; set; } = string.Empty;
    public int Attempts { get; set; }
    public double AverageScore { get; set; }
}

public class QuizProgrammeMetricDto
{
    public string Programme { get; set; } = string.Empty;
    public int Attempts { get; set; }
    public double AverageScore { get; set; }
}

public class FrequentlyMissedQuestionDto
{
    public string QuestionId { get; set; } = string.Empty;
    public string Stem { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public int TotalResponses { get; set; }
    public int IncorrectResponses { get; set; }
    public double MissRatePercentage { get; set; }
}

public class SetStatusRequest
{
    public string Status { get; set; } = string.Empty;
}

public class ArchiveRequest
{
    public bool IsArchived { get; set; } = true;
}

public class PublishRequest
{
    public bool IsPublished { get; set; } = true;
}

public class ReorderCardsRequest
{
    public List<string> CardIds { get; set; } = new();
}

public class AssignQuestionsRequest
{
    public List<string> QuestionIds { get; set; } = new();
}

