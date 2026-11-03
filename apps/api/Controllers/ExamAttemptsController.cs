using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.Models;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

public class StartAttemptRequest
{
    public string? ExamId { get; set; }
    public string? Pathway { get; set; }
    public string? Name { get; set; }
    public string? TestType { get; set; } // "tutored_cat" or "rat"
    public int QuestionCount { get; set; } = 10;
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
    /// <summary>Authoritative score, disclosed only after finalization.</summary>
    public decimal? ScorePercent { get; set; }
    /// <summary>Pass/fail outcome, disclosed only after finalization.</summary>
    public bool? Passed { get; set; }
    /// <summary>Performance tier, disclosed only after finalization.</summary>
    public string? PerformanceTier { get; set; }
    public int? CorrectCount { get; set; }
    public int TotalResponses { get; set; }
    public int DurationMinutes { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    /// <summary>True when authoritative grading is incomplete (e.g. missing answer keys).</summary>
    public bool GradingIncomplete { get; set; }
    public List<CandidateAttemptResponseDto> Responses { get; set; } = new();
}

public class CandidateAttemptResponseDto
{
    public string QuestionId { get; set; } = string.Empty;
    public string SelectedOptionsJson { get; set; } = "[]";
    public int TimeSpentSeconds { get; set; }
    public DateTime AnsweredAt { get; set; }
    /// <summary>Disclosed only after finalization; null while in progress.</summary>
    public bool? IsCorrect { get; set; }
    /// <summary>Disclosed only after finalization; null while in progress.</summary>
    public decimal? ScoreAwarded { get; set; }
}

[ApiController]
[Authorize]
[Route("api/v1/attempts")]
public class ExamAttemptsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<ExamAttemptsController> _logger;
    private readonly IResponseValidationService _responseValidationService;
    private readonly IAttemptQuestionService _attemptQuestionService;

    private static readonly HashSet<string> AdminRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "admin", "superadmin", "administrator", "exam_manager"
    };

    public ExamAttemptsController(
        AppDbContext context,
        ILogger<ExamAttemptsController> logger,
        IResponseValidationService responseValidationService,
        IAttemptQuestionService attemptQuestionService)
    {
        _context = context;
        _logger = logger;
        _responseValidationService = responseValidationService;
        _attemptQuestionService = attemptQuestionService;
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
        // Ownership enforcement: candidate can only view their own attempts
        if (!string.IsNullOrWhiteSpace(userId) && !string.Equals(userId, caller.userId, StringComparison.Ordinal) && !isPrivileged)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "Forbidden: Cannot access another candidate's attempts." });
        }

        var targetUserId = isPrivileged && !string.IsNullOrWhiteSpace(userId) ? userId : caller.userId;

        var attempts = await _context.ExamAttempts
            .Include(ea => ea.Exam)
            .Include(ea => ea.Responses)
            .Where(ea => ea.UserId == targetUserId)
            .OrderByDescending(ea => ea.StartedAt)
            .ToListAsync(cancellationToken);

        var dtos = attempts.Select(a =>
        {
            var correctCount = a.Responses.Count(r => r.IsCorrect);
            var totalCount = a.Responses.Count;
            var duration = a.CompletedAt.HasValue
                ? (int)Math.Max(1, (a.CompletedAt.Value - a.StartedAt).TotalMinutes)
                : 0;

            return new AttemptSummaryDto
            {
                Id = a.Id,
                UserId = a.UserId,
                ExamId = a.ExamId,
                Name = a.Exam?.Title ?? "Adaptive Practice CAT",
                Type = a.Exam?.ExamType == ExamType.CAT ? "tutored_cat" : "rat",
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

        // Candidate-facing DTO contract: full EF entities are never serialized.
        // Correctness/scores are disclosed only after authoritative finalization.
        var isCompleted = attempt.Status == AttemptStatus.Completed;
        var totalResponses = attempt.Responses.Count;
        var ungradedCount = attempt.Responses.Count(r => r.GradingState == ResponseGradingState.Ungraded);
        var duration = attempt.CompletedAt.HasValue
            ? (int)Math.Max(1, (attempt.CompletedAt.Value - attempt.StartedAt).TotalMinutes)
            : (int)Math.Max(1, (DateTime.UtcNow - attempt.StartedAt).TotalMinutes);

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

        return Ok(new { success = true, attempt = detail });
    }

    [HttpPost]
    public async Task<IActionResult> StartAttempt([FromBody] StartAttemptRequest request, CancellationToken cancellationToken)
    {
        var caller = ResolveCaller();
        if (string.IsNullOrWhiteSpace(caller.userId))
        {
            return Unauthorized(new { success = false, error = "Authentication required." });
        }

        var exam = !string.IsNullOrWhiteSpace(request.ExamId)
            ? await _context.Exams
                .Include(e => e.ExamQuestions)
                .FirstOrDefaultAsync(e => e.Id == request.ExamId, cancellationToken)
            : await GetOrCreateDefaultExamAsync(request.Pathway ?? "rn", cancellationToken);

        if (exam == null)
        {
            exam = await GetOrCreateDefaultExamAsync("rn", cancellationToken);
        }

        var now = DateTime.UtcNow;
        var attempt = new ExamAttempt
        {
            Id = "att_" + Guid.NewGuid().ToString("N"),
            UserId = caller.userId, // Authenticated candidate ID strictly enforced
            ExamId = exam.Id,
            Status = AttemptStatus.InProgress,
            ScorePercent = 0.0m,
            Passed = false,
            StartedAt = now,
            CompletedAt = null
        };

        _context.ExamAttempts.Add(attempt);
        await _context.SaveChangesAsync(cancellationToken);

        // Persist the exact attempt question set at start time. The attempt's
        // authorized question set is the exam's question list in display order;
        // adaptive (CAT) sub-selection is not implemented and remains out of scope.
        await _attemptQuestionService.RecordQuestionMembershipAsync(
            attempt.Id,
            exam.ExamQuestions
                .OrderBy(eq => eq.DisplayOrder)
                .Select(eq => eq.QuestionId)
                .ToList(),
            now,
            cancellationToken);

        return CreatedAtAction(nameof(GetAttemptById), new { id = attempt.Id }, new
        {
            success = true,
            attemptId = attempt.Id,
            examId = exam.Id,
            startedAt = attempt.StartedAt
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

        if (attempt.Status != AttemptStatus.InProgress)
        {
            return BadRequest(new { success = false, error = "Cannot add responses to a completed or abandoned attempt." });
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
        attempt.CompletedAt = DateTime.UtcNow;

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

        return Ok(new
        {
            success = true,
            attemptId = attempt.Id,
            scorePercent = attempt.ScorePercent,
            passed = attempt.Passed,
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
            Exam = exam
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
