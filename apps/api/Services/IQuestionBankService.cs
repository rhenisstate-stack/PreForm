using Preform.Api.DTOs;

namespace Preform.Api.Services;

public interface IQuestionBankService
{
    Task<PaginatedResponse<QuestionSummaryDto>> GetQuestionsAsync(QuestionQueryParameters query, CancellationToken ct = default);
    Task<QuestionDetailDto?> GetQuestionByIdAsync(string id, CancellationToken ct = default);
    Task<QuestionDetailDto> CreateQuestionAsync(CreateQuestionRequest request, string authorUserId, CancellationToken ct = default);
    Task<QuestionDetailDto?> UpdateQuestionAsync(string id, UpdateQuestionRequest request, string editorUserId, CancellationToken ct = default);
    Task<QuestionDetailDto?> TransitionStatusAsync(string id, QuestionStatusTransitionRequest request, string actorUserId, bool isSuperAdmin, CancellationToken ct = default);
    Task<List<QuestionVersionDto>> GetQuestionVersionsAsync(string questionId, CancellationToken ct = default);
}
