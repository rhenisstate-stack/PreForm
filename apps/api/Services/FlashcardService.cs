using System.Text.Json;
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
    private static readonly HashSet<string> SupportedSourceTypes = new(StringComparer.OrdinalIgnoreCase) { "manual", "curated_guide", "ai_generated" };

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

    private static List<string> ParseTags(string tagsJson)
    {
        try
        {
            return JsonSerializer.Deserialize<List<string>>(tagsJson) ?? new List<string>();
        }
        catch
        {
            return new List<string>();
        }
    }

    private static string SerializeTags(List<string>? tags)
    {
        return JsonSerializer.Serialize(tags ?? new List<string>());
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
        ClientNeedId = deck.ClientNeedId,
        Tags = ParseTags(deck.TagsJson),
        IsFavourite = deck.IsFavourite,
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
        ImageUrl = card.ImageUrl,
        DiagramUrl = card.DiagramUrl,
        CardStyle = card.CardStyle,
        IsFavourite = card.IsFavourite,
        IsDifficult = card.IsDifficult,
        SubjectDomainId = card.SubjectDomainId,
        TopicSlug = card.TopicSlug,
        TopicTitle = card.TopicTitle,
        ClientNeedId = card.ClientNeedId,
        Tags = ParseTags(card.TagsJson),
        DisplayOrder = card.DisplayOrder,
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
            throw new ArgumentException("Unsupported flashcard source type. Only manual, curated guide, and AI generated sources are permitted.");
        }
    }

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

    // ── Decks ──

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
            TopicTitle = (request.TopicTitle ?? string.Empty).Trim(),
            ClientNeedId = request.ClientNeedId,
            TagsJson = SerializeTags(request.Tags),
            IsFavourite = false,
            IsArchived = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
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
            .OrderByDescending(d => d.IsFavourite)
            .ThenByDescending(d => d.UpdatedAt)
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

    public async Task<FlashcardDeckDto> UpdateDeckAsync(
        string userId, string deckId, UpdateFlashcardDeckRequest request, CancellationToken ct)
    {
        var deck = await _context.FlashcardDecks
            .Include(d => d.Flashcards)
            .FirstOrDefaultAsync(d => d.Id == deckId && d.UserId == userId, ct)
            ?? throw new KeyNotFoundException("Deck not found.");

        if (request.Name != null) deck.Name = request.Name.Trim();
        if (request.Description != null) deck.Description = request.Description.Trim();
        if (request.Programme != null) deck.Programme = NormalizeProgramme(request.Programme, deck.Programme);
        if (request.TopicSlug != null) deck.TopicSlug = request.TopicSlug.Trim().ToLowerInvariant();
        if (request.TopicTitle != null) deck.TopicTitle = request.TopicTitle.Trim();
        if (request.ClientNeedId != null) deck.ClientNeedId = request.ClientNeedId;
        if (request.Tags != null) deck.TagsJson = SerializeTags(request.Tags);
        if (request.IsFavourite.HasValue) deck.IsFavourite = request.IsFavourite.Value;
        if (request.IsArchived.HasValue) deck.IsArchived = request.IsArchived.Value;

        deck.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return MapDeck(
            deck,
            deck.Flashcards.Count(c => c.Status != "archived"),
            deck.Flashcards.Count(c => c.Status != "archived" && c.DueAt <= DateTime.UtcNow));
    }

    public async Task<FlashcardDeckDto> DuplicateDeckAsync(string userId, string deckId, CancellationToken ct)
    {
        var deck = await _context.FlashcardDecks
            .Include(d => d.Flashcards)
            .FirstOrDefaultAsync(d => d.Id == deckId && d.UserId == userId, ct)
            ?? throw new KeyNotFoundException("Deck not found.");

        var newDeck = new FlashcardDeck
        {
            UserId = userId,
            UserEmail = deck.UserEmail,
            Name = $"{deck.Name} (Copy)",
            Description = deck.Description,
            Programme = deck.Programme,
            SourceType = deck.SourceType,
            SourceReference = deck.SourceReference,
            TopicSlug = deck.TopicSlug,
            TopicTitle = deck.TopicTitle,
            ClientNeedId = deck.ClientNeedId,
            TagsJson = deck.TagsJson,
            IsFavourite = false,
            IsArchived = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.FlashcardDecks.Add(newDeck);
        await _context.SaveChangesAsync(ct);

        var cardsToCopy = deck.Flashcards.Where(c => c.Status != "archived").ToList();
        foreach (var c in cardsToCopy)
        {
            var newCard = new Flashcard
            {
                DeckId = newDeck.Id,
                UserId = userId,
                Front = c.Front,
                Back = c.Back,
                Explanation = c.Explanation,
                ImageUrl = c.ImageUrl,
                DiagramUrl = c.DiagramUrl,
                CardStyle = c.CardStyle,
                Difficulty = c.Difficulty,
                Programme = c.Programme,
                Status = "active",
                SourceType = c.SourceType,
                SourceReference = c.SourceReference,
                SubjectDomainId = c.SubjectDomainId,
                TopicSlug = c.TopicSlug,
                TopicTitle = c.TopicTitle,
                ClientNeedId = c.ClientNeedId,
                TagsJson = c.TagsJson,
                DisplayOrder = c.DisplayOrder,
                DueAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Flashcards.Add(newCard);
        }

        await _context.SaveChangesAsync(ct);
        return MapDeck(newDeck, cardsToCopy.Count, cardsToCopy.Count);
    }

    public async Task<bool> ArchiveDeckAsync(string userId, string deckId, CancellationToken ct)
    {
        var deck = await _context.FlashcardDecks
            .FirstOrDefaultAsync(d => d.Id == deckId && d.UserId == userId, ct);

        if (deck == null) return false;

        deck.IsArchived = true;
        deck.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> DeleteDeckAsync(string userId, string deckId, CancellationToken ct)
    {
        var deck = await _context.FlashcardDecks
            .Include(d => d.Flashcards)
            .FirstOrDefaultAsync(d => d.Id == deckId && d.UserId == userId, ct);

        if (deck == null) return false;

        _context.FlashcardDecks.Remove(deck);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    // ── Cards ──

    public async Task<List<FlashcardDto>> GetDeckCardsAsync(string userId, string deckId, CancellationToken ct)
    {
        var deck = await _context.FlashcardDecks
            .FirstOrDefaultAsync(d => d.Id == deckId && d.UserId == userId, ct)
            ?? throw new KeyNotFoundException("Deck not found.");

        var cards = await _context.Flashcards
            .AsNoTracking()
            .Where(c => c.DeckId == deck.Id && c.UserId == userId && c.Status != "archived")
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.CreatedAt)
            .ToListAsync(ct);

        return cards.Select(MapCard).ToList();
    }

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
        var maxDisplayOrder = await _context.Flashcards
            .Where(c => c.DeckId == deckId)
            .Select(c => (int?)c.DisplayOrder)
            .MaxAsync(ct) ?? 0;

        var card = new Flashcard
        {
            DeckId = deck.Id,
            UserId = userId,
            Front = front,
            Back = back,
            Explanation = (request.Explanation ?? string.Empty).Trim(),
            ImageUrl = request.ImageUrl,
            DiagramUrl = request.DiagramUrl,
            CardStyle = string.IsNullOrWhiteSpace(request.CardStyle) ? "qa" : request.CardStyle.Trim().ToLowerInvariant(),
            Difficulty = difficulty,
            Programme = NormalizeProgramme(request.Programme, deck.Programme),
            Status = deck.SourceType == "curated_guide" || sourceType == "curated_guide"
                ? "personal_unreviewed"
                : "active",
            SourceType = sourceType,
            SourceReference = string.IsNullOrWhiteSpace(request.SourceReference)
                ? deck.SourceReference
                : request.SourceReference.Trim(),
            SubjectDomainId = request.SubjectDomainId,
            TopicSlug = request.TopicSlug,
            TopicTitle = request.TopicTitle,
            ClientNeedId = request.ClientNeedId,
            TagsJson = SerializeTags(request.Tags),
            IsFavourite = request.IsFavourite,
            IsDifficult = request.IsDifficult,
            DisplayOrder = maxDisplayOrder + 1,
            DueAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Flashcards.Add(card);
        deck.UpdatedAt = now;
        await _context.SaveChangesAsync(ct);
        return MapCard(card);
    }

    public async Task<FlashcardDto> UpdateCardAsync(
        string userId, string cardId, UpdateFlashcardRequest request, CancellationToken ct)
    {
        var card = await _context.Flashcards
            .FirstOrDefaultAsync(c => c.Id == cardId && c.UserId == userId, ct)
            ?? throw new KeyNotFoundException("Flashcard not found.");

        if (request.Front != null) card.Front = request.Front.Trim();
        if (request.Back != null) card.Back = request.Back.Trim();
        if (request.Explanation != null) card.Explanation = request.Explanation.Trim();
        if (request.ImageUrl != null) card.ImageUrl = request.ImageUrl;
        if (request.DiagramUrl != null) card.DiagramUrl = request.DiagramUrl;
        if (request.CardStyle != null) card.CardStyle = request.CardStyle.Trim().ToLowerInvariant();
        if (request.Difficulty != null)
        {
            var diff = request.Difficulty.Trim().ToLowerInvariant();
            if (SupportedDifficulties.Contains(diff)) card.Difficulty = diff;
        }
        if (request.Programme != null) card.Programme = NormalizeProgramme(request.Programme, card.Programme);
        if (request.SubjectDomainId != null) card.SubjectDomainId = request.SubjectDomainId;
        if (request.TopicSlug != null) card.TopicSlug = request.TopicSlug;
        if (request.TopicTitle != null) card.TopicTitle = request.TopicTitle;
        if (request.ClientNeedId != null) card.ClientNeedId = request.ClientNeedId;
        if (request.Tags != null) card.TagsJson = SerializeTags(request.Tags);
        if (request.IsFavourite.HasValue) card.IsFavourite = request.IsFavourite.Value;
        if (request.IsDifficult.HasValue) card.IsDifficult = request.IsDifficult.Value;
        if (request.DisplayOrder.HasValue) card.DisplayOrder = request.DisplayOrder.Value;

        card.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return MapCard(card);
    }

    public async Task<FlashcardDto> MoveCardAsync(
        string userId, string cardId, MoveFlashcardRequest request, CancellationToken ct)
    {
        var card = await _context.Flashcards
            .FirstOrDefaultAsync(c => c.Id == cardId && c.UserId == userId, ct)
            ?? throw new KeyNotFoundException("Flashcard not found.");

        var targetDeck = await _context.FlashcardDecks
            .FirstOrDefaultAsync(d => d.Id == request.TargetDeckId && d.UserId == userId, ct)
            ?? throw new KeyNotFoundException("Target deck not found.");

        card.DeckId = targetDeck.Id;
        card.UpdatedAt = DateTime.UtcNow;
        targetDeck.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return MapCard(card);
    }

    public async Task<FlashcardDto> DuplicateCardAsync(string userId, string cardId, CancellationToken ct)
    {
        var card = await _context.Flashcards
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == cardId && c.UserId == userId, ct)
            ?? throw new KeyNotFoundException("Flashcard not found.");

        var newCard = new Flashcard
        {
            DeckId = card.DeckId,
            UserId = userId,
            Front = $"{card.Front} (Copy)",
            Back = card.Back,
            Explanation = card.Explanation,
            ImageUrl = card.ImageUrl,
            DiagramUrl = card.DiagramUrl,
            CardStyle = card.CardStyle,
            Difficulty = card.Difficulty,
            Programme = card.Programme,
            Status = "active",
            SourceType = card.SourceType,
            SourceReference = card.SourceReference,
            SubjectDomainId = card.SubjectDomainId,
            TopicSlug = card.TopicSlug,
            TopicTitle = card.TopicTitle,
            ClientNeedId = card.ClientNeedId,
            TagsJson = card.TagsJson,
            DisplayOrder = card.DisplayOrder + 1,
            DueAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Flashcards.Add(newCard);
        await _context.SaveChangesAsync(ct);
        return MapCard(newCard);
    }

    public async Task<bool> ReorderCardsAsync(string userId, string deckId, List<string> cardIdsInOrder, CancellationToken ct)
    {
        var deckExists = await _context.FlashcardDecks.AnyAsync(d => d.Id == deckId && d.UserId == userId, ct);
        if (!deckExists) return false;

        var cards = await _context.Flashcards
            .Where(c => c.DeckId == deckId && c.UserId == userId)
            .ToListAsync(ct);

        for (int i = 0; i < cardIdsInOrder.Count; i++)
        {
            var id = cardIdsInOrder[i];
            var card = cards.FirstOrDefault(c => c.Id == id);
            if (card != null)
            {
                card.DisplayOrder = i;
            }
        }

        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> ToggleCardFavouriteAsync(string userId, string cardId, CancellationToken ct)
    {
        var card = await _context.Flashcards
            .FirstOrDefaultAsync(c => c.Id == cardId && c.UserId == userId, ct);

        if (card == null) return false;

        card.IsFavourite = !card.IsFavourite;
        card.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return card.IsFavourite;
    }

    public async Task<bool> ToggleCardDifficultAsync(string userId, string cardId, CancellationToken ct)
    {
        var card = await _context.Flashcards
            .FirstOrDefaultAsync(c => c.Id == cardId && c.UserId == userId, ct);

        if (card == null) return false;

        card.IsDifficult = !card.IsDifficult;
        card.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return card.IsDifficult;
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

        if (card.Status == "personal_unreviewed" && rating >= RecallRating.Good)
        {
            card.Status = "active";
        }

        // If Again or Hard, mark as difficult automatically for prioritized revision
        if (rating == RecallRating.Again)
        {
            card.IsDifficult = true;
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
