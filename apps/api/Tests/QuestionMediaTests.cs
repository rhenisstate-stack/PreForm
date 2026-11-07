using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Controllers;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class QuestionMediaTests
{
    private static AppDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        var context = new AppDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }

    // Valid minimal PNG binary header + IHDR + IEND
    private static readonly byte[] ValidPngBytes = new byte[]
    {
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
        0x42, 0x60, 0x82
    };

    // Valid minimal JPEG binary header
    private static readonly byte[] ValidJpegBytes = new byte[]
    {
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
        0x00, 0x48, 0x00, 0x00, 0xff, 0xd9
    };

    // Valid minimal GIF header
    private static readonly byte[] ValidGifBytes = new byte[]
    {
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
        0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
        0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00,
        0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x01, 0x44,
        0x00, 0x3b
    };

    // Valid minimal WebP header
    private static readonly byte[] ValidWebpBytes = new byte[]
    {
        0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c,
        0x0d, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00,
        0x00, 0x07, 0x00, 0x00, 0x00
    };

    [Fact]
    public async Task UploadQuestionMedia_ValidPng_PersistsToDatabaseAndReturnsMetadata()
    {
        var db = CreateInMemoryContext(nameof(UploadQuestionMedia_ValidPng_PersistsToDatabaseAndReturnsMetadata));
        var service = new QuestionMediaService(db, NullLogger<QuestionMediaService>.Instance);

        var dto = await service.UploadQuestionMediaAsync(
            questionId: null,
            fieldKey: "option_A",
            fileName: "ecg-lead-ii.png",
            imageBytes: ValidPngBytes,
            declaredContentType: "image/png",
            authorId: "usr-admin-1");

        Assert.NotNull(dto);
        Assert.NotEmpty(dto.Id);
        Assert.Equal("image/png", dto.ContentType);
        Assert.Equal(ValidPngBytes.Length, dto.FileSizeBytes);
        Assert.Equal("option_A", dto.FieldKey);
        Assert.Equal("ecg-lead-ii.png", dto.FileName);
        Assert.Contains(dto.Id, dto.Url);

        // Verify database persistence
        var dbRecord = await db.QuestionMedia.FirstOrDefaultAsync(m => m.Id == dto.Id);
        Assert.NotNull(dbRecord);
        Assert.Equal(ValidPngBytes, dbRecord.ImageData);
        Assert.Equal("image/png", dbRecord.ContentType);
        Assert.Equal(ValidPngBytes.Length, dbRecord.FileSizeBytes);
    }

    [Fact]
    public async Task UploadQuestionMedia_SupportedFormats_SucceedsForJpegGifAndWebp()
    {
        var db = CreateInMemoryContext(nameof(UploadQuestionMedia_SupportedFormats_SucceedsForJpegGifAndWebp));
        var service = new QuestionMediaService(db, NullLogger<QuestionMediaService>.Instance);

        var jpegDto = await service.UploadQuestionMediaAsync(null, "option_B", "xray.jpg", ValidJpegBytes, "image/jpeg", "usr-admin-1");
        Assert.Equal("image/jpeg", jpegDto.ContentType);

        var gifDto = await service.UploadQuestionMediaAsync(null, "option_C", "animation.gif", ValidGifBytes, "image/gif", "usr-admin-1");
        Assert.Equal("image/gif", gifDto.ContentType);

        var webpDto = await service.UploadQuestionMediaAsync(null, "option_D", "diagram.webp", ValidWebpBytes, "image/webp", "usr-admin-1");
        Assert.Equal("image/webp", webpDto.ContentType);
    }

    [Fact]
    public async Task UploadQuestionMedia_Exceeding5MB_RejectsWithArgumentException()
    {
        var db = CreateInMemoryContext(nameof(UploadQuestionMedia_Exceeding5MB_RejectsWithArgumentException));
        var service = new QuestionMediaService(db, NullLogger<QuestionMediaService>.Instance);

        // Exactly 5 MB (5,242,880 bytes) with PNG header
        var exactly5Mb = new byte[QuestionMediaService.MaxImageSizeBytes];
        Array.Copy(ValidPngBytes, exactly5Mb, ValidPngBytes.Length);

        var successDto = await service.UploadQuestionMediaAsync(null, "stem", "big-ecg.png", exactly5Mb, "image/png", "usr-admin-1");
        Assert.NotNull(successDto);
        Assert.Equal(QuestionMediaService.MaxImageSizeBytes, successDto.FileSizeBytes);

        // 5 MB + 1 byte (5,242,881 bytes)
        var over5Mb = new byte[QuestionMediaService.MaxImageSizeBytes + 1];
        Array.Copy(ValidPngBytes, over5Mb, ValidPngBytes.Length);

        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            service.UploadQuestionMediaAsync(null, "stem", "too-big.png", over5Mb, "image/png", "usr-admin-1"));

        Assert.Contains("5 MB", ex.Message);
    }

    [Fact]
    public async Task UploadQuestionMedia_DisguisedOrCorruptedContent_RejectsSpoofedMimeType()
    {
        var db = CreateInMemoryContext(nameof(UploadQuestionMedia_DisguisedOrCorruptedContent_RejectsSpoofedMimeType));
        var service = new QuestionMediaService(db, NullLogger<QuestionMediaService>.Instance);

        // Fake image: text payload claiming to be image/png
        var fakeImage = System.Text.Encoding.UTF8.GetBytes("<html><script>alert('xss')</script></html>");

        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            service.UploadQuestionMediaAsync(null, "option_A", "malicious.png", fakeImage, "image/png", "usr-admin-1"));

        Assert.Contains("Unsupported or malformed image content", ex.Message);
    }

    [Fact]
    public async Task UploadQuestionMedia_EmptyPayload_RejectsWithArgumentException()
    {
        var db = CreateInMemoryContext(nameof(UploadQuestionMedia_EmptyPayload_RejectsWithArgumentException));
        var service = new QuestionMediaService(db, NullLogger<QuestionMediaService>.Instance);

        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            service.UploadQuestionMediaAsync(null, "option_A", "empty.png", Array.Empty<byte>(), "image/png", "usr-admin-1"));

        Assert.Contains("cannot be empty", ex.Message);
    }

    [Fact]
    public async Task GetQuestionMediaById_ExistingAndNonExisting_ReturnsCorrectBinaryOrNull()
    {
        var db = CreateInMemoryContext(nameof(GetQuestionMediaById_ExistingAndNonExisting_ReturnsCorrectBinaryOrNull));
        var service = new QuestionMediaService(db, NullLogger<QuestionMediaService>.Instance);

        var uploaded = await service.UploadQuestionMediaAsync(null, "stem", "ct-scan.png", ValidPngBytes, "image/png", "usr-admin-1");

        // Existing
        var binary = await service.GetQuestionMediaByIdAsync(uploaded.Id);
        Assert.NotNull(binary);
        Assert.Equal("image/png", binary.ContentType);
        Assert.Equal(ValidPngBytes, binary.ImageData);
        Assert.Equal(uploaded.Sha256Hash, binary.Sha256Hash);

        // Non-existing
        var missing = await service.GetQuestionMediaByIdAsync("non-existent-id");
        Assert.Null(missing);
    }

    [Fact]
    public async Task DeleteQuestionMedia_RemovesFromDatabase()
    {
        var db = CreateInMemoryContext(nameof(DeleteQuestionMedia_RemovesFromDatabase));
        var service = new QuestionMediaService(db, NullLogger<QuestionMediaService>.Instance);

        var uploaded = await service.UploadQuestionMediaAsync(null, "stem", "remove-me.png", ValidPngBytes, "image/png", "usr-admin-1");

        var deleted = await service.DeleteQuestionMediaAsync(uploaded.Id, "usr-admin-1");
        Assert.True(deleted);

        var check = await service.GetQuestionMediaByIdAsync(uploaded.Id);
        Assert.Null(check);

        var deleteAgain = await service.DeleteQuestionMediaAsync(uploaded.Id, "usr-admin-1");
        Assert.False(deleteAgain);
    }

    [Fact]
    public async Task QuestionBankService_CreateQuestionWithOptionsMedia_AssociatesDraftMedia()
    {
        var db = CreateInMemoryContext(nameof(QuestionBankService_CreateQuestionWithOptionsMedia_AssociatesDraftMedia));
        var mediaService = new QuestionMediaService(db, NullLogger<QuestionMediaService>.Instance);
        var qbService = new QuestionBankService(db, NullLogger<QuestionBankService>.Instance);

        // Upload media as draft (unlinked to questionId)
        var mediaA = await mediaService.UploadQuestionMediaAsync(null, "option_A", "ecg-A.png", ValidPngBytes, "image/png", "usr-admin-1");
        var mediaB = await mediaService.UploadQuestionMediaAsync(null, "option_B", "ecg-B.png", ValidJpegBytes, "image/jpeg", "usr-admin-1");

        Assert.Null(mediaA.QuestionId);
        Assert.Null(mediaB.QuestionId);

        // Create image-based question referencing the media URLs
        var createRequest = new CreateQuestionRequest
        {
            Pathway = "rn",
            QuestionTypeKey = "image-based",
            Stem = "Analyze the rhythm strips below and select the correct cardiac dysrhythmia.",
            Difficulty = QuestionDifficulty.Moderate,
            Options = new List<CreateQuestionOptionRequest>
            {
                new() { OptionKey = "A", Content = "Atrial Fibrillation", IsCorrect = true, MediaUrl = mediaA.Url },
                new() { OptionKey = "B", Content = "Ventricular Tachycardia", IsCorrect = false, MediaUrl = mediaB.Url },
            }
        };

        var created = await qbService.CreateQuestionAsync(createRequest, "usr-admin-1");
        Assert.NotNull(created);

        // Verify QuestionMedia records are now associated with the created question ID
        var updatedMediaA = await db.QuestionMedia.FirstOrDefaultAsync(m => m.Id == mediaA.Id);
        var updatedMediaB = await db.QuestionMedia.FirstOrDefaultAsync(m => m.Id == mediaB.Id);

        Assert.NotNull(updatedMediaA);
        Assert.Equal(created.Id, updatedMediaA.QuestionId);
        Assert.NotNull(updatedMediaB);
        Assert.Equal(created.Id, updatedMediaB.QuestionId);
    }

    [Fact]
    public async Task QuestionMediaController_UploadAndGetMedia_IntegrationFlowSucceeds()
    {
        var db = CreateInMemoryContext(nameof(QuestionMediaController_UploadAndGetMedia_IntegrationFlowSucceeds));
        var mediaService = new QuestionMediaService(db, NullLogger<QuestionMediaService>.Instance);
        var controller = new QuestionMediaController(mediaService, NullLogger<QuestionMediaController>.Instance);

        var httpContext = new DefaultHttpContext();
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "usr-admin-1"),
            new Claim(ClaimTypes.Role, "admin")
        }, "TestAuth"));
        httpContext.User = user;
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        // 1. Upload file via controller
        using var stream = new MemoryStream(ValidPngBytes);
        var formFile = new FormFile(stream, 0, ValidPngBytes.Length, "file", "test-xray.png")
        {
            Headers = new HeaderDictionary(),
            ContentType = "image/png"
        };

        var uploadResult = await controller.UploadMedia(null, "option_A", formFile);
        var createdResult = Assert.IsType<CreatedResult>(uploadResult);
        var responsePayload = Assert.IsType<QuestionMediaUploadResponse>(createdResult.Value);

        Assert.True(responsePayload.Success);
        Assert.NotNull(responsePayload.Media);
        var mediaId = responsePayload.Media.Id;

        // 2. Retrieve file via controller
        var getResult = await controller.GetMedia(mediaId);
        var fileResult = Assert.IsType<FileContentResult>(getResult);
        Assert.Equal("image/png", fileResult.ContentType);
        Assert.Equal(ValidPngBytes, fileResult.FileContents);

        // 3. Delete file via controller
        var deleteResult = await controller.DeleteMedia(mediaId);
        var okResult = Assert.IsType<OkObjectResult>(deleteResult);
        Assert.NotNull(okResult);

        // 4. Subsequent retrieval returns 404
        var getAfterDelete = await controller.GetMedia(mediaId);
        Assert.IsType<NotFoundObjectResult>(getAfterDelete);
    }
}
