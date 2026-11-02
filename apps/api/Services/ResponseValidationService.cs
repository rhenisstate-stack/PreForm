using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.Models;
using Preform.Api.Services.Grading;

namespace Preform.Api.Services;

/// <summary>
/// Validates candidate responses and performs server-authoritative grading.
/// Never trusts client-supplied correctness or scores.
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
    public bool Valid { get; init; }
    public string? Error { get; init; }
    public GradingResult? Grading { get; init; }
    public string? QuestionTypeKey { get; init; }
    public bool AutomaticGradingPossible { get; init; }
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
            .Include(ea => ea.Exam)
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
            .ToListAsync(cancellationToken);

        var optionInfos = options
            .Select(o => new QuestionOptionGradingInfo
            {
                OptionKey = o.OptionKey,
                IsCorrect = o.IsCorrect,
            })
            .ToList();

        var gradingContext = new QuestionGradingContext
        {
            QuestionTypeKey = question.QuestionTypeKey,
            QuestionStem = question.Stem,
            Options = optionInfos,
            SelectedOptionIndices = selectedOptionIndices,
            TimeSpentSeconds = timeSpentSeconds,
            MaxScore = 1.0m,
        };

        var grading = await grader.GradeAsync(gradingContext, cancellationToken);

        return new ResponseValidationResult
        {
            Valid = true,
            Grading = grading,
            QuestionTypeKey = question.QuestionTypeKey,
            AutomaticGradingPossible = grader.SupportsAutomaticGrading,
        };
    }
}
