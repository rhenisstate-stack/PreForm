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
