using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
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
    private readonly AppDbContext _context;

    public LearnerAnalyticsController(ILearnerAnalyticsService analyticsService, AppDbContext context)
    {
        _analyticsService = analyticsService;
        _context = context;
    }

    #region Legacy & Phase 5 Endpoints

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] string? userId = null, CancellationToken ct = default)
    {
        var authResult = await AuthorizeAccessAsync(userId, null, ct);
        if (authResult.Result != null) return authResult.Result;

        var targetUserId = authResult.TargetUserId!;
        var summary = await _analyticsService.GetSummaryAsync(targetUserId, ct);
        return Ok(new { success = true, data = summary });
    }

    [HttpGet("client-needs")]
    public async Task<IActionResult> GetClientNeeds([FromQuery] string? userId = null, CancellationToken ct = default)
    {
        var authResult = await AuthorizeAccessAsync(userId, null, ct);
        if (authResult.Result != null) return authResult.Result;

        var targetUserId = authResult.TargetUserId!;
        var mastery = await _analyticsService.GetClientNeedsMasteryAsync(targetUserId, ct);
        return Ok(new { success = true, data = mastery });
    }

    [HttpGet("curriculum")]
    public async Task<IActionResult> GetCurriculumMastery([FromQuery] string? userId = null, CancellationToken ct = default)
    {
        var authResult = await AuthorizeAccessAsync(userId, null, ct);
        if (authResult.Result != null) return authResult.Result;

        var targetUserId = authResult.TargetUserId!;
        var topics = await _analyticsService.GetTopicMasteryAsync(targetUserId, ct);
        return Ok(new { success = true, data = topics });
    }

    [HttpGet("readiness-trend")]
    public async Task<IActionResult> GetReadinessTrend([FromQuery] string? userId = null, CancellationToken ct = default)
    {
        var authResult = await AuthorizeAccessAsync(userId, null, ct);
        if (authResult.Result != null) return authResult.Result;

        var targetUserId = authResult.TargetUserId!;
        var trend = await _analyticsService.GetReadinessTrendAsync(targetUserId, ct);
        return Ok(new { success = true, data = trend });
    }

    [HttpGet("recommendations")]
    public async Task<IActionResult> GetRecommendations([FromQuery] string? userId = null, CancellationToken ct = default)
    {
        var authResult = await AuthorizeAccessAsync(userId, null, ct);
        if (authResult.Result != null) return authResult.Result;

        var targetUserId = authResult.TargetUserId!;
        var recs = await _analyticsService.GetRecommendationsAsync(targetUserId, ct);
        return Ok(new { success = true, data = recs });
    }

    #endregion

    #region Performance Intelligence Endpoints

    [HttpGet("overview")]
    public async Task<IActionResult> GetPerformanceOverview(
        [FromQuery] string? userId = null,
        [FromQuery] string? timeRange = "all",
        [FromQuery] string? pathway = null,
        [FromQuery] string? examType = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken ct = default)
    {
        var authResult = await AuthorizeAccessAsync(userId, pathway, ct);
        if (authResult.Result != null) return authResult.Result;

        var filter = new AnalyticsFilterDto
        {
            TimeRange = timeRange ?? "all",
            Pathway = authResult.ValidatedPathway,
            ExamType = examType,
            FromDate = fromDate,
            ToDate = toDate
        };

        var overview = await _analyticsService.GetOverviewAsync(authResult.TargetUserId!, filter, ct);
        return Ok(new { success = true, data = overview });
    }

    [HttpGet("trends")]
    public async Task<IActionResult> GetPerformanceTrends(
        [FromQuery] string? userId = null,
        [FromQuery] string? timeRange = "all",
        [FromQuery] string? pathway = null,
        [FromQuery] string? examType = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken ct = default)
    {
        var authResult = await AuthorizeAccessAsync(userId, pathway, ct);
        if (authResult.Result != null) return authResult.Result;

        var filter = new AnalyticsFilterDto
        {
            TimeRange = timeRange ?? "all",
            Pathway = authResult.ValidatedPathway,
            ExamType = examType,
            FromDate = fromDate,
            ToDate = toDate
        };

        var trends = await _analyticsService.GetPerformanceTrendsAsync(authResult.TargetUserId!, filter, ct);
        return Ok(new { success = true, data = trends });
    }

    [HttpGet("distribution")]
    public async Task<IActionResult> GetPerformanceDistribution(
        [FromQuery] string? userId = null,
        [FromQuery] string? timeRange = "all",
        [FromQuery] string? pathway = null,
        [FromQuery] string? examType = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken ct = default)
    {
        var authResult = await AuthorizeAccessAsync(userId, pathway, ct);
        if (authResult.Result != null) return authResult.Result;

        var filter = new AnalyticsFilterDto
        {
            TimeRange = timeRange ?? "all",
            Pathway = authResult.ValidatedPathway,
            ExamType = examType,
            FromDate = fromDate,
            ToDate = toDate
        };

        var dist = await _analyticsService.GetPerformanceDistributionAsync(authResult.TargetUserId!, filter, ct);
        return Ok(new { success = true, data = dist });
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategoryIntelligence(
        [FromQuery] string? userId = null,
        [FromQuery] string? timeRange = "all",
        [FromQuery] string? pathway = null,
        [FromQuery] string? examType = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken ct = default)
    {
        var authResult = await AuthorizeAccessAsync(userId, pathway, ct);
        if (authResult.Result != null) return authResult.Result;

        var filter = new AnalyticsFilterDto
        {
            TimeRange = timeRange ?? "all",
            Pathway = authResult.ValidatedPathway,
            ExamType = examType,
            FromDate = fromDate,
            ToDate = toDate
        };

        var categories = await _analyticsService.GetCategoryIntelligenceAsync(authResult.TargetUserId!, filter, ct);
        return Ok(new { success = true, data = categories });
    }

    [HttpGet("question-intelligence")]
    public async Task<IActionResult> GetQuestionIntelligence(
        [FromQuery] string? userId = null,
        [FromQuery] string? timeRange = "all",
        [FromQuery] string? pathway = null,
        [FromQuery] string? examType = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken ct = default)
    {
        var authResult = await AuthorizeAccessAsync(userId, pathway, ct);
        if (authResult.Result != null) return authResult.Result;

        var filter = new AnalyticsFilterDto
        {
            TimeRange = timeRange ?? "all",
            Pathway = authResult.ValidatedPathway,
            ExamType = examType,
            FromDate = fromDate,
            ToDate = toDate
        };

        var qi = await _analyticsService.GetQuestionIntelligenceAsync(authResult.TargetUserId!, filter, ct);
        return Ok(new { success = true, data = qi });
    }

    [HttpGet("question-review")]
    public async Task<IActionResult> GetQuestionReview(
        [FromQuery] string? userId = null,
        [FromQuery] string? pathway = null,
        [FromQuery] string? clientNeedCode = null,
        [FromQuery] string? questionTypeKey = null,
        [FromQuery] string? difficulty = null,
        [FromQuery] bool? onlyIncorrect = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var authResult = await AuthorizeAccessAsync(userId, pathway, ct);
        if (authResult.Result != null) return authResult.Result;

        var filter = new QuestionReviewFilterDto
        {
            Pathway = authResult.ValidatedPathway,
            ClientNeedCode = clientNeedCode,
            QuestionTypeKey = questionTypeKey,
            Difficulty = difficulty,
            OnlyIncorrect = onlyIncorrect,
            Page = page,
            PageSize = pageSize
        };

        var review = await _analyticsService.GetQuestionReviewHistoryAsync(authResult.TargetUserId!, filter, ct);
        return Ok(new { success = true, data = review });
    }

    [HttpGet("comparison")]
    public async Task<IActionResult> GetAttemptComparison(
        [FromQuery] string? userId = null,
        [FromQuery] string? attemptId1 = null,
        [FromQuery] string? attemptId2 = null,
        CancellationToken ct = default)
    {
        var authResult = await AuthorizeAccessAsync(userId, null, ct);
        if (authResult.Result != null) return authResult.Result;

        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value;
        var isPrivileged = AdminRoles.Contains(callerRole ?? string.Empty);

        var attemptIds = new List<string>();
        if (!string.IsNullOrWhiteSpace(attemptId1)) attemptIds.Add(attemptId1);
        if (!string.IsNullOrWhiteSpace(attemptId2)) attemptIds.Add(attemptId2);

        if (attemptIds.Count > 0)
        {
            var attempts = await _context.ExamAttempts
                .Include(ea => ea.Exam)
                .Where(ea => attemptIds.Contains(ea.Id))
                .ToListAsync(ct);

            foreach (var att in attempts)
            {
                if (att.UserId != authResult.TargetUserId && !isPrivileged)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        success = false,
                        code = "ATTEMPT_OWNERSHIP_MISMATCH",
                        error = "Attempt does not belong to the target learner."
                    });
                }

                if (!isPrivileged && att.Exam != null &&
                    !string.Equals(att.Exam.Pathway, authResult.ValidatedPathway, StringComparison.OrdinalIgnoreCase))
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        success = false,
                        code = "CROSS_PATHWAY_ATTEMPT_ACCESS_DENIED",
                        error = $"Cross-pathway attempt comparison forbidden. Attempt '{att.Id}' is {att.Exam.Pathway?.ToUpperInvariant()} but learner pathway is {authResult.ValidatedPathway.ToUpperInvariant()}."
                    });
                }
            }
        }

        var comp = await _analyticsService.GetAttemptComparisonAsync(authResult.TargetUserId!, attemptId1, attemptId2, ct);
        return Ok(new { success = true, data = comp });
    }

    [HttpGet("recommendations-v2")]
    public async Task<IActionResult> GetLearnerRecommendations(
        [FromQuery] string? userId = null,
        [FromQuery] string? pathway = null,
        CancellationToken ct = default)
    {
        var authResult = await AuthorizeAccessAsync(userId, pathway, ct);
        if (authResult.Result != null) return authResult.Result;

        var recs = await _analyticsService.GetLearnerRecommendationsAsync(authResult.TargetUserId!, authResult.ValidatedPathway, ct);
        return Ok(new { success = true, data = recs });
    }

    [HttpPatch("recommendations/{id}/status")]
    public async Task<IActionResult> UpdateRecommendationStatus(
        string id,
        [FromBody] UpdateRecommendationStatusRequest request,
        [FromQuery] string? userId = null,
        CancellationToken ct = default)
    {
        var authResult = await AuthorizeAccessAsync(userId, null, ct);
        if (authResult.Result != null) return authResult.Result;

        var updated = await _analyticsService.UpdateRecommendationStatusAsync(authResult.TargetUserId!, id, request, ct);
        if (updated == null)
        {
            return NotFound(new { success = false, error = "Recommendation not found." });
        }
        return Ok(new { success = true, data = updated });
    }

    [HttpGet("interventions")]
    public async Task<IActionResult> GetInterventions(
        [FromQuery] string? userId = null,
        CancellationToken ct = default)
    {
        var authResult = await AuthorizeAccessAsync(userId, null, ct);
        if (authResult.Result != null) return authResult.Result;

        var interventions = await _analyticsService.GetInterventionsAsync(authResult.TargetUserId!, ct);
        return Ok(new { success = true, data = interventions });
    }

    [HttpPost("interventions/start")]
    public async Task<IActionResult> StartIntervention(
        [FromBody] StartInterventionRequest request,
        [FromQuery] string? userId = null,
        CancellationToken ct = default)
    {
        var authResult = await AuthorizeAccessAsync(userId, request?.Pathway, ct);
        if (authResult.Result != null) return authResult.Result;

        if (request != null)
        {
            request.Pathway = authResult.ValidatedPathway;
        }

        var inv = await _analyticsService.StartInterventionAsync(authResult.TargetUserId!, request!, ct);
        return Ok(new { success = true, data = inv });
    }

    #endregion

    private async Task<(IActionResult? Result, string? TargetUserId, string ValidatedPathway)> AuthorizeAccessAsync(
        string? requestedUserId,
        string? requestedPathway,
        CancellationToken ct)
    {
        var callerUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrWhiteSpace(callerUserId))
        {
            return (Unauthorized(new { success = false, error = "Authentication required." }), null, string.Empty);
        }

        var isPrivileged = AdminRoles.Contains(callerRole ?? string.Empty);

        if (!string.IsNullOrWhiteSpace(requestedUserId) &&
            !string.Equals(requestedUserId, callerUserId, StringComparison.Ordinal) &&
            !isPrivileged)
        {
            return (StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                code = "CROSS_USER_ACCESS_FORBIDDEN",
                error = "Forbidden: Cannot access another learner's performance analytics."
            }), null, string.Empty);
        }

        var targetUserId = isPrivileged && !string.IsNullOrWhiteSpace(requestedUserId)
            ? requestedUserId
            : callerUserId;

        var targetUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == targetUserId, ct);
        if (targetUser == null)
        {
            return (NotFound(new { success = false, error = "Learner not found." }), null, string.Empty);
        }

        if (!isPrivileged)
        {
            var studentPathway = targetUser.Pathway?.Trim().ToLowerInvariant();
            if (studentPathway != "rn" && studentPathway != "pn")
            {
                return (StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    code = "VALID_PATHWAY_REQUIRED",
                    error = "Learner must have an active single pathway enrollment ('rn' or 'pn'). Multi-pathway or dual access is not permitted."
                }), null, string.Empty);
            }

            if (!string.IsNullOrWhiteSpace(requestedPathway))
            {
                var normalizedRequested = requestedPathway.Trim().ToLowerInvariant();
                if (normalizedRequested != studentPathway)
                {
                    return (StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        success = false,
                        code = "PATHWAY_MISMATCH",
                        error = $"Cross-pathway access forbidden. Learner is enrolled in NCLEX-{studentPathway.ToUpperInvariant()} and cannot access NCLEX-{normalizedRequested.ToUpperInvariant()} analytics."
                    }), null, string.Empty);
                }
            }

            return (null, targetUserId, studentPathway);
        }

        var effectivePathway = !string.IsNullOrWhiteSpace(requestedPathway)
            ? requestedPathway.Trim().ToLowerInvariant()
            : (targetUser.Pathway?.Trim().ToLowerInvariant() ?? "rn");

        return (null, targetUserId, effectivePathway);
    }
}
