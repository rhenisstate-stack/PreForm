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
[Route("api/v1/security")]
[Authorize]
public class SecurityController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ISessionSecurityService _sessionSecurityService;
    private readonly ILogger<SecurityController> _logger;

    private static readonly HashSet<string> LearnerSafeActions = new(StringComparer.OrdinalIgnoreCase)
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
        "ProfileUpdated",
        "NewClientDetected",
        "ClientIdentityChanged",
        "UserAgentChanged",
        "IpAddressChanged",
        "SuspiciousSessionContext",
        "RepeatedClientReplacement",
        "CredentialSecurityEvent",
        "ExamAttemptReauthenticated"
    };

    public SecurityController(
        AppDbContext context,
        ISessionSecurityService sessionSecurityService,
        ILogger<SecurityController> logger)
    {
        _context = context;
        _sessionSecurityService = sessionSecurityService;
        _logger = logger;
    }

    private string? GetCallerUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }

    private string? GetCurrentSessionId()
    {
        return User.FindFirst("sessionId")?.Value;
    }

    [HttpGet("sessions")]
    public async Task<IActionResult> GetActiveSessions(CancellationToken cancellationToken)
    {
        var userId = GetCallerUserId();
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { success = false, message = "Unauthorized: Missing user identity." });
        }

        var currentSessionId = GetCurrentSessionId();
        var sessions = await _sessionSecurityService.GetActiveSessionsForUserAsync(userId, cancellationToken);

        var dtos = sessions.Select(s => new LearnerSessionDto
        {
            Id = s.Id,
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
            IsCurrent = !string.IsNullOrWhiteSpace(currentSessionId) &&
                        string.Equals(s.Id, currentSessionId, StringComparison.Ordinal),
            LastIpAddress = s.LastIpAddress
        })
        .OrderByDescending(s => s.IsCurrent)
        .ThenByDescending(s => s.LastActiveAt)
        .ToList();

        return Ok(new LearnerSessionsResponseDto
        {
            Success = true,
            Sessions = dtos
        });
    }

    [HttpDelete("sessions/{sessionId}")]
    public async Task<IActionResult> RevokeSession(string sessionId, CancellationToken cancellationToken)
    {
        var userId = GetCallerUserId();
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { success = false, message = "Unauthorized: Missing user identity." });
        }

        if (string.IsNullOrWhiteSpace(sessionId))
        {
            return BadRequest(new { success = false, message = "Session ID is required." });
        }

        var existingSession = await _context.UserSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

        if (existingSession == null)
        {
            return NotFound(new { success = false, message = "Session not found." });
        }

        if (!string.Equals(existingSession.UserId, userId, StringComparison.Ordinal))
        {
            _logger.LogWarning("Security violation attempt: User {CallerUserId} attempted to revoke session {SessionId} owned by {TargetUserId}",
                userId, sessionId, existingSession.UserId);

            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = userId,
                Action = "UnauthorizedSessionRevocationAttempt",
                EntityType = "UserSession",
                EntityId = sessionId,
                Description = $"User {userId} attempted unauthorized revocation of session owned by {existingSession.UserId}",
                Outcome = "Forbidden",
                Timestamp = DateTime.UtcNow
            });
            await _context.SaveChangesAsync(cancellationToken);

            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "Forbidden: You cannot revoke another user's session." });
        }

        var revoked = await _sessionSecurityService.RevokeSessionAsync(
            sessionId,
            "UserRevocation",
            userId,
            cancellationToken);

        return Ok(new RevokeSessionResultDto
        {
            Success = true,
            Message = "Session terminated successfully."
        });
    }

    [HttpPost("sessions/revoke-others")]
    public async Task<IActionResult> RevokeOtherSessions(CancellationToken cancellationToken)
    {
        var userId = GetCallerUserId();
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { success = false, message = "Unauthorized: Missing user identity." });
        }

        var currentSessionId = GetCurrentSessionId();
        if (string.IsNullOrWhiteSpace(currentSessionId))
        {
            return BadRequest(new { success = false, message = "Current session ID is required to preserve current session." });
        }

        var count = await _sessionSecurityService.RevokeOtherSessionsAsync(
            userId,
            currentSessionId,
            userId,
            cancellationToken);

        return Ok(new RevokeSessionResultDto
        {
            Success = true,
            RevokedCount = count,
            Message = count == 1 ? "1 other active session was terminated." : $"{count} other active sessions were terminated."
        });
    }

    [HttpPost("sessions/revoke-all")]
    public async Task<IActionResult> RevokeAllSessions(CancellationToken cancellationToken)
    {
        var userId = GetCallerUserId();
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { success = false, message = "Unauthorized: Missing user identity." });
        }

        var count = await _sessionSecurityService.RevokeAllUserSessionsAsync(
            userId,
            "UserRevokeAll",
            userId,
            cancellationToken);

        return Ok(new RevokeSessionResultDto
        {
            Success = true,
            RevokedCount = count,
            Message = "All active sessions terminated successfully."
        });
    }

    [HttpGet("events")]
    public async Task<IActionResult> GetSecurityEvents(CancellationToken cancellationToken)
    {
        var userId = GetCallerUserId();
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { success = false, message = "Unauthorized: Missing user identity." });
        }

        // Bounded query for security events relating to this user
        var rawLogs = await _context.AuditLogs
            .AsNoTracking()
            .Where(a => (a.ActorId == userId || a.EntityId == userId) && LearnerSafeActions.Contains(a.Action))
            .OrderByDescending(a => a.Timestamp)
            .Take(50)
            .ToListAsync(cancellationToken);

        var events = rawLogs.Select(a => new SecurityEventDto
        {
            Id = a.Id,
            Action = a.Action,
            Description = SanitizeDescriptionForLearner(a.Action, a.Description),
            Outcome = a.Outcome,
            Timestamp = a.Timestamp,
            IpAddress = a.IpAddress
        }).ToList();

        return Ok(new SecurityEventsResponseDto
        {
            Success = true,
            Events = events
        });
    }

    private static string SanitizeDescriptionForLearner(string action, string rawDescription)
    {
        return action switch
        {
            "UserLoginSuccess" => "Signed in successfully",
            "UserLogout" => "Signed out",
            "SessionRevoked" => "Signed out of a device session",
            "RevokeOtherSessions" => "Signed out of all other device sessions",
            "RevokeAllUserSessions" => "Signed out of all device sessions",
            "SessionReplacedSameClient" => "Session refreshed on this browser",
            "ConcurrentSessionLimitExceeded" => "Sign-in prevented: simultaneous active session limit reached",
            "SecurityVersionInvalidated" => "Security credentials updated",
            "SecurityVersionIncremented" => "Account security version updated",
            "SessionsInvalidatedBySecurityVersion" => "All prior active sessions signed out for account protection",
            "PasswordChanged" => "Password changed successfully",
            "ProfileUpdated" => "Account profile details updated",
            "NewClientDetected" => "Signed in from a new device",
            "ClientIdentityChanged" => "Browser session refreshed",
            "UserAgentChanged" => "Browser or operating system updated",
            "IpAddressChanged" => "Network connection changed",
            "SuspiciousSessionContext" => "Unusual device context detected",
            "RepeatedClientReplacement" => "Multiple browser session refreshes observed",
            "CredentialSecurityEvent" => "Account credentials updated",
            "ExamAttemptReauthenticated" => "Examination session successfully reauthenticated. Exam attempt and answers preserved.",
            _ => rawDescription
        };
    }
}
