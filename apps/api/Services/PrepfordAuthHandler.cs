using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Preform.Api.Services;

public class PrepfordAuthSchemeOptions : AuthenticationSchemeOptions
{
    public const string SchemeName = "PrepfordAuth";
}

public class PrepfordAuthHandler : AuthenticationHandler<PrepfordAuthSchemeOptions>
{
    private readonly ISessionService _sessionService;
    private readonly IConfiguration _configuration;

    public PrepfordAuthHandler(
        IOptionsMonitor<PrepfordAuthSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        ISessionService sessionService,
        IConfiguration configuration)
        : base(options, logger, encoder)
    {
        _sessionService = sessionService;
        _configuration = configuration;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // 1. First Priority: Check Authorization header for Bearer Session Token
        var authHeader = Request.Headers.Authorization.FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = authHeader.Substring(7).Trim();
            if (!string.IsNullOrWhiteSpace(token))
            {
                var session = await _sessionService.ValidateTokenAsync(token);
                if (session != null && session.User != null && session.User.IsActive)
                {
                    var claims = new List<Claim>
                    {
                        new Claim(ClaimTypes.NameIdentifier, session.UserId),
                        new Claim(ClaimTypes.Email, session.Email),
                        new Claim(ClaimTypes.Role, session.Role),
                        new Claim(ClaimTypes.Name, session.DisplayName),
                        new Claim("sessionId", session.Id),
                        new Claim("csrfToken", session.CsrfToken)
                    };

                    var identity = new ClaimsIdentity(claims, Scheme.Name);
                    var principal = new ClaimsPrincipal(identity);
                    var ticket = new AuthenticationTicket(principal, Scheme.Name);

                    return AuthenticateResult.Success(ticket);
                }
            }
        }

        // 2. Second Priority: Mutual Gateway Authentication with HMAC signature verification
        var gatewaySignature = Request.Headers["X-Gateway-Signature"].FirstOrDefault();
        var gatewayUserId = Request.Headers["X-Authenticated-User-Id"].FirstOrDefault();
        var gatewayEmail = Request.Headers["X-Authenticated-User-Email"].FirstOrDefault();
        var gatewayRole = Request.Headers["X-Authenticated-User-Role"].FirstOrDefault() ?? "candidate";
        var gatewayName = Request.Headers["X-Authenticated-User-Name"].FirstOrDefault() ?? "Nursing Candidate";

        if (!string.IsNullOrWhiteSpace(gatewaySignature) &&
            !string.IsNullOrWhiteSpace(gatewayUserId) &&
            !string.IsNullOrWhiteSpace(gatewayEmail))
        {
            var gatewaySecret = _configuration["GATEWAY_SHARED_SECRET"] ?? "prepford-default-internal-gateway-secret-32-chars!";
            var payloadToSign = $"{gatewayUserId}|{gatewayEmail}|{gatewayRole}";
            var expectedSignature = Convert.ToHexString(
                HMACSHA256.HashData(Encoding.UTF8.GetBytes(gatewaySecret), Encoding.UTF8.GetBytes(payloadToSign))
            ).ToLowerInvariant();

            if (string.Equals(gatewaySignature.Trim(), expectedSignature, StringComparison.OrdinalIgnoreCase))
            {
                var claims = new List<Claim>
                {
                    new Claim(ClaimTypes.NameIdentifier, gatewayUserId.Trim()),
                    new Claim(ClaimTypes.Email, gatewayEmail.Trim().ToLowerInvariant()),
                    new Claim(ClaimTypes.Role, gatewayRole.Trim().ToLowerInvariant()),
                    new Claim(ClaimTypes.Name, gatewayName.Trim()),
                    new Claim("authSource", "gateway")
                };

                var identity = new ClaimsIdentity(claims, Scheme.Name);
                var principal = new ClaimsPrincipal(identity);
                var ticket = new AuthenticationTicket(principal, Scheme.Name);

                return AuthenticateResult.Success(ticket);
            }
        }

        return AuthenticateResult.NoResult();
    }
}
