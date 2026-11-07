using Preform.Api.DTOs;

namespace Preform.Api.Services;

public interface IQuestionMediaService
{
    Task<QuestionMediaDto> UploadQuestionMediaAsync(
        string? questionId,
        string? fieldKey,
        string? fileName,
        byte[] imageBytes,
        string? declaredContentType,
        string? authorId,
        CancellationToken ct = default);

    Task<QuestionMediaBinaryDto?> GetQuestionMediaByIdAsync(
        string mediaId,
        CancellationToken ct = default);

    Task<bool> DeleteQuestionMediaAsync(
        string mediaId,
        string? editorId,
        CancellationToken ct = default);

    Task<List<QuestionMediaDto>> GetMediaForQuestionAsync(
        string questionId,
        CancellationToken ct = default);

    Task AssociateDraftMediaAsync(
        string questionId,
        IEnumerable<string> mediaIds,
        CancellationToken ct = default);
}
