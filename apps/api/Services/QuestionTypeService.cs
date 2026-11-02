using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

/// <summary>
/// Read-only service for the authoritative question-type catalogue.
/// Does not expose answer keys, scoring secrets, or private authoring metadata.
/// </summary>
public interface IQuestionTypeService
{
    Task<List<QuestionTypeDto>> GetAllQuestionTypesAsync(CancellationToken cancellationToken = default);
    Task<QuestionTypeDto?> GetQuestionTypeByKeyAsync(string key, CancellationToken cancellationToken = default);
    Task<ValidateQuestionTypeResponse> ValidateQuestionTypeKeyAsync(string key, CancellationToken cancellationToken = default);
    Task<bool> EnsureCatalogueSeededAsync(CancellationToken cancellationToken = default);
}

public class QuestionTypeService : IQuestionTypeService
{
    private readonly AppDbContext _context;

    public QuestionTypeService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<QuestionTypeDto>> GetAllQuestionTypesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.QuestionTypeDefinitions
            .Where(q => q.IsActive)
            .OrderBy(q => q.DisplayOrder)
            .Select(q => new QuestionTypeDto
            {
                Id = q.Id,
                Key = q.Key,
                Name = q.Name,
                Description = q.Description,
                Category = q.Category,
                SupportedScoring = q.SupportedScoring,
                CapabilityFlags = q.CapabilityFlags,
                Capabilities = CapabilityFlagsToNames(q.CapabilityFlags),
                ImplementationStatus = q.ImplementationStatus,
                IsActive = q.IsActive,
                DisplayOrder = q.DisplayOrder,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<QuestionTypeDto?> GetQuestionTypeByKeyAsync(string key, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(key)) return null;

        var q = await _context.QuestionTypeDefinitions
            .Where(q => q.IsActive && q.Key == key.Trim())
            .Select(q => new QuestionTypeDto
            {
                Id = q.Id,
                Key = q.Key,
                Name = q.Name,
                Description = q.Description,
                Category = q.Category,
                SupportedScoring = q.SupportedScoring,
                CapabilityFlags = q.CapabilityFlags,
                Capabilities = CapabilityFlagsToNames(q.CapabilityFlags),
                ImplementationStatus = q.ImplementationStatus,
                IsActive = q.IsActive,
                DisplayOrder = q.DisplayOrder,
            })
            .FirstOrDefaultAsync(cancellationToken);

        return q;
    }

    public async Task<ValidateQuestionTypeResponse> ValidateQuestionTypeKeyAsync(string key, CancellationToken cancellationToken = default)
    {
        var response = new ValidateQuestionTypeResponse { Valid = false };

        if (string.IsNullOrWhiteSpace(key))
        {
            response.Error = "Question-type key is required.";
            return response;
        }

        var normalizedKey = key.Trim();
        var q = await _context.QuestionTypeDefinitions
            .Where(q => q.Key == normalizedKey)
            .FirstOrDefaultAsync(cancellationToken);

        if (q == null)
        {
            response.Error = $"Unknown question-type key '{normalizedKey}'.";
            return response;
        }

        response.Valid = true;
        response.IsActive = q.IsActive;
        response.Key = q.Key;

        if (!q.IsActive)
        {
            response.Error = $"Question-type key '{normalizedKey}' is inactive.";
        }

        return response;
    }

    public async Task<bool> EnsureCatalogueSeededAsync(CancellationToken cancellationToken = default)
    {
        var types = CatalogueDefinitions();
        var changed = false;

        foreach (var definition in types)
        {
            var existing = await _context.QuestionTypeDefinitions
                .FirstOrDefaultAsync(q => q.Key == definition.Key, cancellationToken);

            if (existing == null)
            {
                _context.QuestionTypeDefinitions.Add(definition);
                changed = true;
            }
            else
            {
                // Update capability/status metadata if it differs (non-destructive for Name/Description).
                // Only overwrite metadata fields, never overwrite administrator-managed content.
                bool needsUpdate = false;

                if (existing.CapabilityFlags != definition.CapabilityFlags)
                {
                    existing.CapabilityFlags = definition.CapabilityFlags;
                    needsUpdate = true;
                }

                if (existing.ImplementationStatus != definition.ImplementationStatus)
                {
                    existing.ImplementationStatus = definition.ImplementationStatus;
                    needsUpdate = true;
                }

                if (existing.IsActive != definition.IsActive)
                {
                    existing.IsActive = definition.IsActive;
                    needsUpdate = true;
                }

                if (existing.DisplayOrder != definition.DisplayOrder)
                {
                    existing.DisplayOrder = definition.DisplayOrder;
                    needsUpdate = true;
                }

                if (existing.Category != definition.Category)
                {
                    existing.Category = definition.Category;
                    needsUpdate = true;
                }

                if (existing.SupportedScoring != definition.SupportedScoring)
                {
                    existing.SupportedScoring = definition.SupportedScoring;
                    needsUpdate = true;
                }

                if (needsUpdate)
                {
                    changed = true;
                }
            }
        }

        if (changed)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }

        return true;
    }

