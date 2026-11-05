using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Preform.Api.Models;

[Table("RateLimitBuckets", Schema = "public")]
public class RateLimitBucket
{
    [Key]
    [MaxLength(128)]
    public string Key { get; set; } = string.Empty;

    public int AttemptCount { get; set; } = 0;

    public DateTime WindowStartUtc { get; set; } = DateTime.UtcNow;

    public DateTime? LockoutUntilUtc { get; set; }

    public DateTime ExpiresAtUtc { get; set; } = DateTime.UtcNow.AddMinutes(15);

    public DateTime LastAttemptUtc { get; set; } = DateTime.UtcNow;
}

[Table("PasswordResetTokens", Schema = "public")]
public class PasswordResetToken
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    [Required]
    [MaxLength(128)]
    public string TokenHash { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMinutes(15);

    public DateTime? UsedAt { get; set; }

    [MaxLength(64)]
    public string? IpAddress { get; set; }

    [MaxLength(512)]
    public string? UserAgent { get; set; }
}

[Table("IpAccessRules", Schema = "public")]
public class IpAccessRule
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(64)]
    public string IpAddressOrCidr { get; set; } = string.Empty;

    [Required]
    [MaxLength(16)]
    public string RuleType { get; set; } = "Blacklist"; // "Blacklist" or "Whitelist"

    [MaxLength(256)]
    public string Description { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [MaxLength(128)]
    public string? CreatedBy { get; set; }

    public DateTime? ExpiresAt { get; set; }

    public bool IsActive { get; set; } = true;
}
