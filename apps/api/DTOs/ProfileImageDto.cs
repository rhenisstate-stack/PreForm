namespace Preform.Api.DTOs;

public class ProfileImageMetadataDto
{
    public string UserId { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public int SizeBytes { get; set; }
    public string Sha256Hash { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
}

public class ProfileImageBinaryDto
{
    public byte[] ImageData { get; set; } = Array.Empty<byte>();
    public string ContentType { get; set; } = "image/png";
    public int SizeBytes { get; set; }
    public string Sha256Hash { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
}
