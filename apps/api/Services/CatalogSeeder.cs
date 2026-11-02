using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Preform.Api.Data;
using Preform.Api.Models;

namespace Preform.Api.Services;

public static class CatalogSeeder
{
    public static async Task SeedAsync(AppDbContext context, ILogger logger, CancellationToken cancellationToken = default)
    {
        // 1. Seed Programmes (RN, PN)
        if (!await context.Programmes.AnyAsync(cancellationToken))
        {
            logger.LogInformation("Seeding default NCLEX-RN and NCLEX-PN programmes...");
            context.Programmes.AddRange(
                new Programme
                {
                    Code = ProgrammeCode.RN,
                    DisplayName = "NCLEX-RN",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Programme
                {
                    Code = ProgrammeCode.PN,
                    DisplayName = "NCLEX-PN",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            );
            await context.SaveChangesAsync(cancellationToken);
        }

        // 2. Seed Default Roles
        if (!await context.Roles.AnyAsync(cancellationToken))
        {
            logger.LogInformation("Seeding RBAC roles...");
            context.Roles.AddRange(
                new Role { Name = "superadmin", Description = "System Super Administrator", IsSystem = true },
                new Role { Name = "admin", Description = "Operations Administrator", IsSystem = true },
                new Role { Name = "content_manager", Description = "Curriculum & Question Bank Manager", IsSystem = true },
                new Role { Name = "exam_manager", Description = "Examination & CAT Manager", IsSystem = true },
                new Role { Name = "reviewer", Description = "Clinical Content Reviewer", IsSystem = true },
                new Role { Name = "instructor", Description = "Faculty & Course Instructor", IsSystem = true },
                new Role { Name = "candidate", Description = "Nursing Candidate / Learner", IsSystem = true }
            );
            await context.SaveChangesAsync(cancellationToken);
        }

        // 3. Seed Question-Type Catalogue (idempotent upsert by Key)
        await SeedQuestionTypesAsync(context, logger, cancellationToken);

        // 4. Seed Canonical 12 Subscription Plans
        if (!await context.SubscriptionPlans.AnyAsync(cancellationToken))
        {
            logger.LogInformation("Seeding canonical PrepFord subscription plans catalogue...");
            var now = DateTime.UtcNow;

            var canonicalPlans = new List<SubscriptionPlan>
            {
                new SubscriptionPlan
                {
                    Id = "rn-pro",
                    Slug = "nclex-rn-pro",
                    Code = "nclex-rn-pro",
                    Name = "NCLEX-RN Complete Preparation",
                    Description = "Full question bank, readiness assessments, and progress tracking for registered nurse candidates.",
                    Audience = "Registered Nurse (RN) licensure candidates seeking comprehensive preparation.",
                    Pathway = "RN",
                    PlanType = "pro",
                    PriceCents = 5900,
                    Currency = "USD",
                    Interval = SubscriptionInterval.Monthly,
                    BillingInterval = "month",
                    DurationLabel = "30-Day Monthly Access",
                    FeaturesJson = JsonSerializer.Serialize(new[]
                    {
                        "Full NCLEX-RN practice question bank",
                        "Detailed clinical & distractor answer rationales",
                        "Full-length practice exams",
                        "3 readiness assessments included",
                        "Topic-level performance & accuracy tracking"
                    }),
                    Popular = true,
                    BadgeText = "Most Popular for RN",
                    DisplayOrder = 1,
                    IsActive = true,
                    EntitlementsJson = "[\"rn\"]",
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new SubscriptionPlan
                {
                    Id = "rn-pro-90",
                    Slug = "nclex-rn-pro-90",
                    Code = "nclex-rn-pro-90",
                    Name = "NCLEX-RN Complete Preparation (90-Day)",
                    Description = "90-day quarterly access to the full NCLEX-RN question bank, readiness assessments, Study Guide notes, and domain progress tracking.",
                    Audience = "Registered Nurse (RN) candidates following a 1 to 3 month structured study schedule.",
                    Pathway = "RN",
                    PlanType = "pro",
                    PriceCents = 14900,
                    OriginalPriceCents = 17700,
                    Currency = "USD",
                    Interval = SubscriptionInterval.Quarterly,
                    BillingInterval = "quarter",
                    DurationLabel = "90-Day Quarterly Access",
                    FeaturesJson = JsonSerializer.Serialize(new[]
                    {
                        "Full NCLEX-RN practice question bank (90 days)",
                        "Detailed clinical & distractor answer rationales",
                        "7-domain Nursing Study Guide & clinical notes",
                        "3 readiness assessments included",
                        "Topic-level performance & accuracy tracking"
                    }),
                    Popular = true,
                    BadgeText = "Most Popular for RN",
                    DisplayOrder = 2,
                    IsActive = true,
                    EntitlementsJson = "[\"rn\"]",
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new SubscriptionPlan
                {
                    Id = "pn-pro",
                    Slug = "nclex-pn-pro",
                    Code = "nclex-pn-pro",
                    Name = "NCLEX-PN Complete Preparation",
                    Description = "Full question bank, readiness assessments, and progress tracking for practical/vocational nurse candidates.",
                    Audience = "LPN and LVN candidates preparing for practical/vocational nursing licensure.",
                    Pathway = "PN",
                    PlanType = "pro",
                    PriceCents = 5900,
                    Currency = "USD",
                    Interval = SubscriptionInterval.Monthly,
                    BillingInterval = "month",
                    DurationLabel = "30-Day Monthly Access",
                    FeaturesJson = JsonSerializer.Serialize(new[]
                    {
                        "Full NCLEX-PN practice question bank",
                        "Option-by-option clinical & distractor rationales",
                        "7-domain Nursing Study Guide & clinical notes",
                        "3 readiness assessments included",
                        "Coordinated care & Client Needs progress tracking"
                    }),
                    Popular = true,
                    BadgeText = "Recommended for PN Candidates",
                    DisplayOrder = 3,
                    IsActive = true,
                    EntitlementsJson = "[\"pn\"]",
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new SubscriptionPlan
                {
                    Id = "pn-pro-90",
                    Slug = "nclex-pn-pro-90",
                    Code = "nclex-pn-pro-90",
                    Name = "NCLEX-PN Complete Preparation (90-Day)",
                    Description = "90-day quarterly access to the full NCLEX-PN question bank, readiness assessments, Study Guide notes, and progress tracking.",
                    Audience = "LPN and LVN candidates following a 1 to 3 month structured study schedule.",
                    Pathway = "PN",
                    PlanType = "pro",
                    PriceCents = 14900,
                    OriginalPriceCents = 17700,
                    Currency = "USD",
                    Interval = SubscriptionInterval.Quarterly,
                    BillingInterval = "quarter",
                    DurationLabel = "90-Day Quarterly Access",
                    FeaturesJson = JsonSerializer.Serialize(new[]
                    {
                        "Full NCLEX-PN practice question bank (90 days)",
                        "Option-by-option clinical & distractor rationales",
                        "7-domain Nursing Study Guide & clinical notes",
                        "3 readiness assessments included",
                        "Coordinated care & Client Needs progress tracking"
                    }),
                    Popular = true,
                    BadgeText = "Recommended for PN Candidates",
                    DisplayOrder = 4,
                    IsActive = true,
                    EntitlementsJson = "[\"pn\"]",
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new SubscriptionPlan
                {
                    Id = "rn-starter",
                    Slug = "nclex-rn-starter",
                    Code = "nclex-rn-starter",
                    Name = "NCLEX-RN Starter Review",
                    Description = "Essential study tools and sample question bank for registered nurse licensure candidates.",
                    Audience = "RN candidates beginning early topic review or supplemental practice.",
                    Pathway = "RN",
                    PlanType = "starter",
                    PriceCents = 2900,
                    Currency = "USD",
                    Interval = SubscriptionInterval.Monthly,
                    BillingInterval = "month",
                    DurationLabel = "30-Day Starter Access",
                    FeaturesJson = JsonSerializer.Serialize(new[]
                    {
                        "Core NCLEX-RN practice questions",
                        "Essential answer rationales",
                        "Baseline readiness check"
                    }),
                    Popular = false,
                    DisplayOrder = 5,
                    IsActive = true,
                    EntitlementsJson = "[\"rn\"]",
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new SubscriptionPlan
                {
                    Id = "pn-starter",
                    Slug = "nclex-pn-starter",
                    Code = "nclex-pn-starter",
                    Name = "NCLEX-PN Starter Review",
                    Description = "Essential study tools and sample question bank for practical/vocational nurse licensure candidates.",
                    Audience = "PN candidates beginning early topic review or supplemental practice.",
                    Pathway = "PN",
                    PlanType = "starter",
                    PriceCents = 2900,
                    Currency = "USD",
                    Interval = SubscriptionInterval.Monthly,
                    BillingInterval = "month",
                    DurationLabel = "30-Day Starter Access",
                    FeaturesJson = JsonSerializer.Serialize(new[]
                    {
                        "Core NCLEX-PN practice questions",
                        "Essential answer rationales",
                        "Baseline readiness check"
                    }),
                    Popular = false,
                    DisplayOrder = 6,
                    IsActive = true,
                    EntitlementsJson = "[\"pn\"]",
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new SubscriptionPlan
                {
                    Id = "prep-premium",
                    Slug = "all-access",
                    Code = "all-access",
                    Name = "NCLEX-RN & PN All-Access",
                    Description = "Unrestricted access to both NCLEX-RN and NCLEX-PN question banks, all readiness assessments, and multi-pathway progress analytics.",
                    Audience = "Nurse educators, dual-pathway candidates, or learners transitioning between PN and RN programs.",
                    Pathway = "Both",
                    PlanType = "premium",
                    PriceCents = 8900,
                    Currency = "USD",
                    Interval = SubscriptionInterval.Monthly,
                    BillingInterval = "month",
                    DurationLabel = "30-Day Dual Access",
                    FeaturesJson = JsonSerializer.Serialize(new[]
                    {
                        "Full access to BOTH RN and PN question banks",
                        "Unlimited readiness assessments for both pathways",
                        "7-domain Nursing Study Guide & clinical notes",
                        "Multi-pathway diagnostic comparison",
                        "Priority question clarification support"
                    }),
                    Popular = false,
                    BadgeText = "Dual Pathway Access",
                    DisplayOrder = 7,
                    IsActive = true,
                    EntitlementsJson = "[\"rn\",\"pn\"]",
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new SubscriptionPlan
                {
                    Id = "prep-premium-90",
                    Slug = "all-access-90",
                    Code = "all-access-90",
                    Name = "NCLEX-RN & PN All-Access (90-Day)",
                    Description = "90-day quarterly dual-pathway access to both RN and PN question banks, all readiness assessments, and comprehensive study guides.",
                    Audience = "Dual-track learners and educators seeking extended 3-month preparation across both nursing pathways.",
                    Pathway = "Both",
                    PlanType = "premium",
                    PriceCents = 21900,
                    OriginalPriceCents = 26700,
                    Currency = "USD",
                    Interval = SubscriptionInterval.Quarterly,
                    BillingInterval = "quarter",
                    DurationLabel = "90-Day Dual Access",
                    FeaturesJson = JsonSerializer.Serialize(new[]
                    {
                        "Full 90-day access to BOTH RN and PN question banks",
                        "Unlimited readiness assessments for both pathways",
                        "7-domain Nursing Study Guide & clinical notes",
                        "Multi-pathway diagnostic comparison",
                        "Priority question clarification support"
                    }),
                    Popular = false,
                    BadgeText = "Dual Pathway Access",
                    DisplayOrder = 8,
                    IsActive = true,
                    EntitlementsJson = "[\"rn\",\"pn\"]",
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new SubscriptionPlan
                {
                    Id = "rn-readiness",
                    Slug = "nclex-rn-readiness-pack",
                    Code = "nclex-rn-readiness-pack",
                    Name = "NCLEX-RN Readiness Assessment Pack",
                    Description = "Standalone bundle of 3 full-length Computerized Adaptive Testing (CAT) predictive readiness exams for RN candidates.",
                    Audience = "Candidates seeking exam readiness verification and scoring diagnostics without an active recurring question bank subscription.",
                    Pathway = "RN",
                    PlanType = "readiness",
                    PriceCents = 3900,
                    Currency = "USD",
                    Interval = SubscriptionInterval.OneTime,
                    BillingInterval = "one-time",
                    DurationLabel = "One-Time Purchase",
                    FeaturesJson = JsonSerializer.Serialize(new[]
                    {
                        "3 full-length CAT-format readiness assessments",
                        "Comprehensive Client Needs domain breakdown",
                        "Pass-prediction likelihood benchmark",
                        "Detailed item rationales for all completed attempts"
                    }),
                    Popular = false,
                    BadgeText = "Exam Simulator Only",
                    DisplayOrder = 9,
                    IsActive = true,
                    EntitlementsJson = "[\"rn\"]",
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new SubscriptionPlan
                {
                    Id = "pn-readiness",
                    Slug = "nclex-pn-readiness-pack",
                    Code = "nclex-pn-readiness-pack",
                    Name = "NCLEX-PN Readiness Assessment Pack",
                    Description = "Standalone bundle of 3 full-length Computerized Adaptive Testing (CAT) predictive readiness exams for PN candidates.",
                    Audience = "Practical nursing candidates seeking exam readiness verification and scoring diagnostics.",
                    Pathway = "PN",
                    PlanType = "readiness",
                    PriceCents = 3900,
                    Currency = "USD",
                    Interval = SubscriptionInterval.OneTime,
                    BillingInterval = "one-time",
                    DurationLabel = "One-Time Purchase",
                    FeaturesJson = JsonSerializer.Serialize(new[]
                    {
                        "3 full-length CAT-format readiness assessments",
                        "Comprehensive Client Needs domain breakdown",
                        "Pass-prediction likelihood benchmark",
                        "Detailed item rationales for all completed attempts"
                    }),
                    Popular = false,
                    BadgeText = "Exam Simulator Only",
                    DisplayOrder = 10,
                    IsActive = true,
                    EntitlementsJson = "[\"pn\"]",
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new SubscriptionPlan
                {
                    Id = "rn-premium-annual",
                    Slug = "nclex-rn-annual",
                    Code = "nclex-rn-annual",
                    Name = "NCLEX-RN Annual All-Access Pass",
                    Description = "Full 365-day access to the NCLEX-RN question bank, unlimited readiness assessments, and all clinical guides.",
                    Audience = "Nursing students in final-year coursework planning extended preparation leading to graduation and licensure.",
                    Pathway = "RN",
                    PlanType = "premium",
                    PriceCents = 27900,
                    OriginalPriceCents = 70800,
                    Currency = "USD",
                    Interval = SubscriptionInterval.Annual,
                    BillingInterval = "one-time",
                    DurationLabel = "365-Day Annual Pass",
                    FeaturesJson = JsonSerializer.Serialize(new[]
                    {
                        "365-day full access to NCLEX-RN question bank",
                        "Unlimited CAT readiness assessments",
                        "Complete 7-domain Study Guide & clinical notes library",
                        "Reset study progress anytime"
                    }),
                    Popular = false,
                    BadgeText = "Best Long-Term Value",
                    DisplayOrder = 11,
                    IsActive = true,
                    EntitlementsJson = "[\"rn\"]",
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new SubscriptionPlan
                {
                    Id = "pn-premium-annual",
                    Slug = "nclex-pn-annual",
                    Code = "nclex-pn-annual",
                    Name = "NCLEX-PN Annual All-Access Pass",
                    Description = "Full 365-day access to the NCLEX-PN question bank, unlimited readiness assessments, and all clinical guides.",
                    Audience = "Practical nursing students planning comprehensive review across their curriculum and licensure window.",
                    Pathway = "PN",
                    PlanType = "premium",
                    PriceCents = 27900,
                    OriginalPriceCents = 70800,
                    Currency = "USD",
                    Interval = SubscriptionInterval.Annual,
                    BillingInterval = "one-time",
                    DurationLabel = "365-Day Annual Pass",
                    FeaturesJson = JsonSerializer.Serialize(new[]
                    {
                        "365-day full access to NCLEX-PN question bank",
                        "Unlimited CAT readiness assessments",
                        "Complete 7-domain Study Guide & clinical notes library",
                        "Reset study progress anytime"
                    }),
                    Popular = false,
                    BadgeText = "Best Long-Term Value",
                    DisplayOrder = 12,
                    IsActive = true,
                    EntitlementsJson = "[\"pn\"]",
                    CreatedAt = now,
                    UpdatedAt = now
                }
            };

            context.SubscriptionPlans.AddRange(canonicalPlans);
            await context.SaveChangesAsync(cancellationToken);
        }
    }

    /// <summary>
    /// Idempotently seeds or updates question-type definitions by canonical Key.
    /// Migration 0002 already creates the table and seeds base rows; this method
    /// ensures CapabilityFlags, ImplementationStatus, and other metadata are present
    /// and inserts any types missing from the database.
    ///
    /// This method is resilient to databases where migration 0006 has not yet been
    /// applied (i.e. CapabilityFlags / ImplementationStatus columns may not exist).
    /// In that case, it logs a warning and continues without updating metadata.
    /// </summary>
    private static async Task SeedQuestionTypesAsync(
        AppDbContext context,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await SeedQuestionTypesAsyncInternal(context, logger, cancellationToken);
        }
        catch (Exception ex) when (ex is Microsoft.EntityFrameworkCore.DbUpdateException or Npgsql.PostgresException)
        {
            logger.LogWarning(ex, "Question-type catalogue metadata seeding skipped: required columns may not exist yet. Apply migration 0006 to enable full catalogue metadata.");
        }
    }

    private static async Task SeedQuestionTypesAsyncInternal(
        AppDbContext context,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var definitions = QuestionTypeCatalogue();
        var existingKeys = await context.QuestionTypeDefinitions
            .Select(q => q.Key)
            .ToListAsync(cancellationToken);
        var existingByKey = new HashSet<string>(existingKeys);

        var changed = false;
        var toAdd = new List<QuestionTypeDefinition>();
        var updatedKeys = new List<string>();

        foreach (var definition in definitions)
        {
            if (existingByKey.Contains(definition.Key))
            {
                var existing = await context.QuestionTypeDefinitions
                    .FirstOrDefaultAsync(q => q.Key == definition.Key, cancellationToken);

                if (existing == null) continue;

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
                    updatedKeys.Add(definition.Key);
                }
            }
            else
            {
                toAdd.Add(definition);
                changed = true;
            }
        }

        if (toAdd.Count > 0)
        {
            context.QuestionTypeDefinitions.AddRange(toAdd);
        }

        if (changed)
        {
            logger.LogInformation("Updating question-type catalogue metadata (added: {AddedCount}, updated: {UpdatedCount})...", toAdd.Count, updatedKeys.Count);
            await context.SaveChangesAsync(cancellationToken);
        }
        else
        {
            logger.LogDebug("Question-type catalogue is already up to date.");
        }
    }

    private static List<QuestionTypeDefinition> QuestionTypeCatalogue()
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
