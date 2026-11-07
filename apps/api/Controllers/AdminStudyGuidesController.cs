using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireAdmin")]
[Route("api/v1/admin/study-guides")]
public class AdminStudyGuidesController : ControllerBase
{
    private readonly ICuratedStudyGuideService _guideService;
    private readonly ILogger<AdminStudyGuidesController> _logger;

    public AdminStudyGuidesController(ICuratedStudyGuideService guideService, ILogger<AdminStudyGuidesController> logger)
    {
        _guideService = guideService;
        _logger = logger;
    }

    private string GetAdminUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value?.Trim() ?? "admin";
    }

    // ── Categories ──

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _guideService.GetCategoriesAsync(includeInactive: true);
        return Ok(new { success = true, count = categories.Count, categories });
    }

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateStudyGuideCategoryRequest request)
    {
        try
        {
            var category = await _guideService.CreateCategoryAsync(request);
            return Ok(new { success = true, category });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, error = ex.Message });
        }
    }

    [HttpPut("categories/{id}")]
    public async Task<IActionResult> UpdateCategory(string id, [FromBody] UpdateStudyGuideCategoryRequest request)
    {
        try
        {
            var category = await _guideService.UpdateCategoryAsync(id, request);
            return Ok(new { success = true, category });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, error = ex.Message });
        }
    }

    [HttpDelete("categories/{id}")]
    public async Task<IActionResult> DeleteCategory(string id)
    {
        try
        {
            var deleted = await _guideService.DeleteCategoryAsync(id);
            if (!deleted) return NotFound(new { success = false, error = "Category not found." });

            return Ok(new { success = true, message = "Category deleted." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, error = ex.Message });
        }
    }

    // ── Curated Guides ──

    [HttpGet]
    public async Task<IActionResult> GetGuides([FromQuery] string? categorySlug = null, [FromQuery] string? programme = null)
    {
        var guides = await _guideService.GetGuidesAsync(categorySlug, programme, includeUnpublished: true);
        return Ok(new { success = true, count = guides.Count, guides });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetGuide(string id)
    {
        var guide = await _guideService.GetGuideByIdAsync(id);
        if (guide == null) return NotFound(new { success = false, error = "Study guide not found." });

        return Ok(new { success = true, guide });
    }

    [HttpPost]
    public async Task<IActionResult> CreateGuide([FromBody] CreateCuratedGuideRequest request)
    {
        try
        {
            var adminId = GetAdminUserId();
            var guide = await _guideService.CreateGuideAsync(request, adminId);
            return Ok(new { success = true, guide });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateGuide(string id, [FromBody] UpdateCuratedGuideRequest request)
    {
        try
        {
            var adminId = GetAdminUserId();
            var guide = await _guideService.UpdateGuideAsync(id, request, adminId);
            return Ok(new { success = true, guide });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, error = ex.Message });
        }
    }

    [HttpPost("{id}/publish")]
    public async Task<IActionResult> PublishGuide(string id)
    {
        try
        {
            var adminId = GetAdminUserId();
            var guide = await _guideService.PublishGuideAsync(id, adminId);
            return Ok(new { success = true, guide });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteGuide(string id)
    {
        var deleted = await _guideService.DeleteGuideAsync(id);
        if (!deleted) return NotFound(new { success = false, error = "Study guide not found." });

        return Ok(new { success = true, message = "Study guide deleted." });
    }
}
