using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Formatters;

namespace Preform.Api.Formatters;

/// <summary>
/// A JSON output formatter that serializes directly to the response body stream.
/// This prevents PipeWriter.UnflushedBytes incompatibility when running net8.0 TestHost
/// on modern .NET 9+ runtimes while maintaining identical JSON formatting.
/// </summary>
public class StreamJsonOutputFormatter : TextOutputFormatter
{
    private static readonly JsonSerializerOptions DefaultOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public StreamJsonOutputFormatter()
    {
        SupportedMediaTypes.Add("application/json");
        SupportedMediaTypes.Add("text/json");
        SupportedEncodings.Add(Encoding.UTF8);
    }

    public override bool CanWriteResult(OutputFormatterCanWriteContext context)
    {
        return true;
    }

    public override async Task WriteResponseBodyAsync(OutputFormatterWriteContext context, Encoding selectedEncoding)
    {
        if (context.Object is null)
        {
            return;
        }

        var response = context.HttpContext.Response;
        var objectType = context.ObjectType ?? context.Object.GetType();
        await JsonSerializer.SerializeAsync(response.Body, context.Object, objectType, DefaultOptions);
    }
}
