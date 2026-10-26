namespace Preform.Api.Models;

public enum ProgrammeCode
{
    RN,
    PN
}

public class Programme
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public ProgrammeCode Code { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
