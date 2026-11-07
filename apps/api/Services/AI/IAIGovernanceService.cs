using Preform.Api.DTOs;

namespace Preform.Api.Services.AI;

public interface IAIGovernanceService
{
    Task<bool> IsFeatureEnabledAsync(string featureKey);
    Task<bool> CanUserMakeRequestAsync(string userId);
    Task LogRequestAsync(string userId, string feature, string provider, string model, int inputTokens, int outputTokens, int latencyMs, string status, string? errorMessage = null);
    Task<AIProviderConfigurationDto> GetConfigurationAsync();
    Task<AIProviderConfigurationDto> UpdateConfigurationAsync(UpdateAIConfigurationRequest request);
    Task<AIUsageMonitoringDto> GetMonitoringMetricsAsync(string? userId = null);
}
