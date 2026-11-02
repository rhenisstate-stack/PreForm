using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class QuestionTypeContractValidatorTests
{
    private static QuestionTypeContractValidator CreateValidator(
        out AppDbContext context,
        bool includeEssay = false)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        context = new AppDbContext(options);
        context.QuestionTypeDefinitions.Add(new QuestionTypeDefinition
        {
            Id = "single-choice-id",
            Key = "single-choice",
            Name = "Single Choice",
            IsActive = true,
        });

        if (includeEssay)
        {
            context.QuestionTypeDefinitions.Add(new QuestionTypeDefinition
            {
                Id = "essay-id",
                Key = "essay",
                Name = "Essay",
                IsActive = true,
            });
        }

        context.SaveChanges();
        var service = new QuestionTypeService(context, QuestionTypeRegistry.Instance);
        return new QuestionTypeContractValidator(QuestionTypeRegistry.Instance, service);
    }

    private static JsonElement Json(string value)
    {
        using var document = JsonDocument.Parse(value);
        return document.RootElement.Clone();
    }

    [Fact]
    public async Task ValidateAsync_AcceptsCurrentOptionResponseShape()
    {
        using var context = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
        context.QuestionTypeDefinitions.Add(new QuestionTypeDefinition
        {
            Id = "single-choice-id",
            Key = "single-choice",
            Name = "Single Choice",
            IsActive = true,
        });
        await context.SaveChangesAsync();
        var validator = new QuestionTypeContractValidator(
            QuestionTypeRegistry.Instance,
            new QuestionTypeService(context, QuestionTypeRegistry.Instance));

        var result = await validator.ValidateAsync(new QuestionTypePayloadEnvelope
        {
            TypeKey = "single-choice",
            ContractVersion = 1,
            Kind = QuestionTypePayloadKind.Response,
            Payload = Json("[2]"),
        }, optionCount: 4);

        Assert.True(result.IsValid);
        Assert.Null(result.ErrorCode);
    }

    [Theory]
    [InlineData("[0,0]", 4, "invalid-response-value")]
    [InlineData("[-1]", 4, "invalid-response-value")]
    [InlineData("[4]", 4, "invalid-response-value")]
    [InlineData("[]", 4, "invalid-selection-count")]
    [InlineData("[0,1]", 4, "invalid-selection-count")]
    [InlineData("{}", 4, "invalid-response-shape")]
    public async Task ValidateAsync_RejectsMalformedSingleChoiceResponses(
        string payload,
        int optionCount,
        string errorCode)
    {
        using var context = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
        context.QuestionTypeDefinitions.Add(new QuestionTypeDefinition
        {
            Id = "single-choice-id",
            Key = "single-choice",
            Name = "Single Choice",
            IsActive = true,
        });
        await context.SaveChangesAsync();
        var validator = new QuestionTypeContractValidator(
            QuestionTypeRegistry.Instance,
            new QuestionTypeService(context, QuestionTypeRegistry.Instance));

        var result = await validator.ValidateAsync(new QuestionTypePayloadEnvelope
        {
            TypeKey = "single-choice",
            ContractVersion = 1,
            Kind = QuestionTypePayloadKind.Response,
            Payload = Json(payload),
        }, optionCount);

        Assert.False(result.IsValid);
        Assert.Equal(errorCode, result.ErrorCode);
    }

    [Fact]
    public async Task ValidateAsync_RejectsUnsupportedTypeVersionAndInactiveType()
    {
        var validator = CreateValidator(out var context);
        using (context)
        {
            var unknownType = await validator.ValidateAsync(new QuestionTypePayloadEnvelope
            {
                TypeKey = "not-registered",
                ContractVersion = 1,
                Kind = QuestionTypePayloadKind.Response,
                Payload = Json("[0]"),
            }, 4);
            Assert.Equal("unknown-type", unknownType.ErrorCode);

            var wrongVersion = await validator.ValidateAsync(new QuestionTypePayloadEnvelope
            {
                TypeKey = "single-choice",
                ContractVersion = 2,
                Kind = QuestionTypePayloadKind.Response,
                Payload = Json("[0]"),
            }, 4);
            Assert.Equal("unsupported-contract-version", wrongVersion.ErrorCode);

            context.QuestionTypeDefinitions.Single().IsActive = false;
            await context.SaveChangesAsync();
            var inactive = await validator.ValidateAsync(new QuestionTypePayloadEnvelope
            {
                TypeKey = "single-choice",
                ContractVersion = 1,
                Kind = QuestionTypePayloadKind.Response,
                Payload = Json("[0]"),
            }, 4);
            Assert.Equal("unknown-type", inactive.ErrorCode);
        }
    }

    [Fact]
    public async Task ValidateAsync_RejectsUnsupportedContentAndOversizedPayloads()
    {
        var validator = CreateValidator(out var context, includeEssay: true);
        using (context)
        {
            var unsupportedContent = await validator.ValidateAsync(new QuestionTypePayloadEnvelope
            {
                TypeKey = "single-choice",
                ContractVersion = 1,
                Kind = QuestionTypePayloadKind.Content,
                Payload = Json("{}"),
            }, 4);
            Assert.Equal("unsupported-payload-kind", unsupportedContent.ErrorCode);

            var unsupportedEssay = await validator.ValidateAsync(new QuestionTypePayloadEnvelope
            {
                TypeKey = "essay",
                ContractVersion = 1,
                Kind = QuestionTypePayloadKind.Response,
                Payload = Json("\"not-accepted\""),
            });
            Assert.Equal("unsupported-payload-kind", unsupportedEssay.ErrorCode);

            var oversized = await validator.ValidateAsync(new QuestionTypePayloadEnvelope
            {
                TypeKey = "single-choice",
                ContractVersion = 1,
                Kind = QuestionTypePayloadKind.Response,
                Payload = Json(JsonSerializer.Serialize(new string('x', 70_000))),
            }, 4);
            Assert.Equal("payload-too-large", oversized.ErrorCode);
        }
    }
}
