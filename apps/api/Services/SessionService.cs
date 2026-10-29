using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.Models;

namespace Preform.Api.Services;

public interface ISessionService
{
    Task<(string Token, UserSession Session)> CreateSessionAsync(User user, string role, bool rememberMe, CancellationToken cancellationToken = default);
    Task<UserSession?> ValidateTokenAsync(string token, CancellationToken cancellationToken = default);
    Task<bool> RevokeSessionAsync(string sessionId, CancellationToken cancellationToken = default);
    Task<int> RevokeAllUserSessionsAsync(string userId, CancellationToken cancellationToken = default);
}

public class SessionService : ISessionService
{
    private readonly AppDbContext _dbContext;

    public SessionService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public static string ComputeTokenHash(string token)
    {
        var bytes = Encoding.UTF8.GetBytes(token.Trim());
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public async Task<(string Token, UserSession Session)> CreateSessionAsync(
        User user,
        string role,
        bool rememberMe,
        CancellationToken cancellationToken = default)
    {
        var rawTokenBytes = RandomNumberGenerator.GetBytes(32);
        var token = "prf_sess_" + Convert.ToHexString(rawTokenBytes).ToLowerInvariant();
        var tokenHash = ComputeTokenHash(token);
        var csrfToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();

        var now = DateTime.UtcNow;
        var expiresAt = rememberMe ? now.AddDays(30) : now.AddDays(7);
        var effectiveRole = string.IsNullOrWhiteSpace(role) ? "candidate" : role.Trim().ToLowerInvariant();

        var session = new UserSession
        {
            Id = "sess_" + Guid.NewGuid().ToString("N"),
            UserId = user.Id,
            Email = user.Email.Trim().ToLowerInvariant(),
            Role = effectiveRole,
            DisplayName = user.DisplayName,
            TokenHash = tokenHash,
            CsrfToken = csrfToken,
            CreatedAt = now,
            ExpiresAt = expiresAt,
            LastActiveAt = now,
            Revoked = false
        };

        _dbContext.UserSessions.Add(session);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return (token, session);
    }

    public async Task<UserSession?> ValidateTokenAsync(string token, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        var tokenHash = ComputeTokenHash(token);
        var now = DateTime.UtcNow;

        var session = await _dbContext.UserSessions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.TokenHash == tokenHash && !s.Revoked && s.ExpiresAt > now, cancellationToken);

        if (session != null)
        {
            session.LastActiveAt = now;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return session;
    }

    public async Task<bool> RevokeSessionAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(sessionId)) return false;

        var session = await _dbContext.UserSessions.FindAsync(new object[] { sessionId }, cancellationToken);
        if (session == null || session.Revoked) return false;

        session.Revoked = true;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<int> RevokeAllUserSessionsAsync(string userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId)) return 0;

        var activeSessions = await _dbContext.UserSessions
            .Where(s => s.UserId == userId && !s.Revoked)
            .ToListAsync(cancellationToken);

        if (activeSessions.Count == 0) return 0;

        foreach (var session in activeSessions)
        {
            session.Revoked = true;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return activeSessions.Count;
    }
}
