namespace Preform.Api.Services.RateLimiting;

public class RateLimitCheckResult
{
    public bool IsRateLimited { get; set; }
    public int RetryAfterSeconds { get; set; }
    public int CurrentAttempts { get; set; }
    public int MaxAttempts { get; set; }
    public DateTime? LockoutUntil { get; set; }

    public static RateLimitCheckResult Allowed(int currentAttempts, int maxAttempts) =>
        new() { IsRateLimited = false, RetryAfterSeconds = 0, CurrentAttempts = currentAttempts, MaxAttempts = maxAttempts };

    public static RateLimitCheckResult Limited(int retryAfterSeconds, int currentAttempts, int maxAttempts, DateTime? lockoutUntil) =>
        new() { IsRateLimited = true, RetryAfterSeconds = Math.Max(1, retryAfterSeconds), CurrentAttempts = currentAttempts, MaxAttempts = maxAttempts, LockoutUntil = lockoutUntil };
}

public interface ISharedRateLimitingService
{
    Task<RateLimitCheckResult> CheckRateLimitAsync(string key, int maxAttempts, TimeSpan window, TimeSpan lockoutDuration, CancellationToken cancellationToken = default);
    Task<RateLimitCheckResult> RecordFailedAttemptAsync(string key, int maxAttempts, TimeSpan window, TimeSpan lockoutDuration, CancellationToken cancellationToken = default);
    Task ResetRateLimitAsync(string key, CancellationToken cancellationToken = default);
}
