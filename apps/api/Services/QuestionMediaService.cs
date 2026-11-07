using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

public class QuestionMediaService : IQuestionMediaService
{
    public const int MaxImageSizeBytes = 5 * 1024 * 1024; // 5 MB = 5,242,880 bytes
    public const int MinImageSizeBytes = 16;

    private readonly AppDbContext _dbContext;
    private readonly ILogger<QuestionMediaService> _logger;

    public QuestionMediaService(AppDbContext dbContext, ILogger<QuestionMediaService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
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
            bytes.Length >= 12 &&
            bytes[8] == 0x57 && // 'W'
            bytes[9] == 0x45 && // 'E'
            bytes[10] == 0x42 && // 'B'
            bytes[11] == 0x50)   // 'P'
        {
            return "image/webp";
        }

        return null;
    }

    public async Task<QuestionMediaDto> UploadQuestionMediaAsync(
        string? questionId,
        string? fieldKey,
        string? fileName,
        byte[] imageBytes,
        string? declaredContentType,
        string? authorId,
        CancellationToken ct = default)
    {
        if (imageBytes == null || imageBytes.Length == 0)
        {
            throw new ArgumentException("Image payload cannot be empty.");
        }

        if (imageBytes.Length > MaxImageSizeBytes)
        {
            throw new ArgumentException($"Image exceeds the maximum allowed size of 5 MB ({MaxImageSizeBytes} bytes). Provided: {imageBytes.Length} bytes.");
        }

        var verifiedMimeType = DetectVerifiedImageMimeType(imageBytes);
        if (verifiedMimeType == null)
        {
            throw new ArgumentException("Unsupported or malformed image content. Allowed formats: PNG, JPEG, WebP, or GIF.");
        }

        var hashBytes = SHA256.HashData(imageBytes);
        var sha256Hex = Convert.ToHexString(hashBytes).ToLowerInvariant();
        var now = DateTime.UtcNow;

        string? validQuestionId = null;
        if (!string.IsNullOrWhiteSpace(questionId))
        {
            var questionExists = await _dbContext.Questions.AnyAsync(q => q.Id == questionId, ct);
            if (questionExists)
            {
                validQuestionId = questionId;
            }
        }

        // Check if an existing QuestionMedia with the same SHA256 hash, questionId, and fieldKey already exists
        var existing = await _dbContext.QuestionMedia
            .FirstOrDefaultAsync(m => m.Sha256Hash == sha256Hex && m.QuestionId == validQuestionId && m.FieldKey == (fieldKey ?? string.Empty), ct);

        if (existing != null)
        {
            existing.UpdatedAt = now;
            if (!string.IsNullOrWhiteSpace(fileName))
            {
                existing.FileName = fileName;
            }
            await _dbContext.SaveChangesAsync(ct);

            return MapToDto(existing);
        }

        var media = new QuestionMedia
        {
            Id = Guid.NewGuid().ToString(),
            QuestionId = validQuestionId,
            FieldKey = fieldKey?.Trim() ?? string.Empty,
            FileName = string.IsNullOrWhiteSpace(fileName) ? null : Path.GetFileName(fileName.Trim()),
            ContentType = verifiedMimeType,
            FileSizeBytes = imageBytes.Length,
            Sha256Hash = sha256Hex,
            ImageData = imageBytes,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedById = string.IsNullOrWhiteSpace(authorId) ? null : authorId
        };

        _dbContext.QuestionMedia.Add(media);

        _dbContext.AuditLogs.Add(new AuditLog
        {
            ActorId = authorId ?? "system",
            Action = "QuestionMediaUploaded",
            EntityType = "QuestionMedia",
            EntityId = media.Id,
            Description = $"Uploaded question media '{media.FileName ?? media.Id}' ({verifiedMimeType}, {imageBytes.Length} bytes)",
            Outcome = "Success",
            Timestamp = now
        });

        await _dbContext.SaveChangesAsync(ct);

        _logger.LogInformation("Saved QuestionMedia {MediaId} ({ContentType}, {Bytes} bytes) for Question {QuestionId}",
            media.Id, media.ContentType, media.FileSizeBytes, media.QuestionId ?? "(draft)");

        return MapToDto(media);
    }

    public async Task<QuestionMediaBinaryDto?> GetQuestionMediaByIdAsync(
        string mediaId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(mediaId))
        {
            return null;
        }

        var media = await _dbContext.QuestionMedia
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == mediaId, ct);

        if (media == null || media.ImageData.Length == 0)
        {
            return null;
        }

        return new QuestionMediaBinaryDto
        {
            Id = media.Id,
            QuestionId = media.QuestionId,
            ContentType = media.ContentType,
            FileSizeBytes = media.FileSizeBytes,
            Sha256Hash = media.Sha256Hash,
            ImageData = media.ImageData,
            UpdatedAt = media.UpdatedAt
        };
    }

    public async Task<bool> DeleteQuestionMediaAsync(
        string mediaId,
        string? editorId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(mediaId))
        {
            return false;
        }

        var media = await _dbContext.QuestionMedia.FirstOrDefaultAsync(m => m.Id == mediaId, ct);
        if (media == null)
        {
            return false;
        }

        _dbContext.QuestionMedia.Remove(media);

        _dbContext.AuditLogs.Add(new AuditLog
        {
            ActorId = editorId ?? "system",
            Action = "QuestionMediaDeleted",
            EntityType = "QuestionMedia",
            EntityId = media.Id,
            Description = $"Deleted question media '{media.FileName ?? media.Id}'",
            Outcome = "Success",
            Timestamp = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task<List<QuestionMediaDto>> GetMediaForQuestionAsync(
        string questionId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(questionId))
        {
            return new List<QuestionMediaDto>();
        }

        return await _dbContext.QuestionMedia
            .AsNoTracking()
            .Where(m => m.QuestionId == questionId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new QuestionMediaDto
            {
                Id = m.Id,
                QuestionId = m.QuestionId,
                FieldKey = m.FieldKey,
                FileName = m.FileName,
                ContentType = m.ContentType,
                FileSizeBytes = m.FileSizeBytes,
                Sha256Hash = m.Sha256Hash,
                Url = $"/api/v1/questions/media/{m.Id}",
                CreatedAt = m.CreatedAt,
                UpdatedAt = m.UpdatedAt
            })
            .ToListAsync(ct);
    }

    public async Task AssociateDraftMediaAsync(
        string questionId,
        IEnumerable<string> mediaIds,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(questionId) || mediaIds == null)
        {
            return;
        }

        var idList = mediaIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        if (idList.Count == 0) return;

        var medias = await _dbContext.QuestionMedia
            .Where(m => idList.Contains(m.Id) && m.QuestionId == null)
            .ToListAsync(ct);

        foreach (var m in medias)
        {
            m.QuestionId = questionId;
            m.UpdatedAt = DateTime.UtcNow;
        }

        if (medias.Count > 0)
        {
            await _dbContext.SaveChangesAsync(ct);
        }
    }

    private static QuestionMediaDto MapToDto(QuestionMedia m)
    {
        return new QuestionMediaDto
        {
            Id = m.Id,
            QuestionId = m.QuestionId,
            FieldKey = m.FieldKey,
            FileName = m.FileName,
            ContentType = m.ContentType,
            FileSizeBytes = m.FileSizeBytes,
            Sha256Hash = m.Sha256Hash,
            Url = $"/api/v1/questions/media/{m.Id}",
            CreatedAt = m.CreatedAt,
            UpdatedAt = m.UpdatedAt
        };
    }
}
