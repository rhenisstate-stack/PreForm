using System.Collections.Concurrent;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.Models;

namespace Preform.Api.Services;

public class SessionSecurityService : ISessionSecurityService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<SessionSecurityService> _logger;
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _userLocks = new();

    public SessionSecurityService(AppDbContext dbContext, ILogger<SessionSecurityService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<SessionSecurityPolicy> GetActivePolicyAsync(CancellationToken cancellationToken = default)
    {
        var policy = await _dbContext.SessionSecurityPolicies
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == "global_policy" && p.IsActive, cancellationToken);

        return policy ?? new SessionSecurityPolicy();
    }

    public async Task<SessionCreationResult> CreateOrRotateSessionAsync(
        User user,
        string role,
        string? clientId,
        string? ipAddress,
        string? userAgent,
        string? fingerprintHash,
        bool rememberMe,
        CancellationToken cancellationToken = default)
    {
        if (user == null)
        {
            return SessionCreationResult.Rejected("INVALID_USER", "A valid user account is required.");
        }

        if (!user.IsActive)
        {
            return SessionCreationResult.Rejected("ACCOUNT_INACTIVE", "This user account is inactive or disabled.");
        }

        var policy = await GetActivePolicyAsync(cancellationToken);
        var now = DateTime.UtcNow;

        var effectiveClientId = !string.IsNullOrWhiteSpace(clientId)
            ? clientId.Trim()
            : "client_" + Guid.NewGuid().ToString("N");

        // Per-user lock guarantees in-process atomicity under simultaneous login requests
        var userLock = _userLocks.GetOrAdd(user.Id, _ => new SemaphoreSlim(1, 1));
        await userLock.WaitAsync(cancellationToken);

        try
        {
            // If running on a relational database (PostgreSQL), execute within a transaction
            if (_dbContext.Database.IsRelational())
            {
                var strategy = _dbContext.Database.CreateExecutionStrategy();
                return await strategy.ExecuteAsync(async () =>
                {
                    await using var transaction = await _dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, cancellationToken);
                    var result = await ProcessSessionCreationAsync(user, role, effectiveClientId, ipAddress, userAgent, fingerprintHash, policy, now, cancellationToken);
                    if (result.Success)
                    {
                        await transaction.CommitAsync(cancellationToken);
                    }
                    else
                    {
                        await transaction.RollbackAsync(cancellationToken);
                    }
                    return result;
                });
            }

            // In-Memory / non-relational test path
            return await ProcessSessionCreationAsync(user, role, effectiveClientId, ipAddress, userAgent, fingerprintHash, policy, now, cancellationToken);
        }
        finally
        {
            userLock.Release();
        }
    }

    private async Task<SessionCreationResult> ProcessSessionCreationAsync(
        User user,
        string role,
        string effectiveClientId,
        string? ipAddress,
        string? userAgent,
        string? fingerprintHash,
        SessionSecurityPolicy policy,
        DateTime now,
        CancellationToken cancellationToken)
    {
        // 1. Fetch currently active, unrevoked sessions for this user
        var activeSessions = await _dbContext.UserSessions
            .Where(s => s.UserId == user.Id && !s.Revoked &&
                (s.AbsoluteExpiresAt > now || (s.AbsoluteExpiresAt == default && s.ExpiresAt > now)) &&
                (s.IdleExpiresAt > now || (s.IdleExpiresAt == default && s.ExpiresAt > now)))
            .OrderBy(s => s.CreatedAt)
            .ToListAsync(cancellationToken);

        // 2. Enforce per-client limit (policy.MaxSessionsPerClient, default 1)
        var maxPerClient = policy.MaxSessionsPerClient > 0 ? policy.MaxSessionsPerClient : 1;
        var sameClientSessions = activeSessions.Where(s => s.ClientId == effectiveClientId).ToList();
        if (sameClientSessions.Count >= maxPerClient)
        {
            var toRevoke = sameClientSessions.Take(sameClientSessions.Count - maxPerClient + 1);
            foreach (var oldClientSession in toRevoke)
            {
                oldClientSession.Revoked = true;
                oldClientSession.RevokedAt = now;
                oldClientSession.RevocationReason = "ReplacedBySameClient";
                activeSessions.Remove(oldClientSession);
            }
        }

        // 3. Atomic Concurrency Limit Check
        var maxAllowed = policy.MaxConcurrentSessions > 0 ? policy.MaxConcurrentSessions : 2;
        if (activeSessions.Count >= maxAllowed)
        {
            _logger.LogWarning("Concurrent session limit reached for user {UserId}: {Count} active >= {Max}", user.Id, activeSessions.Count, maxAllowed);

            _dbContext.AuditLogs.Add(new AuditLog
            {
                ActorId = user.Id,
                Action = "ConcurrentSessionLimitExceeded",
                EntityType = "User",
                EntityId = user.Id,
                Description = $"Login rejected: active session count ({activeSessions.Count}) reached configured limit ({maxAllowed}).",
                Outcome = "Rejected",
                IpAddress = ipAddress,
                Timestamp = now
            });
            await _dbContext.SaveChangesAsync(cancellationToken);

            return SessionCreationResult.Rejected(
                "CONCURRENT_SESSION_LIMIT_EXCEEDED",
                $"Maximum concurrent session limit of {maxAllowed} reached. Please sign out from another device or manage your active sessions."
            );
        }

        // 4. Generate fresh cryptographic token & calculate timeouts
        var rawTokenBytes = RandomNumberGenerator.GetBytes(32);
        var token = "prf_sess_" + Convert.ToHexString(rawTokenBytes).ToLowerInvariant();
        var tokenHash = SessionService.ComputeTokenHash(token);
        var csrfToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();

        var idleMinutes = policy.IdleTimeoutMinutes > 0 ? policy.IdleTimeoutMinutes : 300;
        var absoluteMinutes = policy.AbsoluteTimeoutMinutes > 0 ? policy.AbsoluteTimeoutMinutes : 10080;

        var absoluteExpiresAt = now.AddMinutes(absoluteMinutes);
        var idleExpiresAt = now.AddMinutes(idleMinutes);
        if (idleExpiresAt > absoluteExpiresAt)
        {
            idleExpiresAt = absoluteExpiresAt;
        }

        var effectiveRole = string.IsNullOrWhiteSpace(role) ? "candidate" : role.Trim().ToLowerInvariant();
        var deviceLabel = DeviceDetectionHelper.GetDeviceLabel(userAgent);

        var session = new UserSession
        {
            Id = "sess_" + Guid.NewGuid().ToString("N"),
            UserId = user.Id,
            Email = user.Email.Trim().ToLowerInvariant(),
            Role = effectiveRole,
            DisplayName = user.DisplayName,
            TokenHash = tokenHash,
            CsrfToken = csrfToken,
            ClientId = effectiveClientId,
            CreatedAt = now,
            ExpiresAt = absoluteExpiresAt,
            LastActiveAt = now,
            IdleExpiresAt = idleExpiresAt,
            AbsoluteExpiresAt = absoluteExpiresAt,
            LastIpAddress = ipAddress,
            UserAgent = userAgent,
            DeviceLabel = deviceLabel,
            FingerprintHash = fingerprintHash,
            SecurityVersion = user.SecurityVersion,
            Revoked = false
        };

        _dbContext.UserSessions.Add(session);

        _dbContext.AuditLogs.Add(new AuditLog
        {
            ActorId = user.Id,
            Action = "SessionCreated",
            EntityType = "UserSession",
            EntityId = session.Id,
            Description = $"Session created for client {effectiveClientId} ({deviceLabel})",
            Outcome = "Success",
            IpAddress = ipAddress,
            Timestamp = now
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        return SessionCreationResult.Ok(token, session);
    }

    public async Task<SessionValidationResult> ValidateSessionAsync(
        string tokenOrSessionId,
        bool isToken,
        string? ipAddress = null,
        string? userAgent = null,
        string? fingerprintHash = null,
        bool isQualifyingActivity = true,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tokenOrSessionId))
        {
            return SessionValidationResult.Fail("MISSING_CREDENTIAL", "Session credential is required.");
        }

        var now = DateTime.UtcNow;
        var policy = await GetActivePolicyAsync(cancellationToken);

        UserSession? session;
        if (isToken)
        {
            var tokenHash = SessionService.ComputeTokenHash(tokenOrSessionId);
            session = await _dbContext.UserSessions
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.TokenHash == tokenHash, cancellationToken);
        }
        else
        {
            session = await _dbContext.UserSessions
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.Id == tokenOrSessionId, cancellationToken);
        }

        if (session == null)
        {
            return SessionValidationResult.Fail("SESSION_NOT_FOUND", "Session record does not exist.");
        }

        if (session.Revoked)
        {
            return SessionValidationResult.Fail("SESSION_REVOKED", "Session has been revoked.");
        }

        if (session.User == null || !session.User.IsActive)
        {
            return SessionValidationResult.Fail("ACCOUNT_INACTIVE", "Account is inactive or disabled.");
        }

        // Security Version Check
        if (session.SecurityVersion != session.User.SecurityVersion)
        {
            session.Revoked = true;
            session.RevokedAt = now;
            session.RevocationReason = "PrivilegeOrSecurityVersionChanged";
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogWarning("Session {SessionId} invalidated: SecurityVersion mismatch ({SessionVer} vs {UserVer})",
                session.Id, session.SecurityVersion, session.User.SecurityVersion);

            return SessionValidationResult.Fail("SECURITY_VERSION_CHANGED", "Account privileges or security credentials have changed. Reauthentication required.");
        }

        var absoluteLimit = session.AbsoluteExpiresAt != default ? session.AbsoluteExpiresAt : session.ExpiresAt;
        var idleLimit = session.IdleExpiresAt != default ? session.IdleExpiresAt : session.ExpiresAt;

        // Absolute Expiration Check
        if (now >= absoluteLimit)
        {
            session.Revoked = true;
            session.RevokedAt = now;
            session.RevocationReason = "AbsoluteTimeout";

            _dbContext.AuditLogs.Add(new AuditLog
            {
                ActorId = session.UserId,
                Action = "SessionExpiredAbsolute",
                EntityType = "UserSession",
                EntityId = session.Id,
                Description = "Session expired due to absolute timeout limit.",
                Outcome = "Expired",
                IpAddress = ipAddress,
                Timestamp = now
            });
            await _dbContext.SaveChangesAsync(cancellationToken);

            return SessionValidationResult.Fail("SESSION_ABSOLUTE_TIMEOUT", "Session has reached its maximum lifetime.");
        }

        // Idle Expiration Check
        if (now >= idleLimit)
        {
            session.Revoked = true;
            session.RevokedAt = now;
            session.RevocationReason = "IdleTimeout";

            _dbContext.AuditLogs.Add(new AuditLog
            {
                ActorId = session.UserId,
                Action = "SessionExpiredIdle",
                EntityType = "UserSession",
                EntityId = session.Id,
                Description = "Session expired due to inactivity.",
                Outcome = "Expired",
                IpAddress = ipAddress,
                Timestamp = now
            });
            await _dbContext.SaveChangesAsync(cancellationToken);

            return SessionValidationResult.Fail("SESSION_IDLE_TIMEOUT", "Session expired due to inactivity.");
        }

        // Effective Expiration calculation: min(Idle, Absolute)
        var effectiveExpiry = idleLimit < absoluteLimit ? idleLimit : absoluteLimit;

        // Qualifying Activity & Activity Throttling
        if (isQualifyingActivity)
        {
            var elapsed = now - session.LastActiveAt;
            // Write throttling: only persist if at least 5 minutes elapsed since last recorded activity
            if (elapsed.TotalMinutes >= 5)
            {
                session.LastActiveAt = now;
                var newIdle = now.AddMinutes(policy.IdleTimeoutMinutes > 0 ? policy.IdleTimeoutMinutes : 300);
                session.IdleExpiresAt = newIdle < absoluteLimit ? newIdle : absoluteLimit;

                if (!string.IsNullOrWhiteSpace(ipAddress) && policy.AllowIpDrift)
                {
                    session.LastIpAddress = ipAddress;
                }

                await _dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        return SessionValidationResult.Valid(session, effectiveExpiry);
    }

    public async Task<bool> RevokeSessionAsync(string sessionId, string reason, string actorUserId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(sessionId)) return false;

        var session = await _dbContext.UserSessions.FindAsync(new object[] { sessionId }, cancellationToken);
        if (session == null || session.Revoked) return false;

        var now = DateTime.UtcNow;
        session.Revoked = true;
        session.RevokedAt = now;
        session.RevocationReason = string.IsNullOrWhiteSpace(reason) ? "Revoked" : reason;

        _dbContext.AuditLogs.Add(new AuditLog
        {
            ActorId = actorUserId,
            Action = "SessionRevoked",
            EntityType = "UserSession",
            EntityId = sessionId,
            Description = $"Session {sessionId} revoked (Reason: {session.RevocationReason})",
            Outcome = "Success",
            Timestamp = now
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<int> RevokeOtherSessionsAsync(string userId, string currentSessionId, string actorUserId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId)) return 0;

        var now = DateTime.UtcNow;
        var otherSessions = await _dbContext.UserSessions
            .Where(s => s.UserId == userId && s.Id != currentSessionId && !s.Revoked)
            .ToListAsync(cancellationToken);

        if (otherSessions.Count == 0) return 0;

        foreach (var s in otherSessions)
        {
            s.Revoked = true;
            s.RevokedAt = now;
            s.RevocationReason = "RevokedByOtherSession";
        }

        _dbContext.AuditLogs.Add(new AuditLog
        {
            ActorId = actorUserId,
            Action = "RevokeOtherSessions",
            EntityType = "User",
            EntityId = userId,
            Description = $"Revoked {otherSessions.Count} other sessions for user {userId}",
            Outcome = "Success",
            Timestamp = now
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return otherSessions.Count;
    }

    public async Task<int> RevokeAllUserSessionsAsync(string userId, string reason, string actorUserId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId)) return 0;

        var now = DateTime.UtcNow;
        var activeSessions = await _dbContext.UserSessions
            .Where(s => s.UserId == userId && !s.Revoked)
            .ToListAsync(cancellationToken);

        if (activeSessions.Count == 0) return 0;

        foreach (var s in activeSessions)
        {
            s.Revoked = true;
            s.RevokedAt = now;
            s.RevocationReason = string.IsNullOrWhiteSpace(reason) ? "RevokeAll" : reason;
        }

        _dbContext.AuditLogs.Add(new AuditLog
        {
            ActorId = actorUserId,
            Action = "RevokeAllUserSessions",
            EntityType = "User",
            EntityId = userId,
            Description = $"Revoked all ({activeSessions.Count}) sessions for user {userId} (Reason: {reason})",
            Outcome = "Success",
            Timestamp = now
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return activeSessions.Count;
    }

    public async Task InvalidateUserSecurityVersionAsync(string userId, string reason, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId)) return;

        var user = await _dbContext.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null) return;

        user.SecurityVersion++;
        user.UpdatedAt = DateTime.UtcNow;

        var policy = await GetActivePolicyAsync(cancellationToken);
        if (policy.RotateOnPrivilegeChange)
        {
            await RevokeAllUserSessionsAsync(userId, reason, "system", cancellationToken);
        }

        _dbContext.AuditLogs.Add(new AuditLog
        {
            ActorId = userId,
            Action = "SecurityVersionInvalidated",
            EntityType = "User",
            EntityId = userId,
            Description = $"Security version incremented to {user.SecurityVersion} (Reason: {reason})",
            Outcome = "Success",
            Timestamp = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<UserSession>> GetActiveSessionsForUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId)) return new List<UserSession>();

        var now = DateTime.UtcNow;
        return await _dbContext.UserSessions
            .AsNoTracking()
            .Where(s => s.UserId == userId && !s.Revoked &&
                (s.AbsoluteExpiresAt > now || (s.AbsoluteExpiresAt == default && s.ExpiresAt > now)) &&
                (s.IdleExpiresAt > now || (s.IdleExpiresAt == default && s.ExpiresAt > now)))
            .OrderByDescending(s => s.LastActiveAt)
            .ToListAsync(cancellationToken);
    }
}
