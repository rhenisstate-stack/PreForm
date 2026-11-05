using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Preform.Api.Data;
using Preform.Api.Models;

namespace Preform.Api.Services.RateLimiting;

public class PostgresRateLimitingService : ISharedRateLimitingService
{
    private readonly AppDbContext _context;
    private readonly ILogger<PostgresRateLimitingService> _logger;
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> LocalLocks = new();

    public PostgresRateLimitingService(AppDbContext context, ILogger<PostgresRateLimitingService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<RateLimitCheckResult> CheckRateLimitAsync(
        string key,
        int maxAttempts,
        TimeSpan window,
        TimeSpan lockoutDuration,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        var bucket = await _context.RateLimitBuckets
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Key == key, cancellationToken);

        if (bucket == null)
        {
            return RateLimitCheckResult.Allowed(0, maxAttempts);
        }

        if (bucket.LockoutUntilUtc.HasValue && now < bucket.LockoutUntilUtc.Value)
        {
            var retryAfter = (int)Math.Ceiling((bucket.LockoutUntilUtc.Value - now).TotalSeconds);
            return RateLimitCheckResult.Limited(retryAfter, bucket.AttemptCount, maxAttempts, bucket.LockoutUntilUtc);
        }

        if (now - bucket.WindowStartUtc > window)
        {
            return RateLimitCheckResult.Allowed(0, maxAttempts);
        }

        return RateLimitCheckResult.Allowed(bucket.AttemptCount, maxAttempts);
    }

    public async Task<RateLimitCheckResult> RecordFailedAttemptAsync(
        string key,
        int maxAttempts,
        TimeSpan window,
        TimeSpan lockoutDuration,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        if (_context.Database.IsRelational())
        {
            await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                // Advisory lock scoped to current transaction ensuring atomic serialization per key
                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT pg_advisory_xact_lock(hashtext('ratelimit_' || {0}));",
                    new object[] { key },
                    cancellationToken);

                var result = await ProcessFailedAttemptCoreAsync(key, maxAttempts, window, lockoutDuration, now, cancellationToken);
                await tx.CommitAsync(cancellationToken);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error recording rate limit attempt for key {Key}", key);
                await tx.RollbackAsync(cancellationToken);
                throw;
            }
        }
        else
        {
            // Fallback for non-relational providers (e.g., InMemory provider in unit tests)
            var sem = LocalLocks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
            await sem.WaitAsync(cancellationToken);
            try
            {
                return await ProcessFailedAttemptCoreAsync(key, maxAttempts, window, lockoutDuration, now, cancellationToken);
            }
            finally
            {
                sem.Release();
            }
        }
    }

    private async Task<RateLimitCheckResult> ProcessFailedAttemptCoreAsync(
        string key,
        int maxAttempts,
        TimeSpan window,
        TimeSpan lockoutDuration,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var bucket = await _context.RateLimitBuckets
            .FirstOrDefaultAsync(b => b.Key == key, cancellationToken);

        if (bucket == null)
        {
            bucket = new RateLimitBucket
            {
                Key = key,
                AttemptCount = 1,
                WindowStartUtc = now,
                LastAttemptUtc = now,
                ExpiresAtUtc = now + window + lockoutDuration,
                LockoutUntilUtc = 1 > maxAttempts ? now + lockoutDuration : null
            };
            _context.RateLimitBuckets.Add(bucket);
        }
        else
        {
            if (bucket.LockoutUntilUtc.HasValue && now < bucket.LockoutUntilUtc.Value)
            {
                var retryAfter = (int)Math.Ceiling((bucket.LockoutUntilUtc.Value - now).TotalSeconds);
                return RateLimitCheckResult.Limited(retryAfter, bucket.AttemptCount, maxAttempts, bucket.LockoutUntilUtc);
            }

            if (now - bucket.WindowStartUtc > window)
            {
                bucket.AttemptCount = 1;
                bucket.WindowStartUtc = now;
                bucket.LockoutUntilUtc = null;
            }
            else
            {
                bucket.AttemptCount += 1;
            }

            bucket.LastAttemptUtc = now;
            bucket.ExpiresAtUtc = now + window + lockoutDuration;

            if (bucket.AttemptCount > maxAttempts)
            {
                bucket.LockoutUntilUtc = now + lockoutDuration;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        if (bucket.LockoutUntilUtc.HasValue && now < bucket.LockoutUntilUtc.Value)
        {
            var retryAfter = (int)Math.Ceiling((bucket.LockoutUntilUtc.Value - now).TotalSeconds);
            return RateLimitCheckResult.Limited(retryAfter, bucket.AttemptCount, maxAttempts, bucket.LockoutUntilUtc);
        }

        return RateLimitCheckResult.Allowed(bucket.AttemptCount, maxAttempts);
    }

    public async Task ResetRateLimitAsync(string key, CancellationToken cancellationToken = default)
    {
        var bucket = await _context.RateLimitBuckets
            .FirstOrDefaultAsync(b => b.Key == key, cancellationToken);

        if (bucket != null)
        {
            _context.RateLimitBuckets.Remove(bucket);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
