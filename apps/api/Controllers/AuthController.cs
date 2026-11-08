using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Preform.Api.Services.PasswordReset;
using Preform.Api.Services.RateLimiting;

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
    private readonly ISharedRateLimitingService? _rateLimitingService;
    private readonly IPasswordResetService? _passwordResetService;

    public AuthController(
        AppDbContext context,
        ISessionService sessionService,
        ISessionSecurityService sessionSecurityService,
        IPasswordHasher<User> passwordHasher,
        ILogger<AuthController> logger,
        ISharedRateLimitingService? rateLimitingService = null,
        IPasswordResetService? passwordResetService = null)
    {
        _context = context;
        _sessionService = sessionService;
        _sessionSecurityService = sessionSecurityService;
        _passwordHasher = passwordHasher;
        _logger = logger;
        _rateLimitingService = rateLimitingService;
        _passwordResetService = passwordResetService;
    }

    private string? GetClientIpAddress()
    {
        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }

    // Credential-verified login-access recovery rate limiting. Same in-process window/lockout
    // pattern as exam reauthentication (ExamAttemptsController): 5 failed attempts per
    // 15-minute window triggers a 15-minute lockout. Documented limitation: this limiter is
    // process-local; deployments behind multiple API instances should share state externally.
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, (int FailedAttempts, DateTime WindowStart, DateTime? LockoutUntil)> _loginRecoveryRateLimits = new();

    public static void ResetLoginRecoveryRateLimitsForTesting()
    {
        _loginRecoveryRateLimits.Clear();
    }

    private static bool IsLoginRecoveryRateLimited(string key, out int retryAfterSeconds)
    {
        retryAfterSeconds = 0;
        var now = DateTime.UtcNow;
        if (_loginRecoveryRateLimits.TryGetValue(key, out var record))
        {
            if (record.LockoutUntil.HasValue && now < record.LockoutUntil.Value)
            {
                retryAfterSeconds = Math.Max(1, (int)Math.Ceiling((record.LockoutUntil.Value - now).TotalSeconds));
                return true;
            }
        }
        return false;
    }

    private static void RecordFailedLoginRecoveryAttempt(string key)
    {
        var now = DateTime.UtcNow;
        _loginRecoveryRateLimits.AddOrUpdate(key,
            _ => (1, now, null),
            (_, old) =>
            {
                if (now - old.WindowStart > TimeSpan.FromMinutes(15))
                {
                    return (1, now, null);
                }
                var newCount = old.FailedAttempts + 1;
                DateTime? lockout = newCount >= 5 ? now.AddMinutes(15) : null;
                return (newCount, old.WindowStart, lockout);
            });
    }

    private static void ClearFailedLoginRecoveryAttempts(string key)
    {
        _loginRecoveryRateLimits.TryRemove(key, out _);
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

        if (string.IsNullOrWhiteSpace(request.Pathway) ||
            (!string.Equals(request.Pathway.Trim(), "rn", StringComparison.OrdinalIgnoreCase) &&
             !string.Equals(request.Pathway.Trim(), "pn", StringComparison.OrdinalIgnoreCase)))
        {
            return BadRequest(new AuthResponse
            {
                Success = false,
                Error = "A valid single examination pathway ('rn' or 'pn') is required for registration. Multi-pathway or dual access is not permitted."
            });
        }

        var normalizedPathway = request.Pathway.Trim().ToLowerInvariant();
        var defaultPlan = normalizedPathway == "pn"
            ? "NCLEX-PN Complete Preparation Plan"
            : "NCLEX-RN Complete Preparation Plan";

        var now = DateTime.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid().ToString(),
            Email = normalizedEmail,
            DisplayName = normalizedDisplayName,
            Pathway = normalizedPathway,
            TargetExamDate = "2026-11-30",
            ActivePlan = defaultPlan,
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
            clientId: request.ClientId,
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

    /// <summary>
    /// Pre-authentication, credential-verified recovery from concurrent-session lockouts.
    /// Requires valid credentials, is rate limited, scoped strictly to the verified user's
    /// own sessions, and returns no information about whether other sessions or devices
    /// exist. Revoked-by-recovery sessions are always audited.
    /// </summary>
    [HttpPost("recover-sessions")]
    [AllowAnonymous]
    public async Task<IActionResult> RecoverSessions([FromBody] RecoverSessionsRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, error = "Email and password are required." });
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var rateLimitKey = $"login-recovery:{normalizedEmail}";
        if (_rateLimitingService != null)
        {
            var limitCheck = await _rateLimitingService.CheckRateLimitAsync(rateLimitKey, 5, TimeSpan.FromMinutes(15), TimeSpan.FromMinutes(15), cancellationToken);
            if (limitCheck.IsRateLimited)
            {
                Response.Headers.Append("Retry-After", limitCheck.RetryAfterSeconds.ToString());
                return StatusCode(StatusCodes.Status429TooManyRequests, new
                {
                    success = false,
                    error = "Too many recovery attempts. Please wait before trying again.",
                    errorCode = "RATE_LIMITED",
                    retryAfterSeconds = limitCheck.RetryAfterSeconds
                });
            }
        }
        else if (IsLoginRecoveryRateLimited(rateLimitKey, out var retryAfterSeconds))
        {
            Response.Headers.Append("Retry-After", retryAfterSeconds.ToString());
            return StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                success = false,
                error = "Too many recovery attempts. Please wait before trying again.",
                errorCode = "RATE_LIMITED"
            });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail, cancellationToken);

        // Generic invalid-credentials response for both unknown accounts and inactive
        // accounts: recovery must not disclose whether other sessions or devices exist,
        // nor reveal account status before credential verification succeeds.
        if (user == null || !user.IsActive)
        {
            if (_rateLimitingService != null)
            {
                await _rateLimitingService.RecordFailedAttemptAsync(rateLimitKey, 5, TimeSpan.FromMinutes(15), TimeSpan.FromMinutes(15), cancellationToken);
            }
            else
            {
                RecordFailedLoginRecoveryAttempt(rateLimitKey);
            }
            return Unauthorized(new
            {
                success = false,
                error = "Invalid credentials. Please verify your email and password.",
                errorCode = "INVALID_CREDENTIALS"
            });
        }

        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verificationResult == PasswordVerificationResult.Failed)
        {
            if (_rateLimitingService != null)
            {
                await _rateLimitingService.RecordFailedAttemptAsync(rateLimitKey, 5, TimeSpan.FromMinutes(15), TimeSpan.FromMinutes(15), cancellationToken);
            }
            else
            {
                RecordFailedLoginRecoveryAttempt(rateLimitKey);
            }
            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = user.Id,
                Action = "UserLoginFailed",
                EntityType = "User",
                EntityId = user.Id,
                Description = "Failed credential verification during login access recovery",
                Outcome = "Failed",
                Timestamp = DateTime.UtcNow
            });
            await _context.SaveChangesAsync(cancellationToken);

            return Unauthorized(new
            {
                success = false,
                error = "Invalid credentials. Please verify your email and password.",
                errorCode = "INVALID_CREDENTIALS"
            });
        }

        var recoveryResult = await _sessionSecurityService.RecoverLoginAccessAsync(
            user.Id,
            request.ClearRemainingSessions,
            cancellationToken);

        if (!recoveryResult.Success)
        {
            var status = recoveryResult.ErrorCode == "ACCOUNT_INACTIVE"
                ? StatusCodes.Status403Forbidden
                : StatusCodes.Status400BadRequest;
            return StatusCode(status, new
            {
                success = false,
                error = recoveryResult.ErrorMessage,
                errorCode = recoveryResult.ErrorCode
            });
        }

        if (_rateLimitingService != null)
        {
            await _rateLimitingService.ResetRateLimitAsync(rateLimitKey, cancellationToken);
        }
        else
        {
            ClearFailedLoginRecoveryAttempts(rateLimitKey);
        }

        // Deliberately returns no counts, session identifiers, or device details. The
        // service layer already persisted a LoginAccessRecovered audit event.
        return Ok(new { success = true });
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

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid || string.IsNullOrWhiteSpace(request?.Email))
        {
            return BadRequest(new { success = false, error = "A valid email address is required." });
        }

        var clientIp = GetClientIpAddress() ?? "unknown";
        var rateLimitKey = $"forgot-pw:{clientIp}";

        if (_rateLimitingService != null)
        {
            var limit = await _rateLimitingService.CheckRateLimitAsync(rateLimitKey, 10, TimeSpan.FromMinutes(15), TimeSpan.FromMinutes(15), cancellationToken);
            if (limit.IsRateLimited)
            {
                Response.Headers.Append("Retry-After", limit.RetryAfterSeconds.ToString());
                return StatusCode(StatusCodes.Status429TooManyRequests, new
                {
                    success = false,
                    error = "Too many password reset requests from this IP. Please try again later.",
                    errorCode = "RATE_LIMIT_EXCEEDED",
                    retryAfterSeconds = limit.RetryAfterSeconds
                });
            }
            await _rateLimitingService.RecordFailedAttemptAsync(rateLimitKey, 10, TimeSpan.FromMinutes(15), TimeSpan.FromMinutes(15), cancellationToken);
        }

        if (_passwordResetService == null)
        {
            return Ok(new { success = true, message = "If an account exists with that email, password reset instructions have been sent." });
        }

        var ip = GetClientIpAddress();
        var ua = Request.Headers.UserAgent.ToString();
        var result = await _passwordResetService.RequestPasswordResetAsync(request.Email, ip, ua, cancellationToken);

        return Ok(new { success = result.Success, message = result.Message });
    }

    [HttpPost("validate-reset-token")]
    [AllowAnonymous]
    public async Task<IActionResult> ValidateResetToken([FromBody] ValidateResetTokenRequest request, CancellationToken cancellationToken)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Token))
        {
            return BadRequest(new { valid = false, error = "Reset token is required." });
        }

        if (_passwordResetService == null)
        {
            return Ok(new { valid = false, error = "Password reset service unavailable." });
        }

        var result = await _passwordResetService.ValidateResetTokenAsync(request.Token, cancellationToken);
        if (!result.IsValid)
        {
            return Ok(new { valid = false, error = result.Error });
        }

        return Ok(new { valid = true, maskedEmail = result.MaskedEmail });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid || request == null)
        {
            return BadRequest(new { success = false, error = "Invalid password reset request." });
        }

        if (_passwordResetService == null)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { success = false, error = "Password reset service unavailable." });
        }

        var ip = GetClientIpAddress();
        var ua = Request.Headers.UserAgent.ToString();

        var result = await _passwordResetService.ResetPasswordAsync(request.Token, request.NewPassword, ip, ua, cancellationToken);
        if (!result.Success)
        {
            return BadRequest(new
            {
                success = false,
                error = result.Error ?? "Password reset failed.",
                errorCode = result.ErrorCode ?? "RESET_FAILED"
            });
        }

        return Ok(new
        {
            success = true,
            message = "Your password has been successfully reset. You may now sign in."
        });
    }
}
