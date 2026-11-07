using System.ComponentModel.DataAnnotations;

namespace Preform.Api.DTOs;

public class StudyGuideCategoryDto
{
    public string Id { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string ShortTitle { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Badge { get; set; } = "Core";
    public string IconName { get; set; } = "BookOpen";
    public string ColorTheme { get; set; } = "teal";
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
    public int GuideCount { get; set; }
}

public class CuratedStudyGuideSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string CategoryId { get; set; } = string.Empty;
    public string CategorySlug { get; set; } = string.Empty;
    public string CategoryTitle { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string ReadTime { get; set; } = "5 min read";
    public string Difficulty { get; set; } = "High-Yield";
    public string Programme { get; set; } = "both";
    public string? ClientNeedId { get; set; }
    public string Status { get; set; } = "Published";
    public DateTime? PublishedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CuratedStudyGuideDetailDto : CuratedStudyGuideSummaryDto
{
    public List<string> ClinicalKeyTakeaways { get; set; } = new();
    public string ContentJson { get; set; } = "[]";
}

public class CreateCuratedGuideRequest
{
    [Required, MaxLength(128)]
    public string CategoryId { get; set; } = string.Empty;

    [Required, MaxLength(128)]
    public string Slug { get; set; } = string.Empty;

    [Required, MaxLength(256)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Summary { get; set; } = string.Empty;

    [MaxLength(32)]
    public string ReadTime { get; set; } = "5 min read";

    [MaxLength(32)]
    public string Difficulty { get; set; } = "High-Yield";

    [MaxLength(10)]
    public string Programme { get; set; } = "both";

    [MaxLength(32)]
    public string? ClientNeedId { get; set; }

    public List<string>? ClinicalKeyTakeaways { get; set; }

    [Required]
    public string ContentJson { get; set; } = "[]";

    [MaxLength(32)]
    public string Status { get; set; } = "Draft";

    public DateTime? ScheduledPublishAt { get; set; }
}

public class UpdateCuratedGuideRequest
{
    [MaxLength(128)]
    public string? CategoryId { get; set; }

    [MaxLength(128)]
    public string? Slug { get; set; }

    [MaxLength(256)]
    public string? Title { get; set; }

    [MaxLength(1024)]
    public string? Summary { get; set; }

    [MaxLength(32)]
    public string? ReadTime { get; set; }

    [MaxLength(32)]
    public string? Difficulty { get; set; }

    [MaxLength(10)]
    public string? Programme { get; set; }

    [MaxLength(32)]
    public string? ClientNeedId { get; set; }

    public List<string>? ClinicalKeyTakeaways { get; set; }

    public string? ContentJson { get; set; }

    [MaxLength(32)]
    public string? Status { get; set; }

    public string? ChangeSummary { get; set; }
}

public class CreateStudyGuideCategoryRequest
{
    [Required, MaxLength(128)]
    public string Slug { get; set; } = string.Empty;

    [Required, MaxLength(160)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(64)]
    public string ShortTitle { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(64)]
    public string Badge { get; set; } = "Core";

    [MaxLength(64)]
    public string IconName { get; set; } = "BookOpen";

    [MaxLength(32)]
    public string ColorTheme { get; set; } = "teal";

    public int DisplayOrder { get; set; } = 0;
}

public class UpdateStudyGuideCategoryRequest
{
    [MaxLength(128)]
    public string? Slug { get; set; }

    [MaxLength(160)]
    public string? Title { get; set; }

    [MaxLength(64)]
    public string? ShortTitle { get; set; }

    [MaxLength(1024)]
    public string? Description { get; set; }

    [MaxLength(64)]
    public string? Badge { get; set; }

    [MaxLength(64)]
    public string? IconName { get; set; }

    [MaxLength(32)]
    public string? ColorTheme { get; set; }

    public int? DisplayOrder { get; set; }

    public bool? IsActive { get; set; }
}
