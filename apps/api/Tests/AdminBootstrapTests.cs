using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Data;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class AdminBootstrapTests
{
    private AppDbContext CreateInMemoryDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        var context = new AppDbContext(options);
        context.Database.EnsureCreated();

        // Seed roles
        if (!context.Roles.Any())
        {
            context.Roles.AddRange(
                new Role { Id = "role_superadmin", Name = "superadmin", Description = "Super Admin", IsSystem = true },
                new Role { Id = "role_admin", Name = "admin", Description = "Admin", IsSystem = true },
                new Role { Id = "role_candidate", Name = "candidate", Description = "Candidate", IsSystem = true }
            );
            context.SaveChanges();
        }

        return context;
    }

    [Fact]
    public async Task BootstrapSuperAdmin_FirstCall_CreatesUserAndRoleAssignment_Succeeds()
    {
        var context = CreateInMemoryDbContext("Bootstrap_FirstCall_Db");
        var hasher = new PasswordHasher<User>();
        var service = new AdminBootstrapService(context, hasher, NullLogger<AdminBootstrapService>.Instance);

        var result = await service.BootstrapSuperAdminAsync(
            email: "admin@prepford.com",
            password: "StrongSecretAdminP@ss123!",
            displayName: "Initial Super Admin"
        );

        Assert.True(result.Success);
        Assert.NotNull(result.UserId);
        Assert.False(result.IsRecovery);

        // Verify user in DB
        var user = await context.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role).FirstOrDefaultAsync(u => u.Email == "admin@prepford.com");
        Assert.NotNull(user);
        Assert.Equal("Initial Super Admin", user.DisplayName);
        Assert.True(user.IsActive);
        Assert.Contains(user.UserRoles, ur => ur.Role.Name == "superadmin");

        // Verify audit log
        var audit = await context.AuditLogs.FirstOrDefaultAsync(a => a.EntityId == user.Id && a.Action == "SuperAdminAccountBootstrapped");
        Assert.NotNull(audit);
        Assert.Equal("Success", audit.Outcome);
    }

    [Fact]
    public async Task BootstrapSuperAdmin_DuplicateCallWithoutRecovery_FailsClosed()
    {
        var context = CreateInMemoryDbContext("Bootstrap_Duplicate_Db");
        var hasher = new PasswordHasher<User>();
        var service = new AdminBootstrapService(context, hasher, NullLogger<AdminBootstrapService>.Instance);

        // First call
        var firstResult = await service.BootstrapSuperAdminAsync(
            email: "superadmin1@prepford.com",
            password: "InitialPassword123!",
            displayName: "Super Admin One"
        );
        Assert.True(firstResult.Success);

        // Attempting to create second Super Admin without recovery
        var secondResult = await service.BootstrapSuperAdminAsync(
            email: "anotheradmin@prepford.com",
            password: "AnotherPassword123!",
            displayName: "Super Admin Two",
            allowRecovery: false
        );

        Assert.False(secondResult.Success);
        Assert.Contains("already exists", secondResult.Message);
    }

    [Fact]
    public async Task BootstrapSuperAdmin_WithRecovery_UpdatesExistingSuperAdmin()
    {
        var context = CreateInMemoryDbContext("Bootstrap_Recovery_Db");
        var hasher = new PasswordHasher<User>();
        var service = new AdminBootstrapService(context, hasher, NullLogger<AdminBootstrapService>.Instance);

        // First call
        await service.BootstrapSuperAdminAsync(
            email: "recovery@prepford.com",
            password: "InitialPassword123!",
            displayName: "Original Admin"
        );

        // Recovery call with new credentials
        var recoveryResult = await service.BootstrapSuperAdminAsync(
            email: "recovery@prepford.com",
            password: "NewRecoveredPassword456!",
            displayName: "Recovered Admin",
            allowRecovery: true
        );

        Assert.True(recoveryResult.Success);
        Assert.True(recoveryResult.IsRecovery);

        var user = await context.Users.FirstOrDefaultAsync(u => u.Email == "recovery@prepford.com");
        Assert.NotNull(user);
        Assert.Equal("Recovered Admin", user.DisplayName);

        // Verify password updated
        var verifyOld = hasher.VerifyHashedPassword(user, user.PasswordHash, "InitialPassword123!");
        Assert.Equal(PasswordVerificationResult.Failed, verifyOld);

        var verifyNew = hasher.VerifyHashedPassword(user, user.PasswordHash, "NewRecoveredPassword456!");
        Assert.NotEqual(PasswordVerificationResult.Failed, verifyNew);

        // Verify recovery audit log
        var audit = await context.AuditLogs.FirstOrDefaultAsync(a => a.EntityId == user.Id && a.Action == "SuperAdminAccountRecovered");
        Assert.NotNull(audit);
    }

    [Theory]
    [InlineData("", "ValidPassword123!")]
    [InlineData("notanemail", "ValidPassword123!")]
    [InlineData("admin@prepford.com", "")]
    [InlineData("admin@prepford.com", "short")]
    public async Task BootstrapSuperAdmin_InvalidParameters_FailsClosed(string email, string password)
    {
        var context = CreateInMemoryDbContext($"Bootstrap_Invalid_{Guid.NewGuid()}");
        var hasher = new PasswordHasher<User>();
        var service = new AdminBootstrapService(context, hasher, NullLogger<AdminBootstrapService>.Instance);

        var result = await service.BootstrapSuperAdminAsync(email, password);
        Assert.False(result.Success);
    }
}
