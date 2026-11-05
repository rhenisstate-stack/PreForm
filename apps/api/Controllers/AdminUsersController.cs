using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.Models;

namespace Preform.Api.Controllers;

public class CreateAdminUserRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8, ErrorMessage = "Password must be at least 8 characters.")]
    [MaxLength(128)]
    public string Password { get; set; } = string.Empty;

    [Required]
    [MaxLength(128)]
    public string DisplayName { get; set; } = string.Empty;

    [MaxLength(10)]
    public string Pathway { get; set; } = "rn";

    public List<string> Roles { get; set; } = new();
}

public class UpdateAdminUserRequest
{
    [MaxLength(128)]
    public string? DisplayName { get; set; }

    [MaxLength(10)]
    public string? Pathway { get; set; }

    [MaxLength(32)]
    public string? TargetExamDate { get; set; }

    public bool? EmailNotifications { get; set; }

    public bool? StudyReminders { get; set; }
}

public class UpdateUserStatusRequest
{
    [Required]
    [RegularExpression("^(Active|Suspended|Deactivated)$", ErrorMessage = "Status must be Active, Suspended, or Deactivated.")]
    public string Status { get; set; } = "Active";

    [MaxLength(256)]
    public string? Reason { get; set; }
}

public class AssignUserRoleRequest
{
    [Required]
    public string RoleId { get; set; } = string.Empty;
}

