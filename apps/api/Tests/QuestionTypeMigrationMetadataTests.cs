using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using Preform.Api.Data;
using Preform.Api.Models;
using Xunit;

namespace Preform.Api.Tests;

public class QuestionTypeMigrationMetadataTests
{
    [Fact]
    public void CapabilityMigrationIsDiscoverableByEfCore()
    {
        var migrationIds = typeof(AppDbContext).Assembly
            .GetTypes()
            .SelectMany(type => type.GetCustomAttributes<MigrationAttribute>())
            .Select(attribute => attribute.Id);

        Assert.Contains("20261102060000_AddQuestionTypeCapabilityAndStatus", migrationIds);
    }

    [Fact]
    public void QuestionTypeKeyHasAUniqueEfModelIndex()
    {
        var context = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

        var entityType = context.Model.FindEntityType(typeof(QuestionTypeDefinition));
        var keyIndex = Assert.Single(entityType!.GetIndexes(), index =>
            index.Properties.Count == 1 && index.Properties[0].Name == nameof(QuestionTypeDefinition.Key));

        Assert.True(keyIndex.IsUnique);
    }
}
