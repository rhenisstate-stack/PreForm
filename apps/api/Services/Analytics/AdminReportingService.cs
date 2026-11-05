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

public class AdminReportingService : IAdminReportingService
{
    private readonly AppDbContext _context;

    public AdminReportingService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<AdminOverviewMetricsDto> GetOverviewMetricsAsync(CancellationToken ct = default)
    {
        var totalLearners = await _context.Users
            .CountAsync(u => !u.UserRoles.Any(ur => ur.Role.Name.ToLower() == "admin" ||
                                                    ur.Role.Name.ToLower() == "superadmin" ||
                                                    ur.Role.Name.ToLower() == "administrator"), ct);

        // Trailing 30 days active learners
        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
        var activeLearners = await _context.ExamAttempts
            .Where(a => a.StartedAt >= thirtyDaysAgo)
            .Select(a => a.UserId)
            .Distinct()
            .CountAsync(ct);

        var totalQuestions = await _context.Questions.CountAsync(ct);
        var publishedQuestions = await _context.Questions
            .CountAsync(q => q.Status == QuestionStatus.Published, ct);

        var reviewQueue = await _context.Questions
            .CountAsync(q => q.Status == QuestionStatus.InReview || q.Status == QuestionStatus.Draft, ct);

        var publishedExams = await _context.Exams
            .CountAsync(e => e.LifecycleState == ExamLifecycleState.Published, ct);

        var completedAttemptsQuery = _context.ExamAttempts
            .Where(a => a.Status == AttemptStatus.Completed);

        var totalCompleted = await completedAttemptsQuery.CountAsync(ct);
        var avgScore = totalCompleted > 0
            ? Math.Round(await completedAttemptsQuery.AverageAsync(a => a.ScorePercent, ct), 1)
            : 0.0m;

        var engagementRate = totalLearners > 0
            ? Math.Round((decimal)activeLearners / totalLearners * 100m, 1)
            : 0.0m;

        return new AdminOverviewMetricsDto
        {
            TotalLearners = totalLearners,
            ActiveLearners = activeLearners,
            TotalQuestions = totalQuestions,
            PublishedQuestions = publishedQuestions,
            ReviewQueueCount = reviewQueue,
            PublishedExamsCount = publishedExams,
            TotalCompletedAttempts = totalCompleted,
            AverageCohortScorePercent = avgScore,
            ActiveEngagementRate = engagementRate
        };
    }

