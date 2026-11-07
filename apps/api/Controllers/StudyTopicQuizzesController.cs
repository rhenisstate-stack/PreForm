using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/study/topic-quizzes")]
public class StudyTopicQuizzesController : ControllerBase
{
    private readonly ITopicQuizService _quizService;
    private readonly ILogger<StudyTopicQuizzesController> _logger;

    public StudyTopicQuizzesController(ITopicQuizService quizService, ILogger<StudyTopicQuizzesController> logger)
    {
        _quizService = quizService;
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

    // ── Configurations ──

    [HttpPost("configurations")]
    public async Task<IActionResult> CreateConfiguration([FromBody] CreateTopicQuizConfigurationRequest request)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        var config = await _quizService.CreateConfigurationAsync(userId, request);
        return CreatedAtAction(nameof(GetUserConfigurations), null, new { success = true, config });
    }

    [HttpGet("configurations")]
    public async Task<IActionResult> GetUserConfigurations([FromQuery] string? programme = null)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        var configs = await _quizService.GetUserConfigurationsAsync(userId, programme);
        return Ok(new { success = true, count = configs.Count, configs });
    }

    [HttpDelete("configurations/{configId}")]
    public async Task<IActionResult> DeleteConfiguration(string configId)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        var deleted = await _quizService.DeleteConfigurationAsync(userId, configId);
        if (!deleted) return NotFound(new { success = false, error = "Configuration not found." });

        return Ok(new { success = true, message = "Configuration deleted." });
    }

    // ── Attempts ──

    [HttpPost("attempts")]
    public async Task<IActionResult> StartAttempt([FromBody] StartTopicQuizAttemptRequest request)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        var attempt = await _quizService.StartAttemptAsync(userId, request);
        return CreatedAtAction(nameof(GetAttempt), new { attemptId = attempt.Id }, new { success = true, attempt });
    }

    [HttpGet("attempts")]
    public async Task<IActionResult> GetUserAttempts([FromQuery] string? programme = null, [FromQuery] int limit = 20)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        var attempts = await _quizService.GetUserAttemptsAsync(userId, programme, limit);
        return Ok(new { success = true, count = attempts.Count, attempts });
    }

    [HttpGet("attempts/{attemptId}", Name = "GetAttempt")]
    public async Task<IActionResult> GetAttempt(string attemptId)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        var attempt = await _quizService.GetAttemptAsync(userId, attemptId);
        if (attempt == null) return NotFound(new { success = false, error = "Quiz attempt not found." });

        return Ok(new { success = true, attempt });
    }

    [HttpPost("attempts/{attemptId}/response")]
    public async Task<IActionResult> SubmitResponse(string attemptId, [FromBody] SubmitTopicQuizResponseRequest request)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        try
        {
            var response = await _quizService.SubmitResponseAsync(userId, attemptId, request);
            return Ok(new { success = true, response });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpPost("attempts/{attemptId}/complete")]
    public async Task<IActionResult> CompleteAttempt(string attemptId)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        try
        {
            var results = await _quizService.CompleteAttemptAsync(userId, attemptId);
            return Ok(new { success = true, results });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpGet("attempts/{attemptId}/results")]
    public async Task<IActionResult> GetAttemptResults(string attemptId)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        try
        {
            var results = await _quizService.GetAttemptResultsAsync(userId, attemptId);
            return Ok(new { success = true, results });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }
}
