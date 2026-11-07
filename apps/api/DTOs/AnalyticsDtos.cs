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

#region Performance Intelligence DTOs

public class AnalyticsFilterDto
{
    public string TimeRange { get; set; } = "all"; // "7d", "30d", "90d", "6m", "all", "custom"
    public string? Pathway { get; set; } // "rn", "pn", "both"
    public string? ExamType { get; set; } // "Practice", "CAT", "DiagnosticReadiness", "MockSimulation"
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? ClientNeedCode { get; set; }
    public string? QuestionTypeKey { get; set; }
}

public class LearnerPerformanceOverviewDto
{
    public int TotalCompletedAssessments { get; set; }
    public int TotalStartedAssessments { get; set; }
    public int AbandonedAssessments { get; set; }
    public decimal CompletionRatePercent { get; set; }
    public int TotalQuestionsAnswered { get; set; }
    public int TotalEligibleQuestions { get; set; }
    public int CorrectResponsesCount { get; set; }
    public int IncorrectResponsesCount { get; set; }
    public int UnansweredCount { get; set; }
    public decimal OverallAccuracyPercent { get; set; }
    public decimal AverageScorePercent { get; set; }
    public int TotalDurationMinutes { get; set; }
    public int AverageDurationMinutes { get; set; }
    public DateTime? FirstAssessmentDate { get; set; }
    public DateTime? LastAssessmentDate { get; set; }
    public string CurrentReadinessTier { get; set; } = "Unassessed";
    public decimal RecentAccuracyTrendPercent { get; set; }
    public string TrendDirection { get; set; } = "Neutral"; // "Improving", "Declining", "Neutral"
    public string? PriorityImprovementArea { get; set; }
    public List<string> KeyStrengths { get; set; } = new();
    public List<string> AreasNeedingAttention { get; set; } = new();
    public string CalculationPeriodLabel { get; set; } = "All Time";
    public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;
}

public class PerformanceTrendPointDto
{
    public string Date { get; set; } = string.Empty; // "yyyy-MM-dd"
    public string Label { get; set; } = string.Empty; // e.g. "Nov 01"
    public decimal ScorePercent { get; set; }
    public decimal AccuracyPercent { get; set; }
    public int AttemptsCompleted { get; set; }
    public int QuestionsAnswered { get; set; }
    public string ExamTitle { get; set; } = string.Empty;
    public string ExamType { get; set; } = string.Empty;
    public string AttemptId { get; set; } = string.Empty;
}

public class PerformanceTrendSeriesDto
{
    public List<PerformanceTrendPointDto> Points { get; set; } = new();
    public decimal OverallSlope { get; set; }
    public string OverallTrajectory { get; set; } = "Steady"; // "Accelerating", "Improving", "Steady", "Declining"
    public int TotalEvaluatedAttempts { get; set; }
}

public class ScoreDistributionBandDto
{
    public string BandLabel { get; set; } = string.Empty; // e.g. "90-100%", "80-89%", etc.
    public decimal MinScore { get; set; }
    public decimal MaxScore { get; set; }
    public int AttemptCount { get; set; }
    public decimal Percentage { get; set; }
}

public class LearnerScoreDistributionDto
{
    public int TotalAttempts { get; set; }
    public List<ScoreDistributionBandDto> Bands { get; set; } = new();
    public decimal MedianScorePercent { get; set; }
    public decimal HighestScorePercent { get; set; }
    public decimal LowestScorePercent { get; set; }
}

