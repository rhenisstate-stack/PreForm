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

public class LearnerAnalyticsService : ILearnerAnalyticsService
{
    private readonly AppDbContext _context;

    public LearnerAnalyticsService(AppDbContext context)
    {
        _context = context;
    }

    #region Legacy Phase 5 Backward Compatibility

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
        if (string.IsNullOrWhiteSpace(userId)) return result;

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
        if (string.IsNullOrWhiteSpace(userId)) return Array.Empty<TopicMasteryDto>();

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
        if (string.IsNullOrWhiteSpace(userId)) return new ReadinessTrendDto();

        var diagnosticAttempts = await _context.ExamAttempts
            .Include(ea => ea.Exam)
            .Include(ea => ea.Responses)
            .Where(ea => ea.UserId == userId &&
                         ea.Status == AttemptStatus.Completed &&
                         ea.Exam.ExamType == ExamType.DiagnosticReadiness)
            .OrderBy(ea => ea.CompletedAt)
            .ToListAsync(ct);

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
        if (string.IsNullOrWhiteSpace(userId)) return recommendations;

        var mastery = await GetClientNeedsMasteryAsync(userId, ct);
        var assessed = mastery.Where(m => m.TotalAssessedQuestions >= 3).OrderBy(m => m.AccuracyPercent).ToList();
        var unassessed = mastery.Where(m => m.TotalAssessedQuestions == 0).ToList();

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

    #endregion

    #region Performance Intelligence Implementation

    public async Task<LearnerPerformanceOverviewDto> GetOverviewAsync(string userId, AnalyticsFilterDto filter, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return new LearnerPerformanceOverviewDto();
        }

        var (startDate, endDate, periodLabel) = ResolveDateRange(filter);

        var attemptsQuery = _context.ExamAttempts
            .Include(ea => ea.Exam)
            .Where(ea => ea.UserId == userId);

        attemptsQuery = ApplyAttemptFilters(attemptsQuery, filter, startDate, endDate);

        var attempts = await attemptsQuery
            .Select(a => new
            {
                a.Id,
                a.Status,
                a.ScorePercent,
                a.Passed,
                a.StartedAt,
                a.CompletedAt,
                ExamType = a.Exam.ExamType,
                Pathway = a.Exam.Pathway
            })
            .OrderBy(a => a.StartedAt)
            .ToListAsync(ct);

        var totalStarted = attempts.Count;
        var completedAttempts = attempts.Where(a => a.Status == AttemptStatus.Completed).ToList();
        var totalCompleted = completedAttempts.Count;
        var abandonedCount = attempts.Count(a => a.Status == AttemptStatus.Abandoned);

        var completionRate = totalStarted > 0
            ? Math.Round((decimal)totalCompleted / totalStarted * 100m, 1)
            : 0m;

        var avgScore = totalCompleted > 0
            ? Math.Round(completedAttempts.Average(a => a.ScorePercent), 1)
            : 0m;

        var completedIds = completedAttempts.Select(a => a.Id).ToHashSet();

        var responsesQuery = _context.AttemptResponses
            .Where(r => r.ExamAttempt.UserId == userId &&
                        completedIds.Contains(r.ExamAttemptId) &&
                        r.GradingState == ResponseGradingState.Graded);

        if (!string.IsNullOrWhiteSpace(filter.Pathway) && filter.Pathway != "both")
        {
            responsesQuery = responsesQuery.Where(r => r.Question.Pathway == filter.Pathway || r.Question.Pathway == "both");
        }

        var responses = await responsesQuery
            .Select(r => new { r.IsCorrect, r.ScoreAwarded, r.TimeSpentSeconds, r.AnsweredAt })
            .ToListAsync(ct);

        var answeredCount = responses.Count;
        var correctCount = responses.Count(r => r.IsCorrect);
        var incorrectCount = answeredCount - correctCount;

        var overallAccuracy = answeredCount > 0
            ? Math.Round((decimal)correctCount / answeredCount * 100m, 1)
            : 0m;

        var totalMinutes = completedAttempts
            .Where(a => a.CompletedAt.HasValue)
            .Sum(a => (int)Math.Max(1, (a.CompletedAt!.Value - a.StartedAt).TotalMinutes));

        var avgMinutes = totalCompleted > 0
            ? (int)Math.Round((double)totalMinutes / totalCompleted)
            : 0;

        // Trend calculation: compare first half vs second half of attempts
        decimal recentTrend = 0m;
        string trendDirection = "Neutral";
        if (completedAttempts.Count >= 2)
        {
            var mid = completedAttempts.Count / 2;
            var firstHalfAvg = completedAttempts.Take(mid).Average(a => a.ScorePercent);
            var secondHalfAvg = completedAttempts.Skip(mid).Average(a => a.ScorePercent);
            recentTrend = Math.Round(secondHalfAvg - firstHalfAvg, 1);
            trendDirection = recentTrend > 2.0m ? "Improving" : (recentTrend < -2.0m ? "Declining" : "Neutral");
        }

        var latestScore = completedAttempts.LastOrDefault()?.ScorePercent ?? 0m;
        var currentReadinessTier = totalCompleted == 0 ? "Unassessed" : ClassifyReadinessTier(latestScore);

        // Client Needs breakdown for strengths and weakness detection
        var categories = await GetCategoryIntelligenceAsync(userId, filter, ct);
        var strengths = categories.Where(c => c.Classification == "Strong").Select(c => c.CategoryName).Take(3).ToList();
        var weak = categories.Where(c => c.Classification == "NeedsAttention").Select(c => c.CategoryName).Take(2).ToList();
        var priorityImprovement = weak.FirstOrDefault() ?? categories.OrderBy(c => c.AccuracyPercent).FirstOrDefault()?.CategoryName;

