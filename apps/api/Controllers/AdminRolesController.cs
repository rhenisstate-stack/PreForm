using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.Models;

namespace Preform.Api.Controllers;

public class CreateRoleRequest
{
    [Required]
    [MaxLength(64)]
    [RegularExpression(@"^[a-z0-9_]+$", ErrorMessage = "Role name must contain only lowercase letters, numbers, and underscores.")]
    public string Name { get; set; } = string.Empty;

    [MaxLength(256)]
    public string Description { get; set; } = string.Empty;
}

public class UpdateRoleRequest
{
    [MaxLength(256)]
    public string Description { get; set; } = string.Empty;
}

public class AssignPermissionRequest
{
    [Required]
    public string PermissionId { get; set; } = string.Empty;
}

[ApiController]
[Route("api/v1/admin/roles")]
[Authorize(Policy = "RequireAdmin")]
public class AdminRolesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<AdminRolesController> _logger;

    public AdminRolesController(AppDbContext context, ILogger<AdminRolesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetRoles(CancellationToken cancellationToken)
    {
        var roles = await _context.Roles
            .Include(r => r.RolePermissions)
            .Include(r => r.UserRoles)
            .OrderBy(r => r.IsSystem ? 0 : 1)
            .ThenBy(r => r.Name)
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.Description,
                r.IsSystem,
                r.CreatedAt,
                PermissionCount = r.RolePermissions.Count,
                UserCount = r.UserRoles.Count
            })
            .ToListAsync(cancellationToken);

        return Ok(new { success = true, roles });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetRoleById(string id, CancellationToken cancellationToken)
    {
        var role = await _context.Roles
            .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (role == null)
        {
            return NotFound(new { success = false, error = "Role not found." });
        }

        return Ok(new
        {
            success = true,
            role = new
            {
                role.Id,
                role.Name,
                role.Description,
                role.IsSystem,
                role.CreatedAt,
                UserCount = role.UserRoles.Count,
                Permissions = role.RolePermissions.Select(rp => new
                {
                    rp.Permission.Id,
                    rp.Permission.Key,
                    rp.Permission.Name,
                    rp.Permission.Category
                }).OrderBy(p => p.Category).ThenBy(p => p.Key).ToList()
            }
        });
    }

    [HttpGet("/api/v1/admin/permissions")]
    public async Task<IActionResult> GetAllPermissions(CancellationToken cancellationToken)
    {
        var permissions = await _context.Permissions
            .OrderBy(p => p.Category)
            .ThenBy(p => p.Key)
            .Select(p => new
            {
                p.Id,
                p.Key,
                p.Name,
                p.Category
            })
            .ToListAsync(cancellationToken);

        var grouped = permissions
            .GroupBy(p => p.Category)
            .ToDictionary(g => g.Key, g => g.ToList());

        return Ok(new { success = true, permissions, grouped });
    }

    [HttpPost]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid || request == null)
        {
            return BadRequest(new { success = false, error = "Invalid role payload." });
        }

        var normalizedName = request.Name.Trim().ToLowerInvariant();
        var exists = await _context.Roles.AnyAsync(r => r.Name.ToLower() == normalizedName, cancellationToken);
        if (exists)
        {
            return Conflict(new { success = false, error = $"A role with the name '{normalizedName}' already exists." });
        }

        var role = new Role
        {
            Id = Guid.NewGuid().ToString(),
            Name = normalizedName,
            Description = request.Description.Trim(),
            IsSystem = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Roles.Add(role);

        var actorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = actorId,
            Action = "RoleCreated",
            EntityType = "Role",
            EntityId = role.Id,
            Description = $"Created custom role '{role.Name}'",
            Outcome = "Success",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetRoleById), new { id = role.Id }, new { success = true, role });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateRole(string id, [FromBody] UpdateRoleRequest request, CancellationToken cancellationToken)
    {
        if (request == null)
        {
            return BadRequest(new { success = false, error = "Invalid request payload." });
        }

        var role = await _context.Roles.FindAsync(new object[] { id }, cancellationToken);
        if (role == null)
        {
            return NotFound(new { success = false, error = "Role not found." });
        }

        role.Description = request.Description.Trim();

        var actorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = actorId,
            Action = "RoleUpdated",
            EntityType = "Role",
            EntityId = role.Id,
            Description = $"Updated description for role '{role.Name}'",
            Outcome = "Success",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, role });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRole(string id, CancellationToken cancellationToken)
    {
        var role = await _context.Roles
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (role == null)
        {
            return NotFound(new { success = false, error = "Role not found." });
        }

        if (role.IsSystem)
        {
            return BadRequest(new
            {
                success = false,
                errorCode = "CANNOT_DELETE_SYSTEM_ROLE",
                error = $"System role '{role.Name}' cannot be deleted."
            });
        }

        if (role.UserRoles.Count > 0)
        {
            return BadRequest(new
            {
                success = false,
                errorCode = "ROLE_IN_USE",
                error = $"Cannot delete role '{role.Name}' because {role.UserRoles.Count} user(s) are currently assigned to it."
            });
        }

        _context.Roles.Remove(role);

        var actorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = actorId,
            Action = "RoleDeleted",
            EntityType = "Role",
            EntityId = role.Id,
            Description = $"Deleted custom role '{role.Name}'",
            Outcome = "Success",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, message = $"Role '{role.Name}' deleted." });
    }

    [HttpPost("{id}/permissions")]
    public async Task<IActionResult> AssignPermission(string id, [FromBody] AssignPermissionRequest request, CancellationToken cancellationToken)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.PermissionId))
        {
            return BadRequest(new { success = false, error = "PermissionId is required." });
        }

        var role = await _context.Roles.FindAsync(new object[] { id }, cancellationToken);
        if (role == null)
        {
            return NotFound(new { success = false, error = "Role not found." });
        }

        var permission = await _context.Permissions.FirstOrDefaultAsync(
            p => p.Id == request.PermissionId || p.Key == request.PermissionId,
            cancellationToken);

        if (permission == null)
        {
            return NotFound(new { success = false, error = "Permission not found." });
        }

        var alreadyAssigned = await _context.RolePermissions
            .AnyAsync(rp => rp.RoleId == role.Id && rp.PermissionId == permission.Id, cancellationToken);

        if (!alreadyAssigned)
        {
            _context.RolePermissions.Add(new RolePermission
            {
                RoleId = role.Id,
                PermissionId = permission.Id
            });

            // Invalidate stale sessions for all users with this role so updated permissions take effect
            await InvalidateSessionsForRoleUsersAsync(role.Id, $"PermissionAdded:{permission.Key}", cancellationToken);

            var actorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = actorId,
                Action = "RolePermissionAdded",
                EntityType = "Role",
                EntityId = role.Id,
                Description = $"Assigned permission '{permission.Key}' to role '{role.Name}'",
                Outcome = "Success",
                Timestamp = DateTime.UtcNow
            });

            await _context.SaveChangesAsync(cancellationToken);
        }

        return Ok(new { success = true, message = $"Permission '{permission.Key}' assigned to role '{role.Name}'." });
    }

    [HttpDelete("{id}/permissions/{permissionId}")]
    public async Task<IActionResult> RemovePermission(string id, string permissionId, CancellationToken cancellationToken)
    {
        var role = await _context.Roles.FindAsync(new object[] { id }, cancellationToken);
        if (role == null)
        {
            return NotFound(new { success = false, error = "Role not found." });
        }

        var rolePermission = await _context.RolePermissions
            .Include(rp => rp.Permission)
            .FirstOrDefaultAsync(rp => rp.RoleId == id && (rp.PermissionId == permissionId || rp.Permission.Key == permissionId), cancellationToken);

        if (rolePermission == null)
        {
            return NotFound(new { success = false, error = "Permission is not assigned to this role." });
        }

        var permKey = rolePermission.Permission?.Key ?? permissionId;
        _context.RolePermissions.Remove(rolePermission);

        // Invalidate stale sessions for all users with this role so updated permissions take effect
        await InvalidateSessionsForRoleUsersAsync(role.Id, $"PermissionRemoved:{permKey}", cancellationToken);

        var actorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = actorId,
            Action = "RolePermissionRemoved",
            EntityType = "Role",
            EntityId = role.Id,
            Description = $"Removed permission '{permKey}' from role '{role.Name}'",
            Outcome = "Success",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, message = $"Permission removed from role '{role.Name}'." });
    }

    private async Task InvalidateSessionsForRoleUsersAsync(string roleId, string reason, CancellationToken cancellationToken)
    {
        var userIds = await _context.UserRoles
            .Where(ur => ur.RoleId == roleId)
            .Select(ur => ur.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (userIds.Count == 0) return;

        var users = await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .ToListAsync(cancellationToken);

        foreach (var u in users)
        {
            u.SecurityVersion += 1;
        }

        var sessions = await _context.UserSessions
            .Where(s => userIds.Contains(s.UserId) && !s.Revoked)
            .ToListAsync(cancellationToken);

        foreach (var s in sessions)
        {
            s.Revoked = true;
            s.RevokedAt = DateTime.UtcNow;
            s.RevocationReason = reason;
        }
    }
}
