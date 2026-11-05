using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Preform.Api.Common;

public class CorrelationIdMiddleware
{
    public const string HeaderName = "X-Correlation-ID";
    public const string ContextItemKey = "CorrelationId";
    private static readonly Regex SafeIdRegex = new(@"^[a-zA-Z0-9_\-\.]{1,128}$", RegexOptions.Compiled);

    private readonly RequestDelegate _next;
    private readonly ILogger<CorrelationIdMiddleware> _logger;

    public CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = ResolveCorrelationId(context);

        context.Items[ContextItemKey] = correlationId;
        context.TraceIdentifier = correlationId;

        // Ensure outgoing response carries the correlation ID header
        context.Response.OnStarting(() =>
        {
            if (!context.Response.Headers.ContainsKey(HeaderName))
            {
                context.Response.Headers[HeaderName] = correlationId;
            }
            return Task.CompletedTask;
        });

        using (_logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId,
            ["TraceIdentifier"] = correlationId
        }))
        {
            await _next(context);
        }
    }

    private static string ResolveCorrelationId(HttpContext context)
    {
        if (context.Request.Headers.TryGetValue(HeaderName, out var headerValues) && headerValues.Count > 0)
        {
            var raw = headerValues[0]?.Trim();
            if (!string.IsNullOrEmpty(raw) && SafeIdRegex.IsMatch(raw))
            {
                return raw;
            }
        }

        // Fallback check for alternate casing
        if (context.Request.Headers.TryGetValue("X-Correlation-Id", out var altValues) && altValues.Count > 0)
        {
            var raw = altValues[0]?.Trim();
            if (!string.IsNullOrEmpty(raw) && SafeIdRegex.IsMatch(raw))
            {
                return raw;
            }
        }

        return $"corr_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid():N}";
    }

    public static string GetCorrelationId(HttpContext context)
    {
        if (context.Items.TryGetValue(ContextItemKey, out var id) && id is string str && !string.IsNullOrEmpty(str))
        {
            return str;
        }
        return context.TraceIdentifier;
    }
}
