using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ISessionService _sessionService;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ILogger<ProfileController> _logger;

    public ProfileController(
        AppDbContext context,
        ISessionService sessionService,
        IPasswordHasher<User> passwordHasher,
        ILogger<ProfileController> logger)
    {
        _context = context;
        _sessionService = sessionService;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    private UserProfileDto MapToProfileDto(User user, string role)
    {
        return new UserProfileDto
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
            ProfileImageUpdatedAt = user.ProfileImageUpdatedAt?.ToString("o"),
            PictureUrl = user.HasProfileImage ? $"/api/v1/profile/image?v={user.ProfileImageUpdatedAt?.Ticks}" : null
        };
    }

    [HttpGet]
    public async Task<IActionResult> GetProfile(CancellationToken cancellationToken)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { success = false, error = "Authentication is required." });
        }

        var user = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null || !user.IsActive)
        {
            return NotFound(new { success = false, error = "Candidate profile not found." });
        }

        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "candidate";
        return Ok(new { success = true, profile = MapToProfileDto(user, role) });
    }

    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { success = false, error = "Authentication is required." });
        }

        // Enforce Server-Side Security Allowlist:
        // Reject any attempt to alter role, pathway, or active plan with 403 Forbidden
        if (!string.IsNullOrWhiteSpace(request.Role) ||
            !string.IsNullOrWhiteSpace(request.Pathway) ||
            !string.IsNullOrWhiteSpace(request.ActivePlan) ||
            request.IsActive.HasValue)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                error = "Forbidden: Updating role, pathway, active plan, or account status via profile update is not permitted."
            });
        }

        var user = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null || !user.IsActive)
        {
            return NotFound(new { success = false, error = "Candidate profile not found." });
        }

        var now = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(request.DisplayName))
        {
            user.DisplayName = request.DisplayName.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.TargetExamDate))
        {
            user.TargetExamDate = request.TargetExamDate.Trim();
        }

        if (request.EmailNotifications.HasValue)
        {
            user.EmailNotifications = request.EmailNotifications.Value;
        }

        if (request.StudyReminders.HasValue)
        {
            user.StudyReminders = request.StudyReminders.Value;
        }

        user.UpdatedAt = now;

        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = user.Id,
            Action = "ProfileUpdated",
            EntityType = "User",
            EntityId = user.Id,
            Description = "Updated profile display preferences",
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(cancellationToken);

        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "candidate";
        return Ok(new { success = true, profile = MapToProfileDto(user, role) });
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, error = "Current and new password are required." });
        }

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { success = false, error = "Authentication is required." });
        }

        var user = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null || !user.IsActive)
        {
            return NotFound(new { success = false, error = "Candidate profile not found." });
        }

        // Verify current password
        var verifyResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword);
        if (verifyResult == PasswordVerificationResult.Failed)
        {
            return BadRequest(new { success = false, error = "The current password provided is incorrect." });
        }

        var now = DateTime.UtcNow;
        user.PasswordHash = _passwordHasher.HashPassword(user, request.NewPassword);
        user.UpdatedAt = now;

        // Invalidate all existing sessions on password change
        await _sessionService.RevokeAllUserSessionsAsync(user.Id, cancellationToken);

        // Issue a fresh new session
        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "candidate";
        var (newToken, _) = await _sessionService.CreateSessionAsync(user, role, rememberMe: false, cancellationToken);

        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = user.Id,
            Action = "PasswordChanged",
            EntityType = "User",
            EntityId = user.Id,
            Description = "Password changed and prior sessions revoked",
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Password updated successfully. All other active sessions have been revoked.",
            token = newToken
        });
    }
}
