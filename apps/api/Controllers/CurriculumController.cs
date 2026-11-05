using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/curriculum")]
public class CurriculumController : ControllerBase
{
    private readonly ICurriculumService _curriculumService;
    private readonly ILogger<CurriculumController> _logger;

    public CurriculumController(ICurriculumService curriculumService, ILogger<CurriculumController> logger)
    {
        _curriculumService = curriculumService;
        _logger = logger;
    }

    [HttpGet("tree")]
    [Authorize(Policy = "Permission:content.view")]
    public async Task<IActionResult> GetCurriculumTree([FromQuery] bool activeOnly = false, CancellationToken ct = default)
    {
        var tree = await _curriculumService.GetCurriculumTreeAsync(activeOnly, ct);
        return Ok(new { success = true, tree });
    }

    #region Courses

    [HttpGet("courses")]
    [Authorize(Policy = "Permission:content.view")]
    public async Task<IActionResult> GetCourses([FromQuery] bool activeOnly = false, CancellationToken ct = default)
    {
        var courses = await _curriculumService.GetCoursesAsync(activeOnly, ct);
        return Ok(new { success = true, courses });
    }

    [HttpGet("courses/{id}")]
    [Authorize(Policy = "Permission:content.view")]
    public async Task<IActionResult> GetCourseById(string id, CancellationToken ct = default)
    {
        var course = await _curriculumService.GetCourseByIdAsync(id, ct);
        if (course == null) return NotFound(new ProblemDetails { Status = 404, Title = "Course Not Found", Detail = $"Course '{id}' was not found." });
        return Ok(new { success = true, course });
    }

