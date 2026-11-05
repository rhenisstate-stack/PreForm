using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

public class CurriculumService : ICurriculumService
{
    private readonly AppDbContext _context;
    private readonly ILogger<CurriculumService> _logger;

    public CurriculumService(AppDbContext context, ILogger<CurriculumService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<CurriculumTreeNodeDto>> GetCurriculumTreeAsync(bool activeOnly = false, CancellationToken ct = default)
    {
        var coursesQuery = _context.Courses.AsNoTracking();
        if (activeOnly)
        {
            coursesQuery = coursesQuery.Where(c => c.IsActive && c.IsPublished);
        }

        var courses = await coursesQuery
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.Title)
            .ToListAsync(ct);

        var domainsQuery = _context.SubjectDomains.AsNoTracking();
        if (activeOnly)
        {
            domainsQuery = domainsQuery.Where(d => d.IsActive);
        }
        var domains = await domainsQuery
            .OrderBy(d => d.DisplayOrder)
            .ThenBy(d => d.Title)
            .ToListAsync(ct);

        var categoriesQuery = _context.Categories.AsNoTracking();
        if (activeOnly)
        {
            categoriesQuery = categoriesQuery.Where(c => c.IsActive);
        }
        var categories = await categoriesQuery
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.Name)
            .ToListAsync(ct);

        var subcategoriesQuery = _context.Subcategories.AsNoTracking();
        if (activeOnly)
        {
            subcategoriesQuery = subcategoriesQuery.Where(s => s.IsActive);
        }
        var subcategories = await subcategoriesQuery
            .OrderBy(s => s.DisplayOrder)
            .ThenBy(s => s.Name)
            .ToListAsync(ct);

        var topicsQuery = _context.Topics.AsNoTracking();
        if (activeOnly)
        {
            topicsQuery = topicsQuery.Where(t => t.IsActive && t.IsPublished);
        }
        var topics = await topicsQuery
            .OrderBy(t => t.DisplayOrder)
            .ThenBy(t => t.Title)
            .ToListAsync(ct);

