using System.ComponentModel.DataAnnotations;
using Preform.Api.Models;

namespace Preform.Api.DTOs;

public class CreateTestimonialRequest
{
    [Required]
    [StringLength(128, MinimumLength = 2, ErrorMessage = "Display name must be between 2 and 128 characters.")]
    public string DisplayName { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(RN|PN|Both)$", ErrorMessage = "Pathway must be 'RN', 'PN', or 'Both'.")]
    public string Pathway { get; set; } = "RN";

    [Required]
    [StringLength(1000, MinimumLength = 10, ErrorMessage = "Quote must be between 10 and 1000 characters.")]
    public string Quote { get; set; } = string.Empty;

    [Range(typeof(bool), "true", "true", ErrorMessage = "Consent must be explicitly granted to publish feedback.")]
    public bool ConsentGranted { get; set; }

    [MaxLength(512)]
    public string? AvatarUrl { get; set; }
}

public class ModerateTestimonialRequest
{
    [Required]
    public TestimonialStatus Status { get; set; }

    public bool? OutcomeVerified { get; set; }
}

public class TestimonialResponseDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Pathway { get; set; } = string.Empty;
    public string Quote { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public bool OutcomeVerified { get; set; }
    public TestimonialStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
}