    public async Task<AssessmentReportDto> GetAssessmentReportAsync(AssessmentReportFilter filter, CancellationToken ct = default)
    {
        var query = _context.ExamAttempts
            .Include(a => a.Exam)
                .ThenInclude(e => e.Examination)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Pathway) && filter.Pathway != "all")
        {
            query = query.Where(a => a.Exam.Pathway == filter.Pathway);
        }

        if (!string.IsNullOrWhiteSpace(filter.ExaminationId) && filter.ExaminationId != "all")
        {
            query = query.Where(a => a.Exam.ExaminationId == filter.ExaminationId || a.ExamId == filter.ExaminationId);
        }

        if (filter.FromDate.HasValue)
        {
            query = query.Where(a => a.StartedAt >= filter.FromDate.Value);
        }

        if (filter.ToDate.HasValue)
        {
            query = query.Where(a => a.StartedAt <= filter.ToDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Status) && filter.Status != "all")
        {
            if (Enum.TryParse<AttemptStatus>(filter.Status, true, out var parsedStatus))
            {
                query = query.Where(a => a.Status == parsedStatus);
            }
        }

        var attempts = await query
            .Select(a => new
            {
                a.Id,
                a.Status,
                a.ScorePercent,
                a.Passed,
                a.StartedAt,
                a.CompletedAt,
                ExamId = a.ExamId,
                ExaminationId = a.Exam != null ? a.Exam.ExaminationId : null,
                ExamCode = a.Exam != null && a.Exam.Examination != null ? a.Exam.Examination.Code : "EX-000",
                ExamTitle = a.Exam != null ? a.Exam.Title : "Practice Exam",
                Pathway = a.Exam != null ? a.Exam.Pathway : "rn"
            })
            .ToListAsync(ct);

        var total = attempts.Count;
        var completed = attempts.Where(a => a.Status == AttemptStatus.Completed).ToList();
        var abandoned = attempts.Where(a => a.Status == AttemptStatus.Abandoned).ToList();

        var finalizedCount = completed.Count + abandoned.Count;
        var completionRate = finalizedCount > 0 ? Math.Round((decimal)completed.Count / finalizedCount * 100m, 1) : 0m;
        var abandonmentRate = finalizedCount > 0 ? Math.Round((decimal)abandoned.Count / finalizedCount * 100m, 1) : 0m;

        var avgScore = completed.Count > 0 ? Math.Round(completed.Average(a => a.ScorePercent), 1) : 0m;
        var passedCount = completed.Count(a => a.Passed);
        var passRate = completed.Count > 0 ? Math.Round((decimal)passedCount / completed.Count * 100m, 1) : 0m;

        var avgDuration = completed.Count > 0
            ? (int)Math.Round(completed.Where(a => a.CompletedAt.HasValue)
                .Average(a => Math.Max(1, (a.CompletedAt!.Value - a.StartedAt).TotalMinutes)))
            : 0;

        // Score distribution buckets
        var buckets = new List<(string Label, decimal Min, decimal Max)>
        {
            ("0–49%", 0m, 49.99m),
            ("50–59%", 50m, 59.99m),
            ("60–69%", 60m, 69.99m),
            ("70–74%", 70m, 74.99m),
            ("75–79%", 75m, 79.99m),
            ("80–89%", 80m, 89.99m),
            ("90–100%", 90m, 100m),
        };

        var distribution = buckets.Select(b =>
        {
            var inBucket = completed.Count(a => a.ScorePercent >= b.Min && a.ScorePercent <= b.Max);
            var pct = completed.Count > 0 ? Math.Round((decimal)inBucket / completed.Count * 100m, 1) : 0m;
            return new ScoreDistributionBucketDto
            {
                BucketLabel = b.Label,
                MinScore = b.Min,
                MaxScore = b.Max,
                Count = inBucket,
                Percentage = pct
            };
        }).ToList();

        // Examination breakdowns
        var breakdowns = attempts
            .GroupBy(a => new { FamilyId = a.ExaminationId ?? a.ExamId, a.ExamCode, a.ExamTitle, a.Pathway })
            .Select(g =>
            {
                var gTotal = g.Count();
                var gCompleted = g.Where(x => x.Status == AttemptStatus.Completed).ToList();
                var gAvgScore = gCompleted.Count > 0 ? Math.Round(gCompleted.Average(x => x.ScorePercent), 1) : 0m;
                var gPass = gCompleted.Count > 0 ? Math.Round((decimal)gCompleted.Count(x => x.Passed) / gCompleted.Count * 100m, 1) : 0m;
                var gDuration = gCompleted.Count > 0
                    ? (int)Math.Round(gCompleted.Where(x => x.CompletedAt.HasValue).Average(x => Math.Max(1, (x.CompletedAt!.Value - x.StartedAt).TotalMinutes)))
                    : 0;

                return new ExaminationAssessmentBreakdownDto
                {
                    ExaminationId = g.Key.FamilyId,
                    Code = g.Key.ExamCode,
                    Title = g.Key.ExamTitle,
                    Pathway = g.Key.Pathway,
                    TotalAttempts = gTotal,
                    CompletedAttempts = gCompleted.Count,
                    AverageScorePercent = gAvgScore,
                    PassRate = gPass,
                    AverageDurationMinutes = gDuration
                };
            })
            .OrderByDescending(b => b.TotalAttempts)
            .ToList();

        return new AssessmentReportDto
        {
            TotalAttempts = total,
            CompletedAttempts = completed.Count,
            AbandonedAttempts = abandoned.Count,
            CompletionRate = completionRate,
            AbandonmentRate = abandonmentRate,
            AverageScorePercent = avgScore,
            PassRate = passRate,
            AverageDurationMinutes = avgDuration,
            ScoreDistribution = distribution,
            ExaminationBreakdowns = breakdowns
        };
    }

    public async Task<IReadOnlyList<ExaminationRevisionReportDto>> GetExaminationRevisionReportsAsync(string examinationId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(examinationId))
        {
            return Array.Empty<ExaminationRevisionReportDto>();
        }

        var revisions = await _context.Exams
            .Include(e => e.Examination)
            .Where(e => e.ExaminationId == examinationId || e.Id == examinationId)
            .OrderBy(e => e.RevisionNumber)
            .ToListAsync(ct);

        var revisionIds = revisions.Select(r => r.Id).ToList();

        var attempts = await _context.ExamAttempts
            .Where(a => revisionIds.Contains(a.ExamId))
            .Select(a => new { a.ExamId, a.Status, a.ScorePercent, a.Passed })
            .ToListAsync(ct);

        var result = revisions.Select(rev =>
        {
            var revAttempts = attempts.Where(a => a.ExamId == rev.Id).ToList();
            var completed = revAttempts.Where(a => a.Status == AttemptStatus.Completed).ToList();
            var avgScore = completed.Count > 0 ? Math.Round(completed.Average(a => a.ScorePercent), 1) : 0m;
            var passRate = completed.Count > 0 ? Math.Round((decimal)completed.Count(a => a.Passed) / completed.Count * 100m, 1) : 0m;

            return new ExaminationRevisionReportDto
            {
                ExaminationId = rev.ExaminationId ?? rev.Id,
                Code = rev.Examination?.Code ?? "EX-000",
                Title = rev.Title,
                RevisionNumber = rev.RevisionNumber,
                RevisionId = rev.Id,
                LifecycleState = rev.LifecycleState.ToString(),
                TotalAttempts = revAttempts.Count,
                CompletedAttempts = completed.Count,
                AverageScorePercent = avgScore,
                PassRate = passRate
            };
        }).ToList();

        return result;
    }
}
