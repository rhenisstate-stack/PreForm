using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Preform.Api.Models;

[Table("Courses", Schema = "public")]
public class Course
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string ProgrammeId { get; set; } = string.Empty;
    public Programme Programme { get; set; } = null!;

    [Required]
    [MaxLength(128)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    public int DisplayOrder { get; set; } = 0;
    public bool IsPublished { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<SubjectDomain> SubjectDomains { get; set; } = new List<SubjectDomain>();
}

[Table("SubjectDomains", Schema = "public")]
public class SubjectDomain
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string CourseId { get; set; } = string.Empty;
    public Course Course { get; set; } = null!;

    [Required]
    [MaxLength(128)]
    public string Title { get; set; } = string.Empty; // e.g. "Safe and Effective Care Environment", "Pharmacological Therapies"

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    public int DisplayOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Category> Categories { get; set; } = new List<Category>();
}

[Table("Categories", Schema = "public")]
public class Category
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string SubjectDomainId { get; set; } = string.Empty;
    public SubjectDomain SubjectDomain { get; set; } = null!;

    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(128)]
    public string Slug { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    public int DisplayOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Subcategory> Subcategories { get; set; } = new List<Subcategory>();
}

[Table("Subcategories", Schema = "public")]
public class Subcategory
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string CategoryId { get; set; } = string.Empty;
    public Category Category { get; set; } = null!;

    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(128)]
    public string Slug { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Description { get; set; } = string.Empty;

    public int DisplayOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Topic> Topics { get; set; } = new List<Topic>();
}

[Table("Topics", Schema = "public")]
public class Topic
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string SubcategoryId { get; set; } = string.Empty;
    public Subcategory Subcategory { get; set; } = null!;

    [Required]
    [MaxLength(256)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string Summary { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    public int DisplayOrder { get; set; } = 0;
    public bool IsPublished { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
