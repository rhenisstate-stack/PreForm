using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services.Analytics;

public class LearnerAnalyticsService : ILearnerAnalyticsService
{
    private readonly AppDbContext _context;

    public LearnerAnalyticsService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<LearnerAnalyticsSummaryDto> GetSummaryAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return new LearnerAnalyticsSummaryDto();
        }

        var completedAttemptsQuery = _context.ExamAttempts
            .Where(ea => ea.UserId == userId && ea.Status == AttemptStatus.Completed);

        var totalCompleted = await completedAttemptsQuery.CountAsync(ct);
        if (totalCompleted == 0)
        {
            var totalPracticeQuestionsOnly = await _context.AttemptResponses
                .Where(r => r.ExamAttempt.UserId == userId)
                .CountAsync(ct);

            return new LearnerAnalyticsSummaryDto
            {
                TotalCompletedAttempts = 0,
                TotalPracticeQuestions = totalPracticeQuestionsOnly,
                AverageScorePercent = 0.0m,
                OverallPassRate = 0.0m,
                TotalDurationMinutes = 0,
                LastAssessmentDate = null,
                CurrentReadinessTier = "Unassessed"
            };
        }

        var avgScore = Math.Round(await completedAttemptsQuery.AverageAsync(a => a.ScorePercent, ct), 2);
        var passedCount = await completedAttemptsQuery.CountAsync(a => a.Passed, ct);
        var passRate = Math.Round((decimal)passedCount / totalCompleted * 100m, 1);

        var attemptsWithDates = await completedAttemptsQuery
            .Select(a => new { a.StartedAt, a.CompletedAt, a.ScorePercent })
            .OrderByDescending(a => a.CompletedAt)
            .ToListAsync(ct);

        var totalMinutes = attemptsWithDates
            .Where(a => a.CompletedAt.HasValue)
            .Sum(a => (int)Math.Max(1, (a.CompletedAt!.Value - a.StartedAt).TotalMinutes));

        var lastDate = attemptsWithDates.FirstOrDefault()?.CompletedAt;

        var totalQuestions = await _context.AttemptResponses
            .Where(r => r.ExamAttempt.UserId == userId)
            .CountAsync(ct);

        // Determine current readiness tier from latest completed attempt
        var latestScore = attemptsWithDates.FirstOrDefault()?.ScorePercent ?? 0m;
        var readinessTier = ClassifyReadinessTier(latestScore);

        return new LearnerAnalyticsSummaryDto
        {
            TotalCompletedAttempts = totalCompleted,
            TotalPracticeQuestions = totalQuestions,
            AverageScorePercent = avgScore,
            OverallPassRate = passRate,
            TotalDurationMinutes = totalMinutes,
            LastAssessmentDate = lastDate,
            CurrentReadinessTier = readinessTier
        };
    }

    public async Task<IReadOnlyList<ClientNeedMasteryDto>> GetClientNeedsMasteryAsync(string userId, CancellationToken ct = default)
    {
        var result = new List<ClientNeedMasteryDto>();
        if (string.IsNullOrWhiteSpace(userId))
        {
            return result;
        }

        // Canonical 8 Client Needs
        var canonicalCategories = new[]
        {
            ClientNeedCategory.MOC,
            ClientNeedCategory.SIC,
            ClientNeedCategory.HPM,
            ClientNeedCategory.PSI,
            ClientNeedCategory.BCC,
            ClientNeedCategory.PHA,
            ClientNeedCategory.RRP,
            ClientNeedCategory.PPT,
        };

        // Fetch candidate graded responses from completed attempts
        var responses = await _context.AttemptResponses
            .Where(r => r.ExamAttempt.UserId == userId &&
                        r.ExamAttempt.Status == AttemptStatus.Completed &&
                        r.GradingState == ResponseGradingState.Graded)
            .Select(r => new
            {
                r.IsCorrect,
                ClientNeedCode = r.Question.ClientNeed != null ? r.Question.ClientNeed.Code : null
            })
            .ToListAsync(ct);

        foreach (var code in canonicalCategories)
        {
            var categoryResponses = responses
                .Where(r => !string.IsNullOrEmpty(r.ClientNeedCode) &&
                            string.Equals(r.ClientNeedCode, code, StringComparison.OrdinalIgnoreCase))
                .ToList();

            var total = categoryResponses.Count;
            var correct = categoryResponses.Count(r => r.IsCorrect);
            var accuracy = total > 0 ? Math.Round((decimal)correct / total * 100m, 1) : 0m;
            var isLowSample = total > 0 && total < 5;

            var tier = total == 0 ? "Unassessed" : ClassifyReadinessTier(accuracy);

            result.Add(new ClientNeedMasteryDto
            {
                CategoryCode = code,
                CategoryName = ClientNeedCategory.GetDisplayName(code),
                TotalAssessedQuestions = total,
                CorrectCount = correct,
                AccuracyPercent = accuracy,
                IsLowSample = isLowSample,
                PerformanceTier = tier
            });
        }

        return result;
    }

    public async Task<IReadOnlyList<TopicMasteryDto>> GetTopicMasteryAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Array.Empty<TopicMasteryDto>();
        }

        var responses = await _context.AttemptResponses
            .Where(r => r.ExamAttempt.UserId == userId &&
                        r.ExamAttempt.Status == AttemptStatus.Completed &&
                        r.GradingState == ResponseGradingState.Graded &&
                        r.Question.TopicId != null)
            .Select(r => new
            {
                r.IsCorrect,
                TopicId = r.Question.TopicId!,
                TopicTitle = r.Question.Topic != null ? r.Question.Topic.Title : "Unknown Topic",
                CategoryName = r.Question.Topic != null && r.Question.Topic.Subcategory != null && r.Question.Topic.Subcategory.Category != null
                    ? r.Question.Topic.Subcategory.Category.Name : "General",
                DomainName = r.Question.Topic != null && r.Question.Topic.Subcategory != null && r.Question.Topic.Subcategory.Category != null && r.Question.Topic.Subcategory.Category.SubjectDomain != null
                    ? r.Question.Topic.Subcategory.Category.SubjectDomain.Title : "Core"
            })
            .ToListAsync(ct);

        var grouped = responses
            .GroupBy(r => new { r.TopicId, r.TopicTitle, r.CategoryName, r.DomainName })
            .Select(g =>
            {
                var total = g.Count();
                var correct = g.Count(x => x.IsCorrect);
                var accuracy = Math.Round((decimal)correct / total * 100m, 1);
                var isDeficiency = total >= 3 && accuracy < 65.0m;

                return new TopicMasteryDto
                {
                    TopicId = g.Key.TopicId,
                    TopicName = g.Key.TopicTitle,
                    CategoryName = g.Key.CategoryName,
                    DomainName = g.Key.DomainName,
                    TotalQuestions = total,
                    CorrectCount = correct,
                    AccuracyPercent = accuracy,
                    IsDeficiencyArea = isDeficiency
                };
            })
            .OrderBy(t => t.AccuracyPercent)
            .ThenByDescending(t => t.TotalQuestions)
            .Take(10)
            .ToList();

        return grouped;
    }

    public async Task<ReadinessTrendDto> GetReadinessTrendAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return new ReadinessTrendDto();
        }

        var diagnosticAttempts = await _context.ExamAttempts
            .Include(ea => ea.Exam)
            .Include(ea => ea.Responses)
            .Where(ea => ea.UserId == userId &&
                        ea.Status == AttemptStatus.Completed &&
                        ea.Exam.ExamType == ExamType.DiagnosticReadiness)
            .OrderBy(ea => ea.CompletedAt)
            .ToListAsync(ct);

        // If no DiagnosticReadiness attempts exist, include completed CAT or Practice attempts for historical insight
        var attemptsToUse = diagnosticAttempts.Count > 0
            ? diagnosticAttempts
            : await _context.ExamAttempts
                .Include(ea => ea.Exam)
                .Include(ea => ea.Responses)
                .Where(ea => ea.UserId == userId && ea.Status == AttemptStatus.Completed)
                .OrderBy(ea => ea.CompletedAt)
                .ToListAsync(ct);

        var items = attemptsToUse.Select(a =>
        {
            var duration = a.CompletedAt.HasValue
                ? (int)Math.Max(1, (a.CompletedAt.Value - a.StartedAt).TotalMinutes)
                : 0;

            return new ReadinessAttemptItemDto
            {
                AttemptId = a.Id,
                ExamTitle = a.Exam?.Title ?? "Assessment Simulation",
                ScorePercent = a.ScorePercent,
                ReadinessTier = ClassifyReadinessTier(a.ScorePercent),
                CompletedAt = a.CompletedAt ?? a.StartedAt,
                TotalQuestions = a.Responses.Count,
                DurationMinutes = duration
            };
        }).ToList();

        var latest = items.LastOrDefault();

        return new ReadinessTrendDto
        {
            LatestTier = latest?.ReadinessTier ?? "Unassessed",
            LatestScorePercent = latest?.ScorePercent,
            TotalDiagnosticAttempts = items.Count,
            Attempts = items
        };
    }

    public async Task<IReadOnlyList<StudyRecommendationDto>> GetRecommendationsAsync(string userId, CancellationToken ct = default)
    {
        var recommendations = new List<StudyRecommendationDto>();
        if (string.IsNullOrWhiteSpace(userId))
        {
            return recommendations;
        }

        var mastery = await GetClientNeedsMasteryAsync(userId, ct);
        var assessed = mastery.Where(m => m.TotalAssessedQuestions >= 3).OrderBy(m => m.AccuracyPercent).ToList();
        var unassessed = mastery.Where(m => m.TotalAssessedQuestions == 0).ToList();

        // 1. High priority remediation for lowest-performing assessed domain below 65%
        var weakDomain = assessed.FirstOrDefault(m => m.AccuracyPercent < 65.0m);
        if (weakDomain != null)
        {
            recommendations.Add(new StudyRecommendationDto
            {
                Id = $"rec-remed-{weakDomain.CategoryCode.ToLowerInvariant()}",
                Title = $"Targeted Remediation: {weakDomain.CategoryName}",
                Description = $"Your observed accuracy in {weakDomain.CategoryName} is {weakDomain.AccuracyPercent}% across {weakDomain.TotalAssessedQuestions} questions. Targeted review in this high-frequency Client Need category is strongly recommended.",
                Category = "Remediation",
                Priority = "High",
                TargetClientNeedCode = weakDomain.CategoryCode,
                ActionHref = $"/dashboard?clientNeed={weakDomain.CategoryCode}"
            });
        }

        // 2. Medium priority practice for unassessed domain
        var firstUnassessed = unassessed.FirstOrDefault();
        if (firstUnassessed != null)
        {
            recommendations.Add(new StudyRecommendationDto
            {
                Id = $"rec-unassessed-{firstUnassessed.CategoryCode.ToLowerInvariant()}",
                Title = $"Establish Baseline: {firstUnassessed.CategoryName}",
                Description = $"You have not yet completed questions in {firstUnassessed.CategoryName}. Practicing this topic helps ensure balanced test-plan readiness.",
                Category = "Practice",
                Priority = "Medium",
                TargetClientNeedCode = firstUnassessed.CategoryCode,
                ActionHref = $"/dashboard?clientNeed={firstUnassessed.CategoryCode}"
            });
        }

        // 3. Full-length mock simulation recommendation if foundation is solid
        var summary = await GetSummaryAsync(userId, ct);
        if (summary.TotalCompletedAttempts >= 2 && summary.AverageScorePercent >= 65.0m)
        {
            recommendations.Add(new StudyRecommendationDto
            {
                Id = "rec-sim-mock",
                Title = "Full-Length Readiness Simulation",
                Description = "Your current assessment trajectory demonstrates consistent performance above the benchmark threshold. Take a full-length simulation to evaluate stamina under test conditions.",
                Category = "Simulation",
                Priority = summary.AverageScorePercent >= 75.0m ? "High" : "Medium",
                TargetClientNeedCode = null,
                ActionHref = "/dashboard"
            });
        }
        else if (summary.TotalCompletedAttempts == 0)
        {
            recommendations.Add(new StudyRecommendationDto
            {
                Id = "rec-start-diagnostic",
                Title = "Initial Diagnostic Assessment",
                Description = "Begin your preparation with an initial Practice CAT or Diagnostic assessment to identify baseline strengths and improvement areas.",
                Category = "Practice",
                Priority = "High",
                TargetClientNeedCode = null,
                ActionHref = "/dashboard"
            });
        }

        return recommendations;
    }

    private static string ClassifyReadinessTier(decimal score)
    {
        if (score >= 75.0m) return "Very High";
        if (score >= 65.0m) return "High";
        if (score >= 55.0m) return "Borderline";
        return "Low";
    }
}
