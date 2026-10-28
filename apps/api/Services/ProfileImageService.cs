using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

public class ProfileImageService : IProfileImageService
{
    public const int MaxImageSizeBytes = 2 * 1024 * 1024; // 2 MB
    public const int MinImageSizeBytes = 16;

    private readonly AppDbContext _dbContext;

    public ProfileImageService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public static string? DetectVerifiedImageMimeType(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < MinImageSizeBytes)
        {
            return null;
        }

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (bytes[0] == 0x89 &&
            bytes[1] == 0x50 &&
            bytes[2] == 0x4E &&
            bytes[3] == 0x47 &&
            bytes[4] == 0x0D &&
            bytes[5] == 0x0A &&
            bytes[6] == 0x1A &&
            bytes[7] == 0x0A)
        {
            return "image/png";
        }

        // JPEG: FF D8 FF
        if (bytes[0] == 0xFF &&
            bytes[1] == 0xD8 &&
            bytes[2] == 0xFF)
        {
            return "image/jpeg";
        }

        // GIF: GIF87a or GIF89a
        if (bytes[0] == 0x47 && // 'G'
            bytes[1] == 0x49 && // 'I'
            bytes[2] == 0x46 && // 'F'
            bytes[3] == 0x38 && // '8'
            (bytes[4] == 0x37 || bytes[4] == 0x39) && // '7' or '9'
            bytes[5] == 0x61)   // 'a'
        {
            return "image/gif";
        }

        // WebP: RIFF....WEBP
        if (bytes[0] == 0x52 && // 'R'
            bytes[1] == 0x49 && // 'I'
            bytes[2] == 0x46 && // 'F'
            bytes[3] == 0x46 && // 'F'
            bytes[8] == 0x57 && // 'W'
            bytes[9] == 0x45 && // 'E'
            bytes[10] == 0x42 && // 'B'
            bytes[11] == 0x50)   // 'P'
        {
            return "image/webp";
        }

        return null;
    }

    public async Task<ProfileImageMetadataDto> UpsertProfileImageAsync(
        string authenticatedUserId,
        string authenticatedUserEmail,
        string? displayName,
        byte[] imageBytes,
        string? declaredContentType)
    {
        if (string.IsNullOrWhiteSpace(authenticatedUserId) || string.IsNullOrWhiteSpace(authenticatedUserEmail))
        {
            throw new UnauthorizedAccessException("Authenticated user identity is required.");
        }

        if (imageBytes == null || imageBytes.Length == 0)
        {
            throw new ArgumentException("Image payload cannot be empty.");
        }

        if (imageBytes.Length > MaxImageSizeBytes)
        {
            throw new ArgumentException("Profile image exceeds the maximum allowed size of 2 MB.");
        }

        var verifiedMimeType = DetectVerifiedImageMimeType(imageBytes);
        if (verifiedMimeType == null)
        {
            throw new ArgumentException("Unsupported or malformed image content. Allowed formats: PNG, JPEG, WebP, or GIF.");
        }

        var normalizedEmail = authenticatedUserEmail.Trim().ToLowerInvariant();
        var now = DateTime.UtcNow;
        var hashBytes = SHA256.HashData(imageBytes);
        var sha256Hex = Convert.ToHexString(hashBytes).ToLowerInvariant();

        // Ensure User record exists in Users table without loading any binary blobs
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == authenticatedUserId || u.Email.ToLower() == normalizedEmail);

        if (user == null)
        {
            user = new User
            {
                Id = authenticatedUserId,
                Email = normalizedEmail,
                DisplayName = string.IsNullOrWhiteSpace(displayName) ? "Nursing Candidate" : displayName.Trim(),
                PasswordHash = "session-managed",
                Pathway = "rn",
                IsActive = true,
                HasProfileImage = true,
                ProfileImageUpdatedAt = now,
                CreatedAt = now,
                UpdatedAt = now
            };
            _dbContext.Users.Add(user);
        }
        else
        {
            user.HasProfileImage = true;
            user.ProfileImageUpdatedAt = now;
            user.UpdatedAt = now;
        }

        var existingImage = await _dbContext.UserProfileImages
            .FirstOrDefaultAsync(upi => upi.UserId == user.Id || upi.UserEmail.ToLower() == normalizedEmail);

        if (existingImage == null)
        {
            existingImage = new UserProfileImage
            {
                Id = Guid.NewGuid().ToString(),
                UserId = user.Id,
                UserEmail = normalizedEmail,
                ImageData = imageBytes,
                ContentType = verifiedMimeType,
                SizeBytes = imageBytes.Length,
                Sha256Hash = sha256Hex,
                CreatedAt = now,
                UpdatedAt = now
            };
            _dbContext.UserProfileImages.Add(existingImage);
        }
        else
        {
            existingImage.UserId = user.Id;
            existingImage.UserEmail = normalizedEmail;
            existingImage.ImageData = imageBytes;
            existingImage.ContentType = verifiedMimeType;
            existingImage.SizeBytes = imageBytes.Length;
            existingImage.Sha256Hash = sha256Hex;
            existingImage.UpdatedAt = now;
        }

        _dbContext.AuditLogs.Add(new AuditLog
        {
            ActorId = user.Id,
            Action = "ProfileImageUpdated",
            EntityType = "UserProfileImage",
            EntityId = existingImage.Id,
            Description = $"Updated profile image ({verifiedMimeType}, {imageBytes.Length} bytes)",
            Outcome = "Success",
            Timestamp = now
        });

        await _dbContext.SaveChangesAsync();

        return new ProfileImageMetadataDto
        {
            UserId = user.Id,
            UserEmail = normalizedEmail,
            ContentType = verifiedMimeType,
            SizeBytes = imageBytes.Length,
            Sha256Hash = sha256Hex,
            UpdatedAt = now
        };
    }

    public async Task<ProfileImageBinaryDto?> GetProfileImageAsync(
        string authenticatedUserId,
        string authenticatedUserEmail)
    {
        var normalizedEmail = (authenticatedUserEmail ?? string.Empty).Trim().ToLowerInvariant();

        var record = await _dbContext.UserProfileImages
            .AsNoTracking()
            .Where(upi => upi.UserId == authenticatedUserId || (normalizedEmail != "" && upi.UserEmail.ToLower() == normalizedEmail))
            .Select(upi => new ProfileImageBinaryDto
            {
                ImageData = upi.ImageData,
                ContentType = upi.ContentType,
                SizeBytes = upi.SizeBytes,
                Sha256Hash = upi.Sha256Hash,
                UpdatedAt = upi.UpdatedAt
            })
            .FirstOrDefaultAsync();

        return record;
    }

    public async Task<bool> DeleteProfileImageAsync(
        string authenticatedUserId,
        string authenticatedUserEmail)
    {
        var normalizedEmail = (authenticatedUserEmail ?? string.Empty).Trim().ToLowerInvariant();

        var existingImage = await _dbContext.UserProfileImages
            .FirstOrDefaultAsync(upi => upi.UserId == authenticatedUserId || (normalizedEmail != "" && upi.UserEmail.ToLower() == normalizedEmail));

        if (existingImage == null)
        {
            return false;
        }

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == existingImage.UserId || (normalizedEmail != "" && u.Email.ToLower() == normalizedEmail));

        if (user != null)
        {
            user.HasProfileImage = false;
            user.ProfileImageUpdatedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
        }

        _dbContext.UserProfileImages.Remove(existingImage);
        await _dbContext.SaveChangesAsync();
        return true;
    }
}
