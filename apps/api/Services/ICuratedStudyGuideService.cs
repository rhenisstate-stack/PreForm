using Preform.Api.DTOs;

namespace Preform.Api.Services;

public interface ICuratedStudyGuideService
{
    // Categories
    Task<List<StudyGuideCategoryDto>> GetCategoriesAsync(bool includeInactive = false);
    Task<StudyGuideCategoryDto?> GetCategoryBySlugAsync(string slug);
    Task<StudyGuideCategoryDto> CreateCategoryAsync(CreateStudyGuideCategoryRequest request);
    Task<StudyGuideCategoryDto> UpdateCategoryAsync(string id, UpdateStudyGuideCategoryRequest request);
    Task<bool> DeleteCategoryAsync(string id);

    // Curated Guides
    Task<List<CuratedStudyGuideSummaryDto>> GetGuidesAsync(string? categorySlug = null, string? programme = null, bool includeUnpublished = false);
    Task<CuratedStudyGuideDetailDto?> GetGuideBySlugAsync(string categorySlug, string guideSlug);
    Task<CuratedStudyGuideDetailDto?> GetGuideByIdAsync(string id);
    Task<CuratedStudyGuideDetailDto> CreateGuideAsync(CreateCuratedGuideRequest request, string createdByUserId);
    Task<CuratedStudyGuideDetailDto> UpdateGuideAsync(string id, UpdateCuratedGuideRequest request, string updatedByUserId);
    Task<CuratedStudyGuideDetailDto> PublishGuideAsync(string id, string publishedByUserId);
    Task<bool> DeleteGuideAsync(string id);
}
