using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Preform.Api.Models;

[Table("Users", Schema = "public")]
public class User
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(128)]
    public string DisplayName { get; set; } = string.Empty;

    [MaxLength(10)]
    public string Pathway { get; set; } = "rn"; // Enforced single-pathway invariant: "rn" or "pn" for candidate students

    [MaxLength(32)]
    public string TargetExamDate { get; set; } = "2026-11-30";

    [MaxLength(128)]
    public string ActivePlan { get; set; } = "NCLEX-RN Complete Preparation Plan";

    public bool EmailNotifications { get; set; } = true;

    public bool StudyReminders { get; set; } = true;

    public bool IsActive { get; set; } = true;

    [MaxLength(32)]
    public string AccountStatus { get; set; } = "Active"; // "Active", "Suspended", "Deactivated"

    public DateTime? SuspendedAt { get; set; }

    [MaxLength(256)]
    public string? SuspensionReason { get; set; }

    public int SecurityVersion { get; set; } = 1;

    public bool HasProfileImage { get; set; } = false;
    public DateTime? ProfileImageUpdatedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public UserProfileImage? ProfileImage { get; set; }
    public ICollection<UserSession> UserSessions { get; set; } = new List<UserSession>();
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    public ICollection<PasswordResetToken> PasswordResetTokens { get; set; } = new List<PasswordResetToken>();
}

[Table("UserSessions", Schema = "public")]
public class UserSession
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string Role { get; set; } = "candidate";

    [MaxLength(128)]
    public string DisplayName { get; set; } = string.Empty;

    [Required]
    [MaxLength(128)]
    public string TokenHash { get; set; } = string.Empty;

    [MaxLength(128)]
    public string CsrfToken { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(7);
    public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;
    public bool Revoked { get; set; } = false;

    [MaxLength(64)]
    public string ClientId { get; set; } = string.Empty;

    public DateTime IdleExpiresAt { get; set; } = DateTime.UtcNow.AddMinutes(300);

    public DateTime AbsoluteExpiresAt { get; set; } = DateTime.UtcNow.AddDays(7);

    public DateTime? RevokedAt { get; set; }

    [MaxLength(64)]
    public string? RevocationReason { get; set; }

    [MaxLength(64)]
    public string? LastIpAddress { get; set; }

    [MaxLength(512)]
    public string? UserAgent { get; set; }

    [MaxLength(128)]
    public string? DeviceLabel { get; set; }

    [MaxLength(64)]
    public string? FingerprintHash { get; set; }

    public int SecurityVersion { get; set; } = 1;
}

[Table("UserProfileImages", Schema = "public")]
public class UserProfileImage
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string UserEmail { get; set; } = string.Empty;

    [Required]
    public byte[] ImageData { get; set; } = Array.Empty<byte>();

    [Required]
    [MaxLength(64)]
    public string ContentType { get; set; } = "image/png";

    public int SizeBytes { get; set; }

    [Required]
    [MaxLength(64)]
    public string Sha256Hash { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("Roles", Schema = "public")]
public class Role
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(64)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(256)]
    public string Description { get; set; } = string.Empty;

    public bool IsSystem { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}

[Table("Permissions", Schema = "public")]
public class Permission
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(64)]
    public string Key { get; set; } = string.Empty;

    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(64)]
    public string Category { get; set; } = string.Empty;

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

[Table("RolePermissions", Schema = "public")]
public class RolePermission
{
    public string RoleId { get; set; } = string.Empty;
    public Role Role { get; set; } = null!;

    public string PermissionId { get; set; } = string.Empty;
    public Permission Permission { get; set; } = null!;
}

[Table("UserRoles", Schema = "public")]
public class UserRole
{
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    public string RoleId { get; set; } = string.Empty;
    public Role Role { get; set; } = null!;

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}

[Table("AuditLogs", Schema = "public")]
public class AuditLog
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string? ActorId { get; set; }
    public User? Actor { get; set; }

    [Required]
    [MaxLength(64)]
    public string Action { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string EntityType { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? EntityId { get; set; }

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(32)]
    public string Outcome { get; set; } = "Success";

    [MaxLength(64)]
    public string? IpAddress { get; set; }

    [MaxLength(128)]
    public string? CorrelationId { get; set; }

    [MaxLength(512)]
    public string? UserAgent { get; set; }

    public string? BeforeValueJson { get; set; }

    public string? AfterValueJson { get; set; }

    [MaxLength(32)]
    public string Severity { get; set; } = "Information"; // "Information", "Warning", "Error", "Critical"

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

[Table("SessionSecurityPolicies", Schema = "public")]
public class SessionSecurityPolicy
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = "global_policy";

    public int MaxConcurrentSessions { get; set; } = 2;

    public int MaxSessionsPerClient { get; set; } = 1;

    public int IdleTimeoutMinutes { get; set; } = 300;

    public int AbsoluteTimeoutMinutes { get; set; } = 10080;

    public bool EnforceFingerprint { get; set; } = true;

    public bool EnforceIpConsistency { get; set; } = false;

    public bool AllowIpDrift { get; set; } = true;

    public bool RotateOnLogin { get; set; } = true;

    public bool RotateOnPrivilegeChange { get; set; } = true;

    public bool RotateOnPasswordChange { get; set; } = true;

    public int PolicyVersion { get; set; } = 1;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [MaxLength(128)]
    public string? UpdatedBy { get; set; } = "system";

    public bool IsActive { get; set; } = true;
}
