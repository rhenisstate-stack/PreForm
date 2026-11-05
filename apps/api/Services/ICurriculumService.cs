using Preform.Api.DTOs;

namespace Preform.Api.Services;

public interface ICurriculumService
{
    // Full hierarchy
    Task<List<CurriculumTreeNodeDto>> GetCurriculumTreeAsync(bool activeOnly = false, CancellationToken ct = default);

    // Courses
    Task<List<CourseDto>> GetCoursesAsync(bool activeOnly = false, CancellationToken ct = default);
    Task<CourseDto?> GetCourseByIdAsync(string id, CancellationToken ct = default);
    Task<CourseDto> CreateCourseAsync(CreateCourseRequest request, CancellationToken ct = default);
    Task<CourseDto?> UpdateCourseAsync(string id, UpdateCourseRequest request, CancellationToken ct = default);
    Task<bool> DeleteCourseAsync(string id, CancellationToken ct = default);

    // Subject Domains
    Task<List<SubjectDomainDto>> GetSubjectDomainsAsync(string? courseId = null, bool activeOnly = false, CancellationToken ct = default);
    Task<SubjectDomainDto?> GetSubjectDomainByIdAsync(string id, CancellationToken ct = default);
    Task<SubjectDomainDto> CreateSubjectDomainAsync(CreateSubjectDomainRequest request, CancellationToken ct = default);
    Task<SubjectDomainDto?> UpdateSubjectDomainAsync(string id, UpdateSubjectDomainRequest request, CancellationToken ct = default);
    Task<bool> DeleteSubjectDomainAsync(string id, CancellationToken ct = default);

    // Categories
    Task<List<CategoryDto>> GetCategoriesAsync(string? subjectDomainId = null, bool activeOnly = false, CancellationToken ct = default);
    Task<CategoryDto?> GetCategoryByIdAsync(string id, CancellationToken ct = default);
    Task<CategoryDto> CreateCategoryAsync(CreateCategoryRequest request, CancellationToken ct = default);
    Task<CategoryDto?> UpdateCategoryAsync(string id, UpdateCategoryRequest request, CancellationToken ct = default);
    Task<bool> DeleteCategoryAsync(string id, CancellationToken ct = default);

    // Subcategories
    Task<List<SubcategoryDto>> GetSubcategoriesAsync(string? categoryId = null, bool activeOnly = false, CancellationToken ct = default);
    Task<SubcategoryDto?> GetSubcategoryByIdAsync(string id, CancellationToken ct = default);
    Task<SubcategoryDto> CreateSubcategoryAsync(CreateSubcategoryRequest request, CancellationToken ct = default);
    Task<SubcategoryDto?> UpdateSubcategoryAsync(string id, UpdateSubcategoryRequest request, CancellationToken ct = default);
    Task<bool> DeleteSubcategoryAsync(string id, CancellationToken ct = default);

    // Topics
    Task<List<TopicDto>> GetTopicsAsync(string? subcategoryId = null, bool activeOnly = false, CancellationToken ct = default);
    Task<TopicDto?> GetTopicByIdAsync(string id, CancellationToken ct = default);
    Task<TopicDto> CreateTopicAsync(CreateTopicRequest request, CancellationToken ct = default);
    Task<TopicDto?> UpdateTopicAsync(string id, UpdateTopicRequest request, CancellationToken ct = default);
    Task<bool> DeleteTopicAsync(string id, CancellationToken ct = default);

    // Client Needs
    Task<List<ClientNeedDto>> GetClientNeedsAsync(string? pathway = null, bool activeOnly = false, CancellationToken ct = default);
    Task<ClientNeedDto?> GetClientNeedByIdAsync(string id, CancellationToken ct = default);
    Task<ClientNeedDto> CreateClientNeedAsync(CreateClientNeedRequest request, CancellationToken ct = default);
    Task<ClientNeedDto?> UpdateClientNeedAsync(string id, UpdateClientNeedRequest request, CancellationToken ct = default);
    Task<bool> DeleteClientNeedAsync(string id, CancellationToken ct = default);
}
