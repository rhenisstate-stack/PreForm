using System.ComponentModel.DataAnnotations;

namespace Preform.Api.DTOs;

public class AIProviderConfigurationDto
{
    public string Id { get; set; } = string.Empty;
    public string ProviderName { get; set; } = "gemini";
    public string ModelId { get; set; } = "gemini-1.5-flash";
    public bool IsEnabled { get; set; } = true;
    public double Temperature { get; set; } = 0.2;
    public int MaxOutputTokens { get; set; } = 2048;
    public int TimeoutSeconds { get; set; } = 30;
    public Dictionary<string, bool> FeatureToggles { get; set; } = new();
    public int DailyPerUserQuota { get; set; } = 50;
    public DateTime UpdatedAt { get; set; }
}

public class UpdateAIConfigurationRequest
{
    [MaxLength(64)]
    public string? ProviderName { get; set; }

    [MaxLength(64)]
    public string? ModelId { get; set; }

    public bool? IsEnabled { get; set; }

    public double? Temperature { get; set; }

    public int? MaxOutputTokens { get; set; }

    public int? TimeoutSeconds { get; set; }

    public Dictionary<string, bool>? FeatureToggles { get; set; }

    public int? DailyPerUserQuota { get; set; }
}

public class AISummarizeNoteRequest
{
    [Required]
    public string NoteText { get; set; } = string.Empty;

    [MaxLength(32)]
    public string Mode { get; set; } = "summarize"; // "summarize" | "simplify" | "takeaways" | "terminology"
}

public class AISummarizeNoteResultDto
{
    public string Summary { get; set; } = string.Empty;
    public List<string> KeyTakeaways { get; set; } = new();
    public Dictionary<string, string> KeyTerms { get; set; } = new();
    public List<string> SuggestedRevisionQuestions { get; set; } = new();
}

public class AIGenerateFlashcardsRequest
{
    [MaxLength(256)]
    public string? Topic { get; set; }

    public string? SourceText { get; set; }

    [MaxLength(10)]
    public string Programme { get; set; } = "rn";

    [MaxLength(32)]
    public string? ClientNeedId { get; set; }

    [Range(1, 20)]
    public int Count { get; set; } = 5;
}

public class AIGeneratedFlashcardDto
{
    public string Front { get; set; } = string.Empty;
    public string Back { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    public string Difficulty { get; set; } = "high_yield";
    public string CardStyle { get; set; } = "qa";
}

public class AIGenerateQuizRequest
{
    [Required, MaxLength(256)]
    public string Topic { get; set; } = string.Empty;

    public string? SourceText { get; set; }

    [MaxLength(10)]
    public string Programme { get; set; } = "rn";

    [MaxLength(32)]
    public string? ClientNeedId { get; set; }

    [Range(1, 10)]
    public int Count { get; set; } = 5;
}

public class AIGeneratedQuizQuestionDto
{
    public string Stem { get; set; } = string.Empty;
    public string QuestionTypeKey { get; set; } = "single-choice";
    public string? ClinicalScenario { get; set; }
    public List<string> Options { get; set; } = new();
    public List<int> CorrectAnswerIndices { get; set; } = new();
    public string Rationale { get; set; } = string.Empty;
    public string Difficulty { get; set; } = "Moderate";
}

public class AITutorChatRequest
{
    [Required]
    public string Message { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? TopicSlug { get; set; }

    [MaxLength(10)]
    public string Programme { get; set; } = "rn";

    public List<AITutorChatMessageDto>? History { get; set; }
}

public class AITutorChatMessageDto
{
    public string Role { get; set; } = "user"; // "user" | "assistant"
    public string Content { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class AIGenerateStudyPlanRequest
{
    public DateTime TargetExamDate { get; set; }
    public int WeeklyHours { get; set; } = 15;

    [MaxLength(10)]
    public string Programme { get; set; } = "rn";

    public List<string>? FocusClientNeeds { get; set; }
}

public class AIStudyPlanDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateTime? TargetExamDate { get; set; }
    public int WeeklyAvailableHours { get; set; }
    public string Programme { get; set; } = "rn";
    public string PlanJson { get; set; } = "{}";
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AIUsageMonitoringDto
{
    public int TotalRequestsToday { get; set; }
    public int TotalTokensToday { get; set; }
    public decimal EstimatedCostTodayUsd { get; set; }
    public int UserRemainingDailyQuota { get; set; }
    public List<AIRequestLogDto> RecentRequests { get; set; } = new();
}

public class AIRequestLogDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Feature { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int InputTokens { get; set; }
    public int OutputTokens { get; set; }
    public int LatencyMs { get; set; }
    public string Status { get; set; } = "success";
    public DateTime CreatedAt { get; set; }
}
