using Preform.Api.Models;

namespace Preform.Api.Services;

public class SessionCreationResult
{
    public bool Success { get; set; }
    public string? Token { get; set; }
    public UserSession? Session { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }

    public static SessionCreationResult Ok(string token, UserSession session) => new()
    {
        Success = true,
        Token = token,
        Session = session
    };

    public static SessionCreationResult Rejected(string errorCode, string errorMessage) => new()
    {
        Success = false,
        ErrorCode = errorCode,
        ErrorMessage = errorMessage
    };
}

public class SessionValidationResult
{
    public bool IsValid { get; set; }
    public UserSession? Session { get; set; }
    public DateTime? EffectiveExpiry { get; set; }
    public string? FailureReason { get; set; }
    public string? FailureCode { get; set; }

    public static SessionValidationResult Valid(UserSession session, DateTime effectiveExpiry) => new()
    {
        IsValid = true,
        Session = session,
        EffectiveExpiry = effectiveExpiry
    };

    public static SessionValidationResult Fail(string failureCode, string failureReason) => new()
    {
        IsValid = false,
        FailureCode = failureCode,
        FailureReason = failureReason
    };
}

public interface ISessionSecurityService
{
    Task<SessionSecurityPolicy> GetActivePolicyAsync(CancellationToken cancellationToken = default);

    Task<SessionCreationResult> CreateOrRotateSessionAsync(
        User user,
        string role,
        string? clientId,
        string? ipAddress,
        string? userAgent,
        string? fingerprintHash,
        bool rememberMe,
        CancellationToken cancellationToken = default);

    Task<SessionValidationResult> ValidateSessionAsync(
        string tokenOrSessionId,
        bool isToken,
        string? ipAddress = null,
        string? userAgent = null,
        string? fingerprintHash = null,
        bool isQualifyingActivity = true,
        CancellationToken cancellationToken = default);

    Task<bool> RevokeSessionAsync(
        string sessionId,
        string reason,
        string actorUserId,
        CancellationToken cancellationToken = default);

    Task<int> RevokeOtherSessionsAsync(
        string userId,
        string currentSessionId,
        string actorUserId,
        CancellationToken cancellationToken = default);

    Task<int> RevokeAllUserSessionsAsync(
        string userId,
        string reason,
        string actorUserId,
        CancellationToken cancellationToken = default);

    Task InvalidateUserSecurityVersionAsync(
        string userId,
        string reason,
        CancellationToken cancellationToken = default);

    Task<List<UserSession>> GetActiveSessionsForUserAsync(
        string userId,
        CancellationToken cancellationToken = default);
}
