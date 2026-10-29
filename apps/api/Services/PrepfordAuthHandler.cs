using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Preform.Api.Data;

namespace Preform.Api.Services;

public class PrepfordAuthSchemeOptions : AuthenticationSchemeOptions
{
    public const string SchemeName = "PrepfordAuth";
}

public interface IGatewayReplayProtection
{
    bool TryRecordNonce(string nonce, long timestampSeconds);
    void ResetForTesting();
}

public class GatewayReplayProtection : IGatewayReplayProtection
{
    private readonly System.Collections.Concurrent.ConcurrentDictionary<string, long> _seenNonces = new();

    public bool TryRecordNonce(string nonce, long timestampSeconds)
    {
        if (string.IsNullOrWhiteSpace(nonce)) return false;

        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        // Prune expired nonces (> 120s old) periodically
        if (_seenNonces.Count > 500)
        {
            foreach (var entry in _seenNonces)
            {
                if (now - entry.Value > 120)
                {
                    _seenNonces.TryRemove(entry.Key, out _);
                }
            }
        }

        return _seenNonces.TryAdd(nonce.Trim(), timestampSeconds);
    }

    public void ResetForTesting()
    {
        _seenNonces.Clear();
    }
}

public class PrepfordAuthHandler : AuthenticationHandler<PrepfordAuthSchemeOptions>
{
    private readonly ISessionService _sessionService;
    private readonly IConfiguration _configuration;
    private readonly IGatewayReplayProtection _replayProtection;
    private readonly IHostEnvironment _hostEnvironment;
    private readonly IServiceProvider _serviceProvider;

