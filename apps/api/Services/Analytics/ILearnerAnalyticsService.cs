using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Preform.Api.DTOs;

namespace Preform.Api.Services.Analytics;

public interface ILearnerAnalyticsService
{
    // Legacy / Phase 5 backward compatibility
    Task<LearnerAnalyticsSummaryDto> GetSummaryAsync(string userId, CancellationToken ct = default);
    Task<IReadOnlyList<ClientNeedMasteryDto>> GetClientNeedsMasteryAsync(string userId, CancellationToken ct = default);
    Task<IReadOnlyList<TopicMasteryDto>> GetTopicMasteryAsync(string userId, CancellationToken ct = default);
    Task<ReadinessTrendDto> GetReadinessTrendAsync(string userId, CancellationToken ct = default);
    Task<IReadOnlyList<StudyRecommendationDto>> GetRecommendationsAsync(string userId, CancellationToken ct = default);

    // Performance Intelligence (Enterprise scope)
    Task<LearnerPerformanceOverviewDto> GetOverviewAsync(string userId, AnalyticsFilterDto filter, CancellationToken ct = default);
    Task<PerformanceTrendSeriesDto> GetPerformanceTrendsAsync(string userId, AnalyticsFilterDto filter, CancellationToken ct = default);
    Task<LearnerScoreDistributionDto> GetPerformanceDistributionAsync(string userId, AnalyticsFilterDto filter, CancellationToken ct = default);
    Task<IReadOnlyList<CategoryPerformanceIntelligenceDto>> GetCategoryIntelligenceAsync(string userId, AnalyticsFilterDto filter, CancellationToken ct = default);
    Task<QuestionIntelligenceSummaryDto> GetQuestionIntelligenceAsync(string userId, AnalyticsFilterDto filter, CancellationToken ct = default);
    Task<PaginatedQuestionReviewDto> GetQuestionReviewHistoryAsync(string userId, QuestionReviewFilterDto filter, CancellationToken ct = default);
    Task<AttemptComparisonResponseDto> GetAttemptComparisonAsync(string userId, string? attemptId1, string? attemptId2, CancellationToken ct = default);
    Task<IReadOnlyList<LearnerRecommendationDto>> GetLearnerRecommendationsAsync(string userId, string? pathway = null, CancellationToken ct = default);
    Task<LearnerRecommendationDto?> UpdateRecommendationStatusAsync(string userId, string recommendationId, UpdateRecommendationStatusRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<LearnerInterventionDto>> GetInterventionsAsync(string userId, CancellationToken ct = default);
    Task<LearnerInterventionDto> StartInterventionAsync(string userId, StartInterventionRequest request, CancellationToken ct = default);
}
