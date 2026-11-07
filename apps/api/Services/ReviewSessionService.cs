using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

public class ReviewSessionService : IReviewSessionService
{
    private readonly AppDbContext _context;
    private readonly ISpacedRepetitionService _spacedRepetition;
    private readonly ILogger<ReviewSessionService> _logger;

    public ReviewSessionService(
        AppDbContext context,
        ISpacedRepetitionService spacedRepetition,
        ILogger<ReviewSessionService> logger)
    {
        _context = context;
        _spacedRepetition = spacedRepetition;
        _logger = logger;
    }

    public async Task<StudyReviewSessionDto> StartSessionAsync(string userId, StartReviewSessionRequest request)
    {
        var query = _context.Flashcards.AsNoTracking().Where(c => c.UserId == userId);

        if (!string.IsNullOrWhiteSpace(request.Programme) && request.Programme != "all")
        {
            query = query.Where(c => c.Programme == request.Programme || c.Programme == "both");
        }

        if (!string.IsNullOrWhiteSpace(request.DeckId))
        {
            query = query.Where(c => c.DeckId == request.DeckId);
        }

        if (!string.IsNullOrWhiteSpace(request.TopicSlug))
        {
            query = query.Where(c => c.TopicSlug == request.TopicSlug);
        }

        var now = DateTime.UtcNow;
        var mode = (request.Mode ?? "all_due").ToLowerInvariant();

        query = mode switch
        {
            "all_due" => query.Where(c => c.NextDueAt <= now).OrderBy(c => c.NextDueAt),
            "difficult" => query.Where(c => c.IsDifficult).OrderByDescending(c => c.UpdatedAt),
            "favourites" => query.Where(c => c.IsFavourite).OrderByDescending(c => c.UpdatedAt),
            "random" => query.OrderBy(c => EF.Functions.Random()),
            _ => query.OrderBy(c => c.DisplayOrder).ThenBy(c => c.CreatedAt)
        };

        var limit = Math.Clamp(request.CardLimit, 1, 100);
        var eligibleCardIds = await query.Select(c => c.Id).Take(limit).ToListAsync();

        string? deckName = null;
        if (!string.IsNullOrWhiteSpace(request.DeckId))
        {
            deckName = await _context.FlashcardDecks
                .Where(d => d.Id == request.DeckId && d.UserId == userId)
                .Select(d => d.Name)
                .FirstOrDefaultAsync();
        }

        var session = new StudyReviewSession
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            DeckId = request.DeckId,
            Mode = mode,
            Programme = request.Programme ?? "rn",
            TopicSlug = request.TopicSlug,
            TopicTitle = request.TopicTitle,
            FilterCriteriaJson = JsonSerializer.Serialize(new
            {
                request.Mode,
                request.Programme,
                request.DeckId,
                request.TopicSlug,
                request.CardLimit
            }),
            TotalCards = eligibleCardIds.Count,
            CardsReviewed = 0,
            CardsCorrect = 0,
            CardsDifficult = 0,
            CardsMissed = 0,
            AccuracyPercentage = 0.0,
            DurationSeconds = 0,
            Status = "in_progress",
            StartedAt = now
        };

        _context.StudyReviewSessions.Add(session);
        await _context.SaveChangesAsync();

