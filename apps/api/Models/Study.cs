using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Preform.Api.Models;

/// <summary>
/// PrepFord AI Study Studio (Phase 1 core active-learning loop).
///
/// Personal flashcard decks enable an active learning loop: study a topic,
/// create flashcards, practise recall and let server-side spaced repetition
/// schedule the next review. Decks/flashcards are strictly owned by the
/// authenticated learner; no personal study material is ever shared into the
/// authoritative question bank.
///
/// Scheduling state is stored directly on <see cref="Flashcard"/> so due-card
/// queries remain a single indexed table scan; full review history is persisted
/// in <see cref="FlashcardReview"/> for audit and progress reporting.
/// </summary>

[Table("FlashcardDecks", Schema = "public")]
public class FlashcardDeck
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string UserEmail { get; set; } = string.Empty;

    [Required]
    [MaxLength(160)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(512)]
    public string Description { get; set; } = string.Empty;

    /// <summary>"rn" | "pn" | "both" — keeps RN and PN study material separated.</summary>
    [Required]
    [MaxLength(10)]
    public string Programme { get; set; } = "rn";

    /// <summary>"manual" | "curated_guide" — provenance of the deck content.</summary>
    [Required]
    [MaxLength(32)]
    public string SourceType { get; set; } = "manual";

    /// <summary>Human-readable source attribution, e.g. a study guide title.</summary>
    [MaxLength(256)]
    public string SourceReference { get; set; } = string.Empty;

    /// <summary>Optional topic linkage, harmonized with the learning structure taxonomy.</summary>
    [MaxLength(64)]
    public string TopicSlug { get; set; } = string.Empty;

    [MaxLength(160)]
    public string TopicTitle { get; set; } = string.Empty;

    public bool IsArchived { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Flashcard> Flashcards { get; set; } = new List<Flashcard>();
}

[Table("Flashcards", Schema = "public")]
public class Flashcard
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string DeckId { get; set; } = string.Empty;
    public FlashcardDeck Deck { get; set; } = null!;

    /// <summary>Denormalized owner id for ownership-scoped due-card and stats queries.</summary>
    [Required]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [MaxLength(512)]
    public string Front { get; set; } = string.Empty;

    [Required]
    [MaxLength(1024)]
    public string Back { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Explanation { get; set; } = string.Empty;

    /// <summary>"fundamental" | "medium" | "high_yield"</summary>
    [Required]
    [MaxLength(16)]
    public string Difficulty { get; set; } = "medium";

    [Required]
    [MaxLength(10)]
    public string Programme { get; set; } = "rn";

    /// <summary>"active" | "personal_unreviewed" | "archived"</summary>
    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = "active";

    /// <summary>Curated provenance: e.g. "prepford-curated-notes", empty for manual cards.</summary>
    [MaxLength(64)]
    public string SourceType { get; set; } = "manual";

    [MaxLength(256)]
    public string SourceReference { get; set; } = string.Empty;

    // ── SM-2 spaced repetition state (server-authoritative) ──
    public int RepetitionCount { get; set; } = 0;
    public double EaseFactor { get; set; } = 2.5;
    public int IntervalDays { get; set; } = 0;
    public DateTime DueAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastReviewedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<FlashcardReview> Reviews { get; set; } = new List<FlashcardReview>();
}

[Table("FlashcardReviews", Schema = "public")]
public class FlashcardReview
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string FlashcardId { get; set; } = string.Empty;
    public Flashcard Flashcard { get; set; } = null!;

    [Required]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;

    /// <summary>0 = Again, 1 = Hard, 2 = Good, 3 = Easy.</summary>
    public int RecallRating { get; set; }

    public int IntervalDays { get; set; }
    public double EaseFactor { get; set; }
    public int RepetitionCount { get; set; }

    public DateTime ReviewedAt { get; set; } = DateTime.UtcNow;
}
