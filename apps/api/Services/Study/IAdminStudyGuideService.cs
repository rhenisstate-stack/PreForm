using Preform.Api.DTOs;

namespace Preform.Api.Services;

public interface IAdminStudyGuideService
{
    // ── 1. Notes Management ──
    Task<PagedResult<AdminStudyNoteDto>> GetNotesAsync(AdminNoteFilterParameters filter);
    Task<AdminStudyNoteDto?> GetNoteByIdAsync(string id);
    Task<AdminStudyNoteDto> CreateNoteAsync(AdminCreateNoteRequest request, string adminUserId);
    Task<AdminStudyNoteDto> UpdateNoteAsync(string id, AdminUpdateNoteRequest request, string adminUserId);
    Task<bool> DeleteNoteAsync(string id);
    Task<AdminStudyNoteDto> DuplicateNoteAsync(string id, string adminUserId);
    Task<AdminStudyNoteDto> ArchiveNoteAsync(string id, bool isArchived);
    Task<AdminStudyNoteDto> PublishNoteAsync(string id);
    Task<AdminStudyNoteDto> SetNoteStatusAsync(string id, string status);

    // ── 2. Flashcards Management ──
    Task<List<AdminFlashcardDeckDto>> GetDecksAsync(string? programme, string? search, bool? isOfficial);
    Task<AdminFlashcardDeckDto?> GetDeckByIdAsync(string id);
    Task<AdminFlashcardDeckDto> CreateDeckAsync(AdminCreateDeckRequest request, string adminUserId, string adminEmail);
    Task<AdminFlashcardDeckDto> UpdateDeckAsync(string id, AdminUpdateDeckRequest request);
    Task<bool> DeleteDeckAsync(string id);
    Task<AdminFlashcardDeckDto> DuplicateDeckAsync(string id, string adminUserId, string adminEmail);
    Task<AdminFlashcardDeckDto> PublishDeckAsync(string id, bool isPublished);
    Task<AdminFlashcardDeckDto> ArchiveDeckAsync(string id, bool isArchived);

    Task<List<AdminFlashcardDto>> GetDeckCardsAsync(string deckId);
    Task<AdminFlashcardDto> CreateCardAsync(string deckId, AdminCreateCardRequest request, string adminUserId);
    Task<AdminFlashcardDto> UpdateCardAsync(string cardId, AdminUpdateCardRequest request);
    Task<bool> DeleteCardAsync(string cardId);
    Task<AdminFlashcardDto> DuplicateCardAsync(string cardId);
    Task<AdminFlashcardDto> MoveCardAsync(string cardId, string targetDeckId);
    Task<bool> ReorderCardsAsync(string deckId, List<string> cardIds);

    // ── 3. Review Sessions ──
    Task<StudyReviewConfigurationDto> GetReviewConfigurationAsync();
    Task<StudyReviewConfigurationDto> UpdateReviewConfigurationAsync(UpdateReviewConfigurationRequest request, string adminUserId);
    Task<AdminReviewAnalyticsDto> GetReviewAnalyticsAsync(DateTime? from, DateTime? to, string? programme, string? subject);
    Task<PagedResult<AdminReviewSessionRecordDto>> GetReviewSessionsAsync(string? programme, string? status, string? search, int page, int pageSize);
    Task<AdminReviewSessionDetailDto?> GetReviewSessionByIdAsync(string sessionId);

    // ── 4. Topic Quizzes ──
    Task<List<AdminTopicQuizDto>> GetQuizzesAsync(string? programme, string? status, string? search);
    Task<AdminTopicQuizDto?> GetQuizByIdAsync(string id);
    Task<AdminTopicQuizDto> CreateQuizAsync(AdminCreateTopicQuizRequest request, string adminUserId);
    Task<AdminTopicQuizDto> UpdateQuizAsync(string id, AdminUpdateTopicQuizRequest request);
    Task<bool> DeleteQuizAsync(string id);
    Task<AdminTopicQuizDto> DuplicateQuizAsync(string id, string adminUserId);
    Task<AdminTopicQuizDto> PublishQuizAsync(string id, bool isPublished);
    Task<AdminTopicQuizDto> ArchiveQuizAsync(string id, bool isArchived);

    Task<List<AdminQuizQuestionDto>> SearchQuestionsAsync(string? search, string? pathway, string? difficulty, string? typeKey, string? topicId, int limit);
    Task<AdminTopicQuizDto> AssignQuestionsAsync(string quizId, List<string> questionIds);
    Task<AdminQuizAnalyticsDto> GetQuizAnalyticsAsync(DateTime? from, DateTime? to, string? programme);
    Task<List<AIDraftQuestionDto>> GenerateDraftQuestionsAsync(AIGenerateQuizQuestionsRequest request);
}
