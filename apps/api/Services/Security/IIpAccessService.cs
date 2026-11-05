using Preform.Api.Models;

namespace Preform.Api.Services.Security;

public class IpRuleDto
{
    public string Id { get; set; } = string.Empty;
    public string IpAddressOrCidr { get; set; } = string.Empty;
    public string RuleType { get; set; } = "Blacklist";
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; }
}

public interface IIpAccessService
{
    Task<bool> IsIpBlockedAsync(string? clientIp, CancellationToken cancellationToken = default);
    Task<List<IpRuleDto>> GetRulesAsync(string? ruleType = null, bool? activeOnly = null, CancellationToken cancellationToken = default);
    Task<IpRuleDto?> GetRuleByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<IpRuleDto> CreateRuleAsync(string ipOrCidr, string ruleType, string description, string? createdBy, DateTime? expiresAt, CancellationToken cancellationToken = default);
    Task<IpRuleDto?> UpdateRuleAsync(string id, string? description, bool? isActive, DateTime? expiresAt, CancellationToken cancellationToken = default);
    Task<bool> DeleteRuleAsync(string id, CancellationToken cancellationToken = default);
}
