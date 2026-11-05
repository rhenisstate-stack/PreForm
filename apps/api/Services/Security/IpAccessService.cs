using System.Net;
using System.Net.Sockets;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Preform.Api.Data;
using Preform.Api.Models;

namespace Preform.Api.Services.Security;

public class IpAccessService : IIpAccessService
{
    private readonly AppDbContext _context;
    private readonly ILogger<IpAccessService> _logger;

    public IpAccessService(AppDbContext context, ILogger<IpAccessService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<bool> IsIpBlockedAsync(string? clientIp, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(clientIp))
        {
            return false;
        }

        if (!IPAddress.TryParse(clientIp.Trim(), out var parsedClientIp))
        {
            return false;
        }

        var now = DateTime.UtcNow;
        var activeRules = await _context.IpAccessRules
            .Where(r => r.IsActive && (r.ExpiresAt == null || r.ExpiresAt > now))
            .ToListAsync(cancellationToken);

        // 1. Check Blacklist: if client matches ANY active blacklist rule, block immediately
        foreach (var rule in activeRules)
        {
            if (string.Equals(rule.RuleType, "Blacklist", StringComparison.OrdinalIgnoreCase))
            {
                if (IsMatch(parsedClientIp, rule.IpAddressOrCidr))
                {
                    _logger.LogWarning("Connection blocked: Client IP {ClientIp} matches active blacklist rule {RuleId} ({Pattern})",
                        clientIp, rule.Id, rule.IpAddressOrCidr);
                    return true;
                }
            }
        }

        // 2. Check Whitelist: if there are ANY active whitelist rules, client MUST match at least one
        var activeWhitelists = activeRules
            .Where(r => string.Equals(r.RuleType, "Whitelist", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (activeWhitelists.Count > 0)
        {
            var isWhitelisted = activeWhitelists.Any(r => IsMatch(parsedClientIp, r.IpAddressOrCidr));
            if (!isWhitelisted)
            {
                _logger.LogWarning("Connection blocked: Client IP {ClientIp} does not match any active whitelist rules.", clientIp);
                return true;
            }
        }

        return false;
    }

    public static bool IsMatch(IPAddress clientIp, string rulePattern)
    {
        if (string.IsNullOrWhiteSpace(rulePattern)) return false;
        var trimmed = rulePattern.Trim();

        // Exact IP string match
        if (string.Equals(clientIp.ToString(), trimmed, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (trimmed.Contains('/'))
        {
            var parts = trimmed.Split('/');
            if (parts.Length == 2 && IPAddress.TryParse(parts[0], out var networkIp) && int.TryParse(parts[1], out var prefixLength))
            {
                return MatchesCidr(clientIp, networkIp, prefixLength);
            }
        }
        else if (IPAddress.TryParse(trimmed, out var singleIp))
        {
            return clientIp.Equals(singleIp);
        }

        return false;
    }

    private static bool MatchesCidr(IPAddress clientIp, IPAddress networkIp, int prefixLength)
    {
        if (clientIp.AddressFamily != networkIp.AddressFamily)
        {
            // Map IPv4-mapped IPv6 if needed
            if (clientIp.IsIPv4MappedToIPv6 && networkIp.AddressFamily == AddressFamily.InterNetwork)
            {
                clientIp = clientIp.MapToIPv4();
            }
            else if (networkIp.IsIPv4MappedToIPv6 && clientIp.AddressFamily == AddressFamily.InterNetwork)
            {
                networkIp = networkIp.MapToIPv4();
            }
            else
            {
                return false;
            }
        }

        var clientBytes = clientIp.GetAddressBytes();
        var networkBytes = networkIp.GetAddressBytes();

        int fullBytes = prefixLength / 8;
        int remainingBits = prefixLength % 8;

        for (int i = 0; i < fullBytes; i++)
        {
            if (clientBytes[i] != networkBytes[i])
            {
                return false;
            }
        }

        if (remainingBits > 0 && fullBytes < clientBytes.Length)
        {
            int mask = (byte)(0xFF << (8 - remainingBits));
            if ((clientBytes[fullBytes] & mask) != (networkBytes[fullBytes] & mask))
            {
                return false;
            }
        }

        return true;
    }

    public async Task<List<IpRuleDto>> GetRulesAsync(string? ruleType = null, bool? activeOnly = null, CancellationToken cancellationToken = default)
    {
        var query = _context.IpAccessRules.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(ruleType))
        {
            query = query.Where(r => r.RuleType.ToLower() == ruleType.Trim().ToLower());
        }

        if (activeOnly == true)
        {
            var now = DateTime.UtcNow;
            query = query.Where(r => r.IsActive && (r.ExpiresAt == null || r.ExpiresAt > now));
        }

        var rules = await query.OrderByDescending(r => r.CreatedAt).ToListAsync(cancellationToken);

        return rules.Select(r => new IpRuleDto
        {
            Id = r.Id,
            IpAddressOrCidr = r.IpAddressOrCidr,
            RuleType = r.RuleType,
            Description = r.Description,
            CreatedAt = r.CreatedAt,
            CreatedBy = r.CreatedBy,
            ExpiresAt = r.ExpiresAt,
            IsActive = r.IsActive
        }).ToList();
    }

    public async Task<IpRuleDto?> GetRuleByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        var rule = await _context.IpAccessRules.FindAsync(new object[] { id }, cancellationToken);
        if (rule == null) return null;

        return new IpRuleDto
        {
            Id = rule.Id,
            IpAddressOrCidr = rule.IpAddressOrCidr,
            RuleType = rule.RuleType,
            Description = rule.Description,
            CreatedAt = rule.CreatedAt,
            CreatedBy = rule.CreatedBy,
            ExpiresAt = rule.ExpiresAt,
            IsActive = rule.IsActive
        };
    }

    public async Task<IpRuleDto> CreateRuleAsync(
        string ipOrCidr,
        string ruleType,
        string description,
        string? createdBy,
        DateTime? expiresAt,
        CancellationToken cancellationToken = default)
    {
        var normalizedType = string.Equals(ruleType, "Whitelist", StringComparison.OrdinalIgnoreCase) ? "Whitelist" : "Blacklist";
        var rule = new IpAccessRule
        {
            Id = Guid.NewGuid().ToString(),
            IpAddressOrCidr = ipOrCidr.Trim(),
            RuleType = normalizedType,
            Description = description.Trim(),
            CreatedBy = createdBy,
            ExpiresAt = expiresAt,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        _context.IpAccessRules.Add(rule);

        _context.AuditLogs.Add(new AuditLog
        {
            Action = "IpRuleCreated",
            EntityType = "IpAccessRule",
            EntityId = rule.Id,
            ActorId = createdBy,
            Description = $"Created {normalizedType} rule for {rule.IpAddressOrCidr}: {rule.Description}",
            Outcome = "Success",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);

        return new IpRuleDto
        {
            Id = rule.Id,
            IpAddressOrCidr = rule.IpAddressOrCidr,
            RuleType = rule.RuleType,
            Description = rule.Description,
            CreatedAt = rule.CreatedAt,
            CreatedBy = rule.CreatedBy,
            ExpiresAt = rule.ExpiresAt,
            IsActive = rule.IsActive
        };
    }

    public async Task<IpRuleDto?> UpdateRuleAsync(
        string id,
        string? description,
        bool? isActive,
        DateTime? expiresAt,
        CancellationToken cancellationToken = default)
    {
        var rule = await _context.IpAccessRules.FindAsync(new object[] { id }, cancellationToken);
        if (rule == null) return null;

        if (description != null) rule.Description = description.Trim();
        if (isActive.HasValue) rule.IsActive = isActive.Value;
        if (expiresAt.HasValue) rule.ExpiresAt = expiresAt.Value;

        await _context.SaveChangesAsync(cancellationToken);

        return new IpRuleDto
        {
            Id = rule.Id,
            IpAddressOrCidr = rule.IpAddressOrCidr,
            RuleType = rule.RuleType,
            Description = rule.Description,
            CreatedAt = rule.CreatedAt,
            CreatedBy = rule.CreatedBy,
            ExpiresAt = rule.ExpiresAt,
            IsActive = rule.IsActive
        };
    }

    public async Task<bool> DeleteRuleAsync(string id, CancellationToken cancellationToken = default)
    {
        var rule = await _context.IpAccessRules.FindAsync(new object[] { id }, cancellationToken);
        if (rule == null) return false;

        _context.IpAccessRules.Remove(rule);
        _context.AuditLogs.Add(new AuditLog
        {
            Action = "IpRuleDeleted",
            EntityType = "IpAccessRule",
            EntityId = rule.Id,
            Description = $"Deleted {rule.RuleType} rule for {rule.IpAddressOrCidr}",
            Outcome = "Success",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