        // Group question counts by TopicId
        var questionCountsByTopic = await _context.Questions
            .AsNoTracking()
            .Where(q => q.TopicId != null)
            .GroupBy(q => q.TopicId!)
            .Select(g => new { TopicId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.TopicId, x => x.Count, ct);

        // Assemble hierarchy tree
        var result = new List<CurriculumTreeNodeDto>();

        var topicsBySubcat = topics.GroupBy(t => t.SubcategoryId).ToDictionary(g => g.Key, g => g.ToList());
        var subcatsByCategory = subcategories.GroupBy(s => s.CategoryId).ToDictionary(g => g.Key, g => g.ToList());
        var categoriesByDomain = categories.GroupBy(c => c.SubjectDomainId).ToDictionary(g => g.Key, g => g.ToList());
        var domainsByCourse = domains.GroupBy(d => d.CourseId).ToDictionary(g => g.Key, g => g.ToList());

        foreach (var course in courses)
        {
            var courseNode = new CurriculumTreeNodeDto
            {
                Id = course.Id,
                Type = "course",
                Name = course.Title,
                Description = course.Description,
                DisplayOrder = course.DisplayOrder,
                IsActive = course.IsActive,
                Children = new List<CurriculumTreeNodeDto>()
            };

            int courseQuestionCount = 0;

            if (domainsByCourse.TryGetValue(course.Id, out var courseDomains))
            {
                foreach (var domain in courseDomains)
                {
                    var domainNode = new CurriculumTreeNodeDto
                    {
                        Id = domain.Id,
                        Type = "domain",
                        Name = domain.Title,
                        Description = domain.Description,
                        DisplayOrder = domain.DisplayOrder,
                        IsActive = domain.IsActive,
                        Children = new List<CurriculumTreeNodeDto>()
                    };

                    int domainQuestionCount = 0;

                    if (categoriesByDomain.TryGetValue(domain.Id, out var domainCategories))
                    {
                        foreach (var cat in domainCategories)
                        {
                            var catNode = new CurriculumTreeNodeDto
                            {
                                Id = cat.Id,
                                Type = "category",
                                Name = cat.Name,
                                Description = cat.Description,
                                DisplayOrder = cat.DisplayOrder,
                                IsActive = cat.IsActive,
                                Children = new List<CurriculumTreeNodeDto>()
                            };

                            int catQuestionCount = 0;

                            if (subcatsByCategory.TryGetValue(cat.Id, out var catSubcats))
                            {
                                foreach (var subcat in catSubcats)
                                {
                                    var subcatNode = new CurriculumTreeNodeDto
                                    {
                                        Id = subcat.Id,
                                        Type = "subcategory",
                                        Name = subcat.Name,
                                        Description = subcat.Description,
                                        DisplayOrder = subcat.DisplayOrder,
                                        IsActive = subcat.IsActive,
                                        Children = new List<CurriculumTreeNodeDto>()
                                    };

                                    int subcatQuestionCount = 0;

                                    if (topicsBySubcat.TryGetValue(subcat.Id, out var subcatTopics))
                                    {
                                        foreach (var topic in subcatTopics)
                                        {
                                            questionCountsByTopic.TryGetValue(topic.Id, out var qCount);
                                            subcatQuestionCount += qCount;

                                            subcatNode.Children.Add(new CurriculumTreeNodeDto
                                            {
                                                Id = topic.Id,
                                                Type = "topic",
                                                Name = topic.Title,
                                                Description = topic.Summary,
                                                DisplayOrder = topic.DisplayOrder,
                                                IsActive = topic.IsActive,
                                                QuestionCount = qCount
                                            });
                                        }
                                    }

                                    subcatNode.QuestionCount = subcatQuestionCount;
                                    catQuestionCount += subcatQuestionCount;
                                    catNode.Children.Add(subcatNode);
                                }
                            }

                            catNode.QuestionCount = catQuestionCount;
                            domainQuestionCount += catQuestionCount;
                            domainNode.Children.Add(catNode);
                        }
                    }

                    domainNode.QuestionCount = domainQuestionCount;
                    courseQuestionCount += domainQuestionCount;
                    courseNode.Children.Add(domainNode);
                }
            }

            courseNode.QuestionCount = courseQuestionCount;
            result.Add(courseNode);
        }

        return result;
    }

    #region Courses

    public async Task<List<CourseDto>> GetCoursesAsync(bool activeOnly = false, CancellationToken ct = default)
    {
        var query = _context.Courses.AsNoTracking().Include(c => c.Programme).AsQueryable();
        if (activeOnly)
        {
            query = query.Where(c => c.IsActive && c.IsPublished);
        }

        var courses = await query
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.Title)
            .ToListAsync(ct);

        var domainCounts = await _context.SubjectDomains
            .AsNoTracking()
            .GroupBy(d => d.CourseId)
            .Select(g => new { CourseId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CourseId, x => x.Count, ct);

        return courses.Select(c => new CourseDto
        {
            Id = c.Id,
            ProgrammeId = c.ProgrammeId,
            ProgrammeName = c.Programme?.Name ?? string.Empty,
            Title = c.Title,
            Description = c.Description,
            DisplayOrder = c.DisplayOrder,
            IsPublished = c.IsPublished,
            IsActive = c.IsActive,
            SubjectDomainCount = domainCounts.GetValueOrDefault(c.Id, 0),
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt
        }).ToList();
    }

    public async Task<CourseDto?> GetCourseByIdAsync(string id, CancellationToken ct = default)
    {
        var c = await _context.Courses
            .AsNoTracking()
            .Include(c => c.Programme)
            .FirstOrDefaultAsync(c => c.Id == id, ct);

        if (c == null) return null;

        var domainCount = await _context.SubjectDomains.CountAsync(d => d.CourseId == id, ct);

        return new CourseDto
        {
            Id = c.Id,
            ProgrammeId = c.ProgrammeId,
            ProgrammeName = c.Programme?.Name ?? string.Empty,
            Title = c.Title,
            Description = c.Description,
            DisplayOrder = c.DisplayOrder,
            IsPublished = c.IsPublished,
            IsActive = c.IsActive,
            SubjectDomainCount = domainCount,
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt
        };
    }

