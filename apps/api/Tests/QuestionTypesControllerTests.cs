using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using System.Net.Http.Json;
using Xunit;

namespace Preform.Api.Tests;

public class QuestionTypesControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public QuestionTypesControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("TestingQuestionTypesControllerDb"));
            });
        });
    }

    [Fact]
    public async Task GetQuestionTypes_ReturnsAll18Types()
    {
        // Seed question types directly in the in-memory database
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await SeedQuestionTypes(context);

        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/question-types");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<QuestionTypeCatalogueResponse>();

        Assert.NotNull(body);
        Assert.True(body.Success);
        Assert.Equal(18, body.Count);
        Assert.Equal(18, body.Items.Count);
    }

    [Fact]
    public async Task GetQuestionTypes_ReturnsOnlyActiveTypes()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await SeedQuestionTypes(context);

        // Deactivate one type
        var essay = context.QuestionTypeDefinitions.First(t => t.Key == "essay");
        essay.IsActive = false;
        await context.SaveChangesAsync();

        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/question-types");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<QuestionTypeCatalogueResponse>();

        Assert.NotNull(body);
        Assert.Equal(17, body.Count);
        Assert.DoesNotContain(body.Items, i => i.Key == "essay");
    }

    [Fact]
    public async Task GetQuestionTypeByKey_ExistingKey_ReturnsType()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await SeedQuestionTypes(context);

        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/question-types/sata");

        response.EnsureSuccessStatusCode();
        var type = await response.Content.ReadFromJsonAsync<QuestionTypeDto>();

        Assert.NotNull(type);
        Assert.Equal("sata", type.Key);
        Assert.Equal("Select All That Apply (SATA)", type.Name);
        Assert.Equal("Traditional", type.Category);
        Assert.Equal("PartialCredit", type.SupportedScoring);
        Assert.NotNull(type.Capabilities);
        Assert.Contains("SupportsOptions", type.Capabilities);
        Assert.Contains("SupportsAutomaticGrading", type.Capabilities);
    }

    [Fact]
    public async Task GetQuestionTypeByKey_UnknownKey_ReturnsNotFound()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await SeedQuestionTypes(context);

        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/question-types/nonexistent-key");

        Assert.Equal(System.Net.HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ValidateQuestionType_ValidKey_ReturnsValid()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await SeedQuestionTypes(context);

        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/question-types/validate", new
        {
            Key = "single-choice"
        });

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ValidateQuestionTypeResponse>();

        Assert.NotNull(result);
        Assert.True(result.Valid);
        Assert.True(result.IsActive);
        Assert.Equal("single-choice", result.Key);
    }

    [Fact]
    public async Task ValidateQuestionType_UnknownKey_ReturnsInvalid()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await SeedQuestionTypes(context);

        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/question-types/validate", new
        {
            Key = "not-a-valid-type"
        });

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ValidateQuestionTypeResponse>();

        Assert.NotNull(result);
        Assert.False(result.Valid);
        Assert.NotNull(result.Error);
    }

    [Fact]
    public async Task ValidateQuestionType_EmptyKey_ReturnsInvalid()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await SeedQuestionTypes(context);

        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/question-types/validate", new
        {
            Key = ""
        });

        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetQuestionType_CapabilityFlags_AreAccurate()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await SeedQuestionTypes(context);

        var client = _factory.CreateClient();

        // single-choice: SupportsOptions + SupportsAutomaticGrading + SupportsRandomizedOptions
        var scResponse = await client.GetAsync("/api/v1/question-types/single-choice");
        var sc = await scResponse.Content.ReadFromJsonAsync<QuestionTypeDto>();
        Assert.Contains("SupportsOptions", sc!.Capabilities);
        Assert.Contains("SupportsAutomaticGrading", sc.Capabilities);
        Assert.Contains("SupportsRandomizedOptions", sc.Capabilities);
        Assert.DoesNotContain("SupportsManualGrading", sc.Capabilities);

        // essay: SupportsManualGrading only (no automatic grading)
        var essayResponse = await client.GetAsync("/api/v1/question-types/essay");
        var essay = await essayResponse.Content.ReadFromJsonAsync<QuestionTypeDto>();
        Assert.Contains("SupportsManualGrading", essay!.Capabilities);
        Assert.DoesNotContain("SupportsAutomaticGrading", essay.Capabilities);
    }

    [Fact]
    public async Task GetQuestionType_ImplementationStatus_Accurate()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await SeedQuestionTypes(context);

        var client = _factory.CreateClient();

        // single-choice is DeliverySupported
        var scResponse = await client.GetAsync("/api/v1/question-types/single-choice");
        var sc = await scResponse.Content.ReadFromJsonAsync<QuestionTypeDto>();
        Assert.Equal("DeliverySupported", sc!.ImplementationStatus);

        // essay is Catalogued
        var essayResponse = await client.GetAsync("/api/v1/question-types/essay");
        var essay = await essayResponse.Content.ReadFromJsonAsync<QuestionTypeDto>();
        Assert.Equal("Catalogued", essay!.ImplementationStatus);
    }

    private static async Task SeedQuestionTypes(AppDbContext context)
    {
        if (await context.QuestionTypeDefinitions.AnyAsync()) return;

        var types = new List<QuestionTypeDefinition>
        {
            new() { Id = "qt-1", Key = "single-choice", Name = "Single Choice", Description = "Standard single-answer.", Category = "Traditional", SupportedScoring = "ExactMatch", CapabilityFlags = (int)(QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.SupportsRandomizedOptions), ImplementationStatus = nameof(QuestionTypeStatus.DeliverySupported), IsActive = true, DisplayOrder = 1 },
            new() { Id = "qt-2", Key = "multiple-choice", Name = "Multiple Choice", Description = "Multiple-choice item.", Category = "Traditional", SupportedScoring = "ExactMatch", CapabilityFlags = (int)(QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsMultipleSelections | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.SupportsRandomizedOptions), ImplementationStatus = nameof(QuestionTypeStatus.DeliverySupported), IsActive = true, DisplayOrder = 2 },
            new() { Id = "qt-3", Key = "sata", Name = "Select All That Apply (SATA)", Description = "Multi-select clinical prioritization.", Category = "Traditional", SupportedScoring = "PartialCredit", CapabilityFlags = (int)(QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsMultipleSelections | QuestionTypeCapability.SupportsMultipleCorrectAnswers | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.SupportsPartialCredit | QuestionTypeCapability.SupportsRandomizedOptions), ImplementationStatus = nameof(QuestionTypeStatus.DeliverySupported), IsActive = true, DisplayOrder = 3 },
            new() { Id = "qt-4", Key = "checkbox", Name = "Checkbox Response", Description = "Form-based checkbox response.", Category = "Traditional", SupportedScoring = "PartialCredit", CapabilityFlags = (int)(QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsMultipleSelections | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.SupportsPartialCredit | QuestionTypeCapability.SupportsRandomizedOptions), ImplementationStatus = nameof(QuestionTypeStatus.DeliverySupported), IsActive = true, DisplayOrder = 4 },
            new() { Id = "qt-5", Key = "image-based", Name = "Image-Based Question", Description = "Clinical scenario with image exhibit.", Category = "Clinical", SupportedScoring = "ExactMatch", CapabilityFlags = (int)(QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsMedia | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.SupportsRandomizedOptions), ImplementationStatus = nameof(QuestionTypeStatus.DeliverySupported), IsActive = true, DisplayOrder = 5 },
            new() { Id = "qt-6", Key = "multiple-image", Name = "Multiple-Image Item", Description = "Comparative visual exhibits.", Category = "Clinical", SupportedScoring = "ExactMatch", CapabilityFlags = (int)(QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsMedia | QuestionTypeCapability.SupportsMultipleSelections | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.SupportsRandomizedOptions), ImplementationStatus = nameof(QuestionTypeStatus.DeliverySupported), IsActive = true, DisplayOrder = 6 },
            new() { Id = "qt-7", Key = "drag-drop", Name = "Drag-and-Drop", Description = "Interactive clinical priority classification.", Category = "NGN", SupportedScoring = "ExactMatch", CapabilityFlags = (int)(QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.RequiresSpecializedRenderer | QuestionTypeCapability.RequiresSpecializedInput), ImplementationStatus = nameof(QuestionTypeStatus.Catalogued), IsActive = true, DisplayOrder = 7 },
            new() { Id = "qt-8", Key = "ordering", Name = "Ordering / Sequencing", Description = "Step-by-step procedural order.", Category = "NGN", SupportedScoring = "ExactMatch", CapabilityFlags = (int)(QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.RequiresSpecializedRenderer | QuestionTypeCapability.RequiresSpecializedInput), ImplementationStatus = nameof(QuestionTypeStatus.Catalogued), IsActive = true, DisplayOrder = 8 },
            new() { Id = "qt-9", Key = "case-study", Name = "NGN Case Study", Description = "Multi-part clinical unfolding case study.", Category = "NGN", SupportedScoring = "PartialCredit", CapabilityFlags = (int)(QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.SupportsClinicalScenarios | QuestionTypeCapability.SupportsExhibits | QuestionTypeCapability.SupportsPartialCredit | QuestionTypeCapability.SupportsManualGrading | QuestionTypeCapability.RequiresSpecializedRenderer), ImplementationStatus = nameof(QuestionTypeStatus.Catalogued), IsActive = true, DisplayOrder = 9 },
            new() { Id = "qt-10", Key = "essay", Name = "Extended Response / Essay", Description = "Clinical reasoning reflection.", Category = "Traditional", SupportedScoring = "ManualReview", CapabilityFlags = (int)(QuestionTypeCapability.SupportsManualGrading | QuestionTypeCapability.RequiresSpecializedRenderer), ImplementationStatus = nameof(QuestionTypeStatus.Catalogued), IsActive = true, DisplayOrder = 10 },
            new() { Id = "qt-11", Key = "matching", Name = "Matching", Description = "Paired concept-to-intervention matching.", Category = "Traditional", SupportedScoring = "ExactMatch", CapabilityFlags = (int)(QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.RequiresSpecializedRenderer | QuestionTypeCapability.RequiresSpecializedInput), ImplementationStatus = nameof(QuestionTypeStatus.Catalogued), IsActive = true, DisplayOrder = 11 },
            new() { Id = "qt-12", Key = "fill-blank", Name = "Fill-in-the-Blank", Description = "Direct textual entry.", Category = "Traditional", SupportedScoring = "ExactMatch", CapabilityFlags = (int)(QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.RequiresSpecializedInput), ImplementationStatus = nameof(QuestionTypeStatus.Catalogued), IsActive = true, DisplayOrder = 12 },
            new() { Id = "qt-13", Key = "matrix", Name = "Matrix / Grid Response", Description = "Tabular multiple-response matrix.", Category = "NGN", SupportedScoring = "PartialCredit", CapabilityFlags = (int)(QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.SupportsPartialCredit | QuestionTypeCapability.RequiresSpecializedRenderer | QuestionTypeCapability.RequiresSpecializedInput), ImplementationStatus = nameof(QuestionTypeStatus.Catalogued), IsActive = true, DisplayOrder = 13 },
            new() { Id = "qt-14", Key = "numeric", Name = "Numeric Response", Description = "Dosage calculation entry.", Category = "Traditional", SupportedScoring = "ExactMatch", CapabilityFlags = (int)(QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.RequiresSpecializedInput), ImplementationStatus = nameof(QuestionTypeStatus.Catalogued), IsActive = true, DisplayOrder = 14 },
            new() { Id = "qt-15", Key = "true-false", Name = "True / False", Description = "Binary clinical fact validation.", Category = "Traditional", SupportedScoring = "ExactMatch", CapabilityFlags = (int)(QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.SupportsRandomizedOptions), ImplementationStatus = nameof(QuestionTypeStatus.DeliverySupported), IsActive = true, DisplayOrder = 15 },
            new() { Id = "qt-16", Key = "tabular", Name = "Tabular Response", Description = "Data table evaluation.", Category = "NGN", SupportedScoring = "PartialCredit", CapabilityFlags = (int)(QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.SupportsPartialCredit | QuestionTypeCapability.RequiresSpecializedRenderer | QuestionTypeCapability.RequiresSpecializedInput), ImplementationStatus = nameof(QuestionTypeStatus.Catalogued), IsActive = true, DisplayOrder = 16 },
            new() { Id = "qt-17", Key = "short-answer", Name = "Short-Answer Response", Description = "Concise clinical assessment entry.", Category = "Traditional", SupportedScoring = "ManualReview", CapabilityFlags = (int)(QuestionTypeCapability.SupportsManualGrading | QuestionTypeCapability.RequiresSpecializedInput), ImplementationStatus = nameof(QuestionTypeStatus.Catalogued), IsActive = true, DisplayOrder = 17 },
            new() { Id = "qt-18", Key = "dynamic-lab", Name = "Dynamic Lab Value Response", Description = "Interactive laboratory value analysis.", Category = "NGN", SupportedScoring = "ExactMatch", CapabilityFlags = (int)(QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.RequiresSpecializedRenderer), ImplementationStatus = nameof(QuestionTypeStatus.Catalogued), IsActive = true, DisplayOrder = 18 },
        };
        context.QuestionTypeDefinitions.AddRange(types);
        await context.SaveChangesAsync();
    }
}
