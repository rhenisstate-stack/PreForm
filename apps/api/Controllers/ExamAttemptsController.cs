using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Preform.Api.Data;
using Preform.Api.Models;
using Preform.Api.Services;
using Preform.Api.Services.RateLimiting;

namespace Preform.Api.Controllers;

public class ReauthenticateAttemptRequest
{
    public string? Email { get; set; }
    public string Password { get; set; } = string.Empty;
    public string? ClientId { get; set; }
}

public class StartAttemptRequest
{
    public string? ExamId { get; set; }
    public string? Pathway { get; set; }
    public string? Name { get; set; }
    public string? TestType { get; set; } // "tutored_cat", "practice", or "rat"
    public int? QuestionCount { get; set; }
    public string? ClientNeedId { get; set; }
    public string? TopicId { get; set; }
}

public class SubmitAnswerRequest
{
    public string QuestionId { get; set; } = string.Empty;
    public List<int> SelectedOptionIndices { get; set; } = new();
    public bool IsCorrect { get; set; }
    public decimal ScoreAwarded { get; set; }
    public int TimeSpentSeconds { get; set; }
}

public class SyncAttemptQuestionItem
{
    public string? Id { get; set; }
    public int QuestionNumber { get; set; }
    public string? Stem { get; set; }
    public string? Domain { get; set; }
    public string? Subdomain { get; set; }
    public string? QuestionType { get; set; }
    public List<int>? UserAnswerIndices { get; set; }
    public int? UserAnswerIndex { get; set; }
    public List<int>? CorrectAnswerIndices { get; set; }
    public int? CorrectAnswerIndex { get; set; }
    public List<string>? Options { get; set; }
    public string? Rationale { get; set; }
    public bool IsCorrect { get; set; }
    public decimal ScoreAwarded { get; set; }
    public bool IsUnanswered { get; set; }
}

public class SyncAssessmentAttemptRequest
{
    public string? Id { get; set; }
    public string? Name { get; set; }
    public string? Type { get; set; } // "tutored_cat" | "rat"
    public decimal ScorePercent { get; set; }
    public string? PerformanceTier { get; set; }
    public int TotalQuestions { get; set; }
    public int CorrectCount { get; set; }
    public int DurationMinutes { get; set; }
    public string? Pathway { get; set; }
    public List<SyncAttemptQuestionItem>? Questions { get; set; }
}

/// <summary>
/// Candidate-facing attempt summary for the attempts list. Never exposes
/// per-response grading data or answer keys.
/// </summary>
public class AttemptSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string ExamId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "tutored_cat";
    public string Status { get; set; } = "Completed";
    public decimal ScorePercent { get; set; }
    public string PerformanceTier { get; set; } = "High";
    public bool Passed { get; set; }
    public int TotalQuestions { get; set; }
    public int CorrectCount { get; set; }
    public int DurationMinutes { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int ResponseCount { get; set; }
}

/// <summary>
/// Candidate-facing attempt detail. Correctness and awarded scores are disclosed
/// per response only after authoritative finalization (attempt completed); an
/// in-progress attempt discloses the candidate's own selected answers and timing
/// but never grading state, and no answer keys, correct option identifiers or
/// rationales are exposed on any stage.
/// </summary>
public class CandidateAttemptDetailDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string ExamId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "tutored_cat";
    public string Status { get; set; } = "InProgress";
    /// <summary>Authoritative score, disclosed only after finalization. Omitted from the payload while in progress.</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? ScorePercent { get; set; }
    /// <summary>Pass/fail outcome, disclosed only after finalization. Omitted from the payload while in progress.</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? Passed { get; set; }
    /// <summary>Performance tier, disclosed only after finalization. Omitted from the payload while in progress.</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? PerformanceTier { get; set; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? CorrectCount { get; set; }
    public int TotalResponses { get; set; }
    public int DurationMinutes { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    /// <summary>True when authoritative grading is incomplete (e.g. missing answer keys).</summary>
    public bool GradingIncomplete { get; set; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("metadataSnapshot")]
    public object? MetadataSnapshot { get; set; }
    public List<CandidateAttemptResponseDto> Responses { get; set; } = new();
    public List<CandidateQuestionDto> Questions { get; set; } = new();
}

public class CandidateQuestionOptionDto
{
    public string Id { get; set; } = string.Empty;
    public int Index { get; set; }
    public string Text { get; set; } = string.Empty;
    public string? MediaUrl { get; set; }
}

public class CandidateQuestionDto
{
    public string Id { get; set; } = string.Empty;
    public int QuestionNumber { get; set; }
    public string Stem { get; set; } = string.Empty;
    public string QuestionType { get; set; } = string.Empty;
    public string? Domain { get; set; }
    public string? Subdomain { get; set; }
    public string? MediaUrl { get; set; }
    public List<CandidateQuestionOptionDto> Options { get; set; } = new();

    /// <summary>Disclosed only after finalization; null while in progress.</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<int>? CorrectAnswerIndices { get; set; }

    /// <summary>Disclosed only after finalization; null while in progress.</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Rationale { get; set; }
}

public class CandidateAttemptResponseDto
{
    public string QuestionId { get; set; } = string.Empty;
    public string SelectedOptionsJson { get; set; } = "[]";
    public int TimeSpentSeconds { get; set; }
    public DateTime AnsweredAt { get; set; }
    /// <summary>Disclosed only after finalization; null (and omitted from the payload) while in progress.</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? IsCorrect { get; set; }
    /// <summary>Disclosed only after finalization; null (and omitted from the payload) while in progress.</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? ScoreAwarded { get; set; }
}

