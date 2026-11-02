using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace Preform.Api.DTOs;

public enum QuestionTypePayloadKind
{
    Content,
    Response,
}

public sealed class QuestionTypePayloadEnvelope
{
    [Required]
    [MaxLength(64)]
    public string TypeKey { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int ContractVersion { get; set; }

    public QuestionTypePayloadKind Kind { get; set; }

    public JsonElement Payload { get; set; }
}

public sealed class QuestionTypePayloadValidationResult
{
    public bool IsValid { get; init; }
    public string? ErrorCode { get; init; }
}