public class CategoryPerformanceIntelligenceDto
{
    public string CategoryCode { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string Pathway { get; set; } = "both";
    public int QuestionsAttempted { get; set; }
    public int CorrectResponses { get; set; }
    public int IncorrectResponses { get; set; }
    public decimal AccuracyPercent { get; set; }
    public string Classification { get; set; } = "InsufficientData"; // "Strong", "Developing", "NeedsAttention", "InsufficientData"
    public string ConfidenceLevel { get; set; } = "Low"; // "High" (>=15 q), "Moderate" (>=5 q), "Low" (<5 q)
    public string TrendDirection { get; set; } = "Neutral"; // "Up", "Down", "Neutral"
    public DateTime? LastPracticedAt { get; set; }
    public string SuggestedRemediation { get; set; } = string.Empty;
    public string SuggestedActionHref { get; set; } = "/dashboard";
}

public class QuestionTypeIntelligenceDto
{
    public string QuestionTypeKey { get; set; } = string.Empty;
    public string QuestionTypeName { get; set; } = string.Empty;
    public string Category { get; set; } = "Traditional"; // "Traditional", "Clinical", "NGN"
    public int QuestionsAttempted { get; set; }
    public int CorrectResponses { get; set; }
    public decimal AccuracyPercent { get; set; }
    public int AverageTimeSpentSeconds { get; set; }
    public string SampleSizeStatus { get; set; } = "Limited"; // "Robust" (>=10), "Moderate" (>=4), "Limited" (<4)
    public string PerformanceLevel { get; set; } = "Developing"; // "Strong", "Developing", "NeedsAttention"
}

public class DifficultyIntelligenceDto
{
    public string Difficulty { get; set; } = string.Empty; // "Easy", "Moderate", "Hard", "Expert"
    public int QuestionsAttempted { get; set; }
    public int CorrectResponses { get; set; }
    public decimal AccuracyPercent { get; set; }
    public int AverageTimeSpentSeconds { get; set; }
}

public class ClinicalJudgmentIntelligenceDto
{
    public string StepKey { get; set; } = string.Empty; // "RecognizeCues", "AnalyzeCues", etc.
    public string StepName { get; set; } = string.Empty;
    public int StepOrder { get; set; }
    public int QuestionsAttempted { get; set; }
    public int CorrectResponses { get; set; }
    public decimal AccuracyPercent { get; set; }
    public string Status { get; set; } = "Developing";
}

public class RecurringErrorPatternDto
{
    public string PatternId { get; set; } = string.Empty;
    public string PatternType { get; set; } = "Category"; // "Category", "QuestionType", "ClinicalJudgment"
    public string TargetCode { get; set; } = string.Empty;
    public string TargetName { get; set; } = string.Empty;
    public int IncorrectCount { get; set; }
    public decimal ErrorRatePercent { get; set; }
    public string ContextSummary { get; set; } = string.Empty;
    public string ActionableRemediation { get; set; } = string.Empty;
    public string ActionHref { get; set; } = "/dashboard";
}

public class QuestionIntelligenceSummaryDto
{
    public List<QuestionTypeIntelligenceDto> QuestionTypes { get; set; } = new();
    public List<DifficultyIntelligenceDto> DifficultyBreakdown { get; set; } = new();
    public List<ClinicalJudgmentIntelligenceDto> ClinicalJudgmentSteps { get; set; } = new();
    public List<RecurringErrorPatternDto> RecurringErrors { get; set; } = new();
}

public class QuestionReviewFilterDto
{
    public string? Pathway { get; set; }
    public string? ClientNeedCode { get; set; }
    public string? QuestionTypeKey { get; set; }
    public string? Difficulty { get; set; }
    public bool? OnlyIncorrect { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class LearnerQuestionReviewDto
{
    public string ResponseId { get; set; } = string.Empty;
    public string QuestionId { get; set; } = string.Empty;
    public string? QuestionCode { get; set; }
    public string StemPreview { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public string QuestionTypeKey { get; set; } = string.Empty;
    public string QuestionTypeName { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public string? ClientNeedCode { get; set; }
    public string? ClientNeedName { get; set; }
    public string? ClinicalJudgmentStep { get; set; }
    public List<string> LearnerSelectedOptions { get; set; } = new();
    public List<string> CorrectAnswerOptions { get; set; } = new();
    public bool IsCorrect { get; set; }
    public decimal ScoreAwarded { get; set; }
    public int TimeSpentSeconds { get; set; }
    public DateTime AnsweredAt { get; set; }
    public string ExamTitle { get; set; } = string.Empty;
    public string ExamAttemptId { get; set; } = string.Empty;
    public string? OverallRationale { get; set; }
}

public class PaginatedQuestionReviewDto
{
    public List<LearnerQuestionReviewDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}

public class AttemptComparisonDetailDto
{
    public string AttemptId { get; set; } = string.Empty;
    public string ExamTitle { get; set; } = string.Empty;
    public string ExamType { get; set; } = string.Empty;
    public DateTime CompletedAt { get; set; }
    public decimal ScorePercent { get; set; }
    public decimal AccuracyPercent { get; set; }
    public int TotalQuestions { get; set; }
    public int CorrectCount { get; set; }
    public int DurationMinutes { get; set; }
    public string ReadinessTier { get; set; } = string.Empty;
    public Dictionary<string, decimal> CategoryAccuracies { get; set; } = new();
}

public class CategoryComparisonDeltaDto
{
    public string CategoryCode { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public decimal Attempt1Accuracy { get; set; }
    public decimal Attempt2Accuracy { get; set; }
    public decimal DeltaAccuracy { get; set; }
}

public class AttemptComparisonResponseDto
{
    public AttemptComparisonDetailDto Attempt1 { get; set; } = new();
    public AttemptComparisonDetailDto Attempt2 { get; set; } = new();
    public decimal ScoreDelta { get; set; }
    public decimal AccuracyDelta { get; set; }
    public int DurationDeltaMinutes { get; set; }
    public string ProgressSummary { get; set; } = string.Empty;
    public List<CategoryComparisonDeltaDto> CategoryDeltas { get; set; } = new();
}

public class LearnerRecommendationDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Pathway { get; set; } = "both";
    public string Category { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Evidence { get; set; } = string.Empty;
    public string SuggestedAction { get; set; } = string.Empty;
    public string ActionHref { get; set; } = "/dashboard";
    public string? TargetClientNeedCode { get; set; }
    public string? TargetQuestionTypeKey { get; set; }
    public string Status { get; set; } = "New"; // "New", "InProgress", "Completed", "Dismissed"
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? DismissedAt { get; set; }
}

public class UpdateRecommendationStatusRequest
{
    public string Status { get; set; } = string.Empty; // "InProgress", "Completed", "Dismissed"
}

public class LearnerInterventionDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string? RecommendationId { get; set; }
    public string Pathway { get; set; } = "both";
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? TargetClientNeedCode { get; set; }
    public string? TargetQuestionTypeKey { get; set; }
    public decimal BaselineAccuracyPercent { get; set; }
    public int BaselineQuestionsAnswered { get; set; }
    public decimal PostInterventionAccuracyPercent { get; set; }
    public int PostInterventionQuestionsAnswered { get; set; }
    public decimal AccuracyDeltaPercent => PostInterventionQuestionsAnswered > 0 
        ? Math.Round(PostInterventionAccuracyPercent - BaselineAccuracyPercent, 1) 
        : 0m;
    public int ActivityCount { get; set; }
    public string Status { get; set; } = "Active";
    public DateTime StartedAt { get; set; }
    public DateTime? LastEvaluatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class StartInterventionRequest
{
    public string? RecommendationId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Pathway { get; set; } = "both";
    public string Category { get; set; } = "TargetedPractice";
    public string? TargetClientNeedCode { get; set; }
    public string? TargetQuestionTypeKey { get; set; }
}

public class LearnerPerformanceReportDto
{
    public string ReportId { get; set; } = Guid.NewGuid().ToString();
    public string LearnerId { get; set; } = string.Empty;
    public string LearnerDisplayName { get; set; } = string.Empty;
    public string LearnerEmail { get; set; } = string.Empty;
    public string Pathway { get; set; } = "rn";
    public string PathwayTitle { get; set; } = "NCLEX-RN";
    public string ReportingPeriod { get; set; } = "All Time";
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public LearnerPerformanceOverviewDto ExecutiveSummary { get; set; } = new();
    public List<CategoryPerformanceIntelligenceDto> ClientNeedsMastery { get; set; } = new();
    public QuestionIntelligenceSummaryDto QuestionIntelligence { get; set; } = new();
    public ReadinessTrendDto ReadinessDevelopment { get; set; } = new();
    public List<LearnerRecommendationDto> Recommendations { get; set; } = new();
    public List<LearnerInterventionDto> Interventions { get; set; } = new();
    public string MethodologyDisclaimer { get; set; } = string.Empty;
}

#endregion
