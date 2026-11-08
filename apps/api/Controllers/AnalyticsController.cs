using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Services;
using Preform.Api.Services.Analytics;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/analytics")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly ISystemAnalyticsService _analyticsService;
    private readonly AppDbContext? _context;

    public AnalyticsController(ISystemAnalyticsService analyticsService, AppDbContext? context = null)
    {
        _analyticsService = analyticsService;
        _context = context;
    }

    private string? GetCurrentUserId() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
        User.FindFirst("sub")?.Value ??
        User.FindFirst("userId")?.Value;

    private string GetEffectiveRole() =>
        RoleHierarchy.GetEffectiveRole(User);

    #region Admin Overview & Deep Analytics

    [HttpGet("admin/overview")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> GetAdminOverview([FromQuery] SystemAnalyticsFilterDto filter, CancellationToken ct)
    {
        var result = await _analyticsService.GetAdminSystemOverviewAsync(filter, ct);
        return Ok(new { success = true, data = result });
    }

    [HttpGet("admin/users")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> GetAdminUsers([FromQuery] SystemAnalyticsFilterDto filter, CancellationToken ct)
    {
        var result = await _analyticsService.GetAdminUserAnalyticsAsync(filter, ct);
        return Ok(new { success = true, data = result });
    }

    [HttpGet("admin/examinations")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> GetAdminExaminations([FromQuery] SystemAnalyticsFilterDto filter, CancellationToken ct)
    {
        var result = await _analyticsService.GetAdminExaminationAnalyticsAsync(filter, ct);
        return Ok(new { success = true, data = result });
    }

    [HttpGet("admin/academics")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> GetAdminAcademics([FromQuery] SystemAnalyticsFilterDto filter, CancellationToken ct)
    {
        var result = await _analyticsService.GetAdminAcademicAnalyticsAsync(filter, ct);
        return Ok(new { success = true, data = result });
    }

    [HttpGet("admin/monetization")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> GetAdminMonetization([FromQuery] SystemAnalyticsFilterDto filter, CancellationToken ct)
    {
        var result = await _analyticsService.GetAdminMonetizationAnalyticsAsync(filter, ct);
        return Ok(new { success = true, data = result });
    }

    [HttpGet("admin/activity")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> GetAdminActivity([FromQuery] SystemAnalyticsFilterDto filter, CancellationToken ct)
    {
        var result = await _analyticsService.GetAdminPlatformActivityAsync(filter, ct);
        return Ok(new { success = true, data = result });
    }

    #endregion

    #region Role-Specific Workspaces

    [HttpGet("exams/overview")]
    [Authorize]
    public async Task<IActionResult> GetExamManagerOverview([FromQuery] SystemAnalyticsFilterDto filter, CancellationToken ct)
    {
        var role = GetEffectiveRole();
        if (role != "exam_manager" && role != "admin" && role != "superadmin")
        {
            return Forbid();
        }

        var result = await _analyticsService.GetExamManagerOverviewAsync(filter, ct);
        return Ok(new { success = true, data = result });
    }

    [HttpGet("content/overview")]
    [Authorize]
    public async Task<IActionResult> GetContentManagerOverview([FromQuery] SystemAnalyticsFilterDto filter, CancellationToken ct)
    {
        var role = GetEffectiveRole();
        if (role != "content_manager" && role != "manager" && role != "admin" && role != "superadmin")
        {
            return Forbid();
        }

        var result = await _analyticsService.GetContentManagerOverviewAsync(filter, ct);
        return Ok(new { success = true, data = result });
    }

    [HttpGet("reviews/overview")]
    [Authorize]
    public async Task<IActionResult> GetReviewerOverview([FromQuery] SystemAnalyticsFilterDto filter, CancellationToken ct)
    {
        var role = GetEffectiveRole();
        if (role != "reviewer" && role != "content_manager" && role != "admin" && role != "superadmin")
        {
            return Forbid();
        }

        var result = await _analyticsService.GetReviewerOverviewAsync(filter, ct);
        return Ok(new { success = true, data = result });
    }

    [HttpGet("instructor/overview")]
    [Authorize]
    public async Task<IActionResult> GetInstructorOverview([FromQuery] SystemAnalyticsFilterDto filter, CancellationToken ct)
    {
        var role = GetEffectiveRole();
        if (role != "instructor" && role != "admin" && role != "superadmin")
        {
            return Forbid();
        }

        var instructorId = GetCurrentUserId();
        var result = await _analyticsService.GetInstructorOverviewAsync(filter, instructorId, ct);
        return Ok(new { success = true, data = result });
    }

    #endregion

    #region Learner Consolidated Overview

    [HttpGet("learner/{pathway}/overview")]
    [Authorize]
    public async Task<IActionResult> GetLearnerDashboardOverview(
        string pathway,
        [FromQuery] string? userId = null,
        [FromQuery] SystemAnalyticsFilterDto? filter = null,
        CancellationToken ct = default)
    {
        var currentUserId = GetCurrentUserId();
        var role = GetEffectiveRole();

        // Enforce data isolation: learners may only query their own data
        var targetUserId = currentUserId;
        if (!string.IsNullOrWhiteSpace(userId) && userId != currentUserId)
        {
            if (role != "admin" && role != "superadmin" && role != "instructor")
            {
                return Forbid();
            }
            targetUserId = userId;
        }

        if (string.IsNullOrWhiteSpace(targetUserId))
        {
            return Unauthorized(new { success = false, error = "User identity could not be established." });
        }

        if (role != "admin" && role != "superadmin")
        {
            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == targetUserId, ct);
            var studentPathway = (user?.Pathway ?? "").Trim().ToLowerInvariant();
            if (studentPathway != "rn" && studentPathway != "pn")
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "Student account does not have a valid examination pathway assignment ('rn' or 'pn')." });
            }

            if (!string.Equals(pathway, studentPathway, StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    error = $"Enrolled pathway is {studentPathway.ToUpperInvariant()}. Cross-pathway analytics access ({pathway.ToUpperInvariant()}) is prohibited."
                });
            }
        }

        var effectiveFilter = filter ?? new SystemAnalyticsFilterDto();
        var result = await _analyticsService.GetLearnerDashboardOverviewAsync(targetUserId, pathway, effectiveFilter, ct);
        return Ok(new { success = true, data = result });
    }

    #endregion
}
