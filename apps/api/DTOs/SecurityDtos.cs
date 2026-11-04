using System.ComponentModel.DataAnnotations;

namespace Preform.Api.DTOs;

public class LearnerSessionDto
{
    public string Id { get; set; } = string.Empty;

    public string DeviceLabel { get; set; } = "Standard Web Browser";

    public string Browser { get; set; } = "Web Browser";

    public string OperatingSystem { get; set; } = "Unknown OS";

    public string DeviceType { get; set; } = "Desktop";

    public DateTime CreatedAt { get; set; }

    public DateTime LastActiveAt { get; set; }

    public DateTime IdleExpiresAt { get; set; }

    public DateTime AbsoluteExpiresAt { get; set; }

    public bool IsCurrent { get; set; }

    public string? LastIpAddress { get; set; }
}

public class SecurityEventDto
{
    public string Id { get; set; } = string.Empty;

    public string Action { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Outcome { get; set; } = "Success";

    public DateTime Timestamp { get; set; }

    public string? IpAddress { get; set; }
}

public class LearnerSessionsResponseDto
{
    public bool Success { get; set; } = true;

    public List<LearnerSessionDto> Sessions { get; set; } = new();

    public int TotalActiveCount => Sessions.Count;
}

public class SecurityEventsResponseDto
{
    public bool Success { get; set; } = true;

    public List<SecurityEventDto> Events { get; set; } = new();

    public int TotalCount => Events.Count;
}

public class RevokeSessionResultDto
{
    public bool Success { get; set; }

    public string Message { get; set; } = string.Empty;

    public int? RevokedCount { get; set; }
}

// ── Super Admin Session Security DTOs ────────────────────────────────────────

public class AdminSecurityMetricsDto
{
    public bool Success { get; set; } = true;

    public int TotalActiveSessions { get; set; }

    public int ActiveUsersCount { get; set; }

    public int ExpiringSoonCount { get; set; }

    public int RevokedLast24HoursCount { get; set; }

    public int LimitRejectionsLast24HoursCount { get; set; }

    public int SecurityVersionInvalidationsLast24HoursCount { get; set; }
}

public class SystemPolicyDefaultsDto
{
    public int MaxConcurrentSessions => 2;
    public int MaxSessionsPerClient => 1;
    public int IdleTimeoutMinutes => 300;
    public int AbsoluteTimeoutMinutes => 10080;
    public bool EnforceFingerprint => true;
    public bool EnforceIpConsistency => false;
    public bool AllowIpDrift => true;
    public bool RotateOnLogin => true;
    public bool RotateOnPrivilegeChange => true;
    public bool RotateOnPasswordChange => true;
}

public class AdminSessionPolicyDto
{
    public bool Success { get; set; } = true;

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

    public DateTime UpdatedAt { get; set; }

    public string? UpdatedBy { get; set; }

    public bool IsActive { get; set; } = true;

    public SystemPolicyDefaultsDto Defaults { get; set; } = new();
}

public class UpdateSessionPolicyRequest
{
    [Range(1, 10, ErrorMessage = "Max concurrent sessions must be between 1 and 10.")]
    public int MaxConcurrentSessions { get; set; } = 2;

    [Range(1, 5, ErrorMessage = "Max sessions per client must be between 1 and 5.")]
    public int MaxSessionsPerClient { get; set; } = 1;

    [Range(15, 1440, ErrorMessage = "Idle timeout must be between 15 and 1,440 minutes.")]
    public int IdleTimeoutMinutes { get; set; } = 300;

    [Range(60, 43200, ErrorMessage = "Absolute timeout must be between 60 and 43,200 minutes.")]
    public int AbsoluteTimeoutMinutes { get; set; } = 10080;

    public bool EnforceFingerprint { get; set; } = true;

    public bool EnforceIpConsistency { get; set; } = false;

    public bool AllowIpDrift { get; set; } = true;

    public bool RotateOnLogin { get; set; } = true;

    public bool RotateOnPrivilegeChange { get; set; } = true;

    public bool RotateOnPasswordChange { get; set; } = true;

    [Required]
    public int PolicyVersion { get; set; }
}

public class AdminSessionItemDto
{
    public string Id { get; set; } = string.Empty;

    public string UserId { get; set; } = string.Empty;

    public string UserEmail { get; set; } = string.Empty;

    public string UserDisplayName { get; set; } = string.Empty;

    public string Role { get; set; } = "candidate";

    public string ClientId { get; set; } = string.Empty;

    public string DeviceLabel { get; set; } = "Standard Web Browser";

    public string Browser { get; set; } = "Web Browser";

    public string OperatingSystem { get; set; } = "Unknown OS";

    public string DeviceType { get; set; } = "Desktop";

    public DateTime CreatedAt { get; set; }

    public DateTime LastActiveAt { get; set; }

    public DateTime IdleExpiresAt { get; set; }

    public DateTime AbsoluteExpiresAt { get; set; }

    public DateTime EffectiveExpiresAt { get; set; }

    public bool Revoked { get; set; }

    public DateTime? RevokedAt { get; set; }

    public string? RevocationReason { get; set; }

    public string? LastIpAddress { get; set; }

    public string Status { get; set; } = "Active";
}

public class AdminPaginatedSessionsDto
{
    public bool Success { get; set; } = true;

    public List<AdminSessionItemDto> Items { get; set; } = new();

    public int TotalCount { get; set; }

    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 20;

    public int TotalPages => (int)Math.Ceiling((double)TotalCount / Math.Max(1, PageSize));
}

public class AdminRevokeSessionRequest
{
    [Required]
    [MinLength(3, ErrorMessage = "A valid administrative reason of at least 3 characters is required.")]
    [MaxLength(256)]
    public string Reason { get; set; } = string.Empty;
}

public class AdminRevokeAllUserSessionsRequest
{
    [Required]
    [MinLength(3, ErrorMessage = "A valid administrative reason of at least 3 characters is required.")]
    [MaxLength(256)]
    public string Reason { get; set; } = string.Empty;
}

public class AdminSecurityEventDto
{
    public string Id { get; set; } = string.Empty;

    public string? ActorId { get; set; }

    public string? ActorEmail { get; set; }

    public string Action { get; set; } = string.Empty;

    public string EntityType { get; set; } = string.Empty;

    public string? EntityId { get; set; }

    public string Description { get; set; } = string.Empty;

    public string Outcome { get; set; } = "Success";

    public string? IpAddress { get; set; }

    public DateTime Timestamp { get; set; }
}

public class AdminPaginatedEventsDto
{
    public bool Success { get; set; } = true;

    public List<AdminSecurityEventDto> Items { get; set; } = new();

    public int TotalCount { get; set; }

    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 20;

    public int TotalPages => (int)Math.Ceiling((double)TotalCount / Math.Max(1, PageSize));
}
