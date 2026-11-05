using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Preform.Api.Services.Security;

namespace Preform.Api.Common;

public class IpFilteringMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<IpFilteringMiddleware> _logger;

    public IpFilteringMiddleware(RequestDelegate next, ILogger<IpFilteringMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IIpAccessService ipAccessService)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        // Skip IP filtering for health checks and swagger docs
        if (path.StartsWith("/api/v1/health") || path.StartsWith("/swagger"))
        {
            await _next(context);
            return;
        }

        var clientIp = context.Connection.RemoteIpAddress?.ToString();

        if (!string.IsNullOrWhiteSpace(clientIp))
        {
            var isBlocked = await ipAccessService.IsIpBlockedAsync(clientIp, context.RequestAborted);
            if (isBlocked)
            {
                var correlationId = CorrelationIdMiddleware.GetCorrelationId(context);
                _logger.LogWarning("Request blocked by IP access rule: IP {ClientIp} on path {Path} (CorrelationId: {CorrelationId})",
                    clientIp, path, correlationId);

                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/problem+json";

                var problemDetails = new ProblemDetails
                {
                    Type = "https://httpstatuses.com/403",
                    Title = "Access Denied",
                    Status = StatusCodes.Status403Forbidden,
                    Detail = "Access from your IP address has been restricted by administrative policy.",
                    Instance = path
                };

                problemDetails.Extensions["errorCode"] = "IP_ADDRESS_BLOCKED";
                problemDetails.Extensions["traceId"] = correlationId;
                problemDetails.Extensions["timestamp"] = DateTime.UtcNow;

                await context.Response.WriteAsJsonAsync(problemDetails, cancellationToken: context.RequestAborted);
                return;
            }
        }

        await _next(context);
    }
}