[ApiController]
[Authorize]
[Route("api/v1/attempts")]
[Route("api/v1/exam-attempts")]
public class ExamAttemptsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<ExamAttemptsController> _logger;
    private readonly IResponseValidationService _responseValidationService;
    private readonly IAttemptQuestionService _attemptQuestionService;
    private readonly ISessionSecurityService? _sessionSecurityService;
    private readonly IPasswordHasher<User> _passwordHasher;

    private static readonly HashSet<string> AdminRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "admin", "superadmin", "administrator", "exam_manager"
    };

    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, (int FailedAttempts, DateTime WindowStart, DateTime? LockoutUntil)> _reauthRateLimits = new();

    public static void ResetReauthRateLimitsForTesting()
    {
        _reauthRateLimits.Clear();
    }

    private static bool IsReauthRateLimited(string key, out int retryAfterSeconds)
    {
        retryAfterSeconds = 0;
        var now = DateTime.UtcNow;
        if (_reauthRateLimits.TryGetValue(key, out var record))
        {
            if (record.LockoutUntil.HasValue && now < record.LockoutUntil.Value)
            {
                retryAfterSeconds = Math.Max(1, (int)Math.Ceiling((record.LockoutUntil.Value - now).TotalSeconds));
                return true;
            }
        }
        return false;
    }

    private static void RecordFailedReauthAttempt(string key)
    {
        var now = DateTime.UtcNow;
        _reauthRateLimits.AddOrUpdate(key,
            _ => (1, now, null),
            (_, old) =>
            {
                if (now - old.WindowStart > TimeSpan.FromMinutes(15))
                {
                    return (1, now, null);
                }
                var newCount = old.FailedAttempts + 1;
                DateTime? lockout = newCount >= 5 ? now.AddMinutes(15) : null;
                return (newCount, old.WindowStart, lockout);
            });
    }

    private static void ClearFailedReauthAttempts(string key)
    {
        _reauthRateLimits.TryRemove(key, out _);
    }

    public ExamAttemptsController(
        AppDbContext context,
        ILogger<ExamAttemptsController> logger,
        IResponseValidationService responseValidationService,
        IAttemptQuestionService attemptQuestionService)
        : this(context, logger, responseValidationService, attemptQuestionService, null, null, null, null, null)
    {
    }

    private readonly ISharedRateLimitingService? _rateLimitingService;
    private readonly IAssessmentSelectionService? _assessmentSelectionService;
    private readonly IUserEntitlementService? _entitlementService;

    [ActivatorUtilitiesConstructor]
    public ExamAttemptsController(
        AppDbContext context,
        ILogger<ExamAttemptsController> logger,
        IResponseValidationService responseValidationService,
        IAttemptQuestionService attemptQuestionService,
        ISessionSecurityService? sessionSecurityService,
        IPasswordHasher<User>? passwordHasher,
        ISharedRateLimitingService? rateLimitingService = null,
        IAssessmentSelectionService? assessmentSelectionService = null,
        IUserEntitlementService? entitlementService = null)
    {
        _context = context;
        _logger = logger;
        _responseValidationService = responseValidationService;
        _attemptQuestionService = attemptQuestionService;
        _sessionSecurityService = sessionSecurityService;
        _passwordHasher = passwordHasher ?? new PasswordHasher<User>();
        _rateLimitingService = rateLimitingService;
        _assessmentSelectionService = assessmentSelectionService;
        _entitlementService = entitlementService;
    }

    public ExamAttemptsController(
        AppDbContext context,
        ILogger<ExamAttemptsController> logger,
        IResponseValidationService responseValidationService,
        IAttemptQuestionService attemptQuestionService,
        ISessionSecurityService? sessionSecurityService,
        IPasswordHasher<User>? passwordHasher)
        : this(context, logger, responseValidationService, attemptQuestionService, sessionSecurityService, passwordHasher, null, null, null)
    {
    }

    public ExamAttemptsController(
        AppDbContext context,
        ILogger<ExamAttemptsController> logger,
        IResponseValidationService responseValidationService,
        IAttemptQuestionService attemptQuestionService,
        ISessionSecurityService? sessionSecurityService,
        IPasswordHasher<User>? passwordHasher,
        ISharedRateLimitingService? rateLimitingService)
        : this(context, logger, responseValidationService, attemptQuestionService, sessionSecurityService, passwordHasher, rateLimitingService, null, null)
    {
    }

    private string? GetClientIpAddress()
    {
        if (_rateLimitingService == null && Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor) && !string.IsNullOrWhiteSpace(forwardedFor))
        {
            return forwardedFor.ToString().Split(',')[0].Trim();
        }
        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }

    private (string? userId, string? role) ResolveCaller()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = RoleHierarchy.GetEffectiveRole(User);
        return (userId, role.Trim().ToLowerInvariant());
    }

    private async Task<Exam> GetOrCreateDefaultExamAsync(string pathway, CancellationToken cancellationToken)
    {
        var normalizedPathway = string.Equals(pathway, "pn", StringComparison.OrdinalIgnoreCase) ? "pn" : "rn";
        var exam = await _context.Exams.FirstOrDefaultAsync(e => e.Pathway == normalizedPathway, cancellationToken);

        if (exam == null)
        {
            exam = new Exam
            {
                Id = $"exam_{normalizedPathway}_adaptive_cat",
                Title = normalizedPathway == "pn" ? "NCLEX-PN Adaptive CAT" : "NCLEX-RN Adaptive CAT",
                Description = "Standard adaptive computerized exam simulation",
                Pathway = normalizedPathway,
                ExamType = ExamType.CAT,
                TimeLimitMinutes = 300,
                PassingScorePercent = 75.0m,
                IsPublished = true,
                LifecycleState = ExamLifecycleState.Published,
                ConcurrencyToken = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Exams.Add(exam);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return exam;
    }

    private async Task<Exam> GetOrCreateExamAsync(string pathway, ExamType examType, CancellationToken cancellationToken)
    {
        var normalizedPathway = string.Equals(pathway, "pn", StringComparison.OrdinalIgnoreCase) ? "pn" : "rn";
        var prefix = examType switch
        {
            ExamType.DiagnosticReadiness => $"exam_{normalizedPathway}_diagnostic_rat",
            ExamType.Practice => $"exam_{normalizedPathway}_practice",
            _ => $"exam_{normalizedPathway}_adaptive_cat"
        };

        var exam = await _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.ExamQuestions)
                .ThenInclude(eq => eq.Question)
                    .ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(e => e.Id == prefix || (e.Pathway == normalizedPathway && e.ExamType == examType), cancellationToken);

        if (exam == null)
        {
            exam = new Exam
            {
                Id = prefix,
                Title = examType switch
                {
                    ExamType.DiagnosticReadiness => normalizedPathway == "pn" ? "NCLEX-PN Diagnostic Readiness Assessment (RAT)" : "NCLEX-RN Diagnostic Readiness Assessment (RAT)",
                    ExamType.Practice => normalizedPathway == "pn" ? "NCLEX-PN Practice Examination" : "NCLEX-RN Practice Examination",
                    _ => normalizedPathway == "pn" ? "NCLEX-PN Adaptive CAT" : "NCLEX-RN Adaptive CAT"
                },
                Description = examType switch
                {
                    ExamType.DiagnosticReadiness => "Comprehensive diagnostic assessment measuring readiness for the official NCLEX examination.",
                    ExamType.Practice => "Flexible practice examination drawn from published clinical items.",
                    _ => "Standard adaptive computerized exam simulation"
                },
                Pathway = normalizedPathway,
                ExamType = examType,
                TimeLimitMinutes = examType switch
                {
                    ExamType.DiagnosticReadiness => 150,
                    ExamType.Practice => 0,
                    _ => 300
                },
                PassingScorePercent = 75.0m,
                IsPublished = true,
                LifecycleState = ExamLifecycleState.Published,
                ConcurrencyToken = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Exams.Add(exam);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return exam;
    }

    private static List<int> ResolveSyncSelectedIndices(SyncAttemptQuestionItem? q)
    {
        if (q == null)
        {
            return new List<int>();
        }

        if (q.UserAnswerIndices != null && q.UserAnswerIndices.Count > 0)
        {
            return q.UserAnswerIndices;
        }

        if (q.UserAnswerIndex.HasValue)
        {
            return new List<int> { q.UserAnswerIndex.Value };
        }

        return new List<int>();
    }

    private static string GetPerformanceTier(decimal scorePercent)
    {
        return scorePercent >= 75m ? "Very High" :
               scorePercent >= 65m ? "High" :
               scorePercent >= 55m ? "Borderline" : "Low";
    }

    [HttpGet]
    public async Task<IActionResult> GetAttempts([FromQuery] string? userId = null, CancellationToken cancellationToken = default)
    {
        var caller = ResolveCaller();
        if (string.IsNullOrWhiteSpace(caller.userId))
        {
            return Unauthorized(new { success = false, error = "Authentication required." });
        }

        var isPrivileged = AdminRoles.Contains(caller.role ?? "");
        if (!string.IsNullOrWhiteSpace(userId) && !string.Equals(userId, caller.userId, StringComparison.Ordinal) && !isPrivileged)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "Forbidden: Cannot access another candidate's attempts." });
        }

        var targetUserId = string.IsNullOrWhiteSpace(userId)
            ? caller.userId
            : isPrivileged
                ? userId
                : caller.userId;

        Console.WriteLine($"DEBUG GetAttempts callerUser={caller.userId} targetUser={targetUserId} role={caller.role} isPrivileged={isPrivileged} queryUser={userId}");

        var attempts = await _context.ExamAttempts
            .AsNoTracking()
            .Include(ea => ea.Exam)
            .Include(ea => ea.Responses)
            .Where(ea => string.Equals(ea.UserId, targetUserId, StringComparison.Ordinal))
            .OrderByDescending(ea => ea.StartedAt)
            .ToListAsync(cancellationToken);

        Console.WriteLine($"DEBUG attempts count={attempts.Count}");

        var dtos = attempts.Select(a =>
        {
            var correctCount = a.Responses != null ? a.Responses.Count(r => r.IsCorrect) : 0;
            var totalCount = a.Responses != null ? a.Responses.Count : 0;
            var duration = a.CompletedAt.HasValue && a.CompletedAt.Value >= a.StartedAt
                ? (int)Math.Max(1, Math.Min(1440, (a.CompletedAt.Value - a.StartedAt).TotalMinutes))
                : 0;

            var attemptType = a.Exam != null
                ? (a.Exam.ExamType == ExamType.DiagnosticReadiness ? "rat" : (a.Exam.ExamType == ExamType.Practice ? "practice" : "tutored_cat"))
                : "tutored_cat";

            return new AttemptSummaryDto
            {
                Id = a.Id,
                UserId = a.UserId,
                ExamId = a.ExamId ?? string.Empty,
                Name = a.Exam?.Title ?? "Adaptive Practice Assessment",
                Type = attemptType,
                Status = a.Status.ToString(),
                ScorePercent = a.ScorePercent,
                PerformanceTier = GetPerformanceTier(a.ScorePercent),
                Passed = a.Passed,
                TotalQuestions = totalCount,
                CorrectCount = correctCount,
                DurationMinutes = duration,
                StartedAt = a.StartedAt,
                CompletedAt = a.CompletedAt,
                ResponseCount = totalCount
            };
        }).ToList();

        return Ok(new { success = true, attempts = dtos });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAttemptById(string id, CancellationToken cancellationToken)
    {
        var caller = ResolveCaller();
        if (string.IsNullOrWhiteSpace(caller.userId))
        {
            return Unauthorized(new { success = false, error = "Authentication required." });
        }

        var attempt = await _context.ExamAttempts
            .Include(ea => ea.Exam)
                .ThenInclude(e => e!.Examination)
            .Include(ea => ea.Responses)
            .FirstOrDefaultAsync(ea => ea.Id == id, cancellationToken);

        if (attempt == null)
        {
            return NotFound(new { success = false, error = "Assessment attempt not found." });
        }

        var isPrivileged = AdminRoles.Contains(caller.role ?? "");
        if (!string.Equals(attempt.UserId, caller.userId, StringComparison.Ordinal) && !isPrivileged)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "Forbidden: Cannot view another candidate's assessment attempt." });
        }

        // Hard Pilot Entitlement Enforcement Boundary (Phase 7.9.2 Work Package B)
        // If attempt is InProgress and entitlement has expired since start, return 403 Forbidden with ENTITLEMENT_EXPIRED.
        // Attempt is NOT deleted; candidate work is preserved.
        if (attempt.Status == AttemptStatus.InProgress && _entitlementService != null)
        {
            var entitlement = await _entitlementService.EvaluateExamAccessAsync(
                caller.userId,
                attempt.Exam?.Pathway,
                attempt.ExamId,
                GetClientIpAddress(),
                HttpContext.TraceIdentifier,
                cancellationToken);

            if (!entitlement.IsEntitled)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    errorCode = entitlement.ErrorCode,
                    error = entitlement.Reason,
                    entitlementStatus = entitlement.Status
                });
            }
        }

        // Candidate-facing DTO contract: full EF entities are never serialized.
        // Correctness/scores are disclosed only after authoritative finalization and subject to ReviewPolicy.
        var isCompleted = attempt.Status == AttemptStatus.Completed;
        var totalResponses = attempt.Responses.Count;
        var ungradedCount = attempt.Responses.Count(r => r.GradingState == ResponseGradingState.Ungraded);
        var duration = attempt.CompletedAt.HasValue
            ? (int)Math.Max(1, (attempt.CompletedAt.Value - attempt.StartedAt).TotalMinutes)
            : (int)Math.Max(1, (DateTime.UtcNow - attempt.StartedAt).TotalMinutes);

        var reviewPolicy = attempt.Exam?.ReviewPolicy ?? "AfterExamSubmission";
        var showRationales = attempt.Exam?.ShowRationales ?? true;
        var showScore = attempt.Exam?.ShowScoreImmediately ?? true;

        bool canShowRationales = isCompleted && showRationales && (
            string.Equals(reviewPolicy, "Immediate", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(reviewPolicy, "AfterExamSubmission", StringComparison.OrdinalIgnoreCase) ||
            (string.Equals(reviewPolicy, "AfterDeadline", StringComparison.OrdinalIgnoreCase) &&
             attempt.Exam != null && attempt.Exam.TimeLimitMinutes > 0 &&
             DateTime.UtcNow >= attempt.StartedAt.AddMinutes(attempt.Exam.TimeLimitMinutes))
        );
        if (string.Equals(reviewPolicy, "Never", StringComparison.OrdinalIgnoreCase))
        {
            canShowRationales = false;
        }

        if (isCompleted && canShowRationales && _entitlementService != null)
        {
            var entitlement = await _entitlementService.EvaluateExamAccessAsync(
                caller.userId,
                attempt.Exam?.Pathway,
                attempt.ExamId,
                GetClientIpAddress(),
                HttpContext.TraceIdentifier,
                cancellationToken);

            if (!entitlement.IsEntitled)
            {
                canShowRationales = false;
            }
        }

        object? metadataSnapshotObj = null;
        if (!string.IsNullOrWhiteSpace(attempt.MetadataSnapshot))
        {
            try
            {
                metadataSnapshotObj = JsonSerializer.Deserialize<JsonElement>(attempt.MetadataSnapshot);
            }
            catch
            {
                metadataSnapshotObj = null;
            }
        }

        if (metadataSnapshotObj == null)
        {
            // Legacy fallback specification (Decision 3 & 15)
            metadataSnapshotObj = new
            {
                schemaVersion = 1,
                snapshotSource = "legacy_fallback",
                snapshotCreatedAtUtc = attempt.StartedAt,
                examination = new
                {
                    id = attempt.Exam?.Examination?.Id ?? attempt.Exam?.ExaminationId ?? attempt.ExamId,
                    code = attempt.Exam?.Examination?.Code ?? (attempt.Exam?.Pathway == "pn" ? "PN-EX-000000" : "RN-EX-000000"),
                    pathway = attempt.Exam?.Pathway ?? "rn",
                    title = attempt.Exam?.Examination?.Title ?? attempt.Exam?.Title ?? "Legacy Examination"
                },
                revision = new
                {
                    id = attempt.ExamId,
                    revisionNumber = attempt.Exam?.RevisionNumber ?? 1,
                    title = attempt.Exam?.Title ?? "Legacy Exam",
                    description = attempt.Exam?.Description ?? string.Empty,
                    examType = (int)(attempt.Exam?.ExamType ?? ExamType.CAT),
                    timeLimitMinutes = attempt.Exam?.TimeLimitMinutes ?? 0,
                    passingScorePercent = attempt.Exam?.PassingScorePercent ?? 75.0m,
                    publishedAt = attempt.Exam?.PublishedAt ?? attempt.Exam?.CreatedAt
                },
                deliverySettings = new
                {
                    shuffleQuestions = true,
                    allowReview = true
                }
            };
        }

        var detail = new CandidateAttemptDetailDto
        {
            Id = attempt.Id,
            UserId = attempt.UserId,
            ExamId = attempt.ExamId,
            Name = attempt.Exam?.Title ?? "Adaptive Practice CAT",
            Type = attempt.Exam?.ExamType == ExamType.CAT ? "tutored_cat" : "rat",
            Status = attempt.Status.ToString(),
            ScorePercent = isCompleted ? attempt.ScorePercent : null,
            Passed = isCompleted ? attempt.Passed : null,
            PerformanceTier = isCompleted ? GetPerformanceTier(attempt.ScorePercent) : null,
            CorrectCount = isCompleted ? attempt.Responses.Count(r => r.IsCorrect) : null,
            TotalResponses = totalResponses,
            DurationMinutes = duration,
            StartedAt = attempt.StartedAt,
            CompletedAt = attempt.CompletedAt,
            GradingIncomplete = ungradedCount > 0,
            MetadataSnapshot = isCompleted ? metadataSnapshotObj : null,
            Responses = attempt.Responses
                .OrderBy(r => r.AnsweredAt)
                .Select(r => new CandidateAttemptResponseDto
                {
                    QuestionId = r.QuestionId,
                    SelectedOptionsJson = r.SelectedOptionsJson,
                    TimeSpentSeconds = r.TimeSpentSeconds,
                    AnsweredAt = r.AnsweredAt,
                    IsCorrect = isCompleted ? r.IsCorrect : null,
                    ScoreAwarded = isCompleted ? r.ScoreAwarded : null,
                })
                .ToList(),
        };

        // ── Phase 3 Question Delivery (Protected Answer Keys) ──
        if (metadataSnapshotObj is JsonElement jsonEl && jsonEl.TryGetProperty("questions", out var questionsEl) && questionsEl.ValueKind == JsonValueKind.Array)
        {
            var qNum = 1;
            foreach (var qObj in questionsEl.EnumerateArray())
            {
                var qId = qObj.TryGetProperty("id", out var idProp) ? idProp.GetString() ?? "" : "";
                var stem = qObj.TryGetProperty("stem", out var stemProp) ? stemProp.GetString() ?? "" : "";
                var qType = qObj.TryGetProperty("questionType", out var typeProp) ? typeProp.GetString() ?? "" : "";
                var domain = qObj.TryGetProperty("clientNeedName", out var domProp) ? domProp.GetString() : null;
                var subdomain = qObj.TryGetProperty("topicName", out var subProp) ? subProp.GetString() : null;
                var mediaUrl = qObj.TryGetProperty("mediaUrl", out var medProp) ? medProp.GetString() : null;
                var explanation = qObj.TryGetProperty("explanation", out var expProp) ? expProp.GetString() : null;

                var optionsList = new List<CandidateQuestionOptionDto>();
                var correctIndices = new List<int>();

                if (qObj.TryGetProperty("options", out var optsProp) && optsProp.ValueKind == JsonValueKind.Array)
                {
                    var optIdx = 0;
                    foreach (var opt in optsProp.EnumerateArray())
                    {
                        var optId = opt.TryGetProperty("id", out var oIdProp) ? oIdProp.GetString() ?? "" : "";
                        var optText = opt.TryGetProperty("text", out var oTextProp) ? oTextProp.GetString() ?? "" : "";
                        var optMed = opt.TryGetProperty("mediaUrl", out var oMedProp) ? oMedProp.GetString() : null;
                        var optCorrect = opt.TryGetProperty("isCorrect", out var oCorrProp) && oCorrProp.GetBoolean();

                        optionsList.Add(new CandidateQuestionOptionDto
                        {
                            Id = optId,
                            Index = optIdx,
                            Text = optText,
                            MediaUrl = optMed
                        });

                        if (optCorrect)
                        {
                            correctIndices.Add(optIdx);
                        }
                        optIdx++;
                    }
                }

                detail.Questions.Add(new CandidateQuestionDto
                {
                    Id = qId,
                    QuestionNumber = qNum++,
                    Stem = stem,
                    QuestionType = qType,
                    Domain = domain,
                    Subdomain = subdomain,
                    MediaUrl = mediaUrl,
                    Options = optionsList,
                    CorrectAnswerIndices = canShowRationales ? correctIndices : null,
                    Rationale = canShowRationales ? explanation : null
                });
            }
        }

        if (detail.Questions.Count == 0)
        {
            var attemptQuestions = await _context.ExamAttemptQuestions
                .Include(eaq => eaq.Question)
                    .ThenInclude(q => q.Options)
                .Include(eaq => eaq.Question.ClientNeed)
                .Include(eaq => eaq.Question.Topic)
                .Where(eaq => eaq.ExamAttemptId == attempt.Id)
                .OrderBy(eaq => eaq.DisplayOrder)
                .ToListAsync(cancellationToken);

            if (attemptQuestions.Count > 0)
            {
                var qNum = 1;
                foreach (var aq in attemptQuestions)
                {
                    var q = aq.Question;
                    if (q == null) continue;

                    var options = q.Options.OrderBy(o => o.DisplayOrder).ToList();
                    var correctIndices = isCompleted
                        ? options.Select((o, idx) => o.IsCorrect ? idx : -1).Where(i => i >= 0).ToList()
                        : null;

                    detail.Questions.Add(new CandidateQuestionDto
                    {
                        Id = q.Id,
                        QuestionNumber = qNum++,
                        Stem = q.Stem,
                        QuestionType = q.QuestionTypeKey,
                        Domain = q.ClientNeed?.Name ?? q.Topic?.Title,
                        Subdomain = q.Topic?.Title,
                        MediaUrl = null,
                        Options = options.Select(o => new CandidateQuestionOptionDto
                        {
                            Id = o.Id,
                            Index = o.DisplayOrder,
                            Text = o.Content,
                            MediaUrl = o.MediaUrl
                        }).ToList(),
                        CorrectAnswerIndices = canShowRationales ? correctIndices : null,
                        Rationale = canShowRationales ? q.OverallRationale : null
                    });
                }
            }
        }

        return Ok(new { success = true, attempt = detail });
    }

    [HttpGet("{id}/questions")]
    public async Task<IActionResult> GetAttemptQuestions(string id, CancellationToken cancellationToken)
    {
        var actionResult = await GetAttemptById(id, cancellationToken);
        if (actionResult is OkObjectResult okResult && okResult.Value is not null)
        {
            var attemptProp = okResult.Value.GetType().GetProperty("attempt")?.GetValue(okResult.Value) as CandidateAttemptDetailDto;
            if (attemptProp != null)
            {
                return Ok(new { success = true, questions = attemptProp.Questions });
            }
        }
        return actionResult;
    }

    [HttpPost("{id}/reauthenticate")]
    [AllowAnonymous]
    public async Task<IActionResult> ReauthenticateAttempt(string id, [FromBody] ReauthenticateAttemptRequest request, CancellationToken cancellationToken)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new
            {
                success = false,
                errorCode = "INVALID_REQUEST",
                error = "Password is required for reauthentication."
            });
        }

        var attempt = await _context.ExamAttempts
            .Include(ea => ea.Exam)
            .Include(ea => ea.Responses)
            .Include(ea => ea.User)
                .ThenInclude(u => u!.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(ea => ea.Id == id, cancellationToken);

        if (attempt == null)
        {
            return NotFound(new
            {
                success = false,
                errorCode = "ATTEMPT_NOT_FOUND",
                error = "Assessment attempt not found."
            });
        }

        // Shared Server-Side Rate Limiting (Phase 7.9.2 Work Package D)
        // Keyed on attempt ID and user ID to prevent IP-rotation circumvention.
        var attemptRateLimitKey = $"reauth_attempt:{id}";
        var userRateLimitKey = $"reauth_user:{attempt.UserId}";
        var clientIp = GetClientIpAddress();
        var inMemoryKey = $"reauth:{id}:{clientIp ?? "unknown"}";

        if (_rateLimitingService != null)
        {
            var attemptCheck = await _rateLimitingService.CheckRateLimitAsync(attemptRateLimitKey, 5, TimeSpan.FromMinutes(15), TimeSpan.FromMinutes(15), cancellationToken);
            if (attemptCheck.IsRateLimited)
            {
                Response.Headers.Append("Retry-After", attemptCheck.RetryAfterSeconds.ToString());
                return StatusCode(StatusCodes.Status429TooManyRequests, new
                {
                    success = false,
                    errorCode = "RATE_LIMIT_EXCEEDED",
                    error = $"Too many failed reauthentication attempts. Please wait {attemptCheck.RetryAfterSeconds} seconds before trying again."
                });
            }

            var userCheck = await _rateLimitingService.CheckRateLimitAsync(userRateLimitKey, 5, TimeSpan.FromMinutes(15), TimeSpan.FromMinutes(15), cancellationToken);
            if (userCheck.IsRateLimited)
            {
                Response.Headers.Append("Retry-After", userCheck.RetryAfterSeconds.ToString());
                return StatusCode(StatusCodes.Status429TooManyRequests, new
                {
                    success = false,
                    errorCode = "RATE_LIMIT_EXCEEDED",
                    error = $"Too many failed reauthentication attempts. Please wait {userCheck.RetryAfterSeconds} seconds before trying again."
                });
            }
        }
        else
        {
            if (IsReauthRateLimited(inMemoryKey, out var retryAfter))
            {
                Response.Headers.Append("Retry-After", retryAfter.ToString());
                return StatusCode(StatusCodes.Status429TooManyRequests, new
                {
                    success = false,
                    errorCode = "RATE_LIMIT_EXCEEDED",
                    error = $"Too many failed reauthentication attempts. Please wait {retryAfter} seconds before trying again."
                });
            }
        }

        // Ownership enforcement: candidate must be the owner of the attempt
        var caller = ResolveCaller();
        if (!string.IsNullOrWhiteSpace(caller.userId) &&
            !string.Equals(caller.userId, attempt.UserId, StringComparison.Ordinal))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                errorCode = "ATTEMPT_OWNERSHIP_MISMATCH",
                error = "Forbidden: Cannot reauthenticate another candidate's assessment attempt."
            });
        }

        if (!string.IsNullOrWhiteSpace(request.Email) &&
            attempt.User != null &&
            !string.Equals(attempt.User.Email, request.Email.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                errorCode = "ATTEMPT_OWNERSHIP_MISMATCH",
                error = "Forbidden: Cannot reauthenticate another candidate's assessment attempt."
            });
        }

        if (attempt.Status != AttemptStatus.InProgress)
        {
            return StatusCode(StatusCodes.Status409Conflict, new
            {
                success = false,
                errorCode = "ATTEMPT_NOT_IN_PROGRESS",
                error = "Cannot resume an attempt that has already been completed or abandoned."
            });
        }

        // Server-Authoritative Deadline enforcement
        if (attempt.Exam != null && attempt.Exam.TimeLimitMinutes > 0)
        {
            var deadlineUtc = attempt.StartedAt.AddMinutes(attempt.Exam.TimeLimitMinutes);
            if (DateTime.UtcNow >= deadlineUtc)
            {
                attempt.Status = AttemptStatus.Completed;
                attempt.CompletedAt = deadlineUtc;
                await _context.SaveChangesAsync(cancellationToken);

                return StatusCode(StatusCodes.Status410Gone, new
                {
                    success = false,
                    errorCode = "ATTEMPT_EXPIRED",
                    error = "The time limit for this examination has expired. Continuation is not permitted."
                });
            }
        }

        if (attempt.User == null || !attempt.User.IsActive)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                errorCode = "ACCOUNT_INACTIVE",
                error = "Account is inactive or disabled."
            });
        }

        if (string.Equals(attempt.User.AccountStatus, "Suspended", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                errorCode = "ACCOUNT_SUSPENDED",
                error = $"Account is suspended: {attempt.User.SuspensionReason ?? "Administrative suspension"}.",
                requiresAdminIntervention = true
            });
        }

        // Two-Tier Reauthentication Policy (Phase 7.9.2 Work Package C)
        // Tier 1: Involuntary/Transient Session Interruption (idle timeout, heartbeat expiry, multi-tab lock) -> recoverable via password.
        // Tier 2: Deliberate Administrative Revocation or Account Suspension -> strictly blocked with ADMIN_REVOCATION_HOLD.
        var latestRevokedSession = await _context.UserSessions
            .Where(s => s.UserId == attempt.UserId && s.Revoked)
            .OrderByDescending(s => s.RevokedAt ?? s.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (latestRevokedSession != null && !string.IsNullOrWhiteSpace(latestRevokedSession.RevocationReason))
        {
            var reason = latestRevokedSession.RevocationReason.Trim();
            bool isAdminRevocation = reason.StartsWith("Admin", StringComparison.OrdinalIgnoreCase) ||
                                     reason.StartsWith("SecurityViolation", StringComparison.OrdinalIgnoreCase) ||
                                     reason.StartsWith("PolicyEnforcement", StringComparison.OrdinalIgnoreCase) ||
                                     string.Equals(reason, "AdminRevoked", StringComparison.OrdinalIgnoreCase) ||
                                     string.Equals(reason, "AdminRevokeAll", StringComparison.OrdinalIgnoreCase);

            if (isAdminRevocation)
            {
                _context.AuditLogs.Add(new AuditLog
                {
                    ActorId = attempt.UserId,
                    Action = "ReauthenticationBlockedAdminHold",
                    EntityType = "ExamAttempt",
                    EntityId = attempt.Id,
                    Description = $"Reauthentication blocked for user {attempt.UserId}: Session was administratively revoked ({reason}).",
                    Outcome = "Forbidden",
                    Severity = "Warning",
                    Timestamp = DateTime.UtcNow
                });
                await _context.SaveChangesAsync(cancellationToken);

                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    errorCode = "ADMIN_REVOCATION_HOLD",
                    error = "Session was administratively revoked. Reauthentication requires administrative intervention.",
                    requiresAdminIntervention = true
                });
            }
        }

        // Hard Pilot Entitlement Enforcement on Resumption (Work Package B)
        if (_entitlementService != null)
        {
            var entitlement = await _entitlementService.EvaluateExamAccessAsync(
                attempt.UserId,
                attempt.Exam?.Pathway,
                attempt.ExamId,
                GetClientIpAddress(),
                HttpContext.TraceIdentifier,
                cancellationToken);

            if (!entitlement.IsEntitled)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    errorCode = entitlement.ErrorCode,
                    error = entitlement.Reason,
                    entitlementStatus = entitlement.Status
                });
            }
        }

        // Authoritative credential verification
        var verifyResult = _passwordHasher.VerifyHashedPassword(attempt.User, attempt.User.PasswordHash, request.Password);
        if (verifyResult == PasswordVerificationResult.Failed)
        {
            if (_rateLimitingService != null)
            {
                await _rateLimitingService.RecordFailedAttemptAsync(attemptRateLimitKey, 5, TimeSpan.FromMinutes(15), TimeSpan.FromMinutes(15), cancellationToken);
                await _rateLimitingService.RecordFailedAttemptAsync(userRateLimitKey, 5, TimeSpan.FromMinutes(15), TimeSpan.FromMinutes(15), cancellationToken);
            }
            else
            {
                RecordFailedReauthAttempt(inMemoryKey);
            }
            return Unauthorized(new
            {
                success = false,
                errorCode = "INVALID_CREDENTIALS",
                error = "Invalid password. Reauthentication failed."
            });
        }

        // On successful credential verification, clear shared rate limits
        if (_rateLimitingService != null)
        {
            await _rateLimitingService.ResetRateLimitAsync(attemptRateLimitKey, cancellationToken);
            await _rateLimitingService.ResetRateLimitAsync(userRateLimitKey, cancellationToken);
        }
        else
        {
            ClearFailedReauthAttempts(inMemoryKey);
        }

        // Create fresh replacement session via SessionSecurityService
        string? sessionId = null;
        string? token = null;

        var primaryRole = attempt.User != null ? RoleHierarchy.GetEffectiveRole(attempt.User) : "candidate";

        if (_sessionSecurityService != null)
        {
            var ip = GetClientIpAddress();
            var ua = Request.Headers.UserAgent.ToString();
            var sessionResult = await _sessionSecurityService.CreateOrRotateSessionAsync(
                attempt.User,
                primaryRole,
                request.ClientId,
                ip,
                ua,
                fingerprintHash: null,
                rememberMe: false,
                cancellationToken: cancellationToken);

            if (!sessionResult.Success || sessionResult.Session == null)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    errorCode = sessionResult.ErrorCode ?? "SESSION_CREATION_FAILED",
                    error = sessionResult.ErrorMessage ?? "Failed to create authentication session."
                });
            }

            sessionId = sessionResult.Session.Id;
            token = sessionResult.Token;
        }

        // Calculate authoritative remaining seconds and deadline
        DateTime? deadline = null;
        int? remainingSeconds = null;
        if (attempt.Exam != null && attempt.Exam.TimeLimitMinutes > 0)
        {
            deadline = attempt.StartedAt.AddMinutes(attempt.Exam.TimeLimitMinutes);
            remainingSeconds = Math.Max(0, (int)(deadline.Value - DateTime.UtcNow).TotalSeconds);
        }

        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = attempt.UserId,
            Action = "ExamAttemptReauthenticated",
            EntityType = "ExamAttempt",
            EntityId = attempt.Id,
            Description = $"Learner reauthenticated during active attempt '{attempt.Id}'. Authoritative timer: {(remainingSeconds.HasValue ? remainingSeconds.Value + "s remaining" : "untimed")}.",
            Outcome = "Success",
            Timestamp = DateTime.UtcNow
        });
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            sessionId,
            token,
            user = new
            {
                id = attempt.User.Id,
                email = attempt.User.Email,
                name = attempt.User.DisplayName,
                displayName = attempt.User.DisplayName,
                role = primaryRole,
                pathway = attempt.User.Pathway
            },
            attempt = new
            {
                id = attempt.Id,
                startedAt = attempt.StartedAt,
                timeLimitMinutes = attempt.Exam?.TimeLimitMinutes ?? 0,
                deadlineUtc = deadline,
                remainingSeconds,
                status = attempt.Status.ToString(),
                totalResponses = attempt.Responses.Count,
                responses = attempt.Responses.OrderBy(r => r.AnsweredAt).Select(r => new
                {
                    questionId = r.QuestionId,
                    selectedOptionsJson = r.SelectedOptionsJson,
                    timeSpentSeconds = r.TimeSpentSeconds,
                    answeredAt = r.AnsweredAt
                }).ToList()
            }
        });
    }

    [HttpPost]
    public async Task<IActionResult> StartAttempt([FromBody] StartAttemptRequest request, CancellationToken cancellationToken)
    {
        var caller = ResolveCaller();
        if (string.IsNullOrWhiteSpace(caller.userId))
        {
            return Unauthorized(new { success = false, error = "Authentication required." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == caller.userId, cancellationToken);
        if (user != null && !user.IsActive)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                errorCode = "ACCOUNT_INACTIVE",
                error = "Account is inactive or disabled."
            });
        }

        var normalizedPathway = !string.IsNullOrWhiteSpace(request?.Pathway)
            ? (string.Equals(request.Pathway, "pn", StringComparison.OrdinalIgnoreCase) ? "pn" : "rn")
            : (string.Equals(user?.Pathway, "pn", StringComparison.OrdinalIgnoreCase) ? "pn" : "rn");

        // Hard Pilot Entitlement Enforcement Boundary (Phase 7.9.2 Work Package B)
        if (_entitlementService != null)
        {
            var entitlement = await _entitlementService.EvaluateExamAccessAsync(
                caller.userId,
                normalizedPathway,
                request?.ExamId,
                GetClientIpAddress(),
                HttpContext.TraceIdentifier,
                cancellationToken);

            if (!entitlement.IsEntitled)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    errorCode = entitlement.ErrorCode,
                    error = entitlement.Reason,
                    entitlementStatus = entitlement.Status
                });
            }
        }

        Exam exam;
        if (!string.IsNullOrWhiteSpace(request?.ExamId))
        {
            var foundExam = await _context.Exams
                .Include(e => e.Examination)
                .Include(e => e.ExamQuestions)
                    .ThenInclude(eq => eq.Question)
                        .ThenInclude(q => q.Options)
                .FirstOrDefaultAsync(e => e.Id == request.ExamId, cancellationToken);

            if (foundExam == null)
            {
                return NotFound(new { success = false, error = $"Examination '{request.ExamId}' not found." });
            }

            if (foundExam.LifecycleState != ExamLifecycleState.Published && !foundExam.IsPublished)
            {
                return StatusCode(StatusCodes.Status422UnprocessableEntity, new
                {
                    success = false,
                    error = "ExamNotAvailable",
                    message = "Examination is not published for new attempts."
                });
            }

            if (!foundExam.IsAvailable)
            {
                return StatusCode(StatusCodes.Status422UnprocessableEntity, new
                {
                    success = false,
                    errorCode = "EXAM_UNAVAILABLE",
                    error = "This examination is currently disabled or unavailable."
                });
            }

            var nowUtc = DateTime.UtcNow;
            if (foundExam.AvailableFrom.HasValue && nowUtc < foundExam.AvailableFrom.Value)
            {
                return StatusCode(StatusCodes.Status422UnprocessableEntity, new
                {
                    success = false,
                    errorCode = "EXAM_NOT_YET_AVAILABLE",
                    error = $"This examination is not scheduled to become available until {foundExam.AvailableFrom.Value:u}."
                });
            }

            if (foundExam.AvailableTo.HasValue && nowUtc > foundExam.AvailableTo.Value)
            {
                return StatusCode(StatusCodes.Status422UnprocessableEntity, new
                {
                    success = false,
                    errorCode = "EXAM_AVAILABILITY_EXPIRED",
                    error = $"The availability window for this examination expired at {foundExam.AvailableTo.Value:u}."
                });
            }

            if (foundExam.MaxAttemptsAllowed.HasValue)
            {
                var completedCount = await _context.ExamAttempts
                    .CountAsync(ea => ea.UserId == caller.userId && ea.ExamId == foundExam.Id && ea.Status == AttemptStatus.Completed, cancellationToken);
                if (completedCount >= foundExam.MaxAttemptsAllowed.Value)
                {
                    return StatusCode(StatusCodes.Status422UnprocessableEntity, new
                    {
                        success = false,
                        errorCode = "MAX_ATTEMPTS_REACHED",
                        error = $"Maximum permitted attempts ({foundExam.MaxAttemptsAllowed.Value}) reached for this examination."
                    });
                }
            }

            if (foundExam.RetakeCooldownHours > 0)
            {
                var lastCompleted = await _context.ExamAttempts
                    .Where(ea => ea.UserId == caller.userId && ea.ExamId == foundExam.Id && ea.Status == AttemptStatus.Completed && ea.CompletedAt.HasValue)
                    .OrderByDescending(ea => ea.CompletedAt)
                    .Select(ea => ea.CompletedAt)
                    .FirstOrDefaultAsync(cancellationToken);

                if (lastCompleted.HasValue && nowUtc < lastCompleted.Value.AddHours(foundExam.RetakeCooldownHours))
                {
                    var unlockTime = lastCompleted.Value.AddHours(foundExam.RetakeCooldownHours);
                    return StatusCode(StatusCodes.Status422UnprocessableEntity, new
                    {
                        success = false,
                        errorCode = "RETAKE_COOLDOWN_ACTIVE",
                        error = $"Retake cooldown active. You can attempt this examination again after {unlockTime:u}."
                    });
                }
            }

            exam = foundExam;
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(request?.TestType))
            {
                var targetExamType = string.Equals(request.TestType, "rat", StringComparison.OrdinalIgnoreCase)
                    ? ExamType.DiagnosticReadiness
                    : (string.Equals(request.TestType, "cat", StringComparison.OrdinalIgnoreCase) || string.Equals(request.TestType, "tutored_cat", StringComparison.OrdinalIgnoreCase)
                        ? ExamType.CAT
                        : ExamType.Practice);

                exam = await GetOrCreateExamAsync(normalizedPathway, targetExamType, cancellationToken);
            }
            else
            {
                exam = await GetOrCreateDefaultExamAsync(normalizedPathway, cancellationToken);
            }
        }

        // ── Phase 3 Concurrency Guard ──
        var existingAttempt = await _context.ExamAttempts
            .Include(ea => ea.Exam)
            .Include(ea => ea.Responses)
            .FirstOrDefaultAsync(ea => ea.UserId == caller.userId && ea.ExamId == exam.Id && ea.Status == AttemptStatus.InProgress, cancellationToken);

        if (existingAttempt != null)
        {
            if (existingAttempt.Exam != null && existingAttempt.Exam.TimeLimitMinutes > 0)
            {
                var deadline = existingAttempt.StartedAt.AddMinutes(existingAttempt.Exam.TimeLimitMinutes);
                if (DateTime.UtcNow >= deadline)
                {
                    existingAttempt.Status = AttemptStatus.Completed;
                    existingAttempt.CompletedAt = deadline;
                    await _context.SaveChangesAsync(cancellationToken);
                }
                else
                {
                    return Ok(new
                    {
                        success = true,
                        attemptId = existingAttempt.Id,
                        examId = exam.Id,
                        startedAt = existingAttempt.StartedAt,
                        resumed = true,
                        message = "Resumed active in-progress assessment attempt."
                    });
                }
            }
            else
            {
                return Ok(new
                {
                    success = true,
                    attemptId = existingAttempt.Id,
                    examId = exam.Id,
                    startedAt = existingAttempt.StartedAt,
                    resumed = true,
                    message = "Resumed active in-progress assessment attempt."
                });
            }
        }

        // ── Phase 3 Question Selection Engine ──
        List<SelectedQuestionItem> selectedQuestions = new();

        if (exam.ExamQuestions != null && exam.ExamQuestions.Count > 0)
        {
            selectedQuestions = exam.ExamQuestions
                .OrderBy(eq => eq.DisplayOrder)
                .Where(eq => eq.Question != null)
                .Select((eq, idx) => new SelectedQuestionItem
                {
                    Question = eq.Question,
                    DisplayOrder = idx,
                    Options = eq.Question.Options.OrderBy(o => o.DisplayOrder).ToList()
                })
                .ToList();
        }
        else if (_assessmentSelectionService != null)
        {
            var isExplicitCount = request?.QuestionCount.HasValue == true && request.QuestionCount.Value > 0;
            var count = isExplicitCount
                ? request!.QuestionCount!.Value
                : (exam.ExamType == ExamType.DiagnosticReadiness ? 75 : 10);

            var selectionResult = await _assessmentSelectionService.SelectQuestionsAsync(new AssessmentSelectionRequest
            {
                Pathway = exam.Pathway,
                QuestionCount = count,
                ExamType = exam.ExamType,
                ClientNeedId = request?.ClientNeedId,
                TopicId = request?.TopicId
            }, cancellationToken);

            if (!selectionResult.Success && !isExplicitCount && exam.ExamType != ExamType.DiagnosticReadiness)
            {
                var availableCount = await _context.Questions
                    .Where(q => q.Status == QuestionStatus.Published && (q.Pathway == exam.Pathway || q.Pathway == "both"))
                    .CountAsync(cancellationToken);

                if (availableCount > 0)
                {
                    selectionResult = await _assessmentSelectionService.SelectQuestionsAsync(new AssessmentSelectionRequest
                    {
                        Pathway = exam.Pathway,
                        QuestionCount = availableCount,
                        ExamType = exam.ExamType,
                        ClientNeedId = request?.ClientNeedId,
                        TopicId = request?.TopicId
                    }, cancellationToken);
                }
            }

            if (!selectionResult.Success)
            {
                var isRatRequested = string.Equals(request?.TestType, "rat", StringComparison.OrdinalIgnoreCase);
                if (isExplicitCount || isRatRequested)
                {
                    return StatusCode(StatusCodes.Status422UnprocessableEntity, new
                    {
                        success = false,
                        errorCode = selectionResult.ErrorCode ?? "SELECTION_FAILED",
                        error = selectionResult.ErrorMessage ?? "Failed to select eligible questions for assessment."
                    });
                }
            }
            else
            {
                selectedQuestions = selectionResult.SelectedQuestions;
            }

            // Ensure Level 1 membership (ExamQuestion) exists for each selected question
            var existingList = await _context.ExamQuestions
                .Where(eq => eq.ExamId == exam.Id)
                .Select(eq => eq.QuestionId)
                .ToListAsync(cancellationToken);
            var existingExamQIds = new HashSet<string>(existingList, StringComparer.Ordinal);

            var newExamQuestions = selectedQuestions
                .Where(sq => !existingExamQIds.Contains(sq.Question.Id))
                .Select(sq => new ExamQuestion
                {
                    Id = "eq_" + Guid.NewGuid().ToString("N"),
                    ExamId = exam.Id,
                    QuestionId = sq.Question.Id,
                    DisplayOrder = sq.DisplayOrder
                })
                .ToList();

            if (newExamQuestions.Count > 0)
            {
                _context.ExamQuestions.AddRange(newExamQuestions);
                await _context.SaveChangesAsync(cancellationToken);
            }
        }
        else
        {
            var fallbackQuestions = await _context.Questions
                .Include(q => q.Options)
                .Include(q => q.ClientNeed)
                .Include(q => q.Topic)
                .Where(q => q.Status == QuestionStatus.Published)
                .Take(request?.QuestionCount > 0 ? request.QuestionCount.Value : 10)
                .ToListAsync(cancellationToken);

            selectedQuestions = fallbackQuestions.Select((q, idx) => new SelectedQuestionItem
            {
                Question = q,
                DisplayOrder = idx,
                Options = q.Options.OrderBy(o => o.DisplayOrder).ToList()
            }).ToList();
        }

        var now = DateTime.UtcNow;

        var snapshotObj = new
        {
            schemaVersion = 1,
            snapshotCreatedAtUtc = now,
            examination = new
            {
                id = exam.Examination?.Id ?? exam.ExaminationId ?? exam.Id,
                code = exam.Examination?.Code ?? (exam.Pathway == "pn" ? "PN-EX-000000" : "RN-EX-000000"),
                pathway = exam.Pathway,
                title = !string.IsNullOrWhiteSpace(request?.Name) ? request.Name : (exam.Examination?.Title ?? exam.Title)
            },
            revision = new
            {
                id = exam.Id,
                revisionNumber = exam.RevisionNumber,
                title = exam.Title,
                description = exam.Description,
                examType = (int)exam.ExamType,
                timeLimitMinutes = exam.TimeLimitMinutes,
                passingScorePercent = exam.PassingScorePercent,
                publishedAt = exam.PublishedAt ?? exam.CreatedAt
            },
            deliverySettings = new
            {
                shuffleQuestions = true,
                allowReview = true
            },
            questions = selectedQuestions.Select(sq => new
            {
                id = sq.Question.Id,
                version = sq.Question.Version,
                stem = sq.Question.Stem,
                questionType = sq.Question.QuestionTypeKey,
                clientNeedId = sq.Question.ClientNeedId,
                clientNeedName = sq.Question.ClientNeed?.Name,
                topicId = sq.Question.TopicId,
                topicName = sq.Question.Topic?.Title,
                mediaUrl = (string?)null,
                explanation = sq.Question.OverallRationale,
                displayOrder = sq.DisplayOrder,
                options = sq.Options.Select(o => new
                {
                    id = o.Id,
                    displayOrder = o.DisplayOrder,
                    text = o.Content,
                    isCorrect = o.IsCorrect,
                    mediaUrl = o.MediaUrl
                }).ToList()
            }).ToList()
        };

        var attempt = new ExamAttempt
        {
            Id = "att_" + Guid.NewGuid().ToString("N"),
            UserId = caller.userId,
            ExamId = exam.Id,
            Status = AttemptStatus.InProgress,
            ScorePercent = 0.0m,
            Passed = false,
            StartedAt = now,
            CompletedAt = null,
            MetadataSnapshot = JsonSerializer.Serialize(snapshotObj)
        };

        _context.ExamAttempts.Add(attempt);
        await _context.SaveChangesAsync(cancellationToken);

        // Record immutable question membership in ExamAttemptQuestions
        await _attemptQuestionService.RecordQuestionMembershipAsync(
            attempt.Id,
            selectedQuestions.Select(sq => sq.Question.Id).ToList(),
            now,
            cancellationToken);

        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = caller.userId,
            Action = "ExamAttemptStarted",
            EntityType = "ExamAttempt",
            EntityId = attempt.Id,
            Description = $"Learner started attempt for exam '{exam.Title}' with {selectedQuestions.Count} question(s).",
            Outcome = "Success",
            Timestamp = now
        });
        await _context.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetAttemptById), new { id = attempt.Id }, new
        {
            success = true,
            attemptId = attempt.Id,
            examId = exam.Id,
            startedAt = attempt.StartedAt,
            questionCount = selectedQuestions.Count
        });
    }

    [HttpPost("{id}/responses")]
    public async Task<IActionResult> SubmitResponse(string id, [FromBody] SubmitAnswerRequest request, CancellationToken cancellationToken)
    {
        var caller = ResolveCaller();
        if (string.IsNullOrWhiteSpace(caller.userId))
        {
            return Unauthorized(new { success = false, error = "Authentication required." });
        }

        var attempt = await _context.ExamAttempts
            .Include(ea => ea.Exam)
            .Include(ea => ea.Responses)
            .FirstOrDefaultAsync(ea => ea.Id == id, cancellationToken);

        if (attempt == null)
        {
            return NotFound(new { success = false, error = "Attempt not found." });
        }

        // Ownership enforcement
        if (!string.Equals(attempt.UserId, caller.userId, StringComparison.Ordinal))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "Forbidden: Cannot record response for another candidate's attempt." });
        }

        // Hard Pilot Entitlement Enforcement Boundary (Phase 7.9.2 Work Package B)
        if (_entitlementService != null)
        {
            var entitlement = await _entitlementService.EvaluateExamAccessAsync(
                caller.userId,
                attempt.Exam?.Pathway,
                attempt.ExamId,
                GetClientIpAddress(),
                HttpContext.TraceIdentifier,
                cancellationToken);

            if (!entitlement.IsEntitled)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    errorCode = entitlement.ErrorCode,
                    error = entitlement.Reason,
                    entitlementStatus = entitlement.Status
                });
            }
        }

        if (attempt.Status != AttemptStatus.InProgress)
        {
            return BadRequest(new { success = false, error = "Cannot add responses to a completed or abandoned attempt." });
        }

        // Server-Authoritative Deadline check
        if (attempt.Exam != null && attempt.Exam.TimeLimitMinutes > 0)
        {
            var deadlineUtc = attempt.StartedAt.AddMinutes(attempt.Exam.TimeLimitMinutes);
            if (DateTime.UtcNow >= deadlineUtc)
            {
                attempt.Status = AttemptStatus.Completed;
                attempt.CompletedAt = deadlineUtc;
                await _context.SaveChangesAsync(cancellationToken);

                return StatusCode(StatusCodes.Status410Gone, new
                {
                    success = false,
                    errorCode = "ATTEMPT_EXPIRED",
                    error = "The time limit for this examination has expired. Further responses cannot be recorded."
                });
            }
        }

        if (request == null || string.IsNullOrWhiteSpace(request.QuestionId))
        {
            return BadRequest(new { success = false, error = "Question ID is required." });
        }

        // Exact attempt-question membership: a question that is not part of the
        // attempt's exam, or was never assigned to this attempt, is rejected.
        var membership = await _attemptQuestionService.ValidateMembershipAsync(attempt, request.QuestionId, cancellationToken);
        if (!membership.IsMember)
        {
            var status = membership.Failure == AttemptQuestionMembershipFailure.QuestionNotFound
                ? StatusCodes.Status404NotFound
                : StatusCodes.Status400BadRequest;
            return StatusCode(status, new { success = false, error = membership.Error ?? "The submitted question is not part of this attempt." });
        }

        // Parse selected option indices from the request
        var selectedOptionIndices = request.SelectedOptionIndices ?? new List<int>();

        // Server-authoritative validation and grading — never trust client-supplied IsCorrect/ScoreAwarded
        var validation = await _responseValidationService.ValidateAndGradeAsync(
            attempt.Id,
            request.QuestionId,
            selectedOptionIndices,
            request.TimeSpentSeconds,
            cancellationToken);

        if (!validation.Valid)
        {
            if (validation.Ungraded)
            {
                // Missing/invalid answer key: the response is rejected without a
                // graded result. It must never be silently recorded as incorrect.
                return StatusCode(StatusCodes.Status409Conflict, new
                {
                    success = false,
                    error = validation.Error ?? "The authoritative answer key for this question is unavailable; the response cannot be graded.",
                    ungradable = true,
                });
            }

            var error = validation.Error ?? "Validation failed.";
            var status = error switch
            {
                var e when e.Contains("not found", StringComparison.OrdinalIgnoreCase) => StatusCodes.Status404NotFound,
                _ => StatusCodes.Status400BadRequest,
            };
            return StatusCode(status, new { success = false, error = error });
        }

        var grading = validation.Grading!;

        var selectedOptionsJson = JsonSerializer.Serialize(selectedOptionIndices);

        var now = DateTime.UtcNow;
        var existingResponse = attempt.Responses.FirstOrDefault(r => r.QuestionId == request.QuestionId);
        if (existingResponse != null)
        {
            existingResponse.SelectedOptionsJson = selectedOptionsJson;
            existingResponse.IsCorrect = grading.IsCorrect;
            existingResponse.ScoreAwarded = grading.ScoreAwarded;
            existingResponse.GradingState = ResponseGradingState.Graded;
            existingResponse.TimeSpentSeconds = request.TimeSpentSeconds;
            existingResponse.AnsweredAt = now;
        }
        else
        {
            var newResponse = new AttemptResponse
            {
                Id = "resp_" + Guid.NewGuid().ToString("N"),
                ExamAttemptId = attempt.Id,
                QuestionId = request.QuestionId,
                SelectedOptionsJson = selectedOptionsJson,
                IsCorrect = grading.IsCorrect,
                ScoreAwarded = grading.ScoreAwarded,
                GradingState = ResponseGradingState.Graded,
                TimeSpentSeconds = request.TimeSpentSeconds,
                AnsweredAt = now
            };
            _context.AttemptResponses.Add(newResponse);
        }

        // On validated submission the question becomes part of the persisted
        // attempt question set (covers legacy pre-snapshot in-flight attempts;
        // snapshot-backed attempts already contain the question).
        await _attemptQuestionService.RecordQuestionMembershipAsync(
            attempt.Id, new[] { request.QuestionId }, now, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Response recorded successfully.",
            isCorrect = grading.IsCorrect,
            scoreAwarded = grading.ScoreAwarded,
        });
    }

    [HttpPost("{id}/submit")]
    public async Task<IActionResult> SubmitAndCompleteAttempt(string id, CancellationToken cancellationToken)
    {
        var caller = ResolveCaller();
        if (string.IsNullOrWhiteSpace(caller.userId))
        {
            return Unauthorized(new { success = false, error = "Authentication required." });
        }

        var attempt = await _context.ExamAttempts
            .Include(ea => ea.Exam)
            .Include(ea => ea.Responses)
            .FirstOrDefaultAsync(ea => ea.Id == id, cancellationToken);

        if (attempt == null)
        {
            return NotFound(new { success = false, error = "Attempt not found." });
        }

        if (!string.Equals(attempt.UserId, caller.userId, StringComparison.Ordinal))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "Forbidden: Cannot submit another candidate's attempt." });
        }

        // Hard Pilot Entitlement Enforcement Boundary (Phase 7.9.2 Work Package B)
        if (_entitlementService != null)
        {
            var entitlement = await _entitlementService.EvaluateExamAccessAsync(
                caller.userId,
                attempt.Exam?.Pathway,
                attempt.ExamId,
                GetClientIpAddress(),
                HttpContext.TraceIdentifier,
                cancellationToken);

            if (!entitlement.IsEntitled)
            {
                // Graceful In-Window Completion Policy: If started while entitled and completed within exam time limit, allow submission
                bool withinTimeLimit = false;
                if (attempt.Exam != null && attempt.Exam.TimeLimitMinutes > 0)
                {
                    var deadline = attempt.StartedAt.AddMinutes(attempt.Exam.TimeLimitMinutes);
                    withinTimeLimit = DateTime.UtcNow <= deadline;
                }

                if (!withinTimeLimit || entitlement.ErrorCode == "ACCOUNT_SUSPENDED" || entitlement.ErrorCode == "ACCOUNT_INACTIVE")
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        success = false,
                        errorCode = entitlement.ErrorCode,
                        error = entitlement.Reason,
                        entitlementStatus = entitlement.Status
                    });
                }

                _context.AuditLogs.Add(new AuditLog
                {
                    ActorId = caller.userId,
                    Action = "EntitlementGracePeriodApplied",
                    EntityType = "ExamAttempt",
                    EntityId = attempt.Id,
                    Description = "Attempt submitted during entitlement expiration grace period within valid exam time window.",
                    Outcome = "Success",
                    Severity = "Warning",
                    Timestamp = DateTime.UtcNow
                });
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        if (attempt.Status != AttemptStatus.InProgress)
        {
            return BadRequest(new { success = false, error = "Attempt has already been completed." });
        }

        // Authoritative finalization is blocked while any response cannot be
        // graded (e.g. missing answer key). This neither rewards nor penalizes
        // the candidate for missing server-owned grading data.
        var ungradedResponses = attempt.Responses.Count(r => r.GradingState == ResponseGradingState.Ungraded);
        if (ungradedResponses > 0)
        {
            return StatusCode(StatusCodes.Status409Conflict, new
            {
                success = false,
                error = "This attempt contains responses that cannot be graded because authoritative grading data is missing or invalid. Finalization is blocked until the grading data is repaired.",
                gradingIncomplete = true,
                ungradedResponseCount = ungradedResponses,
            });
        }

        var totalResponses = attempt.Responses.Count(r => r.GradingState == ResponseGradingState.Graded);
        var correctResponses = attempt.Responses.Count(r => r.GradingState == ResponseGradingState.Graded && r.IsCorrect);
        var passingThreshold = attempt.Exam?.PassingScorePercent ?? 75.0m;

        attempt.ScorePercent = totalResponses > 0
            ? Math.Round((decimal)correctResponses / totalResponses * 100m, 2)
            : 0.0m;

        attempt.Passed = attempt.ScorePercent >= passingThreshold;
        attempt.Status = AttemptStatus.Completed;

        var now = DateTime.UtcNow;
        if (attempt.Exam != null && attempt.Exam.TimeLimitMinutes > 0)
        {
            var deadlineUtc = attempt.StartedAt.AddMinutes(attempt.Exam.TimeLimitMinutes);
            attempt.CompletedAt = now > deadlineUtc ? deadlineUtc : now;
        }
        else
        {
            attempt.CompletedAt = now;
        }

        if (_context.Database.IsRelational())
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                _logger.LogError(ex, "Failed to complete attempt {AttemptId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new { success = false, error = "Failed to finalize and score assessment attempt." });
            }
        }
        else
        {
            await _context.SaveChangesAsync(cancellationToken);
        }

        var performanceTier = GetPerformanceTier(attempt.ScorePercent);

        return Ok(new
        {
            success = true,
            attemptId = attempt.Id,
            scorePercent = attempt.ScorePercent,
            passed = attempt.Passed,
            performanceTier,
            totalQuestions = totalResponses,
            correctCount = correctResponses,
            completedAt = attempt.CompletedAt
        });
    }

    /// <summary>
    /// Subscription synchronization export (offline recovery importer).
    /// Persisting a synced legacy attempt: the whole question set is
    /// server-verified, graded through the trusted grading service, and totals are
    /// recalculated from persisted responses. Client-supplied correctness, scores,
    /// totals and pass/fail flags are accepted for compatibility and ignored.
    /// </summary>
    [HttpPost("sync")]
    public async Task<IActionResult> SyncAssessmentAttempt([FromBody] SyncAssessmentAttemptRequest request, CancellationToken cancellationToken)
    {
        var caller = ResolveCaller();
        if (string.IsNullOrWhiteSpace(caller.userId))
        {
            return Unauthorized(new { success = false, error = "Authentication required to sync assessment attempts." });
        }

        if (request == null)
        {
            return BadRequest(new { success = false, error = "A synchronization payload is required." });
        }

        var candidateUserId = caller.userId;
        var now = DateTime.UtcNow;
        var attemptId = !string.IsNullOrWhiteSpace(request.Id) ? request.Id : "att_" + Guid.NewGuid().ToString("N");

        var existingAttempt = await _context.ExamAttempts
            .Include(ea => ea.Responses)
            .Include(ea => ea.Exam)
            .FirstOrDefaultAsync(ea => ea.Id == attemptId, cancellationToken);

        // Hard Pilot Entitlement Enforcement Boundary (Phase 7.9.2 Work Package B)
        // Offline / delayed batch response synchronization requires valid pilot entitlement.
        if (_entitlementService != null)
        {
            var entitlement = await _entitlementService.EvaluateExamAccessAsync(
                caller.userId,
                existingAttempt?.Exam?.Pathway,
                attemptId,
                GetClientIpAddress(),
                HttpContext.TraceIdentifier,
                cancellationToken);

            if (!entitlement.IsEntitled)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    errorCode = entitlement.ErrorCode,
                    error = entitlement.Reason,
                    entitlementStatus = entitlement.Status
                });
            }
        }

        if (existingAttempt != null)
        {
            // Ownership enforcement for existing attempts.
            if (!string.Equals(existingAttempt.UserId, candidateUserId, StringComparison.Ordinal))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "Forbidden: Cannot update another candidate's attempt." });
            }

            // Completed/abandoned attempts are never modified by synchronization.
            if (existingAttempt.Status != AttemptStatus.InProgress)
            {
                return Ok(new { success = true, attemptId = existingAttempt.Id, message = "Attempt already persisted." });
            }

            // In-progress attempts accept server-verified recovery data.
            return await SyncIntoInProgressAttemptAsync(existingAttempt, request, now, cancellationToken);
        }

        return await CreateSyncedAttemptAsync(attemptId, request, candidateUserId, now, cancellationToken);
    }

    private async Task<IActionResult> CreateSyncedAttemptAsync(
        string attemptId,
        SyncAssessmentAttemptRequest request,
        string candidateUserId,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var exam = await GetOrCreateDefaultExamAsync(request.Pathway ?? "rn", cancellationToken);

        // Build a server-verified question plan. Candidate synchronization input
        // may NOT create question records or stubs: every submitted question must
        // exist in the authoritative datastore AND belong to the target exam.
        var rejectedQuestions = new List<string>();
        var verifiedQuestions = new List<Question>();
        var selections = new Dictionary<string, List<int>>(StringComparer.Ordinal);

        foreach (var item in request.Questions ?? new List<SyncAttemptQuestionItem>())
        {
            var questionId = item?.Id;
            if (string.IsNullOrWhiteSpace(questionId))
            {
                rejectedQuestions.Add("(missing question id)");
                continue;
            }

            var question = await _context.Questions
                .Include(q => q.Options)
                .FirstOrDefaultAsync(q => q.Id == questionId, cancellationToken);

            if (question == null)
            {
                // Untrusted input must never create question stubs or unverified references.
                rejectedQuestions.Add(questionId);
                continue;
            }

            var examMember = await _context.ExamQuestions
                .AnyAsync(eq => eq.ExamId == exam.Id && eq.QuestionId == questionId, cancellationToken);

            if (!examMember)
            {
                rejectedQuestions.Add(questionId);
                continue;
            }

            verifiedQuestions.Add(question);
            selections[questionId] = ResolveSyncSelectedIndices(item);
        }

        if (rejectedQuestions.Count > 0)
        {
            // The batch is rejected atomically: no attempt, no responses and no
            // membership records are persisted when any question cannot be verified.
            return BadRequest(new
            {
                success = false,
                error = "Synchronization rejected: one or more submitted questions are not verified parts of this examination._candidate attempts cannot create questions or assign unverified questions to an attempt.",
                unverifiableQuestionCount = rejectedQuestions.Count,
                rejectedQuestions = rejectedQuestions.Distinct().ToList(),
            });
        }

        var startedAt = now.AddMinutes(-Math.Max(1, request.DurationMinutes));
        var syncSnapshotObj = new
        {
            schemaVersion = 1,
            snapshotCreatedAtUtc = now,
            examination = new
            {
                id = exam.Examination?.Id ?? exam.ExaminationId ?? exam.Id,
                code = exam.Examination?.Code ?? (exam.Pathway == "pn" ? "PN-EX-000000" : "RN-EX-000000"),
                pathway = exam.Pathway,
                title = exam.Examination?.Title ?? exam.Title
            },
            revision = new
            {
                id = exam.Id,
                revisionNumber = exam.RevisionNumber,
                title = exam.Title,
                description = exam.Description,
                examType = (int)exam.ExamType,
                timeLimitMinutes = exam.TimeLimitMinutes,
                passingScorePercent = exam.PassingScorePercent,
                publishedAt = exam.PublishedAt ?? exam.CreatedAt
            },
            deliverySettings = new
            {
                shuffleQuestions = true,
                allowReview = true
            }
        };

        var attempt = new ExamAttempt
        {
            Id = attemptId,
            UserId = candidateUserId, // Server-derived candidate ownership
            ExamId = exam.Id,
            Status = AttemptStatus.InProgress,
            ScorePercent = 0.0m,
            Passed = false,
            StartedAt = startedAt,
            CompletedAt = null,
            Exam = exam,
            MetadataSnapshot = JsonSerializer.Serialize(syncSnapshotObj)
        };

        _context.ExamAttempts.Add(attempt);
        await _context.SaveChangesAsync(cancellationToken);

        // Persist the attempt question set from the server-verified plan.
        await _attemptQuestionService.RecordQuestionMembershipAsync(
            attemptId,
            verifiedQuestions.Select(q => q.Id).ToList(),
            now,
            cancellationToken);

        var ungradedCount = 0;
        var gradedCount = 0;
        foreach (var question in verifiedQuestions)
        {
            var selected = selections[question.Id];
            var validation = await _responseValidationService.ValidateAndGradeAsync(
                attempt.Id,
                question.Id,
                selected,
                0,
                cancellationToken);

            AttemptResponse response;
            if (validation.Valid && validation.Grading is not null)
            {
                response = new AttemptResponse
                {
                    Id = "resp_" + Guid.NewGuid().ToString("N"),
                    ExamAttemptId = attempt.Id,
                    QuestionId = question.Id,
                    SelectedOptionsJson = JsonSerializer.Serialize(selected),
                    IsCorrect = validation.Grading.IsCorrect,
                    ScoreAwarded = validation.Grading.ScoreAwarded,
                    GradingState = ResponseGradingState.Graded,
                    TimeSpentSeconds = 0,
                    AnsweredAt = now
                };
                gradedCount++;
            }
            else if (validation.Ungraded)
            {
                // Preserve the candidate's submitted answer as an explicit ungraded
                // response; no authoritative score meaning is attached.
                ungradedCount++;
                response = new AttemptResponse
                {
                    Id = "resp_" + Guid.NewGuid().ToString("N"),
                    ExamAttemptId = attempt.Id,
                    QuestionId = question.Id,
                    SelectedOptionsJson = JsonSerializer.Serialize(selected),
                    IsCorrect = false,
                    ScoreAwarded = 0m,
                    GradingState = ResponseGradingState.Ungraded,
                    TimeSpentSeconds = 0,
                    AnsweredAt = now
                };
                _logger.LogWarning(
                    "Sync import for attempt {AttemptId} question {QuestionId} could not be graded (authoritative grading data unavailable); response persisted as Ungraded.",
                    attempt.Id, question.Id);
            }
            else
            {
                _logger.LogWarning(
                    "Sync validation rejected answer data for question {QuestionId}: {Reason}",
                    question.Id,
                    validation.Error ?? "Unknown validation failure.");
                rejectedQuestions.Add(question.Id);
                continue;
            }

            _context.AttemptResponses.Add(response);
        }

        await _context.SaveChangesAsync(cancellationToken);

        if (ungradedCount == 0)
        {
            // Recalculate from trusted persisted state only.
            var gradedResponses = await _context.AttemptResponses
                .Where(r => r.ExamAttemptId == attempt.Id && r.GradingState == ResponseGradingState.Graded)
                .ToListAsync(cancellationToken);
            var correctCount = gradedResponses.Count(r => r.IsCorrect);
            attempt.ScorePercent = gradedResponses.Count > 0
                ? Math.Round((decimal)correctCount / gradedResponses.Count * 100m, 2)
                : 0.0m;
            attempt.Passed = attempt.ScorePercent >= (attempt.Exam?.PassingScorePercent ?? 75.0m);
            attempt.Status = AttemptStatus.Completed;
            attempt.CompletedAt = now;
        }
        else
        {
            // Authoritative finalization is blocked until missing grading data is
            // repaired; the attempt stays InProgress and no percentage is produced.
            attempt.Status = AttemptStatus.InProgress;
            attempt.CompletedAt = null;
        }

        await _context.SaveChangesAsync(cancellationToken);

        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = candidateUserId,
            Action = "AssessmentAttemptSynced",
            EntityType = "ExamAttempt",
            EntityId = attempt.Id,
            Description = ungradedCount == 0
                ? $"Imported attempt '{attemptId}' from synchronization; server-computed score {attempt.ScorePercent:0.##}% over {verifiedQuestions.Count} verified question(s)."
                : $"Imported attempt '{attemptId}' from synchronization with {ungradedCount} ungradable question(s); finalization deferred until grading data is available.",
            Outcome = "Success",
            Timestamp = now
        });
        await _context.SaveChangesAsync(cancellationToken);

        if (ungradedCount > 0)
        {
            return Ok(new
            {
                success = true,
                attemptId = attempt.Id,
                scorePercent = (decimal?)null,
                passed = false,
                gradingIncomplete = true,
                ungradedResponseCount = ungradedCount,
                persistedResponseCount = gradedCount,
                persistedAt = now,
                message = "Attempt synchronized but cannot be finalized because authoritative grading data is missing for some questions. The attempt remains in progress until grading data is repaired.",
            });
        }

        return Ok(new
        {
            success = true,
            attemptId = attempt.Id,
            scorePercent = attempt.ScorePercent,
            passed = attempt.Passed,
            gradingIncomplete = false,
            persistedResponseCount = gradedCount,
            persistedAt = attempt.CompletedAt ?? now
        });
    }

    private async Task<IActionResult> SyncIntoInProgressAttemptAsync(
        ExamAttempt attempt,
        SyncAssessmentAttemptRequest request,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var rejectedQuestions = new List<string>();
        var processed = 0;

        foreach (var item in request.Questions ?? new List<SyncAttemptQuestionItem>())
        {
            var questionId = item?.Id;
            if (string.IsNullOrWhiteSpace(questionId))
            {
                rejectedQuestions.Add("(missing question id)");
                continue;
            }

            var membership = await _attemptQuestionService.ValidateMembershipAsync(attempt, questionId, cancellationToken);
            if (!membership.IsMember)
            {
                rejectedQuestions.Add(questionId);
                continue;
            }

            var selected = ResolveSyncSelectedIndices(item);
            var validation = await _responseValidationService.ValidateAndGradeAsync(
                attempt.Id,
                questionId,
                selected,
                0,
                cancellationToken);

            var existingResponse = await _context.AttemptResponses
                .FirstOrDefaultAsync(r => r.ExamAttemptId == attempt.Id && r.QuestionId == questionId, cancellationToken);

            if (validation.Valid && validation.Grading is not null)
            {
                if (existingResponse != null)
                {
                    existingResponse.IsCorrect = validation.Grading.IsCorrect;
                    existingResponse.ScoreAwarded = validation.Grading.ScoreAwarded;
                    existingResponse.SelectedOptionsJson = JsonSerializer.Serialize(selected);
                    existingResponse.GradingState = ResponseGradingState.Graded;
                    existingResponse.AnsweredAt = now;
                }
                else
                {
                    _context.AttemptResponses.Add(new AttemptResponse
                    {
                        Id = "resp_" + Guid.NewGuid().ToString("N"),
                        ExamAttemptId = attempt.Id,
                        QuestionId = questionId,
                        SelectedOptionsJson = JsonSerializer.Serialize(selected),
                        IsCorrect = validation.Grading.IsCorrect,
                        ScoreAwarded = validation.Grading.ScoreAwarded,
                        GradingState = ResponseGradingState.Graded,
                        TimeSpentSeconds = 0,
                        AnsweredAt = now
                    });
                }
                processed++;
            }
            else if (validation.Ungraded)
            {
                if (existingResponse == null)
                {
                    _context.AttemptResponses.Add(new AttemptResponse
                    {
                        Id = "resp_" + Guid.NewGuid().ToString("N"),
                        ExamAttemptId = attempt.Id,
                        QuestionId = questionId,
                        SelectedOptionsJson = JsonSerializer.Serialize(selected),
                        IsCorrect = false,
                        ScoreAwarded = 0m,
                        GradingState = ResponseGradingState.Ungraded,
                        TimeSpentSeconds = 0,
                        AnsweredAt = now
                    });
                }
                processed++;
            }
            else
            {
                rejectedQuestions.Add(questionId);
            }
        }

        // Lock-in membership for questions verified through the legacy fallback.
        await _attemptQuestionService.RecordQuestionMembershipAsync(
            attempt.Id,
            (request.Questions ?? new List<SyncAttemptQuestionItem>())
                .Where(item => !string.IsNullOrWhiteSpace(item?.Id) && !rejectedQuestions.Contains(item.Id!))
                .Select(item => item.Id!)
                .ToList(),
            now,
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        // Recalculate authoritative totals from persisted responses.
        var allResponses = await _context.AttemptResponses
            .Where(r => r.ExamAttemptId == attempt.Id)
            .ToListAsync(cancellationToken);
        var ungradedCount = allResponses.Count(r => r.GradingState == ResponseGradingState.Ungraded);
        var gradedResponses = allResponses.Where(r => r.GradingState == ResponseGradingState.Graded).ToList();
        var stillInProgress = ungradedCount > 0;

        if (!stillInProgress)
        {
            attempt.ScorePercent = gradedResponses.Count > 0
                ? Math.Round((decimal)gradedResponses.Count(r => r.IsCorrect) / gradedResponses.Count * 100m, 2)
                : 0.0m;
            attempt.Passed = attempt.ScorePercent >= (attempt.Exam?.PassingScorePercent ?? 75.0m);
            attempt.Status = AttemptStatus.Completed;
            attempt.CompletedAt = now;
            await _context.SaveChangesAsync(cancellationToken);
        }

        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = attempt.UserId,
            Action = "AssessmentAttemptSynced",
            EntityType = "ExamAttempt",
            EntityId = attempt.Id,
            Description = stillInProgress
                ? $"Synchronized recovery data for in-progress attempt '{attempt.Id}' with {ungradedCount} ungradable question(s); finalization deferred."
                : $"Completed attempt '{attempt.Id}' through synchronization recovery; server-computed score {attempt.ScorePercent:0.##}%.",
            Outcome = "Success",
            Timestamp = now
        });
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            attemptId = attempt.Id,
            scorePercent = stillInProgress ? (decimal?)null : attempt.ScorePercent,
            passed = stillInProgress ? false : attempt.Passed,
            gradingIncomplete = stillInProgress,
            ungradedResponseCount = ungradedCount,
            processedResponseCount = processed,
            rejectedQuestions = rejectedQuestions.Distinct().ToList(),
            persistedAt = now
        });
    }
}
