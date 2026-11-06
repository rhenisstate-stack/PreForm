using System.ComponentModel.DataAnnotations;

namespace Preform.Api.DTOs;

public class CourseDto
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string ProgrammeId { get; set; } = string.Empty;
    public string ProgrammeName { get; set; } = string.Empty;
    public string Pathway { get; set; } = "rn";
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsPublished { get; set; }
    public bool IsActive { get; set; }
    public int SubjectDomainCount { get; set; }
    public int QuestionCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateCourseRequest
{
    public string ProgrammeId { get; set; } = string.Empty;

    [MaxLength(16)]
    public string? Pathway { get; set; }

    [MaxLength(32)]
    public string? Code { get; set; }

    [Required]
    [MaxLength(128)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    public int DisplayOrder { get; set; } = 0;
    public bool IsPublished { get; set; } = true;
    public bool IsActive { get; set; } = true;
}

public class UpdateCourseRequest
{
    [MaxLength(128)]
    public string? Title { get; set; }

    [MaxLength(32)]
    public string? Code { get; set; }

    public string? ProgrammeId { get; set; }

    [MaxLength(16)]
    public string? Pathway { get; set; }

    [MaxLength(1024)]
    public string? Description { get; set; }

    public int? DisplayOrder { get; set; }
    public bool? IsPublished { get; set; }
    public bool? IsActive { get; set; }
}

public class SubjectDomainDto
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string CourseId { get; set; } = string.Empty;
    public string CourseTitle { get; set; } = string.Empty;
    public string Pathway { get; set; } = "rn";
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
    public int CategoryCount { get; set; }
    public int QuestionCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateSubjectDomainRequest
{
    [Required]
    public string CourseId { get; set; } = string.Empty;

    [MaxLength(32)]
    public string? Code { get; set; }

    [Required]
    [MaxLength(128)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    public int DisplayOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}

public class UpdateSubjectDomainRequest
{
    [MaxLength(128)]
    public string? Title { get; set; }

    [MaxLength(32)]
    public string? Code { get; set; }

    public string? CourseId { get; set; }

    [MaxLength(1024)]
    public string? Description { get; set; }

    public int? DisplayOrder { get; set; }
    public bool? IsActive { get; set; }
}

public class CategoryDto
{
    public string Id { get; set; } = string.Empty;
    public string SubjectDomainId { get; set; } = string.Empty;
    public string SubjectDomainTitle { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
    public int SubcategoryCount { get; set; }
    public int QuestionCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateCategoryRequest
{
    [Required]
    public string SubjectDomainId { get; set; } = string.Empty;

    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? Slug { get; set; }

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    public int DisplayOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}

public class UpdateCategoryRequest
{
    [MaxLength(128)]
    public string? Name { get; set; }

    [MaxLength(128)]
    public string? Slug { get; set; }

    [MaxLength(1024)]
    public string? Description { get; set; }

    public int? DisplayOrder { get; set; }
    public bool? IsActive { get; set; }
}

public class SubcategoryDto
{
    public string Id { get; set; } = string.Empty;
    public string CategoryId { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
    public int TopicCount { get; set; }
    public int QuestionCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateSubcategoryRequest
{
    [Required]
    public string CategoryId { get; set; } = string.Empty;

    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? Slug { get; set; }

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    public int DisplayOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}

public class UpdateSubcategoryRequest
{
    [MaxLength(128)]
    public string? Name { get; set; }

    [MaxLength(128)]
    public string? Slug { get; set; }

    [MaxLength(1024)]
    public string? Description { get; set; }

    public int? DisplayOrder { get; set; }
    public bool? IsActive { get; set; }
}

public class TopicDto
{
    public string Id { get; set; } = string.Empty;
    public string SubcategoryId { get; set; } = string.Empty;
    public string SubcategoryName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsPublished { get; set; }
    public bool IsActive { get; set; }
    public int QuestionCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateTopicRequest
{
    [Required]
    public string SubcategoryId { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Summary { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    public int DisplayOrder { get; set; } = 0;
    public bool IsPublished { get; set; } = true;
    public bool IsActive { get; set; } = true;
}

public class UpdateTopicRequest
{
    [MaxLength(256)]
    public string? Title { get; set; }

    [MaxLength(1024)]
    public string? Summary { get; set; }

    public string? Content { get; set; }

    public int? DisplayOrder { get; set; }
    public bool? IsPublished { get; set; }
    public bool? IsActive { get; set; }
}

public class ClientNeedDto
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
    public string Pathway { get; set; } = "both";
    public int QuestionCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateClientNeedRequest
{
    [Required]
    [MaxLength(32)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    public int DisplayOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;

    [MaxLength(10)]
    public string Pathway { get; set; } = "both";
}

public class UpdateClientNeedRequest
{
    [MaxLength(32)]
    public string? Code { get; set; }

    [MaxLength(256)]
    public string? Name { get; set; }

    [MaxLength(1024)]
    public string? Description { get; set; }

    public int? DisplayOrder { get; set; }
    public bool? IsActive { get; set; }

    [MaxLength(10)]
    public string? Pathway { get; set; }
}

public class CurriculumTreeNodeDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // "course", "domain", "category", "subcategory", "topic"
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
    public int QuestionCount { get; set; }
    public List<CurriculumTreeNodeDto> Children { get; set; } = new();
}
