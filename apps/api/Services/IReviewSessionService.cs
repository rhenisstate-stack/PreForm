using Preform.Api.DTOs;

namespace Preform.Api.Services;

public interface IReviewSessionService
{
    Task<StudyReviewSessionDto> StartSessionAsync(string userId, StartReviewSessionRequest request);
    Task<StudyReviewSessionDto?> GetSessionAsync(string userId, string sessionId);
    Task<StudyReviewSessionDto> SubmitRatingAsync(string userId, string sessionId, SubmitSessionCardRatingRequest request);
    Task<StudyReviewSessionDto> CompleteSessionAsync(string userId, string sessionId);
    Task<ReviewSessionSummaryReportDto> GetSessionSummaryAsync(string userId, string sessionId);
    Task<List<StudyReviewSessionDto>> GetUserSessionsAsync(string userId, string? programme = null, int limit = 20);
}
