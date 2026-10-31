using System.ComponentModel.DataAnnotations;
using Preform.Api.Models;

namespace Preform.Api.DTOs;

public class CreateFlashcardDeckRequest
{
    [Required, MaxLength(160)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(512)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(10)]
    public string Programme { get; set; } = "rn";

    [MaxLength(32)]
    public string SourceType { get; set; } = "manual";

    [MaxLength(256)]
    public string SourceReference { get; set; } = string.Empty;

    [MaxLength(64)]
    public string TopicSlug { get; set; } = string.Empty;

    [MaxLength(160)]
    public string TopicTitle { get; set; } = string.Empty;
}

public class CreateFlashcardRequest
{
    [Required, MaxLength(512)]
    public string Front { get; set; } = string.Empty;

    [Required, MaxLength(1024)]
    public string Back { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Explanation { get; set; } = string.Empty;

    [MaxLength(16)]
    public string Difficulty { get; set; } = "medium";

    [MaxLength(10)]
    public string Programme { get; set; } = string.Empty; // empty → inherit deck programme

    [MaxLength(64)]
    public string SourceType { get; set; } = "manual";

    [MaxLength(256)]
    public string SourceReference { get; set; } = string.Empty;
}

public class ReviewFlashcardRequest
{
    /// <summary>0 = Again, 1 = Hard, 2 = Good, 3 = Easy.</summary>
    [Range(0, 3)]
    public int RecallRating { get; set; }
}

public class FlashcardDeckDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Programme { get; set; } = "rn";
    public string SourceType { get; set; } = "manual";
    public string SourceReference { get; set; } = string.Empty;
    public string TopicSlug { get; set; } = string.Empty;
    public string TopicTitle { get; set; } = string.Empty;
    public bool IsArchived { get; set; }
    public int CardCount { get; set; }
    public int DueCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class FlashcardDto
{
    public string Id { get; set; } = string.Empty;
    public string DeckId { get; set; } = string.Empty;
    public string Front { get; set; } = string.Empty;
    public string Back { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    public string Difficulty { get; set; } = "medium";
    public string Programme { get; set; } = "rn";
    public string Status { get; set; } = "active";
    public string SourceType { get; set; } = "manual";
    public string SourceReference { get; set; } = string.Empty;
    public int RepetitionCount { get; set; }
    public double EaseFactor { get; set; } = 2.5;
    public int IntervalDays { get; set; }
    public DateTime DueAt { get; set; }
    public DateTime? LastReviewedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class FlashcardReviewDto
{
    public string Id { get; set; } = string.Empty;
    public string FlashcardId { get; set; } = string.Empty;
    public int RecallRating { get; set; }
    public int IntervalDays { get; set; }
    public double EaseFactor { get; set; }
    public int RepetitionCount { get; set; }
    public DateTime ReviewedAt { get; set; }
}

public class ReviewFlashcardResponse
{
    public bool Success { get; set; } = true;
    public FlashcardDto Card { get; set; } = new();
    /// <summary>Remaining number of cards due after this review.</summary>
    public int DueRemaining { get; set; }
}

public class StudyFlashcardsOverviewDto
{
    public int DeckCount { get; set; }
    public int CardCount { get; set; }
    public int DueCount { get; set; }
    public int ReviewedToday { get; set; }
    public DateTime? LastReviewAt { get; set; }
}
