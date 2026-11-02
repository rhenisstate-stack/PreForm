using System.Text;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

public interface IQuestionTypeContractValidator
{
    Task<QuestionTypePayloadValidationResult> ValidateAsync(
        QuestionTypePayloadEnvelope? envelope,
        int? optionCount = null,
        CancellationToken cancellationToken = default);
}

public sealed class QuestionTypeContractValidator : IQuestionTypeContractValidator
{
    private const int MaximumPayloadBytes = 64 * 1024;
    private const int MaximumOptionCount = 250;

    private readonly IQuestionTypeRegistry _registry;
    private readonly IQuestionTypeService _questionTypeService;

    public QuestionTypeContractValidator(
        IQuestionTypeRegistry registry,
        IQuestionTypeService questionTypeService)
    {
        _registry = registry;
        _questionTypeService = questionTypeService;
    }

    public async Task<QuestionTypePayloadValidationResult> ValidateAsync(
        QuestionTypePayloadEnvelope? envelope,
        int? optionCount = null,
        CancellationToken cancellationToken = default)
    {
        if (envelope is null || string.IsNullOrWhiteSpace(envelope.TypeKey))
        {
            return Invalid("invalid-envelope");
        }

        if (!_registry.TryGet(envelope.TypeKey, out var descriptor))
        {
            return Invalid("unknown-type");
        }

        if (envelope.ContractVersion != descriptor.ContractVersion)
        {
            return Invalid("unsupported-contract-version");
        }

        if (envelope.Payload.ValueKind == System.Text.Json.JsonValueKind.Undefined)
        {
            return Invalid("missing-payload");
        }

        if (Encoding.UTF8.GetByteCount(envelope.Payload.GetRawText()) > MaximumPayloadBytes)
        {
            return Invalid("payload-too-large");
        }

        if (await _questionTypeService.GetQuestionTypeByKeyAsync(envelope.TypeKey, cancellationToken) is null)
        {
            return Invalid("unknown-type");
        }

        if (envelope.Kind != QuestionTypePayloadKind.Response
            || descriptor.GradingStrategy != QuestionTypeGradingStrategy.OptionExactMatch
            || (descriptor.Capabilities & QuestionTypeCapability.RequiresSpecializedRenderer) != 0)
        {
            return Invalid("unsupported-payload-kind");
        }

        if (optionCount is null or <= 0 or > MaximumOptionCount
            || envelope.Payload.ValueKind != System.Text.Json.JsonValueKind.Array)
        {
            return Invalid("invalid-response-shape");
        }

        var selectedIndices = new HashSet<int>();
        foreach (var item in envelope.Payload.EnumerateArray())
        {
            if (!item.TryGetInt32(out var index) || index < 0 || index >= optionCount.Value
                || !selectedIndices.Add(index))
            {
                return Invalid("invalid-response-value");
            }
        }

        if (descriptor.Key is "single-choice" or "true-false" && selectedIndices.Count != 1)
        {
            return Invalid("invalid-selection-count");
        }

        return new QuestionTypePayloadValidationResult { IsValid = true };
    }

    private static QuestionTypePayloadValidationResult Invalid(string errorCode) =>
        new() { IsValid = false, ErrorCode = errorCode };
}
