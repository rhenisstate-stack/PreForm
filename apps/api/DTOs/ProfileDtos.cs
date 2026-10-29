using System.ComponentModel.DataAnnotations;

namespace Preform.Api.DTOs;

public class UpdateProfileRequest
{
    [MaxLength(128)]
    public string? DisplayName { get; set; }

    [MaxLength(32)]
    public string? TargetExamDate { get; set; }

    public bool? EmailNotifications { get; set; }

    public bool? StudyReminders { get; set; }

    // Prohibited privilege escalation fields (detected for 403 enforcement)
    public string? Role { get; set; }
    public string? Pathway { get; set; }
    public string? ActivePlan { get; set; }
    public bool? IsActive { get; set; }
}

public class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [MinLength(8, ErrorMessage = "New password must be at least 8 characters.")]
    [MaxLength(128)]
    public string NewPassword { get; set; } = string.Empty;
}

public class UserProfileDto
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
