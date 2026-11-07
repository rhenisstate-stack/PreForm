using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Preform.Api.Data;
using Preform.Api.Models;

namespace Preform.Api.Services;

public sealed class QuestionTypeCatalogueSeeder
{
    private readonly IQuestionTypeRegistry _registry;

    public QuestionTypeCatalogueSeeder(IQuestionTypeRegistry registry)
    {
        _registry = registry;
    }

    public async Task SeedAsync(
        AppDbContext context,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        await using IDbContextTransaction? transaction = context.Database.IsRelational()
            ? await context.Database.BeginTransactionAsync(cancellationToken)
            : null;

        var records = await context.QuestionTypeDefinitions.ToListAsync(cancellationToken);
        var duplicateKeys = records
            .GroupBy(record => record.Key, StringComparer.Ordinal)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .ToArray();

        if (duplicateKeys.Length > 0)
        {
            throw new InvalidOperationException(
                $"Question-type catalogue contains duplicate canonical keys: {string.Join(", ", duplicateKeys)}.");
        }

        var existingByKey = records.ToDictionary(record => record.Key, StringComparer.Ordinal);
        var existingIds = records.Select(record => record.Id).ToHashSet(StringComparer.Ordinal);
        var addedCount = 0;
        var reconciledCount = 0;

        foreach (var descriptor in _registry.All)
        {
            if (!existingByKey.TryGetValue(descriptor.Key, out var existing))
            {
                var id = existingIds.Add(descriptor.DefaultId)
                    ? descriptor.DefaultId
                    : Guid.NewGuid().ToString();

                context.QuestionTypeDefinitions.Add(new QuestionTypeDefinition
                {
                    Id = id,
                    Key = descriptor.Key,
                    Name = descriptor.DefaultName,
                    Description = descriptor.DefaultDescription,
                    Category = descriptor.DefaultCategory,
                    SupportedScoring = descriptor.DefaultScoringLabel,
                    CapabilityFlags = (int)descriptor.Capabilities,
                    ImplementationStatus = descriptor.ImplementationStatus.ToString(),
                    IsActive = true,
                    DisplayOrder = descriptor.DefaultDisplayOrder,
                    IsSystemDefined = true,
                    IsArchived = false,
                    SupportedPathways = "both",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
                addedCount++;
                continue;
            }

            var changed = false;
            if (!existing.IsSystemDefined)
            {
                existing.IsSystemDefined = true;
                changed = true;
            }
            var capabilityFlags = (int)descriptor.Capabilities;
            if (existing.CapabilityFlags != capabilityFlags)
            {
                existing.CapabilityFlags = capabilityFlags;
                changed = true;
            }

            var implementationStatus = descriptor.ImplementationStatus.ToString();
            if (!string.Equals(existing.ImplementationStatus, implementationStatus, StringComparison.Ordinal))
            {
                existing.ImplementationStatus = implementationStatus;
                changed = true;
            }

            if (changed)
            {
                reconciledCount++;
            }
        }

        var unknownKeys = records
            .Where(record => !_registry.TryGet(record.Key, out _))
            .Select(record => record.Key)
            .ToArray();
        if (unknownKeys.Length > 0)
        {
            logger.LogWarning(
                "Question-type catalogue contains unregistered keys that were preserved: {Keys}",
                string.Join(", ", unknownKeys));
        }

        if (addedCount > 0 || reconciledCount > 0)
        {
            await context.SaveChangesAsync(cancellationToken);
        }

        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        logger.LogInformation(
            "Question-type catalogue reconciliation complete (added: {AddedCount}, code-owned fields updated: {UpdatedCount}).",
            addedCount,
            reconciledCount);
    }
}
