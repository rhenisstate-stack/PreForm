using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.Services.Analytics;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/learner/analytics")]
[Authorize]
public class LearnerAnalyticsController : ControllerBase
{
    private static readonly HashSet<string> AdminRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "admin", "superadmin", "administrator"
    };

    private readonly ILearnerAnalyticsService _analyticsService;

    public LearnerAnalyticsController(ILearnerAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] string? userId = null, CancellationToken ct = default)
    {
        var authResult = AuthorizeAccess(userId);
        if (authResult.Result != null) return authResult.Result;

        var targetUserId = authResult.TargetUserId!;
        var summary = await _analyticsService.GetSummaryAsync(targetUserId, ct);
        return Ok(new { success = true, data = summary });
    }

    [HttpGet("client-needs")]
    public async Task<IActionResult> GetClientNeeds([FromQuery] string? userId = null, CancellationToken ct = default)
    {
        var authResult = AuthorizeAccess(userId);
        if (authResult.Result != null) return authResult.Result;

        var targetUserId = authResult.TargetUserId!;
        var mastery = await _analyticsService.GetClientNeedsMasteryAsync(targetUserId, ct);
        return Ok(new { success = true, data = mastery });
    }

    [HttpGet("curriculum")]
    public async Task<IActionResult> GetCurriculumMastery([FromQuery] string? userId = null, CancellationToken ct = default)
    {
        var authResult = AuthorizeAccess(userId);
        if (authResult.Result != null) return authResult.Result;

        var targetUserId = authResult.TargetUserId!;
        var topics = await _analyticsService.GetTopicMasteryAsync(targetUserId, ct);
        return Ok(new { success = true, data = topics });
    }

    [HttpGet("readiness-trend")]
    public async Task<IActionResult> GetReadinessTrend([FromQuery] string? userId = null, CancellationToken ct = default)
    {
        var authResult = AuthorizeAccess(userId);
        if (authResult.Result != null) return authResult.Result;

        var targetUserId = authResult.TargetUserId!;
        var trend = await _analyticsService.GetReadinessTrendAsync(targetUserId, ct);
        return Ok(new { success = true, data = trend });
    }

    [HttpGet("recommendations")]
    public async Task<IActionResult> GetRecommendations([FromQuery] string? userId = null, CancellationToken ct = default)
    {
        var authResult = AuthorizeAccess(userId);
        if (authResult.Result != null) return authResult.Result;

        var targetUserId = authResult.TargetUserId!;
        var recs = await _analyticsService.GetRecommendationsAsync(targetUserId, ct);
        return Ok(new { success = true, data = recs });
    }

    private (IActionResult? Result, string? TargetUserId) AuthorizeAccess(string? requestedUserId)
    {
        var callerUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrWhiteSpace(callerUserId))
        {
            return (Unauthorized(new { success = false, error = "Authentication required." }), null);
        }

        var isPrivileged = AdminRoles.Contains(callerRole ?? string.Empty);

        if (!string.IsNullOrWhiteSpace(requestedUserId) &&
            !string.Equals(requestedUserId, callerUserId, StringComparison.Ordinal) &&
            !isPrivileged)
        {
            return (StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                error = "Forbidden: Cannot access another learner's performance analytics."
            }), null);
        }

        var targetUserId = isPrivileged && !string.IsNullOrWhiteSpace(requestedUserId)
            ? requestedUserId
            : callerUserId;

        return (null, targetUserId);
    }
}
