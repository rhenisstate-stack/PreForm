using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

public interface IQuestionTypeService
{
    Task<List<QuestionTypeDto>> GetAllQuestionTypesAsync(CancellationToken cancellationToken = default);
    Task<QuestionTypeDto?> GetQuestionTypeByKeyAsync(string key, CancellationToken cancellationToken = default);
    Task<ValidateQuestionTypeResponse> ValidateQuestionTypeKeyAsync(string key, CancellationToken cancellationToken = default);
}

public sealed class QuestionTypeService : IQuestionTypeService
{
    private readonly AppDbContext _context;
    private readonly IQuestionTypeRegistry _registry;

    public QuestionTypeService(AppDbContext context, IQuestionTypeRegistry registry)
    {
        _context = context;
        _registry = registry;
    }

    public async Task<List<QuestionTypeDto>> GetAllQuestionTypesAsync(
        CancellationToken cancellationToken = default)
    {
        var records = await _context.QuestionTypeDefinitions
            .Where(definition => definition.IsActive)
            .OrderBy(definition => definition.DisplayOrder)
            .ThenBy(definition => definition.Key)
            .ToListAsync(cancellationToken);

        var duplicateKeys = records
            .GroupBy(definition => definition.Key, StringComparer.Ordinal)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .ToArray();
        if (duplicateKeys.Length > 0)
        {
            throw new InvalidOperationException(
                $"Question-type catalogue contains duplicate canonical keys: {string.Join(", ", duplicateKeys)}.");
        }

        if (records.Any(definition => !_registry.TryGet(definition.Key, out _)))
        {
            throw new InvalidOperationException("Question-type catalogue contains unregistered keys.");
        }

        return records.Select(ToDto).ToList();
    }

    public async Task<QuestionTypeDto?> GetQuestionTypeByKeyAsync(
        string key,
        CancellationToken cancellationToken = default)
    {
        if (!_registry.TryGet(key, out _))
        {
            return null;
        }

        var normalizedKey = key.Trim();
        var definition = await _context.QuestionTypeDefinitions
            .FirstOrDefaultAsync(
                item => item.Key == normalizedKey && item.IsActive,
                cancellationToken);

        return definition is null ? null : ToDto(definition);
    }

    public async Task<ValidateQuestionTypeResponse> ValidateQuestionTypeKeyAsync(
        string key,
        CancellationToken cancellationToken = default)
    {
        if (!_registry.TryGet(key, out var descriptor))
        {
            return new ValidateQuestionTypeResponse
            {
                Valid = false,
                Error = "Question type is unknown or unavailable.",
            };
        }

        var normalizedKey = descriptor.Key;
        var isActive = await _context.QuestionTypeDefinitions
            .AnyAsync(item => item.Key == normalizedKey && item.IsActive, cancellationToken);

        return isActive
            ? new ValidateQuestionTypeResponse
            {
                Valid = true,
                IsActive = true,
                Key = descriptor.Key,
            }
            : new ValidateQuestionTypeResponse
            {
                Valid = false,
                IsActive = false,
                Error = "Question type is unknown or unavailable.",
            };
    }

    private QuestionTypeDto ToDto(QuestionTypeDefinition definition)
    {
        if (!_registry.TryGet(definition.Key, out var descriptor))
        {
            throw new InvalidOperationException(
                $"Question-type definition '{definition.Key}' is not registered.");
        }

        var publicCapabilities = NormalizePublicCapabilities(descriptor);

        return new QuestionTypeDto
        {
            Key = descriptor.Key,
            Name = definition.Name,
            Description = definition.Description,
            Category = definition.Category,
            DisplayOrder = definition.DisplayOrder,
            SupportedScoring = ScoringLabel(descriptor),
            SupportedScoringModes = descriptor.SupportedScoringModes
                .Select(ToScoringModeKey)
                .ToList(),
            CapabilityFlags = (int)publicCapabilities,
            Capabilities = Enum.GetValues<QuestionTypeCapability>()
                .Where(capability => capability != QuestionTypeCapability.None
                    && (publicCapabilities & capability) != 0)
                .Select(capability => capability.ToString())
                .Distinct(StringComparer.Ordinal)
                .ToList(),
            CapabilityDetails = ToCapabilityDto(descriptor),
            ImplementationStatus = descriptor.ImplementationStatus.ToString(),
            ContractVersion = descriptor.ContractVersion,
            IsActive = definition.IsActive,
        };
    }

