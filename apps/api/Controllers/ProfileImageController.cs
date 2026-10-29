using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/profile/image")]
public class ProfileImageController : ControllerBase
{
    private readonly IProfileImageService _profileImageService;

    public ProfileImageController(IProfileImageService profileImageService)
    {
        _profileImageService = profileImageService;
    }

    private (string? userId, string? email, string? displayName) ResolveAuthenticatedUser()
    {
        // 1. Claims from verified Bearer token or Gateway HMAC
        var claimUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var claimEmail = User.FindFirst(ClaimTypes.Email)?.Value;
        var claimName = User.FindFirst(ClaimTypes.Name)?.Value;

        if (!string.IsNullOrWhiteSpace(claimUserId) && !string.IsNullOrWhiteSpace(claimEmail))
        {
            return (claimUserId.Trim(), claimEmail.Trim(), claimName);
        }

        // 2. Direct headers for test runner backwards compatibility
        var headerUserId = Request.Headers["X-Authenticated-User-Id"].FirstOrDefault();
        var headerEmail = Request.Headers["X-Authenticated-User-Email"].FirstOrDefault();
        var headerName = Request.Headers["X-Authenticated-User-Name"].FirstOrDefault();

        if (!string.IsNullOrWhiteSpace(headerUserId) && !string.IsNullOrWhiteSpace(headerEmail))
        {
            return (headerUserId.Trim(), headerEmail.Trim(), headerName);
        }

        return (null, null, null);
    }

    [HttpGet]
    public async Task<IActionResult> GetOwnProfileImage([FromQuery] string? userId = null)
    {
        var auth = ResolveAuthenticatedUser();
        if (string.IsNullOrWhiteSpace(auth.userId) || string.IsNullOrWhiteSpace(auth.email))
        {
            return Unauthorized(new { success = false, error = "Authentication is required to access profile media." });
        }

        // Ownership enforcement: never allow querying another user's private image data
        if (!string.IsNullOrWhiteSpace(userId) && !string.Equals(userId, auth.userId, StringComparison.Ordinal))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "You are not authorized to access another user's profile image." });
        }

        var image = await _profileImageService.GetProfileImageAsync(auth.userId, auth.email);
        if (image == null || image.ImageData.Length == 0)
        {
            return NotFound(new { success = false, error = "No profile image found." });
        }

        var etag = $"\"{image.Sha256Hash}\"";
        if (Request.Headers.IfNoneMatch.Contains(etag))
        {
            return StatusCode(StatusCodes.Status304NotModified);
        }

        Response.Headers.ETag = etag;
        Response.Headers.CacheControl = "private, max-age=0, must-revalidate";

        return File(image.ImageData, image.ContentType);
    }

    [HttpPut]
    [HttpPost]
    [RequestSizeLimit(3 * 1024 * 1024)]
    public async Task<IActionResult> UploadOwnProfileImage([FromQuery] string? targetUserId = null)
    {
        var auth = ResolveAuthenticatedUser();
        if (string.IsNullOrWhiteSpace(auth.userId) || string.IsNullOrWhiteSpace(auth.email))
        {
            return Unauthorized(new { success = false, error = "Authentication is required to upload a profile image." });
        }

        // Ownership enforcement: reject any attempt to modify another user's profile image
        var headerTargetUser = Request.Headers["X-Target-User-Id"].FirstOrDefault() ?? targetUserId;
        if (!string.IsNullOrWhiteSpace(headerTargetUser) && !string.Equals(headerTargetUser, auth.userId, StringComparison.Ordinal))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "Forbidden: cannot modify another user's profile image." });
        }

        byte[] imageBytes;
        string? declaredContentType = Request.ContentType;

        if (Request.HasFormContentType)
        {
            var form = await Request.ReadFormAsync();
            var formUserId = form["userId"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(formUserId) && !string.Equals(formUserId, auth.userId, StringComparison.Ordinal))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "Forbidden: cannot modify another user's profile image." });
            }

            var file = form.Files.GetFile("file") ?? form.Files.FirstOrDefault();
            if (file == null)
            {
                return BadRequest(new { success = false, error = "No image file provided." });
            }

            if (file.Length > ProfileImageService.MaxImageSizeBytes)
            {
                return BadRequest(new { success = false, error = "Profile image exceeds the maximum allowed size of 2 MB." });
            }

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            imageBytes = ms.ToArray();
            declaredContentType = file.ContentType;
        }
        else
        {
            using var ms = new MemoryStream();
            await Request.Body.CopyToAsync(ms);
            imageBytes = ms.ToArray();
        }

        try
        {
            var metadata = await _profileImageService.UpsertProfileImageAsync(
                auth.userId,
                auth.email,
                auth.displayName,
                imageBytes,
                declaredContentType);

            return Ok(new
            {
                success = true,
                image = new
                {
                    contentType = metadata.ContentType,
                    sizeBytes = metadata.SizeBytes,
                    sha256Hash = metadata.Sha256Hash,
                    updatedAt = metadata.UpdatedAt
                }
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, error = ex.Message });
        }
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteOwnProfileImage([FromQuery] string? userId = null)
    {
        var auth = ResolveAuthenticatedUser();
        if (string.IsNullOrWhiteSpace(auth.userId) || string.IsNullOrWhiteSpace(auth.email))
        {
            return Unauthorized(new { success = false, error = "Authentication is required to delete a profile image." });
        }

        // Ownership enforcement: reject attempt to delete another user's profile image
        if (!string.IsNullOrWhiteSpace(userId) && !string.Equals(userId, auth.userId, StringComparison.Ordinal))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, error = "Forbidden: cannot delete another user's profile image." });
        }

        var deleted = await _profileImageService.DeleteProfileImageAsync(auth.userId, auth.email);
        if (!deleted)
        {
            return NotFound(new { success = false, error = "No profile image found to delete." });
        }

        return Ok(new { success = true, message = "Profile image deleted successfully." });
    }
}
