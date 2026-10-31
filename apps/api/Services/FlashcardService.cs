using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

public class FlashcardService : IFlashcardService
{
    private const int MaxDueFetchLimit = 100;
    private static readonly HashSet<string> SupportedProgrammes = new(StringComparer.OrdinalIgnoreCase) { "rn", "pn", "both" };
    private static readonly HashSet<string> SupportedDifficulties = new(StringComparer.OrdinalIgnoreCase) { "fundamental", "medium", "high_yield" };
    private static readonly HashSet<string> SupportedSourceTypes = new(StringComparer.OrdinalIgnoreCase) { "manual", "curated_guide" };

    private readonly AppDbContext _context;
    private readonly ISpacedRepetitionService _spacedRepetition;
    private readonly ILogger<FlashcardService> _logger;

    public FlashcardService(
        AppDbContext context,
        ISpacedRepetitionService spacedRepetition,
        ILogger<FlashcardService> logger)
    {
        _context = context;
        _spacedRepetition = spacedRepetition;
        _logger = logger;
    }

    // ── Mapping ──

    private static FlashcardDeckDto MapDeck(FlashcardDeck deck, int cardCount, int dueCount) => new()
    {
        Id = deck.Id,
        Name = deck.Name,
        Description = deck.Description,
        Programme = deck.Programme,
        SourceType = deck.SourceType,
        SourceReference = deck.SourceReference,
        TopicSlug = deck.TopicSlug,
        TopicTitle = deck.TopicTitle,
        IsArchived = deck.IsArchived,
        CardCount = cardCount,
        DueCount = dueCount,
        CreatedAt = deck.CreatedAt,
        UpdatedAt = deck.UpdatedAt
    };

    private static FlashcardDto MapCard(Flashcard card) => new()
    {
        Id = card.Id,
        DeckId = card.DeckId,
        Front = card.Front,
        Back = card.Back,
        Explanation = card.Explanation,
        Difficulty = card.Difficulty,
        Programme = card.Programme,
        Status = card.Status,
        SourceType = card.SourceType,
        SourceReference = card.SourceReference,
        RepetitionCount = card.RepetitionCount,
        EaseFactor = card.EaseFactor,
        IntervalDays = card.IntervalDays,
        DueAt = card.DueAt,
        LastReviewedAt = card.LastReviewedAt,
        CreatedAt = card.CreatedAt
    };

    private static FlashcardReviewDto MapReview(FlashcardReview review) => new()
    {
        Id = review.Id,
        FlashcardId = review.FlashcardId,
        RecallRating = review.RecallRating,
        IntervalDays = review.IntervalDays,
        EaseFactor = review.EaseFactor,
        RepetitionCount = review.RepetitionCount,
        ReviewedAt = review.ReviewedAt
    };

    private static string NormalizeProgramme(string? programme, string fallback)
    {
        var normalized = (programme ?? string.Empty).Trim().ToLowerInvariant();
        return SupportedProgrammes.Contains(normalized) ? normalized : fallback;
    }

    private static void ValidateSource(string sourceType)
    {
        if (!SupportedSourceTypes.Contains(sourceType))
        {
            throw new ArgumentException("Unsupported flashcard source type. Only manual and curated guide sources are permitted.");
        }
    }

    // ── Decks ──

    /// <summary>
    /// Gateway-authenticated callers may not have a local Users row yet.
    /// Mirror the established ProfileImageService behaviour so the
    /// FlashcardDecks(UserId) foreign key can be satisfied on PostgreSQL
    /// without failing the request.
    /// </summary>
    private async Task EnsureUserRecordAsync(string userId, string email, CancellationToken ct)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var userExists = await _context.Users.AnyAsync(u => u.Id == userId || u.Email.ToLower() == normalizedEmail, ct);
        if (userExists)
        {
            return;
        }

