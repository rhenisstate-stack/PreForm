using System.Collections.Generic;
using System.Linq;

namespace Preform.Api.Services.Grading;

/// <summary>
/// Result of grading a single question response.
/// </summary>
public class GradingResult
{
    /// <summary>Whether the response is correct.</summary>
    public bool IsCorrect { get; init; }

    /// <summary>Marks awarded for this response.</summary>
    public decimal ScoreAwarded { get; init; }

    /// <summary>Maximum possible marks for this question.</summary>
    public decimal MaxScore { get; init; }

    /// <summary>Human-readable explanation of the grading decision.</summary>
    public string? Explanation { get; init; }

    /// <summary>Whether automatic grading was possible for this type.</summary>
    public bool AutomaticGradingPossible { get; init; }

    /// <summary>Error message if grading could not be performed.</summary>
    public string? Error { get; init; }

    public static GradingResult Correct(decimal scoreAwarded, decimal maxScore, string? explanation = null)
    {
        return new GradingResult
        {
            IsCorrect = true,
            ScoreAwarded = scoreAwarded,
            MaxScore = maxScore,
            Explanation = explanation,
            AutomaticGradingPossible = true,
        };
    }

    public static GradingResult Incorrect(decimal scoreAwarded, decimal maxScore, string? explanation = null)
    {
        return new GradingResult
        {
            IsCorrect = false,
            ScoreAwarded = scoreAwarded,
            MaxScore = maxScore,
            Explanation = explanation,
            AutomaticGradingPossible = true,
        };
    }

    public static GradingResult Unsupported(string error)
    {
        return new GradingResult
        {
            IsCorrect = false,
            ScoreAwarded = 0,
            MaxScore = 0,
            AutomaticGradingPossible = false,
            Error = error,
        };
    }
}

/// <summary>
/// Context for grading a question response.
/// </summary>
public class QuestionGradingContext
{
    /// <summary>The canonical question-type key.</summary>
    public string QuestionTypeKey { get; init; } = string.Empty;

    /// <summary>The question's stem/content.</summary>
    public string? QuestionStem { get; init; }

    /// <summary>The question's options, if applicable.</summary>
    public IReadOnlyList<QuestionOptionGradingInfo>? Options { get; init; }

    /// <summary>The candidate's selected option indices (from SelectedOptionsJson).</summary>
    public IReadOnlyList<int>? SelectedOptionIndices { get; init; }

    /// <summary>The candidate's raw response payload.</summary>
    public string? ResponsePayload { get; init; }

    /// <summary>Time spent on the question in seconds.</summary>
    public int TimeSpentSeconds { get; init; }

    /// <summary>Maximum marks for the question.</summary>
    public decimal MaxScore { get; init; } = 1.0m;
}

/// <summary>
/// Question option information for grading.
/// </summary>
public class QuestionOptionGradingInfo
{
    public string OptionKey { get; init; } = string.Empty;
    public bool IsCorrect { get; init; }
}

/// <summary>
/// Abstraction for question-type-specific grading.
/// Implementations must never trust client-supplied correctness or scores.
/// </summary>
public interface IQuestionGrader
{
    /// <summary>The question-type key this grader handles.</summary>
    string QuestionTypeKey { get; }

    /// <summary>Whether this grader supports automatic grading.</summary>
    bool SupportsAutomaticGrading { get; }

    /// <summary>Validates and grades a candidate response.</summary>
    Task<GradingResult> GradeAsync(QuestionGradingContext context, CancellationToken cancellationToken = default);
}

/// <summary>
/// Resolves the appropriate grader for a question type.
/// </summary>
public interface IQuestionGraderResolver
{
    /// <summary>Resolves a grader for the given question-type key.</summary>
    IQuestionGrader? Resolve(string questionTypeKey);

    /// <summary>Whether a grader exists for the given question-type key.</summary>
    bool IsGradingSupported(string questionTypeKey);
}

/// <summary>
/// Grader for option-based question types (single-choice, true-false, multiple-choice, sata, checkbox, etc.).
/// Correctness is determined by comparing selected option indices against QuestionOption.IsCorrect flags.
/// </summary>
public class OptionBasedQuestionGrader : IQuestionGrader
{
    public string QuestionTypeKey { get; }
    public bool SupportsAutomaticGrading { get; } = true;

    public OptionBasedQuestionGrader(string questionTypeKey)
    {
        QuestionTypeKey = questionTypeKey;
    }

    public Task<GradingResult> GradeAsync(QuestionGradingContext context, CancellationToken cancellationToken = default)
    {
        if (context.Options == null || context.Options.Count == 0)
        {
            return Task.FromResult(GradingResult.Unsupported("No question options available for grading."));
        }

        var selectedIndices = context.SelectedOptionIndices ?? new List<int>();

        // Determine correct option indices
        var correctIndices = context.Options
            .Select((o, index) => new { o.IsCorrect, Index = index })
            .Where(x => x.IsCorrect)
            .Select(x => x.Index)
            .ToHashSet();

        if (correctIndices.Count == 0)
        {
            return Task.FromResult(GradingResult.Unsupported("No correct answer key defined for this question."));
        }

        bool isCorrect;
        decimal scoreAwarded;

        // For single-correct-answer types: exact match of selected indices to correct index
        if (correctIndices.Count == 1 && selectedIndices.Count == 1)
        {
            isCorrect = correctIndices.Contains(selectedIndices[0]);
            scoreAwarded = isCorrect ? context.MaxScore : 0;
        }
        // For multi-select types: exact match of all selected indices to all correct indices
        else
        {
            var selectedSet = new HashSet<int>(selectedIndices);
            isCorrect = selectedSet.SetEquals(correctIndices);
            scoreAwarded = isCorrect ? context.MaxScore : 0;
        }

        if (isCorrect)
        {
            return Task.FromResult(GradingResult.Correct(scoreAwarded, context.MaxScore,
                "Response matches the correct answer key."));
        }
        return Task.FromResult(GradingResult.Incorrect(scoreAwarded, context.MaxScore,
            "Response does not match the correct answer key."));
    }
}

/// <summary>
/// Resolves question-type graders. Maintains a registry of supported graders.
/// </summary>
public class QuestionGraderResolver : IQuestionGraderResolver
{
    private readonly Dictionary<string, IQuestionGrader> _graders = new(StringComparer.Ordinal);

    public QuestionGraderResolver(IQuestionTypeRegistry questionTypeRegistry)
    {
        foreach (var descriptor in questionTypeRegistry.All.Where(
            item => item.GradingStrategy == QuestionTypeGradingStrategy.OptionExactMatch))
        {
            _graders[descriptor.Key] = new OptionBasedQuestionGrader(descriptor.Key);
        }
    }

    public IQuestionGrader? Resolve(string questionTypeKey)
    {
        if (string.IsNullOrWhiteSpace(questionTypeKey)) return null;
        return _graders.TryGetValue(questionTypeKey.Trim(), out var grader) ? grader : null;
    }

    public bool IsGradingSupported(string questionTypeKey)
    {
        return Resolve(questionTypeKey) is not null;
    }
}
