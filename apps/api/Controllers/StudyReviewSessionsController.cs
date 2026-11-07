using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/study/reviews/sessions")]
public class StudyReviewSessionsController : ControllerBase
{
    private readonly IReviewSessionService _sessionService;
    private readonly ILogger<StudyReviewSessionsController> _logger;

    public StudyReviewSessionsController(IReviewSessionService sessionService, ILogger<StudyReviewSessionsController> logger)
    {
        _sessionService = sessionService;
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

    [HttpPost]
    public async Task<IActionResult> StartSession([FromBody] StartReviewSessionRequest request)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        var session = await _sessionService.StartSessionAsync(userId, request);
        return CreatedAtAction(nameof(GetSession), new { sessionId = session.Id }, new { success = true, session });
    }

    [HttpGet]
    public async Task<IActionResult> GetUserSessions([FromQuery] string? programme = null, [FromQuery] int limit = 20)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        var sessions = await _sessionService.GetUserSessionsAsync(userId, programme, limit);
        return Ok(new { success = true, count = sessions.Count, sessions });
    }

    [HttpGet("{sessionId}", Name = "GetSession")]
    public async Task<IActionResult> GetSession(string sessionId)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        var session = await _sessionService.GetSessionAsync(userId, sessionId);
        if (session == null) return NotFound(new { success = false, error = "Review session not found." });

        return Ok(new { success = true, session });
    }

    [HttpPost("{sessionId}/rating")]
    public async Task<IActionResult> SubmitRating(string sessionId, [FromBody] SubmitSessionCardRatingRequest request)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        try
        {
            var session = await _sessionService.SubmitRatingAsync(userId, sessionId, request);
            return Ok(new { success = true, session });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, error = ex.Message });
        }
    }

    [HttpPost("{sessionId}/complete")]
    public async Task<IActionResult> CompleteSession(string sessionId)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        try
        {
            var session = await _sessionService.CompleteSessionAsync(userId, sessionId);
            return Ok(new { success = true, session });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpGet("{sessionId}/summary")]
    public async Task<IActionResult> GetSessionSummary(string sessionId)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        try
        {
            var report = await _sessionService.GetSessionSummaryAsync(userId, sessionId);
            return Ok(new { success = true, report });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }
}
