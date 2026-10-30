using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.Models;

namespace Preform.Api.Services;

public interface IAdminBootstrapService
{
    Task<AdminBootstrapResult> BootstrapSuperAdminAsync(
        string email,
        string password,
        string? displayName = null,
        bool allowRecovery = false,
        CancellationToken cancellationToken = default);
}

public class AdminBootstrapResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public string? Email { get; set; }
    public bool IsRecovery { get; set; }
}

public class AdminBootstrapService : IAdminBootstrapService
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ILogger<AdminBootstrapService> _logger;

    public AdminBootstrapService(
        AppDbContext context,
        IPasswordHasher<User> passwordHasher,
        ILogger<AdminBootstrapService> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    public async Task<AdminBootstrapResult> BootstrapSuperAdminAsync(
        string email,
        string password,
        string? displayName = null,
        bool allowRecovery = false,
        CancellationToken cancellationToken = default)
    {
        // 1. Validation: Fail closed if required parameters are missing or weak
        if (string.IsNullOrWhiteSpace(email))
        {
            return new AdminBootstrapResult { Success = false, Message = "Super Admin email is required." };
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        if (!normalizedEmail.Contains('@') || !normalizedEmail.Contains('.'))
        {
            return new AdminBootstrapResult { Success = false, Message = "Super Admin email must be a valid email address." };
        }

        if (string.IsNullOrWhiteSpace(password) || password.Length < 12)
        {
            return new AdminBootstrapResult
            {
                Success = false,
                Message = "Super Admin password must be at least 12 characters long with strong entropy."
            };
        }

        // 2. Ensure Superadmin Role exists in DB
        var superAdminRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "superadmin", cancellationToken);
        if (superAdminRole == null)
        {
            superAdminRole = new Role
            {
                Id = Guid.NewGuid().ToString(),
                Name = "superadmin",
                Description = "System Super Administrator",
                IsSystem = true,
                CreatedAt = DateTime.UtcNow
            };
            _context.Roles.Add(superAdminRole);
            await _context.SaveChangesAsync(cancellationToken);
        }

        // 3. Check if any Super Admin already exists in the system
        var existingSuperAdminUserRole = await _context.UserRoles
            .Include(ur => ur.User)
            .FirstOrDefaultAsync(ur => ur.RoleId == superAdminRole.Id && ur.User.IsActive, cancellationToken);

        if (existingSuperAdminUserRole != null && !allowRecovery)
        {
            _logger.LogWarning("Administrative bootstrap refused: An active Super Admin already exists in the system ({UserId}).", existingSuperAdminUserRole.UserId);
            return new AdminBootstrapResult
            {
                Success = false,
                Message = "A Super Admin account already exists. Bootstrap is refused unless explicit recovery mode is authorized.",
                UserId = existingSuperAdminUserRole.UserId
            };
        }

        var now = DateTime.UtcNow;
        var effectiveName = string.IsNullOrWhiteSpace(displayName) ? "PrepFord Super Admin" : displayName.Trim();

        // 4. Transactional creation or recovery update
        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            User user;
            bool isRecovery = false;

            var existingUserWithEmail = await _context.Users
                .Include(u => u.UserRoles)
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail, cancellationToken);

            if (existingUserWithEmail != null)
            {
                if (!allowRecovery)
                {
                    await tx.RollbackAsync(cancellationToken);
                    return new AdminBootstrapResult
                    {
                        Success = false,
                        Message = "An account with this email address already exists. Explicit recovery flag is required to promote or reset."
                    };
                }

                // Authorized Recovery procedure: update existing user
                user = existingUserWithEmail;
                user.PasswordHash = _passwordHasher.HashPassword(user, password);
                user.DisplayName = effectiveName;
                user.IsActive = true;
                user.UpdatedAt = now;
                isRecovery = true;

                // Ensure superadmin role assignment
                if (!user.UserRoles.Any(ur => ur.RoleId == superAdminRole.Id))
                {
                    _context.UserRoles.Add(new UserRole
                    {
                        UserId = user.Id,
                        RoleId = superAdminRole.Id,
                        AssignedAt = now
                    });
                }
            }
            else
            {
                // New user bootstrap
                user = new User
                {
                    Id = "usr_super_" + Guid.NewGuid().ToString("N")[..12],
                    Email = normalizedEmail,
                    DisplayName = effectiveName,
                    Pathway = "both",
                    ActivePlan = "NCLEX-RN & PN All-Access Pass (Administrative)",
                    TargetExamDate = "2026-12-31",
                    EmailNotifications = true,
                    StudyReminders = false,
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now
                };

                user.PasswordHash = _passwordHasher.HashPassword(user, password);
                _context.Users.Add(user);

                _context.UserRoles.Add(new UserRole
                {
                    UserId = user.Id,
                    RoleId = superAdminRole.Id,
                    AssignedAt = now
                });
            }

            // Record security audit event without logging password or tokens
            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = user.Id,
                Action = isRecovery ? "SuperAdminAccountRecovered" : "SuperAdminAccountBootstrapped",
                EntityType = "User",
                EntityId = user.Id,
                Description = isRecovery
                    ? $"Super Admin account credentials reset via authorized administrative recovery for {user.Email}"
                    : $"First Super Admin account bootstrapped for {user.Email}",
                Outcome = "Success",
                Timestamp = now
            });

            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            _logger.LogInformation("Super Admin bootstrap completed successfully for UserId: {UserId}, Email: {Email}, Recovery: {IsRecovery}",
                user.Id, user.Email, isRecovery);

            return new AdminBootstrapResult
            {
                Success = true,
                Message = isRecovery
                    ? "Super Admin account successfully recovered and credentials updated."
                    : "Initial Super Admin account successfully created.",
                UserId = user.Id,
                Email = user.Email,
                IsRecovery = isRecovery
            };
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            _logger.LogError(ex, "Failed to bootstrap Super Admin account.");
            return new AdminBootstrapResult
            {
                Success = false,
                Message = $"Failed to bootstrap Super Admin account: {ex.Message}"
            };
        }
    }
}
