using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using System.Security.Claims;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/testimonials")]
public class TestimonialsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<TestimonialsController> _logger;

    public TestimonialsController(AppDbContext context, ILogger<TestimonialsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetApprovedTestimonials([FromQuery] string? pathway, [FromQuery] int limit = 20)
    {
        var query = _context.Testimonials
            .AsNoTracking()
            .Where(t => t.Status == TestimonialStatus.Approved);

        if (!string.IsNullOrWhiteSpace(pathway))
        {
            var normalizedPathway = pathway.Trim().ToUpperInvariant();
            if (normalizedPathway == "RN" || normalizedPathway == "PN")
            {
                query = query.Where(t => t.Pathway == normalizedPathway || t.Pathway == "Both");
            }
        }

        var results = await query
            .OrderByDescending(t => t.CreatedAt)
            .Take(Math.Clamp(limit, 1, 50))
            .Select(t => new TestimonialResponseDto
            {
                Id = t.Id,
                DisplayName = t.DisplayName,
                Pathway = t.Pathway,
                Quote = t.Quote,
                AvatarUrl = t.AvatarUrl,
                OutcomeVerified = t.OutcomeVerified,
                Status = t.Status,
                CreatedAt = t.CreatedAt
            })
            .ToListAsync();

        return Ok(new TestimonialsListResponse
        {
            Success = true,
            Count = results.Count,
            Testimonials = results
        });
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> SubmitTestimonial([FromBody] CreateTestimonialRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, errors = ModelState });
        }

        if (!request.ConsentGranted)
        {
            return BadRequest(new { success = false, error = "Consent must be explicitly granted to publish feedback." });
        }

        var userId = User?.FindFirstValue(ClaimTypes.NameIdentifier);

        var testimonial = new Testimonial
        {
            UserId = userId,
            DisplayName = request.DisplayName.Trim(),
            Pathway = request.Pathway.Trim().ToUpperInvariant() switch
            {
                "PN" => "PN",
                "BOTH" => "Both",
                _ => "RN"
            },
            Quote = request.Quote.Trim(),
            AvatarUrl = string.IsNullOrWhiteSpace(request.AvatarUrl) ? null : request.AvatarUrl.Trim(),
            Status = TestimonialStatus.Pending,
            ConsentGranted = true,
            OutcomeVerified = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Testimonials.Add(testimonial);
        await _context.SaveChangesAsync();

        _logger.LogInformation("New candidate testimonial submitted for review (ID: {Id}, Pathway: {Pathway})", testimonial.Id, testimonial.Pathway);

        return StatusCode(201, new
        {
            success = true,
            message = "Thank you for sharing your experience! Your reflection has been submitted for moderation and will appear publicly once approved.",
            id = testimonial.Id
        });
    }

    [HttpPatch("/api/v1/admin/testimonials/{id}/status")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> ModerateTestimonial(Guid id, [FromBody] ModerateTestimonialRequest request)
    {
        var testimonial = await _context.Testimonials.FindAsync(id);
        if (testimonial == null)
        {
            return NotFound(new { success = false, error = "Testimonial not found." });
        }

        var adminEmail = User.FindFirstValue(ClaimTypes.Email) ?? "admin";
        testimonial.Status = request.Status;
        testimonial.ModeratedAt = DateTime.UtcNow;
        testimonial.ModeratedBy = adminEmail;

        if (request.OutcomeVerified.HasValue)
        {
            testimonial.OutcomeVerified = request.OutcomeVerified.Value;
        }

        // Record Audit Log
        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "admin",
            Action = $"TESTIMONIAL_MODERATED_{request.Status.ToString().ToUpperInvariant()}",
            EntityType = "Testimonial",
            EntityId = testimonial.Id.ToString(),
            Description = $"Testimonial status set to {request.Status} by {adminEmail}. Verified outcome: {testimonial.OutcomeVerified}."
        });

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"Testimonial {id} updated to {request.Status}.",
            status = testimonial.Status.ToString()
        });
    }
}
