using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class QuestionTypeServiceTests
{
    private static AppDbContext CreateInMemoryContext(string databaseName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetAllQuestionTypesAsync_ReturnsAll18ActiveTypes()
    {
        using var context = CreateInMemoryContext("Qts_GetAll_Active");
        await SeedQuestionTypes(context);

        var service = new QuestionTypeService(context);
        var types = await service.GetAllQuestionTypesAsync();

        Assert.Equal(18, types.Count);
        Assert.True(types.All(t => t.IsActive));
        Assert.Equal("single-choice", types.First(t => t.Key == "single-choice").Key);
        Assert.Equal("dynamic-lab", types.Last(t => t.Key == "dynamic-lab").Key);
    }

    [Fact]
    public async Task GetAllQuestionTypesAsync_ExcludesInactiveTypes()
    {
        using var context = CreateInMemoryContext("Qts_GetAll_ExcludesInactive");
        await SeedQuestionTypes(context);

        // Deactivate one type
        var typeToDeactivate = context.QuestionTypeDefinitions.First(t => t.Key == "essay");
        typeToDeactivate.IsActive = false;
        await context.SaveChangesAsync();

        var service = new QuestionTypeService(context);
        var types = await service.GetAllQuestionTypesAsync();

        Assert.Equal(17, types.Count);
        Assert.DoesNotContain(types, t => t.Key == "essay");
    }

    [Fact]
    public async Task GetAllQuestionTypesAsync_OrderedByDisplayOrder()
    {
        using var context = CreateInMemoryContext("Qts_GetAll_Ordered");
        await SeedQuestionTypes(context);

        var service = new QuestionTypeService(context);
        var types = await service.GetAllQuestionTypesAsync();

        var orders = types.Select(t => t.DisplayOrder).ToList();
        Assert.Equal(orders.OrderBy(o => o).ToList(), orders);
        Assert.Equal(1, types.First().DisplayOrder);
        Assert.Equal(18, types.Last().DisplayOrder);
    }

    [Fact]
    public async Task GetQuestionTypeByKeyAsync_ExistingKey_ReturnsType()
    {
        using var context = CreateInMemoryContext("Qts_GetByKey_Existing");
        await SeedQuestionTypes(context);

        var service = new QuestionTypeService(context);
        var type = await service.GetQuestionTypeByKeyAsync("sata");

        Assert.NotNull(type);
        Assert.Equal("sata", type.Key);
        Assert.Equal("Select All That Apply (SATA)", type.Name);
        Assert.Equal("Traditional", type.Category);
        Assert.Equal("PartialCredit", type.SupportedScoring);
    }

    [Fact]
    public async Task GetQuestionTypeByKeyAsync_UnknownKey_ReturnsNull()
    {
        using var context = CreateInMemoryContext("Qts_GetByKey_Unknown");
        await SeedQuestionTypes(context);

        var service = new QuestionTypeService(context);
        var type = await service.GetQuestionTypeByKeyAsync("nonexistent-key");

        Assert.Null(type);
    }

    [Fact]
    public async Task GetQuestionTypeByKeyAsync_EmptyKey_ReturnsNull()
    {
        using var context = CreateInMemoryContext("Qts_GetByKey_Empty");
        await SeedQuestionTypes(context);

        var service = new QuestionTypeService(context);
        var type = await service.GetQuestionTypeByKeyAsync("");

        Assert.Null(type);
    }

    [Fact]
    public async Task ValidateQuestionTypeKeyAsync_ValidActiveKey_ReturnsValid()
    {
        using var context = CreateInMemoryContext("Qts_Validate_Valid");
        await SeedQuestionTypes(context);

        var service = new QuestionTypeService(context);
        var result = await service.ValidateQuestionTypeKeyAsync("single-choice");

        Assert.True(result.Valid);
        Assert.True(result.IsActive);
        Assert.Equal("single-choice", result.Key);
        Assert.Null(result.Error);
    }

    [Fact]
    public async Task ValidateQuestionTypeKeyAsync_UnknownKey_ReturnsInvalid()
    {
        using var context = CreateInMemoryContext("Qts_Validate_Unknown");
        await SeedQuestionTypes(context);

        var service = new QuestionTypeService(context);
        var result = await service.ValidateQuestionTypeKeyAsync("not-a-type");

        Assert.False(result.Valid);
        Assert.NotNull(result.Error);
        Assert.Contains("not-a-type", result.Error);
    }

    [Fact]
    public async Task ValidateQuestionTypeKeyAsync_EmptyKey_ReturnsInvalid()
    {
        using var context = CreateInMemoryContext("Qts_Validate_Empty");
        await SeedQuestionTypes(context);

        var service = new QuestionTypeService(context);
        var result = await service.ValidateQuestionTypeKeyAsync("");

        Assert.False(result.Valid);
        Assert.NotNull(result.Error);
    }

    [Fact]
    public async Task ValidateQuestionTypeKeyAsync_InactiveKey_ReturnsInvalid()
    {
        using var context = CreateInMemoryContext("Qts_Validate_Inactive");
        await SeedQuestionTypes(context);

        var essay = context.QuestionTypeDefinitions.First(t => t.Key == "essay");
        essay.IsActive = false;
        await context.SaveChangesAsync();

        var service = new QuestionTypeService(context);
        var result = await service.ValidateQuestionTypeKeyAsync("essay");

        Assert.True(result.Valid); // Key is known
        Assert.False(result.IsActive); // But inactive
        Assert.NotNull(result.Error);
    }

    [Fact]
    public async Task EnsureCatalogueSeededAsync_Idempotent_NoDuplicates()
    {
        using var context = CreateInMemoryContext("Qts_Seed_Idempotent");
        var service = new QuestionTypeService(context);

        // Run twice
        await service.EnsureCatalogueSeededAsync();
        await service.EnsureCatalogueSeededAsync();

        var count = await context.QuestionTypeDefinitions.CountAsync();
        Assert.Equal(18, count);
    }

    [Fact]
    public async Task EnsureCatalogueSeededAsync_SetsCapabilityFlagsAndStatus()
    {
        using var context = CreateInMemoryContext("Qts_Seed_Metadata");
        var service = new QuestionTypeService(context);

        await service.EnsureCatalogueSeededAsync();

        var singleChoice = await context.QuestionTypeDefinitions
            .FirstAsync(t => t.Key == "single-choice");

        Assert.True((singleChoice.CapabilityFlags & (int)QuestionTypeCapability.SupportsOptions) != 0);
        Assert.True((singleChoice.CapabilityFlags & (int)QuestionTypeCapability.SupportsAutomaticGrading) != 0);
        Assert.Equal(nameof(QuestionTypeStatus.DeliverySupported), singleChoice.ImplementationStatus);

        var essay = await context.QuestionTypeDefinitions.FirstAsync(t => t.Key == "essay");
        Assert.True((essay.CapabilityFlags & (int)QuestionTypeCapability.SupportsManualGrading) != 0);
        Assert.Equal(nameof(QuestionTypeStatus.Catalogued), essay.ImplementationStatus);
    }

    private static async Task SeedQuestionTypes(AppDbContext context)
    {
        var types = new List<QuestionTypeDefinition>();
        for (int i = 1; i <= 18; i++)
        {
            types.Add(new QuestionTypeDefinition
            {
                Id = $"qt-{i}",
                Key = $"type-{i}",
                Name = $"Type {i}",
                Description = $"Description {i}",
                Category = "Traditional",
                SupportedScoring = "ExactMatch",
                IsActive = true,
                DisplayOrder = i,
            });
        }
        context.QuestionTypeDefinitions.AddRange(types);
        await context.SaveChangesAsync();
    }
}
