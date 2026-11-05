using Microsoft.Extensions.Logging;

namespace Preform.Api.Services.Email;

public class DevelopmentEmailSender : IEmailSender
{
    private readonly ILogger<DevelopmentEmailSender> _logger;

    // Public hook for tests to inspect the latest sent reset link without mock frameworks
    public static string? LastSentEmail { get; set; }
    public static string? LastSentResetLink { get; set; }

    public DevelopmentEmailSender(ILogger<DevelopmentEmailSender> logger)
    {
        _logger = logger;
    }

    public Task SendPasswordResetEmailAsync(string toEmail, string resetLink, CancellationToken cancellationToken = default)
    {
        LastSentEmail = toEmail;
        LastSentResetLink = resetLink;
        _logger.LogInformation("Password reset email sent to {Email}. Reset Link: {ResetLink}", toEmail, resetLink);
        return Task.CompletedTask;
    }
}
