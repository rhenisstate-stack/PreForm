using System.Collections.Generic;
using Preform.Api.DTOs;

namespace Preform.Api.Services.Analytics;

public interface ICsvExportService
{
    byte[] ExportAssessmentReport(AssessmentReportDto report);
    byte[] ExportQuestionPerformanceReport(IReadOnlyList<QuestionPerformanceDto> questions);
}
