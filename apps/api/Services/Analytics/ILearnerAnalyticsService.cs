using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Preform.Api.DTOs;

namespace Preform.Api.Services.Analytics;

public interface ILearnerAnalyticsService
{
    Task<LearnerAnalyticsSummaryDto> GetSummaryAsync(string userId, CancellationToken ct = default);
    Task<IReadOnlyList<ClientNeedMasteryDto>> GetClientNeedsMasteryAsync(string userId, CancellationToken ct = default);
    Task<IReadOnlyList<TopicMasteryDto>> GetTopicMasteryAsync(string userId, CancellationToken ct = default);
    Task<ReadinessTrendDto> GetReadinessTrendAsync(string userId, CancellationToken ct = default);
    Task<IReadOnlyList<StudyRecommendationDto>> GetRecommendationsAsync(string userId, CancellationToken ct = default);
}
