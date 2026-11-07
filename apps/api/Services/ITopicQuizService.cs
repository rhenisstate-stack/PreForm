using Preform.Api.DTOs;

namespace Preform.Api.Services;

public interface ITopicQuizService
{
    Task<TopicQuizConfigurationDto> CreateConfigurationAsync(string userId, CreateTopicQuizConfigurationRequest request);
    Task<List<TopicQuizConfigurationDto>> GetUserConfigurationsAsync(string userId, string? programme = null);
    Task<bool> DeleteConfigurationAsync(string userId, string configurationId);

    Task<TopicQuizAttemptDto> StartAttemptAsync(string userId, StartTopicQuizAttemptRequest request);
    Task<TopicQuizAttemptDto?> GetAttemptAsync(string userId, string attemptId);
    Task<TopicQuizResponseDto> SubmitResponseAsync(string userId, string attemptId, SubmitTopicQuizResponseRequest request);
    Task<TopicQuizResultsDto> CompleteAttemptAsync(string userId, string attemptId);
    Task<TopicQuizResultsDto> GetAttemptResultsAsync(string userId, string attemptId);
    Task<List<TopicQuizAttemptDto>> GetUserAttemptsAsync(string userId, string? programme = null, int limit = 20);
}
