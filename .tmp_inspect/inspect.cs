using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.Models;
using Preform.Api.Services;

var options = new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
using var context = new AppDbContext(options);
var types = new List<QuestionTypeDefinition>
{
    new() { Id = "qt-1", Key = "single-choice", Name = "Single Choice", Description = "Standard single-answer.", Category = "Traditional", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 1 },
    new() { Id = "qt-2", Key = "multiple-choice", Name = "Multiple Choice", Description = "Multiple-choice item.", Category = "Traditional", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 2 },
    new() { Id = "qt-3", Key = "sata", Name = "Select All That Apply (SATA)", Description = "Multi-select clinical prioritization.", Category = "Traditional", SupportedScoring = "PartialCredit", IsActive = true, DisplayOrder = 3 },
    new() { Id = "qt-4", Key = "checkbox", Name = "Checkbox Response", Description = "Form-based checkbox response.", Category = "Traditional", SupportedScoring = "PartialCredit", IsActive = true, DisplayOrder = 4 },
    new() { Id = "qt-5", Key = "image-based", Name = "Image-Based Question", Description = "Clinical scenario with image exhibit.", Category = "Clinical", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 5 },
    new() { Id = "qt-6", Key = "multiple-image", Name = "Multiple-Image Item", Description = "Comparative visual exhibits.", Category = "Clinical", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 6 },
    new() { Id = "qt-7", Key = "drag-drop", Name = "Drag-and-Drop", Description = "Interactive clinical priority classification.", Category = "NGN", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 7 },
    new() { Id = "qt-8", Key = "ordering", Name = "Ordering / Sequencing", Description = "Step-by-step procedural order.", Category = "NGN", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 8 },
    new() { Id = "qt-9", Key = "case-study", Name = "NGN Case Study", Description = "Multi-part clinical unfolding case study.", Category = "NGN", SupportedScoring = "PartialCredit", IsActive = true, DisplayOrder = 9 },
    new() { Id = "qt-10", Key = "essay", Name = "Extended Response / Essay", Description = "Clinical reasoning reflection.", Category = "Traditional", SupportedScoring = "ManualReview", IsActive = true, DisplayOrder = 10 },
    new() { Id = "qt-11", Key = "matching", Name = "Matching", Description = "Paired concept-to-intervention matching.", Category = "Traditional", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 11 },
    new() { Id = "qt-12", Key = "fill-blank", Name = "Fill-in-the-Blank", Description = "Direct textual entry.", Category = "Traditional", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 12 },
    new() { Id = "qt-13", Key = "matrix", Name = "Matrix / Grid Response", Description = "Tabular multiple-response matrix.", Category = "NGN", SupportedScoring = "PartialCredit", IsActive = true, DisplayOrder = 13 },
    new() { Id = "qt-14", Key = "numeric", Name = "Numeric Response", Description = "Dosage calculation entry.", Category = "Traditional", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 14 },
    new() { Id = "qt-15", Key = "true-false", Name = "True / False", Description = "Binary clinical fact validation.", Category = "Traditional", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 15 },
    new() { Id = "qt-16", Key = "tabular", Name = "Tabular Response", Description = "Data table evaluation.", Category = "NGN", SupportedScoring = "PartialCredit", IsActive = true, DisplayOrder = 16 },
    new() { Id = "qt-17", Key = "short-answer", Name = "Short-Answer Response", Description = "Concise clinical assessment entry.", Category = "Traditional", SupportedScoring = "ManualReview", IsActive = true, DisplayOrder = 17 },
    new() { Id = "qt-18", Key = "dynamic-lab", Name = "Dynamic Lab Value Response", Description = "Interactive laboratory value analysis.", Category = "NGN", SupportedScoring = "ExactMatch", IsActive = true, DisplayOrder = 18 },
};
context.QuestionTypeDefinitions.AddRange(types);
await context.SaveChangesAsync();

var svc = new QuestionTypeService(context, QuestionTypeRegistry.Instance);
var rows = await svc.GetAllQuestionTypesAsync();
var sata = rows.Single(r => r.Key == "sata");
Console.WriteLine(sata.CapabilityDetails.SupportsPartialCredit);
Console.WriteLine(JsonSerializer.Serialize(sata, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
