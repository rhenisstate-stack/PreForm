using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.Models;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

public class AvailableAssessmentDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Pathway { get; set; } = "rn";
    public string ExamType { get; set; } = "Practice";
    public int QuestionCount { get; set; } = 10;
    public int DurationMinutes { get; set; } = 0;
    public decimal PassingScorePercent { get; set; } = 75.0m;
    public bool HasActiveAttempt { get; set; }
    public string? ActiveAttemptId { get; set; }
    public string? Badge { get; set; }
    public bool IsEligible { get; set; } = true;
}

[ApiController]
[Authorize]
[Route("api/v1/assessments")]
public class AssessmentsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<AssessmentsController> _logger;

    public AssessmentsController(AppDbContext context, ILogger<AssessmentsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private string? ResolveUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
    }

    [HttpGet("available")]
    public async Task<IActionResult> GetAvailableAssessments([FromQuery] string? pathway, CancellationToken cancellationToken)
    {
        var userId = ResolveUserId();
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { success = false, error = "Authentication required." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "";
        var isPrivileged = role == "admin" || role == "superadmin";

        var authoritativePathway = (user?.Pathway ?? "").Trim().ToLowerInvariant();

        if (!isPrivileged)
        {
            if (authoritativePathway != "rn" && authoritativePathway != "pn")
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    errorCode = "INVALID_PATHWAY_ENROLLMENT",
                    error = "Student account does not have a valid examination pathway assignment. Please contact academic support."
                });
            }

            if (!string.IsNullOrWhiteSpace(pathway) &&
                !string.Equals(pathway.Trim(), authoritativePathway, StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    errorCode = "PATHWAY_MISMATCH",
                    error = $"Enrolled pathway is {authoritativePathway.ToUpperInvariant()}. Cross-pathway assessment access ({pathway.Trim().ToUpperInvariant()}) is prohibited."
                });
            }
        }

        var effectivePathway = isPrivileged
            ? (!string.IsNullOrWhiteSpace(pathway)
                ? (string.Equals(pathway, "pn", StringComparison.OrdinalIgnoreCase) ? "pn" : "rn")
                : (string.Equals(user?.Pathway, "pn", StringComparison.OrdinalIgnoreCase) ? "pn" : "rn"))
            : authoritativePathway;

        // Query active in-progress attempts for this user to enable "Resume" behavior
        var activeAttempts = await _context.ExamAttempts
            .Include(ea => ea.Exam)
            .Where(ea => ea.UserId == userId && ea.Status == AttemptStatus.InProgress)
            .ToListAsync(cancellationToken);

        var activeAttemptByExamId = activeAttempts.ToDictionary(a => a.ExamId, a => a.Id);
        var activeAttemptByExamType = activeAttempts
            .Where(a => a.Exam != null)
            .ToDictionary(a => a.Exam!.ExamType, a => a.Id);

        var assessments = new List<AvailableAssessmentDto>();

        // 1. Diagnostic Readiness Assessment (RAT)
        var ratExamId = $"exam_{effectivePathway}_diagnostic_rat";
        var hasActiveRat = activeAttemptByExamId.TryGetValue(ratExamId, out var activeRatId) ||
                           activeAttemptByExamType.TryGetValue(ExamType.DiagnosticReadiness, out activeRatId);

        assessments.Add(new AvailableAssessmentDto
        {
            Id = ratExamId,
            Title = effectivePathway == "pn"
                ? "NCLEX-PN Diagnostic Readiness Assessment (RAT)"
                : "NCLEX-RN Diagnostic Readiness Assessment (RAT)",
            Description = "Comprehensive diagnostic readiness test with predictive scoring across all NCSBN Client Needs categories.",
            Pathway = effectivePathway,
            ExamType = "DiagnosticReadiness",
            QuestionCount = 75,
            DurationMinutes = 150,
            PassingScorePercent = 75.0m,
            HasActiveAttempt = hasActiveRat,
            ActiveAttemptId = activeRatId,
            Badge = "Diagnostic Readiness",
            IsEligible = true
        });

        // 2. Comprehensive Practice Test
        var practiceExamId = $"exam_{effectivePathway}_practice";
        var hasActivePractice = activeAttemptByExamId.TryGetValue(practiceExamId, out var activePracticeId) ||
                               activeAttemptByExamType.TryGetValue(ExamType.Practice, out activePracticeId);

        assessments.Add(new AvailableAssessmentDto
        {
            Id = practiceExamId,
            Title = effectivePathway == "pn"
                ? "NCLEX-PN Practice Examination"
                : "NCLEX-RN Practice Examination",
            Description = "Self-paced clinical practice test drawn from published questions with immediate rationales.",
            Pathway = effectivePathway,
            ExamType = "Practice",
            QuestionCount = 25,
            DurationMinutes = 0,
            PassingScorePercent = 75.0m,
            HasActiveAttempt = hasActivePractice,
            ActiveAttemptId = activePracticeId,
            Badge = "Self-Paced Practice",
            IsEligible = true
        });

        // 3. Adaptive CAT Simulation
        var catExamId = $"exam_{effectivePathway}_adaptive_cat";
        var hasActiveCat = activeAttemptByExamId.TryGetValue(catExamId, out var activeCatId) ||
                           activeAttemptByExamType.TryGetValue(ExamType.CAT, out activeCatId);

        assessments.Add(new AvailableAssessmentDto
        {
            Id = catExamId,
            Title = effectivePathway == "pn"
                ? "NCLEX-PN Adaptive CAT Simulation"
                : "NCLEX-RN Adaptive CAT Simulation",
            Description = "Full-length computerized adaptive test simulation under standard exam time constraints.",
            Pathway = effectivePathway,
            ExamType = "CAT",
            QuestionCount = 75,
            DurationMinutes = 300,
            PassingScorePercent = 75.0m,
            HasActiveAttempt = hasActiveCat,
            ActiveAttemptId = activeCatId,
            Badge = "Simulation Mode",
            IsEligible = true
        });

        // 4. Custom published examinations from the Examinations library
        var nowUtc = DateTime.UtcNow;
        var publishedExams = await _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.ExamQuestions)
            .Where(e => (e.LifecycleState == ExamLifecycleState.Published || e.IsPublished) &&
                        e.IsAvailable &&
                        (!e.AvailableFrom.HasValue || e.AvailableFrom.Value <= nowUtc) &&
                        (!e.AvailableTo.HasValue || e.AvailableTo.Value >= nowUtc) &&
                        e.Pathway == effectivePathway &&
                        e.Id != ratExamId && e.Id != practiceExamId && e.Id != catExamId)
            .OrderByDescending(e => e.PublishedAt ?? e.CreatedAt)
            .Take(20)
            .ToListAsync(cancellationToken);

        // Fetch completed attempts for this user across published exams to check attempt policies
        var publishedExamIds = publishedExams.Select(e => e.Id).ToList();
        var userCompletedAttempts = await _context.ExamAttempts
            .Where(a => a.UserId == userId && publishedExamIds.Contains(a.ExamId) && a.Status == AttemptStatus.Completed)
            .Select(a => new { a.ExamId, a.CompletedAt })
            .ToListAsync(cancellationToken);

        var completedCountByExam = userCompletedAttempts
            .GroupBy(a => a.ExamId)
            .ToDictionary(g => g.Key, g => g.Count());

        var lastCompletedByExam = userCompletedAttempts
            .Where(a => a.CompletedAt.HasValue)
            .GroupBy(a => a.ExamId)
            .ToDictionary(g => g.Key, g => g.Max(a => a.CompletedAt!.Value));

        foreach (var pub in publishedExams)
        {
            var hasActive = activeAttemptByExamId.TryGetValue(pub.Id, out var actId);
            var isEligible = true;
            string? badge = pub.ExamType == ExamType.DiagnosticReadiness ? "Diagnostic RAT" : "Examination";

            if (completedCountByExam.TryGetValue(pub.Id, out var count))
            {
                if (pub.MaxAttemptsAllowed.HasValue && count >= pub.MaxAttemptsAllowed.Value)
                {
                    isEligible = false;
                    badge = "Max Attempts Reached";
                }
                else if (pub.RetakeCooldownHours > 0 && lastCompletedByExam.TryGetValue(pub.Id, out var lastDone))
                {
                    if (nowUtc < lastDone.AddHours(pub.RetakeCooldownHours))
                    {
                        isEligible = false;
                        badge = "Cooldown Active";
                    }
                }
            }

            var qCount = pub.ExamQuestions.Count > 0
                ? pub.ExamQuestions.Count
                : (pub.TargetQuestionCount > 0 ? pub.TargetQuestionCount : 50);

            assessments.Add(new AvailableAssessmentDto
            {
                Id = pub.Id,
                Title = pub.Title,
                Description = pub.Description,
                Pathway = pub.Pathway,
                ExamType = pub.ExamType.ToString(),
                QuestionCount = qCount,
                DurationMinutes = pub.TimeLimitMinutes,
                PassingScorePercent = pub.PassingScorePercent,
                HasActiveAttempt = hasActive,
                ActiveAttemptId = actId,
                Badge = badge,
                IsEligible = isEligible
            });
        }

        return Ok(new
        {
            success = true,
            pathway = effectivePathway,
            assessments
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAssessmentById(string id, CancellationToken cancellationToken)
    {
        var userId = ResolveUserId();
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { success = false, error = "Authentication required." });
        }

        var exam = await _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.ExamQuestions)
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        if (exam == null)
        {
            return NotFound(new { success = false, error = $"Assessment '{id}' not found." });
        }

        var activeAttempt = await _context.ExamAttempts
            .FirstOrDefaultAsync(ea => ea.UserId == userId && ea.ExamId == exam.Id && ea.Status == AttemptStatus.InProgress, cancellationToken);

        return Ok(new
        {
            success = true,
            assessment = new AvailableAssessmentDto
            {
                Id = exam.Id,
                Title = exam.Title,
                Description = exam.Description,
                Pathway = exam.Pathway,
                ExamType = exam.ExamType.ToString(),
                QuestionCount = exam.ExamQuestions.Count,
                DurationMinutes = exam.TimeLimitMinutes,
                PassingScorePercent = exam.PassingScorePercent,
                HasActiveAttempt = activeAttempt != null,
                ActiveAttemptId = activeAttempt?.Id,
                IsEligible = exam.LifecycleState == ExamLifecycleState.Published || exam.IsPublished
            }
        });
    }
}
