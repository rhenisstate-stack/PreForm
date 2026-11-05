namespace Preform.Api.Services.Email;

public interface IEmailSender
{
    Task SendPasswordResetEmailAsync(string toEmail, string resetLink, CancellationToken cancellationToken = default);
}
