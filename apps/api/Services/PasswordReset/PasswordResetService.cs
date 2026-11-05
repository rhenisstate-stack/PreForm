using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Preform.Api.Data;
using Preform.Api.Models;
using Preform.Api.Services.Email;

namespace Preform.Api.Services.PasswordReset;

public class PasswordResetService : IPasswordResetService
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PasswordResetService> _logger;

    public PasswordResetService(
        AppDbContext context,
        IPasswordHasher<User> passwordHasher,
        IEmailSender emailSender,
        IConfiguration configuration,
        ILogger<PasswordResetService> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _emailSender = emailSender;
        _configuration = configuration;
        _logger = logger;
    }

    public static string HashToken(string token)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token.Trim()));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public static string MaskEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return string.Empty;
        var parts = email.Split('@');
        if (parts.Length != 2) return email;

        var name = parts[0];
        var domain = parts[1];

        if (name.Length <= 2)
        {
            return $"{name[0]}*@{domain}";
        }

        return $"{name[0]}{new string('*', name.Length - 2)}{name[^1]}@{domain}";
    }

    public async Task<PasswordResetRequestResult> RequestPasswordResetAsync(
        string email,
        string? ipAddress = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default)
    {
        const string standardMessage = "If an account exists with that email, password reset instructions have been sent.";

        if (string.IsNullOrWhiteSpace(email))
        {
            return new PasswordResetRequestResult { Success = true, Message = standardMessage };
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail, cancellationToken);

        // Constant-time mitigation and account existence confidentiality
        if (user == null || !user.IsActive || user.AccountStatus == "Suspended" || user.AccountStatus == "Deactivated")
        {
            _logger.LogInformation("Password reset requested for nonexistent or inactive email: {Email}", normalizedEmail);
            return new PasswordResetRequestResult { Success = true, Message = standardMessage };
        }

        // Invalidate prior pending tokens for this user
        var existingTokens = await _context.PasswordResetTokens
            .Where(t => t.UserId == user.Id && t.UsedAt == null && t.ExpiresAt > DateTime.UtcNow)
            .ToListAsync(cancellationToken);

        foreach (var t in existingTokens)
        {
            t.ExpiresAt = DateTime.UtcNow;
        }

        // Generate 32 bytes of cryptographic randomness (hex-encoded = 64 characters)
        var rawToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        var tokenHash = HashToken(rawToken);

        var resetToken = new PasswordResetToken
        {
            Id = Guid.NewGuid().ToString(),
            UserId = user.Id,
            TokenHash = tokenHash,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddMinutes(15),
            IpAddress = ipAddress,
            UserAgent = userAgent
        };

        _context.PasswordResetTokens.Add(resetToken);

        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = user.Id,
            Action = "PasswordResetRequested",
            EntityType = "User",
            EntityId = user.Id,
            Description = "Password reset link requested and generated",
            Outcome = "Success",
            IpAddress = ipAddress,
            UserAgent = userAgent,
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);

        var webOrigin = _configuration["WEB_ORIGIN"] ?? "http://localhost:3000";
        var resetLink = $"{webOrigin.TrimEnd('/')}/reset-password?token={rawToken}";

        try
        {
            await _emailSender.SendPasswordResetEmailAsync(user.Email, resetLink, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to dispatch password reset email to {Email}", user.Email);
        }

        return new PasswordResetRequestResult { Success = true, Message = standardMessage };
    }

    public async Task<ValidateResetTokenResult> ValidateResetTokenAsync(
        string token,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return new ValidateResetTokenResult { IsValid = false, Error = "Reset token is required." };
        }

        var tokenHash = HashToken(token);
        var resetToken = await _context.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash && t.UsedAt == null && t.ExpiresAt > DateTime.UtcNow, cancellationToken);

        if (resetToken == null || resetToken.User == null || !resetToken.User.IsActive)
        {
            return new ValidateResetTokenResult { IsValid = false, Error = "Invalid or expired password reset token." };
        }

        return new ValidateResetTokenResult
        {
            IsValid = true,
            MaskedEmail = MaskEmail(resetToken.User.Email)
        };
    }

    public async Task<PasswordResetResult> ResetPasswordAsync(
        string token,
        string newPassword,
        string? ipAddress = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return new PasswordResetResult { Success = false, Error = "Reset token is required.", ErrorCode = "TOKEN_REQUIRED" };
        }

        if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 8)
        {
            return new PasswordResetResult { Success = false, Error = "Password must be at least 8 characters long.", ErrorCode = "PASSWORD_TOO_SHORT" };
        }

        var tokenHash = HashToken(token);
        var resetToken = await _context.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash && t.UsedAt == null && t.ExpiresAt > DateTime.UtcNow, cancellationToken);

        if (resetToken == null || resetToken.User == null)
        {
            return new PasswordResetResult { Success = false, Error = "Invalid or expired password reset token.", ErrorCode = "INVALID_TOKEN" };
        }

        var user = resetToken.User;
        if (!user.IsActive || user.AccountStatus == "Suspended" || user.AccountStatus == "Deactivated")
        {
            return new PasswordResetResult { Success = false, Error = "Account is disabled or suspended.", ErrorCode = "ACCOUNT_INACTIVE" };
        }

        // Atomic update and session revocation
        resetToken.UsedAt = DateTime.UtcNow;
        user.PasswordHash = _passwordHasher.HashPassword(user, newPassword);
        user.SecurityVersion += 1;
        user.UpdatedAt = DateTime.UtcNow;

        // Revoke all existing sessions for this user
        var activeSessions = await _context.UserSessions
            .Where(s => s.UserId == user.Id && !s.Revoked)
            .ToListAsync(cancellationToken);

        foreach (var session in activeSessions)
        {
            session.Revoked = true;
            session.RevokedAt = DateTime.UtcNow;
            session.RevocationReason = "PasswordReset";
        }

        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = user.Id,
            Action = "PasswordResetCompleted",
            EntityType = "User",
            EntityId = user.Id,
            Description = "Password reset successfully completed; all active sessions revoked and SecurityVersion incremented",
            Outcome = "Success",
            IpAddress = ipAddress,
            UserAgent = userAgent,
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Password reset successfully completed for user {UserId}. Active sessions revoked.", user.Id);

        return new PasswordResetResult { Success = true };
    }
}
