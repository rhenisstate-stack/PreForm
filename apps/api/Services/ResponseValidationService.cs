using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.Models;
using Preform.Api.Services.Grading;

namespace Preform.Api.Services;

/// <summary>
/// Validates candidate responses and performs server-authoritative grading.
/// Never trusts client-supplied correctness or scores.
///
/// Grading safety contract (Gate C):
/// - A response is only graded when authoritative answer data exists.
/// - Missing or invalid answer-key data yields an EXPLICIT ungraded outcome
///   (Ungraded = true). It must never silently become an incorrect answer.
/// - Invalid payloads (e.g. out-of-range option indices) are rejected.
/// </summary>
public interface IResponseValidationService
{
    /// <summary>
    /// Validates and grades a candidate response for an attempt.
    /// Returns the server-computed grading result.
    /// </summary>
    Task<ResponseValidationResult> ValidateAndGradeAsync(
        string attemptId,
        string questionId,
        IReadOnlyList<int>? selectedOptionIndices,
        int timeSpentSeconds,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Result of response validation and grading.
/// </summary>
public class ResponseValidationResult
{
    /// <summary>
    /// True only when an authoritative graded outcome exists (Grading is a
    /// real graded result, not an ungraded placeholder).
    /// </summary>
    public bool Valid { get; init; }

    public string? Error { get; init; }
    public GradingResult? Grading { get; init; }
    public string? QuestionTypeKey { get; init; }

    /// <summary>Whether automatic grading is supported by the question type.</summary>
    public bool AutomaticGradingPossible { get; init; }

    /// <summary>
    /// True when the question type is automatically gradable but the authoritative
    /// grading data (answer key / options) is missing or invalid. Callers that must
    /// preserve the candidate's submitted answer may persist this as an explicit
    /// Ungraded response; it must never be persisted as an incorrect answer.
    /// </summary>
    public bool Ungraded { get; init; }
}

public class ResponseValidationService : IResponseValidationService
{
    private readonly AppDbContext _context;
    private readonly IQuestionGraderResolver _graderResolver;

    public ResponseValidationService(
        AppDbContext context,
        IQuestionGraderResolver graderResolver)
    {
        _context = context;
        _graderResolver = graderResolver;
    }

    public async Task<ResponseValidationResult> ValidateAndGradeAsync(
        string attemptId,
        string questionId,
        IReadOnlyList<int>? selectedOptionIndices,
        int timeSpentSeconds,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(attemptId))
        {
            return new ResponseValidationResult { Valid = false, Error = "Attempt ID is required." };
        }

        if (string.IsNullOrWhiteSpace(questionId))
        {
            return new ResponseValidationResult { Valid = false, Error = "Question ID is required." };
        }

        // Load the attempt and question together
        var attempt = await _context.ExamAttempts
            .FirstOrDefaultAsync(ea => ea.Id == attemptId, cancellationToken);

        if (attempt == null)
        {
            return new ResponseValidationResult { Valid = false, Error = "Attempt not found." };
        }

        if (attempt.Status != AttemptStatus.InProgress)
        {
            return new ResponseValidationResult
            {
                Valid = false,
                Error = "Cannot add responses to a completed or abandoned attempt."
            };
        }

        var question = await _context.Questions
            .FirstOrDefaultAsync(q => q.Id == questionId, cancellationToken);

        if (question == null)
        {
            return new ResponseValidationResult { Valid = false, Error = "Question not found." };
        }

        var grader = _graderResolver.Resolve(question.QuestionTypeKey);
        if (grader == null)
        {
            return new ResponseValidationResult
            {
                Valid = false,
                Error = $"Automatic grading is not supported for question type '{question.QuestionTypeKey}'.",
                QuestionTypeKey = question.QuestionTypeKey,
                AutomaticGradingPossible = false,
            };
        }

        var options = await _context.QuestionOptions
            .Where(qo => qo.QuestionId == questionId)
            .OrderBy(qo => qo.DisplayOrder)
            .ToListAsync(cancellationToken);

        var optionInfos = options
            .Select(o => new QuestionOptionGradingInfo
            {
                OptionKey = o.OptionKey,
                IsCorrect = o.IsCorrect,
            })
            .ToList();

        var selectedOptionIndicesToGrade = selectedOptionIndices ?? new List<int>();

        if (options.Count == 0)
        {
            // Missing grading data entirely (no options). This is an explicit
            // ungraded outcome — correctness could not be determined.
            return new ResponseValidationResult
            {
                Valid = false,
                Error = "No authoritative options are available for grading.",
                QuestionTypeKey = question.QuestionTypeKey,
                AutomaticGradingPossible = true,
                Ungraded = true,
            };
        }

        // Payload validity: reject option indices that do not reference real options.
        if (selectedOptionIndicesToGrade.Any(i => i < 0 || i >= options.Count))
        {
            return new ResponseValidationResult
            {
                Valid = false,
                Error = "Response payload is invalid: a selected option index is out of range.",
                QuestionTypeKey = question.QuestionTypeKey,
                AutomaticGradingPossible = grader.SupportsAutomaticGrading,
            };
        }

        var gradingContext = new QuestionGradingContext
        {
            QuestionTypeKey = question.QuestionTypeKey,
            QuestionStem = question.Stem,
            Options = optionInfos,
            SelectedOptionIndices = selectedOptionIndicesToGrade,
            TimeSpentSeconds = timeSpentSeconds,
            MaxScore = 1.0m,
        };

        var grading = await grader.GradeAsync(gradingContext, cancellationToken);

        if (grading.Ungraded)
        {
            // The answer key (or options) is missing/invalid. This is an explicit
            // ungraded outcome — correctness could not be determined and must not
            // be silently recorded as an incorrect answer.
            return new ResponseValidationResult
            {
                Valid = false,
                Error = grading.Error ?? "The authoritative answer key for this question is unavailable.",
                QuestionTypeKey = question.QuestionTypeKey,
                AutomaticGradingPossible = true,
                Ungraded = true,
            };
        }

        if (grading.Error is not null)
        {
            // Grader rejected the payload or grading could not proceed.
            return new ResponseValidationResult
            {
                Valid = false,
                Error = grading.Error,
                QuestionTypeKey = question.QuestionTypeKey,
                AutomaticGradingPossible = true,
            };
        }

        return new ResponseValidationResult
        {
            Valid = true,
            Grading = grading,
            QuestionTypeKey = question.QuestionTypeKey,
            AutomaticGradingPossible = grader.SupportsAutomaticGrading,
        };
    }
}
