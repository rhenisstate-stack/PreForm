using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class RoleResolutionTests
{
    [Theory]
    [InlineData("superadmin", "superadmin")]
    [InlineData("admin", "admin")]
    [InlineData("administrator", "admin")]
    [InlineData("exam_manager", "exam_manager")]
    [InlineData("content_manager", "content_manager")]
    [InlineData("reviewer", "reviewer")]
    [InlineData("instructor", "instructor")]
    [InlineData("candidate", "candidate")]
    public void GetEffectiveRole_SingleRoles_ResolvesCorrectly(string inputRole, string expectedRole)
    {
        var result = RoleHierarchy.GetEffectiveRole(new[] { inputRole });
        Assert.Equal(expectedRole, result);
    }

    [Theory]
    [InlineData(new[] { "candidate", "superadmin" }, "superadmin")]
    [InlineData(new[] { "superadmin", "candidate" }, "superadmin")]
    [InlineData(new[] { "candidate", "admin" }, "admin")]
    [InlineData(new[] { "admin", "candidate" }, "admin")]
    [InlineData(new[] { "candidate", "administrator" }, "admin")]
    [InlineData(new[] { "candidate", "exam_manager" }, "exam_manager")]
    [InlineData(new[] { "candidate", "content_manager" }, "content_manager")]
    [InlineData(new[] { "candidate", "reviewer" }, "reviewer")]
    [InlineData(new[] { "candidate", "instructor" }, "instructor")]
    [InlineData(new[] { "admin", "superadmin" }, "superadmin")]
    [InlineData(new[] { "superadmin", "admin", "exam_manager", "candidate" }, "superadmin")]
    [InlineData(new[] { "content_manager", "exam_manager" }, "exam_manager")]
    [InlineData(new[] { "reviewer", "content_manager" }, "content_manager")]
    [InlineData(new[] { "instructor", "reviewer" }, "reviewer")]
    public void GetEffectiveRole_MultiRoleCombinations_ResolvesToHighestPriority(string[] roles, string expectedRole)
    {
        var result = RoleHierarchy.GetEffectiveRole(roles);
        Assert.Equal(expectedRole, result);
    }

    [Fact]
    public void GetEffectiveRole_NullOrEmpty_ReturnsCandidate()
    {
        Assert.Equal("candidate", RoleHierarchy.GetEffectiveRole((IEnumerable<string?>?)null));
        Assert.Equal("candidate", RoleHierarchy.GetEffectiveRole(Array.Empty<string>()));
        Assert.Equal("candidate", RoleHierarchy.GetEffectiveRole(new string?[] { null, "", "   " }));
    }

    [Theory]
    [InlineData("SUPERADMIN", "superadmin")]
    [InlineData("SuperAdmin", "superadmin")]
    [InlineData("  superadmin  ", "superadmin")]
    [InlineData("ADMIN", "admin")]
    [InlineData("  Content_Manager  ", "content_manager")]
    public void GetEffectiveRole_CaseAndWhitespaceInsensitive_NormalizesCorrectly(string input, string expected)
    {
        var result = RoleHierarchy.GetEffectiveRole(new[] { input });
        Assert.Equal(expected, result);
    }

    [Fact]
    public void GetEffectiveRole_UserEntity_HandlesMultipleRolesAndMissingNavigation()
    {
        var user = new User
        {
            Id = "usr_test",
            Email = "test@prepford.com",
            DisplayName = "Test User"
        };

        // User with no roles
        Assert.Equal("candidate", RoleHierarchy.GetEffectiveRole(user));

        // User with missing Role navigation property (Role == null)
        user.UserRoles.Add(new UserRole { RoleId = "role_superadmin", Role = null! });
        Assert.Equal("candidate", RoleHierarchy.GetEffectiveRole(user));

        // Add proper roles
        var superRole = new Role { Id = "role_superadmin", Name = "superadmin" };
        var candidateRole = new Role { Id = "role_candidate", Name = "candidate" };

        user.UserRoles.Clear();
        user.UserRoles.Add(new UserRole { RoleId = candidateRole.Id, Role = candidateRole });
        user.UserRoles.Add(new UserRole { RoleId = superRole.Id, Role = superRole });

        // Database row order has candidate first, but effective role MUST be superadmin
        Assert.Equal("superadmin", RoleHierarchy.GetEffectiveRole(user));
    }

    [Fact]
    public void GetEffectiveRole_ClaimsPrincipal_ResolvesHighestRole()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "usr_123"),
            new Claim(ClaimTypes.Role, "candidate"),
            new Claim(ClaimTypes.Role, "superadmin")
        };
        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);

        Assert.Equal("superadmin", RoleHierarchy.GetEffectiveRole(principal));
        Assert.True(RoleHierarchy.IsAdmin(RoleHierarchy.GetEffectiveRole(principal)));
        Assert.True(RoleHierarchy.IsSuperAdmin(RoleHierarchy.GetEffectiveRole(principal)));
    }

    [Theory]
    [InlineData("superadmin", true, true)]
    [InlineData("admin", true, false)]
    [InlineData("administrator", true, false)]
    [InlineData("exam_manager", false, false)]
    [InlineData("candidate", false, false)]
    [InlineData(null, false, false)]
    public void PrivilegeHelpers_IsAdminAndIsSuperAdmin_ClassifiesCorrectly(string? role, bool expectedIsAdmin, bool expectedIsSuperAdmin)
    {
        Assert.Equal(expectedIsAdmin, RoleHierarchy.IsAdmin(role));
        Assert.Equal(expectedIsSuperAdmin, RoleHierarchy.IsSuperAdmin(role));
    }

    [Fact]
    public async Task SuperAdminPolicy_SatisfiedByMultiRoleSuperAdmin_RejectsCandidateAlone()
    {
        // Build authorization service matching Program.cs configuration
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthorization(options =>
        {
            options.AddPolicy("RequireAdmin", policy =>
                policy.RequireRole("admin", "superadmin", "administrator"));

            options.AddPolicy("RequireSuperAdmin", policy =>
                policy.RequireRole("superadmin"));

            options.AddPolicy("RequireContentManager", policy =>
                policy.RequireRole("content_manager", "admin", "superadmin"));

            options.AddPolicy("RequireExamManager", policy =>
                policy.RequireRole("exam_manager", "superadmin"));
        });

        var sp = services.BuildServiceProvider();
        var authService = sp.GetRequiredService<IAuthorizationService>();

        // Multi-role user: [candidate, superadmin] resolved to superadmin
        var resolvedRole = RoleHierarchy.GetEffectiveRole(new[] { "candidate", "superadmin" });
        Assert.Equal("superadmin", resolvedRole);

        var superAdminPrincipal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "super_user"),
            new Claim(ClaimTypes.Role, resolvedRole)
        }, "TestAuth"));

        // Must satisfy RequireSuperAdmin, RequireAdmin, RequireContentManager, RequireExamManager
        var superRes = await authService.AuthorizeAsync(superAdminPrincipal, "RequireSuperAdmin");
        Assert.True(superRes.Succeeded);

        var adminRes = await authService.AuthorizeAsync(superAdminPrincipal, "RequireAdmin");
        Assert.True(adminRes.Succeeded);

        var contentRes = await authService.AuthorizeAsync(superAdminPrincipal, "RequireContentManager");
        Assert.True(contentRes.Succeeded);

        var examRes = await authService.AuthorizeAsync(superAdminPrincipal, "RequireExamManager");
        Assert.True(examRes.Succeeded);

        // Candidate alone
        var candidatePrincipal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "candidate_user"),
            new Claim(ClaimTypes.Role, "candidate")
        }, "TestAuth"));

        var candidateSuper = await authService.AuthorizeAsync(candidatePrincipal, "RequireSuperAdmin");
        Assert.False(candidateSuper.Succeeded);

        var candidateAdmin = await authService.AuthorizeAsync(candidatePrincipal, "RequireAdmin");
        Assert.False(candidateAdmin.Succeeded);
    }
}
