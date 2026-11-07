using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Services.Analytics;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/learner/reports")]
[Authorize]
public class LearnerReportsController : ControllerBase
{
    private static readonly HashSet<string> AdminRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "admin", "superadmin", "administrator"
    };

    private readonly ILearnerReportingService _reportingService;

    public LearnerReportsController(ILearnerReportingService reportingService)
    {
        _reportingService = reportingService;
    }

    [HttpGet("performance")]
    public async Task<IActionResult> GetPerformanceReport(
        [FromQuery] string? userId = null,
        [FromQuery] string? timeRange = "all",
        [FromQuery] string? pathway = null,
        [FromQuery] string? examType = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken ct = default)
    {
        var authResult = AuthorizeAccess(userId);
        if (authResult.Result != null) return authResult.Result;

        var filter = new AnalyticsFilterDto
        {
            TimeRange = timeRange ?? "all",
            Pathway = pathway,
            ExamType = examType,
            FromDate = fromDate,
            ToDate = toDate
        };

        var report = await _reportingService.GenerateReportAsync(authResult.TargetUserId!, filter, ct);
        return Ok(new { success = true, data = report });
    }

    [HttpGet("performance/pdf")]
    public async Task<IActionResult> DownloadPerformanceReportPdf(
        [FromQuery] string? userId = null,
        [FromQuery] string? timeRange = "all",
        [FromQuery] string? pathway = null,
        [FromQuery] string? examType = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken ct = default)
    {
        var authResult = AuthorizeAccess(userId);
        if (authResult.Result != null) return authResult.Result;

        var filter = new AnalyticsFilterDto
        {
            TimeRange = timeRange ?? "all",
            Pathway = pathway,
            ExamType = examType,
            FromDate = fromDate,
            ToDate = toDate
        };

        var report = await _reportingService.GenerateReportAsync(authResult.TargetUserId!, filter, ct);
        var pdfBytes = _reportingService.ExportReportPdf(report);
        var safePathway = (pathway ?? "nclex").ToLowerInvariant();
        var fileName = $"PrepFord-{safePathway.ToUpperInvariant()}-Performance-Report-{DateTime.UtcNow:yyyyMMdd}.pdf";

        return File(pdfBytes, "application/pdf", fileName);
    }

    [HttpGet("performance/csv")]
    public async Task<IActionResult> DownloadPerformanceReportCsv(
        [FromQuery] string? userId = null,
        [FromQuery] string? timeRange = "all",
        [FromQuery] string? pathway = null,
        [FromQuery] string? examType = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken ct = default)
    {
        var authResult = AuthorizeAccess(userId);
        if (authResult.Result != null) return authResult.Result;

        var filter = new AnalyticsFilterDto
        {
            TimeRange = timeRange ?? "all",
            Pathway = pathway,
            ExamType = examType,
            FromDate = fromDate,
            ToDate = toDate
        };

        var report = await _reportingService.GenerateReportAsync(authResult.TargetUserId!, filter, ct);
        var csvBytes = _reportingService.ExportReportCsv(report);
        var safePathway = (pathway ?? "nclex").ToLowerInvariant();
        var fileName = $"PrepFord-{safePathway.ToUpperInvariant()}-Performance-Data-{DateTime.UtcNow:yyyyMMdd}.csv";

        return File(csvBytes, "text/csv; charset=utf-8", fileName);
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
                error = "Forbidden: Cannot access another learner's performance report."
            }), null);
        }

        var targetUserId = isPrivileged && !string.IsNullOrWhiteSpace(requestedUserId)
            ? requestedUserId
            : callerUserId;

        return (null, targetUserId);
    }
}
