using Preform.Api.Models;

namespace Preform.Api.Services;

public class AssessmentSelectionRequest
{
    public string Pathway { get; set; } = "rn";
    public int QuestionCount { get; set; } = 10;
    public ExamType ExamType { get; set; } = ExamType.Practice;
    public string? ClientNeedId { get; set; }
    public string? TopicId { get; set; }
    public IReadOnlyList<string>? ExcludeQuestionIds { get; set; }
}

public class SelectedQuestionItem
{
    public Question Question { get; set; } = null!;
    public int DisplayOrder { get; set; }
    public List<QuestionOption> Options { get; set; } = new();
}

public class AssessmentSelectionResult
{
    public bool Success { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public List<SelectedQuestionItem> SelectedQuestions { get; set; } = new();
}

public interface IAssessmentSelectionService
{
    Task<AssessmentSelectionResult> SelectQuestionsAsync(AssessmentSelectionRequest request, CancellationToken cancellationToken = default);
}
