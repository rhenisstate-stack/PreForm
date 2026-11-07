using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

public class CuratedStudyGuideService : ICuratedStudyGuideService
{
    private readonly AppDbContext _context;
    private readonly ILogger<CuratedStudyGuideService> _logger;

    public CuratedStudyGuideService(AppDbContext context, ILogger<CuratedStudyGuideService> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ── Categories ──

    public async Task<List<StudyGuideCategoryDto>> GetCategoriesAsync(bool includeInactive = false)
    {
        var query = _context.StudyGuideCategories.AsNoTracking();
        if (!includeInactive)
        {
            query = query.Where(c => c.IsActive);
        }

        return await query
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.Title)
            .Select(c => new StudyGuideCategoryDto
            {
                Id = c.Id,
                Slug = c.Slug,
                Title = c.Title,
                ShortTitle = c.ShortTitle,
                Description = c.Description,
                Badge = c.Badge,
                IconName = c.IconName,
                ColorTheme = c.ColorTheme,
                DisplayOrder = c.DisplayOrder,
                IsActive = c.IsActive,
                GuideCount = c.Guides.Count(g => g.Status == "Published")
            })
            .ToListAsync();
    }

    public async Task<StudyGuideCategoryDto?> GetCategoryBySlugAsync(string slug)
    {
        var c = await _context.StudyGuideCategories.AsNoTracking()
            .Include(x => x.Guides)
            .FirstOrDefaultAsync(x => x.Slug == slug.ToLowerInvariant());

        if (c == null) return null;

        return new StudyGuideCategoryDto
        {
            Id = c.Id,
            Slug = c.Slug,
            Title = c.Title,
            ShortTitle = c.ShortTitle,
            Description = c.Description,
            Badge = c.Badge,
            IconName = c.IconName,
            ColorTheme = c.ColorTheme,
            DisplayOrder = c.DisplayOrder,
            IsActive = c.IsActive,
            GuideCount = c.Guides.Count(g => g.Status == "Published")
        };
    }

