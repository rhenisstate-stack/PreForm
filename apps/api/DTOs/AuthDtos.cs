using System.ComponentModel.DataAnnotations;

namespace Preform.Api.DTOs;

public class RegisterRequest
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
    public string Pathway { get; set; } = "rn"; // "rn", "pn", "both"

    /// <summary>Stable browser client identity (cid_* form) so the registration session is rotatable by the same client.</summary>
    [MaxLength(64)]
    public string? ClientId { get; set; }
}

public class LoginRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(128)]
    public string Password { get; set; } = string.Empty;

    public bool RememberMe { get; set; } = false;

    [MaxLength(64)]
    public string? ClientId { get; set; }

    [MaxLength(64)]
    public string? FingerprintHash { get; set; }
}

public class AuthResponse
{
    public bool Success { get; set; }
    public string? Token { get; set; }
    public string? SessionId { get; set; }
    public UserSummaryDto? User { get; set; }
    public string? Error { get; set; }
    public string? ErrorCode { get; set; }
}

public class SessionResponse
{
    public bool Authenticated { get; set; }
    public UserSummaryDto? User { get; set; }
}

public class UserSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Role { get; set; } = "candidate";
    public string Pathway { get; set; } = "rn";
    public string ActivePlan { get; set; } = string.Empty;
    public string TargetExamDate { get; set; } = string.Empty;
    public bool EmailNotifications { get; set; } = true;
    public bool StudyReminders { get; set; } = true;
    public bool HasProfileImage { get; set; } = false;
    public string? ProfileImageUpdatedAt { get; set; }
    public string? PictureUrl { get; set; }
}

public class RevokeSessionRequest
{
    public string? SessionId { get; set; }
    public string? UserId { get; set; }
    public bool RevokeAll { get; set; } = false;
    public bool RevokeOthers { get; set; } = false;
    public string? Reason { get; set; }
}

public class ValidateSessionRequest
{
    public string? Token { get; set; }
    public string? SessionId { get; set; }
}

public class ValidateSessionResponse
{
    public bool Valid { get; set; }
    public string? Error { get; set; }
    public string? ErrorCode { get; set; }
    public UserSummaryDto? User { get; set; }
    public string? SessionId { get; set; }
    public DateTime? EffectiveExpiresAt { get; set; }
    public DateTime? IdleExpiresAt { get; set; }
    public DateTime? AbsoluteExpiresAt { get; set; }
}

public class UserSessionDto
{
    public string Id { get; set; } = string.Empty;
    public string? ClientId { get; set; }
    public string? DeviceLabel { get; set; }
    public string? LastIpAddress { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastActiveAt { get; set; }
    public DateTime IdleExpiresAt { get; set; }
    public DateTime AbsoluteExpiresAt { get; set; }
    public DateTime EffectiveExpiresAt { get; set; }
    public bool IsCurrentSession { get; set; }
}

public class ForgotPasswordRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;
}

public class ValidateResetTokenRequest
{
    [Required]
    public string Token { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    [Required]
    public string Token { get; set; } = string.Empty;

    [Required]
    [MinLength(8, ErrorMessage = "Password must be at least 8 characters long.")]
    [MaxLength(128)]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    [Compare("NewPassword", ErrorMessage = "Passwords do not match.")]
    public string ConfirmPassword { get; set; } = string.Empty;
}
