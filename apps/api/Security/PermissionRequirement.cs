using Microsoft.AspNetCore.Authorization;

namespace Preform.Api.Security;

public class PermissionRequirement : IAuthorizationRequirement
{
    public string PermissionKey { get; }

    public PermissionRequirement(string permissionKey)
    {
        PermissionKey = permissionKey;
    }
}
