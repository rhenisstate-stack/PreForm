using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Preform.Api.Data;
using Preform.Api.Services;

namespace Preform.Api.Security;

public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PermissionAuthorizationHandler> _logger;

    public PermissionAuthorizationHandler(
        IServiceScopeFactory scopeFactory,
        ILogger<PermissionAuthorizationHandler> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        if (context.User?.Identity?.IsAuthenticated != true)
        {
            return;
        }

        // Super Admin bypass: superadmin inherently possesses all permissions
        var effectiveRole = RoleHierarchy.GetEffectiveRole(context.User);
        if (string.Equals(effectiveRole, "superadmin", StringComparison.OrdinalIgnoreCase))
        {
            context.Succeed(requirement);
            return;
        }

        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return;
        }

        using var scope = _scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Check if any of the user's roles has the requested permission
        var hasPermission = await dbContext.UserRoles
            .Where(ur => ur.UserId == userId)
            .Join(dbContext.RolePermissions,
                ur => ur.RoleId,
                rp => rp.RoleId,
                (ur, rp) => rp.PermissionId)
            .Join(dbContext.Permissions,
                permId => permId,
                p => p.Id,
                (permId, p) => p.Key)
            .AnyAsync(key => key == requirement.PermissionKey);

        if (hasPermission)
        {
            context.Succeed(requirement);
        }
    }
}
