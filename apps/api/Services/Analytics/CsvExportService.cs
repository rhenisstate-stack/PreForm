using System.Collections.Generic;
using System.Text;
using Preform.Api.DTOs;

namespace Preform.Api.Services.Analytics;

public class CsvExportService : ICsvExportService
{
    public byte[] ExportAssessmentReport(AssessmentReportDto report)
    {
        var sb = new StringBuilder();

        // Assessment Summary Section
        sb.AppendLine("ASSESSMENT PERFORMANCE REPORT");
        sb.AppendLine($"Total Attempts,{report.TotalAttempts}");
        sb.AppendLine($"Completed Attempts,{report.CompletedAttempts}");
        sb.AppendLine($"Abandoned Attempts,{report.AbandonedAttempts}");
        sb.AppendLine($"Completion Rate (%),{report.CompletionRate:F1}");
        sb.AppendLine($"Abandonment Rate (%),{report.AbandonmentRate:F1}");
        sb.AppendLine($"Cohort Average Score (%),{report.AverageScorePercent:F1}");
        sb.AppendLine($"Cohort Pass Rate (%),{report.PassRate:F1}");
        sb.AppendLine($"Average Duration (Minutes),{report.AverageDurationMinutes}");
        sb.AppendLine();

        // Score Distribution Section
        sb.AppendLine("SCORE DISTRIBUTION");
        sb.AppendLine("Score Range,Count,Percentage (%)");
        foreach (var bucket in report.ScoreDistribution)
        {
            sb.AppendLine($"{Escape(bucket.BucketLabel)},{bucket.Count},{bucket.Percentage:F1}");
        }
        sb.AppendLine();

        // Examination Family Breakdown Section
        sb.AppendLine("EXAMINATION BREAKDOWN");
        sb.AppendLine("Code,Title,Pathway,Total Attempts,Completed Attempts,Average Score (%),Pass Rate (%),Avg Duration (Min)");
        foreach (var exam in report.ExaminationBreakdowns)
        {
            sb.AppendLine($"{Escape(exam.Code)},{Escape(exam.Title)},{Escape(exam.Pathway)},{exam.TotalAttempts},{exam.CompletedAttempts},{exam.AverageScorePercent:F1},{exam.PassRate:F1},{exam.AverageDurationMinutes}");
        }

        // Prepend UTF-8 BOM for Excel compatibility
        var preamble = Encoding.UTF8.GetPreamble();
        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        var output = new byte[preamble.Length + bytes.Length];
        preamble.CopyTo(output, 0);
        bytes.CopyTo(output, preamble.Length);
        return output;
    }

    public byte[] ExportQuestionPerformanceReport(IReadOnlyList<QuestionPerformanceDto> questions)
    {
        var sb = new StringBuilder();

        sb.AppendLine("QUESTION BANK PERFORMANCE REPORT");
        sb.AppendLine("Code,Pathway,Type,Difficulty,Client Need,Times Delivered,Times Answered,Correct Count,Correct Rate (%),Avg Time (s),Stem Preview");

        foreach (var q in questions)
        {
            sb.AppendLine($"{Escape(q.Code ?? "")},{Escape(q.Pathway)},{Escape(q.QuestionTypeKey)},{Escape(q.Difficulty)},{Escape(q.ClientNeedName ?? q.ClientNeedCode ?? "")},{q.TimesDelivered},{q.TimesAnswered},{q.CorrectResponseCount},{q.CorrectResponseRate:F1},{q.AverageTimeSpentSeconds},{Escape(q.StemPreview)}");
        }

        var preamble = Encoding.UTF8.GetPreamble();
        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        var output = new byte[preamble.Length + bytes.Length];
        preamble.CopyTo(output, 0);
        bytes.CopyTo(output, preamble.Length);
        return output;
    }

    private static string Escape(string value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }
        return value;
    }
}