        var now = DateTime.UtcNow;
        _context.Users.Add(new User
        {
            Id = userId,
            Email = normalizedEmail,
            DisplayName = "Nursing Candidate",
            PasswordHash = "session-managed",
            Pathway = "rn",
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        });
        await _context.SaveChangesAsync(ct);
    }

    public async Task<FlashcardDeckDto> CreateDeckAsync(
        string userId, string email, CreateFlashcardDeckRequest request, CancellationToken ct)
    {
        var name = request.Name.Trim();
        var programme = NormalizeProgramme(request.Programme, "rn");
        var sourceType = string.IsNullOrWhiteSpace(request.SourceType) ? "manual" : request.SourceType.Trim().ToLowerInvariant();
        ValidateSource(sourceType);

        if (name.Length == 0)
        {
            throw new ArgumentException("Deck name is required.");
        }

        await EnsureUserRecordAsync(userId, email, ct);

        var deck = new FlashcardDeck
        {
            UserId = userId,
            UserEmail = email,
            Name = name,
            Description = (request.Description ?? string.Empty).Trim(),
            Programme = programme,
            SourceType = sourceType,
            SourceReference = (request.SourceReference ?? string.Empty).Trim(),
            TopicSlug = (request.TopicSlug ?? string.Empty).Trim().ToLowerInvariant(),
            TopicTitle = (request.TopicTitle ?? string.Empty).Trim()
        };

        _context.FlashcardDecks.Add(deck);
        await _context.SaveChangesAsync(ct);
        return MapDeck(deck, 0, 0);
    }

    public async Task<List<FlashcardDeckDto>> GetDecksAsync(string userId, bool includeArchived, CancellationToken ct)
    {
        var query = _context.FlashcardDecks
            .Include(d => d.Flashcards)
            .Where(d => d.UserId == userId);

        if (!includeArchived)
        {
            query = query.Where(d => !d.IsArchived);
        }

        var decks = await query
            .OrderByDescending(d => d.UpdatedAt)
            .ToListAsync(ct);

        return decks
            .Select(d => MapDeck(
                d,
                d.Flashcards.Count(c => c.Status != "archived"),
                d.Flashcards.Count(c => c.Status != "archived" && c.DueAt <= DateTime.UtcNow)))
            .ToList();
    }

    public async Task<FlashcardDeckDto> GetDeckAsync(string userId, string deckId, CancellationToken ct)
    {
        var deck = await _context.FlashcardDecks
            .Include(d => d.Flashcards)
            .FirstOrDefaultAsync(d => d.Id == deckId && d.UserId == userId, ct)
            ?? throw new KeyNotFoundException("Deck not found.");

        return MapDeck(
            deck,
            deck.Flashcards.Count(c => c.Status != "archived"),
            deck.Flashcards.Count(c => c.Status != "archived" && c.DueAt <= DateTime.UtcNow));
    }

    /// <summary>
    /// Full card list for an owned deck (all scheduling states). Used by the
    /// flashcard deck manager; new personal_unreviewed and scheduled cards are
    /// both returned in creation order.
    /// </summary>
    public async Task<List<FlashcardDto>> GetDeckCardsAsync(string userId, string deckId, CancellationToken ct)
    {
        var deck = await _context.FlashcardDecks
            .FirstOrDefaultAsync(d => d.Id == deckId && d.UserId == userId, ct)
            ?? throw new KeyNotFoundException("Deck not found.");

        var cards = await _context.Flashcards
            .AsNoTracking()
            .Where(c => c.DeckId == deck.Id && c.UserId == userId && c.Status != "archived")
            .OrderBy(c => c.CreatedAt)
            .ToListAsync(ct);

        return cards.Select(MapCard).ToList();
    }

    public async Task<bool> ArchiveDeckAsync(string userId, string deckId, CancellationToken ct)
    {
        var deck = await _context.FlashcardDecks
            .FirstOrDefaultAsync(d => d.Id == deckId && d.UserId == userId, ct);

        if (deck == null)
        {
            return false;
        }

        deck.IsArchived = true;
        deck.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return true;
    }

    // ── Cards ──

    public async Task<FlashcardDto> AddCardAsync(
        string userId, string deckId, CreateFlashcardRequest request, CancellationToken ct)
    {
        var deck = await _context.FlashcardDecks
            .FirstOrDefaultAsync(d => d.Id == deckId && d.UserId == userId, ct);

        if (deck == null)
        {
            throw new KeyNotFoundException("Deck not found.");
        }

        if (deck.IsArchived)
        {
            throw new InvalidOperationException("Archived decks cannot accept new flashcards.");
        }

        var front = (request.Front ?? string.Empty).Trim();
        var back = (request.Back ?? string.Empty).Trim();
        if (front.Length == 0 || back.Length == 0)
        {
            throw new ArgumentException("Flashcard front and back text are required.");
        }

        var difficulty = (request.Difficulty ?? string.Empty).Trim().ToLowerInvariant();
        if (!SupportedDifficulties.Contains(difficulty))
        {
            difficulty = "medium";
        }

        var sourceType = (request.SourceType ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(sourceType))
        {
            sourceType = deck.SourceType;
        }
        ValidateSource(sourceType);

        var now = DateTime.UtcNow;
        var card = new Flashcard
        {
            DeckId = deck.Id,
            UserId = userId,
            Front = front,
            Back = back,
            Explanation = (request.Explanation ?? string.Empty).Trim(),
            Difficulty = difficulty,
            Programme = NormalizeProgramme(request.Programme, deck.Programme),
            Status = deck.SourceType == "curated_guide" || sourceType == "curated_guide"
                ? "personal_unreviewed"
                : "active",
            SourceType = sourceType,
            SourceReference = string.IsNullOrWhiteSpace(request.SourceReference)
                ? deck.SourceReference
                : request.SourceReference.Trim(),
            DueAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Flashcards.Add(card);
        deck.UpdatedAt = now;
        await _context.SaveChangesAsync(ct);
        return MapCard(card);
    }

    public async Task<bool> DeleteCardAsync(string userId, string cardId, CancellationToken ct)
    {
        var card = await _context.Flashcards
            .FirstOrDefaultAsync(c => c.Id == cardId && c.UserId == userId, ct);

        if (card == null)
        {
            return false;
        }

        _context.Flashcards.Remove(card);
        await _context.SaveChangesAsync(ct);

        // Keep the deck freshness timestamp accurate for "recent decks" lists.
        var deck = await _context.FlashcardDecks.FirstOrDefaultAsync(d => d.Id == card.DeckId, ct);
        if (deck != null)
        {
            deck.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
        }

        return true;
    }

    // ── Review scheduling ──

    public async Task<List<FlashcardDto>> GetDueCardsAsync(string userId, string? programme, int limit, CancellationToken ct)
    {
        var safeLimit = limit is < 1 or > MaxDueFetchLimit ? 20 : limit;
        var now = DateTime.UtcNow;

        var query = _context.Flashcards
            .AsNoTracking()
            .Where(c => c.UserId == userId && c.Status != "archived" && c.DueAt <= now);

        var normalizedProgramme = (programme ?? string.Empty).Trim().ToLowerInvariant();
        if (SupportedProgrammes.Contains(normalizedProgramme) && !string.Equals(normalizedProgramme, "both", StringComparison.OrdinalIgnoreCase))
        {
            // Programme separation: RN learners study RN cards, PN learners study PN cards.
            query = query.Where(c => c.Programme == normalizedProgramme || c.Programme == "both");
        }

        var cards = await query
            .OrderBy(c => c.DueAt)
            .Take(safeLimit)
            .ToListAsync(ct);

        return cards.Select(MapCard).ToList();
    }

    public async Task<ReviewFlashcardResponse> ReviewCardAsync(
        string userId, string cardId, RecallRating rating, CancellationToken ct)
    {
        var card = await _context.Flashcards
            .FirstOrDefaultAsync(c => c.Id == cardId && c.UserId == userId, ct);

        if (card == null)
        {
            throw new KeyNotFoundException("Flashcard not found.");
        }

        var reviewTime = DateTime.UtcNow;
        var update = _spacedRepetition.Schedule(rating, card.IntervalDays, card.EaseFactor, card.RepetitionCount, reviewTime);

        card.IntervalDays = update.IntervalDays;
        card.EaseFactor = update.EaseFactor;
        card.RepetitionCount = update.RepetitionCount;
        card.DueAt = update.NextDueAt;
        card.LastReviewedAt = reviewTime;
        card.UpdatedAt = reviewTime;
        // A card that reaches a "Good" or better first review is acknowledged as practised personal material.
        if (card.Status == "personal_unreviewed" && rating >= RecallRating.Good)
        {
            card.Status = "active";
        }

        _context.FlashcardReviews.Add(new FlashcardReview
        {
            FlashcardId = card.Id,
            UserId = userId,
            RecallRating = (int)rating,
            IntervalDays = update.IntervalDays,
            EaseFactor = update.EaseFactor,
            RepetitionCount = update.RepetitionCount,
            ReviewedAt = reviewTime
        });

        await _context.SaveChangesAsync(ct);

        var dueRemaining = await _context.Flashcards
            .CountAsync(c => c.UserId == userId && c.Status != "archived" && c.DueAt <= reviewTime, ct);

        return new ReviewFlashcardResponse
        {
            Success = true,
            Card = MapCard(card),
            DueRemaining = dueRemaining
        };
    }

    public async Task<List<FlashcardReviewDto>> GetCardReviewsAsync(string userId, string cardId, CancellationToken ct)
    {
        var cardExists = await _context.Flashcards
            .AnyAsync(c => c.Id == cardId && c.UserId == userId, ct);

        if (!cardExists)
        {
            throw new KeyNotFoundException("Flashcard not found.");
        }

        var reviews = await _context.FlashcardReviews
            .AsNoTracking()
            .Where(r => r.FlashcardId == cardId && r.UserId == userId)
            .OrderByDescending(r => r.ReviewedAt)
            .ToListAsync(ct);

        return reviews.Select(MapReview).ToList();
    }

    // ── Overview ──

    public async Task<StudyFlashcardsOverviewDto> GetOverviewAsync(string userId, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var dayStart = now.Date;

        var cards = _context.Flashcards.Where(c => c.UserId == userId && c.Status != "archived");

        var overview = new StudyFlashcardsOverviewDto
        {
            DeckCount = await _context.FlashcardDecks.CountAsync(d => d.UserId == userId && !d.IsArchived, ct),
            CardCount = await cards.CountAsync(ct),
            DueCount = await cards.CountAsync(c => c.DueAt <= now, ct),
            ReviewedToday = await _context.FlashcardReviews
                .CountAsync(r => r.UserId == userId && r.ReviewedAt >= dayStart, ct),
            LastReviewAt = await _context.FlashcardReviews
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.ReviewedAt)
                .Select(r => (DateTime?)r.ReviewedAt)
                .FirstOrDefaultAsync(ct)
        };

        return overview;
    }
}