    private static List<string> CapabilityFlagsToNames(int flags)
    {
        var names = new List<string>();
        foreach (QuestionTypeCapability capability in Enum.GetValues(typeof(QuestionTypeCapability)))
        {
            if (capability == QuestionTypeCapability.None) continue;
            if ((flags & (int)capability) != 0)
            {
                names.Add(capability.ToString());
            }
        }
        return names;
    }

    /// <summary>
    /// Authoritative catalogue definitions for all 18 question types.
    /// Keys must match the frontend catalogue exactly and never change.
    /// </summary>
    private static List<QuestionTypeDefinition> CatalogueDefinitions()
    {
        return new List<QuestionTypeDefinition>
        {
            new()
            {
                Key = "single-choice",
                Name = "Single Choice",
                Description = "Standard single-answer multiple-choice question.",
                Category = "Traditional",
                SupportedScoring = "ExactMatch",
                CapabilityFlags = (int)(QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.SupportsRandomizedOptions),
                ImplementationStatus = nameof(QuestionTypeStatus.DeliverySupported),
                IsActive = true,
                DisplayOrder = 1,
            },
            new()
            {
                Key = "multiple-choice",
                Name = "Multiple Choice",
                Description = "Multiple-choice item with single or multiple keys.",
                Category = "Traditional",
                SupportedScoring = "ExactMatch",
                CapabilityFlags = (int)(QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsMultipleSelections | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.SupportsRandomizedOptions),
                ImplementationStatus = nameof(QuestionTypeStatus.DeliverySupported),
                IsActive = true,
                DisplayOrder = 2,
            },
            new()
            {
                Key = "sata",
                Name = "Select All That Apply (SATA)",
                Description = "Multi-select clinical prioritization question.",
                Category = "Traditional",
                SupportedScoring = "PartialCredit",
                CapabilityFlags = (int)(QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsMultipleSelections | QuestionTypeCapability.SupportsMultipleCorrectAnswers | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.SupportsPartialCredit | QuestionTypeCapability.SupportsRandomizedOptions),
                ImplementationStatus = nameof(QuestionTypeStatus.DeliverySupported),
                IsActive = true,
                DisplayOrder = 3,
            },
            new()
            {
                Key = "checkbox",
                Name = "Checkbox Response",
                Description = "Form-based checkbox response interaction.",
                Category = "Traditional",
                SupportedScoring = "PartialCredit",
                CapabilityFlags = (int)(QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsMultipleSelections | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.SupportsPartialCredit | QuestionTypeCapability.SupportsRandomizedOptions),
                ImplementationStatus = nameof(QuestionTypeStatus.DeliverySupported),
                IsActive = true,
                DisplayOrder = 4,
            },
            new()
            {
                Key = "image-based",
                Name = "Image-Based Question",
                Description = "Clinical scenario with diagnostic radiograph or photo exhibit.",
                Category = "Clinical",
                SupportedScoring = "ExactMatch",
                CapabilityFlags = (int)(QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsMedia | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.SupportsRandomizedOptions),
                ImplementationStatus = nameof(QuestionTypeStatus.DeliverySupported),
                IsActive = true,
                DisplayOrder = 5,
            },
            new()
            {
                Key = "multiple-image",
                Name = "Multiple-Image Item",
                Description = "Comparative visual exhibits for diagnostic identification.",
                Category = "Clinical",
                SupportedScoring = "ExactMatch",
                CapabilityFlags = (int)(QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsMedia | QuestionTypeCapability.SupportsMultipleSelections | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.SupportsRandomizedOptions),
                ImplementationStatus = nameof(QuestionTypeStatus.DeliverySupported),
                IsActive = true,
                DisplayOrder = 6,
            },
            new()
            {
                Key = "drag-drop",
                Name = "Drag-and-Drop",
                Description = "Interactive clinical priority classification.",
                Category = "NGN",
                SupportedScoring = "ExactMatch",
                CapabilityFlags = (int)(QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.RequiresSpecializedRenderer | QuestionTypeCapability.RequiresSpecializedInput),
                ImplementationStatus = nameof(QuestionTypeStatus.Catalogued),
                IsActive = true,
                DisplayOrder = 7,
            },
            new()
            {
                Key = "ordering",
                Name = "Ordering / Sequencing",
                Description = "Step-by-step procedural or nursing intervention order.",
                Category = "NGN",
                SupportedScoring = "ExactMatch",
                CapabilityFlags = (int)(QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.RequiresSpecializedRenderer | QuestionTypeCapability.RequiresSpecializedInput),
                ImplementationStatus = nameof(QuestionTypeStatus.Catalogued),
                IsActive = true,
                DisplayOrder = 8,
            },
            new()
            {
                Key = "case-study",
                Name = "NGN Case Study",
                Description = "Multi-part clinical unfolding case study with EHR tabs.",
                Category = "NGN",
                SupportedScoring = "PartialCredit",
                CapabilityFlags = (int)(QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.SupportsClinicalScenarios | QuestionTypeCapability.SupportsExhibits | QuestionTypeCapability.SupportsPartialCredit | QuestionTypeCapability.SupportsManualGrading | QuestionTypeCapability.RequiresSpecializedRenderer),
                ImplementationStatus = nameof(QuestionTypeStatus.Catalogued),
                IsActive = true,
                DisplayOrder = 9,
            },
            new()
            {
                Key = "essay",
                Name = "Extended Response / Essay",
                Description = "Clinical reasoning reflection requiring instructor review.",
                Category = "Traditional",
                SupportedScoring = "ManualReview",
                CapabilityFlags = (int)(QuestionTypeCapability.SupportsManualGrading | QuestionTypeCapability.RequiresSpecializedRenderer),
                ImplementationStatus = nameof(QuestionTypeStatus.Catalogued),
                IsActive = true,
                DisplayOrder = 10,
            },
            new()
            {
                Key = "matching",
                Name = "Matching",
                Description = "Paired concept-to-intervention clinical matching.",
                Category = "Traditional",
                SupportedScoring = "ExactMatch",
                CapabilityFlags = (int)(QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.RequiresSpecializedRenderer | QuestionTypeCapability.RequiresSpecializedInput),
                ImplementationStatus = nameof(QuestionTypeStatus.Catalogued),
                IsActive = true,
                DisplayOrder = 11,
            },
            new()
            {
                Key = "fill-blank",
                Name = "Fill-in-the-Blank",
                Description = "Direct textual entry for clinical terms or dosage.",
                Category = "Traditional",
                SupportedScoring = "ExactMatch",
                CapabilityFlags = (int)(QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.RequiresSpecializedInput),
                ImplementationStatus = nameof(QuestionTypeStatus.Catalogued),
                IsActive = true,
                DisplayOrder = 12,
            },
            new()
            {
                Key = "matrix",
                Name = "Matrix / Grid Response",
                Description = "Tabular multiple-response clinical evaluation matrix.",
                Category = "NGN",
                SupportedScoring = "PartialCredit",
                CapabilityFlags = (int)(QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.SupportsPartialCredit | QuestionTypeCapability.RequiresSpecializedRenderer | QuestionTypeCapability.RequiresSpecializedInput),
                ImplementationStatus = nameof(QuestionTypeStatus.Catalogued),
                IsActive = true,
                DisplayOrder = 13,
            },
            new()
            {
                Key = "numeric",
                Name = "Numeric Response",
                Description = "Dosage calculation and clinical measurement entry.",
                Category = "Traditional",
                SupportedScoring = "ExactMatch",
                CapabilityFlags = (int)(QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.RequiresSpecializedInput),
                ImplementationStatus = nameof(QuestionTypeStatus.Catalogued),
                IsActive = true,
                DisplayOrder = 14,
            },
            new()
            {
                Key = "true-false",
                Name = "True / False",
                Description = "Binary clinical fact and safety validation.",
                Category = "Traditional",
                SupportedScoring = "ExactMatch",
                CapabilityFlags = (int)(QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.SupportsRandomizedOptions),
                ImplementationStatus = nameof(QuestionTypeStatus.DeliverySupported),
                IsActive = true,
                DisplayOrder = 15,
            },
            new()
            {
                Key = "tabular",
                Name = "Tabular Response",
                Description = "Data table evaluation for clinical interventions.",
                Category = "NGN",
                SupportedScoring = "PartialCredit",
                CapabilityFlags = (int)(QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.SupportsPartialCredit | QuestionTypeCapability.RequiresSpecializedRenderer | QuestionTypeCapability.RequiresSpecializedInput),
                ImplementationStatus = nameof(QuestionTypeStatus.Catalogued),
                IsActive = true,
                DisplayOrder = 16,
            },
            new()
            {
                Key = "short-answer",
                Name = "Short-Answer Response",
                Description = "Concise clinical assessment entry.",
                Category = "Traditional",
                SupportedScoring = "ManualReview",
                CapabilityFlags = (int)(QuestionTypeCapability.SupportsManualGrading | QuestionTypeCapability.RequiresSpecializedInput),
                ImplementationStatus = nameof(QuestionTypeStatus.Catalogued),
                IsActive = true,
                DisplayOrder = 17,
            },
            new()
            {
                Key = "dynamic-lab",
                Name = "Dynamic Lab Value Response",
                Description = "Interactive laboratory value and trend analysis.",
                Category = "NGN",
                SupportedScoring = "ExactMatch",
                CapabilityFlags = (int)(QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.RequiresSpecializedRenderer),
                ImplementationStatus = nameof(QuestionTypeStatus.Catalogued),
                IsActive = true,
                DisplayOrder = 18,
            },
        };
    }
}
