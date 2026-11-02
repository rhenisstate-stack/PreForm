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

        return records
            .Where(definition => _registry.TryGet(definition.Key, out _))
            .Select(ToDto)
            .ToList();
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

        return new QuestionTypeDto
        {
            Key = descriptor.Key,
            Name = definition.Name,
            Description = definition.Description,
            Category = definition.Category,
            SupportedScoring = LegacyScoringValue(descriptor),
            SupportedScoringModes = descriptor.SupportedScoringModes
                .Select(ToScoringModeKey)
                .ToList(),
            CapabilityFlags = (int)descriptor.Capabilities,
            Capabilities = Enum.GetValues<QuestionTypeCapability>()
                .Where(capability => capability != QuestionTypeCapability.None
                    && (descriptor.Capabilities & capability) != 0
                    && capability != QuestionTypeCapability.SupportsClinicalScenarios)
                .Select(capability => capability.ToString())
                .ToList(),
            CapabilityDetails = ToCapabilityDto(descriptor.Capabilities),
            ImplementationStatus = descriptor.ImplementationStatus.ToString(),
            ContractVersion = descriptor.ContractVersion,
            IsActive = definition.IsActive,
            DisplayOrder = definition.DisplayOrder,
        };
    }

    private static QuestionTypeCapabilitiesDto ToCapabilityDto(QuestionTypeCapability capabilities)
    {
        bool Includes(QuestionTypeCapability capability) => (capabilities & capability) != 0;

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

    private static string LegacyScoringValue(QuestionTypeDescriptor descriptor)
    {
        return descriptor.SupportedScoringModes.Single() switch
        {
            QuestionScoringMode.AutomaticExactMatch => "ExactMatch",
            QuestionScoringMode.AutomaticPartialCredit => "PartialCredit",
            QuestionScoringMode.Manual => "Manual",
            _ => "NotImplemented",
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