        return MapSession(session, deckName);
    }

    public async Task<StudyReviewSessionDto?> GetSessionAsync(string userId, string sessionId)
    {
        var session = await _context.StudyReviewSessions
            .Include(s => s.Deck)
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);

        return session == null ? null : MapSession(session, session.Deck?.Name);
    }

    public async Task<StudyReviewSessionDto> SubmitRatingAsync(string userId, string sessionId, SubmitSessionCardRatingRequest request)
    {
        var session = await _context.StudyReviewSessions
            .Include(s => s.Deck)
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);

        if (session == null)
        {
            throw new KeyNotFoundException($"Review session '{sessionId}' not found.");
        }

        if (session.Status == "completed")
        {
            throw new InvalidOperationException("This review session has already been completed.");
        }

        var card = await _context.Flashcards.FirstOrDefaultAsync(c => c.Id == request.FlashcardId && c.UserId == userId);
        if (card == null)
        {
            throw new KeyNotFoundException($"Flashcard '{request.FlashcardId}' not found.");
        }

        var rating = (RecallRating)Math.Clamp(request.RecallRating, 0, 3);
        var now = DateTime.UtcNow;

        var scheduleUpdate = _spacedRepetition.Schedule(
            rating,
            card.IntervalDays,
            card.EaseFactor,
            card.RepetitionCount,
            now);

        card.IntervalDays = scheduleUpdate.IntervalDays;
        card.EaseFactor = scheduleUpdate.EaseFactor;
        card.RepetitionCount = scheduleUpdate.RepetitionCount;
        card.NextDueAt = scheduleUpdate.NextDueAt;
        card.LastReviewedAt = now;
        card.UpdatedAt = now;

        if (rating == RecallRating.Again || rating == RecallRating.Hard)
        {
            card.IsDifficult = true;
        }
        else if (rating == RecallRating.Easy && card.RepetitionCount >= 3)
        {
            card.IsDifficult = false;
        }

        // Add review log entry to flashcard history
        var review = new FlashcardReview
        {
            Id = Guid.NewGuid().ToString(),
            FlashcardId = card.Id,
            UserId = userId,
            Rating = rating.ToString().ToLowerInvariant(),
            IntervalDays = scheduleUpdate.IntervalDays,
            EaseFactor = scheduleUpdate.EaseFactor,
            RepetitionNumber = scheduleUpdate.RepetitionCount,
            ReviewedAt = now
        };
        _context.FlashcardReviews.Add(review);

        // Add session item
        var item = new StudyReviewSessionItem
        {
            Id = Guid.NewGuid().ToString(),
            SessionId = session.Id,
            FlashcardId = card.Id,
            RecallRating = (int)rating,
            ResponseTimeMs = request.ResponseTimeMs,
            ReviewedAt = now
        };
        _context.StudyReviewSessionItems.Add(item);

        // Update session metrics
        session.CardsReviewed++;
        if (rating == RecallRating.Good || rating == RecallRating.Easy)
        {
            session.CardsCorrect++;
        }
        else if (rating == RecallRating.Hard)
        {
            session.CardsDifficult++;
        }
        else
        {
            session.CardsMissed++;
        }

        session.AccuracyPercentage = session.CardsReviewed > 0
            ? Math.Round((double)session.CardsCorrect / session.CardsReviewed * 100.0, 1)
            : 0.0;

        session.DurationSeconds = (int)Math.Max(0, (now - session.StartedAt).TotalSeconds);

        if (session.CardsReviewed >= session.TotalCards && session.TotalCards > 0)
        {
            session.Status = "completed";
            session.CompletedAt = now;
        }

        await _context.SaveChangesAsync();
        return MapSession(session, session.Deck?.Name);
    }

    public async Task<StudyReviewSessionDto> CompleteSessionAsync(string userId, string sessionId)
    {
        var session = await _context.StudyReviewSessions
            .Include(s => s.Deck)
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);

        if (session == null)
        {
            throw new KeyNotFoundException($"Review session '{sessionId}' not found.");
        }

        var now = DateTime.UtcNow;
        session.Status = "completed";
        session.CompletedAt = now;
        session.DurationSeconds = (int)Math.Max(0, (now - session.StartedAt).TotalSeconds);

        await _context.SaveChangesAsync();
        return MapSession(session, session.Deck?.Name);
    }

    public async Task<ReviewSessionSummaryReportDto> GetSessionSummaryAsync(string userId, string sessionId)
    {
        var session = await _context.StudyReviewSessions
            .Include(s => s.Deck)
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);

        if (session == null)
        {
            throw new KeyNotFoundException($"Review session '{sessionId}' not found.");
        }

        var ratingDist = new Dictionary<string, int>
        {
            ["again"] = session.Items.Count(i => i.RecallRating == 0),
            ["hard"] = session.Items.Count(i => i.RecallRating == 1),
            ["good"] = session.Items.Count(i => i.RecallRating == 2),
            ["easy"] = session.Items.Count(i => i.RecallRating == 3),
        };

        var recommendation = GenerateRetentionRecommendation(session, ratingDist);

        // Fetch remaining due cards for this user
        var now = DateTime.UtcNow;
        var dueRemaining = await _context.Flashcards
            .AsNoTracking()
            .Where(c => c.UserId == userId && c.NextDueAt <= now)
            .OrderBy(c => c.NextDueAt)
            .Take(10)
            .Select(c => new FlashcardDto
            {
                Id = c.Id,
                DeckId = c.DeckId,
                Front = c.Front,
                Back = c.Back,
                Explanation = c.Explanation,
                Difficulty = c.Difficulty,
                CardStyle = c.CardStyle,
                NextDueAt = c.NextDueAt,
                RepetitionCount = c.RepetitionCount,
                IntervalDays = c.IntervalDays,
                EaseFactor = c.EaseFactor,
                LastReviewedAt = c.LastReviewedAt,
                IsDifficult = c.IsDifficult,
                IsFavourite = c.IsFavourite,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            })
            .ToListAsync();

        return new ReviewSessionSummaryReportDto
        {
            Session = MapSession(session, session.Deck?.Name),
            DueCardsRemaining = dueRemaining,
            RetentionRecommendation = recommendation,
            RatingDistribution = ratingDist
        };
    }

    public async Task<List<StudyReviewSessionDto>> GetUserSessionsAsync(string userId, string? programme = null, int limit = 20)
    {
        var query = _context.StudyReviewSessions
            .AsNoTracking()
            .Include(s => s.Deck)
            .Where(s => s.UserId == userId);

        if (!string.IsNullOrWhiteSpace(programme) && programme != "all")
        {
            query = query.Where(s => s.Programme == programme || s.Programme == "both");
        }

        return await query
            .OrderByDescending(s => s.StartedAt)
            .Take(Math.Clamp(limit, 1, 100))
            .Select(s => MapSession(s, s.Deck != null ? s.Deck.Name : null))
            .ToListAsync();
    }

    private static string GenerateRetentionRecommendation(StudyReviewSession session, Dictionary<string, int> dist)
    {
        if (session.TotalCards == 0)
        {
            return "No cards were reviewed in this session. Start a new drill to reinforce clinical concepts.";
        }

        if (session.AccuracyPercentage >= 85)
        {
            return "High Retention Mastered: Excellent clinical recall. Your next scheduled spaced repetition interval will expand. Keep up your active study streak.";
        }

        if (session.AccuracyPercentage >= 70)
        {
            return $"Solid Progress: {session.CardsCorrect}/{session.CardsReviewed} cards recalled accurately. Review marked difficult cards tomorrow to reinforce synaptic retention.";
        }

        return "Clinical Reinforcement Required: Several key concepts were missed or rated Hard. We recommend reviewing related study guide notes and running a 10-card targeted drill.";
    }

    private static StudyReviewSessionDto MapSession(StudyReviewSession session, string? deckName) => new()
    {
        Id = session.Id,
        DeckId = session.DeckId,
        DeckName = deckName,
        Mode = session.Mode,
        Programme = session.Programme,
        TopicSlug = session.TopicSlug,
        TopicTitle = session.TopicTitle,
        TotalCards = session.TotalCards,
        CardsReviewed = session.CardsReviewed,
        CardsCorrect = session.CardsCorrect,
        CardsDifficult = session.CardsDifficult,
        CardsMissed = session.CardsMissed,
        AccuracyPercentage = session.AccuracyPercentage,
        DurationSeconds = session.DurationSeconds,
        Status = session.Status,
        StartedAt = session.StartedAt,
        CompletedAt = session.CompletedAt
    };
}