        return new LearnerPerformanceOverviewDto
        {
            TotalCompletedAssessments = totalCompleted,
            TotalStartedAssessments = totalStarted,
            AbandonedAssessments = abandonedCount,
            CompletionRatePercent = completionRate,
            TotalQuestionsAnswered = answeredCount,
            TotalEligibleQuestions = answeredCount,
            CorrectResponsesCount = correctCount,
            IncorrectResponsesCount = incorrectCount,
            UnansweredCount = 0,
            OverallAccuracyPercent = overallAccuracy,
            AverageScorePercent = avgScore,
            TotalDurationMinutes = totalMinutes,
            AverageDurationMinutes = avgMinutes,
            FirstAssessmentDate = attempts.FirstOrDefault()?.StartedAt,
            LastAssessmentDate = completedAttempts.LastOrDefault()?.CompletedAt,
            CurrentReadinessTier = currentReadinessTier,
            RecentAccuracyTrendPercent = recentTrend,
            TrendDirection = trendDirection,
            PriorityImprovementArea = priorityImprovement,
            KeyStrengths = strengths,
            AreasNeedingAttention = weak,
            CalculationPeriodLabel = periodLabel,
            CalculatedAt = DateTime.UtcNow
        };
    }

    public async Task<PerformanceTrendSeriesDto> GetPerformanceTrendsAsync(string userId, AnalyticsFilterDto filter, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId)) return new PerformanceTrendSeriesDto();

        var (startDate, endDate, _) = ResolveDateRange(filter);

        var query = _context.ExamAttempts
            .Include(ea => ea.Exam)
            .Include(ea => ea.Responses)
            .Where(ea => ea.UserId == userId && ea.Status == AttemptStatus.Completed);

        query = ApplyAttemptFilters(query, filter, startDate, endDate);

        var attempts = await query
            .OrderBy(ea => ea.CompletedAt ?? ea.StartedAt)
            .ToListAsync(ct);

        var points = new List<PerformanceTrendPointDto>();

        foreach (var att in attempts)
        {
            var date = att.CompletedAt ?? att.StartedAt;
            var gradedResponses = att.Responses.Where(r => r.GradingState == ResponseGradingState.Graded).ToList();
            var qCount = gradedResponses.Count;
            var correctCount = gradedResponses.Count(r => r.IsCorrect);
            var accuracy = qCount > 0 ? Math.Round((decimal)correctCount / qCount * 100m, 1) : att.ScorePercent;

            points.Add(new PerformanceTrendPointDto
            {
                Date = date.ToString("yyyy-MM-dd"),
                Label = date.ToString("MMM dd"),
                ScorePercent = att.ScorePercent,
                AccuracyPercent = accuracy,
                AttemptsCompleted = 1,
                QuestionsAnswered = qCount,
                ExamTitle = att.Exam?.Title ?? "Assessment",
                ExamType = att.Exam?.ExamType.ToString() ?? "Practice",
                AttemptId = att.Id
            });
        }

        decimal slope = 0m;
        string trajectory = "Steady";
        if (points.Count >= 2)
        {
            var firstScore = points.First().ScorePercent;
            var lastScore = points.Last().ScorePercent;
            slope = Math.Round(lastScore - firstScore, 1);
            if (slope >= 10m) trajectory = "Accelerating";
            else if (slope > 2m) trajectory = "Improving";
            else if (slope < -5m) trajectory = "Declining";
            else trajectory = "Steady";
        }

        return new PerformanceTrendSeriesDto
        {
            Points = points,
            OverallSlope = slope,
            OverallTrajectory = trajectory,
            TotalEvaluatedAttempts = points.Count
        };
    }

    public async Task<LearnerScoreDistributionDto> GetPerformanceDistributionAsync(string userId, AnalyticsFilterDto filter, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId)) return new LearnerScoreDistributionDto();

        var (startDate, endDate, _) = ResolveDateRange(filter);

        var query = _context.ExamAttempts
            .Where(ea => ea.UserId == userId && ea.Status == AttemptStatus.Completed);

        query = ApplyAttemptFilters(query, filter, startDate, endDate);

        var scores = await query
            .Select(ea => ea.ScorePercent)
            .OrderBy(s => s)
            .ToListAsync(ct);

        var total = scores.Count;
        var bandsDef = new (string Label, decimal Min, decimal Max)[]
        {
            ("90-100%", 90m, 100m),
            ("80-89%", 80m, 89.9m),
            ("70-79%", 70m, 79.9m),
            ("60-69%", 60m, 69.9m),
            ("50-59%", 50m, 59.9m),
            ("<50%", 0m, 49.9m)
        };

        var bandDtos = bandsDef.Select(b =>
        {
            var count = scores.Count(s => s >= b.Min && (b.Max == 100m ? s <= b.Max : s <= b.Max));
            var pct = total > 0 ? Math.Round((decimal)count / total * 100m, 1) : 0m;
            return new ScoreDistributionBandDto
            {
                BandLabel = b.Label,
                MinScore = b.Min,
                MaxScore = b.Max,
                AttemptCount = count,
                Percentage = pct
            };
        }).ToList();

        decimal median = 0m;
        if (total > 0)
        {
            median = total % 2 == 1
                ? scores[total / 2]
                : Math.Round((scores[(total / 2) - 1] + scores[total / 2]) / 2m, 1);
        }

        return new LearnerScoreDistributionDto
        {
            TotalAttempts = total,
            Bands = bandDtos,
            MedianScorePercent = median,
            HighestScorePercent = total > 0 ? scores.Max() : 0m,
            LowestScorePercent = total > 0 ? scores.Min() : 0m
        };
    }

    public async Task<IReadOnlyList<CategoryPerformanceIntelligenceDto>> GetCategoryIntelligenceAsync(string userId, AnalyticsFilterDto filter, CancellationToken ct = default)
    {
        var result = new List<CategoryPerformanceIntelligenceDto>();
        if (string.IsNullOrWhiteSpace(userId)) return result;

        var pathway = filter.Pathway?.ToLowerInvariant() ?? "rn";
        var isPn = pathway == "pn";

        // Authoritative NCSBN taxonomies
        var categories = isPn
            ? new (string Code, string Name, string Rem)[]
            {
                ("MOC", "Coordinated Care", "Review delegation boundaries, client rights, and interprofessional reporting."),
                ("SIC", "Safety and Infection Control", "Review standard precautions, transmission-based isolation, and safe equipment usage."),
                ("HPM", "Health Promotion and Maintenance", "Focus on developmental milestones, screening guidelines, and lifestyle education."),
                ("PSI", "Psychosocial Integrity", "Review therapeutic communication, coping mechanisms, and crisis intervention."),
                ("BCC", "Basic Care and Comfort", "Review non-pharmacological comfort, mobility, hygiene, and nutrition interventions."),
                ("PHA", "Pharmacological Therapies", "Focus on safe medication administration routes, expected dosages, and side-effect reporting."),
                ("RRP", "Reduction of Risk Potential", "Review vital sign deviation protocols, lab value changes, and complications of procedures."),
                ("PPT", "Physiological Adaptation", "Focus on emergency bedside response, acute imbalance signs, and nursing care for chronic conditions.")
            }
            : new (string Code, string Name, string Rem)[]
            {
                ("MOC", "Management of Care", "Strengthen priority setting, delegation scope, informed consent, and legal nursing duties."),
                ("SIC", "Safety and Infection Control", "Review aseptic technique, hazardous materials, and airborne/droplet precaution protocols."),
                ("HPM", "Health Promotion and Maintenance", "Focus on antepartum/postpartum care, immunizations, and disease prevention across lifespans."),
                ("PSI", "Psychosocial Integrity", "Strengthen psychiatric emergencies, substance use disorders, and behavioral support."),
                ("BCC", "Basic Care and Comfort", "Review enteral feeding, skin integrity, assistive mobility, and pain management."),
                ("PHA", "Pharmacological and Parenteral Therapies", "Master IV flow rate calculations, high-alert medication titration, and blood product administration."),
                ("RRP", "Reduction of Risk Potential", "Focus on diagnostic test interpretations, pre/post-op care, and monitoring for systemic deterioration."),
                ("PPT", "Physiological Adaptation", "Master hemodynamic instability, acid-base imbalances, fluid shifts, and acute shock management.")
            };

        var (startDate, endDate, _) = ResolveDateRange(filter);

        var query = _context.AttemptResponses
            .Include(r => r.Question)
                .ThenInclude(q => q.ClientNeed)
            .Where(r => r.ExamAttempt.UserId == userId &&
                        r.ExamAttempt.Status == AttemptStatus.Completed &&
                        r.GradingState == ResponseGradingState.Graded);

        if (startDate.HasValue) query = query.Where(r => r.AnsweredAt >= startDate.Value);
        if (endDate.HasValue) query = query.Where(r => r.AnsweredAt <= endDate.Value);
        if (!string.IsNullOrWhiteSpace(filter.Pathway) && filter.Pathway != "both")
        {
            query = query.Where(r => r.Question.Pathway == filter.Pathway || r.Question.Pathway == "both");
        }

        var responses = await query
            .Select(r => new
            {
                r.IsCorrect,
                r.AnsweredAt,
                ClientNeedCode = r.Question.ClientNeed != null ? r.Question.ClientNeed.Code : null
            })
            .ToListAsync(ct);

        foreach (var cat in categories)
        {
            var catResponses = responses
                .Where(r => !string.IsNullOrEmpty(r.ClientNeedCode) &&
                            string.Equals(r.ClientNeedCode, cat.Code, StringComparison.OrdinalIgnoreCase))
                .OrderBy(r => r.AnsweredAt)
                .ToList();

            var total = catResponses.Count;
            var correct = catResponses.Count(r => r.IsCorrect);
            var incorrect = total - correct;
            var accuracy = total > 0 ? Math.Round((decimal)correct / total * 100m, 1) : 0m;

            string classification;
            string confidence;
            if (total == 0)
            {
                classification = "InsufficientData";
                confidence = "Low";
            }
            else if (total < 5)
            {
                classification = "InsufficientData";
                confidence = "Low";
            }
            else
            {
                confidence = total >= 15 ? "High" : "Moderate";
                if (accuracy >= 75.0m) classification = "Strong";
                else if (accuracy >= 62.0m) classification = "Developing";
                else classification = "NeedsAttention";
            }

            string trend = "Neutral";
            if (catResponses.Count >= 4)
            {
                var half = catResponses.Count / 2;
                var firstAcc = (decimal)catResponses.Take(half).Count(r => r.IsCorrect) / half;
                var secondAcc = (decimal)catResponses.Skip(half).Count(r => r.IsCorrect) / (catResponses.Count - half);
                if (secondAcc - firstAcc > 0.05m) trend = "Up";
                else if (secondAcc - firstAcc < -0.05m) trend = "Down";
            }

            result.Add(new CategoryPerformanceIntelligenceDto
            {
                CategoryCode = cat.Code,
                CategoryName = cat.Name,
                Pathway = isPn ? "pn" : "rn",
                QuestionsAttempted = total,
                CorrectResponses = correct,
                IncorrectResponses = incorrect,
                AccuracyPercent = accuracy,
                Classification = classification,
                ConfidenceLevel = confidence,
                TrendDirection = trend,
                LastPracticedAt = catResponses.LastOrDefault()?.AnsweredAt,
                SuggestedRemediation = cat.Rem,
                SuggestedActionHref = $"/dashboard?clientNeed={cat.Code}"
            });
        }

        return result;
    }

    public async Task<QuestionIntelligenceSummaryDto> GetQuestionIntelligenceAsync(string userId, AnalyticsFilterDto filter, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId)) return new QuestionIntelligenceSummaryDto();

        var (startDate, endDate, _) = ResolveDateRange(filter);

        var query = _context.AttemptResponses
            .Include(r => r.Question)
                .ThenInclude(q => q.ClientNeed)
            .Where(r => r.ExamAttempt.UserId == userId &&
                        r.ExamAttempt.Status == AttemptStatus.Completed &&
                        r.GradingState == ResponseGradingState.Graded);

        if (startDate.HasValue) query = query.Where(r => r.AnsweredAt >= startDate.Value);
        if (endDate.HasValue) query = query.Where(r => r.AnsweredAt <= endDate.Value);
        if (!string.IsNullOrWhiteSpace(filter.Pathway) && filter.Pathway != "both")
        {
            query = query.Where(r => r.Question.Pathway == filter.Pathway || r.Question.Pathway == "both");
        }

        var responses = await query
            .Select(r => new
            {
                r.IsCorrect,
                r.TimeSpentSeconds,
                r.Question.QuestionTypeKey,
                r.Question.Difficulty,
                r.Question.ClinicalJudgmentStep,
                ClientNeedCode = r.Question.ClientNeed != null ? r.Question.ClientNeed.Code : null,
                ClientNeedName = r.Question.ClientNeed != null ? r.Question.ClientNeed.Name : null
            })
            .ToListAsync(ct);

        // 1. Question Type Performance
        var qTypeLookup = QuestionTypeRegistry.Instance;
        var qTypesGrouped = responses
            .GroupBy(r => r.QuestionTypeKey ?? "single-choice")
            .Select(g =>
            {
                var total = g.Count();
                var correct = g.Count(x => x.IsCorrect);
                var accuracy = total > 0 ? Math.Round((decimal)correct / total * 100m, 1) : 0m;
                var avgTime = total > 0 ? (int)Math.Round(g.Average(x => x.TimeSpentSeconds)) : 0;
                var descriptor = qTypeLookup.TryGet(g.Key, out var d) ? d : null;

                var sampleStatus = total >= 10 ? "Robust" : (total >= 4 ? "Moderate" : "Limited");
                var perf = accuracy >= 75.0m ? "Strong" : (accuracy >= 60.0m ? "Developing" : "NeedsAttention");

                return new QuestionTypeIntelligenceDto
                {
                    QuestionTypeKey = g.Key,
                    QuestionTypeName = descriptor?.DefaultName ?? g.Key.Replace("-", " ").ToUpperInvariant(),
                    Category = descriptor?.DefaultCategory ?? "Traditional",
                    QuestionsAttempted = total,
                    CorrectResponses = correct,
                    AccuracyPercent = accuracy,
                    AverageTimeSpentSeconds = avgTime,
                    SampleSizeStatus = sampleStatus,
                    PerformanceLevel = perf
                };
            })
            .OrderByDescending(t => t.QuestionsAttempted)
            .ToList();

        // 2. Difficulty Breakdown
        var diffDef = new[] { QuestionDifficulty.Easy, QuestionDifficulty.Moderate, QuestionDifficulty.Hard, QuestionDifficulty.Expert };
        var diffDtos = diffDef.Select(d =>
        {
            var matching = responses.Where(r => r.Difficulty == d).ToList();
            var total = matching.Count;
            var correct = matching.Count(x => x.IsCorrect);
            var acc = total > 0 ? Math.Round((decimal)correct / total * 100m, 1) : 0m;
            var avgTime = total > 0 ? (int)Math.Round(matching.Average(x => x.TimeSpentSeconds)) : 0;

            return new DifficultyIntelligenceDto
            {
                Difficulty = d.ToString(),
                QuestionsAttempted = total,
                CorrectResponses = correct,
                AccuracyPercent = acc,
                AverageTimeSpentSeconds = avgTime
            };
        }).ToList();

        // 3. Clinical Judgment (NGN) Steps
        var ncjmmSteps = new (string Key, string Name, int Order)[]
        {
            ("Recognize Cues", "Recognize Cues", 1),
            ("Analyze Cues", "Analyze Cues", 2),
            ("Prioritize Hypotheses", "Prioritize Hypotheses", 3),
            ("Generate Solutions", "Generate Solutions", 4),
            ("Take Action", "Take Action", 5),
            ("Evaluate Outcomes", "Evaluate Outcomes", 6)
        };

        var cjDtos = ncjmmSteps.Select(step =>
        {
            var matching = responses
                .Where(r => !string.IsNullOrEmpty(r.ClinicalJudgmentStep) &&
                            r.ClinicalJudgmentStep.Contains(step.Key, StringComparison.OrdinalIgnoreCase))
                .ToList();

            var total = matching.Count;
            var correct = matching.Count(x => x.IsCorrect);
            var acc = total > 0 ? Math.Round((decimal)correct / total * 100m, 1) : 0m;

            return new ClinicalJudgmentIntelligenceDto
            {
                StepKey = step.Key.Replace(" ", ""),
                StepName = step.Name,
                StepOrder = step.Order,
                QuestionsAttempted = total,
                CorrectResponses = correct,
                AccuracyPercent = acc,
                Status = total == 0 ? "Unassessed" : (acc >= 75m ? "Strong" : (acc >= 60m ? "Developing" : "NeedsAttention"))
            };
        }).ToList();

        // 4. Recurring Error Clustering
        var errors = new List<RecurringErrorPatternDto>();

        // Category errors
        var catErrors = responses
            .Where(r => !r.IsCorrect && !string.IsNullOrEmpty(r.ClientNeedCode))
            .GroupBy(r => new { r.ClientNeedCode, r.ClientNeedName })
            .Where(g => g.Count() >= 2)
            .OrderByDescending(g => g.Count())
            .Take(3);

        foreach (var g in catErrors)
        {
            var totalInCat = responses.Count(r => r.ClientNeedCode == g.Key.ClientNeedCode);
            var rate = totalInCat > 0 ? Math.Round((decimal)g.Count() / totalInCat * 100m, 1) : 100m;

            errors.Add(new RecurringErrorPatternDto
            {
                PatternId = $"err-cat-{g.Key.ClientNeedCode!.ToLowerInvariant()}",
                PatternType = "Category",
                TargetCode = g.Key.ClientNeedCode,
                TargetName = g.Key.ClientNeedName ?? ClientNeedCategory.GetDisplayName(g.Key.ClientNeedCode),
                IncorrectCount = g.Count(),
                ErrorRatePercent = rate,
                ContextSummary = $"Recorded {g.Count()} incorrect responses across {totalInCat} attempts in {g.Key.ClientNeedName ?? g.Key.ClientNeedCode}.",
                ActionableRemediation = "Complete a targeted quiz in this domain and review study guide rationales.",
                ActionHref = $"/dashboard?clientNeed={g.Key.ClientNeedCode}"
            });
        }

        // Format errors (e.g. SATA multi-select struggle)
        var sataErrors = responses.Where(r => !r.IsCorrect && r.QuestionTypeKey == "sata").ToList();
        if (sataErrors.Count >= 2)
        {
            var totalSata = responses.Count(r => r.QuestionTypeKey == "sata");
            var rate = totalSata > 0 ? Math.Round((decimal)sataErrors.Count / totalSata * 100m, 1) : 100m;
            errors.Add(new RecurringErrorPatternDto
            {
                PatternId = "err-type-sata",
                PatternType = "QuestionType",
                TargetCode = "sata",
                TargetName = "Select All That Apply (SATA)",
                IncorrectCount = sataErrors.Count,
                ErrorRatePercent = rate,
                ContextSummary = $"Recorded {sataErrors.Count} missed SATA questions out of {totalSata} total SATA questions.",
                ActionableRemediation = "Treat each option as a true/false statement independently to prevent over-selection.",
                ActionHref = "/dashboard?tab=tutored_cat"
            });
        }

        return new QuestionIntelligenceSummaryDto
        {
            QuestionTypes = qTypesGrouped,
            DifficultyBreakdown = diffDtos,
            ClinicalJudgmentSteps = cjDtos,
            RecurringErrors = errors
        };
    }

    public async Task<PaginatedQuestionReviewDto> GetQuestionReviewHistoryAsync(string userId, QuestionReviewFilterDto filter, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId)) return new PaginatedQuestionReviewDto();

        var query = _context.AttemptResponses
            .Include(r => r.ExamAttempt)
                .ThenInclude(ea => ea.Exam)
            .Include(r => r.Question)
                .ThenInclude(q => q.Options)
            .Include(r => r.Question)
                .ThenInclude(q => q.ClientNeed)
            .Where(r => r.ExamAttempt.UserId == userId &&
                        r.ExamAttempt.Status == AttemptStatus.Completed &&
                        r.GradingState == ResponseGradingState.Graded);

        if (!string.IsNullOrWhiteSpace(filter.Pathway) && filter.Pathway != "both")
        {
            query = query.Where(r => r.Question.Pathway == filter.Pathway || r.Question.Pathway == "both");
        }
        if (!string.IsNullOrWhiteSpace(filter.ClientNeedCode))
        {
            query = query.Where(r => r.Question.ClientNeed != null && r.Question.ClientNeed.Code == filter.ClientNeedCode);
        }
        if (!string.IsNullOrWhiteSpace(filter.QuestionTypeKey))
        {
            query = query.Where(r => r.Question.QuestionTypeKey == filter.QuestionTypeKey);
        }
        if (!string.IsNullOrWhiteSpace(filter.Difficulty) && Enum.TryParse<QuestionDifficulty>(filter.Difficulty, true, out var diff))
        {
            query = query.Where(r => r.Question.Difficulty == diff);
        }
        if (filter.OnlyIncorrect == true)
        {
            query = query.Where(r => !r.IsCorrect);
        }

        var totalCount = await query.CountAsync(ct);
        var page = Math.Max(1, filter.Page);
        var pageSize = Math.Clamp(filter.PageSize, 5, 50);

        var responses = await query
            .OrderByDescending(r => r.AnsweredAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var qTypeLookup = QuestionTypeRegistry.Instance;

        var items = responses.Select(r =>
        {
            var correctKeys = r.Question.Options.Where(o => o.IsCorrect).Select(o => o.OptionKey).ToList();
            List<string> selectedKeys;
            try
            {
                selectedKeys = JsonSerializer.Deserialize<List<string>>(r.SelectedOptionsJson) ?? new List<string>();
            }
            catch
            {
                selectedKeys = new List<string>();
            }

            var typeName = qTypeLookup.TryGet(r.Question.QuestionTypeKey, out var d) ? d.DefaultName : r.Question.QuestionTypeKey;

            return new LearnerQuestionReviewDto
            {
                ResponseId = r.Id,
                QuestionId = r.QuestionId,
                QuestionCode = r.Question.Code,
                StemPreview = r.Question.Stem.Length > 160 ? r.Question.Stem.Substring(0, 160) + "..." : r.Question.Stem,
                Pathway = r.Question.Pathway,
                QuestionTypeKey = r.Question.QuestionTypeKey,
                QuestionTypeName = typeName,
                Difficulty = r.Question.Difficulty.ToString(),
                ClientNeedCode = r.Question.ClientNeed?.Code,
                ClientNeedName = r.Question.ClientNeed?.Name,
                ClinicalJudgmentStep = r.Question.ClinicalJudgmentStep,
                LearnerSelectedOptions = selectedKeys,
                CorrectAnswerOptions = correctKeys,
                IsCorrect = r.IsCorrect,
                ScoreAwarded = r.ScoreAwarded,
                TimeSpentSeconds = r.TimeSpentSeconds,
                AnsweredAt = r.AnsweredAt,
                ExamTitle = r.ExamAttempt.Exam?.Title ?? "Assessment",
                ExamAttemptId = r.ExamAttemptId,
                OverallRationale = r.Question.OverallRationale
            };
        }).ToList();

        return new PaginatedQuestionReviewDto
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
        };
    }

    public async Task<AttemptComparisonResponseDto> GetAttemptComparisonAsync(string userId, string? attemptId1, string? attemptId2, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId)) return new AttemptComparisonResponseDto();

        var completedAttempts = await _context.ExamAttempts
            .Include(ea => ea.Exam)
            .Include(ea => ea.Responses)
                .ThenInclude(r => r.Question)
                    .ThenInclude(q => q.ClientNeed)
            .Where(ea => ea.UserId == userId && ea.Status == AttemptStatus.Completed)
            .OrderBy(ea => ea.CompletedAt ?? ea.StartedAt)
            .ToListAsync(ct);

        if (completedAttempts.Count == 0) return new AttemptComparisonResponseDto();

        ExamAttempt? att1 = null;
        ExamAttempt? att2 = null;

        if (!string.IsNullOrEmpty(attemptId1)) att1 = completedAttempts.FirstOrDefault(a => a.Id == attemptId1);
        if (!string.IsNullOrEmpty(attemptId2)) att2 = completedAttempts.FirstOrDefault(a => a.Id == attemptId2);

        // Fallbacks: First vs Latest if unspecified
        if (att1 == null) att1 = completedAttempts.First();
        if (att2 == null) att2 = completedAttempts.Last();

        var d1 = MapAttemptDetail(att1);
        var d2 = MapAttemptDetail(att2);

        var scoreDelta = Math.Round(d2.ScorePercent - d1.ScorePercent, 1);
        var accDelta = Math.Round(d2.AccuracyPercent - d1.AccuracyPercent, 1);
        var durDelta = d2.DurationMinutes - d1.DurationMinutes;

        var allCatCodes = d1.CategoryAccuracies.Keys.Union(d2.CategoryAccuracies.Keys).Distinct();
        var catDeltas = new List<CategoryComparisonDeltaDto>();

        foreach (var code in allCatCodes)
        {
            var a1 = d1.CategoryAccuracies.TryGetValue(code, out var v1) ? v1 : 0m;
            var a2 = d2.CategoryAccuracies.TryGetValue(code, out var v2) ? v2 : 0m;
            catDeltas.Add(new CategoryComparisonDeltaDto
            {
                CategoryCode = code,
                CategoryName = ClientNeedCategory.GetDisplayName(code),
                Attempt1Accuracy = a1,
                Attempt2Accuracy = a2,
                DeltaAccuracy = Math.Round(a2 - a1, 1)
            });
        }

        string progressSummary;
        if (scoreDelta > 5.0m) progressSummary = $"Clear score improvement of +{scoreDelta}% observed between attempts.";
        else if (scoreDelta < -5.0m) progressSummary = $"Score declined by {Math.Abs(scoreDelta)}%; focus on identified weak domains.";
        else progressSummary = "Consistent performance across comparison points.";

        return new AttemptComparisonResponseDto
        {
            Attempt1 = d1,
            Attempt2 = d2,
            ScoreDelta = scoreDelta,
            AccuracyDelta = accDelta,
            DurationDeltaMinutes = durDelta,
            ProgressSummary = progressSummary,
            CategoryDeltas = catDeltas.OrderBy(c => c.DeltaAccuracy).ToList()
        };
    }

    private static AttemptComparisonDetailDto MapAttemptDetail(ExamAttempt att)
    {
        var graded = att.Responses.Where(r => r.GradingState == ResponseGradingState.Graded).ToList();
        var total = graded.Count;
        var correct = graded.Count(r => r.IsCorrect);
        var acc = total > 0 ? Math.Round((decimal)correct / total * 100m, 1) : att.ScorePercent;
        var dur = att.CompletedAt.HasValue
            ? (int)Math.Max(1, (att.CompletedAt.Value - att.StartedAt).TotalMinutes)
            : 0;

        var catAcc = new Dictionary<string, decimal>();
        var grouped = graded
            .Where(r => r.Question.ClientNeed != null)
            .GroupBy(r => r.Question.ClientNeed!.Code);

        foreach (var g in grouped)
        {
            var cTotal = g.Count();
            var cCorrect = g.Count(r => r.IsCorrect);
            catAcc[g.Key] = cTotal > 0 ? Math.Round((decimal)cCorrect / cTotal * 100m, 1) : 0m;
        }

        return new AttemptComparisonDetailDto
        {
            AttemptId = att.Id,
            ExamTitle = att.Exam?.Title ?? "Assessment",
            ExamType = att.Exam?.ExamType.ToString() ?? "Practice",
            CompletedAt = att.CompletedAt ?? att.StartedAt,
            ScorePercent = att.ScorePercent,
            AccuracyPercent = acc,
            TotalQuestions = total,
            CorrectCount = correct,
            DurationMinutes = dur,
            ReadinessTier = ClassifyReadinessTier(att.ScorePercent),
            CategoryAccuracies = catAcc
        };
    }

    public async Task<IReadOnlyList<LearnerRecommendationDto>> GetLearnerRecommendationsAsync(string userId, string? pathway = null, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId)) return Array.Empty<LearnerRecommendationDto>();

        var existingQuery = _context.LearnerPerformanceRecommendations
            .Where(r => r.UserId == userId);

        if (!string.IsNullOrWhiteSpace(pathway) && pathway != "both")
        {
            existingQuery = existingQuery.Where(r => r.Pathway == pathway || r.Pathway == "both");
        }

        var existing = await existingQuery
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);

        // If no persistent recommendations exist, generate and persist initial set
        if (existing.Count == 0)
        {
            await GenerateAndPersistInitialRecommendationsAsync(userId, pathway ?? "both", ct);
            existing = await existingQuery.OrderByDescending(r => r.CreatedAt).ToListAsync(ct);
        }

        return existing.Select(r => new LearnerRecommendationDto
        {
            Id = r.Id,
            UserId = r.UserId,
            Pathway = r.Pathway,
            Category = r.Category,
            Priority = r.Priority,
            Title = r.Title,
            Description = r.Description,
            Evidence = r.Evidence,
            SuggestedAction = r.SuggestedAction,
            ActionHref = r.ActionHref,
            TargetClientNeedCode = r.TargetClientNeedCode,
            TargetQuestionTypeKey = r.TargetQuestionTypeKey,
            Status = r.Status,
            CreatedAt = r.CreatedAt,
            CompletedAt = r.CompletedAt,
            DismissedAt = r.DismissedAt
        }).ToList();
    }

    private async Task GenerateAndPersistInitialRecommendationsAsync(string userId, string pathway, CancellationToken ct)
    {
        var categories = await GetCategoryIntelligenceAsync(userId, new AnalyticsFilterDto { Pathway = pathway }, ct);
        var overview = await GetOverviewAsync(userId, new AnalyticsFilterDto { Pathway = pathway }, ct);
        var qIntelligence = await GetQuestionIntelligenceAsync(userId, new AnalyticsFilterDto { Pathway = pathway }, ct);

        var toAdd = new List<LearnerPerformanceRecommendation>();

        // 1. Weakest category
        var weak = categories.Where(c => c.QuestionsAttempted >= 3 && c.AccuracyPercent < 65m).OrderBy(c => c.AccuracyPercent).FirstOrDefault();
        if (weak != null)
        {
            toAdd.Add(new LearnerPerformanceRecommendation
            {
                UserId = userId,
                Pathway = pathway,
                Category = RecommendationCategoryNames.TargetedPractice,
                Priority = RecommendationPriorityNames.High,
                Title = $"Strengthen {weak.CategoryName}",
                Description = $"Your observed accuracy in {weak.CategoryName} is currently {weak.AccuracyPercent}%. Focused practice in this core domain will quickly raise your test-plan readiness.",
                Evidence = $"Based on {weak.QuestionsAttempted} answered questions with {weak.CorrectResponses} correct responses.",
                SuggestedAction = "Complete a targeted 15-question drill and review clinical rationales.",
                ActionHref = $"/dashboard?clientNeed={weak.CategoryCode}",
                TargetClientNeedCode = weak.CategoryCode,
                Status = RecommendationStatusNames.New
            });
        }

        // 2. Unassessed domain
        var unassessed = categories.FirstOrDefault(c => c.QuestionsAttempted == 0);
        if (unassessed != null)
        {
            toAdd.Add(new LearnerPerformanceRecommendation
            {
                UserId = userId,
                Pathway = pathway,
                Category = RecommendationCategoryNames.ConceptReview,
                Priority = RecommendationPriorityNames.Medium,
                Title = $"Establish Baseline in {unassessed.CategoryName}",
                Description = $"You have not yet completed questions in {unassessed.CategoryName}. Building early baseline performance ensures comprehensive NCLEX blueprint coverage.",
                Evidence = "Zero recorded attempts in this Client Needs domain.",
                SuggestedAction = "Take a short diagnostic quiz to discover baseline proficiency.",
                ActionHref = $"/dashboard?clientNeed={unassessed.CategoryCode}",
                TargetClientNeedCode = unassessed.CategoryCode,
                Status = RecommendationStatusNames.New
            });
        }

        // 3. Question format remediation (e.g. SATA)
        var sata = qIntelligence.QuestionTypes.FirstOrDefault(q => q.QuestionTypeKey == "sata" && q.QuestionsAttempted >= 3 && q.AccuracyPercent < 65m);
        if (sata != null)
        {
            toAdd.Add(new LearnerPerformanceRecommendation
            {
                UserId = userId,
                Pathway = pathway,
                Category = RecommendationCategoryNames.QuestionFormat,
                Priority = RecommendationPriorityNames.High,
                Title = "Improve SATA Clinical Prioritization",
                Description = $"Select All That Apply (SATA) accuracy is {sata.AccuracyPercent}%. SATA items require evaluating each statement as an independent true/false clinical decision.",
                Evidence = $"Observed {sata.QuestionsAttempted - sata.CorrectResponses} incorrect SATA responses out of {sata.QuestionsAttempted} attempted.",
                SuggestedAction = "Practice 10 consecutive SATA questions using the isolated True/False elimination strategy.",
                ActionHref = "/dashboard?tab=tutored_cat",
                TargetQuestionTypeKey = "sata",
                Status = RecommendationStatusNames.New
            });
        }

        // 4. Readiness Simulation
        if (overview.TotalCompletedAssessments >= 2 && overview.AverageScorePercent >= 65m)
        {
            toAdd.Add(new LearnerPerformanceRecommendation
            {
                UserId = userId,
                Pathway = pathway,
                Category = RecommendationCategoryNames.ReadinessSimulation,
                Priority = overview.AverageScorePercent >= 75m ? RecommendationPriorityNames.High : RecommendationPriorityNames.Medium,
                Title = "Full Readiness Assessment (RAT) Benchmark",
                Description = "Your average performance shows steady mastery across tested areas. Take a full-length Readiness Assessment to validate stamina under timed examination conditions.",
                Evidence = $"Completed {overview.TotalCompletedAssessments} assessments with an average score of {overview.AverageScorePercent}%.",
                SuggestedAction = "Schedule and launch a full-length Readiness Assessment Test (RAT).",
                ActionHref = "/dashboard?tab=rat",
                Status = RecommendationStatusNames.New
            });
        }
        else if (overview.TotalCompletedAssessments == 0)
        {
            toAdd.Add(new LearnerPerformanceRecommendation
            {
                UserId = userId,
                Pathway = pathway,
                Category = RecommendationCategoryNames.ReadinessSimulation,
                Priority = RecommendationPriorityNames.High,
                Title = "Begin with Diagnostic Practice Test",
                Description = "Start your preparation journey with an initial diagnostic test to map your knowledge baseline across all 8 NCSBN categories.",
                Evidence = "No completed assessment attempts recorded yet.",
                SuggestedAction = "Launch your first practice test from the test bank.",
                ActionHref = "/dashboard",
                Status = RecommendationStatusNames.New
            });
        }

        if (toAdd.Count > 0)
        {
            _context.LearnerPerformanceRecommendations.AddRange(toAdd);
            await _context.SaveChangesAsync(ct);
        }
    }

    public async Task<LearnerRecommendationDto?> UpdateRecommendationStatusAsync(string userId, string recommendationId, UpdateRecommendationStatusRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(recommendationId)) return null;

        var rec = await _context.LearnerPerformanceRecommendations
            .FirstOrDefaultAsync(r => r.Id == recommendationId && r.UserId == userId, ct);

        if (rec == null) return null;

        var newStatus = request.Status?.Trim();
        if (newStatus == RecommendationStatusNames.InProgress ||
            newStatus == RecommendationStatusNames.Completed ||
            newStatus == RecommendationStatusNames.Dismissed ||
            newStatus == RecommendationStatusNames.New)
        {
            rec.Status = newStatus;
            rec.UpdatedAt = DateTime.UtcNow;

            if (newStatus == RecommendationStatusNames.Completed)
            {
                rec.CompletedAt = DateTime.UtcNow;
            }
            else if (newStatus == RecommendationStatusNames.Dismissed)
            {
                rec.DismissedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync(ct);
        }

        return new LearnerRecommendationDto
        {
            Id = rec.Id,
            UserId = rec.UserId,
            Pathway = rec.Pathway,
            Category = rec.Category,
            Priority = rec.Priority,
            Title = rec.Title,
            Description = rec.Description,
            Evidence = rec.Evidence,
            SuggestedAction = rec.SuggestedAction,
            ActionHref = rec.ActionHref,
            TargetClientNeedCode = rec.TargetClientNeedCode,
            TargetQuestionTypeKey = rec.TargetQuestionTypeKey,
            Status = rec.Status,
            CreatedAt = rec.CreatedAt,
            CompletedAt = rec.CompletedAt,
            DismissedAt = rec.DismissedAt
        };
    }

    public async Task<IReadOnlyList<LearnerInterventionDto>> GetInterventionsAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId)) return Array.Empty<LearnerInterventionDto>();

        var interventions = await _context.LearnerInterventions
            .Include(i => i.Recommendation)
            .Where(i => i.UserId == userId)
            .OrderByDescending(i => i.StartedAt)
            .ToListAsync(ct);

        // Dynamically evaluate follow-up performance for active interventions
        foreach (var inv in interventions.Where(i => i.Status == InterventionStatusNames.Active))
        {
            await ReevaluateInterventionProgressAsync(inv, ct);
        }

        return interventions.Select(i => new LearnerInterventionDto
        {
            Id = i.Id,
            UserId = i.UserId,
            RecommendationId = i.RecommendationId,
            Pathway = i.Pathway,
            Title = i.Title,
            Category = i.Category,
            TargetClientNeedCode = i.TargetClientNeedCode,
            TargetQuestionTypeKey = i.TargetQuestionTypeKey,
            BaselineAccuracyPercent = i.BaselineAccuracyPercent,
            BaselineQuestionsAnswered = i.BaselineQuestionsAnswered,
            PostInterventionAccuracyPercent = i.PostInterventionAccuracyPercent,
            PostInterventionQuestionsAnswered = i.PostInterventionQuestionsAnswered,
            ActivityCount = i.ActivityCount,
            Status = i.Status,
            StartedAt = i.StartedAt,
            LastEvaluatedAt = i.LastEvaluatedAt,
            CompletedAt = i.CompletedAt
        }).ToList();
    }

    public async Task<LearnerInterventionDto> StartInterventionAsync(string userId, StartInterventionRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId)) throw new ArgumentException("UserId is required.");

        // Calculate baseline accuracy in target domain or question type
        decimal baselineAcc = 0m;
        int baselineCount = 0;

        var baseQuery = _context.AttemptResponses
            .Where(r => r.ExamAttempt.UserId == userId &&
                        r.ExamAttempt.Status == AttemptStatus.Completed &&
                        r.GradingState == ResponseGradingState.Graded);

        if (!string.IsNullOrEmpty(request.TargetClientNeedCode))
        {
            baseQuery = baseQuery.Where(r => r.Question.ClientNeed != null && r.Question.ClientNeed.Code == request.TargetClientNeedCode);
        }
        if (!string.IsNullOrEmpty(request.TargetQuestionTypeKey))
        {
            baseQuery = baseQuery.Where(r => r.Question.QuestionTypeKey == request.TargetQuestionTypeKey);
        }

        var baselineResponses = await baseQuery.Select(r => r.IsCorrect).ToListAsync(ct);
        baselineCount = baselineResponses.Count;
        if (baselineCount > 0)
        {
            baselineAcc = Math.Round((decimal)baselineResponses.Count(c => c) / baselineCount * 100m, 1);
        }

        var intervention = new LearnerIntervention
        {
            UserId = userId,
            RecommendationId = request.RecommendationId,
            Pathway = request.Pathway ?? "both",
            Title = string.IsNullOrWhiteSpace(request.Title) ? "Targeted Knowledge Intervention" : request.Title,
            Category = request.Category ?? RecommendationCategoryNames.TargetedPractice,
            TargetClientNeedCode = request.TargetClientNeedCode,
            TargetQuestionTypeKey = request.TargetQuestionTypeKey,
            BaselineAccuracyPercent = baselineAcc,
            BaselineQuestionsAnswered = baselineCount,
            PostInterventionAccuracyPercent = baselineAcc,
            PostInterventionQuestionsAnswered = 0,
            ActivityCount = 0,
            Status = InterventionStatusNames.Active,
            StartedAt = DateTime.UtcNow
        };

        _context.LearnerInterventions.Add(intervention);

        if (!string.IsNullOrEmpty(request.RecommendationId))
        {
            var rec = await _context.LearnerPerformanceRecommendations.FindAsync(new object[] { request.RecommendationId }, ct);
            if (rec != null && rec.UserId == userId && rec.Status == RecommendationStatusNames.New)
            {
                rec.Status = RecommendationStatusNames.InProgress;
                rec.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync(ct);

        return new LearnerInterventionDto
        {
            Id = intervention.Id,
            UserId = intervention.UserId,
            RecommendationId = intervention.RecommendationId,
            Pathway = intervention.Pathway,
            Title = intervention.Title,
            Category = intervention.Category,
            TargetClientNeedCode = intervention.TargetClientNeedCode,
            TargetQuestionTypeKey = intervention.TargetQuestionTypeKey,
            BaselineAccuracyPercent = intervention.BaselineAccuracyPercent,
            BaselineQuestionsAnswered = intervention.BaselineQuestionsAnswered,
            PostInterventionAccuracyPercent = intervention.PostInterventionAccuracyPercent,
            PostInterventionQuestionsAnswered = intervention.PostInterventionQuestionsAnswered,
            ActivityCount = intervention.ActivityCount,
            Status = intervention.Status,
            StartedAt = intervention.StartedAt
        };
    }

    private async Task ReevaluateInterventionProgressAsync(LearnerIntervention inv, CancellationToken ct)
    {
        var postQuery = _context.AttemptResponses
            .Where(r => r.ExamAttempt.UserId == inv.UserId &&
                        r.ExamAttempt.Status == AttemptStatus.Completed &&
                        r.GradingState == ResponseGradingState.Graded &&
                        r.AnsweredAt >= inv.StartedAt);

        if (!string.IsNullOrEmpty(inv.TargetClientNeedCode))
        {
            postQuery = postQuery.Where(r => r.Question.ClientNeed != null && r.Question.ClientNeed.Code == inv.TargetClientNeedCode);
        }
        if (!string.IsNullOrEmpty(inv.TargetQuestionTypeKey))
        {
            postQuery = postQuery.Where(r => r.Question.QuestionTypeKey == inv.TargetQuestionTypeKey);
        }

        var postResponses = await postQuery.Select(r => r.IsCorrect).ToListAsync(ct);
        var postCount = postResponses.Count;

        if (postCount > 0)
        {
            var postAcc = Math.Round((decimal)postResponses.Count(c => c) / postCount * 100m, 1);
            inv.PostInterventionAccuracyPercent = postAcc;
            inv.PostInterventionQuestionsAnswered = postCount;
            inv.ActivityCount = postCount;
            inv.LastEvaluatedAt = DateTime.UtcNow;

            if (postCount >= 10 && postAcc >= inv.BaselineAccuracyPercent + 5.0m)
            {
                inv.Status = InterventionStatusNames.Evaluated;
                inv.CompletedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync(ct);
        }
    }

    #endregion

    #region Helper Methods

    private static (DateTime? StartDate, DateTime? EndDate, string PeriodLabel) ResolveDateRange(AnalyticsFilterDto filter)
    {
        var now = DateTime.UtcNow;
        var range = filter.TimeRange?.ToLowerInvariant() ?? "all";

        return range switch
        {
            "7d" => (now.AddDays(-7), now, "Last 7 Days"),
            "30d" => (now.AddDays(-30), now, "Last 30 Days"),
            "90d" => (now.AddDays(-90), now, "Last 90 Days"),
            "6m" => (now.AddMonths(-6), now, "Last 6 Months"),
            "custom" when filter.FromDate.HasValue => (filter.FromDate.Value, filter.ToDate ?? now, "Custom Range"),
            _ => (null, null, "All Time")
        };
    }

    private static IQueryable<ExamAttempt> ApplyAttemptFilters(
        IQueryable<ExamAttempt> query,
        AnalyticsFilterDto filter,
        DateTime? startDate,
        DateTime? endDate)
    {
        if (startDate.HasValue) query = query.Where(a => a.StartedAt >= startDate.Value);
        if (endDate.HasValue) query = query.Where(a => a.StartedAt <= endDate.Value);

        if (!string.IsNullOrWhiteSpace(filter.Pathway) && filter.Pathway != "both")
        {
            query = query.Where(a => a.Exam.Pathway == filter.Pathway || a.Exam.Pathway == "both");
        }

        if (!string.IsNullOrWhiteSpace(filter.ExamType) && Enum.TryParse<ExamType>(filter.ExamType, true, out var eType))
        {
            query = query.Where(a => a.Exam.ExamType == eType);
        }

        return query;
    }

    private static string ClassifyReadinessTier(decimal score)
    {
        if (score >= 75.0m) return "Very High";
        if (score >= 65.0m) return "High";
        if (score >= 55.0m) return "Borderline";
        return "Low";
    }

    #endregion
}