    [HttpPost("courses")]
    [Authorize(Policy = "Permission:content.create")]
    public async Task<IActionResult> CreateCourse([FromBody] CreateCourseRequest request, CancellationToken ct = default)
    {
        try
        {
            var created = await _curriculumService.CreateCourseAsync(request, ct);
            return CreatedAtAction(nameof(GetCourseById), new { id = created.Id }, new { success = true, course = created });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Status = 400, Title = "Invalid Course", Detail = ex.Message });
        }
    }

    [HttpPut("courses/{id}")]
    [Authorize(Policy = "Permission:content.edit")]
    public async Task<IActionResult> UpdateCourse(string id, [FromBody] UpdateCourseRequest request, CancellationToken ct = default)
    {
        var updated = await _curriculumService.UpdateCourseAsync(id, request, ct);
        if (updated == null) return NotFound(new ProblemDetails { Status = 404, Title = "Course Not Found", Detail = $"Course '{id}' was not found." });
        return Ok(new { success = true, course = updated });
    }

    [HttpDelete("courses/{id}")]
    [Authorize(Policy = "Permission:content.edit")]
    public async Task<IActionResult> DeleteCourse(string id, CancellationToken ct = default)
    {
        try
        {
            var deleted = await _curriculumService.DeleteCourseAsync(id, ct);
            if (!deleted) return NotFound(new ProblemDetails { Status = 404, Title = "Course Not Found", Detail = $"Course '{id}' was not found." });
            return Ok(new { success = true, message = "Course deleted successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ProblemDetails { Status = 409, Title = "Cannot Delete Course", Detail = ex.Message });
        }
    }

    #endregion

    #region Subject Domains

    [HttpGet("subject-domains")]
    [Authorize(Policy = "Permission:content.view")]
    public async Task<IActionResult> GetSubjectDomains([FromQuery] string? courseId = null, [FromQuery] bool activeOnly = false, CancellationToken ct = default)
    {
        var domains = await _curriculumService.GetSubjectDomainsAsync(courseId, activeOnly, ct);
        return Ok(new { success = true, domains });
    }

    [HttpGet("subject-domains/{id}")]
    [Authorize(Policy = "Permission:content.view")]
    public async Task<IActionResult> GetSubjectDomainById(string id, CancellationToken ct = default)
    {
        var domain = await _curriculumService.GetSubjectDomainByIdAsync(id, ct);
        if (domain == null) return NotFound(new ProblemDetails { Status = 404, Title = "Subject Domain Not Found", Detail = $"Subject domain '{id}' was not found." });
        return Ok(new { success = true, domain });
    }

    [HttpPost("subject-domains")]
    [Authorize(Policy = "Permission:content.create")]
    public async Task<IActionResult> CreateSubjectDomain([FromBody] CreateSubjectDomainRequest request, CancellationToken ct = default)
    {
        try
        {
            var created = await _curriculumService.CreateSubjectDomainAsync(request, ct);
            return CreatedAtAction(nameof(GetSubjectDomainById), new { id = created.Id }, new { success = true, domain = created });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Status = 400, Title = "Invalid Subject Domain", Detail = ex.Message });
        }
    }

    [HttpPut("subject-domains/{id}")]
    [Authorize(Policy = "Permission:content.edit")]
    public async Task<IActionResult> UpdateSubjectDomain(string id, [FromBody] UpdateSubjectDomainRequest request, CancellationToken ct = default)
    {
        var updated = await _curriculumService.UpdateSubjectDomainAsync(id, request, ct);
        if (updated == null) return NotFound(new ProblemDetails { Status = 404, Title = "Subject Domain Not Found", Detail = $"Subject domain '{id}' was not found." });
        return Ok(new { success = true, domain = updated });
    }

    [HttpDelete("subject-domains/{id}")]
    [Authorize(Policy = "Permission:content.edit")]
    public async Task<IActionResult> DeleteSubjectDomain(string id, CancellationToken ct = default)
    {
        try
        {
            var deleted = await _curriculumService.DeleteSubjectDomainAsync(id, ct);
            if (!deleted) return NotFound(new ProblemDetails { Status = 404, Title = "Subject Domain Not Found", Detail = $"Subject domain '{id}' was not found." });
            return Ok(new { success = true, message = "Subject domain deleted successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ProblemDetails { Status = 409, Title = "Cannot Delete Subject Domain", Detail = ex.Message });
        }
    }

    #endregion

    #region Categories

    [HttpGet("categories")]
    [Authorize(Policy = "Permission:content.view")]
    public async Task<IActionResult> GetCategories([FromQuery] string? subjectDomainId = null, [FromQuery] bool activeOnly = false, CancellationToken ct = default)
    {
        var categories = await _curriculumService.GetCategoriesAsync(subjectDomainId, activeOnly, ct);
        return Ok(new { success = true, categories });
    }

    [HttpGet("categories/{id}")]
    [Authorize(Policy = "Permission:content.view")]
    public async Task<IActionResult> GetCategoryById(string id, CancellationToken ct = default)
    {
        var category = await _curriculumService.GetCategoryByIdAsync(id, ct);
        if (category == null) return NotFound(new ProblemDetails { Status = 404, Title = "Category Not Found", Detail = $"Category '{id}' was not found." });
        return Ok(new { success = true, category });
    }

    [HttpPost("categories")]
    [Authorize(Policy = "Permission:content.create")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request, CancellationToken ct = default)
    {
        try
        {
            var created = await _curriculumService.CreateCategoryAsync(request, ct);
            return CreatedAtAction(nameof(GetCategoryById), new { id = created.Id }, new { success = true, category = created });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Status = 400, Title = "Invalid Category", Detail = ex.Message });
        }
    }

    [HttpPut("categories/{id}")]
    [Authorize(Policy = "Permission:content.edit")]
    public async Task<IActionResult> UpdateCategory(string id, [FromBody] UpdateCategoryRequest request, CancellationToken ct = default)
    {
        var updated = await _curriculumService.UpdateCategoryAsync(id, request, ct);
        if (updated == null) return NotFound(new ProblemDetails { Status = 404, Title = "Category Not Found", Detail = $"Category '{id}' was not found." });
        return Ok(new { success = true, category = updated });
    }

    [HttpDelete("categories/{id}")]
    [Authorize(Policy = "Permission:content.edit")]
    public async Task<IActionResult> DeleteCategory(string id, CancellationToken ct = default)
    {
        try
        {
            var deleted = await _curriculumService.DeleteCategoryAsync(id, ct);
            if (!deleted) return NotFound(new ProblemDetails { Status = 404, Title = "Category Not Found", Detail = $"Category '{id}' was not found." });
            return Ok(new { success = true, message = "Category deleted successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ProblemDetails { Status = 409, Title = "Cannot Delete Category", Detail = ex.Message });
        }
    }

    #endregion

    #region Subcategories

    [HttpGet("subcategories")]
    [Authorize(Policy = "Permission:content.view")]
    public async Task<IActionResult> GetSubcategories([FromQuery] string? categoryId = null, [FromQuery] bool activeOnly = false, CancellationToken ct = default)
    {
        var subcategories = await _curriculumService.GetSubcategoriesAsync(categoryId, activeOnly, ct);
        return Ok(new { success = true, subcategories });
    }

    [HttpGet("subcategories/{id}")]
    [Authorize(Policy = "Permission:content.view")]
    public async Task<IActionResult> GetSubcategoryById(string id, CancellationToken ct = default)
    {
        var subcat = await _curriculumService.GetSubcategoryByIdAsync(id, ct);
        if (subcat == null) return NotFound(new ProblemDetails { Status = 404, Title = "Subcategory Not Found", Detail = $"Subcategory '{id}' was not found." });
        return Ok(new { success = true, subcategory = subcat });
    }

    [HttpPost("subcategories")]
    [Authorize(Policy = "Permission:content.create")]
    public async Task<IActionResult> CreateSubcategory([FromBody] CreateSubcategoryRequest request, CancellationToken ct = default)
    {
        try
        {
            var created = await _curriculumService.CreateSubcategoryAsync(request, ct);
            return CreatedAtAction(nameof(GetSubcategoryById), new { id = created.Id }, new { success = true, subcategory = created });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Status = 400, Title = "Invalid Subcategory", Detail = ex.Message });
        }
    }

    [HttpPut("subcategories/{id}")]
    [Authorize(Policy = "Permission:content.edit")]
    public async Task<IActionResult> UpdateSubcategory(string id, [FromBody] UpdateSubcategoryRequest request, CancellationToken ct = default)
    {
        var updated = await _curriculumService.UpdateSubcategoryAsync(id, request, ct);
        if (updated == null) return NotFound(new ProblemDetails { Status = 404, Title = "Subcategory Not Found", Detail = $"Subcategory '{id}' was not found." });
        return Ok(new { success = true, subcategory = updated });
    }

    [HttpDelete("subcategories/{id}")]
    [Authorize(Policy = "Permission:content.edit")]
    public async Task<IActionResult> DeleteSubcategory(string id, CancellationToken ct = default)
    {
        try
        {
            var deleted = await _curriculumService.DeleteSubcategoryAsync(id, ct);
            if (!deleted) return NotFound(new ProblemDetails { Status = 404, Title = "Subcategory Not Found", Detail = $"Subcategory '{id}' was not found." });
            return Ok(new { success = true, message = "Subcategory deleted successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ProblemDetails { Status = 409, Title = "Cannot Delete Subcategory", Detail = ex.Message });
        }
    }

    #endregion

    #region Topics

    [HttpGet("topics")]
    [Authorize(Policy = "Permission:content.view")]
    public async Task<IActionResult> GetTopics([FromQuery] string? subcategoryId = null, [FromQuery] bool activeOnly = false, CancellationToken ct = default)
    {
        var topics = await _curriculumService.GetTopicsAsync(subcategoryId, activeOnly, ct);
        return Ok(new { success = true, topics });
    }

    [HttpGet("topics/{id}")]
    [Authorize(Policy = "Permission:content.view")]
    public async Task<IActionResult> GetTopicById(string id, CancellationToken ct = default)
    {
        var topic = await _curriculumService.GetTopicByIdAsync(id, ct);
        if (topic == null) return NotFound(new ProblemDetails { Status = 404, Title = "Topic Not Found", Detail = $"Topic '{id}' was not found." });
        return Ok(new { success = true, topic });
    }

    [HttpPost("topics")]
    [Authorize(Policy = "Permission:content.create")]
    public async Task<IActionResult> CreateTopic([FromBody] CreateTopicRequest request, CancellationToken ct = default)
    {
        try
        {
            var created = await _curriculumService.CreateTopicAsync(request, ct);
            return CreatedAtAction(nameof(GetTopicById), new { id = created.Id }, new { success = true, topic = created });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Status = 400, Title = "Invalid Topic", Detail = ex.Message });
        }
    }

    [HttpPut("topics/{id}")]
    [Authorize(Policy = "Permission:content.edit")]
    public async Task<IActionResult> UpdateTopic(string id, [FromBody] UpdateTopicRequest request, CancellationToken ct = default)
    {
        var updated = await _curriculumService.UpdateTopicAsync(id, request, ct);
        if (updated == null) return NotFound(new ProblemDetails { Status = 404, Title = "Topic Not Found", Detail = $"Topic '{id}' was not found." });
        return Ok(new { success = true, topic = updated });
    }

    [HttpDelete("topics/{id}")]
    [Authorize(Policy = "Permission:content.edit")]
    public async Task<IActionResult> DeleteTopic(string id, CancellationToken ct = default)
    {
        try
        {
            var deleted = await _curriculumService.DeleteTopicAsync(id, ct);
            if (!deleted) return NotFound(new ProblemDetails { Status = 404, Title = "Topic Not Found", Detail = $"Topic '{id}' was not found." });
            return Ok(new { success = true, message = "Topic deleted successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ProblemDetails { Status = 409, Title = "Cannot Delete Topic", Detail = ex.Message });
        }
    }

    #endregion

    #region Client Needs

    [HttpGet("client-needs")]
    [Authorize(Policy = "Permission:content.view")]
    public async Task<IActionResult> GetClientNeeds([FromQuery] string? pathway = null, [FromQuery] bool activeOnly = false, CancellationToken ct = default)
    {
        var clientNeeds = await _curriculumService.GetClientNeedsAsync(pathway, activeOnly, ct);
        return Ok(new { success = true, clientNeeds });
    }

    [HttpGet("client-needs/{id}")]
    [Authorize(Policy = "Permission:content.view")]
    public async Task<IActionResult> GetClientNeedById(string id, CancellationToken ct = default)
    {
        var clientNeed = await _curriculumService.GetClientNeedByIdAsync(id, ct);
        if (clientNeed == null) return NotFound(new ProblemDetails { Status = 404, Title = "Client Need Not Found", Detail = $"Client Need '{id}' was not found." });
        return Ok(new { success = true, clientNeed });
    }

    [HttpPost("client-needs")]
    [Authorize(Policy = "Permission:content.create")]
    public async Task<IActionResult> CreateClientNeed([FromBody] CreateClientNeedRequest request, CancellationToken ct = default)
    {
        try
        {
            var created = await _curriculumService.CreateClientNeedAsync(request, ct);
            return CreatedAtAction(nameof(GetClientNeedById), new { id = created.Id }, new { success = true, clientNeed = created });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Status = 400, Title = "Invalid Client Need", Detail = ex.Message });
        }
    }

    [HttpPut("client-needs/{id}")]
    [Authorize(Policy = "Permission:content.edit")]
    public async Task<IActionResult> UpdateClientNeed(string id, [FromBody] UpdateClientNeedRequest request, CancellationToken ct = default)
    {
        try
        {
            var updated = await _curriculumService.UpdateClientNeedAsync(id, request, ct);
            if (updated == null) return NotFound(new ProblemDetails { Status = 404, Title = "Client Need Not Found", Detail = $"Client Need '{id}' was not found." });
            return Ok(new { success = true, clientNeed = updated });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails { Status = 400, Title = "Invalid Client Need", Detail = ex.Message });
        }
    }

    [HttpDelete("client-needs/{id}")]
    [Authorize(Policy = "Permission:content.edit")]
    public async Task<IActionResult> DeleteClientNeed(string id, CancellationToken ct = default)
    {
        try
        {
            var deleted = await _curriculumService.DeleteClientNeedAsync(id, ct);
            if (!deleted) return NotFound(new ProblemDetails { Status = 404, Title = "Client Need Not Found", Detail = $"Client Need '{id}' was not found." });
            return Ok(new { success = true, message = "Client Need deleted successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ProblemDetails { Status = 409, Title = "Cannot Delete Client Need", Detail = ex.Message });
        }
    }

    #endregion
}
