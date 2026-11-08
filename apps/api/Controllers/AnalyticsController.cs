using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

    public AnalyticsController(ISystemAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
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

        var effectiveFilter = filter ?? new SystemAnalyticsFilterDto();
        var result = await _analyticsService.GetLearnerDashboardOverviewAsync(targetUserId, pathway, effectiveFilter, ct);
        return Ok(new { success = true, data = result });
    }

    #endregion
}
