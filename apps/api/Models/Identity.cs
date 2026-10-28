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
    public string Pathway { get; set; } = "rn"; // "rn" or "pn"

    public bool IsActive { get; set; } = true;

    public bool HasProfileImage { get; set; } = false;
    public DateTime? ProfileImageUpdatedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public UserProfileImage? ProfileImage { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
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
    public string Key { get; set; } = string.Empty; // e.g. "dashboard.view", "questions.create"

    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(64)]
    public string Category { get; set; } = string.Empty; // "Questions", "Exams", "Users", etc.

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
    public string Action { get; set; } = string.Empty; // "UserLogin", "QuestionCreated", "ExamPublished", etc.

    [Required]
    [MaxLength(64)]
    public string EntityType { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? EntityId { get; set; }

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(32)]
    public string Outcome { get; set; } = "Success"; // "Success", "Failed", "Denied"

    [MaxLength(64)]
    public string? IpAddress { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
