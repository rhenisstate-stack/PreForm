using Preform.Api.DTOs;

namespace Preform.Api.Services.AI;

public interface IAIStudyProvider
{
    string ProviderName { get; }
    bool IsAvailable { get; }

    Task<AISummarizeNoteResultDto> SummarizeNoteAsync(AISummarizeNoteRequest request, CancellationToken cancellationToken = default);
    Task<List<AIGeneratedFlashcardDto>> GenerateFlashcardsAsync(AIGenerateFlashcardsRequest request, CancellationToken cancellationToken = default);
    Task<List<AIGeneratedQuizQuestionDto>> GenerateQuizAsync(AIGenerateQuizRequest request, CancellationToken cancellationToken = default);
    Task<string> TutorChatAsync(AITutorChatRequest request, CancellationToken cancellationToken = default);
    Task<string> GenerateStudyPlanAsync(AIGenerateStudyPlanRequest request, CancellationToken cancellationToken = default);
}
