using System.Threading;
using System.Threading.Tasks;
using Preform.Api.DTOs;

namespace Preform.Api.Services.Analytics;

public interface ILearnerReportingService
{
    Task<LearnerPerformanceReportDto> GenerateReportAsync(string userId, AnalyticsFilterDto filter, CancellationToken ct = default);
    byte[] ExportReportCsv(LearnerPerformanceReportDto report);
    byte[] ExportReportPdf(LearnerPerformanceReportDto report);
}
