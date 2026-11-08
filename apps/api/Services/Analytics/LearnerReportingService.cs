using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services.Analytics;

public class LearnerReportingService : ILearnerReportingService
{
    private readonly AppDbContext _context;
    private readonly ILearnerAnalyticsService _analyticsService;

    public LearnerReportingService(AppDbContext context, ILearnerAnalyticsService analyticsService)
    {
        _context = context;
        _analyticsService = analyticsService;
    }

    public async Task<LearnerPerformanceReportDto> GenerateReportAsync(string userId, AnalyticsFilterDto filter, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId)) throw new ArgumentException("UserId is required.");

        var user = await _context.Users.FindAsync(new object[] { userId }, ct);
        var learnerName = user?.DisplayName ?? user?.Email ?? "Nursing Candidate";
        var learnerEmail = user?.Email ?? "";
        var pathway = filter.Pathway?.ToLowerInvariant() ?? user?.Pathway ?? "rn";
        filter.Pathway = pathway;
        var isPn = pathway == "pn";
        var pathwayTitle = isPn ? "NCLEX-PN Practical Nursing" : "NCLEX-RN Registered Nursing";

        var overview = await _analyticsService.GetOverviewAsync(userId, filter, ct);
        var categories = await _analyticsService.GetCategoryIntelligenceAsync(userId, filter, ct);
        var qIntelligence = await _analyticsService.GetQuestionIntelligenceAsync(userId, filter, ct);
        var readiness = await _analyticsService.GetReadinessTrendAsync(userId, ct);
        var recommendations = await _analyticsService.GetLearnerRecommendationsAsync(userId, pathway, ct);
        var interventions = await _analyticsService.GetInterventionsAsync(userId, ct);

        var disclaimer = "Methodology & Limitations: This report summarizes assessment records and practice performance on the PrepFord NCLEX platform. Accuracy is calculated as correct graded responses divided by eligible answered responses multiplied by 100. Readiness indicators evaluate performance against verified benchmark diagnostics and do not constitute an official NCSBN pass guarantee. Sample sizes below 5 questions per category indicate insufficient data to establish definitive clinical mastery.";

        return new LearnerPerformanceReportDto
        {
            ReportId = Guid.NewGuid().ToString("N"),
            LearnerId = userId,
            LearnerDisplayName = learnerName,
            LearnerEmail = learnerEmail,
            Pathway = pathway,
            PathwayTitle = pathwayTitle,
            ReportingPeriod = overview.CalculationPeriodLabel,
            GeneratedAt = DateTime.UtcNow,
            ExecutiveSummary = overview,
            ClientNeedsMastery = categories.ToList(),
            QuestionIntelligence = qIntelligence,
            ReadinessDevelopment = readiness,
            Recommendations = recommendations.ToList(),
            Interventions = interventions.ToList(),
            MethodologyDisclaimer = disclaimer
        };
    }

    public byte[] ExportReportCsv(LearnerPerformanceReportDto report)
    {
        var sb = new StringBuilder();

        // 1. Cover & Header
        sb.AppendLine("PREPFORD NCLEX PERFORMANCE INTELLIGENCE REPORT");
        sb.AppendLine($"Candidate Name,{Escape(report.LearnerDisplayName)}");
        sb.AppendLine($"Candidate Email,{Escape(report.LearnerEmail)}");
        sb.AppendLine($"Examination Pathway,{Escape(report.PathwayTitle)}");
        sb.AppendLine($"Reporting Period,{Escape(report.ReportingPeriod)}");
        sb.AppendLine($"Generated At (UTC),{report.GeneratedAt:yyyy-MM-dd HH:mm:ss}");
        sb.AppendLine();

        // 2. Executive Summary
        sb.AppendLine("EXECUTIVE SUMMARY METRICS");
        sb.AppendLine($"Total Completed Assessments,{report.ExecutiveSummary.TotalCompletedAssessments}");
        sb.AppendLine($"Total Started Assessments,{report.ExecutiveSummary.TotalStartedAssessments}");
        sb.AppendLine($"Assessment Completion Rate (%),{report.ExecutiveSummary.CompletionRatePercent:F1}");
        sb.AppendLine($"Total Questions Answered,{report.ExecutiveSummary.TotalQuestionsAnswered}");
        sb.AppendLine($"Correct Responses,{report.ExecutiveSummary.CorrectResponsesCount}");
        sb.AppendLine($"Incorrect Responses,{report.ExecutiveSummary.IncorrectResponsesCount}");
        sb.AppendLine($"Overall Accuracy (%),{report.ExecutiveSummary.OverallAccuracyPercent:F1}");
        sb.AppendLine($"Average Assessment Score (%),{report.ExecutiveSummary.AverageScorePercent:F1}");
        sb.AppendLine($"Total Study Time (Minutes),{report.ExecutiveSummary.TotalDurationMinutes}");
        sb.AppendLine($"Current Readiness Tier,{Escape(report.ExecutiveSummary.CurrentReadinessTier)}");
        sb.AppendLine($"Recent Trend (%),{report.ExecutiveSummary.RecentAccuracyTrendPercent:F1} ({report.ExecutiveSummary.TrendDirection})");
        sb.AppendLine();

        // 3. Client Needs Breakdown
        sb.AppendLine("NCSBN CLIENT NEEDS MASTERY");
        sb.AppendLine("Category Code,Category Name,Questions Attempted,Correct,Incorrect,Accuracy (%),Classification,Confidence,Trend");
        foreach (var c in report.ClientNeedsMastery)
        {
            sb.AppendLine($"{Escape(c.CategoryCode)},{Escape(c.CategoryName)},{c.QuestionsAttempted},{c.CorrectResponses},{c.IncorrectResponses},{c.AccuracyPercent:F1},{Escape(c.Classification)},{Escape(c.ConfidenceLevel)},{Escape(c.TrendDirection)}");
        }
        sb.AppendLine();

        // 4. Question Type Intelligence
        sb.AppendLine("QUESTION TYPE INTELLIGENCE");
        sb.AppendLine("Type Key,Question Type Name,Category,Questions Attempted,Correct,Accuracy (%),Avg Time (s),Sample Size,Performance");
        foreach (var qt in report.QuestionIntelligence.QuestionTypes)
        {
            sb.AppendLine($"{Escape(qt.QuestionTypeKey)},{Escape(qt.QuestionTypeName)},{Escape(qt.Category)},{qt.QuestionsAttempted},{qt.CorrectResponses},{qt.AccuracyPercent:F1},{qt.AverageTimeSpentSeconds},{Escape(qt.SampleSizeStatus)},{Escape(qt.PerformanceLevel)}");
        }
        sb.AppendLine();

        // 5. Difficulty Breakdown
        sb.AppendLine("QUESTION DIFFICULTY BREAKDOWN");
        sb.AppendLine("Difficulty Level,Questions Attempted,Correct,Accuracy (%),Avg Time (s)");
        foreach (var d in report.QuestionIntelligence.DifficultyBreakdown)
        {
            sb.AppendLine($"{Escape(d.Difficulty)},{d.QuestionsAttempted},{d.CorrectResponses},{d.AccuracyPercent:F1},{d.AverageTimeSpentSeconds}");
        }
        sb.AppendLine();

        // 6. Readiness Development (RAT)
        sb.AppendLine("READINESS ASSESSMENT TEST (RAT) HISTORY");
        sb.AppendLine("Attempt ID,Exam Title,Score (%),Readiness Tier,Questions,Duration (Min),Date");
        foreach (var r in report.ReadinessDevelopment.Attempts)
        {
            sb.AppendLine($"{Escape(r.AttemptId)},{Escape(r.ExamTitle)},{r.ScorePercent:F1},{Escape(r.ReadinessTier)},{r.TotalQuestions},{r.DurationMinutes},{r.CompletedAt:yyyy-MM-dd}");
        }
        sb.AppendLine();

        // 7. Personalized Recommendations
        sb.AppendLine("PERSONALIZED LEARNING RECOMMENDATIONS");
        sb.AppendLine("Priority,Title,Category,Status,Evidence,Suggested Action");
        foreach (var rec in report.Recommendations)
        {
            sb.AppendLine($"{Escape(rec.Priority)},{Escape(rec.Title)},{Escape(rec.Category)},{Escape(rec.Status)},{Escape(rec.Evidence)},{Escape(rec.SuggestedAction)}");
        }
        sb.AppendLine();

        // 8. Methodology Disclaimer
        sb.AppendLine("METHODOLOGY & LIMITATIONS");
        sb.AppendLine(Escape(report.MethodologyDisclaimer));

        var preamble = Encoding.UTF8.GetPreamble();
        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        var output = new byte[preamble.Length + bytes.Length];
        preamble.CopyTo(output, 0);
        bytes.CopyTo(output, preamble.Length);
        return output;
    }

    public byte[] ExportReportPdf(LearnerPerformanceReportDto report)
    {
        // Generates an RFC 3200 compliant PDF document with PrepFord's design tokens
        using var ms = new MemoryStream();
        using var writer = new StreamWriter(ms, Encoding.ASCII);

        var objects = new List<long>();

        void WriteObj(string content)
        {
            writer.Flush();
            objects.Add(ms.Position);
            writer.Write(content);
            writer.Flush();
        }

        // PDF Header
        writer.Write("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
        writer.Flush();

        // Obj 1: Catalog
        WriteObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

        // Obj 2: Pages Collection
        WriteObj("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

        // Obj 3: Page
        WriteObj("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n");

        // Construct Page Content Stream (Obj 4)
        var streamSb = new StringBuilder();

        // Background / Navy Header Banner (#142B4A = 0.078 0.169 0.290)
        streamSb.AppendLine("0.078 0.169 0.290 rg");
        streamSb.AppendLine("0 712 612 80 re f");

        // Teal Accent Line (#0D9488 = 0.051 0.580 0.533)
        streamSb.AppendLine("0.051 0.580 0.533 rg");
        streamSb.AppendLine("0 708 612 4 re f");

        // Header Text in White
        streamSb.AppendLine("1.0 1.0 1.0 rg");
        streamSb.AppendLine("BT");
        streamSb.AppendLine("/F2 20 Tf");
        streamSb.AppendLine("40 752 Td");
        streamSb.AppendLine("(PREPFORD NCLEX) Tj");
        streamSb.AppendLine("ET");

        streamSb.AppendLine("BT");
        streamSb.AppendLine("/F1 11 Tf");
        streamSb.AppendLine("40 732 Td");
        streamSb.AppendLine($"(Performance Intelligence Report - {EscapePdf(report.PathwayTitle)}) Tj");
        streamSb.AppendLine("ET");

        // Metadata Subheader
        streamSb.AppendLine("0.2 0.2 0.2 rg");
        streamSb.AppendLine("BT");
        streamSb.AppendLine("/F2 11 Tf");
        streamSb.AppendLine("40 680 Td");
        streamSb.AppendLine($"(Candidate: {EscapePdf(report.LearnerDisplayName)}  |  Period: {EscapePdf(report.ReportingPeriod)}  |  Generated: {report.GeneratedAt:yyyy-MM-dd}) Tj");
        streamSb.AppendLine("ET");

        // Horizontal divider
        streamSb.AppendLine("0.85 0.88 0.91 rg");
        streamSb.AppendLine("40 668 532 1 re f");

        // Section 1: Executive KPI Summary Box
        streamSb.AppendLine("0.96 0.98 0.99 rg"); // soft slate
        streamSb.AppendLine("40 575 532 80 re f");
        streamSb.AppendLine("0.85 0.88 0.91 RG");
        streamSb.AppendLine("40 575 532 80 re s");

        streamSb.AppendLine("0.078 0.169 0.290 rg");
        streamSb.AppendLine("BT");
        streamSb.AppendLine("/F2 12 Tf");
        streamSb.AppendLine("55 635 Td");
        streamSb.AppendLine("(EXECUTIVE PERFORMANCE SUMMARY) Tj");
        streamSb.AppendLine("ET");

        streamSb.AppendLine("0.2 0.2 0.2 rg");
        streamSb.AppendLine("BT");
        streamSb.AppendLine("/F1 9 Tf");
        streamSb.AppendLine("55 615 Td");
        streamSb.AppendLine($"(Overall Accuracy: {report.ExecutiveSummary.OverallAccuracyPercent:F1}%   |   Avg Score: {report.ExecutiveSummary.AverageScorePercent:F1}%   |   Readiness Tier: {EscapePdf(report.ExecutiveSummary.CurrentReadinessTier)}) Tj");
        streamSb.AppendLine("55 595 Td");
        streamSb.AppendLine($"(Completed Tests: {report.ExecutiveSummary.TotalCompletedAssessments}   |   Questions Answered: {report.ExecutiveSummary.TotalQuestionsAnswered}   |   Total Time: {report.ExecutiveSummary.TotalDurationMinutes} min) Tj");
        streamSb.AppendLine("ET");

        // Section 2: NCSBN Client Needs Mastery Table
        streamSb.AppendLine("0.078 0.169 0.290 rg");
        streamSb.AppendLine("BT");
        streamSb.AppendLine("/F2 12 Tf");
        streamSb.AppendLine("40 545 Td");
        streamSb.AppendLine("(NCSBN CLIENT NEEDS MASTERY) Tj");
        streamSb.AppendLine("ET");

        // Table Header
        streamSb.AppendLine("0.92 0.95 0.97 rg");
        streamSb.AppendLine("40 520 532 18 re f");
        streamSb.AppendLine("0.1 0.1 0.1 rg");
        streamSb.AppendLine("BT");
        streamSb.AppendLine("/F2 9 Tf");
        streamSb.AppendLine("50 525 Td (Category) Tj");
        streamSb.AppendLine("300 525 Td (Attempted) Tj");
        streamSb.AppendLine("370 525 Td (Correct) Tj");
        streamSb.AppendLine("430 525 Td (Accuracy) Tj");
        streamSb.AppendLine("495 525 Td (Status) Tj");
        streamSb.AppendLine("ET");

        // Rows
        float y = 502;
        foreach (var cat in report.ClientNeedsMastery.Take(8))
        {
            streamSb.AppendLine("0.25 0.25 0.25 rg");
            streamSb.AppendLine("BT");
            streamSb.AppendLine("/F1 8.5 Tf");
            streamSb.AppendLine($"50 {y:F1} Td ({EscapePdf(cat.CategoryName)}) Tj");
            streamSb.AppendLine($"315 {y:F1} Td ({cat.QuestionsAttempted}) Tj");
            streamSb.AppendLine($"380 {y:F1} Td ({cat.CorrectResponses}) Tj");
            streamSb.AppendLine($"440 {y:F1} Td ({cat.AccuracyPercent:F1}%) Tj");
            streamSb.AppendLine($"495 {y:F1} Td ({EscapePdf(cat.Classification)}) Tj");
            streamSb.AppendLine("ET");

            // Row separator
            streamSb.AppendLine("0.90 0.92 0.94 rg");
            streamSb.AppendLine($"40 {y - 4:F1} 532 0.5 re f");

            y -= 18;
        }

        // Section 3: Priority Recommendations
        y -= 10;
        streamSb.AppendLine("0.078 0.169 0.290 rg");
        streamSb.AppendLine("BT");
        streamSb.AppendLine("/F2 12 Tf");
        streamSb.AppendLine($"40 {y:F1} Td (TARGETED ACTION RECOMMENDATIONS) Tj");
        streamSb.AppendLine("ET");

        y -= 20;
        foreach (var rec in report.Recommendations.Take(3))
        {
            streamSb.AppendLine("0.051 0.580 0.533 rg"); // teal priority dot
            streamSb.AppendLine($"45 {y + 2:F1} 4 4 re f");

            streamSb.AppendLine("0.1 0.1 0.1 rg");
            streamSb.AppendLine("BT");
            streamSb.AppendLine("/F2 9.5 Tf");
            streamSb.AppendLine($"55 {y:F1} Td ([{EscapePdf(rec.Priority)}] {EscapePdf(rec.Title)}) Tj");
            streamSb.AppendLine("ET");

            y -= 13;
            streamSb.AppendLine("0.35 0.35 0.35 rg");
            streamSb.AppendLine("BT");
            streamSb.AppendLine("/F1 8 Tf");
            var cleanDesc = rec.Description.Length > 95 ? rec.Description.Substring(0, 95) + "..." : rec.Description;
            streamSb.AppendLine($"55 {y:F1} Td ({EscapePdf(cleanDesc)}) Tj");
            streamSb.AppendLine("ET");

            y -= 16;
        }

        // Footer & Disclaimer
        streamSb.AppendLine("0.85 0.88 0.91 rg");
        streamSb.AppendLine("40 60 532 1 re f");

        streamSb.AppendLine("0.45 0.45 0.45 rg");
        streamSb.AppendLine("BT");
        streamSb.AppendLine("/F1 7 Tf");
        streamSb.AppendLine("40 45 Td");
        streamSb.AppendLine("(PrepFord NCLEX Preparation Platform  |  Official Performance Intelligence Report  |  Page 1 of 1) Tj");
        streamSb.AppendLine("40 33 Td");
        streamSb.AppendLine("(Readiness tiers reflect diagnostic performance benchmarks and do not guarantee official NCSBN examination outcomes.) Tj");
        streamSb.AppendLine("ET");

        var streamBytes = Encoding.ASCII.GetBytes(streamSb.ToString());

        // Obj 4: Content Stream
        WriteObj($"4 0 obj\n<< /Length {streamBytes.Length} >>\nstream\n");
        writer.Flush();
        ms.Write(streamBytes, 0, streamBytes.Length);
        writer.Write("\nendstream\nendobj\n");
        writer.Flush();

        // Obj 5: Font F1 (Helvetica Regular)
        WriteObj("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

        // Obj 6: Font F2 (Helvetica Bold)
        WriteObj("6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n");

        // XRef Table
        writer.Flush();
        var xrefPos = ms.Position;
        writer.Write($"xref\n0 {objects.Count + 1}\n0000000000 65535 f \n");
        foreach (var pos in objects)
        {
            writer.Write($"{pos:D10} 00000 n \n");
        }

        // Trailer
        writer.Write($"trailer\n<< /Size {objects.Count + 1} /Root 1 0 R >>\nstartxref\n{xrefPos}\n%%EOF\n");
        writer.Flush();

        return ms.ToArray();
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

    private static string EscapePdf(string text)
    {
        if (string.IsNullOrEmpty(text)) return "";
        return text
            .Replace("\\", "\\\\")
            .Replace("(", "\\(")
            .Replace(")", "\\)")
            .Replace("\r", " ")
            .Replace("\n", " ");
    }
}