    public async Task<StudyGuideCategoryDto> CreateCategoryAsync(CreateStudyGuideCategoryRequest request)
    {
        var slug = request.Slug.Trim().ToLowerInvariant();
        if (await _context.StudyGuideCategories.AnyAsync(c => c.Slug == slug))
        {
            throw new InvalidOperationException($"Category slug '{slug}' already exists.");
        }

        var cat = new StudyGuideCategory
        {
            Id = Guid.NewGuid().ToString(),
            Slug = slug,
            Title = request.Title.Trim(),
            ShortTitle = string.IsNullOrWhiteSpace(request.ShortTitle) ? request.Title.Trim() : request.ShortTitle.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            Badge = string.IsNullOrWhiteSpace(request.Badge) ? "Core" : request.Badge.Trim(),
            IconName = string.IsNullOrWhiteSpace(request.IconName) ? "BookOpen" : request.IconName.Trim(),
            ColorTheme = string.IsNullOrWhiteSpace(request.ColorTheme) ? "teal" : request.ColorTheme.Trim(),
            DisplayOrder = request.DisplayOrder,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.StudyGuideCategories.Add(cat);
        await _context.SaveChangesAsync();

        return new StudyGuideCategoryDto
        {
            Id = cat.Id,
            Slug = cat.Slug,
            Title = cat.Title,
            ShortTitle = cat.ShortTitle,
            Description = cat.Description,
            Badge = cat.Badge,
            IconName = cat.IconName,
            ColorTheme = cat.ColorTheme,
            DisplayOrder = cat.DisplayOrder,
            IsActive = cat.IsActive,
            GuideCount = 0
        };
    }

    public async Task<StudyGuideCategoryDto> UpdateCategoryAsync(string id, UpdateStudyGuideCategoryRequest request)
    {
        var cat = await _context.StudyGuideCategories.FirstOrDefaultAsync(c => c.Id == id);
        if (cat == null)
        {
            throw new KeyNotFoundException($"Category '{id}' not found.");
        }

        if (request.Slug != null)
        {
            var slug = request.Slug.Trim().ToLowerInvariant();
            if (slug != cat.Slug && await _context.StudyGuideCategories.AnyAsync(c => c.Slug == slug))
            {
                throw new InvalidOperationException($"Category slug '{slug}' already exists.");
            }
            cat.Slug = slug;
        }

        if (request.Title != null) cat.Title = request.Title.Trim();
        if (request.ShortTitle != null) cat.ShortTitle = request.ShortTitle.Trim();
        if (request.Description != null) cat.Description = request.Description.Trim();
        if (request.Badge != null) cat.Badge = request.Badge.Trim();
        if (request.IconName != null) cat.IconName = request.IconName.Trim();
        if (request.ColorTheme != null) cat.ColorTheme = request.ColorTheme.Trim();
        if (request.DisplayOrder.HasValue) cat.DisplayOrder = request.DisplayOrder.Value;
        if (request.IsActive.HasValue) cat.IsActive = request.IsActive.Value;

        await _context.SaveChangesAsync();

        var guideCount = await _context.CuratedStudyGuides.CountAsync(g => g.CategoryId == cat.Id && g.Status == "Published");

        return new StudyGuideCategoryDto
        {
            Id = cat.Id,
            Slug = cat.Slug,
            Title = cat.Title,
            ShortTitle = cat.ShortTitle,
            Description = cat.Description,
            Badge = cat.Badge,
            IconName = cat.IconName,
            ColorTheme = cat.ColorTheme,
            DisplayOrder = cat.DisplayOrder,
            IsActive = cat.IsActive,
            GuideCount = guideCount
        };
    }

    public async Task<bool> DeleteCategoryAsync(string id)
    {
        var cat = await _context.StudyGuideCategories.Include(c => c.Guides).FirstOrDefaultAsync(c => c.Id == id);
        if (cat == null) return false;

        if (cat.Guides.Any())
        {
            throw new InvalidOperationException("Cannot delete category containing study guides. Move or delete guides first.");
        }

        _context.StudyGuideCategories.Remove(cat);
        await _context.SaveChangesAsync();
        return true;
    }

    // ── Curated Guides ──

    public async Task<List<CuratedStudyGuideSummaryDto>> GetGuidesAsync(string? categorySlug = null, string? programme = null, bool includeUnpublished = false)
    {
        var query = _context.CuratedStudyGuides
            .AsNoTracking()
            .Include(g => g.Category)
            .AsQueryable();

        if (!includeUnpublished)
        {
            query = query.Where(g => g.Status == "Published");
        }

        if (!string.IsNullOrWhiteSpace(categorySlug))
        {
            query = query.Where(g => g.Category.Slug == categorySlug.ToLowerInvariant());
        }

        if (!string.IsNullOrWhiteSpace(programme) && programme != "all")
        {
            query = query.Where(g => g.Programme == programme || g.Programme == "both");
        }

        return await query
            .OrderBy(g => g.Category.DisplayOrder)
            .ThenBy(g => g.Title)
            .Select(g => new CuratedStudyGuideSummaryDto
            {
                Id = g.Id,
                CategoryId = g.CategoryId,
                CategorySlug = g.Category.Slug,
                CategoryTitle = g.Category.Title,
                Slug = g.Slug,
                Title = g.Title,
                Summary = g.Summary,
                ReadTime = g.ReadTime,
                Difficulty = g.Difficulty,
                Programme = g.Programme,
                ClientNeedId = g.ClientNeedId,
                Status = g.Status,
                PublishedAt = g.PublishedAt,
                UpdatedAt = g.UpdatedAt
            })
            .ToListAsync();
    }

    public async Task<CuratedStudyGuideDetailDto?> GetGuideBySlugAsync(string categorySlug, string guideSlug)
    {
        var guide = await _context.CuratedStudyGuides
            .AsNoTracking()
            .Include(g => g.Category)
            .FirstOrDefaultAsync(g => g.Category.Slug == categorySlug.ToLowerInvariant() && g.Slug == guideSlug.ToLowerInvariant());

        if (guide == null) return null;

        return MapDetail(guide);
    }

    public async Task<CuratedStudyGuideDetailDto?> GetGuideByIdAsync(string id)
    {
        var guide = await _context.CuratedStudyGuides
            .AsNoTracking()
            .Include(g => g.Category)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (guide == null) return null;

        return MapDetail(guide);
    }

    public async Task<CuratedStudyGuideDetailDto> CreateGuideAsync(CreateCuratedGuideRequest request, string createdByUserId)
    {
        var category = await _context.StudyGuideCategories.FirstOrDefaultAsync(c => c.Id == request.CategoryId);
        if (category == null)
        {
            throw new KeyNotFoundException($"Category '{request.CategoryId}' not found.");
        }

        var slug = request.Slug.Trim().ToLowerInvariant();
        if (await _context.CuratedStudyGuides.AnyAsync(g => g.CategoryId == request.CategoryId && g.Slug == slug))
        {
            throw new InvalidOperationException($"Study guide with slug '{slug}' already exists in this category.");
        }

        var now = DateTime.UtcNow;
        var guide = new CuratedStudyGuide
        {
            Id = Guid.NewGuid().ToString(),
            CategoryId = request.CategoryId,
            Slug = slug,
            Title = request.Title.Trim(),
            Summary = request.Summary?.Trim() ?? string.Empty,
            ReadTime = string.IsNullOrWhiteSpace(request.ReadTime) ? "5 min read" : request.ReadTime.Trim(),
            Difficulty = string.IsNullOrWhiteSpace(request.Difficulty) ? "High-Yield" : request.Difficulty.Trim(),
            Programme = string.IsNullOrWhiteSpace(request.Programme) ? "both" : request.Programme.ToLowerInvariant(),
            ClientNeedId = request.ClientNeedId,
            ClinicalKeyTakeawaysJson = JsonSerializer.Serialize(request.ClinicalKeyTakeaways ?? new List<string>()),
            ContentJson = request.ContentJson,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "Draft" : request.Status,
            PublishedAt = request.Status == "Published" ? now : null,
            ScheduledPublishAt = request.ScheduledPublishAt,
            CreatedById = createdByUserId,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.CuratedStudyGuides.Add(guide);

        // Record initial version
        guide.Versions.Add(new CuratedGuideVersion
        {
            Id = Guid.NewGuid().ToString(),
            GuideId = guide.Id,
            VersionNumber = 1,
            Title = guide.Title,
            ContentJson = guide.ContentJson,
            ChangeSummary = "Initial creation",
            EditedById = createdByUserId,
            CreatedAt = now
        });

        await _context.SaveChangesAsync();

        guide.Category = category;
        return MapDetail(guide);
    }

    public async Task<CuratedStudyGuideDetailDto> UpdateGuideAsync(string id, UpdateCuratedGuideRequest request, string updatedByUserId)
    {
        var guide = await _context.CuratedStudyGuides
            .Include(g => g.Category)
            .Include(g => g.Versions)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (guide == null)
        {
            throw new KeyNotFoundException($"Curated study guide '{id}' not found.");
        }

        if (!string.IsNullOrWhiteSpace(request.CategoryId) && request.CategoryId != guide.CategoryId)
        {
            var category = await _context.StudyGuideCategories.FirstOrDefaultAsync(c => c.Id == request.CategoryId);
            if (category == null) throw new KeyNotFoundException($"Category '{request.CategoryId}' not found.");
            guide.CategoryId = request.CategoryId;
            guide.Category = category;
        }

        if (!string.IsNullOrWhiteSpace(request.Slug))
        {
            var slug = request.Slug.Trim().ToLowerInvariant();
            if (slug != guide.Slug && await _context.CuratedStudyGuides.AnyAsync(g => g.CategoryId == guide.CategoryId && g.Slug == slug))
            {
                throw new InvalidOperationException($"Guide slug '{slug}' already exists in this category.");
            }
            guide.Slug = slug;
        }

        if (request.Title != null) guide.Title = request.Title.Trim();
        if (request.Summary != null) guide.Summary = request.Summary.Trim();
        if (request.ReadTime != null) guide.ReadTime = request.ReadTime.Trim();
        if (request.Difficulty != null) guide.Difficulty = request.Difficulty.Trim();
        if (request.Programme != null) guide.Programme = request.Programme.ToLowerInvariant();
        if (request.ClientNeedId != null) guide.ClientNeedId = request.ClientNeedId;
        if (request.ClinicalKeyTakeaways != null)
        {
            guide.ClinicalKeyTakeawaysJson = JsonSerializer.Serialize(request.ClinicalKeyTakeaways);
        }

        var contentChanged = false;
        if (request.ContentJson != null && request.ContentJson != guide.ContentJson)
        {
            guide.ContentJson = request.ContentJson;
            contentChanged = true;
        }

        if (request.Status != null)
        {
            guide.Status = request.Status;
            if (request.Status == "Published" && guide.PublishedAt == null)
            {
                guide.PublishedAt = DateTime.UtcNow;
            }
        }

        var now = DateTime.UtcNow;
        guide.UpdatedAt = now;

        if (contentChanged || !string.IsNullOrWhiteSpace(request.ChangeSummary))
        {
            int nextVersion = (guide.Versions.Max(v => (int?)v.VersionNumber) ?? 0) + 1;
            guide.Versions.Add(new CuratedGuideVersion
            {
                Id = Guid.NewGuid().ToString(),
                GuideId = guide.Id,
                VersionNumber = nextVersion,
                Title = guide.Title,
                ContentJson = guide.ContentJson,
                ChangeSummary = request.ChangeSummary ?? "Content update",
                EditedById = updatedByUserId,
                CreatedAt = now
            });
        }

        await _context.SaveChangesAsync();
        return MapDetail(guide);
    }

    public async Task<CuratedStudyGuideDetailDto> PublishGuideAsync(string id, string publishedByUserId)
    {
        var guide = await _context.CuratedStudyGuides
            .Include(g => g.Category)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (guide == null)
        {
            throw new KeyNotFoundException($"Curated study guide '{id}' not found.");
        }

        guide.Status = "Published";
        guide.PublishedAt = DateTime.UtcNow;
        guide.ReviewedById = publishedByUserId;
        guide.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapDetail(guide);
    }

    public async Task<bool> DeleteGuideAsync(string id)
    {
        var guide = await _context.CuratedStudyGuides.FirstOrDefaultAsync(g => g.Id == id);
        if (guide == null) return false;

        _context.CuratedStudyGuides.Remove(guide);
        await _context.SaveChangesAsync();
        return true;
    }

    private static CuratedStudyGuideDetailDto MapDetail(CuratedStudyGuide g)
    {
        List<string> takeaways;
        try
        {
            takeaways = JsonSerializer.Deserialize<List<string>>(g.ClinicalKeyTakeawaysJson) ?? new List<string>();
        }
        catch
        {
            takeaways = new List<string>();
        }

        return new CuratedStudyGuideDetailDto
        {
            Id = g.Id,
            CategoryId = g.CategoryId,
            CategorySlug = g.Category?.Slug ?? string.Empty,
            CategoryTitle = g.Category?.Title ?? string.Empty,
            Slug = g.Slug,
            Title = g.Title,
            Summary = g.Summary,
            ReadTime = g.ReadTime,
            Difficulty = g.Difficulty,
            Programme = g.Programme,
            ClientNeedId = g.ClientNeedId,
            Status = g.Status,
            PublishedAt = g.PublishedAt,
            UpdatedAt = g.UpdatedAt,
            ClinicalKeyTakeaways = takeaways,
            ContentJson = g.ContentJson
        };
    }
}
