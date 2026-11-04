using System.Security.Cryptography;
using System.Text;
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
    private readonly ISessionSecurityService _sessionSecurityService;

    public SessionService(ISessionSecurityService sessionSecurityService)
    {
        _sessionSecurityService = sessionSecurityService;
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
        var result = await _sessionSecurityService.CreateOrRotateSessionAsync(
            user,
            role,
            clientId: null,
            ipAddress: null,
            userAgent: null,
            fingerprintHash: null,
            rememberMe: rememberMe,
            cancellationToken: cancellationToken);

        if (!result.Success || result.Session == null || result.Token == null)
        {
            throw new InvalidOperationException(result.ErrorMessage ?? "Unable to create user session.");
        }

        return (result.Token, result.Session);
    }

    public async Task<UserSession?> ValidateTokenAsync(string token, CancellationToken cancellationToken = default)
    {
        var result = await _sessionSecurityService.ValidateSessionAsync(
            token,
            isToken: true,
            isQualifyingActivity: true,
            cancellationToken: cancellationToken);

        return result.IsValid ? result.Session : null;
    }

    public async Task<bool> RevokeSessionAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        return await _sessionSecurityService.RevokeSessionAsync(
            sessionId,
            reason: "UserLogout",
            actorUserId: "system",
            cancellationToken: cancellationToken);
    }

    public async Task<int> RevokeAllUserSessionsAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await _sessionSecurityService.RevokeAllUserSessionsAsync(
            userId,
            reason: "RevokeAll",
            actorUserId: "system",
            cancellationToken: cancellationToken);
    }
}
