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

    /// <summary>
    /// Client identity prefix assigned by migration 0009 to every pre-existing session that
    /// predated the canonical `cid_*` browser-identity architecture. Such sessions were
    /// never claimed by any recognized browser client, cannot be rotated by the BFF client
    /// flow, and at most one of them is reachable through a preserved legacy token. They are
    /// therefore excluded from concurrent-slot accounting and eligible-session listing, and
    /// are decommissioned during explicit credential-verified login recovery.
    /// </summary>
    public const string LegacyBackfilledClientPrefix = "legacy_";

    /// <summary>Revocation reason for sessions that cannot authenticate (time-expired).</summary>
    public const string ExpiredSessionSweptReason = "ExpiredSessionSwept";

    /// <summary>Revocation reason for security-version-stale sessions (matches the sentinel used by ValidateSessionAsync).</summary>
    public const string PrivilegeOrSecurityVersionChangedReason = "PrivilegeOrSecurityVersionChanged";

    /// <summary>Revocation reason for migration-backfilled legacy sessions during credential-verified recovery.</summary>
    public const string LegacySessionDecommissionedReason = "LegacyBackfillDecommissioned";

    /// <summary>Revocation reason for eligible sessions cleared at the user's explicit recovery request.</summary>
    public const string LoginAccessRecoveryRevokedReason = "LoginAccessRecoveryRevoked";

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
                    if (_dbContext.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true)
                    {
                        // Transaction-scoped PostgreSQL advisory xact lock keyed to the user ID ensures strict cross-instance serializability
                        await _dbContext.Database.ExecuteSqlRawAsync(
                            "SELECT pg_advisory_xact_lock(hashtext('user_session_' || {0}));",
                            new object[] { user.Id },
                            cancellationToken);
                    }
                    var result = await ProcessSessionCreationAsync(user, role, effectiveClientId, ipAddress, userAgent, fingerprintHash, policy, now, cancellationToken);
                    // Commit both on success AND on structured rejection: rejection carries no
                    // session row, but it must persist the ineligible-session sweep and the
                    // ConcurrentSessionLimitExceeded audit entry performed under this advisory
                    // lock (previously a rejection rolled the sweep and the audit into a
                    // discarded transaction, leaving stale sessions to keep consuming slots
                    // and hiding limit rejections from operational metrics on PostgreSQL).
                    await transaction.CommitAsync(cancellationToken);
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

    /// <summary>
    /// Revokes unrevoked sessions that can no longer authenticate: expired by absolute or
    /// idle timeout, or invalidated by a security-version change (using the sentinel reason
    /// that keeps <see cref="ValidateSessionAsync"/> failure messages consistent). Scoped
    /// strictly to the affected user's own session records, persisted with per-session audit
    /// events, and intended to run inside the per-user advisory-locked transaction so
    /// concurrent logins cannot over-count ineligible sessions.
    /// </summary>
    private async Task<int> SweepIneligibleSessionsAsync(
        User user,
        DateTime now,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var staleSessions = await _dbContext.UserSessions
            .Where(s => s.UserId == user.Id && !s.Revoked && (
                (s.AbsoluteExpiresAt != default && s.AbsoluteExpiresAt <= now) ||
                (s.AbsoluteExpiresAt == default && s.ExpiresAt <= now) ||
                (s.IdleExpiresAt != default && s.IdleExpiresAt <= now) ||
                (s.IdleExpiresAt == default && s.ExpiresAt <= now) ||
                s.SecurityVersion != user.SecurityVersion))
            .ToListAsync(cancellationToken);

        foreach (var stale in staleSessions)
        {
            var securityStale = stale.SecurityVersion != user.SecurityVersion;
            stale.Revoked = true;
            stale.RevokedAt = now;
            stale.RevocationReason = securityStale
                ? PrivilegeOrSecurityVersionChangedReason
                : ExpiredSessionSweptReason;

            _dbContext.AuditLogs.Add(new AuditLog
            {
                ActorId = user.Id,
                Action = "IneligibleSessionSwept",
                EntityType = "UserSession",
                EntityId = stale.Id,
                Description = securityStale
                    ? "Swept session that was invalidated by a security-version change while enforcing concurrent-session accounting."
                    : "Swept session that had expired while enforcing concurrent-session accounting.",
                Outcome = "Swept",
                IpAddress = ipAddress,
                Timestamp = now
            });
        }

        if (staleSessions.Count > 0)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
            _logger.LogInformation(
                "Swept {Count} ineligible session(s) for user {UserId} during session accounting",
                staleSessions.Count, user.Id);
        }

        return staleSessions.Count;
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
        var deviceLabel = DeviceDetectionHelper.GetDeviceLabel(userAgent);

        // 0. Server-authoritative sweep: revoke unrevoked sessions that can no longer
        //    authenticate (time-expired or security-version stale) so they stop consuming
        //    concurrent-session slots. Runs inside the per-user advisory-locked transaction,
        //    persists with an audit trail, and never removes security audit events.
        //    Legacy backfilled sessions are NOT swept here: they are excluded from slot
        //    accounting below and are decommissioned only via explicit login recovery.
        await SweepIneligibleSessionsAsync(user, now, ipAddress, cancellationToken);

        // 1. Fetch currently active, unrevoked, authentication-eligible sessions for this
        //    user. Uses the authoritative eligibility rule shared with ValidateSessionAsync,
        //    the learner session listing, and admin metrics: revoked, time-expired,
        //    security-version-stale, and migration-backfilled legacy sessions must not
        //    consume a concurrent-session slot.
        var activeSessions = await _dbContext.UserSessions
            .Where(s => s.UserId == user.Id && !s.Revoked &&
                s.SecurityVersion == user.SecurityVersion &&
                (s.AbsoluteExpiresAt > now || (s.AbsoluteExpiresAt == default && s.ExpiresAt > now)) &&
                (s.IdleExpiresAt > now || (s.IdleExpiresAt == default && s.ExpiresAt > now)) &&
                !s.ClientId.StartsWith(LegacyBackfilledClientPrefix))
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

                _dbContext.AuditLogs.Add(new AuditLog
                {
                    ActorId = user.Id,
                    Action = "ClientIdentityChanged",
                    EntityType = "UserSession",
                    EntityId = oldClientSession.Id,
                    Description = $"Session on client {effectiveClientId} rotated ({deviceLabel})",
                    Outcome = "Rotated",
                    IpAddress = ipAddress,
                    Timestamp = now
                });
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

        var isExistingClient = await _dbContext.UserSessions
            .AnyAsync(s => s.UserId == user.Id && s.ClientId == effectiveClientId, cancellationToken);

        _dbContext.UserSessions.Add(session);

        if (!isExistingClient)
        {
            _dbContext.AuditLogs.Add(new AuditLog
            {
                ActorId = user.Id,
                Action = "NewClientDetected",
                EntityType = "UserSession",
                EntityId = session.Id,
                Description = $"New client device detected: {effectiveClientId} ({deviceLabel})",
                Outcome = "Success",
                IpAddress = ipAddress,
                Timestamp = now
            });
        }

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

        if (session.User == null || !session.User.IsActive)
        {
            return SessionValidationResult.Fail("ACCOUNT_INACTIVE", "Account is inactive or disabled.");
        }

        // Security Version Check (prioritize specific security version change error)
        if (session.SecurityVersion != session.User.SecurityVersion || session.RevocationReason == "PrivilegeOrSecurityVersionChanged")
        {
            if (!session.Revoked)
            {
                session.Revoked = true;
                session.RevokedAt = now;
                session.RevocationReason = "PrivilegeOrSecurityVersionChanged";
                await _dbContext.SaveChangesAsync(cancellationToken);
            }

            _logger.LogWarning("Session {SessionId} invalidated: SecurityVersion mismatch ({SessionVer} vs {UserVer})",
                session.Id, session.SecurityVersion, session.User.SecurityVersion);

            return SessionValidationResult.Fail("SECURITY_VERSION_CHANGED", "Account privileges or security credentials have changed. Reauthentication required.");
        }

        if (session.Revoked)
        {
            return SessionValidationResult.Fail("SESSION_REVOKED", "Session has been revoked.");
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

        // Context Change & Anomaly Assessment
        var riskAssessment = DeviceDetectionHelper.AssessContextChange(
            session.UserAgent,
            userAgent,
            session.LastIpAddress,
            ipAddress);

        if (riskAssessment.IsOsChanged)
        {
            var oldOs = DeviceDetectionHelper.ResolveOperatingSystem(session.UserAgent ?? string.Empty);
            var newOs = DeviceDetectionHelper.ResolveOperatingSystem(userAgent ?? string.Empty);

            _logger.LogWarning("Suspicious session context detected for session {SessionId}: OS changed from {OldOs} to {NewOs}",
                session.Id, oldOs, newOs);

            _dbContext.AuditLogs.Add(new AuditLog
            {
                ActorId = session.UserId,
                Action = "SuspiciousSessionContext",
                EntityType = "UserSession",
                EntityId = session.Id,
                Description = $"Suspicious session context: Operating system changed from {oldOs} to {newOs} on active session",
                Outcome = "Flagged",
                IpAddress = ipAddress,
                Timestamp = now
            });

            session.UserAgent = userAgent;
            session.DeviceLabel = DeviceDetectionHelper.GetDeviceLabel(userAgent);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        else if (riskAssessment.IsBrowserChanged)
        {
            var oldBrowser = DeviceDetectionHelper.ResolveBrowser(session.UserAgent ?? string.Empty);
            var newBrowser = DeviceDetectionHelper.ResolveBrowser(userAgent ?? string.Empty);

            _dbContext.AuditLogs.Add(new AuditLog
            {
                ActorId = session.UserId,
                Action = "UserAgentChanged",
                EntityType = "UserSession",
                EntityId = session.Id,
                Description = $"Browser family changed from {oldBrowser} to {newBrowser} on active session",
                Outcome = "Updated",
                IpAddress = ipAddress,
                Timestamp = now
            });

            session.UserAgent = userAgent;
            session.DeviceLabel = DeviceDetectionHelper.GetDeviceLabel(userAgent);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        else if (riskAssessment.IsIpChanged)
        {
            if (!policy.AllowIpDrift || policy.EnforceIpConsistency)
            {
                _logger.LogWarning("IP consistency violation for session {SessionId}: {OldIp} vs {NewIp}",
                    session.Id, session.LastIpAddress, ipAddress);

                _dbContext.AuditLogs.Add(new AuditLog
                {
                    ActorId = session.UserId,
                    Action = "SuspiciousSessionContext",
                    EntityType = "UserSession",
                    EntityId = session.Id,
                    Description = $"IP consistency violation: IP changed from {session.LastIpAddress} to {ipAddress} while AllowIpDrift is disabled",
                    Outcome = "Flagged",
                    IpAddress = ipAddress,
                    Timestamp = now
                });
                await _dbContext.SaveChangesAsync(cancellationToken);

                return SessionValidationResult.Fail("IP_CONSISTENCY_VIOLATION", "Session IP address mismatch under strict IP policy.");
            }
            else
            {
                _dbContext.AuditLogs.Add(new AuditLog
                {
                    ActorId = session.UserId,
                    Action = "IpAddressChanged",
                    EntityType = "UserSession",
                    EntityId = session.Id,
                    Description = $"IP address changed from {session.LastIpAddress} to {ipAddress}",
                    Outcome = "Allowed",
                    IpAddress = ipAddress,
                    Timestamp = now
                });

                session.LastIpAddress = ipAddress;
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
        }

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

        if (_dbContext.Database.IsRelational())
        {
            var strategy = _dbContext.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, cancellationToken);
                if (_dbContext.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true)
                {
                    await _dbContext.Database.ExecuteSqlRawAsync(
                        "SELECT pg_advisory_xact_lock(hashtext('user_session_' || {0}));",
                        new object[] { userId },
                        cancellationToken);
                }
                await ProcessInvalidateUserSecurityVersionAsync(userId, reason, cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            });
            return;
        }

        await ProcessInvalidateUserSecurityVersionAsync(userId, reason, cancellationToken);
    }

    private async Task ProcessInvalidateUserSecurityVersionAsync(string userId, string reason, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null) return;

        user.SecurityVersion++;
        user.UpdatedAt = DateTime.UtcNow;

        var now = DateTime.UtcNow;
        var policy = await GetActivePolicyAsync(cancellationToken);

        var activeSessions = await _dbContext.UserSessions
            .Where(s => s.UserId == userId && !s.Revoked)
            .ToListAsync(cancellationToken);

        if (policy.RotateOnPrivilegeChange && activeSessions.Count > 0)
        {
            foreach (var s in activeSessions)
            {
                s.Revoked = true;
                s.RevokedAt = now;
                s.RevocationReason = string.IsNullOrWhiteSpace(reason) ? "SecurityVersionChanged" : reason;
            }

            _dbContext.AuditLogs.Add(new AuditLog
            {
                ActorId = userId,
                Action = "SessionsInvalidatedBySecurityVersion",
                EntityType = "User",
                EntityId = userId,
                Description = $"Invalidated {activeSessions.Count} active session(s) following security version increment (Reason: {reason})",
                Outcome = "Success",
                Timestamp = now
            });
        }

        _dbContext.AuditLogs.Add(new AuditLog
        {
            ActorId = userId,
            Action = "SecurityVersionIncremented",
            EntityType = "User",
            EntityId = userId,
            Description = $"Security version incremented to {user.SecurityVersion} (Reason: {reason})",
            Outcome = "Success",
            Timestamp = now
        });

        _dbContext.AuditLogs.Add(new AuditLog
        {
            ActorId = userId,
            Action = "SecurityVersionInvalidated",
            EntityType = "User",
            EntityId = userId,
            Description = $"Security version incremented to {user.SecurityVersion} (Reason: {reason})",
            Outcome = "Success",
            Timestamp = now
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<UserSession>> GetActiveSessionsForUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId)) return new List<UserSession>();

        // Very similar eligibility to concurrent-slot accounting and ValidateSessionAsync:
        // revoked, time-expired, security-version-stale, and migration-backfilled legacy
        // sessions cannot authenticate, so they are not listed as active.
        var securityVersion = await _dbContext.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => (int?)u.SecurityVersion)
            .FirstOrDefaultAsync(cancellationToken);
        if (securityVersion == null) return new List<UserSession>();

        var now = DateTime.UtcNow;
        return await _dbContext.UserSessions
            .AsNoTracking()
            .Where(s => s.UserId == userId && !s.Revoked &&
                s.SecurityVersion == securityVersion.Value &&
                (s.AbsoluteExpiresAt > now || (s.AbsoluteExpiresAt == default && s.ExpiresAt > now)) &&
                (s.IdleExpiresAt > now || (s.IdleExpiresAt == default && s.ExpiresAt > now)) &&
                !s.ClientId.StartsWith(LegacyBackfilledClientPrefix))
            .OrderByDescending(s => s.LastActiveAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<LoginRecoveryResult> RecoverLoginAccessAsync(
        string userId,
        bool clearRemainingEligibleSessions,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return LoginRecoveryResult.Rejected("INVALID_USER", "A valid user account is required.");
        }

        // Same per-user lock + transaction-scoped advisory lock strategy as session creation
        // and security-version invalidation, so recovery cannot race concurrent logins.
        var userLock = _userLocks.GetOrAdd(userId, _ => new SemaphoreSlim(1, 1));
        await userLock.WaitAsync(cancellationToken);

        try
        {
            if (_dbContext.Database.IsRelational())
            {
                var strategy = _dbContext.Database.CreateExecutionStrategy();
                return await strategy.ExecuteAsync(async () =>
                {
                    await using var transaction = await _dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, cancellationToken);
                    if (_dbContext.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true)
                    {
                        await _dbContext.Database.ExecuteSqlRawAsync(
                            "SELECT pg_advisory_xact_lock(hashtext('user_session_' || {0}));",
                            new object[] { userId },
                            cancellationToken);
                    }
                    var result = await ProcessLoginRecoveryAsync(userId, clearRemainingEligibleSessions, cancellationToken);
                    await transaction.CommitAsync(cancellationToken);
                    return result;
                });
            }

            return await ProcessLoginRecoveryAsync(userId, clearRemainingEligibleSessions, cancellationToken);
        }
        finally
        {
            userLock.Release();
        }
    }

    private async Task<LoginRecoveryResult> ProcessLoginRecoveryAsync(
        string userId,
        bool clearRemainingEligibleSessions,
        CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null)
        {
            return LoginRecoveryResult.Rejected("INVALID_USER", "A valid user account is required.");
        }

        if (!user.IsActive)
        {
            return LoginRecoveryResult.Rejected("ACCOUNT_INACTIVE", "This user account is inactive or disabled.");
        }

        var now = DateTime.UtcNow;

        // 1. Sweep sessions that can no longer authenticate (expired or security-stale),
        //    exactly as login accounting would.
        var sweptCount = await SweepIneligibleSessionsAsync(user, now, null, cancellationToken);

        // 2. Decommission migration-backfilled legacy sessions. They were never claimed by
        //    any recognized browser client (legacy_sess_* ids from migration 0009), cannot be
        //    rotated by the canonical cid_* flow, and at most one was ever reachable through
        //    a preserved pre-migration token. This is the explicit, documented path that
        //    releases phantom slots produced by the backfill.
        var legacySessions = await _dbContext.UserSessions
            .Where(s => s.UserId == user.Id && !s.Revoked && s.ClientId.StartsWith(LegacyBackfilledClientPrefix))
            .ToListAsync(cancellationToken);

        foreach (var legacy in legacySessions)
        {
            legacy.Revoked = true;
            legacy.RevokedAt = now;
            legacy.RevocationReason = LegacySessionDecommissionedReason;

            _dbContext.AuditLogs.Add(new AuditLog
            {
                ActorId = user.Id,
                Action = "SessionRevoked",
                EntityType = "UserSession",
                EntityId = legacy.Id,
                Description = "Decommissioned migration-backfilled legacy session during credential-verified login access recovery.",
                Outcome = "Revoked",
                Timestamp = now
            });
        }
        sweptCount += legacySessions.Count;

        // 3. Optionally clear remaining authentication-eligible sessions, but only at the
        //    user's explicit request — never silently, and never for another user.
        var clearedCount = 0;
        if (clearRemainingEligibleSessions)
        {
            var remainingSessions = await _dbContext.UserSessions
                .Where(s => s.UserId == user.Id && !s.Revoked &&
                    s.SecurityVersion == user.SecurityVersion &&
                    (s.AbsoluteExpiresAt > now || (s.AbsoluteExpiresAt == default && s.ExpiresAt > now)) &&
                    (s.IdleExpiresAt > now || (s.IdleExpiresAt == default && s.ExpiresAt > now)))
                .ToListAsync(cancellationToken);

            foreach (var remaining in remainingSessions)
            {
                remaining.Revoked = true;
                remaining.RevokedAt = now;
                remaining.RevocationReason = LoginAccessRecoveryRevokedReason;

                _dbContext.AuditLogs.Add(new AuditLog
                {
                    ActorId = user.Id,
                    Action = "SessionRevoked",
                    EntityType = "UserSession",
                    EntityId = remaining.Id,
                    Description = "Revoked eligible session at the user's explicit request during credential-verified login access recovery.",
                    Outcome = "Revoked",
                    Timestamp = now
                });
            }
            clearedCount = remainingSessions.Count;
        }

        _dbContext.AuditLogs.Add(new AuditLog
        {
            ActorId = user.Id,
            Action = "LoginAccessRecovered",
            EntityType = "User",
            EntityId = user.Id,
            Description = $"Credential-verified login access recovery swept {sweptCount} ineligible session(s) and cleared {clearedCount} eligible session(s) at the user's request.",
            Outcome = "Success",
            Timestamp = now
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation(
            "Login access recovery completed for user {UserId}: swept {Swept}, cleared {Cleared}",
            user.Id, sweptCount, clearedCount);

        return LoginRecoveryResult.Ok(sweptCount, clearedCount);
    }
}
