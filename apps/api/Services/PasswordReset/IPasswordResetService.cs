namespace Preform.Api.Services.PasswordReset;

public class PasswordResetRequestResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class ValidateResetTokenResult
{
    public bool IsValid { get; set; }
    public string? MaskedEmail { get; set; }
    public string? Error { get; set; }
}

public class PasswordResetResult
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public string? ErrorCode { get; set; }
}

public interface IPasswordResetService
{
    Task<PasswordResetRequestResult> RequestPasswordResetAsync(
        string email,
        string? ipAddress = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default);

    Task<ValidateResetTokenResult> ValidateResetTokenAsync(
        string token,
        CancellationToken cancellationToken = default);

    Task<PasswordResetResult> ResetPasswordAsync(
        string token,
        string newPassword,
        string? ipAddress = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default);
}
