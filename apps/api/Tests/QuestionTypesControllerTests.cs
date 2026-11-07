using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;


namespace Preform.Api.Tests;

public class QuestionTypesControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public QuestionTypesControllerTests(WebApplicationFactory<Program> factory)
    {
        var databaseName = Guid.NewGuid().ToString();
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(databaseName));
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
    public async Task GetQuestionTypes_EmptyCatalogueReturnsAnEmptyEnvelope()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/question-types");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<QuestionTypeCatalogueResponse>();

        Assert.NotNull(body);
        Assert.True(body.Success);
        Assert.Equal(0, body.Count);
        Assert.Empty(body.Items);
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
    public async Task GetQuestionTypes_ExposesSafeVersionedMetadataWithoutDatabaseIds()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await SeedQuestionTypes(context);

        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/question-types");

        response.EnsureSuccessStatusCode();
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var json = document.RootElement;
        var sata = json.GetProperty("items").EnumerateArray()
            .Single(item => item.GetProperty("key").GetString() == "sata");

        Assert.True(json.GetProperty("success").GetBoolean());
        Assert.Equal(18, json.GetProperty("count").GetInt32());
        Assert.Equal(1, sata.GetProperty("contractVersion").GetInt32());
        Assert.Equal("GradingSupported", sata.GetProperty("implementationStatus").GetString());
        Assert.Equal("automatic-exact-match",
            sata.GetProperty("supportedScoringModes")[0].GetString());
        Assert.False(sata.GetProperty("capabilityDetails").GetProperty("supportsPartialCredit").GetBoolean());
        Assert.False(sata.TryGetProperty("id", out _));
        Assert.DoesNotContain("isCorrect", sata.GetRawText(), StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("answerKey", sata.GetRawText(), StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("gradingConfiguration", sata.GetRawText(), StringComparison.OrdinalIgnoreCase);
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
        Assert.False(string.IsNullOrWhiteSpace(type.Name));
        Assert.Equal("Traditional", type.Category);
        Assert.Equal("ExactMatch", type.SupportedScoring);
        Assert.Equal(new[] { "automatic-exact-match" }, type.SupportedScoringModes);
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
    public async Task GetQuestionTypeByKey_InactiveTypeIsNotVisible()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await SeedQuestionTypes(context);
        context.QuestionTypeDefinitions.Single(type => type.Key == "essay").IsActive = false;
        await context.SaveChangesAsync();

        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/question-types/essay");

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

    private static async Task SeedQuestionTypes(AppDbContext context)
    {
        if (await context.QuestionTypeDefinitions.AnyAsync()) return;

        var expectedKeys = new[]
        {
            "single-choice", "multiple-choice", "sata", "checkbox", "image-based",
            "multiple-image", "drag-drop", "ordering", "case-study", "essay",
            "matching", "fill-blank", "matrix", "numeric", "true-false",
            "tabular", "short-answer", "dynamic-lab"
        };

        var types = expectedKeys.Select((key, i) => new QuestionTypeDefinition
        {
            Id = $"qt-{i + 1}",
            Key = key,
            Name = key.Replace("-", " ").Replace("sata", "SATA"),
            Description = $"Description for {key}",
            Category = i < 6 ? "Traditional" : i < 12 ? "NGN" : "Clinical",
            SupportedScoring = "ExactMatch",
            IsActive = true,
            DisplayOrder = i + 1,
        }).ToList();

        context.QuestionTypeDefinitions.AddRange(types);
        await context.SaveChangesAsync();
    }
}
