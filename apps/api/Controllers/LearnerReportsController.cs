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
[Route("api/v1/learner/reports")]
[Authorize]
public class LearnerReportsController : ControllerBase
{
    private static readonly HashSet<string> AdminRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "admin", "superadmin", "administrator"
    };

    private readonly ILearnerReportingService _reportingService;
    private readonly AppDbContext? _context;

    public LearnerReportsController(ILearnerReportingService reportingService, AppDbContext? context = null)
    {
        _reportingService = reportingService;
        _context = context;
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

        var report = await _reportingService.GenerateReportAsync(authResult.TargetUserId!, filter, ct);
        var pdfBytes = _reportingService.ExportReportPdf(report);
        var safePathway = authResult.ValidatedPathway.ToLowerInvariant();
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

        var report = await _reportingService.GenerateReportAsync(authResult.TargetUserId!, filter, ct);
        var csvBytes = _reportingService.ExportReportCsv(report);
        var safePathway = authResult.ValidatedPathway.ToLowerInvariant();
        var fileName = $"PrepFord-{safePathway.ToUpperInvariant()}-Performance-Data-{DateTime.UtcNow:yyyyMMdd}.csv";

        return File(csvBytes, "text/csv; charset=utf-8", fileName);
    }

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
                error = "Forbidden: Cannot access another learner's performance report."
            }), null, string.Empty);
        }

        var targetUserId = isPrivileged && !string.IsNullOrWhiteSpace(requestedUserId)
            ? requestedUserId
            : callerUserId;

        var targetUser = _context != null
            ? await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == targetUserId, ct)
            : null;
        if (targetUser == null && _context != null)
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
                        error = $"Cross-pathway access forbidden. Learner is enrolled in NCLEX-{studentPathway.ToUpperInvariant()} and cannot access NCLEX-{normalizedRequested.ToUpperInvariant()} reports."
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