    public const string EmptyBodySha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    public PrepfordAuthHandler(
        IOptionsMonitor<PrepfordAuthSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        ISessionService sessionService,
        IConfiguration configuration,
        IGatewayReplayProtection replayProtection,
        IHostEnvironment hostEnvironment,
        IServiceProvider serviceProvider)
        : base(options, logger, encoder)
    {
        _sessionService = sessionService;
        _configuration = configuration;
        _replayProtection = replayProtection;
        _hostEnvironment = hostEnvironment;
        _serviceProvider = serviceProvider;
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
                if (session != null && session.User != null && session.User.IsActive && !session.Revoked)
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
        var timestampStr = Request.Headers["X-Gateway-Timestamp"].FirstOrDefault();
        var nonce = Request.Headers["X-Gateway-Nonce"].FirstOrDefault();
        var bodySha256Header = Request.Headers["X-Gateway-Content-SHA256"].FirstOrDefault();
        var version = Request.Headers["X-Gateway-Signature-Version"].FirstOrDefault();
        var sessionId = Request.Headers["X-Session-Id"].FirstOrDefault();

        if (!string.IsNullOrWhiteSpace(gatewaySignature) &&
            !string.IsNullOrWhiteSpace(gatewayUserId) &&
            !string.IsNullOrWhiteSpace(gatewayEmail))
        {
            var gatewaySecret = _configuration["GATEWAY_SHARED_SECRET"] ?? "prepford-default-internal-gateway-secret-32-chars!";
            var isCanonicalV1 = string.Equals(version, "1", StringComparison.Ordinal) ||
                                (!string.IsNullOrWhiteSpace(timestampStr) && !string.IsNullOrWhiteSpace(nonce));

            if (isCanonicalV1)
            {
                // Validate timestamp
                if (!long.TryParse(timestampStr, out var timestampSeconds))
                {
                    return AuthenticateResult.Fail("Malformed gateway timestamp.");
                }

                var nowSeconds = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                if (Math.Abs(nowSeconds - timestampSeconds) > 60)
                {
                    return AuthenticateResult.Fail("Gateway request timestamp has expired or exceeds allowable clock skew window.");
                }

                // Validate request nonce for replay prevention
                if (string.IsNullOrWhiteSpace(nonce) || !_replayProtection.TryRecordNonce(nonce, timestampSeconds))
                {
                    return AuthenticateResult.Fail("Gateway request nonce has already been seen or is invalid.");
                }

                // Canonical HTTP method & request path
                var method = Request.Method.ToUpperInvariant();
                var path = Request.Path.Value ?? "/";
                if (string.IsNullOrWhiteSpace(path)) path = "/";

                var bodyHash = !string.IsNullOrWhiteSpace(bodySha256Header)
                    ? bodySha256Header.Trim().ToLowerInvariant()
                    : EmptyBodySha256;

                // Canonical payload: timestamp\nmethod\npath\nnonce\nbodyHash\nuserId\nemail\nrole
                var canonicalPayload = $"{timestampSeconds}\n{method}\n{path}\n{nonce.Trim()}\n{bodyHash}\n{gatewayUserId.Trim()}\n{gatewayEmail.Trim().ToLowerInvariant()}\n{gatewayRole.Trim().ToLowerInvariant()}";

                var expectedSignature = Convert.ToHexString(
                    HMACSHA256.HashData(Encoding.UTF8.GetBytes(gatewaySecret), Encoding.UTF8.GetBytes(canonicalPayload))
                ).ToLowerInvariant();

                var sigBytes = Encoding.UTF8.GetBytes(gatewaySignature.Trim().ToLowerInvariant());
                var expectedBytes = Encoding.UTF8.GetBytes(expectedSignature);

                if (sigBytes.Length != expectedBytes.Length || !CryptographicOperations.FixedTimeEquals(sigBytes, expectedBytes))
                {
                    return AuthenticateResult.Fail("Invalid gateway HMAC signature.");
                }
            }
            else
            {
                // In production, reject legacy signatures without timestamp and nonce
                if (!_hostEnvironment.IsDevelopment() && !_hostEnvironment.IsEnvironment("Testing"))
                {
                    return AuthenticateResult.Fail("Legacy gateway signature format is prohibited in production.");
                }

                var payloadToSign = $"{gatewayUserId}|{gatewayEmail}|{gatewayRole}";
                var expectedSignature = Convert.ToHexString(
                    HMACSHA256.HashData(Encoding.UTF8.GetBytes(gatewaySecret), Encoding.UTF8.GetBytes(payloadToSign))
                ).ToLowerInvariant();

                var sigBytes = Encoding.UTF8.GetBytes(gatewaySignature.Trim().ToLowerInvariant());
                var expectedBytes = Encoding.UTF8.GetBytes(expectedSignature);

                if (sigBytes.Length != expectedBytes.Length || !CryptographicOperations.FixedTimeEquals(sigBytes, expectedBytes))
                {
                    return AuthenticateResult.Fail("Invalid gateway HMAC signature.");
                }
            }

            // Enforce PostgreSQL session revocation check if session ID is provided
            if (!string.IsNullOrWhiteSpace(sessionId))
            {
                using var scope = _serviceProvider.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var sessionRecord = await db.UserSessions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == sessionId);
                if (sessionRecord != null && (sessionRecord.Revoked || sessionRecord.ExpiresAt <= DateTime.UtcNow))
                {
                    return AuthenticateResult.Fail("Authoritative session has been revoked or expired in datastore.");
                }
            }

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, gatewayUserId.Trim()),
                new Claim(ClaimTypes.Email, gatewayEmail.Trim().ToLowerInvariant()),
                new Claim(ClaimTypes.Role, gatewayRole.Trim().ToLowerInvariant()),
                new Claim(ClaimTypes.Name, gatewayName.Trim()),
                new Claim("authSource", "gateway")
            };

            if (!string.IsNullOrWhiteSpace(sessionId))
            {
                claims.Add(new Claim("sessionId", sessionId.Trim()));
            }

            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);

            return AuthenticateResult.Success(ticket);
        }

        return AuthenticateResult.NoResult();
    }
}
