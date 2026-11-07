using System.Diagnostics;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Services.AI;

namespace Preform.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/ai/study")]
public class AIStudyController : ControllerBase
{
    private readonly IAIStudyProvider _aiProvider;
    private readonly IAIGovernanceService _governance;
    private readonly ILogger<AIStudyController> _logger;

    public AIStudyController(
        IAIStudyProvider aiProvider,
        IAIGovernanceService governance,
        ILogger<AIStudyController> logger)
    {
        _aiProvider = aiProvider;
        _governance = governance;
        _logger = logger;
    }

    private string? GetAuthenticatedUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value?.Trim();
    }

    private IActionResult RequireAuth(out string userId)
    {
        var uid = GetAuthenticatedUserId();
        if (string.IsNullOrWhiteSpace(uid))
        {
            userId = string.Empty;
            return Unauthorized(new { success = false, error = "Authentication required." });
        }
        userId = uid;
        return null!;
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetAIStatus()
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        var config = await _governance.GetConfigurationAsync();
        var canMakeRequest = await _governance.CanUserMakeRequestAsync(userId);
        var metrics = await _governance.GetMonitoringMetricsAsync(userId);

        return Ok(new
        {
            success = true,
            provider = _aiProvider.ProviderName,
            isAvailable = _aiProvider.IsAvailable,
            isEnabled = config.IsEnabled,
            dailyQuota = config.DailyPerUserQuota,
            remainingDailyQuota = metrics.UserRemainingDailyQuota,
            canMakeRequest,
            featureToggles = config.FeatureToggles
        });
    }

    [HttpPost("summarize-note")]
    public async Task<IActionResult> SummarizeNote([FromBody] AISummarizeNoteRequest request, CancellationToken ct)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        if (!await _governance.IsFeatureEnabledAsync("notes"))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "AI Note Assistant is currently disabled." });
        }

        if (!await _governance.CanUserMakeRequestAsync(userId))
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new { success = false, error = "Daily AI request limit reached. Please try again tomorrow." });
        }

        var sw = Stopwatch.StartNew();
        try
        {
            var result = await _aiProvider.SummarizeNoteAsync(request, ct);
            sw.Stop();

            var inputTokens = (request.NoteText?.Length ?? 0) / 4;
            var outputTokens = (result.Summary.Length + result.KeyTakeaways.Sum(t => t.Length)) / 4;

            await _governance.LogRequestAsync(
                userId, "note_summary", _aiProvider.ProviderName, "gemini-1.5-flash",
                inputTokens, outputTokens, (int)sw.ElapsedMilliseconds, "success");

            return Ok(new { success = true, result });
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "Failed to summarize note for user {UserId}", userId);
            await _governance.LogRequestAsync(
                userId, "note_summary", _aiProvider.ProviderName, "gemini-1.5-flash",
                0, 0, (int)sw.ElapsedMilliseconds, "failed", ex.Message);

            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { success = false, error = "AI service temporarily unavailable. Please try again shortly." });
        }
    }

    [HttpPost("generate-flashcards")]
    public async Task<IActionResult> GenerateFlashcards([FromBody] AIGenerateFlashcardsRequest request, CancellationToken ct)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        if (!await _governance.IsFeatureEnabledAsync("flashcards"))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "AI Flashcard Generator is currently disabled." });
        }

        if (!await _governance.CanUserMakeRequestAsync(userId))
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new { success = false, error = "Daily AI request limit reached." });
        }

        var sw = Stopwatch.StartNew();
        try
        {
            var cards = await _aiProvider.GenerateFlashcardsAsync(request, ct);
            sw.Stop();

            var inputTokens = ((request.Topic?.Length ?? 0) + (request.SourceText?.Length ?? 0)) / 4;
            var outputTokens = cards.Sum(c => c.Front.Length + c.Back.Length + c.Explanation.Length) / 4;

            await _governance.LogRequestAsync(
                userId, "flashcard_gen", _aiProvider.ProviderName, "gemini-1.5-flash",
                inputTokens, outputTokens, (int)sw.ElapsedMilliseconds, "success");

            return Ok(new { success = true, count = cards.Count, cards });
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "Failed to generate flashcards for user {UserId}", userId);
            await _governance.LogRequestAsync(
                userId, "flashcard_gen", _aiProvider.ProviderName, "gemini-1.5-flash",
                0, 0, (int)sw.ElapsedMilliseconds, "failed", ex.Message);

            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { success = false, error = "AI service temporarily unavailable." });
        }
    }

    [HttpPost("generate-quiz")]
    public async Task<IActionResult> GenerateQuiz([FromBody] AIGenerateQuizRequest request, CancellationToken ct)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        if (!await _governance.IsFeatureEnabledAsync("quizzes"))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "AI Quiz Generator is currently disabled." });
        }

        if (!await _governance.CanUserMakeRequestAsync(userId))
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new { success = false, error = "Daily AI request limit reached." });
        }

        var sw = Stopwatch.StartNew();
        try
        {
            var questions = await _aiProvider.GenerateQuizAsync(request, ct);
            sw.Stop();

            var inputTokens = ((request.Topic?.Length ?? 0) + (request.SourceText?.Length ?? 0)) / 4;
            var outputTokens = questions.Sum(q => q.Stem.Length + q.Rationale.Length + q.Options.Sum(o => o.Length)) / 4;

            await _governance.LogRequestAsync(
                userId, "quiz_gen", _aiProvider.ProviderName, "gemini-1.5-flash",
                inputTokens, outputTokens, (int)sw.ElapsedMilliseconds, "success");

            return Ok(new { success = true, count = questions.Count, questions });
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "Failed to generate quiz for user {UserId}", userId);
            await _governance.LogRequestAsync(
                userId, "quiz_gen", _aiProvider.ProviderName, "gemini-1.5-flash",
                0, 0, (int)sw.ElapsedMilliseconds, "failed", ex.Message);

            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { success = false, error = "AI service temporarily unavailable." });
        }
    }

    [HttpPost("tutor-chat")]
    public async Task<IActionResult> TutorChat([FromBody] AITutorChatRequest request, CancellationToken ct)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        if (!await _governance.IsFeatureEnabledAsync("tutor"))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "AI Tutor is currently disabled." });
        }

        if (!await _governance.CanUserMakeRequestAsync(userId))
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new { success = false, error = "Daily AI request limit reached." });
        }

        var sw = Stopwatch.StartNew();
        try
        {
            var reply = await _aiProvider.TutorChatAsync(request, ct);
            sw.Stop();

            var inputTokens = request.Message.Length / 4;
            var outputTokens = reply.Length / 4;

            await _governance.LogRequestAsync(
                userId, "tutor_chat", _aiProvider.ProviderName, "gemini-1.5-flash",
                inputTokens, outputTokens, (int)sw.ElapsedMilliseconds, "success");

            return Ok(new { success = true, reply });
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "Failed tutor chat for user {UserId}", userId);
            await _governance.LogRequestAsync(
                userId, "tutor_chat", _aiProvider.ProviderName, "gemini-1.5-flash",
                0, 0, (int)sw.ElapsedMilliseconds, "failed", ex.Message);

            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { success = false, error = "AI service temporarily unavailable." });
        }
    }

    [HttpPost("study-plan")]
    public async Task<IActionResult> GenerateStudyPlan([FromBody] AIGenerateStudyPlanRequest request, CancellationToken ct)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        if (!await _governance.IsFeatureEnabledAsync("plans"))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "AI Study Planner is currently disabled." });
        }

        if (!await _governance.CanUserMakeRequestAsync(userId))
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new { success = false, error = "Daily AI request limit reached." });
        }

        var sw = Stopwatch.StartNew();
        try
        {
            var planJson = await _aiProvider.GenerateStudyPlanAsync(request, ct);
            sw.Stop();

            var inputTokens = 100;
            var outputTokens = planJson.Length / 4;

            await _governance.LogRequestAsync(
                userId, "study_plan", _aiProvider.ProviderName, "gemini-1.5-flash",
                inputTokens, outputTokens, (int)sw.ElapsedMilliseconds, "success");

            return Ok(new { success = true, planJson });
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "Failed study plan generation for user {UserId}", userId);
            await _governance.LogRequestAsync(
                userId, "study_plan", _aiProvider.ProviderName, "gemini-1.5-flash",
                0, 0, (int)sw.ElapsedMilliseconds, "failed", ex.Message);

            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { success = false, error = "AI service temporarily unavailable." });
        }
    }
}
