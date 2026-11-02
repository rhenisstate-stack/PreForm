using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Data;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class QuestionTypeCatalogueSeederTests
{
    private static AppDbContext CreateContext(string name)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(name)
            .Options;
        return new AppDbContext(options);
    }

    private static QuestionTypeCatalogueSeeder CreateSeeder() =>
        new(QuestionTypeRegistry.Instance);

    [Fact]
    public async Task SeedAsync_EmptyCatalogueAddsAllTypesAndIsIdempotent()
    {
        using var context = CreateContext(nameof(SeedAsync_EmptyCatalogueAddsAllTypesAndIsIdempotent));
        var seeder = CreateSeeder();

        await seeder.SeedAsync(context, NullLogger<QuestionTypeCatalogueSeeder>.Instance);
        await seeder.SeedAsync(context, NullLogger<QuestionTypeCatalogueSeeder>.Instance);

        var records = await context.QuestionTypeDefinitions.OrderBy(item => item.DisplayOrder).ToListAsync();
        Assert.Equal(18, records.Count);
        Assert.Equal(Enumerable.Range(1, 18).Select(index => $"qt-{index}"), records.Select(item => item.Id));
        Assert.Equal(18, records.Select(item => item.Key).Distinct().Count());
        Assert.Equal("ExactMatch", records.Single(item => item.Key == "sata").SupportedScoring);
        Assert.Equal("NotImplemented", records.Single(item => item.Key == "essay").SupportedScoring);
    }

    [Fact]
    public async Task SeedAsync_PartialCataloguePreservesExistingIdsAndAdministratorMetadata()
    {
        using var context = CreateContext(nameof(SeedAsync_PartialCataloguePreservesExistingIdsAndAdministratorMetadata));
        var existing = new QuestionTypeDefinition
        {
            Id = "custom-sata-id",
            Key = "sata",
            Name = "Administrator SATA label",
            Description = "Administrator description",
            Category = "Custom category",
            SupportedScoring = "Custom score label",
            CapabilityFlags = 0,
            ImplementationStatus = nameof(QuestionTypeStatus.Catalogued),
            IsActive = false,
            DisplayOrder = 99,
        };
        context.QuestionTypeDefinitions.Add(existing);
        await context.SaveChangesAsync();

        await CreateSeeder().SeedAsync(context, NullLogger<QuestionTypeCatalogueSeeder>.Instance);
        await CreateSeeder().SeedAsync(context, NullLogger<QuestionTypeCatalogueSeeder>.Instance);

        var records = await context.QuestionTypeDefinitions.ToListAsync();
        var preserved = records.Single(item => item.Key == "sata");
        Assert.Equal(18, records.Count);
        Assert.Equal("custom-sata-id", preserved.Id);
        Assert.Equal("Administrator SATA label", preserved.Name);
        Assert.Equal("Administrator description", preserved.Description);
        Assert.Equal("Custom category", preserved.Category);
        Assert.Equal("Custom score label", preserved.SupportedScoring);
        Assert.False(preserved.IsActive);
        Assert.Equal(99, preserved.DisplayOrder);
        Assert.Equal((int)QuestionTypeRegistry.Instance.All.Single(item => item.Key == "sata").Capabilities,
            preserved.CapabilityFlags);
        Assert.Equal(nameof(QuestionTypeStatus.GradingSupported), preserved.ImplementationStatus);
        Assert.Equal(18, records.Select(item => item.Key).Distinct().Count());
    }

    [Fact]
    public async Task SeedAsync_ExistingCompleteCataloguePreservesAllIds()
    {
        using var context = CreateContext(nameof(SeedAsync_ExistingCompleteCataloguePreservesAllIds));
        var originalIds = QuestionTypeRegistry.Instance.All.ToDictionary(
            descriptor => descriptor.Key,
            descriptor => $"existing-{descriptor.DefaultId}");
        context.QuestionTypeDefinitions.AddRange(QuestionTypeRegistry.Instance.All.Select(descriptor =>
            new QuestionTypeDefinition
            {
                Id = originalIds[descriptor.Key],
                Key = descriptor.Key,
                Name = descriptor.DefaultName,
                Description = descriptor.DefaultDescription,
                Category = descriptor.DefaultCategory,
                SupportedScoring = descriptor.DefaultScoringLabel,
                IsActive = true,
                DisplayOrder = descriptor.DefaultDisplayOrder,
            }));
        await context.SaveChangesAsync();

        await CreateSeeder().SeedAsync(context, NullLogger<QuestionTypeCatalogueSeeder>.Instance);

        var records = await context.QuestionTypeDefinitions.ToListAsync();
        Assert.Equal(originalIds, records.ToDictionary(item => item.Key, item => item.Id));
    }

    [Fact]
    public async Task SeedAsync_DuplicateKeysFailWithoutChangingRecords()
    {
        using var context = CreateContext(nameof(SeedAsync_DuplicateKeysFailWithoutChangingRecords));
        context.QuestionTypeDefinitions.AddRange(
            new QuestionTypeDefinition { Id = "first", Key = "sata", Name = "First" },
            new QuestionTypeDefinition { Id = "second", Key = "sata", Name = "Second" });
        await context.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => CreateSeeder().SeedAsync(context, NullLogger<QuestionTypeCatalogueSeeder>.Instance));

        Assert.Equal(2, await context.QuestionTypeDefinitions.CountAsync());
    }
}
