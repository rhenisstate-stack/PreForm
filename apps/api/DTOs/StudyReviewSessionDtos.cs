using System.ComponentModel.DataAnnotations;

namespace Preform.Api.DTOs;

public class StudyReviewSessionDto
{
    public string Id { get; set; } = string.Empty;
    public string? DeckId { get; set; }
    public string? DeckName { get; set; }
    public string Mode { get; set; } = "all_due";
    public string Programme { get; set; } = "rn";
    public string? TopicSlug { get; set; }
    public string? TopicTitle { get; set; }
    public int TotalCards { get; set; }
    public int CardsReviewed { get; set; }
    public int CardsCorrect { get; set; }
    public int CardsDifficult { get; set; }
    public int CardsMissed { get; set; }
    public double AccuracyPercentage { get; set; }
    public int DurationSeconds { get; set; }
    public string Status { get; set; } = "in_progress";
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class StartReviewSessionRequest
{
    [MaxLength(128)]
    public string? DeckId { get; set; }

    /// <summary>"all_due" | "deck" | "topic" | "difficult" | "favourites" | "random"</summary>
    [Required, MaxLength(32)]
    public string Mode { get; set; } = "all_due";

    [MaxLength(10)]
    public string Programme { get; set; } = "rn";

    [MaxLength(128)]
    public string? TopicSlug { get; set; }

    [MaxLength(160)]
    public string? TopicTitle { get; set; }

    [Range(1, 100)]
    public int CardLimit { get; set; } = 20;
}

public class SubmitSessionCardRatingRequest
{
    [Required, MaxLength(128)]
    public string FlashcardId { get; set; } = string.Empty;

    /// <summary>0 = Again, 1 = Hard, 2 = Good, 3 = Easy.</summary>
    [Range(0, 3)]
    public int RecallRating { get; set; }

    public int ResponseTimeMs { get; set; } = 0;
}

public class ReviewSessionSummaryReportDto
{
    public StudyReviewSessionDto Session { get; set; } = null!;
    public List<FlashcardDto> DueCardsRemaining { get; set; } = new();
    public string RetentionRecommendation { get; set; } = string.Empty;
    public Dictionary<string, int> RatingDistribution { get; set; } = new();
}
