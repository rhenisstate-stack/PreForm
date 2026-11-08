using System;
using System.Collections.Generic;

namespace Preform.Api.DTOs;

#region Query Filters

public class SystemAnalyticsFilterDto
{
    public string TimeRange { get; set; } = "30d"; // "today", "7d", "30d", "90d", "1y", "all", "custom"
    public string? Pathway { get; set; } // "rn", "pn", "both", "all"
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Limit { get; set; } = 20;
}

#endregion

#region Admin System Overview DTOs

public class AdminSystemKpisDto
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int NewRegistrations { get; set; }
    public int TotalRnLearners { get; set; }
    public int TotalPnLearners { get; set; }
    public int TotalExaminations { get; set; }
    public int ExaminationAttempts { get; set; }
    public int CompletedExaminations { get; set; }
    public int TotalQuestions { get; set; }
    public int PublishedStudyResources { get; set; }
    public int ActiveSubscriptions { get; set; }
    public decimal NetSubscriptionRevenue { get; set; }
    public decimal GrossCollectedRevenue { get; set; }
    public decimal TotalRefunds { get; set; }
    public int PendingOperationalTasks { get; set; }
}

public class AdminOverviewDeltasDto
{
    public decimal? UserGrowthPercent { get; set; }
    public decimal? AttemptsGrowthPercent { get; set; }
    public decimal? RevenueGrowthPercent { get; set; }
    public string PeriodLabel { get; set; } = "vs previous period";
}

public class AdminSystemOverviewDto
{
    public AdminSystemKpisDto Kpis { get; set; } = new();
    public AdminOverviewDeltasDto Deltas { get; set; } = new();
    public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;
}

#endregion

#region Admin User Analytics DTOs

public class UserRegistrationTrendPointDto
{
    public string Date { get; set; } = string.Empty; // "yyyy-MM-dd"
    public string Label { get; set; } = string.Empty; // "Nov 01"
    public int NewUsers { get; set; }
    public int RnLearners { get; set; }
    public int PnLearners { get; set; }
    public int CumulativeTotal { get; set; }
}

public class PathwayDistributionDto
{
    public int RnCount { get; set; }
    public int PnCount { get; set; }
    public int BothCount { get; set; }
    public decimal RnPercent { get; set; }
    public decimal PnPercent { get; set; }
}

public class UserEngagementMetricsDto
{
    public int DailyActiveUsers { get; set; }
    public int WeeklyActiveUsers { get; set; }
    public int MonthlyActiveUsers { get; set; }
    public decimal EngagementRatePercent { get; set; }
}

public class AccountStatusDistributionDto
{
    public int Active { get; set; }
    public int Suspended { get; set; }
    public int Deactivated { get; set; }
}

public class AdminUserAnalyticsDto
{
    public List<UserRegistrationTrendPointDto> RegistrationTrends { get; set; } = new();
    public PathwayDistributionDto PathwayDistribution { get; set; } = new();
    public UserEngagementMetricsDto EngagementMetrics { get; set; } = new();
    public AccountStatusDistributionDto AccountStatusDistribution { get; set; } = new();
}

#endregion

#region Admin Examination Analytics DTOs

public class ExaminationLifecycleBreakdownDto
{
    public int Draft { get; set; }
    public int InReview { get; set; }
    public int Approved { get; set; }
    public int Published { get; set; }
    public int Archived { get; set; }
    public int Total { get; set; }
}