    private static QuestionTypeCapabilitiesDto ToCapabilityDto(QuestionTypeDescriptor descriptor)
    {
        var publicCapabilities = NormalizePublicCapabilities(descriptor);
        bool Includes(QuestionTypeCapability capability) => (publicCapabilities & capability) != 0;

        return new QuestionTypeCapabilitiesDto
        {
            SupportsOptions = Includes(QuestionTypeCapability.SupportsOptions),
            SupportsMultipleSelections = Includes(QuestionTypeCapability.SupportsMultipleSelections),
            SupportsAuthoring = descriptor.SupportsAuthoring,
            SupportsDelivery = descriptor.SupportsDelivery,
            SupportsMedia = Includes(QuestionTypeCapability.SupportsMedia),
            SupportsClinicalScenario = Includes(QuestionTypeCapability.SupportsClinicalScenario),
            SupportsExhibits = Includes(QuestionTypeCapability.SupportsExhibits),
            SupportsStructuredResponse = Includes(QuestionTypeCapability.SupportsStructuredResponse),
            SupportsAutomaticGrading = Includes(QuestionTypeCapability.SupportsAutomaticGrading),
            SupportsManualGrading = Includes(QuestionTypeCapability.SupportsManualGrading),
            SupportsPartialCredit = Includes(QuestionTypeCapability.SupportsPartialCredit),
            SupportsRandomization = Includes(QuestionTypeCapability.SupportsRandomizedOptions),
            RequiresSpecializedRenderer = Includes(QuestionTypeCapability.RequiresSpecializedRenderer),
            RequiresSpecializedResponseValidator =
                Includes(QuestionTypeCapability.RequiresSpecializedResponseValidator),
        };
    }

    private static QuestionTypeCapability NormalizePublicCapabilities(QuestionTypeDescriptor descriptor)
    {
        var capabilities = descriptor.Capabilities;
        var supportsPartialCredit = descriptor.SupportedScoringModes.Contains(QuestionScoringMode.AutomaticPartialCredit);
        if (!supportsPartialCredit)
        {
            capabilities &= ~QuestionTypeCapability.SupportsPartialCredit;
        }

        return capabilities;
    }

    private static string ScoringLabel(QuestionTypeDescriptor descriptor)
    {
        return descriptor.SupportedScoringModes.Single() switch
        {
            QuestionScoringMode.AutomaticExactMatch => "ExactMatch",
            QuestionScoringMode.AutomaticPartialCredit => "PartialCredit",
            QuestionScoringMode.Manual => "Manual",
            QuestionScoringMode.NotImplemented => "NotImplemented",
            _ => throw new ArgumentOutOfRangeException(
                nameof(descriptor),
                descriptor.SupportedScoringModes.Single(),
                "Unknown question scoring mode."),
        };
    }

    private static string ToScoringModeKey(QuestionScoringMode mode)
    {
        return mode switch
        {
            QuestionScoringMode.AutomaticExactMatch => "automatic-exact-match",
            QuestionScoringMode.AutomaticPartialCredit => "automatic-partial-credit",
            QuestionScoringMode.Manual => "manual",
            QuestionScoringMode.NotImplemented => "not-implemented",
            _ => throw new ArgumentOutOfRangeException(nameof(mode), mode, "Unknown question scoring mode."),
        };
    }
}
