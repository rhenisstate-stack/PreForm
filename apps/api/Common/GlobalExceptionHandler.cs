using System.Diagnostics;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Preform.Api.Common;

public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var correlationId = CorrelationIdMiddleware.GetCorrelationId(httpContext);

        _logger.LogError(
            exception,
            "Unhandled exception occurred while processing request {Path} (CorrelationId: {CorrelationId})",
            httpContext.Request.Path,
            correlationId);

        var (statusCode, title, errorCode) = exception switch
        {
            BadHttpRequestException => (StatusCodes.Status400BadRequest, "Bad Request", "BAD_REQUEST"),
            ArgumentException => (StatusCodes.Status400BadRequest, "Invalid Argument", "INVALID_ARGUMENT"),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Unauthorized", "UNAUTHORIZED"),
            InvalidOperationException when exception.Message.Contains("Forbidden", StringComparison.OrdinalIgnoreCase) =>
                (StatusCodes.Status403Forbidden, "Forbidden", "FORBIDDEN"),
            KeyNotFoundException => (StatusCodes.Status404NotFound, "Resource Not Found", "NOT_FOUND"),
            _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred", "INTERNAL_SERVER_ERROR")
        };

        var problemDetails = new ProblemDetails
        {
            Type = $"https://httpstatuses.com/{statusCode}",
            Title = title,
            Status = statusCode,
            Detail = httpContext.RequestServices.GetService<IHostEnvironment>()?.IsDevelopment() == true
                ? exception.Message
                : "An unexpected error occurred while processing your request.",
            Instance = httpContext.Request.Path
        };

        problemDetails.Extensions["traceId"] = correlationId;
        problemDetails.Extensions["errorCode"] = errorCode;
        problemDetails.Extensions["timestamp"] = DateTime.UtcNow;

        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/problem+json";

        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken: cancellationToken);

        return true;
    }
}
