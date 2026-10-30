using System.Security.Claims;
using Preform.Api.Models;

namespace Preform.Api.Services;

/// <summary>
/// Authoritative and deterministic role-resolution hierarchy for PrepFord RBAC.
/// Prevents nondeterministic downgrade when a user has multiple assigned roles.
/// </summary>
public static class RoleHierarchy
{
    public const string DefaultRole = "candidate";

    public const string RoleSuperAdmin = "superadmin";
    public const string RoleAdmin = "admin";
    public const string RoleAdministrator = "administrator";
    public const string RoleExamManager = "exam_manager";
    public const string RoleContentManager = "content_manager";
    public const string RoleReviewer = "reviewer";
    public const string RoleInstructor = "instructor";
    public const string RoleCandidate = "candidate";

    /// <summary>
    /// Canonical hierarchy in descending priority order:
    /// 1. superadmin
    /// 2. admin / administrator
    /// 3. exam_manager
    /// 4. content_manager
    /// 5. reviewer
    /// 6. instructor
    /// 7. candidate
    /// </summary>
    public static readonly string[] PriorityOrder =
    {
        RoleSuperAdmin,
        RoleAdmin,
        RoleAdministrator,
        RoleExamManager,
        RoleContentManager,
        RoleReviewer,
        RoleInstructor,
        RoleCandidate
    };

    private static readonly HashSet<string> AdminRolesSet = new(StringComparer.OrdinalIgnoreCase)
    {
        RoleSuperAdmin,
        RoleAdmin,
        RoleAdministrator
    };

    /// <summary>
    /// Resolves the effective primary role from an arbitrary collection of role names.
    /// Iterates deterministically through the priority order and returns the highest-privilege match.
    /// If none match, falls back to the first non-empty role, or "candidate".
    /// </summary>
    public static string GetEffectiveRole(IEnumerable<string?>? roles)
    {
        if (roles == null) return DefaultRole;

        var normalizedRoles = roles
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Select(r => r!.Trim().ToLowerInvariant())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (normalizedRoles.Count == 0) return DefaultRole;

        foreach (var candidateRole in PriorityOrder)
        {
            if (normalizedRoles.Contains(candidateRole))
            {
                // Normalize "administrator" synonym to canonical "admin"
                if (candidateRole == RoleAdministrator)
                {
                    return RoleAdmin;
                }
                return candidateRole;
            }
        }

        return normalizedRoles.FirstOrDefault() ?? DefaultRole;
    }

    /// <summary>
    /// Resolves the effective role for a User entity based on their assigned UserRoles.
    /// Safely handles null collections or missing navigation properties.
    /// </summary>
    public static string GetEffectiveRole(User? user)
    {
        if (user == null || user.UserRoles == null || user.UserRoles.Count == 0)
        {
            return DefaultRole;
        }

        return GetEffectiveRole(user.UserRoles.Select(ur => ur.Role?.Name));
    }

    /// <summary>
    /// Resolves the effective role from a ClaimsPrincipal (Bearer session or Gateway claims).
    /// Safely inspects ClaimTypes.Role and "role" claims.
    /// </summary>
    public static string GetEffectiveRole(ClaimsPrincipal? principal)
    {
        if (principal == null) return DefaultRole;

        var roleClaims = principal.FindAll(c => c.Type == ClaimTypes.Role || c.Type == "role")
            .Select(c => c.Value);

        return GetEffectiveRole(roleClaims);
    }

    /// <summary>
    /// Determines whether the given role qualifies as an administrative role (superadmin, admin, administrator).
    /// </summary>
    public static bool IsAdmin(string? role)
    {
        if (string.IsNullOrWhiteSpace(role)) return false;
        return AdminRolesSet.Contains(role.Trim());
    }

    /// <summary>
    /// Determines whether the given role is superadmin.
    /// </summary>
    public static bool IsSuperAdmin(string? role)
    {
        if (string.IsNullOrWhiteSpace(role)) return false;
        return string.Equals(role.Trim(), RoleSuperAdmin, StringComparison.OrdinalIgnoreCase);
    }
}
