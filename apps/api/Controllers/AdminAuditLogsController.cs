using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/admin/audit-logs")]
[Authorize(Policy = "RequireAdmin")]
public class AdminAuditLogsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminAuditLogsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] string? actorId,
        [FromQuery] string? action,
        [FromQuery] string? entityType,
        [FromQuery] string? entityId,
        [FromQuery] string? correlationId,
        [FromQuery] string? severity,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.AuditLogs
            .Include(al => al.Actor)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(actorId))
        {
            query = query.Where(al => al.ActorId == actorId);
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            var a = action.Trim().ToLower();
            query = query.Where(al => al.Action.ToLower().Contains(a));
        }

        if (!string.IsNullOrWhiteSpace(entityType))
        {
            var et = entityType.Trim().ToLower();
            query = query.Where(al => al.EntityType.ToLower() == et);
        }

        if (!string.IsNullOrWhiteSpace(entityId))
        {
            query = query.Where(al => al.EntityId == entityId);
        }

        if (!string.IsNullOrWhiteSpace(correlationId))
        {
            query = query.Where(al => al.CorrelationId == correlationId);
        }

        if (!string.IsNullOrWhiteSpace(severity))
        {
            var sev = severity.Trim().ToLower();
            query = query.Where(al => al.Severity.ToLower() == sev);
        }

        if (from.HasValue)
        {
            query = query.Where(al => al.Timestamp >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(al => al.Timestamp <= to.Value);
        }

        var total = await query.CountAsync(cancellationToken);

        var logs = await query
            .OrderByDescending(al => al.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(al => new
            {
                al.Id,
                al.ActorId,
                ActorEmail = al.Actor != null ? al.Actor.Email : null,
                ActorName = al.Actor != null ? al.Actor.DisplayName : null,
                al.Action,
                al.EntityType,
                al.EntityId,
                al.Description,
                al.Outcome,
                al.Severity,
                al.CorrelationId,
                al.IpAddress,
                al.UserAgent,
                al.Timestamp
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            total,
            page,
            pageSize,
            logs
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAuditLogById(string id, CancellationToken cancellationToken)
    {
        var log = await _context.AuditLogs
            .Include(al => al.Actor)
            .AsNoTracking()
            .FirstOrDefaultAsync(al => al.Id == id, cancellationToken);

        if (log == null)
        {
            return NotFound(new { success = false, error = "Audit log not found." });
        }

        return Ok(new
        {
            success = true,
            log = new
            {
                log.Id,
                log.ActorId,
                ActorEmail = log.Actor?.Email,
                ActorName = log.Actor?.DisplayName,
                log.Action,
                log.EntityType,
                log.EntityId,
                log.Description,
                log.Outcome,
                log.Severity,
                log.CorrelationId,
                log.IpAddress,
                log.UserAgent,
                log.BeforeValueJson,
                log.AfterValueJson,
                log.Timestamp
            }
        });
    }
}
