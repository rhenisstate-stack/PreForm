using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services.AI;

public class AIGovernanceService : IAIGovernanceService
{
    private readonly AppDbContext _context;
    private readonly ILogger<AIGovernanceService> _logger;

    public AIGovernanceService(AppDbContext context, ILogger<AIGovernanceService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<bool> IsFeatureEnabledAsync(string featureKey)
    {
        var config = await GetOrInitConfigAsync();
        if (!config.IsEnabled) return false;

        try
        {
            var toggles = JsonSerializer.Deserialize<Dictionary<string, bool>>(config.FeatureTogglesJson);
            if (toggles != null && toggles.TryGetValue(featureKey, out var enabled))
            {
                return enabled;
            }
        }
        catch
        {
            // Default to enabled if parsing fails
        }

        return true;
    }

    public async Task<bool> CanUserMakeRequestAsync(string userId)
    {
        var config = await GetOrInitConfigAsync();
        if (!config.IsEnabled) return false;

        var startOfDay = DateTime.UtcNow.Date;
        var count = await _context.AIRequests
            .CountAsync(r => r.UserId == userId && r.CreatedAt >= startOfDay);

        return count < config.DailyPerUserQuota;
    }

    public async Task LogRequestAsync(
        string userId,
        string feature,
        string provider,
        string model,
        int inputTokens,
        int outputTokens,
        int latencyMs,
        string status,
        string? errorMessage = null)
    {
        var req = new AIRequest
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            Feature = feature,
            Provider = provider,
            Model = model,
            InputTokens = inputTokens,
            OutputTokens = outputTokens,
            LatencyMs = latencyMs,
            Status = status,
            ErrorMessage = errorMessage,
            CreatedAt = DateTime.UtcNow
        };

        _context.AIRequests.Add(req);

        // Update daily aggregate usage
        var today = DateTime.UtcNow.Date;
        var usage = await _context.AIUsageRecords
            .FirstOrDefaultAsync(u => u.UserId == userId && u.DateUtc == today);

        if (usage == null)
        {
            usage = new AIUsageRecord
            {
                Id = Guid.NewGuid().ToString(),
                UserId = userId,
                DateUtc = today,
                RequestCount = 1,
                TotalInputTokens = inputTokens,
                TotalOutputTokens = outputTokens,
                EstimatedCostUsd = (inputTokens + outputTokens) * 0.00000015m
            };
            _context.AIUsageRecords.Add(usage);
        }
        else
        {
            usage.RequestCount++;
            usage.TotalInputTokens += inputTokens;
            usage.TotalOutputTokens += outputTokens;
            usage.EstimatedCostUsd += (inputTokens + outputTokens) * 0.00000015m;
        }

        await _context.SaveChangesAsync();
    }

    public async Task<AIProviderConfigurationDto> GetConfigurationAsync()
    {
        var config = await GetOrInitConfigAsync();
        return MapConfig(config);
    }

    public async Task<AIProviderConfigurationDto> UpdateConfigurationAsync(UpdateAIConfigurationRequest request)
    {
        var config = await GetOrInitConfigAsync();

        if (request.ProviderName != null) config.ProviderName = request.ProviderName;
        if (request.ModelId != null) config.ModelId = request.ModelId;
        if (request.IsEnabled.HasValue) config.IsEnabled = request.IsEnabled.Value;
        if (request.Temperature.HasValue) config.Temperature = request.Temperature.Value;
        if (request.MaxOutputTokens.HasValue) config.MaxOutputTokens = request.MaxOutputTokens.Value;
        if (request.TimeoutSeconds.HasValue) config.TimeoutSeconds = request.TimeoutSeconds.Value;
        if (request.DailyPerUserQuota.HasValue) config.DailyPerUserQuota = request.DailyPerUserQuota.Value;
        if (request.FeatureToggles != null)
        {
            config.FeatureTogglesJson = JsonSerializer.Serialize(request.FeatureToggles);
        }

        config.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapConfig(config);
    }

    public async Task<AIUsageMonitoringDto> GetMonitoringMetricsAsync(string? userId = null)
    {
        var config = await GetOrInitConfigAsync();
        var today = DateTime.UtcNow.Date;

        var requestsQuery = _context.AIRequests.AsNoTracking().Where(r => r.CreatedAt >= today);
        var totalRequestsToday = await requestsQuery.CountAsync();
        var totalInputTokens = await requestsQuery.SumAsync(r => r.InputTokens);
        var totalOutputTokens = await requestsQuery.SumAsync(r => r.OutputTokens);
        var totalTokens = totalInputTokens + totalOutputTokens;

        int remainingQuota = config.DailyPerUserQuota;
        if (!string.IsNullOrWhiteSpace(userId))
        {
            var userReqCount = await _context.AIRequests.CountAsync(r => r.UserId == userId && r.CreatedAt >= today);
            remainingQuota = Math.Max(0, config.DailyPerUserQuota - userReqCount);
        }

        var recent = await _context.AIRequests
            .AsNoTracking()
            .OrderByDescending(r => r.CreatedAt)
            .Take(15)
            .Select(r => new AIRequestLogDto
            {
                Id = r.Id,
                UserId = r.UserId,
                Feature = r.Feature,
                Model = r.Model,
                InputTokens = r.InputTokens,
                OutputTokens = r.OutputTokens,
                LatencyMs = r.LatencyMs,
                Status = r.Status,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();

        return new AIUsageMonitoringDto
        {
            TotalRequestsToday = totalRequestsToday,
            TotalTokensToday = totalTokens,
            EstimatedCostTodayUsd = totalTokens * 0.00000015m,
            UserRemainingDailyQuota = remainingQuota,
            RecentRequests = recent
        };
    }

    private async Task<AIProviderConfiguration> GetOrInitConfigAsync()
    {
        var config = await _context.AIProviderConfigurations.FirstOrDefaultAsync();
        if (config == null)
        {
            config = new AIProviderConfiguration
            {
                Id = Guid.NewGuid().ToString(),
                ProviderName = "gemini",
                ModelId = "gemini-1.5-flash",
                IsEnabled = true,
                Temperature = 0.2,
                MaxOutputTokens = 2048,
                TimeoutSeconds = 30,
                FeatureTogglesJson = JsonSerializer.Serialize(new Dictionary<string, bool>
                {
                    ["notes"] = true,
                    ["flashcards"] = true,
                    ["quizzes"] = true,
                    ["tutor"] = true,
                    ["plans"] = true,
                    ["documents"] = true
                }),
                DailyPerUserQuota = 50,
                UpdatedAt = DateTime.UtcNow
            };
            _context.AIProviderConfigurations.Add(config);
            await _context.SaveChangesAsync();
        }

        return config;
    }

    private static AIProviderConfigurationDto MapConfig(AIProviderConfiguration c)
    {
        Dictionary<string, bool> toggles;
        try
        {
            toggles = JsonSerializer.Deserialize<Dictionary<string, bool>>(c.FeatureTogglesJson) ?? new();
        }
        catch
        {
            toggles = new();
        }

        return new AIProviderConfigurationDto
        {
            Id = c.Id,
            ProviderName = c.ProviderName,
            ModelId = c.ModelId,
            IsEnabled = c.IsEnabled,
            Temperature = c.Temperature,
            MaxOutputTokens = c.MaxOutputTokens,
            TimeoutSeconds = c.TimeoutSeconds,
            FeatureToggles = toggles,
            DailyPerUserQuota = c.DailyPerUserQuota,
            UpdatedAt = c.UpdatedAt
        };
    }
}
