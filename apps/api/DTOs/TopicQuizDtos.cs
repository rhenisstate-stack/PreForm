using System.ComponentModel.DataAnnotations;

namespace Preform.Api.DTOs;

public class CreateTopicQuizConfigurationRequest
{
    [Required, MaxLength(160)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(10)]
    public string Programme { get; set; } = "rn";

    [MaxLength(128)]
    public string? SubjectDomainId { get; set; }

    [MaxLength(128)]
    public string? TopicSlug { get; set; }

    [MaxLength(160)]
    public string? TopicTitle { get; set; }

    [MaxLength(32)]
    public string? ClientNeedId { get; set; }

    [Range(3, 50)]
    public int QuestionCount { get; set; } = 10;

    [MaxLength(32)]
    public string Difficulty { get; set; } = "all";

    public int TimeLimitMinutes { get; set; } = 0;

    public bool ImmediateFeedback { get; set; } = true;
}

public class TopicQuizConfigurationDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Programme { get; set; } = "rn";
    public string? SubjectDomainId { get; set; }
    public string? TopicSlug { get; set; }
    public string? TopicTitle { get; set; }
    public string? ClientNeedId { get; set; }
    public int QuestionCount { get; set; }
    public string Difficulty { get; set; } = "all";
    public int TimeLimitMinutes { get; set; }
    public bool ImmediateFeedback { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class TopicQuizQuestionDto
{
    public string Id { get; set; } = string.Empty;
    public string Stem { get; set; } = string.Empty;
    public string QuestionTypeKey { get; set; } = "single-choice";
    public string Difficulty { get; set; } = "Moderate";
    public string? ClientNeedId { get; set; }
    public string? ClinicalScenario { get; set; }
    public List<TopicQuizOptionDto> Options { get; set; } = new();
    
    // Only revealed after submission or in immediate-feedback mode after checking
    public List<int>? CorrectAnswerIndices { get; set; }
    public string? Rationale { get; set; }
}

public class TopicQuizOptionDto
{
    public int Index { get; set; }
    public string Text { get; set; } = string.Empty;
    public string? MediaUrl { get; set; }
}

public class StartTopicQuizAttemptRequest
{
    [MaxLength(128)]
    public string? ConfigurationId { get; set; }

    [MaxLength(160)]
    public string? Title { get; set; }

    [MaxLength(10)]
    public string Programme { get; set; } = "rn";

    [MaxLength(128)]
    public string? SubjectDomainId { get; set; }

    [MaxLength(128)]
    public string? TopicSlug { get; set; }

    [MaxLength(160)]
    public string? TopicTitle { get; set; }

    [MaxLength(32)]
    public string? ClientNeedId { get; set; }

    [Range(3, 50)]
    public int QuestionCount { get; set; } = 10;

    [MaxLength(32)]
    public string Difficulty { get; set; } = "all";

    public int TimeLimitMinutes { get; set; } = 0;

    public bool ImmediateFeedback { get; set; } = true;
}

public class TopicQuizAttemptDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Programme { get; set; } = "rn";
    public string? TopicSlug { get; set; }
    public string? TopicTitle { get; set; }
    public string? ClientNeedId { get; set; }
    public int TotalQuestions { get; set; }
    public int CorrectCount { get; set; }
    public int IncorrectCount { get; set; }
    public double ScorePercentage { get; set; }
    public int TimeSpentSeconds { get; set; }
    public string Status { get; set; } = "in_progress";
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public List<TopicQuizQuestionDto> Questions { get; set; } = new();
    public List<TopicQuizResponseDto> Responses { get; set; } = new();
}

public class SubmitTopicQuizResponseRequest
{
    [Required, MaxLength(128)]
    public string QuestionId { get; set; } = string.Empty;

    public List<int> SelectedOptionIndices { get; set; } = new();

    public int TimeSpentSeconds { get; set; } = 0;

    public bool FlaggedForReview { get; set; } = false;
}

public class TopicQuizResponseDto
{
    public string QuestionId { get; set; } = string.Empty;
    public List<int> SelectedOptionIndices { get; set; } = new();
    public bool IsCorrect { get; set; }
    public int TimeSpentSeconds { get; set; }
    public bool FlaggedForReview { get; set; }
    public List<int>? CorrectAnswerIndices { get; set; }
    public string? Rationale { get; set; }
}

public class TopicQuizResultsDto
{
    public TopicQuizAttemptDto Attempt { get; set; } = null!;
    public Dictionary<string, double> PerformanceByClientNeed { get; set; } = new();
    public List<string> RecommendedStudyTopics { get; set; } = new();
    public List<TopicQuizQuestionDto> MissedQuestions { get; set; } = new();
}
