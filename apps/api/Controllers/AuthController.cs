using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ISessionService _sessionService;
    private readonly ISessionSecurityService _sessionSecurityService;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        AppDbContext context,
        ISessionService sessionService,
        ISessionSecurityService sessionSecurityService,
        IPasswordHasher<User> passwordHasher,
        ILogger<AuthController> logger)
    {
        _context = context;
        _sessionService = sessionService;
        _sessionSecurityService = sessionSecurityService;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    private string? GetClientIpAddress()
    {
        if (Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor) && !string.IsNullOrWhiteSpace(forwardedFor))
        {
            return forwardedFor.ToString().Split(',')[0].Trim();
        }
        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }

    /// <summary>
    /// Builds the user summary DTO consistently across register, login, validate-session and session endpoints.
    /// Profile image reference is always included so that the web session/BFF layer can restore the
    /// learner's profile picture immediately after authentication (not only after visiting /profile).
    /// </summary>
    private static UserSummaryDto BuildUserSummary(User user, string role)
    {
        return new UserSummaryDto
        {
            Id = user.Id,
            Email = user.Email,
            DisplayName = user.DisplayName,
            Role = role,
            Pathway = user.Pathway,
            ActivePlan = user.ActivePlan,
            TargetExamDate = user.TargetExamDate,
            EmailNotifications = user.EmailNotifications,
            StudyReminders = user.StudyReminders,
            HasProfileImage = user.HasProfileImage,
            // Stable cache-busting version token for the profile image resource.
            ProfileImageUpdatedAt = user.ProfileImageUpdatedAt?.ToString("o"),
            PictureUrl = user.HasProfileImage
                ? $"/api/v1/profile/image?v={user.ProfileImageUpdatedAt?.ToString("o") ?? user.UpdatedAt.ToString("o")}"
                : null
        };
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new AuthResponse { Success = false, Error = "Invalid registration parameters." });
        }

        var normalizedDisplayName = string.Join(" ", request.DisplayName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries));
        var nameSegments = normalizedDisplayName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (nameSegments.Length < 2)
        {
            return BadRequest(new AuthResponse { Success = false, Error = "Please enter your full name using at least two names." });
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail, cancellationToken))
        {
            return Conflict(new AuthResponse { Success = false, Error = "An account with this email address already exists." });
        }

        var now = DateTime.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid().ToString(),
            Email = normalizedEmail,
            DisplayName = normalizedDisplayName,
            Pathway = string.IsNullOrWhiteSpace(request.Pathway) ? "rn" : request.Pathway.Trim().ToLowerInvariant(),
            TargetExamDate = "2026-11-30",
            ActivePlan = "NCLEX-RN Complete Preparation Plan",
            EmailNotifications = true,
            StudyReminders = true,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
        _context.Users.Add(user);

        // Assign default candidate role
        var candidateRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "candidate", cancellationToken);
        if (candidateRole != null)
        {
            _context.UserRoles.Add(new UserRole
            {
                UserId = user.Id,
                RoleId = candidateRole.Id,
                AssignedAt = now
            });
        }

        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = user.Id,
            Action = "UserRegistered",
            EntityType = "User",
            EntityId = user.Id,
            Description = $"Registered account for {user.Email}",
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(cancellationToken);

        var ip = GetClientIpAddress();
        var ua = Request.Headers.UserAgent.ToString();
        var sessionResult = await _sessionSecurityService.CreateOrRotateSessionAsync(
            user,
            "candidate",
            clientId: null,
            ipAddress: ip,
            userAgent: ua,
            fingerprintHash: null,
            rememberMe: false,
            cancellationToken: cancellationToken);

        return Ok(new AuthResponse
        {
            Success = true,
            Token = sessionResult.Token,
            SessionId = sessionResult.Session?.Id,
            User = BuildUserSummary(user, sessionResult.Session?.Role ?? "candidate")
        });
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new AuthResponse { Success = false, Error = "Email and password are required." });
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail, cancellationToken);

        if (user == null || !user.IsActive)
        {
            return Unauthorized(new AuthResponse { Success = false, Error = "Invalid credentials. Please verify your email and password." });
        }

        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verificationResult == PasswordVerificationResult.Failed)
        {
            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = user.Id,
                Action = "UserLoginFailed",
                EntityType = "User",
                EntityId = user.Id,
                Description = "Failed password attempt",
                Outcome = "Failed",
                Timestamp = DateTime.UtcNow
            });
            await _context.SaveChangesAsync(cancellationToken);

            return Unauthorized(new AuthResponse { Success = false, Error = "Invalid credentials. Please verify your email and password." });
        }

        var primaryRole = RoleHierarchy.GetEffectiveRole(user);
        var ip = GetClientIpAddress();
        var ua = Request.Headers.UserAgent.ToString();

        var sessionResult = await _sessionSecurityService.CreateOrRotateSessionAsync(
            user,
            primaryRole,
            clientId: request.ClientId,
            ipAddress: ip,
            userAgent: ua,
            fingerprintHash: request.FingerprintHash,
            rememberMe: request.RememberMe,
            cancellationToken: cancellationToken);

        if (!sessionResult.Success)
        {
            if (sessionResult.ErrorCode == "CONCURRENT_SESSION_LIMIT_EXCEEDED")
            {
                return StatusCode(StatusCodes.Status409Conflict, new AuthResponse
                {
                    Success = false,
                    Error = sessionResult.ErrorMessage,
                    ErrorCode = sessionResult.ErrorCode
                });
            }

            if (sessionResult.ErrorCode == "ACCOUNT_INACTIVE")
            {
                return Unauthorized(new AuthResponse
                {
                    Success = false,
                    Error = sessionResult.ErrorMessage,
                    ErrorCode = sessionResult.ErrorCode
                });
            }

            return BadRequest(new AuthResponse
            {
                Success = false,
                Error = sessionResult.ErrorMessage,
                ErrorCode = sessionResult.ErrorCode
            });
        }

        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = user.Id,
            Action = "UserLoginSuccess",
            EntityType = "User",
            EntityId = user.Id,
            Description = "User successfully authenticated",
            Outcome = "Success",
            IpAddress = ip,
            Timestamp = DateTime.UtcNow
        });
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new AuthResponse
        {
            Success = true,
            Token = sessionResult.Token,
            SessionId = sessionResult.Session!.Id,
            User = BuildUserSummary(user, sessionResult.Session.Role)
        });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var sessionId = User.FindFirst("sessionId")?.Value;
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";
        if (!string.IsNullOrWhiteSpace(sessionId))
        {
            await _sessionSecurityService.RevokeSessionAsync(sessionId, "UserLogout", userId, cancellationToken);
        }

        return Ok(new { success = true, message = "Logged out successfully." });
    }

    [HttpPost("revoke-session")]
    [Authorize]
    public async Task<IActionResult> RevokeSession([FromBody] RevokeSessionRequest request, CancellationToken cancellationToken)
    {
        var callerUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var callerRole = RoleHierarchy.GetEffectiveRole(User);
        var isPrivilegedAdmin = RoleHierarchy.IsAdmin(callerRole);

        if (request.RevokeOthers)
        {
            var currentSessionId = User.FindFirst("sessionId")?.Value;
            if (string.IsNullOrWhiteSpace(currentSessionId))
            {
                return BadRequest(new { success = false, error = "Current session ID is required to revoke other sessions." });
            }

            var targetUserId = !string.IsNullOrWhiteSpace(request.UserId) ? request.UserId : callerUserId;
            if (string.IsNullOrWhiteSpace(targetUserId))
            {
                return BadRequest(new { success = false, error = "Target user ID is required." });
            }

            if (!string.Equals(targetUserId, callerUserId, StringComparison.Ordinal) && !isPrivilegedAdmin)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "Forbidden: Cannot revoke another user's sessions." });
            }

            var count = await _sessionSecurityService.RevokeOtherSessionsAsync(targetUserId, currentSessionId, callerUserId ?? "system", cancellationToken);
            return Ok(new { success = true, revokedCount = count, message = "Other active sessions revoked successfully." });
        }

        if (request.RevokeAll)
        {
            var targetUserId = !string.IsNullOrWhiteSpace(request.UserId) ? request.UserId : callerUserId;
            if (string.IsNullOrWhiteSpace(targetUserId))
            {
                return BadRequest(new { success = false, error = "Target user ID is required to revoke all sessions." });
            }

            if (!string.Equals(targetUserId, callerUserId, StringComparison.Ordinal) && !isPrivilegedAdmin)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "Forbidden: Cannot revoke another user's sessions." });
            }

            var count = await _sessionSecurityService.RevokeAllUserSessionsAsync(targetUserId, request.Reason ?? "RevokeAll", callerUserId ?? "system", cancellationToken);
            return Ok(new { success = true, revokedCount = count, message = "All user sessions revoked successfully." });
        }

        var targetSessionId = !string.IsNullOrWhiteSpace(request.SessionId)
            ? request.SessionId
            : User.FindFirst("sessionId")?.Value;

        if (string.IsNullOrWhiteSpace(targetSessionId))
        {
            return BadRequest(new { success = false, error = "Session ID is required for revocation." });
        }

        // Ownership enforcement: verify session belongs to caller unless admin
        var existingSession = await _context.UserSessions.FindAsync(new object[] { targetSessionId }, cancellationToken);
        if (existingSession != null && !string.Equals(existingSession.UserId, callerUserId, StringComparison.Ordinal) && !isPrivilegedAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "Forbidden: Cannot revoke another user's session." });
        }

        var revoked = await _sessionSecurityService.RevokeSessionAsync(targetSessionId, request.Reason ?? "UserRevocation", callerUserId ?? "system", cancellationToken);
        return Ok(new { success = true, revoked, message = "Session revoked successfully." });
    }

    [HttpPost("validate-session")]
    [AllowAnonymous]
    public async Task<IActionResult> ValidateSession([FromBody] ValidateSessionRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Token) && string.IsNullOrWhiteSpace(request.SessionId))
        {
            return BadRequest(new ValidateSessionResponse { Valid = false, Error = "Token or SessionId is required." });
        }

        var ip = GetClientIpAddress();
        var ua = Request.Headers.UserAgent.ToString();

        SessionValidationResult validation;
        if (!string.IsNullOrWhiteSpace(request.Token))
        {
            validation = await _sessionSecurityService.ValidateSessionAsync(
                request.Token,
                isToken: true,
                ipAddress: ip,
                userAgent: ua,
                isQualifyingActivity: true,
                cancellationToken: cancellationToken);
        }
        else
        {
            validation = await _sessionSecurityService.ValidateSessionAsync(
                request.SessionId!,
                isToken: false,
                ipAddress: ip,
                userAgent: ua,
                isQualifyingActivity: true,
                cancellationToken: cancellationToken);
        }

        if (!validation.IsValid || validation.Session == null || validation.Session.User == null)
        {
            return Ok(new ValidateSessionResponse
            {
                Valid = false,
                Error = validation.FailureReason ?? "Session is invalid, expired, or revoked.",
                ErrorCode = validation.FailureCode
            });
        }

        return Ok(new ValidateSessionResponse
        {
            Valid = true,
            SessionId = validation.Session.Id,
            User = BuildUserSummary(validation.Session.User, validation.Session.Role),
            EffectiveExpiresAt = validation.EffectiveExpiry,
            IdleExpiresAt = validation.Session.IdleExpiresAt,
            AbsoluteExpiresAt = validation.Session.AbsoluteExpiresAt
        });
    }

    [HttpGet("session")]
    [Authorize]
    public async Task<IActionResult> GetSession(CancellationToken cancellationToken)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new SessionResponse { Authenticated = false });
        }

        var user = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null || !user.IsActive)
        {
            return Unauthorized(new SessionResponse { Authenticated = false });
        }

        var role = RoleHierarchy.GetEffectiveRole(User);

        return Ok(new SessionResponse
        {
            Authenticated = true,
            User = BuildUserSummary(user, role)
        });
    }
}
