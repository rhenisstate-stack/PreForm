using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireAdmin")]
[Route("api/v1/admin/study-guides")]
public class AdminStudyGuidesController : ControllerBase
{
    private readonly ICuratedStudyGuideService _guideService;
    private readonly IAdminStudyGuideService _adminStudyService;
    private readonly ILogger<AdminStudyGuidesController> _logger;

    public AdminStudyGuidesController(
        ICuratedStudyGuideService guideService,
        IAdminStudyGuideService adminStudyService,
        ILogger<AdminStudyGuidesController> logger)
    {
        _guideService = guideService;
        _adminStudyService = adminStudyService;
        _logger = logger;
    }

    private string GetAdminUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value?.Trim() ?? "admin";
    }

    private string GetAdminEmail()
    {
        return User.FindFirst(ClaimTypes.Email)?.Value?.Trim() ?? "admin@prepford.test";
    }

    // ── Categories ──

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _guideService.GetCategoriesAsync(includeInactive: true);
        return Ok(new { success = true, count = categories.Count, categories });
    }

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateStudyGuideCategoryRequest request)
    {
        try
        {
            var category = await _guideService.CreateCategoryAsync(request);
            return Ok(new { success = true, category });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, error = ex.Message });
        }
    }

    [HttpPut("categories/{id}")]
    public async Task<IActionResult> UpdateCategory(string id, [FromBody] UpdateStudyGuideCategoryRequest request)
    {
        try
        {
            var category = await _guideService.UpdateCategoryAsync(id, request);
            return Ok(new { success = true, category });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, error = ex.Message });
        }
    }

    [HttpDelete("categories/{id}")]
    public async Task<IActionResult> DeleteCategory(string id)
    {
        try
        {
            var deleted = await _guideService.DeleteCategoryAsync(id);
            if (!deleted) return NotFound(new { success = false, error = "Category not found." });

            return Ok(new { success = true, message = "Category deleted." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, error = ex.Message });
        }
    }

    // ── Curated Guides ──

    [HttpGet]
    public async Task<IActionResult> GetGuides([FromQuery] string? categorySlug = null, [FromQuery] string? programme = null)
    {
        var guides = await _guideService.GetGuidesAsync(categorySlug, programme, includeUnpublished: true);
        return Ok(new { success = true, count = guides.Count, guides });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetGuide(string id)
    {
        var guide = await _guideService.GetGuideByIdAsync(id);
        if (guide == null) return NotFound(new { success = false, error = "Study guide not found." });

        return Ok(new { success = true, guide });
    }

    [HttpPost]
    public async Task<IActionResult> CreateGuide([FromBody] CreateCuratedGuideRequest request)
    {
        try
        {
            var adminId = GetAdminUserId();
            var guide = await _guideService.CreateGuideAsync(request, adminId);
            return Ok(new { success = true, guide });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateGuide(string id, [FromBody] UpdateCuratedGuideRequest request)
    {
        try
        {
            var adminId = GetAdminUserId();
            var guide = await _guideService.UpdateGuideAsync(id, request, adminId);
            return Ok(new { success = true, guide });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, error = ex.Message });
        }
    }

    [HttpPost("{id}/publish")]
    public async Task<IActionResult> PublishGuide(string id)
    {
        try
        {
            var adminId = GetAdminUserId();
            var guide = await _guideService.PublishGuideAsync(id, adminId);
            return Ok(new { success = true, guide });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteGuide(string id)
    {
        var deleted = await _guideService.DeleteGuideAsync(id);
        if (!deleted) return NotFound(new { success = false, error = "Study guide not found." });

        return Ok(new { success = true, message = "Study guide deleted." });
    }

    // ════════════════════════════════════════════════
    // 1. NOTES MANAGEMENT WORKSPACE
    // ════════════════════════════════════════════════

    [HttpGet("notes")]
    public async Task<IActionResult> GetNotes([FromQuery] AdminNoteFilterParameters filter)
    {
        var paged = await _adminStudyService.GetNotesAsync(filter);
        return Ok(new
        {
            success = true,
            data = paged.Items,
            total = paged.TotalCount,
            page = paged.Page,
            pageSize = paged.PageSize,
            totalPages = paged.TotalPages
        });
    }

    [HttpGet("notes/{id}")]
    public async Task<IActionResult> GetNote(string id)
    {
        var note = await _adminStudyService.GetNoteByIdAsync(id);
        if (note == null) return NotFound(new { success = false, error = "Note not found." });
        return Ok(new { success = true, note });
    }

    [HttpPost("notes")]
    public async Task<IActionResult> CreateNote([FromBody] AdminCreateNoteRequest request)
    {
        try
        {
            var adminId = GetAdminUserId();
            var note = await _adminStudyService.CreateNoteAsync(request, adminId);
            return Ok(new { success = true, note });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create admin note.");
            return BadRequest(new { success = false, error = ex.Message });
        }
    }

    [HttpPut("notes/{id}")]
    public async Task<IActionResult> UpdateNote(string id, [FromBody] AdminUpdateNoteRequest request)
    {
        try
        {
            var adminId = GetAdminUserId();
            var note = await _adminStudyService.UpdateNoteAsync(id, request, adminId);
            return Ok(new { success = true, note });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update admin note {Id}.", id);
            return BadRequest(new { success = false, error = ex.Message });
        }
    }

    [HttpDelete("notes/{id}")]
    public async Task<IActionResult> DeleteNote(string id)
    {
        var deleted = await _adminStudyService.DeleteNoteAsync(id);
        if (!deleted) return NotFound(new { success = false, error = "Note not found." });
        return Ok(new { success = true, message = "Note deleted successfully." });
    }

    [HttpPost("notes/{id}/duplicate")]
    public async Task<IActionResult> DuplicateNote(string id)
    {
        try
        {
            var adminId = GetAdminUserId();
            var note = await _adminStudyService.DuplicateNoteAsync(id, adminId);
            return Ok(new { success = true, note });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpPost("notes/{id}/archive")]
    public async Task<IActionResult> ArchiveNote(string id, [FromBody] ArchiveRequest? request)
    {
        try
        {
            var isArchived = request?.IsArchived ?? true;
            var note = await _adminStudyService.ArchiveNoteAsync(id, isArchived);
            return Ok(new { success = true, note });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpPost("notes/{id}/publish")]
    public async Task<IActionResult> PublishNote(string id)
    {
        try
        {
            var note = await _adminStudyService.PublishNoteAsync(id);
            return Ok(new { success = true, note });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpPost("notes/{id}/status")]
    public async Task<IActionResult> SetNoteStatus(string id, [FromBody] SetStatusRequest request)
    {
        try
        {
            var note = await _adminStudyService.SetNoteStatusAsync(id, request.Status);
            return Ok(new { success = true, note });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, error = ex.Message });
        }
    }

    // ════════════════════════════════════════════════
    // 2. FLASHCARDS MANAGEMENT WORKSPACE
    // ════════════════════════════════════════════════

    [HttpGet("flashcards/decks")]
    public async Task<IActionResult> GetDecks([FromQuery] string? programme, [FromQuery] string? search, [FromQuery] bool? isOfficial)
    {
        var decks = await _adminStudyService.GetDecksAsync(programme, search, isOfficial);
        return Ok(new { success = true, count = decks.Count, decks });
    }

    [HttpGet("flashcards/decks/{id}")]
    public async Task<IActionResult> GetDeck(string id)
    {
        var deck = await _adminStudyService.GetDeckByIdAsync(id);
        if (deck == null) return NotFound(new { success = false, error = "Deck not found." });
        return Ok(new { success = true, deck });
    }

    [HttpPost("flashcards/decks")]
    public async Task<IActionResult> CreateDeck([FromBody] AdminCreateDeckRequest request)
    {
        try
        {
            var adminId = GetAdminUserId();
            var adminEmail = GetAdminEmail();
            var deck = await _adminStudyService.CreateDeckAsync(request, adminId, adminEmail);
            return Ok(new { success = true, deck });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, error = ex.Message });
        }
    }

    [HttpPut("flashcards/decks/{id}")]
    public async Task<IActionResult> UpdateDeck(string id, [FromBody] AdminUpdateDeckRequest request)
    {
        try
        {
            var deck = await _adminStudyService.UpdateDeckAsync(id, request);
            return Ok(new { success = true, deck });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpDelete("flashcards/decks/{id}")]
    public async Task<IActionResult> DeleteDeck(string id)
    {
        var deleted = await _adminStudyService.DeleteDeckAsync(id);
        if (!deleted) return NotFound(new { success = false, error = "Deck not found." });
        return Ok(new { success = true, message = "Deck deleted successfully." });
    }

    [HttpPost("flashcards/decks/{id}/duplicate")]
    public async Task<IActionResult> DuplicateDeck(string id)
    {
        try
        {
            var adminId = GetAdminUserId();
            var adminEmail = GetAdminEmail();
            var deck = await _adminStudyService.DuplicateDeckAsync(id, adminId, adminEmail);
            return Ok(new { success = true, deck });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpPost("flashcards/decks/{id}/publish")]
    public async Task<IActionResult> PublishDeck(string id, [FromBody] PublishRequest? request)
    {
        try
        {
            var isPublished = request?.IsPublished ?? true;
            var deck = await _adminStudyService.PublishDeckAsync(id, isPublished);
            return Ok(new { success = true, deck });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpPost("flashcards/decks/{id}/archive")]
    public async Task<IActionResult> ArchiveDeck(string id, [FromBody] ArchiveRequest? request)
    {
        try
        {
            var isArchived = request?.IsArchived ?? true;
            var deck = await _adminStudyService.ArchiveDeckAsync(id, isArchived);
            return Ok(new { success = true, deck });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpGet("flashcards/decks/{id}/cards")]
    public async Task<IActionResult> GetDeckCards(string id)
    {
        var cards = await _adminStudyService.GetDeckCardsAsync(id);
        return Ok(new { success = true, count = cards.Count, cards });
    }

    [HttpPost("flashcards/decks/{id}/cards")]
    public async Task<IActionResult> CreateCard(string id, [FromBody] AdminCreateCardRequest request)
    {
        try
        {
            var adminId = GetAdminUserId();
            var card = await _adminStudyService.CreateCardAsync(id, request, adminId);
            return Ok(new { success = true, card });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpPut("flashcards/cards/{id}")]
    public async Task<IActionResult> UpdateCard(string id, [FromBody] AdminUpdateCardRequest request)
    {
        try
        {
            var card = await _adminStudyService.UpdateCardAsync(id, request);
            return Ok(new { success = true, card });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpDelete("flashcards/cards/{id}")]
    public async Task<IActionResult> DeleteCard(string id)
    {
        var deleted = await _adminStudyService.DeleteCardAsync(id);
        if (!deleted) return NotFound(new { success = false, error = "Card not found." });
        return Ok(new { success = true, message = "Card deleted successfully." });
    }

    [HttpPost("flashcards/cards/{id}/duplicate")]
    public async Task<IActionResult> DuplicateCard(string id)
    {
        try
        {
            var card = await _adminStudyService.DuplicateCardAsync(id);
            return Ok(new { success = true, card });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpPost("flashcards/cards/{id}/move")]
    public async Task<IActionResult> MoveCard(string id, [FromBody] MoveFlashcardRequest request)
    {
        try
        {
            var card = await _adminStudyService.MoveCardAsync(id, request.TargetDeckId);
            return Ok(new { success = true, card });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpPut("flashcards/decks/{id}/reorder")]
    public async Task<IActionResult> ReorderCards(string id, [FromBody] ReorderCardsRequest request)
    {
        var success = await _adminStudyService.ReorderCardsAsync(id, request.CardIds);
        return Ok(new { success });
    }

    // ════════════════════════════════════════════════
    // 3. REVIEW SESSIONS MANAGEMENT WORKSPACE
    // ════════════════════════════════════════════════

    [HttpGet("review-sessions/config")]
    public async Task<IActionResult> GetReviewConfiguration()
    {
        var config = await _adminStudyService.GetReviewConfigurationAsync();
        return Ok(new { success = true, config });
    }

    [HttpPut("review-sessions/config")]
    public async Task<IActionResult> UpdateReviewConfiguration([FromBody] UpdateReviewConfigurationRequest request)
    {
        var adminId = GetAdminUserId();
        var config = await _adminStudyService.UpdateReviewConfigurationAsync(request, adminId);
        return Ok(new { success = true, config });
    }

    [HttpGet("review-sessions/analytics")]
    public async Task<IActionResult> GetReviewAnalytics(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? programme,
        [FromQuery] string? subject)
    {
        var analytics = await _adminStudyService.GetReviewAnalyticsAsync(from, to, programme, subject);
        return Ok(new { success = true, analytics });
    }

    [HttpGet("review-sessions/sessions")]
    public async Task<IActionResult> GetReviewSessions(
        [FromQuery] string? programme,
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var paged = await _adminStudyService.GetReviewSessionsAsync(programme, status, search, page, pageSize);
        return Ok(new
        {
            success = true,
            data = paged.Items,
            total = paged.TotalCount,
            page = paged.Page,
            pageSize = paged.PageSize,
            totalPages = paged.TotalPages
        });
    }

    [HttpGet("review-sessions/sessions/{id}")]
    public async Task<IActionResult> GetReviewSession(string id)
    {
        var session = await _adminStudyService.GetReviewSessionByIdAsync(id);
        if (session == null) return NotFound(new { success = false, error = "Review session not found." });
        return Ok(new { success = true, session });
    }

    // ════════════════════════════════════════════════
    // 4. TOPIC QUIZZES MANAGEMENT WORKSPACE
    // ════════════════════════════════════════════════

    [HttpGet("topic-quizzes")]
    public async Task<IActionResult> GetTopicQuizzes([FromQuery] string? programme, [FromQuery] string? status, [FromQuery] string? search)
    {
        var quizzes = await _adminStudyService.GetQuizzesAsync(programme, status, search);
        return Ok(new { success = true, count = quizzes.Count, quizzes });
    }

    [HttpGet("topic-quizzes/{id}")]
    public async Task<IActionResult> GetTopicQuiz(string id)
    {
        var quiz = await _adminStudyService.GetQuizByIdAsync(id);
        if (quiz == null) return NotFound(new { success = false, error = "Topic quiz not found." });
        return Ok(new { success = true, quiz });
    }

    [HttpPost("topic-quizzes")]
    public async Task<IActionResult> CreateTopicQuiz([FromBody] AdminCreateTopicQuizRequest request)
    {
        try
        {
            var adminId = GetAdminUserId();
            var quiz = await _adminStudyService.CreateQuizAsync(request, adminId);
            return Ok(new { success = true, quiz });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, error = ex.Message });
        }
    }

    [HttpPut("topic-quizzes/{id}")]
    public async Task<IActionResult> UpdateTopicQuiz(string id, [FromBody] AdminUpdateTopicQuizRequest request)
    {
        try
        {
            var quiz = await _adminStudyService.UpdateQuizAsync(id, request);
            return Ok(new { success = true, quiz });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpDelete("topic-quizzes/{id}")]
    public async Task<IActionResult> DeleteTopicQuiz(string id)
    {
        var deleted = await _adminStudyService.DeleteQuizAsync(id);
        if (!deleted) return NotFound(new { success = false, error = "Topic quiz not found." });
        return Ok(new { success = true, message = "Topic quiz deleted successfully." });
    }

    [HttpPost("topic-quizzes/{id}/duplicate")]
    public async Task<IActionResult> DuplicateTopicQuiz(string id)
    {
        try
        {
            var adminId = GetAdminUserId();
            var quiz = await _adminStudyService.DuplicateQuizAsync(id, adminId);
            return Ok(new { success = true, quiz });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpPost("topic-quizzes/{id}/publish")]
    public async Task<IActionResult> PublishTopicQuiz(string id, [FromBody] PublishRequest? request)
    {
        try
        {
            var isPublished = request?.IsPublished ?? true;
            var quiz = await _adminStudyService.PublishQuizAsync(id, isPublished);
            return Ok(new { success = true, quiz });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpPost("topic-quizzes/{id}/archive")]
    public async Task<IActionResult> ArchiveTopicQuiz(string id, [FromBody] ArchiveRequest? request)
    {
        try
        {
            var isArchived = request?.IsArchived ?? true;
            var quiz = await _adminStudyService.ArchiveQuizAsync(id, isArchived);
            return Ok(new { success = true, quiz });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpGet("topic-quizzes/questions/search")]
    public async Task<IActionResult> SearchQuestions(
        [FromQuery] string? search,
        [FromQuery] string? pathway,
        [FromQuery] string? difficulty,
        [FromQuery] string? typeKey,
        [FromQuery] string? topicId,
        [FromQuery] int limit = 25)
    {
        var questions = await _adminStudyService.SearchQuestionsAsync(search, pathway, difficulty, typeKey, topicId, limit);
        return Ok(new { success = true, count = questions.Count, questions });
    }

    [HttpPut("topic-quizzes/{id}/questions")]
    public async Task<IActionResult> AssignQuestions(string id, [FromBody] AssignQuestionsRequest request)
    {
        try
        {
            var quiz = await _adminStudyService.AssignQuestionsAsync(id, request.QuestionIds);
            return Ok(new { success = true, quiz });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpGet("topic-quizzes/analytics")]
    public async Task<IActionResult> GetQuizAnalytics([FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string? programme)
    {
        var analytics = await _adminStudyService.GetQuizAnalyticsAsync(from, to, programme);
        return Ok(new { success = true, analytics });
    }

    [HttpPost("topic-quizzes/ai-generate")]
    public async Task<IActionResult> GenerateDraftQuestions([FromBody] AIGenerateQuizQuestionsRequest request)
    {
        try
        {
            var questions = await _adminStudyService.GenerateDraftQuestionsAsync(request);
            return Ok(new { success = true, count = questions.Count, questions });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate AI quiz questions.");
            return BadRequest(new { success = false, error = ex.Message });
        }
    }
}
