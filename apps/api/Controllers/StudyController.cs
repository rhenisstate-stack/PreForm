using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

/// <summary>
/// PrepFord AI Study Studio (Phase 1 core active-learning loop).
/// Personal flashcard decks, SM-2 review scheduling and study progress.
///
/// Phase 2+ capabilities (context-aware AI tutor, document ingestion, AI
/// study-plan generation) are intentionally NOT exposed here until they are
/// implemented, entitlement-gated and reviewed — routes that do not exist
/// cannot be used as an attack surface.
/// </summary>
[ApiController]
[Authorize]
[Route("api/v1/study")]
public class StudyController : ControllerBase
{
    private readonly IFlashcardService _flashcards;
    private readonly ILogger<StudyController> _logger;

    public StudyController(IFlashcardService flashcards, ILogger<StudyController> logger)
    {
        _flashcards = flashcards;
        _logger = logger;
    }

    private (string? userId, string? email) ResolveAuthenticatedUser()
    {
        var claimUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var claimEmail = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(claimUserId) || string.IsNullOrWhiteSpace(claimEmail))
        {
            return (null, null);
        }
        return (claimUserId.Trim(), claimEmail.Trim());
    }

    private IActionResult RequireAuth(out string userId, out string email)
    {
        var (uid, mail) = ResolveAuthenticatedUser();
        if (string.IsNullOrWhiteSpace(uid) || string.IsNullOrWhiteSpace(mail))
        {
            userId = string.Empty;
            email = string.Empty;
            return Unauthorized(new { success = false, error = "Authentication is required for study studio access." });
        }

        userId = uid;
        email = mail;
        return null!;
    }

    // ── Overview ──

    [HttpGet("overview")]
    public async Task<IActionResult> GetStudyOverview(CancellationToken ct)
    {
        var authResult = RequireAuth(out var userId, out var email);
        if (authResult != null) return authResult;

        var overview = await _flashcards.GetOverviewAsync(userId, ct);
        return Ok(new { success = true, overview });
    }

    // ── Decks ──

    [HttpGet("flashcards/decks")]
    public async Task<IActionResult> GetDecks([FromQuery] bool includeArchived = false, CancellationToken ct = default)
    {
        var authResult = RequireAuth(out var userId, out var email);
        if (authResult != null) return authResult;

        var decks = await _flashcards.GetDecksAsync(userId, includeArchived, ct);
        return Ok(new { success = true, count = decks.Count, decks });
    }

    [HttpPost("flashcards/decks")]
    public async Task<IActionResult> CreateDeck([FromBody] CreateFlashcardDeckRequest request, CancellationToken ct)
    {
        var authResult = RequireAuth(out var userId, out var email);
        if (authResult != null) return authResult;

        try
        {
            var deck = await _flashcards.CreateDeckAsync(userId, email, request, ct);
            _logger.LogInformation("Study studio deck created for user {UserId}", userId);
            return CreatedAtAction(nameof(GetDeck), new { deckId = deck.Id }, new { success = true, deck });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, error = ex.Message });
        }
    }

    [HttpGet("flashcards/decks/{deckId}", Name = "GetDeck")]
    public async Task<IActionResult> GetDeck(string deckId, CancellationToken ct)
    {
        var authResult = RequireAuth(out var userId, out var email);
        if (authResult != null) return authResult;

        try
        {
            var deck = await _flashcards.GetDeckAsync(userId, deckId, ct);
            return Ok(new { success = true, deck });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { success = false, error = "Deck not found." });
        }
    }

    [HttpGet("flashcards/decks/{deckId}/cards")]
    public async Task<IActionResult> GetDeckCards(string deckId, CancellationToken ct)
    {
        var authResult = RequireAuth(out var userId, out var email);
        if (authResult != null) return authResult;

        try
        {
            var cards = await _flashcards.GetDeckCardsAsync(userId, deckId, ct);
            return Ok(new { success = true, count = cards.Count, cards });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { success = false, error = "Deck not found." });
        }
    }

    [HttpPost("flashcards/decks/{deckId}/archive")]
    public async Task<IActionResult> ArchiveDeck(string deckId, CancellationToken ct)
    {
        var authResult = RequireAuth(out var userId, out var email);
        if (authResult != null) return authResult;

        var archived = await _flashcards.ArchiveDeckAsync(userId, deckId, ct);
        if (!archived)
        {
            return NotFound(new { success = false, error = "Deck not found." });
        }
        return Ok(new { success = true, message = "Deck archived." });
    }

    // ── Cards ──

    [HttpPost("flashcards/decks/{deckId}/cards")]
    public async Task<IActionResult> AddCard(string deckId, [FromBody] CreateFlashcardRequest request, CancellationToken ct)
    {
        var authResult = RequireAuth(out var userId, out var email);
        if (authResult != null) return authResult;

        try
        {
            var card = await _flashcards.AddCardAsync(userId, deckId, request, ct);
            return StatusCode(StatusCodes.Status201Created, new { success = true, card });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { success = false, error = "Deck not found." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, error = ex.Message });
        }
    }

    [HttpGet("flashcards/due")]
    public async Task<IActionResult> GetDueCards(
        [FromQuery] string? programme,
        [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        var authResult = RequireAuth(out var userId, out var email);
        if (authResult != null) return authResult;

        var cards = await _flashcards.GetDueCardsAsync(userId, programme, limit, ct);
        return Ok(new { success = true, count = cards.Count, cards });
    }

    [HttpDelete("flashcards/cards/{cardId}")]
    public async Task<IActionResult> DeleteCard(string cardId, CancellationToken ct)
    {
        var authResult = RequireAuth(out var userId, out var email);
        if (authResult != null) return authResult;

        var deleted = await _flashcards.DeleteCardAsync(userId, cardId, ct);
        if (!deleted)
        {
            return NotFound(new { success = false, error = "Flashcard not found." });
        }
        return Ok(new { success = true, message = "Flashcard deleted." });
    }

    // ── Review ──

    [HttpPost("flashcards/cards/{cardId}/review")]
    public async Task<IActionResult> ReviewCard(string cardId, [FromBody] ReviewFlashcardRequest request, CancellationToken ct)
    {
        var authResult = RequireAuth(out var userId, out var email);
        if (authResult != null) return authResult;

        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, error = "Recall rating must be 0 (Again), 1 (Hard), 2 (Good) or 3 (Easy)." });
        }

        try
        {
            var result = await _flashcards.ReviewCardAsync(userId, cardId, (RecallRating)request.RecallRating, ct);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { success = false, error = "Flashcard not found." });
        }
    }

    [HttpGet("flashcards/cards/{cardId}/reviews")]
    public async Task<IActionResult> GetCardReviews(string cardId, CancellationToken ct)
    {
        var authResult = RequireAuth(out var userId, out var email);
        if (authResult != null) return authResult;

        try
        {
            var reviews = await _flashcards.GetCardReviewsAsync(userId, cardId, ct);
            return Ok(new { success = true, count = reviews.Count, reviews });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { success = false, error = "Flashcard not found." });
        }
    }
}
