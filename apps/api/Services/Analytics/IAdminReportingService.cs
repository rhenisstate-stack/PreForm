using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Preform.Api.DTOs;

namespace Preform.Api.Services.Analytics;

public class AssessmentReportFilter
{
    public string? Pathway { get; set; }
    public string? ExaminationId { get; set; }
    public string? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

public interface IAdminReportingService
{
    Task<AdminOverviewMetricsDto> GetOverviewMetricsAsync(CancellationToken ct = default);
    Task<AssessmentReportDto> GetAssessmentReportAsync(AssessmentReportFilter filter, CancellationToken ct = default);
    Task<IReadOnlyList<ExaminationRevisionReportDto>> GetExaminationRevisionReportsAsync(string examinationId, CancellationToken ct = default);
}
