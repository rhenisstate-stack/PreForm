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
}

public class AuthResponse
{
    public bool Success { get; set; }
    public string? Token { get; set; }
    public UserSummaryDto? User { get; set; }
    public string? Error { get; set; }
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
    public string? PictureUrl { get; set; }
}
