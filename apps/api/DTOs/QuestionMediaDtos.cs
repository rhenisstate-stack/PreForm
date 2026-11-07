namespace Preform.Api.DTOs;

public class QuestionMediaDto
{
    public string Id { get; set; } = string.Empty;
    public string? QuestionId { get; set; }
    public string FieldKey { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string Sha256Hash { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class QuestionMediaBinaryDto
{
    public string Id { get; set; } = string.Empty;
    public string? QuestionId { get; set; }
    public string ContentType { get; set; } = "image/png";
    public long FileSizeBytes { get; set; }
    public string Sha256Hash { get; set; } = string.Empty;
    public byte[] ImageData { get; set; } = Array.Empty<byte>();
    public DateTime UpdatedAt { get; set; }
}

public class QuestionMediaUploadResponse
{
    public bool Success { get; set; } = true;
    public QuestionMediaDto Media { get; set; } = null!;
    public string? Error { get; set; }
}
