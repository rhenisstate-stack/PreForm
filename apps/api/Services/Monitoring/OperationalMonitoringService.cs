using System;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;

namespace Preform.Api.Services.Monitoring;

public class OperationalMonitoringService : IOperationalMonitoringService
{
    private readonly AppDbContext _context;

    public OperationalMonitoringService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<OperationalHealthDto> GetOperationalHealthAsync(CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        var dbStatus = "Healthy";
        var dbHealthy = false;

        try
        {
            if (_context.Database.IsRelational())
            {
                await _context.Database.ExecuteSqlRawAsync("SELECT 1", ct);
            }
            else
            {
                // In-memory or testing provider
                await _context.Users.AnyAsync(ct);
            }
            dbHealthy = true;
        }
        catch (Exception ex)
        {
            dbStatus = $"Unhealthy: {ex.Message}";
            dbHealthy = false;
        }
        finally
        {
            sw.Stop();
        }

        var latencyMs = sw.ElapsedMilliseconds;

        var now = DateTime.UtcNow;
        var totalActiveSessions = 0;
        var activeUsers = 0;

        try
        {
            totalActiveSessions = await _context.UserSessions
                .CountAsync(s => !s.Revoked && s.IdleExpiresAt > now && s.AbsoluteExpiresAt > now, ct);

            activeUsers = await _context.UserSessions
                .Where(s => !s.Revoked && s.IdleExpiresAt > now && s.AbsoluteExpiresAt > now)
                .Select(s => s.UserId)
                .Distinct()
                .CountAsync(ct);
        }
        catch
        {
            // Fallback for mock environments
        }

        var last24h = now.AddHours(-24);
        var auditEvents = 0;
        var incidents = 0;

        try
        {
            auditEvents = await _context.AuditLogs
                .CountAsync(a => a.Timestamp >= last24h, ct);

            incidents = await _context.AuditLogs
                .CountAsync(a => a.Timestamp >= last24h &&
                    (a.Action == "ConcurrentSessionLimitExceeded" ||
                     a.Action == "SecurityVersionInvalidated" ||
                     a.Action == "SuspiciousClientFingerprintDetected"), ct);
        }
        catch
        {
            // Fallback for mock environments
        }

        var process = Process.GetCurrentProcess();
        var uptimeSpan = now - process.StartTime.ToUniversalTime();
        var uptimeStr = $"{(int)uptimeSpan.TotalDays}d {uptimeSpan.Hours}h {uptimeSpan.Minutes}m";
        var memoryMb = Math.Round((double)process.WorkingSet64 / (1024 * 1024), 1);

        var overallStatus = "Healthy";
        if (!dbHealthy || latencyMs > 500)
        {
            overallStatus = "Unhealthy";
        }
        else if (latencyMs > 150 || incidents > 20)
        {
            overallStatus = "Degraded";
        }

        return new OperationalHealthDto
        {
            Status = overallStatus,
            DatabaseLatencyMs = latencyMs,
            DatabaseStatus = dbStatus,
            TotalActiveSessions = totalActiveSessions,
            ActiveUsers = activeUsers,
            ServerUptime = uptimeStr,
            CommittedMemoryMb = memoryMb,
            AuditEventsLast24Hours = auditEvents,
            SecurityIncidentsLast24Hours = incidents,
            CheckedAt = now
        };
    }
}