public class ExamAttemptsTimelinePointDto
{
    public string Date { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int StartedAttempts { get; set; }
    public int CompletedAttempts { get; set; }
    public int AbandonedAttempts { get; set; }
}

public class ExamPerformanceBenchmarksDto
{
    public int TotalAttempts { get; set; }
    public int CompletedAttempts { get; set; }
    public int AbandonedAttempts { get; set; }
    public decimal CompletionRatePercent { get; set; }
    public decimal AbandonmentRatePercent { get; set; }
    public decimal AverageScorePercent { get; set; }
    public int AverageDurationMinutes { get; set; }
}

public class ExamPathwayComparisonDto
{
    public int RnAttempts { get; set; }
    public int PnAttempts { get; set; }
    public decimal RnCompletedRate { get; set; }
    public decimal PnCompletedRate { get; set; }
}

public class TopUtilizedExamDto
{
    public string ExamId { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public int AttemptCount { get; set; }
    public decimal CompletionRate { get; set; }
    public decimal AvgScore { get; set; }
}

public class AdminExaminationAnalyticsDto
{
    public ExaminationLifecycleBreakdownDto LifecycleBreakdown { get; set; } = new();
    public List<ExamAttemptsTimelinePointDto> AttemptsTimeline { get; set; } = new();
    public ExamPerformanceBenchmarksDto PerformanceBenchmarks { get; set; } = new();
    public ExamPathwayComparisonDto PathwayComparison { get; set; } = new();
    public List<TopUtilizedExamDto> TopUtilizedExams { get; set; } = new();
}

#endregion

#region Admin Academic & Content Analytics DTOs

public class TaxonomyCountsDto
{
    public int Programmes { get; set; }
    public int Courses { get; set; }
    public int SubjectDomains { get; set; }
    public int Topics { get; set; }
    public int ClientNeeds { get; set; }
}

public class QuestionBankGrowthPointDto
{
    public string Date { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int QuestionsAdded { get; set; }
    public int CumulativeTotal { get; set; }
}

public class QuestionTypeDistributionItemDto
{
    public string TypeKey { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Percentage { get; set; }
}

public class QuestionStatusBreakdownDto
{
    public int Draft { get; set; }
    public int InReview { get; set; }
    public int Published { get; set; }
    public int Archived { get; set; }
    public int Total { get; set; }
}

public class StudyGuidesSummaryDto
{
    public int TotalGuides { get; set; }
    public int PublishedGuides { get; set; }
    public int DraftGuides { get; set; }
    public int FlashcardDecks { get; set; }
    public int TotalFlashcards { get; set; }
}

public class AdminAcademicAnalyticsDto
{
    public TaxonomyCountsDto TaxonomyCounts { get; set; } = new();
    public List<QuestionBankGrowthPointDto> QuestionBankGrowth { get; set; } = new();
    public List<QuestionTypeDistributionItemDto> QuestionTypeDistribution { get; set; } = new();
    public QuestionStatusBreakdownDto QuestionStatusBreakdown { get; set; } = new();
    public StudyGuidesSummaryDto StudyGuidesSummary { get; set; } = new();
}

#endregion

#region Admin Monetization Analytics DTOs

public class MonetizationSummaryDto
{
    public decimal GrossCollected { get; set; }
    public decimal TotalRefunds { get; set; }
    public decimal NetRevenue { get; set; }
    public decimal CurrentMonthRevenue { get; set; }
    public decimal PreviousMonthRevenue { get; set; }
    public decimal PendingOfflineAmount { get; set; }
    public string Currency { get; set; } = "USD";
}

public class RevenueTimelinePointDto
{
    public string Date { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public decimal GrossSales { get; set; }
    public decimal Refunds { get; set; }
    public decimal NetRevenue { get; set; }
}

public class SubscriptionStatusDistributionDto
{
    public int Active { get; set; }
    public int Expired { get; set; }
    public int Cancelled { get; set; }
    public int Suspended { get; set; }
    public int Total { get; set; }
}

public class PlanDistributionItemDto
{
    public string PlanId { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public int ActiveSubscribers { get; set; }
    public decimal RevenueCollected { get; set; }
    public decimal Percentage { get; set; }
}

public class TransactionStatusBreakdownDto
{
    public int Successful { get; set; }
    public int Pending { get; set; }
    public int Failed { get; set; }
    public int Refunded { get; set; }
}

public class AdminMonetizationAnalyticsDto
{
    public MonetizationSummaryDto Summary { get; set; } = new();
    public List<RevenueTimelinePointDto> RevenueTimeline { get; set; } = new();
    public SubscriptionStatusDistributionDto SubscriptionStatusDistribution { get; set; } = new();
    public List<PlanDistributionItemDto> PlanDistribution { get; set; } = new();
    public TransactionStatusBreakdownDto TransactionStatusBreakdown { get; set; } = new();
}

#endregion

#region Admin Platform Activity DTOs

public class ActivityCategoryVolumeDto
{
    public string Category { get; set; } = string.Empty; // "Users", "Examinations", "Questions", "Monetization", "Security", "System"
    public int Count { get; set; }
    public decimal Percentage { get; set; }
}

public class ActivityTrendPointDto
{
    public string Date { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int TotalEvents { get; set; }
}

public class ActivityTimelineItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string ActorName { get; set; } = string.Empty;
    public string ActorEmailPreview { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string Severity { get; set; } = "Information";
    public string TargetEntitySummary { get; set; } = string.Empty;
    public string? ModuleLink { get; set; }
}

public class AdminPlatformActivityDto
{
    public List<ActivityCategoryVolumeDto> VolumeByCategory { get; set; } = new();
    public List<ActivityTrendPointDto> ActivityTrend { get; set; } = new();
    public List<ActivityTimelineItemDto> RecentTimeline { get; set; } = new();
}

#endregion

#region Role-Specific Overviews DTOs

public class ExamManagerOverviewDto
{
    public ExaminationLifecycleBreakdownDto Pipeline { get; set; } = new();
    public int PendingReviewRevisions { get; set; }
    public int TotalExaminationAttempts { get; set; }
    public decimal OverallCompletionRate { get; set; }
    public decimal AverageScorePercent { get; set; }
    public ExamPathwayComparisonDto PathwayComparison { get; set; } = new();
    public List<TopUtilizedExamDto> ActiveExaminations { get; set; } = new();
}

public class ContentManagerOverviewDto
{
    public int TotalQuestionsInBank { get; set; }
    public int PublishedQuestions { get; set; }
    public int DraftQuestions { get; set; }
    public int InReviewQuestions { get; set; }
    public int TotalStudyGuides { get; set; }
    public int PublishedStudyGuides { get; set; }
    public List<QuestionTypeDistributionItemDto> QuestionTypeBreakdown { get; set; } = new();
    public List<QuestionBankGrowthPointDto> RecentProductionVelocity { get; set; } = new();
}

public class ReviewerWorkloadItemDto
{
    public string Id { get; set; } = string.Empty;
    public string ItemType { get; set; } = "Question"; // "Question" | "Examination"
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string SubmitterName { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public string Priority { get; set; } = "Normal";
}

public class ReviewerOverviewDto
{
    public int AssignedPendingReviews { get; set; }
    public int CompletedReviewsThisMonth { get; set; }
    public decimal ApprovalRatePercent { get; set; }
    public decimal RejectionRatePercent { get; set; }
    public double AverageTurnaroundHours { get; set; }
    public List<ReviewerWorkloadItemDto> PriorityReviewQueue { get; set; } = new();
}

public class AtRiskLearnerDto
{
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public decimal AverageScorePercent { get; set; }
    public int CompletedAttempts { get; set; }
    public DateTime? LastActiveDate { get; set; }
    public string RiskReason { get; set; } = "Low Assessment Average";
}

public class InstructorOverviewDto
{
    public int TotalLearnersInScope { get; set; }
    public int ActiveLearnersInScope { get; set; }
    public decimal CohortAverageScorePercent { get; set; }
    public decimal CohortPassRatePercent { get; set; }
    public List<ScoreDistributionBucketDto> CohortScoreDistribution { get; set; } = new();
    public List<ClientNeedMasteryDto> CohortClientNeedsAverages { get; set; } = new();
    public List<AtRiskLearnerDto> LearnersNeedingAttention { get; set; } = new();
}

#endregion

#region Learner Pathway Consolidated Overview DTOs

public class LearnerKpisDto
{
    public int TotalAssessmentsCompleted { get; set; }
    public decimal OverallAccuracyPercent { get; set; }
    public int StudyStreakDays { get; set; }
    public int StudyTimeMinutes { get; set; }
    public int MasteredClientNeedsCount { get; set; }
    public int DevelopingClientNeedsCount { get; set; }
    public int NeedsImprovementCount { get; set; }
    public string CurrentReadinessTier { get; set; } = "Unassessed";
}

public class LearnerTrajectoryPointDto
{
    public string Date { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public decimal ScorePercent { get; set; }
    public decimal CumulativeAccuracy { get; set; }
    public string AssessmentTitle { get; set; } = string.Empty;
    public string AttemptId { get; set; } = string.Empty;
}

public class LearnerDomainMasteryItemDto
{
    public string CategoryCode { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public decimal AccuracyPercent { get; set; }
    public int TotalAssessedQuestions { get; set; }
    public int CorrectCount { get; set; }
    public string Status { get; set; } = "Unassessed"; // "Mastered", "Developing", "NeedsImprovement", "Unassessed"
}

public class DailyStudyActivityDto
{
    public string Date { get; set; } = string.Empty; // "yyyy-MM-dd"
    public int MinutesStudied { get; set; }
    public int QuestionsAnswered { get; set; }
    public bool HasActivity { get; set; }
}

public class LearnerStudyConsistencyDto
{
    public int StreakDays { get; set; }
    public int ActiveDaysPastTwoWeeks { get; set; }
    public List<DailyStudyActivityDto> DailyActivity { get; set; } = new();
}

public class LearnerDashboardOverviewDto
{
    public string Pathway { get; set; } = "rn"; // "rn" or "pn"
    public LearnerKpisDto Kpis { get; set; } = new();
    public List<LearnerTrajectoryPointDto> ScoreTrajectory { get; set; } = new();
    public List<LearnerDomainMasteryItemDto> DomainMastery { get; set; } = new();
    public LearnerStudyConsistencyDto StudyConsistency { get; set; } = new();
    public List<LearnerRecommendationDto> Recommendations { get; set; } = new();
}

#endregion