    public async Task<CourseDto> CreateCourseAsync(CreateCourseRequest request, CancellationToken ct = default)
    {
        var course = new Course
        {
            Id = Guid.NewGuid().ToString(),
            ProgrammeId = request.ProgrammeId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            DisplayOrder = request.DisplayOrder,
            IsPublished = request.IsPublished,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Courses.Add(course);
        await _context.SaveChangesAsync(ct);

        return (await GetCourseByIdAsync(course.Id, ct))!;
    }

    public async Task<CourseDto?> UpdateCourseAsync(string id, UpdateCourseRequest request, CancellationToken ct = default)
    {
        var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (course == null) return null;

        if (request.Title != null) course.Title = request.Title.Trim();
        if (request.Description != null) course.Description = request.Description.Trim();
        if (request.DisplayOrder.HasValue) course.DisplayOrder = request.DisplayOrder.Value;
        if (request.IsPublished.HasValue) course.IsPublished = request.IsPublished.Value;
        if (request.IsActive.HasValue) course.IsActive = request.IsActive.Value;
        course.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return await GetCourseByIdAsync(id, ct);
    }

    public async Task<bool> DeleteCourseAsync(string id, CancellationToken ct = default)
    {
        var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (course == null) return false;

        var hasDomains = await _context.SubjectDomains.AnyAsync(d => d.CourseId == id, ct);
        if (hasDomains)
        {
            throw new InvalidOperationException("Cannot delete course that has subject domains attached. Delete or reassign child subject domains first.");
        }

        _context.Courses.Remove(course);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    #endregion

    #region Subject Domains

    public async Task<List<SubjectDomainDto>> GetSubjectDomainsAsync(string? courseId = null, bool activeOnly = false, CancellationToken ct = default)
    {
        var query = _context.SubjectDomains.AsNoTracking().Include(d => d.Course).AsQueryable();
        if (!string.IsNullOrWhiteSpace(courseId))
        {
            query = query.Where(d => d.CourseId == courseId);
        }
        if (activeOnly)
        {
            query = query.Where(d => d.IsActive);
        }

        var domains = await query
            .OrderBy(d => d.DisplayOrder)
            .ThenBy(d => d.Title)
            .ToListAsync(ct);

        var categoryCounts = await _context.Categories
            .AsNoTracking()
            .GroupBy(c => c.SubjectDomainId)
            .Select(g => new { SubjectDomainId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.SubjectDomainId, x => x.Count, ct);

        return domains.Select(d => new SubjectDomainDto
        {
            Id = d.Id,
            CourseId = d.CourseId,
            CourseTitle = d.Course?.Title ?? string.Empty,
            Title = d.Title,
            Description = d.Description,
            DisplayOrder = d.DisplayOrder,
            IsActive = d.IsActive,
            CategoryCount = categoryCounts.GetValueOrDefault(d.Id, 0),
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt
        }).ToList();
    }

    public async Task<SubjectDomainDto?> GetSubjectDomainByIdAsync(string id, CancellationToken ct = default)
    {
        var d = await _context.SubjectDomains
            .AsNoTracking()
            .Include(d => d.Course)
            .FirstOrDefaultAsync(d => d.Id == id, ct);

        if (d == null) return null;

        var catCount = await _context.Categories.CountAsync(c => c.SubjectDomainId == id, ct);

        return new SubjectDomainDto
        {
            Id = d.Id,
            CourseId = d.CourseId,
            CourseTitle = d.Course?.Title ?? string.Empty,
            Title = d.Title,
            Description = d.Description,
            DisplayOrder = d.DisplayOrder,
            IsActive = d.IsActive,
            CategoryCount = catCount,
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt
        };
    }

    public async Task<SubjectDomainDto> CreateSubjectDomainAsync(CreateSubjectDomainRequest request, CancellationToken ct = default)
    {
        var courseExists = await _context.Courses.AnyAsync(c => c.Id == request.CourseId, ct);
        if (!courseExists)
        {
            throw new ArgumentException($"Course with ID '{request.CourseId}' does not exist.");
        }

        var domain = new SubjectDomain
        {
            Id = Guid.NewGuid().ToString(),
            CourseId = request.CourseId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            DisplayOrder = request.DisplayOrder,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.SubjectDomains.Add(domain);
        await _context.SaveChangesAsync(ct);

        return (await GetSubjectDomainByIdAsync(domain.Id, ct))!;
    }

    public async Task<SubjectDomainDto?> UpdateSubjectDomainAsync(string id, UpdateSubjectDomainRequest request, CancellationToken ct = default)
    {
        var domain = await _context.SubjectDomains.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (domain == null) return null;

        if (request.Title != null) domain.Title = request.Title.Trim();
        if (request.Description != null) domain.Description = request.Description.Trim();
        if (request.DisplayOrder.HasValue) domain.DisplayOrder = request.DisplayOrder.Value;
        if (request.IsActive.HasValue) domain.IsActive = request.IsActive.Value;
        domain.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return await GetSubjectDomainByIdAsync(id, ct);
    }

    public async Task<bool> DeleteSubjectDomainAsync(string id, CancellationToken ct = default)
    {
        var domain = await _context.SubjectDomains.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (domain == null) return false;

        var hasCats = await _context.Categories.AnyAsync(c => c.SubjectDomainId == id, ct);
        if (hasCats)
        {
            throw new InvalidOperationException("Cannot delete subject domain that has categories attached. Delete or reassign child categories first.");
        }

        _context.SubjectDomains.Remove(domain);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    #endregion

    #region Categories

    public async Task<List<CategoryDto>> GetCategoriesAsync(string? subjectDomainId = null, bool activeOnly = false, CancellationToken ct = default)
    {
        var query = _context.Categories.AsNoTracking().Include(c => c.SubjectDomain).AsQueryable();
        if (!string.IsNullOrWhiteSpace(subjectDomainId))
        {
            query = query.Where(c => c.SubjectDomainId == subjectDomainId);
        }
        if (activeOnly)
        {
            query = query.Where(c => c.IsActive);
        }

        var cats = await query
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.Name)
            .ToListAsync(ct);

        var subcatCounts = await _context.Subcategories
            .AsNoTracking()
            .GroupBy(s => s.CategoryId)
            .Select(g => new { CategoryId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CategoryId, x => x.Count, ct);

        return cats.Select(c => new CategoryDto
        {
            Id = c.Id,
            SubjectDomainId = c.SubjectDomainId,
            SubjectDomainTitle = c.SubjectDomain?.Title ?? string.Empty,
            Name = c.Name,
            Slug = c.Slug,
            Description = c.Description,
            DisplayOrder = c.DisplayOrder,
            IsActive = c.IsActive,
            SubcategoryCount = subcatCounts.GetValueOrDefault(c.Id, 0),
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt
        }).ToList();
    }

    public async Task<CategoryDto?> GetCategoryByIdAsync(string id, CancellationToken ct = default)
    {
        var c = await _context.Categories
            .AsNoTracking()
            .Include(c => c.SubjectDomain)
            .FirstOrDefaultAsync(c => c.Id == id, ct);

        if (c == null) return null;

        var subcatCount = await _context.Subcategories.CountAsync(s => s.CategoryId == id, ct);

        return new CategoryDto
        {
            Id = c.Id,
            SubjectDomainId = c.SubjectDomainId,
            SubjectDomainTitle = c.SubjectDomain?.Title ?? string.Empty,
            Name = c.Name,
            Slug = c.Slug,
            Description = c.Description,
            DisplayOrder = c.DisplayOrder,
            IsActive = c.IsActive,
            SubcategoryCount = subcatCount,
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt
        };
    }

    public async Task<CategoryDto> CreateCategoryAsync(CreateCategoryRequest request, CancellationToken ct = default)
    {
        var domainExists = await _context.SubjectDomains.AnyAsync(d => d.Id == request.SubjectDomainId, ct);
        if (!domainExists)
        {
            throw new ArgumentException($"Subject Domain with ID '{request.SubjectDomainId}' does not exist.");
        }

        var slug = string.IsNullOrWhiteSpace(request.Slug)
            ? Slugify(request.Name)
            : Slugify(request.Slug);

        var cat = new Category
        {
            Id = Guid.NewGuid().ToString(),
            SubjectDomainId = request.SubjectDomainId,
            Name = request.Name.Trim(),
            Slug = slug,
            Description = request.Description?.Trim() ?? string.Empty,
            DisplayOrder = request.DisplayOrder,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Categories.Add(cat);
        await _context.SaveChangesAsync(ct);

        return (await GetCategoryByIdAsync(cat.Id, ct))!;
    }

    public async Task<CategoryDto?> UpdateCategoryAsync(string id, UpdateCategoryRequest request, CancellationToken ct = default)
    {
        var cat = await _context.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (cat == null) return null;

        if (request.Name != null) cat.Name = request.Name.Trim();
        if (request.Slug != null) cat.Slug = Slugify(request.Slug);
        if (request.Description != null) cat.Description = request.Description.Trim();
        if (request.DisplayOrder.HasValue) cat.DisplayOrder = request.DisplayOrder.Value;
        if (request.IsActive.HasValue) cat.IsActive = request.IsActive.Value;
        cat.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return await GetCategoryByIdAsync(id, ct);
    }

    public async Task<bool> DeleteCategoryAsync(string id, CancellationToken ct = default)
    {
        var cat = await _context.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (cat == null) return false;

        var hasSubcats = await _context.Subcategories.AnyAsync(s => s.CategoryId == id, ct);
        if (hasSubcats)
        {
            throw new InvalidOperationException("Cannot delete category that has subcategories attached. Delete or reassign child subcategories first.");
        }

        _context.Categories.Remove(cat);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    #endregion

    #region Subcategories

    public async Task<List<SubcategoryDto>> GetSubcategoriesAsync(string? categoryId = null, bool activeOnly = false, CancellationToken ct = default)
    {
        var query = _context.Subcategories.AsNoTracking().Include(s => s.Category).AsQueryable();
        if (!string.IsNullOrWhiteSpace(categoryId))
        {
            query = query.Where(s => s.CategoryId == categoryId);
        }
        if (activeOnly)
        {
            query = query.Where(s => s.IsActive);
        }

        var subcats = await query
            .OrderBy(s => s.DisplayOrder)
            .ThenBy(s => s.Name)
            .ToListAsync(ct);

        var topicCounts = await _context.Topics
            .AsNoTracking()
            .GroupBy(t => t.SubcategoryId)
            .Select(g => new { SubcategoryId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.SubcategoryId, x => x.Count, ct);

        return subcats.Select(s => new SubcategoryDto
        {
            Id = s.Id,
            CategoryId = s.CategoryId,
            CategoryName = s.Category?.Name ?? string.Empty,
            Name = s.Name,
            Slug = s.Slug,
            Description = s.Description,
            DisplayOrder = s.DisplayOrder,
            IsActive = s.IsActive,
            TopicCount = topicCounts.GetValueOrDefault(s.Id, 0),
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt
        }).ToList();
    }

    public async Task<SubcategoryDto?> GetSubcategoryByIdAsync(string id, CancellationToken ct = default)
    {
        var s = await _context.Subcategories
            .AsNoTracking()
            .Include(s => s.Category)
            .FirstOrDefaultAsync(s => s.Id == id, ct);

        if (s == null) return null;

        var topicCount = await _context.Topics.CountAsync(t => t.SubcategoryId == id, ct);

        return new SubcategoryDto
        {
            Id = s.Id,
            CategoryId = s.CategoryId,
            CategoryName = s.Category?.Name ?? string.Empty,
            Name = s.Name,
            Slug = s.Slug,
            Description = s.Description,
            DisplayOrder = s.DisplayOrder,
            IsActive = s.IsActive,
            TopicCount = topicCount,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt
        };
    }

    public async Task<SubcategoryDto> CreateSubcategoryAsync(CreateSubcategoryRequest request, CancellationToken ct = default)
    {
        var catExists = await _context.Categories.AnyAsync(c => c.Id == request.CategoryId, ct);
        if (!catExists)
        {
            throw new ArgumentException($"Category with ID '{request.CategoryId}' does not exist.");
        }

        var slug = string.IsNullOrWhiteSpace(request.Slug)
            ? Slugify(request.Name)
            : Slugify(request.Slug);

        var subcat = new Subcategory
        {
            Id = Guid.NewGuid().ToString(),
            CategoryId = request.CategoryId,
            Name = request.Name.Trim(),
            Slug = slug,
            Description = request.Description?.Trim() ?? string.Empty,
            DisplayOrder = request.DisplayOrder,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Subcategories.Add(subcat);
        await _context.SaveChangesAsync(ct);

        return (await GetSubcategoryByIdAsync(subcat.Id, ct))!;
    }

    public async Task<SubcategoryDto?> UpdateSubcategoryAsync(string id, UpdateSubcategoryRequest request, CancellationToken ct = default)
    {
        var subcat = await _context.Subcategories.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (subcat == null) return null;

        if (request.Name != null) subcat.Name = request.Name.Trim();
        if (request.Slug != null) subcat.Slug = Slugify(request.Slug);
        if (request.Description != null) subcat.Description = request.Description.Trim();
        if (request.DisplayOrder.HasValue) subcat.DisplayOrder = request.DisplayOrder.Value;
        if (request.IsActive.HasValue) subcat.IsActive = request.IsActive.Value;
        subcat.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return await GetSubcategoryByIdAsync(id, ct);
    }

    public async Task<bool> DeleteSubcategoryAsync(string id, CancellationToken ct = default)
    {
        var subcat = await _context.Subcategories.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (subcat == null) return false;

        var hasTopics = await _context.Topics.AnyAsync(t => t.SubcategoryId == id, ct);
        if (hasTopics)
        {
            throw new InvalidOperationException("Cannot delete subcategory that has topics attached. Delete or reassign child topics first.");
        }

        _context.Subcategories.Remove(subcat);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    #endregion

    #region Topics

    public async Task<List<TopicDto>> GetTopicsAsync(string? subcategoryId = null, bool activeOnly = false, CancellationToken ct = default)
    {
        var query = _context.Topics.AsNoTracking().Include(t => t.Subcategory).AsQueryable();
        if (!string.IsNullOrWhiteSpace(subcategoryId))
        {
            query = query.Where(t => t.SubcategoryId == subcategoryId);
        }
        if (activeOnly)
        {
            query = query.Where(t => t.IsActive && t.IsPublished);
        }

        var topics = await query
            .OrderBy(t => t.DisplayOrder)
            .ThenBy(t => t.Title)
            .ToListAsync(ct);

        var questionCounts = await _context.Questions
            .AsNoTracking()
            .Where(q => q.TopicId != null)
            .GroupBy(q => q.TopicId!)
            .Select(g => new { TopicId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.TopicId, x => x.Count, ct);

        return topics.Select(t => new TopicDto
        {
            Id = t.Id,
            SubcategoryId = t.SubcategoryId,
            SubcategoryName = t.Subcategory?.Name ?? string.Empty,
            Title = t.Title,
            Summary = t.Summary,
            Content = t.Content,
            DisplayOrder = t.DisplayOrder,
            IsPublished = t.IsPublished,
            IsActive = t.IsActive,
            QuestionCount = questionCounts.GetValueOrDefault(t.Id, 0),
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt
        }).ToList();
    }

    public async Task<TopicDto?> GetTopicByIdAsync(string id, CancellationToken ct = default)
    {
        var t = await _context.Topics
            .AsNoTracking()
            .Include(t => t.Subcategory)
            .FirstOrDefaultAsync(t => t.Id == id, ct);

        if (t == null) return null;

        var qCount = await _context.Questions.CountAsync(q => q.TopicId == id, ct);

        return new TopicDto
        {
            Id = t.Id,
            SubcategoryId = t.SubcategoryId,
            SubcategoryName = t.Subcategory?.Name ?? string.Empty,
            Title = t.Title,
            Summary = t.Summary,
            Content = t.Content,
            DisplayOrder = t.DisplayOrder,
            IsPublished = t.IsPublished,
            IsActive = t.IsActive,
            QuestionCount = qCount,
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt
        };
    }

    public async Task<TopicDto> CreateTopicAsync(CreateTopicRequest request, CancellationToken ct = default)
    {
        var subcatExists = await _context.Subcategories.AnyAsync(s => s.Id == request.SubcategoryId, ct);
        if (!subcatExists)
        {
            throw new ArgumentException($"Subcategory with ID '{request.SubcategoryId}' does not exist.");
        }

        var topic = new Topic
        {
            Id = Guid.NewGuid().ToString(),
            SubcategoryId = request.SubcategoryId,
            Title = request.Title.Trim(),
            Summary = request.Summary?.Trim() ?? string.Empty,
            Content = request.Content?.Trim() ?? string.Empty,
            DisplayOrder = request.DisplayOrder,
            IsPublished = request.IsPublished,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Topics.Add(topic);
        await _context.SaveChangesAsync(ct);

        return (await GetTopicByIdAsync(topic.Id, ct))!;
    }

    public async Task<TopicDto?> UpdateTopicAsync(string id, UpdateTopicRequest request, CancellationToken ct = default)
    {
        var topic = await _context.Topics.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (topic == null) return null;

        if (request.Title != null) topic.Title = request.Title.Trim();
        if (request.Summary != null) topic.Summary = request.Summary.Trim();
        if (request.Content != null) topic.Content = request.Content.Trim();
        if (request.DisplayOrder.HasValue) topic.DisplayOrder = request.DisplayOrder.Value;
        if (request.IsPublished.HasValue) topic.IsPublished = request.IsPublished.Value;
        if (request.IsActive.HasValue) topic.IsActive = request.IsActive.Value;
        topic.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return await GetTopicByIdAsync(id, ct);
    }

    public async Task<bool> DeleteTopicAsync(string id, CancellationToken ct = default)
    {
        var topic = await _context.Topics.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (topic == null) return false;

        var hasQuestions = await _context.Questions.AnyAsync(q => q.TopicId == id, ct);
        if (hasQuestions)
        {
            throw new InvalidOperationException("Cannot delete topic that has questions attached. Reassign or delete associated questions first.");
        }

        _context.Topics.Remove(topic);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    #endregion

    #region Client Needs

    public async Task<List<ClientNeedDto>> GetClientNeedsAsync(string? pathway = null, bool activeOnly = false, CancellationToken ct = default)
    {
        var query = _context.ClientNeeds.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(pathway))
        {
            var p = pathway.Trim().ToLowerInvariant();
            query = query.Where(c => c.Pathway == p || c.Pathway == "both");
        }
        if (activeOnly)
        {
            query = query.Where(c => c.IsActive);
        }

        var clientNeeds = await query
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.Code)
            .ToListAsync(ct);

        var questionCounts = await _context.Questions
            .AsNoTracking()
            .Where(q => q.ClientNeedId != null)
            .GroupBy(q => q.ClientNeedId!)
            .Select(g => new { ClientNeedId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ClientNeedId, x => x.Count, ct);

        return clientNeeds.Select(c => new ClientNeedDto
        {
            Id = c.Id,
            Code = c.Code,
            Name = c.Name,
            Description = c.Description,
            DisplayOrder = c.DisplayOrder,
            IsActive = c.IsActive,
            Pathway = c.Pathway,
            QuestionCount = questionCounts.GetValueOrDefault(c.Id, 0),
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt
        }).ToList();
    }

    public async Task<ClientNeedDto?> GetClientNeedByIdAsync(string id, CancellationToken ct = default)
    {
        var c = await _context.ClientNeeds
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, ct);

        if (c == null) return null;

        var qCount = await _context.Questions.CountAsync(q => q.ClientNeedId == id, ct);

        return new ClientNeedDto
        {
            Id = c.Id,
            Code = c.Code,
            Name = c.Name,
            Description = c.Description,
            DisplayOrder = c.DisplayOrder,
            IsActive = c.IsActive,
            Pathway = c.Pathway,
            QuestionCount = qCount,
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt
        };
    }

    public async Task<ClientNeedDto> CreateClientNeedAsync(CreateClientNeedRequest request, CancellationToken ct = default)
    {
        var code = request.Code.Trim().ToUpperInvariant();
        var exists = await _context.ClientNeeds.AnyAsync(c => c.Code == code, ct);
        if (exists)
        {
            throw new ArgumentException($"A Client Need category with code '{code}' already exists.");
        }

        var clientNeed = new ClientNeed
        {
            Id = Guid.NewGuid().ToString(),
            Code = code,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            DisplayOrder = request.DisplayOrder,
            IsActive = request.IsActive,
            Pathway = (request.Pathway ?? "both").Trim().ToLowerInvariant(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.ClientNeeds.Add(clientNeed);
        await _context.SaveChangesAsync(ct);

        return (await GetClientNeedByIdAsync(clientNeed.Id, ct))!;
    }

    public async Task<ClientNeedDto?> UpdateClientNeedAsync(string id, UpdateClientNeedRequest request, CancellationToken ct = default)
    {
        var clientNeed = await _context.ClientNeeds.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (clientNeed == null) return null;

        if (request.Code != null)
        {
            var code = request.Code.Trim().ToUpperInvariant();
            if (code != clientNeed.Code)
            {
                var exists = await _context.ClientNeeds.AnyAsync(c => c.Code == code && c.Id != id, ct);
                if (exists)
                {
                    throw new ArgumentException($"A Client Need category with code '{code}' already exists.");
                }
                clientNeed.Code = code;
            }
        }

        if (request.Name != null) clientNeed.Name = request.Name.Trim();
        if (request.Description != null) clientNeed.Description = request.Description.Trim();
        if (request.DisplayOrder.HasValue) clientNeed.DisplayOrder = request.DisplayOrder.Value;
        if (request.IsActive.HasValue) clientNeed.IsActive = request.IsActive.Value;
        if (request.Pathway != null) clientNeed.Pathway = request.Pathway.Trim().ToLowerInvariant();
        clientNeed.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return await GetClientNeedByIdAsync(id, ct);
    }

    public async Task<bool> DeleteClientNeedAsync(string id, CancellationToken ct = default)
    {
        var clientNeed = await _context.ClientNeeds.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (clientNeed == null) return false;

        var hasQuestions = await _context.Questions.AnyAsync(q => q.ClientNeedId == id, ct);
        if (hasQuestions)
        {
            throw new InvalidOperationException("Cannot delete client need category that has questions attached. Reassign or delete associated questions first.");
        }

        _context.ClientNeeds.Remove(clientNeed);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    #endregion

    private static string Slugify(string text)
    {
        var s = text.Trim().ToLowerInvariant();
        s = Regex.Replace(s, @"\s+", "-");
        s = Regex.Replace(s, @"[^a-z0-9\-]", "");
        s = Regex.Replace(s, @"\-+", "-");
        return s.Trim('-');
    }
}
