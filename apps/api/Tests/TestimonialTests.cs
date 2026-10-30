using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Controllers;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Xunit;

namespace Preform.Api.Tests;

public class TestimonialTests
{
    private AppDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task SubmitTestimonial_WithValidData_CreatesPendingTestimonial()
    {
        using var context = CreateInMemoryContext(nameof(SubmitTestimonial_WithValidData_CreatesPendingTestimonial));
        var controller = new TestimonialsController(context, NullLogger<TestimonialsController>.Instance);

        var request = new CreateTestimonialRequest
        {
            DisplayName = "Sarah M., BSN Graduate",
            Pathway = "RN",
            Quote = "The unfolding case studies closely mirrored clinical decision-making on test day.",
            ConsentGranted = true,
            AvatarUrl = "/images/avatars/avatar-female-1.png"
        };

        var result = await controller.SubmitTestimonial(request);
        var createdResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(201, createdResult.StatusCode);

        var saved = await context.Testimonials.FirstOrDefaultAsync();
        Assert.NotNull(saved);
        Assert.Equal("Sarah M., BSN Graduate", saved.DisplayName);
        Assert.Equal("RN", saved.Pathway);
        Assert.Equal(TestimonialStatus.Pending, saved.Status);
        Assert.True(saved.ConsentGranted);
        Assert.False(saved.OutcomeVerified);
    }

    [Fact]
    public async Task SubmitTestimonial_WithoutConsent_ReturnsBadRequest()
    {
        using var context = CreateInMemoryContext(nameof(SubmitTestimonial_WithoutConsent_ReturnsBadRequest));
        var controller = new TestimonialsController(context, NullLogger<TestimonialsController>.Instance);

        var request = new CreateTestimonialRequest
        {
            DisplayName = "Anonymous",
            Pathway = "PN",
            Quote = "Helpful rationales.",
            ConsentGranted = false
        };

        var result = await controller.SubmitTestimonial(request);
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(badRequest.Value);
        Assert.Empty(context.Testimonials);
    }

    [Fact]
    public async Task GetApprovedTestimonials_ReturnsOnlyApprovedRecords()
    {
        using var context = CreateInMemoryContext(nameof(GetApprovedTestimonials_ReturnsOnlyApprovedRecords));
        var controller = new TestimonialsController(context, NullLogger<TestimonialsController>.Instance);

        // Seed 1 approved, 1 pending, 1 rejected
        context.Testimonials.AddRange(
            new Testimonial
            {
                DisplayName = "Approved Candidate",
                Pathway = "RN",
                Quote = "Authentic reflection on pharmacology questions.",
                Status = TestimonialStatus.Approved,
                ConsentGranted = true,
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new Testimonial
            {
                DisplayName = "Pending Candidate",
                Pathway = "RN",
                Quote = "Pending review reflection.",
                Status = TestimonialStatus.Pending,
                ConsentGranted = true,
                CreatedAt = DateTime.UtcNow
            },
            new Testimonial
            {
                DisplayName = "Rejected Candidate",
                Pathway = "RN",
                Quote = "Inappropriate text.",
                Status = TestimonialStatus.Rejected,
                ConsentGranted = true,
                CreatedAt = DateTime.UtcNow
            }
        );
        await context.SaveChangesAsync();

        var result = await controller.GetApprovedTestimonials(null);
        var okResult = Assert.IsType<OkObjectResult>(result);
        var val = Assert.IsType<TestimonialsListResponse>(okResult.Value);
        Assert.True(val.Success);
        Assert.Equal(1, val.Count);
    }

    [Fact]
    public async Task GetApprovedTestimonials_WithPathwayFilter_ReturnsMatchingRecords()
    {
        using var context = CreateInMemoryContext(nameof(GetApprovedTestimonials_WithPathwayFilter_ReturnsMatchingRecords));
        var controller = new TestimonialsController(context, NullLogger<TestimonialsController>.Instance);

        context.Testimonials.AddRange(
            new Testimonial
            {
                DisplayName = "RN Candidate",
                Pathway = "RN",
                Quote = "RN preparation notes.",
                Status = TestimonialStatus.Approved,
                ConsentGranted = true
            },
            new Testimonial
            {
                DisplayName = "PN Candidate",
                Pathway = "PN",
                Quote = "PN clinical rationales.",
                Status = TestimonialStatus.Approved,
                ConsentGranted = true
            }
        );
        await context.SaveChangesAsync();

        var rnResult = await controller.GetApprovedTestimonials("RN");
        var rnOk = Assert.IsType<OkObjectResult>(rnResult);
        var rnVal = Assert.IsType<TestimonialsListResponse>(rnOk.Value);
        Assert.Equal(1, rnVal.Count);

        var pnResult = await controller.GetApprovedTestimonials("PN");
        var pnOk = Assert.IsType<OkObjectResult>(pnResult);
        var pnVal = Assert.IsType<TestimonialsListResponse>(pnOk.Value);
        Assert.Equal(1, pnVal.Count);
    }

    [Fact]
    public async Task ModerateTestimonial_CanApproveAndVerifyOutcome()
    {
        using var context = CreateInMemoryContext(nameof(ModerateTestimonial_CanApproveAndVerifyOutcome));
        var controller = new TestimonialsController(context, NullLogger<TestimonialsController>.Instance);

        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "admin-1"),
            new Claim(ClaimTypes.Email, "admin@prepford.com"),
            new Claim(ClaimTypes.Role, "Admin")
        }, "mock"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var testimonial = new Testimonial
        {
            DisplayName = "Candidate J",
            Pathway = "RN",
            Quote = "Passed on first attempt after 85 questions.",
            Status = TestimonialStatus.Pending,
            ConsentGranted = true
        };
        context.Testimonials.Add(testimonial);
        await context.SaveChangesAsync();

        var modRequest = new ModerateTestimonialRequest
        {
            Status = TestimonialStatus.Approved,
            OutcomeVerified = true
        };

        var result = await controller.ModerateTestimonial(testimonial.Id, modRequest);
        var okResult = Assert.IsType<OkObjectResult>(result);

        var updated = await context.Testimonials.FindAsync(testimonial.Id);
        Assert.NotNull(updated);
        Assert.Equal(TestimonialStatus.Approved, updated.Status);
        Assert.True(updated.OutcomeVerified);
        Assert.Equal("admin@prepford.com", updated.ModeratedBy);

        // Audit log created
        var audit = await context.AuditLogs.FirstOrDefaultAsync(a => a.EntityId == testimonial.Id.ToString());
        Assert.NotNull(audit);
        Assert.Contains("APPROVED", audit.Action);
    }
}
