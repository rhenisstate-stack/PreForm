using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.Services.Analytics;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/admin/reports")]
[Authorize(Policy = "RequireAdmin")]
public class AdminReportsController : ControllerBase
{
    private readonly IAdminReportingService _reportingService;
    private readonly IQuestionAnalyticsService _questionAnalyticsService;
    private readonly ICsvExportService _csvExportService;

    public AdminReportsController(
        IAdminReportingService reportingService,
        IQuestionAnalyticsService questionAnalyticsService,
        ICsvExportService csvExportService)
    {
        _reportingService = reportingService;
        _questionAnalyticsService = questionAnalyticsService;
        _csvExportService = csvExportService;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverviewMetrics(CancellationToken ct)
    {
        var metrics = await _reportingService.GetOverviewMetricsAsync(ct);
        return Ok(new { success = true, data = metrics });
    }

    [HttpGet("assessments")]
    public async Task<IActionResult> GetAssessmentReport(
        [FromQuery] string? pathway,
        [FromQuery] string? examinationId,
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        CancellationToken ct)
    {
        var filter = new AssessmentReportFilter
        {
            Pathway = pathway,
            ExaminationId = examinationId,
            Status = status,
            FromDate = fromDate,
            ToDate = toDate
        };

        var report = await _reportingService.GetAssessmentReportAsync(filter, ct);
        return Ok(new { success = true, data = report });
    }

    [HttpGet("assessments/export")]
    public async Task<IActionResult> ExportAssessmentReport(
        [FromQuery] string? pathway,
        [FromQuery] string? examinationId,
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        CancellationToken ct)
    {
        var filter = new AssessmentReportFilter
        {
            Pathway = pathway,
            ExaminationId = examinationId,
            Status = status,
            FromDate = fromDate,
            ToDate = toDate
        };

        var report = await _reportingService.GetAssessmentReportAsync(filter, ct);
        var bytes = _csvExportService.ExportAssessmentReport(report);

        var filename = $"prepford-assessments-{DateTime.UtcNow:yyyyMMddHHmmss}.csv";
        return File(bytes, "text/csv", filename);
    }

    [HttpGet("examinations/{id}/revisions")]
    public async Task<IActionResult> GetExaminationRevisionReports(string id, CancellationToken ct)
    {
        var reports = await _reportingService.GetExaminationRevisionReportsAsync(id, ct);
        return Ok(new { success = true, data = reports });
    }

    [HttpGet("questions")]
    public async Task<IActionResult> GetQuestionsPerformance(
        [FromQuery] string? pathway,
        [FromQuery] string? questionTypeKey,
        [FromQuery] string? difficulty,
        [FromQuery] string? clientNeedCode,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var filter = new QuestionPerformanceFilter
        {
            Pathway = pathway,
            QuestionTypeKey = questionTypeKey,
            Difficulty = difficulty,
            ClientNeedCode = clientNeedCode,
            Search = search,
            Page = page,
            PageSize = pageSize
        };

        var result = await _questionAnalyticsService.GetQuestionsPerformanceAsync(filter, ct);
        return Ok(new { success = true, data = result });
    }

    [HttpGet("questions/{id}")]
    public async Task<IActionResult> GetQuestionPerformanceDetail(string id, CancellationToken ct)
    {
        var result = await _questionAnalyticsService.GetQuestionPerformanceDetailAsync(id, ct);
        if (result == null)
        {
            return NotFound(new { success = false, error = $"Question {id} not found." });
        }

        return Ok(new { success = true, data = result });
    }

    [HttpGet("questions/export")]
    public async Task<IActionResult> ExportQuestionsPerformance(
        [FromQuery] string? pathway,
        [FromQuery] string? questionTypeKey,
        [FromQuery] string? difficulty,
        [FromQuery] string? clientNeedCode,
        [FromQuery] string? search,
        CancellationToken ct)
    {
        var filter = new QuestionPerformanceFilter
        {
            Pathway = pathway,
            QuestionTypeKey = questionTypeKey,
            Difficulty = difficulty,
            ClientNeedCode = clientNeedCode,
            Search = search,
            Page = 1,
            PageSize = 1000 // Safe bounded export ceiling
        };

        var result = await _questionAnalyticsService.GetQuestionsPerformanceAsync(filter, ct);
        var bytes = _csvExportService.ExportQuestionPerformanceReport(result.Items);

        var filename = $"prepford-questions-performance-{DateTime.UtcNow:yyyyMMddHHmmss}.csv";
        return File(bytes, "text/csv", filename);
    }
}
