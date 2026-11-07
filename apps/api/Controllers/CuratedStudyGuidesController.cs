using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/study/guides")]
public class CuratedStudyGuidesController : ControllerBase
{
    private readonly ICuratedStudyGuideService _guideService;
    private readonly ILogger<CuratedStudyGuidesController> _logger;

    public CuratedStudyGuidesController(ICuratedStudyGuideService guideService, ILogger<CuratedStudyGuidesController> logger)
    {
        _guideService = guideService;
        _logger = logger;
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _guideService.GetCategoriesAsync(includeInactive: false);
        return Ok(new { success = true, count = categories.Count, categories });
    }

    [HttpGet("categories/{categorySlug}")]
    public async Task<IActionResult> GetCategory(string categorySlug)
    {
        var category = await _guideService.GetCategoryBySlugAsync(categorySlug);
        if (category == null) return NotFound(new { success = false, error = "Category not found." });

        return Ok(new { success = true, category });
    }

    [HttpGet]
    public async Task<IActionResult> GetGuides([FromQuery] string? categorySlug = null, [FromQuery] string? programme = null)
    {
        var guides = await _guideService.GetGuidesAsync(categorySlug, programme, includeUnpublished: false);
        return Ok(new { success = true, count = guides.Count, guides });
    }

    [HttpGet("{categorySlug}/{guideSlug}")]
    public async Task<IActionResult> GetGuideBySlug(string categorySlug, string guideSlug)
    {
        var guide = await _guideService.GetGuideBySlugAsync(categorySlug, guideSlug);
        if (guide == null) return NotFound(new { success = false, error = "Study guide not found." });

        return Ok(new { success = true, guide });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetGuideById(string id)
    {
        var guide = await _guideService.GetGuideByIdAsync(id);
        if (guide == null) return NotFound(new { success = false, error = "Study guide not found." });

        return Ok(new { success = true, guide });
    }
}
