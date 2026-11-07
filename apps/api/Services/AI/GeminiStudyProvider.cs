using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Preform.Api.DTOs;

namespace Preform.Api.Services.AI;

public class GeminiStudyProvider : IAIStudyProvider
{
    private readonly string? _apiKey;
    private readonly string _modelId;
    private readonly HttpClient _httpClient;
    private readonly MockStudyProvider _fallback;
    private readonly ILogger<GeminiStudyProvider> _logger;

    public string ProviderName => "gemini";
    public bool IsAvailable => !string.IsNullOrWhiteSpace(_apiKey);

    public GeminiStudyProvider(
        IConfiguration config,
        HttpClient httpClient,
        MockStudyProvider fallback,
        ILogger<GeminiStudyProvider> logger)
    {
        _apiKey = config["GEMINI_API_KEY"] ?? config["Gemini:ApiKey"];
        _modelId = config["Gemini:ModelId"] ?? "gemini-1.5-flash";
        _httpClient = httpClient;
        _fallback = fallback;
        _logger = logger;
    }

    public async Task<AISummarizeNoteResultDto> SummarizeNoteAsync(AISummarizeNoteRequest request, CancellationToken cancellationToken = default)
    {
        if (!IsAvailable)
        {
            return await _fallback.SummarizeNoteAsync(request, cancellationToken);
        }

        try
        {
            var prompt = $@"You are a clinical nursing educator for NCLEX prep.
Analyze the following learner note and return a JSON response with keys:
- ""Summary"": concise 2-3 sentence clinical summary
- ""KeyTakeaways"": array of 3-5 high-yield clinical rules or guidelines
- ""KeyTerms"": dictionary/object of medical terminology with concise definitions
- ""SuggestedRevisionQuestions"": array of 3 NCLEX-style recall questions

Note Content:
{request.NoteText}

Respond ONLY with valid JSON.";

            var jsonText = await CallGeminiAsync(prompt, cancellationToken);
            var parsed = TryParseJson<AISummarizeNoteResultDto>(jsonText);
            return parsed ?? await _fallback.SummarizeNoteAsync(request, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini note summarization failed; falling back to mock provider.");
            return await _fallback.SummarizeNoteAsync(request, cancellationToken);
        }
    }

    public async Task<List<AIGeneratedFlashcardDto>> GenerateFlashcardsAsync(AIGenerateFlashcardsRequest request, CancellationToken cancellationToken = default)
    {
        if (!IsAvailable)
        {
            return await _fallback.GenerateFlashcardsAsync(request, cancellationToken);
        }

        try
        {
            var prompt = $@"You are an expert NCLEX clinical educator. Generate {request.Count} high-yield flashcards for {request.Programme.ToUpperInvariant()} candidates on topic: ""{request.Topic}"".
Source text context (if any): {request.SourceText ?? "N/A"}.

Return ONLY a JSON array of objects with keys:
- ""Front"": concise question or clinical trigger
- ""Back"": clear, memorable clinical answer/intervention
- ""Explanation"": rationale connecting pathophysiology to nursing action
- ""Difficulty"": ""high_yield""
- ""CardStyle"": ""qa""";

            var jsonText = await CallGeminiAsync(prompt, cancellationToken);
            var list = TryParseJson<List<AIGeneratedFlashcardDto>>(jsonText);
            return list is { Count: > 0 } ? list : await _fallback.GenerateFlashcardsAsync(request, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini flashcard generation failed; falling back to mock provider.");
            return await _fallback.GenerateFlashcardsAsync(request, cancellationToken);
        }
    }

    public async Task<List<AIGeneratedQuizQuestionDto>> GenerateQuizAsync(AIGenerateQuizRequest request, CancellationToken cancellationToken = default)
    {
        if (!IsAvailable)
        {
            return await _fallback.GenerateQuizAsync(request, cancellationToken);
        }

        try
        {
            var prompt = $@"Generate {request.Count} NCLEX practice questions for {request.Programme.ToUpperInvariant()} on topic: ""{request.Topic}"".
Return ONLY a JSON array of objects with keys:
- ""Stem"": the clinical question stem
- ""QuestionTypeKey"": ""single-choice""
- ""ClinicalScenario"": brief client situation (vitals, condition)
- ""Options"": array of exactly 4 string options
- ""CorrectAnswerIndices"": array of 1 integer representing the 0-based index of the correct option
- ""Rationale"": detailed explanation of why the correct option is right and others are incorrect
- ""Difficulty"": ""Moderate""";

            var jsonText = await CallGeminiAsync(prompt, cancellationToken);
            var list = TryParseJson<List<AIGeneratedQuizQuestionDto>>(jsonText);
            return list is { Count: > 0 } ? list : await _fallback.GenerateQuizAsync(request, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini quiz generation failed; falling back to mock provider.");
            return await _fallback.GenerateQuizAsync(request, cancellationToken);
        }
    }

    public async Task<string> TutorChatAsync(AITutorChatRequest request, CancellationToken cancellationToken = default)
    {
        if (!IsAvailable)
        {
            return await _fallback.TutorChatAsync(request, cancellationToken);
        }

        try
        {
            var historyText = new StringBuilder();
            if (request.History != null)
            {
                foreach (var msg in request.History.TakeLast(6))
                {
                    historyText.AppendLine($"{msg.Role.ToUpperInvariant()}: {msg.Content}");
                }
            }

            var prompt = $@"You are the PrepFord NCLEX Clinical Tutor, an encouraging, authoritative nursing mentor for {request.Programme.ToUpperInvariant()} students.
Adhere strictly to client safety, ABCs, Maslow's hierarchy, and evidence-based nursing. Keep answers focused, well-structured, and helpful.

Conversation History:
{historyText}

Learner's Question:
{request.Message}

Provide your clinical mentoring answer:";

            var reply = await CallGeminiAsync(prompt, cancellationToken);
            return !string.IsNullOrWhiteSpace(reply) ? reply : await _fallback.TutorChatAsync(request, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini tutor chat failed; falling back to mock provider.");
            return await _fallback.TutorChatAsync(request, cancellationToken);
        }
    }

    public async Task<string> GenerateStudyPlanAsync(AIGenerateStudyPlanRequest request, CancellationToken cancellationToken = default)
    {
        if (!IsAvailable)
        {
            return await _fallback.GenerateStudyPlanAsync(request, cancellationToken);
        }

        try
        {
            var days = (request.TargetExamDate - DateTime.UtcNow).Days;
            var prompt = $@"Create a structured study plan for an NCLEX-{request.Programme.ToUpperInvariant()} candidate with {request.WeeklyHours} available study hours per week and exam date in {days} days.
Return ONLY valid JSON with keys ""overview"", ""milestones"" (array of {phase, days, hoursPerWeek, focus}), and ""dailyRecommendations"" (array of strings).";

            var result = await CallGeminiAsync(prompt, cancellationToken);
            return !string.IsNullOrWhiteSpace(result) ? result : await _fallback.GenerateStudyPlanAsync(request, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini study plan generation failed; falling back to mock provider.");
            return await _fallback.GenerateStudyPlanAsync(request, cancellationToken);
        }
    }

    private async Task<string> CallGeminiAsync(string prompt, CancellationToken cancellationToken)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_modelId}:generateContent?key={_apiKey}";
        var body = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = prompt }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.2,
                maxOutputTokens = 2048
            }
        };

        var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        using var response = await _httpClient.PostAsync(url, content, cancellationToken);
        response.EnsureSuccessStatusCode();

        var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
        using var doc = JsonDocument.Parse(responseJson);

        var text = doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString();

        return text ?? string.Empty;
    }

    private static T? TryParseJson<T>(string raw)
    {
        try
        {
            var cleaned = raw.Trim();
            if (cleaned.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
            {
                cleaned = cleaned.Substring(7);
            }
            else if (cleaned.StartsWith("```", StringComparison.OrdinalIgnoreCase))
            {
                cleaned = cleaned.Substring(3);
            }

            if (cleaned.EndsWith("```", StringComparison.OrdinalIgnoreCase))
            {
                cleaned = cleaned.Substring(0, cleaned.Length - 3);
            }

            cleaned = cleaned.Trim();
            return JsonSerializer.Deserialize<T>(cleaned, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch
        {
            return default;
        }
    }
}