[ApiController]
[Route("api/v1/admin/users")]
[Authorize(Policy = "RequireAdmin")]
public class AdminUsersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ILogger<AdminUsersController> _logger;

    public AdminUsersController(
        AppDbContext context,
        IPasswordHasher<User> passwordHasher,
        ILogger<AdminUsersController> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? search,
        [FromQuery] string? role,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u => u.Email.ToLower().Contains(s) || u.DisplayName.ToLower().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            var r = role.Trim().ToLower();
            query = query.Where(u => u.UserRoles.Any(ur => ur.Role.Name.ToLower() == r));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var st = status.Trim().ToLower();
            query = query.Where(u => u.AccountStatus.ToLower() == st);
        }

        var total = await query.CountAsync(cancellationToken);

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.DisplayName,
                u.Pathway,
                u.AccountStatus,
                u.IsActive,
                u.SecurityVersion,
                u.CreatedAt,
                u.UpdatedAt,
                Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList()
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            total,
            page,
            pageSize,
            users
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserById(string id, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.UserSessions)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user == null)
        {
            return NotFound(new { success = false, error = "User not found." });
        }

        var recentAuditLogs = await _context.AuditLogs
            .Where(al => al.ActorId == id || al.EntityId == id)
            .OrderByDescending(al => al.Timestamp)
            .Take(10)
            .Select(al => new
            {
                al.Id,
                al.Action,
                al.EntityType,
                al.Description,
                al.Outcome,
                al.Timestamp
            })
            .ToListAsync(cancellationToken);

        var activeSessions = user.UserSessions
            .Where(s => !s.Revoked && s.ExpiresAt > DateTime.UtcNow)
            .Select(s => new
            {
                s.Id,
                s.ClientId,
                s.DeviceLabel,
                s.LastIpAddress,
                s.CreatedAt,
                s.LastActiveAt,
                s.AbsoluteExpiresAt
            })
            .ToList();

        return Ok(new
        {
            success = true,
            user = new
            {
                user.Id,
                user.Email,
                user.DisplayName,
                user.Pathway,
                user.TargetExamDate,
                user.ActivePlan,
                user.EmailNotifications,
                user.StudyReminders,
                user.AccountStatus,
                user.SuspendedAt,
                user.SuspensionReason,
                user.IsActive,
                user.SecurityVersion,
                user.CreatedAt,
                user.UpdatedAt,
                Roles = user.UserRoles.Select(ur => new { ur.Role.Id, ur.Role.Name, ur.Role.Description }).ToList(),
                ActiveSessions = activeSessions,
                RecentAuditLogs = recentAuditLogs
            }
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateAdminUserRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid || request == null)
        {
            return BadRequest(new { success = false, error = "Invalid user payload." });
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var exists = await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail, cancellationToken);
        if (exists)
        {
            return Conflict(new { success = false, error = $"User with email '{normalizedEmail}' already exists." });
        }

        var user = new User
        {
            Id = Guid.NewGuid().ToString(),
            Email = normalizedEmail,
            DisplayName = request.DisplayName.Trim(),
            Pathway = request.Pathway?.ToLowerInvariant() ?? "rn",
            AccountStatus = "Active",
            IsActive = true,
            SecurityVersion = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        _context.Users.Add(user);

        // Assign initial roles
        var requestedRoles = (request.Roles ?? new List<string>())
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Select(r => r.Trim().ToLowerInvariant())
            .Distinct()
            .ToList();

        if (requestedRoles.Count == 0)
        {
            requestedRoles.Add("candidate");
        }

        var dbRoles = await _context.Roles
            .Where(r => requestedRoles.Contains(r.Name.ToLower()) || requestedRoles.Contains(r.Id))
            .ToListAsync(cancellationToken);

        foreach (var r in dbRoles)
        {
            _context.UserRoles.Add(new UserRole
            {
                UserId = user.Id,
                RoleId = r.Id,
                AssignedAt = DateTime.UtcNow
            });
        }

        var actorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = actorId,
            Action = "AdminUserCreated",
            EntityType = "User",
            EntityId = user.Id,
            Description = $"Created user account '{user.Email}' with roles: {string.Join(", ", dbRoles.Select(r => r.Name))}",
            Outcome = "Success",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetUserById), new { id = user.Id }, new
        {
            success = true,
            user = new
            {
                user.Id,
                user.Email,
                user.DisplayName,
                user.AccountStatus,
                Roles = dbRoles.Select(r => r.Name).ToList()
            }
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateAdminUserRequest request, CancellationToken cancellationToken)
    {
        if (request == null)
        {
            return BadRequest(new { success = false, error = "Invalid request payload." });
        }

        var user = await _context.Users.FindAsync(new object[] { id }, cancellationToken);
        if (user == null)
        {
            return NotFound(new { success = false, error = "User not found." });
        }

        if (!string.IsNullOrWhiteSpace(request.DisplayName)) user.DisplayName = request.DisplayName.Trim();
        if (!string.IsNullOrWhiteSpace(request.Pathway)) user.Pathway = request.Pathway.Trim().ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(request.TargetExamDate)) user.TargetExamDate = request.TargetExamDate.Trim();
        if (request.EmailNotifications.HasValue) user.EmailNotifications = request.EmailNotifications.Value;
        if (request.StudyReminders.HasValue) user.StudyReminders = request.StudyReminders.Value;

        user.UpdatedAt = DateTime.UtcNow;

        var actorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = actorId,
            Action = "AdminUserUpdated",
            EntityType = "User",
            EntityId = user.Id,
            Description = $"Updated profile information for user '{user.Email}'",
            Outcome = "Success",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, user = new { user.Id, user.Email, user.DisplayName, user.Pathway } });
    }

    [HttpPost("{id}/status")]
    public async Task<IActionResult> UpdateUserStatus(string id, [FromBody] UpdateUserStatusRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid || request == null)
        {
            return BadRequest(new { success = false, error = "Invalid status parameters." });
        }

        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user == null)
        {
            return NotFound(new { success = false, error = "User not found." });
        }

        var isSuperAdmin = user.UserRoles.Any(ur => string.Equals(ur.Role.Name, "superadmin", StringComparison.OrdinalIgnoreCase));
        if (isSuperAdmin && (request.Status == "Suspended" || request.Status == "Deactivated"))
        {
            var otherActiveSuperAdmins = await _context.UserRoles
                .Include(ur => ur.User)
                .Include(ur => ur.Role)
                .Where(ur => ur.Role.Name.ToLower() == "superadmin" &&
                             ur.UserId != user.Id &&
                             ur.User.IsActive &&
                             ur.User.AccountStatus == "Active")
                .Select(ur => ur.UserId)
                .Distinct()
                .CountAsync(cancellationToken);

            if (otherActiveSuperAdmins == 0)
            {
                return BadRequest(new
                {
                    success = false,
                    errorCode = "LAST_SUPERADMIN_PROTECTED",
                    error = "Cannot suspend or deactivate the last active Super Admin account in the platform."
                });
            }
        }

        var oldStatus = user.AccountStatus;
        user.AccountStatus = request.Status;
        user.IsActive = (request.Status == "Active");
        user.SuspendedAt = (request.Status != "Active") ? DateTime.UtcNow : null;
        user.SuspensionReason = (request.Status != "Active") ? request.Reason?.Trim() : null;
        user.SecurityVersion += 1;
        user.UpdatedAt = DateTime.UtcNow;

        // Immediately revoke active sessions on suspension or deactivation
        if (request.Status != "Active")
        {
            var activeSessions = await _context.UserSessions
                .Where(s => s.UserId == user.Id && !s.Revoked)
                .ToListAsync(cancellationToken);

            foreach (var session in activeSessions)
            {
                session.Revoked = true;
                session.RevokedAt = DateTime.UtcNow;
                session.RevocationReason = $"Account{request.Status}";
            }
        }

        var actorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = actorId,
            Action = "UserStatusChanged",
            EntityType = "User",
            EntityId = user.Id,
            Description = $"Changed account status of '{user.Email}' from {oldStatus} to {request.Status}. Reason: {request.Reason ?? "None provided"}",
            Outcome = "Success",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            accountStatus = user.AccountStatus,
            isActive = user.IsActive,
            securityVersion = user.SecurityVersion
        });
    }

    [HttpPost("{id}/roles")]
    public async Task<IActionResult> AssignRole(string id, [FromBody] AssignUserRoleRequest request, CancellationToken cancellationToken)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.RoleId))
        {
            return BadRequest(new { success = false, error = "RoleId is required." });
        }

        var user = await _context.Users.FindAsync(new object[] { id }, cancellationToken);
        if (user == null)
        {
            return NotFound(new { success = false, error = "User not found." });
        }

        var role = await _context.Roles.FirstOrDefaultAsync(
            r => r.Id == request.RoleId || r.Name.ToLower() == request.RoleId.ToLower(),
            cancellationToken);

        if (role == null)
        {
            return NotFound(new { success = false, error = "Role not found." });
        }

        var alreadyHasRole = await _context.UserRoles
            .AnyAsync(ur => ur.UserId == user.Id && ur.RoleId == role.Id, cancellationToken);

        if (!alreadyHasRole)
        {
            _context.UserRoles.Add(new UserRole
            {
                UserId = user.Id,
                RoleId = role.Id,
                AssignedAt = DateTime.UtcNow
            });

            // Increment SecurityVersion and revoke sessions to force token refreshment
            user.SecurityVersion += 1;
            user.UpdatedAt = DateTime.UtcNow;

            var activeSessions = await _context.UserSessions
                .Where(s => s.UserId == user.Id && !s.Revoked)
                .ToListAsync(cancellationToken);

            foreach (var session in activeSessions)
            {
                session.Revoked = true;
                session.RevokedAt = DateTime.UtcNow;
                session.RevocationReason = $"RoleAssigned:{role.Name}";
            }

            var actorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = actorId,
                Action = "UserRoleAssigned",
                EntityType = "User",
                EntityId = user.Id,
                Description = $"Assigned role '{role.Name}' to user '{user.Email}'",
                Outcome = "Success",
                Timestamp = DateTime.UtcNow
            });

            await _context.SaveChangesAsync(cancellationToken);
        }

        return Ok(new { success = true, message = $"Role '{role.Name}' assigned to user." });
    }

    [HttpDelete("{id}/roles/{roleId}")]
    public async Task<IActionResult> RemoveRole(string id, string roleId, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FindAsync(new object[] { id }, cancellationToken);
        if (user == null)
        {
            return NotFound(new { success = false, error = "User not found." });
        }

        var userRole = await _context.UserRoles
            .Include(ur => ur.Role)
            .FirstOrDefaultAsync(ur => ur.UserId == id && (ur.RoleId == roleId || ur.Role.Name.ToLower() == roleId.ToLower()), cancellationToken);

        if (userRole == null)
        {
            return NotFound(new { success = false, error = "User does not possess this role." });
        }

        // Last Super Admin Protection
        if (string.Equals(userRole.Role.Name, "superadmin", StringComparison.OrdinalIgnoreCase))
        {
            var otherSuperAdmins = await _context.UserRoles
                .Include(ur => ur.User)
                .Include(ur => ur.Role)
                .Where(ur => ur.Role.Name.ToLower() == "superadmin" &&
                             ur.UserId != user.Id &&
                             ur.User.IsActive &&
                             ur.User.AccountStatus == "Active")
                .Select(ur => ur.UserId)
                .Distinct()
                .CountAsync(cancellationToken);

            if (otherSuperAdmins == 0)
            {
                return BadRequest(new
                {
                    success = false,
                    errorCode = "LAST_SUPERADMIN_PROTECTED",
                    error = "Cannot remove Super Admin role from the last active Super Admin account."
                });
            }
        }

        _context.UserRoles.Remove(userRole);

        user.SecurityVersion += 1;
        user.UpdatedAt = DateTime.UtcNow;

        var activeSessions = await _context.UserSessions
            .Where(s => s.UserId == user.Id && !s.Revoked)
            .ToListAsync(cancellationToken);

        foreach (var session in activeSessions)
        {
            session.Revoked = true;
            session.RevokedAt = DateTime.UtcNow;
            session.RevocationReason = $"RoleRemoved:{userRole.Role.Name}";
        }

        var actorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = actorId,
            Action = "UserRoleRemoved",
            EntityType = "User",
            EntityId = user.Id,
            Description = $"Removed role '{userRole.Role.Name}' from user '{user.Email}'",
            Outcome = "Success",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, message = $"Role '{userRole.Role.Name}' removed from user." });
    }

    [HttpPost("{id}/revoke-sessions")]
    public async Task<IActionResult> RevokeAllSessions(string id, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FindAsync(new object[] { id }, cancellationToken);
        if (user == null)
        {
            return NotFound(new { success = false, error = "User not found." });
        }

        var activeSessions = await _context.UserSessions
            .Where(s => s.UserId == id && !s.Revoked)
            .ToListAsync(cancellationToken);

        foreach (var session in activeSessions)
        {
            session.Revoked = true;
            session.RevokedAt = DateTime.UtcNow;
            session.RevocationReason = "AdministrativeRevocation";
        }

        user.SecurityVersion += 1;
        user.UpdatedAt = DateTime.UtcNow;

        var actorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = actorId,
            Action = "UserSessionsRevoked",
            EntityType = "User",
            EntityId = user.Id,
            Description = $"Administratively revoked {activeSessions.Count} active session(s) for user '{user.Email}'",
            Outcome = "Success",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, revokedCount = activeSessions.Count });
    }
}
