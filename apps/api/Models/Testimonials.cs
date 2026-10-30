using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Preform.Api.Models;

public enum TestimonialStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2
}

[Table("Testimonials", Schema = "public")]
public class Testimonial
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(128)]
    public string? UserId { get; set; }

    [Required]
    [MaxLength(128)]
    public string DisplayName { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Pathway { get; set; } = "RN"; // "RN", "PN", "Both"

    [Required]
    [MaxLength(1000)]
    public string Quote { get; set; } = string.Empty;

    [MaxLength(512)]
    public string? AvatarUrl { get; set; }

    public TestimonialStatus Status { get; set; } = TestimonialStatus.Pending;

    public bool ConsentGranted { get; set; } = false;

    public bool OutcomeVerified { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ModeratedAt { get; set; }

    [MaxLength(128)]
    public string? ModeratedBy { get; set; }
}
