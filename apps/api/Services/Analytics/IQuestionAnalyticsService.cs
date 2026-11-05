using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Preform.Api.DTOs;

namespace Preform.Api.Services.Analytics;

public class QuestionPerformanceFilter
{
    public string? Pathway { get; set; }
    public string? QuestionTypeKey { get; set; }
    public string? Difficulty { get; set; }
    public string? ClientNeedCode { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class PagedQuestionPerformanceResult
{
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public List<QuestionPerformanceDto> Items { get; set; } = new();
}

public interface IQuestionAnalyticsService
{
    Task<PagedQuestionPerformanceResult> GetQuestionsPerformanceAsync(QuestionPerformanceFilter filter, CancellationToken ct = default);
    Task<QuestionPerformanceDto?> GetQuestionPerformanceDetailAsync(string questionId, CancellationToken ct = default);
}
