using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.Models;

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

[ApiController]
[Authorize]
[Route("api/v1/attempts")]
public class ExamAttemptsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<ExamAttemptsController> _logger;

    private static readonly HashSet<string> AdminRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "admin", "superadmin", "administrator", "exam_manager"
    };

    public ExamAttemptsController(AppDbContext context, ILogger<ExamAttemptsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private (string? userId, string? role) ResolveCaller()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "candidate";
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

            var tier = a.ScorePercent >= 75m ? "Very High" :
                       a.ScorePercent >= 65m ? "High" :
                       a.ScorePercent >= 55m ? "Borderline" : "Low";

            return new AttemptSummaryDto
            {
                Id = a.Id,
                UserId = a.UserId,
                ExamId = a.ExamId,
                Name = a.Exam?.Title ?? "Adaptive Practice CAT",
                Type = a.Exam?.ExamType == ExamType.CAT ? "tutored_cat" : "rat",
                Status = a.Status.ToString(),
                ScorePercent = a.ScorePercent,
                PerformanceTier = tier,
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

        return Ok(new { success = true, attempt });
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
            ? await _context.Exams.FindAsync(new object[] { request.ExamId }, cancellationToken)
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

        var existingResponse = attempt.Responses.FirstOrDefault(r => r.QuestionId == request.QuestionId);
        if (existingResponse != null)
        {
            existingResponse.SelectedOptionsJson = JsonSerializer.Serialize(request.SelectedOptionIndices);
            existingResponse.IsCorrect = request.IsCorrect;
            existingResponse.ScoreAwarded = request.ScoreAwarded;
            existingResponse.TimeSpentSeconds = request.TimeSpentSeconds;
            existingResponse.AnsweredAt = DateTime.UtcNow;
        }
        else
        {
            var newResponse = new AttemptResponse
            {
                Id = "resp_" + Guid.NewGuid().ToString("N"),
                ExamAttemptId = attempt.Id,
                QuestionId = request.QuestionId,
                SelectedOptionsJson = JsonSerializer.Serialize(request.SelectedOptionIndices),
                IsCorrect = request.IsCorrect,
                ScoreAwarded = request.ScoreAwarded,
                TimeSpentSeconds = request.TimeSpentSeconds,
                AnsweredAt = DateTime.UtcNow
            };
            _context.AttemptResponses.Add(newResponse);
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, message = "Response recorded successfully." });
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

        // Database transaction for score calculation and status transition consistency
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var totalResponses = attempt.Responses.Count;
            var correctResponses = attempt.Responses.Count(r => r.IsCorrect);
            var passingThreshold = attempt.Exam?.PassingScorePercent ?? 75.0m;

            attempt.ScorePercent = totalResponses > 0
                ? Math.Round((decimal)correctResponses / totalResponses * 100m, 2)
                : 0.0m;

            attempt.Passed = attempt.ScorePercent >= passingThreshold;
            attempt.Status = AttemptStatus.Completed;
            attempt.CompletedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

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
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            _logger.LogError(ex, "Failed to complete attempt {AttemptId}", id);
            return StatusCode(StatusCodes.Status500InternalServerError, new { success = false, error = "Failed to finalize and score assessment attempt." });
        }
    }

    [HttpPost("sync")]
    public async Task<IActionResult> SyncAssessmentAttempt([FromBody] SyncAssessmentAttemptRequest request, CancellationToken cancellationToken)
    {
        var caller = ResolveCaller();
        if (string.IsNullOrWhiteSpace(caller.userId))
        {
            return Unauthorized(new { success = false, error = "Authentication required to sync assessment attempts." });
        }

        var candidateUserId = caller.userId;
        var attemptId = !string.IsNullOrWhiteSpace(request.Id) ? request.Id : "att_" + Guid.NewGuid().ToString("N");

        // Verify if attempt already exists
        var existingAttempt = await _context.ExamAttempts
            .Include(ea => ea.Responses)
            .FirstOrDefaultAsync(ea => ea.Id == attemptId, cancellationToken);

        if (existingAttempt != null)
        {
            if (!string.Equals(existingAttempt.UserId, candidateUserId, StringComparison.Ordinal))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "Forbidden: Cannot update another candidate's attempt." });
            }

            return Ok(new { success = true, attemptId = existingAttempt.Id, message = "Attempt already persisted." });
        }

        var exam = await GetOrCreateDefaultExamAsync(request.Pathway ?? "rn", cancellationToken);

        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var now = DateTime.UtcNow;
            var startedAt = now.AddMinutes(-Math.Max(1, request.DurationMinutes));

            var attempt = new ExamAttempt
            {
                Id = attemptId,
                UserId = candidateUserId, // Server-derived candidate ownership
                ExamId = exam.Id,
                Status = AttemptStatus.Completed,
                ScorePercent = request.ScorePercent,
                Passed = request.ScorePercent >= 75.0m,
                StartedAt = startedAt,
                CompletedAt = now
            };

            _context.ExamAttempts.Add(attempt);

            if (request.Questions != null && request.Questions.Count > 0)
            {
                foreach (var q in request.Questions)
                {
                    var questionId = !string.IsNullOrWhiteSpace(q.Id) ? q.Id : "q_" + Guid.NewGuid().ToString("N");

                    // Ensure question stub exists if referenced by foreign key
                    var questionExists = await _context.Questions.AnyAsync(existingQ => existingQ.Id == questionId, cancellationToken);
                    if (!questionExists)
                    {
                        var newQuestion = new Question
                        {
                            Id = questionId,
                            Stem = q.Stem ?? "Clinical scenario assessment question",
                            Pathway = request.Pathway ?? "rn",
                            QuestionTypeKey = q.QuestionType ?? "single_choice",
                            Status = QuestionStatus.Published,
                            CreatedAt = now,
                            UpdatedAt = now
                        };
                        _context.Questions.Add(newQuestion);
                    }

                    var selectedJson = q.UserAnswerIndices != null && q.UserAnswerIndices.Count > 0
                        ? JsonSerializer.Serialize(q.UserAnswerIndices)
                        : q.UserAnswerIndex.HasValue
                            ? JsonSerializer.Serialize(new[] { q.UserAnswerIndex.Value })
                            : "[]";

                    var resp = new AttemptResponse
                    {
                        Id = "resp_" + Guid.NewGuid().ToString("N"),
                        ExamAttemptId = attempt.Id,
                        QuestionId = questionId,
                        SelectedOptionsJson = selectedJson,
                        IsCorrect = q.IsCorrect,
                        ScoreAwarded = q.ScoreAwarded,
                        TimeSpentSeconds = 60,
                        AnsweredAt = now
                    };
                    _context.AttemptResponses.Add(resp);
                }
            }

            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = candidateUserId,
                Action = "AssessmentAttemptPersisted",
                EntityType = "ExamAttempt",
                EntityId = attempt.Id,
                Description = $"Persisted candidate assessment attempt '{request.Name}' with score {request.ScorePercent}%",
                Outcome = "Success",
                Timestamp = now
            });

            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return Ok(new
            {
                success = true,
                attemptId = attempt.Id,
                scorePercent = attempt.ScorePercent,
                passed = attempt.Passed,
                persistedAt = now
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            _logger.LogError(ex, "Failed to persist assessment attempt {AttemptId}", attemptId);
            return StatusCode(StatusCodes.Status500InternalServerError, new { success = false, error = "Failed to persist assessment attempt to PostgreSQL database." });
        }
    }
}
