using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/questions")]
public class QuestionMediaController : ControllerBase
{
    private readonly IQuestionMediaService _mediaService;
    private readonly ILogger<QuestionMediaController> _logger;

    public QuestionMediaController(IQuestionMediaService mediaService, ILogger<QuestionMediaController> logger)
    {
        _mediaService = mediaService;
        _logger = logger;
    }

    [HttpPost("media")]
    [HttpPost("{questionId}/media")]
    [Authorize(Policy = "Permission:content.create")]
    [RequestSizeLimit(6 * 1024 * 1024)] // 6 MB limit to accommodate 5 MB payload + multipart overhead
    public async Task<IActionResult> UploadMedia(
        [FromRoute] string? questionId = null,
        [FromForm] string? fieldKey = null,
        IFormFile? file = null,
        CancellationToken ct = default)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new ProblemDetails
            {
                Status = 400,
                Title = "Missing File",
                Detail = "Please provide a valid image file in form-data."
            });
        }

        if (file.Length > QuestionMediaService.MaxImageSizeBytes)
        {
            return BadRequest(new ProblemDetails
            {
                Status = 400,
                Title = "File Too Large",
                Detail = $"Image exceeds the maximum allowed size of 5 MB ({QuestionMediaService.MaxImageSizeBytes} bytes). Uploaded: {file.Length} bytes."
            });
        }

        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream, ct);
        var bytes = memoryStream.ToArray();

        var authorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";

        try
        {
            var media = await _mediaService.UploadQuestionMediaAsync(
                questionId,
                fieldKey,
                file.FileName,
                bytes,
                file.ContentType,
                authorId,
                ct);

            return Created(media.Url, new QuestionMediaUploadResponse { Success = true, Media = media });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Status = 400,
                Title = "Invalid Media",
                Detail = ex.Message
            });
        }
    }

    [HttpGet("media/{mediaId}")]
    [HttpGet("{questionId}/media/{mediaId}")]
    [Authorize] // Accessible to authenticated candidates and admins
    public async Task<IActionResult> GetMedia(string mediaId, CancellationToken ct = default)
    {
        var media = await _mediaService.GetQuestionMediaByIdAsync(mediaId, ct);
        if (media == null)
        {
            return NotFound(new ProblemDetails
            {
                Status = 404,
                Title = "Media Not Found",
                Detail = $"Question media '{mediaId}' was not found."
            });
        }

        var etag = $"\"{media.Sha256Hash}\"";
        if (Request.Headers.IfNoneMatch.Contains(etag))
        {
            return StatusCode(StatusCodes.Status304NotModified);
        }

        Response.Headers.ETag = etag;
        Response.Headers.CacheControl = "public, max-age=86400, must-revalidate";
        Response.Headers["X-Content-Type-Options"] = "nosniff";

        return File(media.ImageData, media.ContentType);
    }

    [HttpDelete("media/{mediaId}")]
    [HttpDelete("{questionId}/media/{mediaId}")]
    [Authorize(Policy = "Permission:content.edit")]
    public async Task<IActionResult> DeleteMedia(string mediaId, CancellationToken ct = default)
    {
        var editorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";
        var deleted = await _mediaService.DeleteQuestionMediaAsync(mediaId, editorId, ct);
        if (!deleted)
        {
            return NotFound(new ProblemDetails
            {
                Status = 404,
                Title = "Media Not Found",
                Detail = $"Question media '{mediaId}' was not found."
            });
        }

        return Ok(new { success = true, message = "Question media removed successfully." });
    }

    [HttpGet("{questionId}/media")]
    [Authorize(Policy = "Permission:content.view")]
    public async Task<IActionResult> ListQuestionMedia(string questionId, CancellationToken ct = default)
    {
        var list = await _mediaService.GetMediaForQuestionAsync(questionId, ct);
        return Ok(new { success = true, media = list });
    }
}
