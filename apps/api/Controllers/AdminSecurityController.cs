using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/admin/security")]
[Authorize(Policy = "RequireSuperAdmin")]
public class AdminSecurityController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ISessionSecurityService _sessionSecurityService;
    private readonly ILogger<AdminSecurityController> _logger;

    private static readonly HashSet<string> AdminSecurityAuditActions = new(StringComparer.OrdinalIgnoreCase)
    {
        "UserLoginSuccess",
        "UserLogout",
        "SessionRevoked",
        "RevokeOtherSessions",
        "RevokeAllUserSessions",
        "SessionReplacedSameClient",
        "ConcurrentSessionLimitExceeded",
        "SecurityVersionInvalidated",
        "SecurityVersionIncremented",
        "SessionsInvalidatedBySecurityVersion",
        "PasswordChanged",
        "SessionPolicyUpdated",
        "SessionPolicyReset",
        "AdminRevokeSession",
        "AdminRevokeAllUserSessions",
        "UnauthorizedSessionRevocationAttempt",
        "NewClientDetected",
        "ClientIdentityChanged",
        "UserAgentChanged",
        "IpAddressChanged",
        "SuspiciousSessionContext",
        "RepeatedClientReplacement",
        "CredentialSecurityEvent",
        "ExamAttemptReauthenticated",
        "IneligibleSessionSwept",
        "LoginAccessRecovered"
    };

    public AdminSecurityController(
        AppDbContext context,
        ISessionSecurityService sessionSecurityService,
        ILogger<AdminSecurityController> logger)
    {
        _context = context;
        _sessionSecurityService = sessionSecurityService;
        _logger = logger;
    }

    private string GetCallerAdminId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "superadmin";
    }

    [HttpGet("metrics")]
    public async Task<IActionResult> GetSecurityMetrics(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var last24h = now.AddHours(-24);

        // Authoritative active-session eligibility, identical to concurrent-slot accounting
        // and learner listing: not revoked, within time windows, current security version
        // (correlated subquery), and not a migration-backfilled legacy client identity.
        var totalActive = await _context.UserSessions
            .CountAsync(s => !s.Revoked && s.IdleExpiresAt > now && s.AbsoluteExpiresAt > now &&
                s.SecurityVersion == _context.Users.Where(u => u.Id == s.UserId).Select(u => u.SecurityVersion).FirstOrDefault() &&
                !s.ClientId.StartsWith(SessionSecurityService.LegacyBackfilledClientPrefix), cancellationToken);

        var activeUsers = await _context.UserSessions
            .Where(s => !s.Revoked && s.IdleExpiresAt > now && s.AbsoluteExpiresAt > now &&
                s.SecurityVersion == _context.Users.Where(u => u.Id == s.UserId).Select(u => u.SecurityVersion).FirstOrDefault() &&
                !s.ClientId.StartsWith(SessionSecurityService.LegacyBackfilledClientPrefix))
            .Select(s => s.UserId)
            .Distinct()
            .CountAsync(cancellationToken);

        var expiringSoon = await _context.UserSessions
            .CountAsync(s => !s.Revoked && (s.IdleExpiresAt <= now.AddMinutes(30) || s.AbsoluteExpiresAt <= now.AddHours(2)) &&
                s.IdleExpiresAt > now && s.AbsoluteExpiresAt > now &&
                s.SecurityVersion == _context.Users.Where(u => u.Id == s.UserId).Select(u => u.SecurityVersion).FirstOrDefault() &&
                !s.ClientId.StartsWith(SessionSecurityService.LegacyBackfilledClientPrefix), cancellationToken);

        var revoked24h = await _context.UserSessions
            .CountAsync(s => s.Revoked && s.RevokedAt >= last24h, cancellationToken);

        var limitRejections24h = await _context.AuditLogs
            .CountAsync(a => a.Action == "ConcurrentSessionLimitExceeded" && a.Timestamp >= last24h, cancellationToken);

        var versionInvalidations24h = await _context.AuditLogs
            .CountAsync(a => a.Action == "SecurityVersionInvalidated" && a.Timestamp >= last24h, cancellationToken);

        return Ok(new AdminSecurityMetricsDto
        {
            Success = true,
            TotalActiveSessions = totalActive,
            ActiveUsersCount = activeUsers,
            ExpiringSoonCount = expiringSoon,
            RevokedLast24HoursCount = revoked24h,
            LimitRejectionsLast24HoursCount = limitRejections24h,
            SecurityVersionInvalidationsLast24HoursCount = versionInvalidations24h
        });
    }

    [HttpGet("session-policy")]
    public async Task<IActionResult> GetSessionPolicy(CancellationToken cancellationToken)
    {
        var policy = await _sessionSecurityService.GetActivePolicyAsync(cancellationToken);

        return Ok(new AdminSessionPolicyDto
        {
            Success = true,
            Id = policy.Id,
            MaxConcurrentSessions = policy.MaxConcurrentSessions,
            MaxSessionsPerClient = policy.MaxSessionsPerClient,
            IdleTimeoutMinutes = policy.IdleTimeoutMinutes,
            AbsoluteTimeoutMinutes = policy.AbsoluteTimeoutMinutes,
            EnforceFingerprint = policy.EnforceFingerprint,
            EnforceIpConsistency = policy.EnforceIpConsistency,
            AllowIpDrift = policy.AllowIpDrift,
            RotateOnLogin = policy.RotateOnLogin,
            RotateOnPrivilegeChange = policy.RotateOnPrivilegeChange,
            RotateOnPasswordChange = policy.RotateOnPasswordChange,
            PolicyVersion = policy.PolicyVersion,
            UpdatedAt = policy.UpdatedAt,
            UpdatedBy = policy.UpdatedBy,
            IsActive = policy.IsActive,
            Defaults = new SystemPolicyDefaultsDto()
        });
    }

    [HttpPut("session-policy")]
    public async Task<IActionResult> UpdateSessionPolicy([FromBody] UpdateSessionPolicyRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, error = "Invalid session security policy parameters." });
        }

        if (request.IdleTimeoutMinutes > request.AbsoluteTimeoutMinutes)
        {
            return BadRequest(new { success = false, error = "Idle timeout cannot exceed absolute timeout." });
        }

        var policy = await _context.SessionSecurityPolicies
            .FirstOrDefaultAsync(p => p.Id == "global_policy", cancellationToken);

        if (policy == null)
        {
            policy = new SessionSecurityPolicy { Id = "global_policy" };
            _context.SessionSecurityPolicies.Add(policy);
        }

        // Optimistic concurrency check
        if (policy.PolicyVersion != request.PolicyVersion)
        {
            return StatusCode(StatusCodes.Status409Conflict, new
            {
                success = false,
                error = "Policy version conflict: the session security policy was modified by another administrator. Please refresh before saving.",
                currentVersion = policy.PolicyVersion,
                submittedVersion = request.PolicyVersion
            });
        }

        var adminId = GetCallerAdminId();
        var now = DateTime.UtcNow;

        policy.MaxConcurrentSessions = request.MaxConcurrentSessions;
        policy.MaxSessionsPerClient = request.MaxSessionsPerClient;
        policy.IdleTimeoutMinutes = request.IdleTimeoutMinutes;
        policy.AbsoluteTimeoutMinutes = request.AbsoluteTimeoutMinutes;
        policy.EnforceFingerprint = request.EnforceFingerprint;
        policy.EnforceIpConsistency = request.EnforceIpConsistency;
        policy.AllowIpDrift = request.AllowIpDrift;
        policy.RotateOnLogin = request.RotateOnLogin;
        policy.RotateOnPrivilegeChange = request.RotateOnPrivilegeChange;
        policy.RotateOnPasswordChange = request.RotateOnPasswordChange;
        policy.PolicyVersion++;
        policy.UpdatedAt = now;
        policy.UpdatedBy = adminId;

        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = adminId,
            Action = "SessionPolicyUpdated",
            EntityType = "SessionSecurityPolicy",
            EntityId = "global_policy",
            Description = $"Updated session policy to v{policy.PolicyVersion} (MaxSessions: {policy.MaxConcurrentSessions}, Idle: {policy.IdleTimeoutMinutes}m, Absolute: {policy.AbsoluteTimeoutMinutes}m)",
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("SuperAdmin {AdminId} updated SessionSecurityPolicy to version {Version}", adminId, policy.PolicyVersion);

        return Ok(new
        {
            success = true,
            message = "Session security policy updated successfully.",
            policy = new AdminSessionPolicyDto
            {
                Success = true,
                Id = policy.Id,
                MaxConcurrentSessions = policy.MaxConcurrentSessions,
                MaxSessionsPerClient = policy.MaxSessionsPerClient,
                IdleTimeoutMinutes = policy.IdleTimeoutMinutes,
                AbsoluteTimeoutMinutes = policy.AbsoluteTimeoutMinutes,
                EnforceFingerprint = policy.EnforceFingerprint,
                EnforceIpConsistency = policy.EnforceIpConsistency,
                AllowIpDrift = policy.AllowIpDrift,
                RotateOnLogin = policy.RotateOnLogin,
                RotateOnPrivilegeChange = policy.RotateOnPrivilegeChange,
                RotateOnPasswordChange = policy.RotateOnPasswordChange,
                PolicyVersion = policy.PolicyVersion,
                UpdatedAt = policy.UpdatedAt,
                UpdatedBy = policy.UpdatedBy,
                IsActive = policy.IsActive
            }
        });
    }

    [HttpPost("session-policy/reset")]
    public async Task<IActionResult> ResetSessionPolicy(CancellationToken cancellationToken)
    {
        var policy = await _context.SessionSecurityPolicies
            .FirstOrDefaultAsync(p => p.Id == "global_policy", cancellationToken);

        if (policy == null)
        {
            policy = new SessionSecurityPolicy { Id = "global_policy" };
            _context.SessionSecurityPolicies.Add(policy);
        }

        var adminId = GetCallerAdminId();
        var now = DateTime.UtcNow;

        policy.MaxConcurrentSessions = 2;
        policy.MaxSessionsPerClient = 1;
        policy.IdleTimeoutMinutes = 300;
        policy.AbsoluteTimeoutMinutes = 10080;
        policy.EnforceFingerprint = true;
        policy.EnforceIpConsistency = false;
        policy.AllowIpDrift = true;
        policy.RotateOnLogin = true;
        policy.RotateOnPrivilegeChange = true;
        policy.RotateOnPasswordChange = true;
        policy.PolicyVersion++;
        policy.UpdatedAt = now;
        policy.UpdatedBy = adminId;

        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = adminId,
            Action = "SessionPolicyReset",
            EntityType = "SessionSecurityPolicy",
            EntityId = "global_policy",
            Description = $"Reset session security policy to approved system defaults (v{policy.PolicyVersion})",
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("SuperAdmin {AdminId} reset SessionSecurityPolicy to defaults (v{Version})", adminId, policy.PolicyVersion);

        return Ok(new
        {
            success = true,
            message = "Session security policy reset to canonical platform defaults.",
            policy = new AdminSessionPolicyDto
            {
                Success = true,
                Id = policy.Id,
                MaxConcurrentSessions = policy.MaxConcurrentSessions,
                MaxSessionsPerClient = policy.MaxSessionsPerClient,
                IdleTimeoutMinutes = policy.IdleTimeoutMinutes,
                AbsoluteTimeoutMinutes = policy.AbsoluteTimeoutMinutes,
                EnforceFingerprint = policy.EnforceFingerprint,
                EnforceIpConsistency = policy.EnforceIpConsistency,
                AllowIpDrift = policy.AllowIpDrift,
                RotateOnLogin = policy.RotateOnLogin,
                RotateOnPrivilegeChange = policy.RotateOnPrivilegeChange,
                RotateOnPasswordChange = policy.RotateOnPasswordChange,
                PolicyVersion = policy.PolicyVersion,
                UpdatedAt = policy.UpdatedAt,
                UpdatedBy = policy.UpdatedBy,
                IsActive = policy.IsActive
            }
        });
    }

    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string status = "all",
        [FromQuery] string? search = null,
        [FromQuery] string sortBy = "lastActive",
        [FromQuery] string sortOrder = "desc",
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var now = DateTime.UtcNow;
        var query = _context.UserSessions
            .AsNoTracking()
            .Include(s => s.User)
            .AsQueryable();

        // Status filter
        var normalizedStatus = (status ?? "all").ToLowerInvariant();
        if (normalizedStatus == "active")
        {
            query = query.Where(s => !s.Revoked && s.IdleExpiresAt > now && s.AbsoluteExpiresAt > now &&
                s.SecurityVersion == _context.Users.Where(u => u.Id == s.UserId).Select(u => u.SecurityVersion).FirstOrDefault() &&
                !s.ClientId.StartsWith(SessionSecurityService.LegacyBackfilledClientPrefix));
        }
        else if (normalizedStatus == "revoked")
        {
            query = query.Where(s => s.Revoked);
        }
        else if (normalizedStatus == "expired")
        {
            query = query.Where(s => !s.Revoked && (s.IdleExpiresAt <= now || s.AbsoluteExpiresAt <= now));
        }

        // Search filter
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(s =>
                s.Email.ToLower().Contains(term) ||
                s.DisplayName.ToLower().Contains(term) ||
                (s.DeviceLabel != null && s.DeviceLabel.ToLower().Contains(term)) ||
                (s.LastIpAddress != null && s.LastIpAddress.Contains(term)) ||
                s.ClientId.ToLower().Contains(term));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        // Sorting
        bool isAsc = string.Equals(sortOrder, "asc", StringComparison.OrdinalIgnoreCase);
        query = sortBy.ToLowerInvariant() switch
        {
            "created" => isAsc ? query.OrderBy(s => s.CreatedAt) : query.OrderByDescending(s => s.CreatedAt),
            "user" => isAsc ? query.OrderBy(s => s.DisplayName) : query.OrderByDescending(s => s.DisplayName),
            "idleexpires" => isAsc ? query.OrderBy(s => s.IdleExpiresAt) : query.OrderByDescending(s => s.IdleExpiresAt),
            "absoluteexpires" => isAsc ? query.OrderBy(s => s.AbsoluteExpiresAt) : query.OrderByDescending(s => s.AbsoluteExpiresAt),
            _ => isAsc ? query.OrderBy(s => s.LastActiveAt) : query.OrderByDescending(s => s.LastActiveAt)
        };

        var sessions = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = sessions.Select(s =>
        {
            string sessionStatus;
            if (s.Revoked)
            {
                sessionStatus = "Revoked";
            }
            else if (now >= s.AbsoluteExpiresAt)
            {
                sessionStatus = "Expired (Absolute)";
            }
            else if (now >= s.IdleExpiresAt)
            {
                sessionStatus = "Expired (Idle)";
            }
            else
            {
                sessionStatus = "Active";
            }

            var effectiveExpiry = s.IdleExpiresAt < s.AbsoluteExpiresAt ? s.IdleExpiresAt : s.AbsoluteExpiresAt;

            return new AdminSessionItemDto
            {
                Id = s.Id,
                UserId = s.UserId,
                UserEmail = s.Email,
                UserDisplayName = !string.IsNullOrWhiteSpace(s.DisplayName) ? s.DisplayName : (s.User?.DisplayName ?? "Learner"),
                Role = s.Role,
                ClientId = s.ClientId,
                DeviceLabel = !string.IsNullOrWhiteSpace(s.DeviceLabel)
                    ? s.DeviceLabel
                    : DeviceDetectionHelper.GetDeviceLabel(s.UserAgent),
                Browser = DeviceDetectionHelper.ResolveBrowser(s.UserAgent ?? string.Empty),
                OperatingSystem = DeviceDetectionHelper.ResolveOperatingSystem(s.UserAgent ?? string.Empty),
                DeviceType = DeviceDetectionHelper.ResolveDeviceType(s.UserAgent ?? string.Empty),
                CreatedAt = s.CreatedAt,
                LastActiveAt = s.LastActiveAt,
                IdleExpiresAt = s.IdleExpiresAt,
                AbsoluteExpiresAt = s.AbsoluteExpiresAt,
                EffectiveExpiresAt = effectiveExpiry,
                Revoked = s.Revoked,
                RevokedAt = s.RevokedAt,
                RevocationReason = s.RevocationReason,
                LastIpAddress = s.LastIpAddress,
                Status = sessionStatus
            };
        }).ToList();

        return Ok(new AdminPaginatedSessionsDto
        {
            Success = true,
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }

    [HttpPost("sessions/{sessionId}/revoke")]
    public async Task<IActionResult> RevokeSession(
        string sessionId,
        [FromBody] AdminRevokeSessionRequest request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, error = "A valid administrative revocation reason is required." });
        }

        var session = await _context.UserSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

        if (session == null)
        {
            return NotFound(new { success = false, error = "Session not found." });
        }

        if (session.Revoked)
        {
            return BadRequest(new { success = false, error = "Session is already revoked." });
        }

        var adminId = GetCallerAdminId();
        var now = DateTime.UtcNow;

        session.Revoked = true;
        session.RevokedAt = now;
        session.RevocationReason = $"AdminRevoked: {request.Reason.Trim()}";

        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = adminId,
            Action = "AdminRevokeSession",
            EntityType = "UserSession",
            EntityId = sessionId,
            Description = $"Admin revoked session {sessionId} for user {session.UserId} (Reason: {request.Reason.Trim()})",
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("SuperAdmin {AdminId} administratively revoked session {SessionId} (Reason: {Reason})",
            adminId, sessionId, request.Reason);

        return Ok(new
        {
            success = true,
            message = "Session administratively revoked successfully."
        });
    }

    [HttpPost("users/{userId}/revoke-sessions")]
    public async Task<IActionResult> RevokeAllUserSessions(
        string userId,
        [FromBody] AdminRevokeAllUserSessionsRequest request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, error = "A valid administrative revocation reason is required." });
        }

        var user = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null)
        {
            return NotFound(new { success = false, error = "User not found." });
        }

        var adminId = GetCallerAdminId();
        var reason = $"AdminRevokeAll: {request.Reason.Trim()}";

        var count = await _sessionSecurityService.RevokeAllUserSessionsAsync(
            userId,
            reason,
            adminId,
            cancellationToken);

        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = adminId,
            Action = "AdminRevokeAllUserSessions",
            EntityType = "User",
            EntityId = userId,
            Description = $"Admin terminated all ({count}) sessions for user {userId} ({user.Email}) (Reason: {request.Reason.Trim()})",
            Outcome = "Success",
            Timestamp = DateTime.UtcNow
        });
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("SuperAdmin {AdminId} administratively revoked all ({Count}) sessions for user {UserId}",
            adminId, count, userId);

        return Ok(new
        {
            success = true,
            revokedCount = count,
            message = $"Terminated all {count} active session(s) for user {user.DisplayName}."
        });
    }

    [HttpGet("events")]
    public async Task<IActionResult> GetSecurityEvents(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? action = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.AuditLogs
            .AsNoTracking()
            .Include(a => a.Actor)
            .Where(a => AdminSecurityAuditActions.Contains(a.Action))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(a => a.Action == action.Trim());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(a =>
                a.Description.ToLower().Contains(term) ||
                (a.EntityId != null && a.EntityId.ToLower().Contains(term)) ||
                (a.IpAddress != null && a.IpAddress.Contains(term)) ||
                (a.Actor != null && a.Actor.Email.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var logs = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = logs.Select(a => new AdminSecurityEventDto
        {
            Id = a.Id,
            ActorId = a.ActorId,
            ActorEmail = a.Actor?.Email,
            Action = a.Action,
            EntityType = a.EntityType,
            EntityId = a.EntityId,
            Description = a.Description,
            Outcome = a.Outcome,
            IpAddress = a.IpAddress,
            Timestamp = a.Timestamp
        }).ToList();

        return Ok(new AdminPaginatedEventsDto
        {
            Success = true,
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }
}
