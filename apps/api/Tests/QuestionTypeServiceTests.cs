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
        var types = new List<QuestionTypeDefinition>
        {
            new() { Id = "qt-1", Key = "single-choice", Name = "Single Choice", Description = "Standard single-answer.", Category = "Traditional", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 1 },
            new() { Id = "qt-2", Key = "multiple-choice", Name = "Multiple Choice", Description = "Multiple-choice item.", Category = "Traditional", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 2 },
            new() { Id = "qt-3", Key = "sata", Name = "Select All That Apply (SATA)", Description = "Multi-select clinical prioritization.", Category = "Traditional", SupportedScoring = "PartialCredit", IsActive = true, DisplayOrder = 3 },
            new() { Id = "qt-4", Key = "checkbox", Name = "Checkbox Response", Description = "Form-based checkbox response.", Category = "Traditional", SupportedScoring = "PartialCredit", IsActive = true, DisplayOrder = 4 },
            new() { Id = "qt-5", Key = "image-based", Name = "Image-Based Question", Description = "Clinical scenario with image exhibit.", Category = "Clinical", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 5 },
            new() { Id = "qt-6", Key = "multiple-image", Name = "Multiple-Image Item", Description = "Comparative visual exhibits.", Category = "Clinical", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 6 },
            new() { Id = "qt-7", Key = "drag-drop", Name = "Drag-and-Drop", Description = "Interactive clinical priority classification.", Category = "NGN", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 7 },
            new() { Id = "qt-8", Key = "ordering", Name = "Ordering / Sequencing", Description = "Step-by-step procedural order.", Category = "NGN", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 8 },
            new() { Id = "qt-9", Key = "case-study", Name = "NGN Case Study", Description = "Multi-part clinical unfolding case study.", Category = "NGN", SupportedScoring = "PartialCredit", IsActive = true, DisplayOrder = 9 },
            new() { Id = "qt-10", Key = "essay", Name = "Extended Response / Essay", Description = "Clinical reasoning reflection.", Category = "Traditional", SupportedScoring = "ManualReview", IsActive = true, DisplayOrder = 10 },
            new() { Id = "qt-11", Key = "matching", Name = "Matching", Description = "Paired concept-to-intervention matching.", Category = "Traditional", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 11 },
            new() { Id = "qt-12", Key = "fill-blank", Name = "Fill-in-the-Blank", Description = "Direct textual entry.", Category = "Traditional", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 12 },
            new() { Id = "qt-13", Key = "matrix", Name = "Matrix / Grid Response", Description = "Tabular multiple-response matrix.", Category = "NGN", SupportedScoring = "PartialCredit", IsActive = true, DisplayOrder = 13 },
            new() { Id = "qt-14", Key = "numeric", Name = "Numeric Response", Description = "Dosage calculation entry.", Category = "Traditional", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 14 },
            new() { Id = "qt-15", Key = "true-false", Name = "True / False", Description = "Binary clinical fact validation.", Category = "Traditional", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 15 },
            new() { Id = "qt-16", Key = "tabular", Name = "Tabular Response", Description = "Data table evaluation.", Category = "NGN", SupportedScoring = "PartialCredit", IsActive = true, DisplayOrder = 16 },
            new() { Id = "qt-17", Key = "short-answer", Name = "Short-Answer Response", Description = "Concise clinical assessment entry.", Category = "Traditional", SupportedScoring = "ManualReview", IsActive = true, DisplayOrder = 17 },
            new() { Id = "qt-18", Key = "dynamic-lab", Name = "Dynamic Lab Value Response", Description = "Interactive laboratory value analysis.", Category = "NGN", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 18 },
        };
        context.QuestionTypeDefinitions.AddRange(types);
        await context.SaveChangesAsync();
    }
}
