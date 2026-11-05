using System;
using System.Collections.Generic;

namespace Preform.Api.DTOs;

#region Learner Analytics DTOs

public class LearnerAnalyticsSummaryDto
{
    public int TotalCompletedAttempts { get; set; }
    public int TotalPracticeQuestions { get; set; }
    public decimal AverageScorePercent { get; set; }
    public decimal OverallPassRate { get; set; }
    public int TotalDurationMinutes { get; set; }
    public DateTime? LastAssessmentDate { get; set; }
    public string CurrentReadinessTier { get; set; } = "Unassessed";
}

public class ClientNeedMasteryDto
{
    public string CategoryCode { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public int TotalAssessedQuestions { get; set; }
    public int CorrectCount { get; set; }
    public decimal AccuracyPercent { get; set; }
    public bool IsLowSample { get; set; }
    public string PerformanceTier { get; set; } = "Unassessed";
}

public class TopicMasteryDto
{
    public string TopicId { get; set; } = string.Empty;
    public string TopicName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string DomainName { get; set; } = string.Empty;
    public int TotalQuestions { get; set; }
    public int CorrectCount { get; set; }
    public decimal AccuracyPercent { get; set; }
    public bool IsDeficiencyArea { get; set; }
}

public class ReadinessAttemptItemDto
{
    public string AttemptId { get; set; } = string.Empty;
    public string ExamTitle { get; set; } = string.Empty;
    public decimal ScorePercent { get; set; }
    public string ReadinessTier { get; set; } = string.Empty;
    public DateTime CompletedAt { get; set; }
    public int TotalQuestions { get; set; }
    public int DurationMinutes { get; set; }
}

public class ReadinessTrendDto
{
    public string LatestTier { get; set; } = "Unassessed";
    public decimal? LatestScorePercent { get; set; }
    public int TotalDiagnosticAttempts { get; set; }
    public List<ReadinessAttemptItemDto> Attempts { get; set; } = new();
}

public class StudyRecommendationDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = "Remediation"; // Remediation | Practice | Simulation
    public string Priority { get; set; } = "Medium"; // High | Medium | Low
    public string? TargetClientNeedCode { get; set; }
    public string? ActionHref { get; set; }
}

#endregion

#region Administrative Reporting DTOs

public class AdminOverviewMetricsDto
{
    public int TotalLearners { get; set; }
    public int ActiveLearners { get; set; }
    public int TotalQuestions { get; set; }
    public int PublishedQuestions { get; set; }
    public int ReviewQueueCount { get; set; }
    public int PublishedExamsCount { get; set; }
    public int TotalCompletedAttempts { get; set; }
    public decimal AverageCohortScorePercent { get; set; }
    public decimal ActiveEngagementRate { get; set; }
}

public class ScoreDistributionBucketDto
{
    public string BucketLabel { get; set; } = string.Empty;
    public decimal MinScore { get; set; }
    public decimal MaxScore { get; set; }
    public int Count { get; set; }
    public decimal Percentage { get; set; }
}

public class ExaminationAssessmentBreakdownDto
{
    public string ExaminationId { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public int TotalAttempts { get; set; }
    public int CompletedAttempts { get; set; }
    public decimal AverageScorePercent { get; set; }
    public decimal PassRate { get; set; }
    public int AverageDurationMinutes { get; set; }
}

public class AssessmentReportDto
{
    public int TotalAttempts { get; set; }
    public int CompletedAttempts { get; set; }
    public int AbandonedAttempts { get; set; }
    public decimal CompletionRate { get; set; }
    public decimal AbandonmentRate { get; set; }
    public decimal AverageScorePercent { get; set; }
    public decimal PassRate { get; set; }
    public int AverageDurationMinutes { get; set; }
    public List<ScoreDistributionBucketDto> ScoreDistribution { get; set; } = new();
    public List<ExaminationAssessmentBreakdownDto> ExaminationBreakdowns { get; set; } = new();
}

public class ExaminationRevisionReportDto
{
    public string ExaminationId { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int RevisionNumber { get; set; }
    public string RevisionId { get; set; } = string.Empty;
    public string LifecycleState { get; set; } = string.Empty;
    public int TotalAttempts { get; set; }
    public int CompletedAttempts { get; set; }
    public decimal AverageScorePercent { get; set; }
    public decimal PassRate { get; set; }
}

public class DistractorSelectionDto
{
    public string OptionKey { get; set; } = string.Empty;
    public string ContentPreview { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public int SelectionCount { get; set; }
    public decimal SelectionRate { get; set; }
}

public class QuestionPerformanceDto
{
    public string QuestionId { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string StemPreview { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public string QuestionTypeKey { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public string? ClientNeedCode { get; set; }
    public string? ClientNeedName { get; set; }
    public int TimesDelivered { get; set; }
    public int TimesAnswered { get; set; }
    public int CorrectResponseCount { get; set; }
    public decimal CorrectResponseRate { get; set; }
    public int AverageTimeSpentSeconds { get; set; }
    public List<DistractorSelectionDto> DistractorAnalysis { get; set; } = new();
}

#endregion

#region Operational Observability DTOs

public class OperationalHealthDto
{
    public string Status { get; set; } = "Healthy";
    public long DatabaseLatencyMs { get; set; }
    public string DatabaseStatus { get; set; } = "Healthy";
    public int TotalActiveSessions { get; set; }
    public int ActiveUsers { get; set; }
    public string ServerUptime { get; set; } = string.Empty;
    public double CommittedMemoryMb { get; set; }
    public int AuditEventsLast24Hours { get; set; }
    public int SecurityIncidentsLast24Hours { get; set; }
    public DateTime CheckedAt { get; set; } = DateTime.UtcNow;
}

#endregion
