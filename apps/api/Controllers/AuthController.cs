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
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        AppDbContext context,
        ISessionService sessionService,
        IPasswordHasher<User> passwordHasher,
        ILogger<AuthController> logger)
    {
        _context = context;
        _sessionService = sessionService;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new AuthResponse { Success = false, Error = "Invalid registration parameters." });
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
            DisplayName = request.DisplayName.Trim(),
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

        var (token, session) = await _sessionService.CreateSessionAsync(user, "candidate", rememberMe: false, cancellationToken);

        return Ok(new AuthResponse
        {
            Success = true,
            Token = token,
            User = new UserSummaryDto
            {
                Id = user.Id,
                Email = user.Email,
                DisplayName = user.DisplayName,
                Role = session.Role,
                Pathway = user.Pathway,
                ActivePlan = user.ActivePlan,
                TargetExamDate = user.TargetExamDate,
                EmailNotifications = user.EmailNotifications,
                StudyReminders = user.StudyReminders,
                HasProfileImage = user.HasProfileImage
            }
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
        var (token, session) = await _sessionService.CreateSessionAsync(user, primaryRole, request.RememberMe, cancellationToken);

        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = user.Id,
            Action = "UserLoginSuccess",
            EntityType = "User",
            EntityId = user.Id,
            Description = "User successfully authenticated",
            Outcome = "Success",
            Timestamp = DateTime.UtcNow
        });
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new AuthResponse
        {
            Success = true,
            Token = token,
            User = new UserSummaryDto
            {
                Id = user.Id,
                Email = user.Email,
                DisplayName = user.DisplayName,
                Role = session.Role,
                Pathway = user.Pathway,
                ActivePlan = user.ActivePlan,
                TargetExamDate = user.TargetExamDate,
                EmailNotifications = user.EmailNotifications,
                StudyReminders = user.StudyReminders,
                HasProfileImage = user.HasProfileImage
            }
        });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var sessionId = User.FindFirst("sessionId")?.Value;
        if (!string.IsNullOrWhiteSpace(sessionId))
        {
            await _sessionService.RevokeSessionAsync(sessionId, cancellationToken);
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

            var count = await _sessionService.RevokeAllUserSessionsAsync(targetUserId, cancellationToken);
            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = callerUserId ?? "system",
                Action = "RevokeAllUserSessions",
                EntityType = "User",
                EntityId = targetUserId,
                Description = $"Revoked all sessions for user {targetUserId} (count: {count})",
                Outcome = "Success",
                Timestamp = DateTime.UtcNow
            });
            await _context.SaveChangesAsync(cancellationToken);

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

        var revoked = await _sessionService.RevokeSessionAsync(targetSessionId, cancellationToken);
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

        UserSession? session = null;
        if (!string.IsNullOrWhiteSpace(request.Token))
        {
            session = await _sessionService.ValidateTokenAsync(request.Token, cancellationToken);
        }
        else if (!string.IsNullOrWhiteSpace(request.SessionId))
        {
            session = await _context.UserSessions
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.Id == request.SessionId && !s.Revoked && s.ExpiresAt > DateTime.UtcNow, cancellationToken);
        }

        if (session == null || session.User == null || !session.User.IsActive || session.Revoked)
        {
            return Ok(new ValidateSessionResponse { Valid = false, Error = "Session is invalid, expired, or revoked." });
        }

        return Ok(new ValidateSessionResponse
        {
            Valid = true,
            SessionId = session.Id,
            User = new UserSummaryDto
            {
                Id = session.User.Id,
                Email = session.User.Email,
                DisplayName = session.User.DisplayName,
                Role = session.Role,
                Pathway = session.User.Pathway,
                ActivePlan = session.User.ActivePlan,
                TargetExamDate = session.User.TargetExamDate,
                EmailNotifications = session.User.EmailNotifications,
                StudyReminders = session.User.StudyReminders,
                HasProfileImage = session.User.HasProfileImage
            }
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
            User = new UserSummaryDto
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
                HasProfileImage = user.HasProfileImage
            }
        });
    }
}
