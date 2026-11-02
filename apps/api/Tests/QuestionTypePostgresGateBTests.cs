using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Npgsql;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

[CollectionDefinition("PostgreSQL integration tests", DisableParallelization = true)]
public sealed class PostgreSqlIntegrationTestCollection
{
}

[Collection("PostgreSQL integration tests")]
public sealed class QuestionTypePostgresGateBTests : IClassFixture<PostgresTestFixture>
{
    private readonly PostgresTestFixture _factory;

    public QuestionTypePostgresGateBTests(PostgresTestFixture factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ReconciliationRollbackAndHttpCatalogueUsePostgresSafely()
    {
        await _factory.InitializePostgresDatabaseAsync();

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var registry = QuestionTypeRegistry.Instance;
        var seeder = new QuestionTypeCatalogueSeeder(registry);
        var baseline = await CaptureQuestionTypesAsync(context);

        Assert.Equal(18, baseline.Count);
        Assert.Equal(
            Enumerable.Range(1, 18).Select(index => $"qt-{index}"),
            baseline.OrderBy(item => item.DisplayOrder).Select(item => item.Id));

        const string rollbackConstraint = "CK_GateB_ForceReconciliationFailure";
        var rollbackConstraintCreated = false;
        try
        {
            var logger = new CapturingLogger();
            var beforeRepeatedRuns = await CaptureQuestionTypesAsync(context);
            for (var run = 0; run < 3; run++)
            {
                await seeder.SeedAsync(context, logger);
            }

            Assert.Equal(beforeRepeatedRuns, await CaptureQuestionTypesAsync(context));

            var sata = await context.QuestionTypeDefinitions.SingleAsync(item => item.Key == "sata");
            sata.Name = "Administrator SATA label";
            sata.Description = "Administrator-owned description";
            sata.Category = "Administrator category";
            sata.SupportedScoring = "Administrator scoring label";
            sata.IsActive = false;
            sata.DisplayOrder = 99;
            await context.SaveChangesAsync();

            await seeder.SeedAsync(context, logger);
            sata = await context.QuestionTypeDefinitions.SingleAsync(item => item.Key == "sata");
            Assert.Equal("Administrator SATA label", sata.Name);
            Assert.Equal("Administrator-owned description", sata.Description);
            Assert.Equal("Administrator category", sata.Category);
            Assert.Equal("Administrator scoring label", sata.SupportedScoring);
            Assert.False(sata.IsActive);
            Assert.Equal(99, sata.DisplayOrder);
            var sataDescriptor = registry.All.Single(item => item.Key == "sata");
            Assert.Equal((int)sataDescriptor.Capabilities, sata.CapabilityFlags);
            Assert.Equal(sataDescriptor.ImplementationStatus.ToString(), sata.ImplementationStatus);

            var dynamicLabId =
                (await context.QuestionTypeDefinitions.SingleAsync(item => item.Key == "dynamic-lab")).Id;
            await context.QuestionTypeDefinitions
                .Where(item => item.Key == "dynamic-lab")
                .ExecuteDeleteAsync();
            context.ChangeTracker.Clear();
            await seeder.SeedAsync(context, logger);
            var recreated = await context.QuestionTypeDefinitions.SingleAsync(item => item.Key == "dynamic-lab");
            Assert.Equal(dynamicLabId, recreated.Id);
            Assert.Equal(
                (int)registry.All.Single(item => item.Key == "dynamic-lab").Capabilities,
                recreated.CapabilityFlags);

            context.QuestionTypeDefinitions.Add(new QuestionTypeDefinition
            {
                Id = "gateb-unknown-key",
                Key = "gateb-unknown-key",
                Name = "Unknown test type",
                Description = string.Empty,
                Category = "Test",
                SupportedScoring = "NotImplemented",
                IsActive = false,
                DisplayOrder = 999,
            });
            await context.SaveChangesAsync();
            await seeder.SeedAsync(context, logger);
            Assert.Contains(logger.Warnings, warning =>
                warning.Contains("gateb-unknown-key", StringComparison.Ordinal));

            var duplicateId = Guid.NewGuid().ToString();
            const string duplicateKey = "sata";
            await Assert.ThrowsAsync<PostgresException>(() =>
                context.Database.ExecuteSqlInterpolatedAsync(
                    $"INSERT INTO public.\"QuestionTypeDefinitions\" (\"Id\", \"Key\", \"Name\", \"Description\", \"Category\", \"SupportedScoring\", \"IsActive\", \"DisplayOrder\") VALUES ({duplicateId}, {duplicateKey}, {\"Duplicate\"}, {string.Empty}, {\"Test\"}, {\"ExactMatch\"}, {true}, {1000})"));

            await context.QuestionTypeDefinitions
                .Where(item => item.Key == "gateb-unknown-key")
                .ExecuteDeleteAsync();
            context.ChangeTracker.Clear();

            var sataForFailure = await context.QuestionTypeDefinitions.SingleAsync(item => item.Key == "sata");
            sataForFailure.CapabilityFlags = 0;
            sataForFailure.ImplementationStatus = nameof(QuestionTypeStatus.Catalogued);
            await context.SaveChangesAsync();
            await context.QuestionTypeDefinitions
                .Where(item => item.Key == "essay")
                .ExecuteDeleteAsync();
            context.ChangeTracker.Clear();

            await context.Database.ExecuteSqlRawAsync(
                $"ALTER TABLE public.\"QuestionTypeDefinitions\" ADD CONSTRAINT \"{rollbackConstraint}\" CHECK (\"Key\" <> 'sata' OR \"ImplementationStatus\" <> 'GradingSupported')");
            rollbackConstraintCreated = true;

            await using (var failureScope = _factory.Services.CreateAsyncScope())
            {
                var failureContext = failureScope.ServiceProvider.GetRequiredService<AppDbContext>();
                await Assert.ThrowsAsync<DbUpdateException>(() =>
                    seeder.SeedAsync(failureContext, logger));
            }

            await using (var verifyScope = _factory.Services.CreateAsyncScope())
            {
                var verifyContext = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
                var unchangedSata = await verifyContext.QuestionTypeDefinitions.SingleAsync(item => item.Key == "sata");
                Assert.Equal(0, unchangedSata.CapabilityFlags);
                Assert.Equal(nameof(QuestionTypeStatus.Catalogued), unchangedSata.ImplementationStatus);
                Assert.False(await verifyContext.QuestionTypeDefinitions.AnyAsync(item => item.Key == "essay"));
            }

            await context.Database.ExecuteSqlRawAsync(
                $"ALTER TABLE public.\"QuestionTypeDefinitions\" DROP CONSTRAINT \"{rollbackConstraint}\"");
            rollbackConstraintCreated = false;
            context.ChangeTracker.Clear();
            await seeder.SeedAsync(context, logger);

            sata = await context.QuestionTypeDefinitions.SingleAsync(item => item.Key == "sata");
            sata.Name = "PostgreSQL-backed SATA";
            sata.IsActive = true;
            await context.SaveChangesAsync();
            var essay = await context.QuestionTypeDefinitions.SingleAsync(item => item.Key == "essay");
            essay.IsActive = false;
            await context.SaveChangesAsync();

            var client = _factory.CreateClient();
            var beforeValidation = await CaptureQuestionTypesAsync(context);
            var listResponse = await client.GetAsync("/api/v1/question-types");
            listResponse.EnsureSuccessStatusCode();
            using var listJson = JsonDocument.Parse(await listResponse.Content.ReadAsStringAsync());
            var items = listJson.RootElement.GetProperty("items").EnumerateArray().ToArray();
            Assert.Equal(17, listJson.RootElement.GetProperty("count").GetInt32());
            Assert.DoesNotContain(items, item => item.GetProperty("key").GetString() == "essay");
            Assert.Equal(
                items.OrderBy(item => item.GetProperty("displayOrder").GetInt32())
                    .ThenBy(item => item.GetProperty("key").GetString(), StringComparer.Ordinal)
                    .Select(item => item.GetProperty("key").GetString()),
                items.Select(item => item.GetProperty("key").GetString()));
            Assert.Contains(items, item => item.GetProperty("name").GetString() == "PostgreSQL-backed SATA");
            Assert.All(items, item => Assert.False(item.TryGetProperty("id", out _)));
            Assert.DoesNotContain("answerKey", listJson.RootElement.GetRawText(), StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain(
                "gradingConfiguration",
                listJson.RootElement.GetRawText(),
                StringComparison.OrdinalIgnoreCase);

            var inactiveResponse = await client.GetAsync("/api/v1/question-types/essay");
            var unknownResponse = await client.GetAsync("/api/v1/question-types/unregistered-key");
            Assert.Equal(HttpStatusCode.NotFound, inactiveResponse.StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, unknownResponse.StatusCode);
            Assert.Equal(
                await inactiveResponse.Content.ReadAsStringAsync(),
                await unknownResponse.Content.ReadAsStringAsync());

            var validationResponse = await client.PostAsJsonAsync("/api/v1/question-types/validate", new
            {
                Key = "single-choice",
            });
            validationResponse.EnsureSuccessStatusCode();
            var validation = await validationResponse.Content.ReadFromJsonAsync<ValidateQuestionTypeResponse>();
            Assert.NotNull(validation);
            Assert.True(validation.Valid);
            Assert.Equal(beforeValidation, await CaptureQuestionTypesAsync(context));

            await context.QuestionTypeDefinitions
                .ExecuteUpdateAsync(update => update.SetProperty(item => item.IsActive, false));
            var emptyCatalogueResponse = await client.GetAsync("/api/v1/question-types");
            emptyCatalogueResponse.EnsureSuccessStatusCode();
            var emptyCatalogue =
                await emptyCatalogueResponse.Content.ReadFromJsonAsync<QuestionTypeCatalogueResponse>();
            Assert.NotNull(emptyCatalogue);
            Assert.Equal(0, emptyCatalogue.Count);
            Assert.Empty(emptyCatalogue.Items);
        }
        finally
        {
            if (rollbackConstraintCreated)
            {
                await context.Database.ExecuteSqlRawAsync(
                    $"ALTER TABLE public.\"QuestionTypeDefinitions\" DROP CONSTRAINT IF EXISTS \"{rollbackConstraint}\"");
            }

            await RestoreQuestionTypeBaselineAsync(context, baseline);
        }
    }

    private static async Task<List<QuestionTypeSnapshot>> CaptureQuestionTypesAsync(AppDbContext context) =>
        await context.QuestionTypeDefinitions
            .OrderBy(item => item.Key)
            .Select(item => new QuestionTypeSnapshot(
                item.Id,
                item.Key,
                item.Name,
                item.Description,
                item.Category,
                item.SupportedScoring,
                item.CapabilityFlags,
                item.ImplementationStatus,
                item.IsActive,
                item.DisplayOrder))
            .ToListAsync();

    private static async Task RestoreQuestionTypeBaselineAsync(
        AppDbContext context,
        IReadOnlyCollection<QuestionTypeSnapshot> baseline)
    {
        context.ChangeTracker.Clear();
        var current = await context.QuestionTypeDefinitions.ToListAsync();
        var baselineKeys = baseline.Select(item => item.Key).ToHashSet(StringComparer.Ordinal);
        context.QuestionTypeDefinitions.RemoveRange(current.Where(item => !baselineKeys.Contains(item.Key)));

        foreach (var snapshot in baseline)
        {
            var record = current.SingleOrDefault(item => item.Key == snapshot.Key);
            if (record is null)
            {
                record = new QuestionTypeDefinition { Key = snapshot.Key };
                context.QuestionTypeDefinitions.Add(record);
            }

            record.Id = snapshot.Id;
            record.Name = snapshot.Name;
            record.Description = snapshot.Description;
            record.Category = snapshot.Category;
            record.SupportedScoring = snapshot.SupportedScoring;
            record.CapabilityFlags = snapshot.CapabilityFlags;
            record.ImplementationStatus = snapshot.ImplementationStatus;
            record.IsActive = snapshot.IsActive;
            record.DisplayOrder = snapshot.DisplayOrder;
        }

        await context.SaveChangesAsync();
    }

    private sealed record QuestionTypeSnapshot(
        string Id,
        string Key,
        string Name,
        string Description,
        string Category,
        string SupportedScoring,
        int CapabilityFlags,
        string ImplementationStatus,
        bool IsActive,
        int DisplayOrder);

    private sealed class CapturingLogger : ILogger
    {
        public List<string> Warnings { get; } = new();

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
            where TState : notnull
        {
            if (logLevel == LogLevel.Warning)
            {
                Warnings.Add(formatter(state, exception));
            }
        }
    }
}
