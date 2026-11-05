using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services.Analytics;

public class QuestionAnalyticsService : IQuestionAnalyticsService
{
    private readonly AppDbContext _context;

    public QuestionAnalyticsService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PagedQuestionPerformanceResult> GetQuestionsPerformanceAsync(QuestionPerformanceFilter filter, CancellationToken ct = default)
    {
        var query = _context.Questions
            .Include(q => q.ClientNeed)
            .Include(q => q.Options)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Pathway) && filter.Pathway != "all")
        {
            query = query.Where(q => q.Pathway == filter.Pathway || q.Pathway == "both");
        }

        if (!string.IsNullOrWhiteSpace(filter.QuestionTypeKey) && filter.QuestionTypeKey != "all")
        {
            query = query.Where(q => q.QuestionTypeKey == filter.QuestionTypeKey);
        }

        if (!string.IsNullOrWhiteSpace(filter.Difficulty) && filter.Difficulty != "all")
        {
            if (Enum.TryParse<QuestionDifficulty>(filter.Difficulty, true, out var diff))
            {
                query = query.Where(q => q.Difficulty == diff);
            }
        }

        if (!string.IsNullOrWhiteSpace(filter.ClientNeedCode) && filter.ClientNeedCode != "all")
        {
            query = query.Where(q => q.ClientNeed != null && q.ClientNeed.Code == filter.ClientNeedCode);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLowerInvariant();
            query = query.Where(q => (q.Code != null && q.Code.ToLower().Contains(search)) ||
                                     q.Stem.ToLower().Contains(search));
        }

        var totalCount = await query.CountAsync(ct);

        var page = Math.Max(1, filter.Page);
        var pageSize = Math.Clamp(filter.PageSize, 1, 100);

        var questions = await query
            .OrderBy(q => q.Code ?? q.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var questionIds = questions.Select(q => q.Id).ToList();

        // Deliveries count
        var deliveryCounts = await _context.ExamAttemptQuestions
            .Where(eaq => questionIds.Contains(eaq.QuestionId))
            .GroupBy(eaq => eaq.QuestionId)
            .Select(g => new { QuestionId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.QuestionId, x => x.Count, ct);

        // Responses count & stats
        var responseStats = await _context.AttemptResponses
            .Where(r => questionIds.Contains(r.QuestionId) && r.ExamAttempt.Status == AttemptStatus.Completed)
            .GroupBy(r => r.QuestionId)
            .Select(g => new
            {
                QuestionId = g.Key,
                TotalResponses = g.Count(),
                CorrectCount = g.Count(x => x.IsCorrect),
                AvgTimeSpent = g.Average(x => (double)x.TimeSpentSeconds)
            })
            .ToDictionaryAsync(x => x.QuestionId, ct);

        var items = questions.Select(q =>
        {
            var delivered = deliveryCounts.TryGetValue(q.Id, out var delCount) ? delCount : 0;
            var answered = responseStats.TryGetValue(q.Id, out var stats) ? stats.TotalResponses : 0;
            var correct = stats != null ? stats.CorrectCount : 0;
            var avgTime = stats != null ? (int)Math.Round(stats.AvgTimeSpent) : 0;
            var correctRate = answered > 0 ? Math.Round((decimal)correct / answered * 100m, 1) : 0m;

            var stemPreview = q.Stem.Length > 100 ? q.Stem.Substring(0, 97) + "..." : q.Stem;

            return new QuestionPerformanceDto
            {
                QuestionId = q.Id,
                Code = q.Code ?? "QN-000",
                StemPreview = stemPreview,
                Pathway = q.Pathway,
                QuestionTypeKey = q.QuestionTypeKey,
                Difficulty = q.Difficulty.ToString(),
                ClientNeedCode = q.ClientNeed?.Code,
                ClientNeedName = q.ClientNeed?.Name,
                TimesDelivered = delivered,
                TimesAnswered = answered,
                CorrectResponseCount = correct,
                CorrectResponseRate = correctRate,
                AverageTimeSpentSeconds = avgTime
            };
        }).ToList();

        return new PagedQuestionPerformanceResult
        {
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            Items = items
        };
    }

    public async Task<QuestionPerformanceDto?> GetQuestionPerformanceDetailAsync(string questionId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(questionId)) return null;

        var question = await _context.Questions
            .Include(q => q.ClientNeed)
            .Include(q => q.Options)
            .FirstOrDefaultAsync(q => q.Id == questionId, ct);

        if (question == null) return null;

        var delivered = await _context.ExamAttemptQuestions
            .CountAsync(eaq => eaq.QuestionId == questionId, ct);

        var responses = await _context.AttemptResponses
            .Where(r => r.QuestionId == questionId && r.ExamAttempt.Status == AttemptStatus.Completed)
            .Select(r => new { r.IsCorrect, r.TimeSpentSeconds, r.SelectedOptionsJson })
            .ToListAsync(ct);

        var answered = responses.Count;
        var correct = responses.Count(r => r.IsCorrect);
        var correctRate = answered > 0 ? Math.Round((decimal)correct / answered * 100m, 1) : 0m;
        var avgTime = answered > 0 ? (int)Math.Round(responses.Average(r => (double)r.TimeSpentSeconds)) : 0;

        // Distractor analysis: tally selections per option key
        var optionTallies = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var opt in question.Options)
        {
            optionTallies[opt.OptionKey] = 0;
        }

        foreach (var resp in responses)
        {
            try
            {
                var selected = JsonSerializer.Deserialize<List<string>>(resp.SelectedOptionsJson);
                if (selected != null)
                {
                    foreach (var key in selected)
                    {
                        if (optionTallies.ContainsKey(key))
                        {
                            optionTallies[key]++;
                        }
                    }
                }
            }
            catch
            {
                // Fallback for non-JSON or legacy formatted option key
                if (optionTallies.ContainsKey(resp.SelectedOptionsJson))
                {
                    optionTallies[resp.SelectedOptionsJson]++;
                }
            }
        }

        var distractors = question.Options
            .OrderBy(o => o.DisplayOrder)
            .Select(o =>
            {
                var count = optionTallies.TryGetValue(o.OptionKey, out var c) ? c : 0;
                var rate = answered > 0 ? Math.Round((decimal)count / answered * 100m, 1) : 0m;
                var contentPreview = o.Content.Length > 60 ? o.Content.Substring(0, 57) + "..." : o.Content;

                return new DistractorSelectionDto
                {
                    OptionKey = o.OptionKey,
                    ContentPreview = contentPreview,
                    IsCorrect = o.IsCorrect,
                    SelectionCount = count,
                    SelectionRate = rate
                };
            }).ToList();

        return new QuestionPerformanceDto
        {
            QuestionId = question.Id,
            Code = question.Code ?? "QN-000",
            StemPreview = question.Stem,
            Pathway = question.Pathway,
            QuestionTypeKey = question.QuestionTypeKey,
            Difficulty = question.Difficulty.ToString(),
            ClientNeedCode = question.ClientNeed?.Code,
            ClientNeedName = question.ClientNeed?.Name,
            TimesDelivered = delivered,
            TimesAnswered = answered,
            CorrectResponseCount = correct,
            CorrectResponseRate = correctRate,
            AverageTimeSpentSeconds = avgTime,
            DistractorAnalysis = distractors
        };
    }
}
