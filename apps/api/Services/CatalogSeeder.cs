using System.Text.Json;
using Microsoft.EntityFrameworkCore;
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

        // 2. Seed Default Roles (idempotent and resilient to partial or historical role sets)
        var canonicalRoles = new[]
        {
            new Role { Name = "superadmin", Description = "System Super Administrator", IsSystem = true },
            new Role { Name = "admin", Description = "Operations Administrator", IsSystem = true },
            new Role { Name = "content_manager", Description = "Curriculum & Question Bank Manager", IsSystem = true },
            new Role { Name = "exam_manager", Description = "Examination & CAT Manager", IsSystem = true },
            new Role { Name = "reviewer", Description = "Clinical Content Reviewer", IsSystem = true },
            new Role { Name = "instructor", Description = "Faculty & Course Instructor", IsSystem = true },
            new Role { Name = "support", Description = "Support & Learner Operations", IsSystem = true },
            new Role { Name = "candidate", Description = "Nursing Candidate / Learner", IsSystem = true }
        };

        var existingRoles = await context.Roles
            .ToDictionaryAsync(r => r.Name, StringComparer.OrdinalIgnoreCase, cancellationToken);

        var missingRoles = canonicalRoles
            .Where(role => !existingRoles.ContainsKey(role.Name))
            .ToList();

        if (missingRoles.Count > 0)
        {
            logger.LogInformation("Seeding missing RBAC roles: {MissingRoles}", string.Join(", ", missingRoles.Select(r => r.Name)));
            context.Roles.AddRange(missingRoles);
            await context.SaveChangesAsync(cancellationToken);

            // Refresh existing roles dictionary
            existingRoles = await context.Roles
                .ToDictionaryAsync(r => r.Name, StringComparer.OrdinalIgnoreCase, cancellationToken);
        }

        // 2b. Seed Permissions Catalog
        var existingPerms = await context.Permissions
            .ToDictionaryAsync(p => p.Key, StringComparer.OrdinalIgnoreCase, cancellationToken);

        var missingPerms = Preform.Api.Security.PermissionsCatalog.All
            .Where(p => !existingPerms.ContainsKey(p.Key))
            .Select(p => new Permission
            {
                Id = Guid.NewGuid().ToString(),
                Key = p.Key,
                Name = p.Name,
                Category = p.Category
            })
            .ToList();

        if (missingPerms.Count > 0)
        {
            logger.LogInformation("Seeding {Count} missing RBAC permissions...", missingPerms.Count);
            context.Permissions.AddRange(missingPerms);
            await context.SaveChangesAsync(cancellationToken);

            existingPerms = await context.Permissions
                .ToDictionaryAsync(p => p.Key, StringComparer.OrdinalIgnoreCase, cancellationToken);
        }

        // 2c. Seed Default Role Permissions
        var existingRolePerms = await context.RolePermissions
            .Select(rp => new { rp.RoleId, rp.PermissionId })
            .ToListAsync(cancellationToken);
        var existingRpSet = new HashSet<(string, string)>(existingRolePerms.Select(rp => (rp.RoleId, rp.PermissionId)));

        var newRolePermissions = new List<RolePermission>();

        void Assign(string roleName, params string[] permPrefixesOrKeys)
        {
            if (!existingRoles.TryGetValue(roleName, out var role)) return;

            foreach (var perm in existingPerms.Values)
            {
                bool matches = permPrefixesOrKeys.Any(p =>
                    p == "*" ||
                    p == perm.Key ||
                    (p.EndsWith(".*") && perm.Key.StartsWith(p.Substring(0, p.Length - 1))));

                if (matches && !existingRpSet.Contains((role.Id, perm.Id)))
                {
                    newRolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = perm.Id });
                    existingRpSet.Add((role.Id, perm.Id));
                }
            }
        }

        Assign("superadmin", "*");
        Assign("admin", "users.*", "roles.view", "roles.create", "roles.edit", "audit_logs.*", "security.*", "content.*", "exams.*", "subscriptions.*", "system.health", "question_types.*");
        Assign("content_manager", "content.*", "exams.view", "exams.create", "exams.edit", "exams.review", "question_types.*");
        Assign("exam_manager", "exams.*", "content.view", "content.create", "content.edit");
        Assign("reviewer", "content.view", "content.review", "content.edit", "exams.view", "exams.review");
        Assign("instructor", "content.view", "content.create", "content.edit", "exams.view");
        Assign("support", "users.view", "users.sessions", "audit_logs.view", "security.sessions", "system.health");

        if (newRolePermissions.Count > 0)
        {
            logger.LogInformation("Seeding {Count} default role permissions...", newRolePermissions.Count);
            context.RolePermissions.AddRange(newRolePermissions);
            await context.SaveChangesAsync(cancellationToken);
        }

        // 3. Seed Question-Type Catalogue (idempotent upsert by Key)
        await new QuestionTypeCatalogueSeeder(QuestionTypeRegistry.Instance).SeedAsync(context, logger, cancellationToken);

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

        // 5. Seed Default Global Session Security Policy
        if (!await context.SessionSecurityPolicies.AnyAsync(cancellationToken))
        {
            logger.LogInformation("Seeding default global session security policy...");
            context.SessionSecurityPolicies.Add(new SessionSecurityPolicy
            {
                Id = "global_policy",
                MaxConcurrentSessions = 2,
                MaxSessionsPerClient = 1,
                IdleTimeoutMinutes = 300,
                AbsoluteTimeoutMinutes = 10080,
                EnforceFingerprint = true,
                EnforceIpConsistency = false,
                AllowIpDrift = true,
                RotateOnLogin = true,
                RotateOnPrivilegeChange = true,
                RotateOnPasswordChange = true,
                PolicyVersion = 1,
                UpdatedAt = DateTime.UtcNow,
                UpdatedBy = "system",
                IsActive = true
            });
            await context.SaveChangesAsync(cancellationToken);
        }

        // 6. Seed Canonical NCLEX Client Needs Categories (NCSBN 8 domains)
        var canonicalClientNeeds = new[]
        {
            new ClientNeed
            {
                Id = "cn_moc",
                Code = "MOC",
                Name = "Safe and Effective Care Environment: Management of Care",
                Description = "Providing and directing nursing care that enhances the care delivery setting to protect clients and healthcare personnel (advance directives, advocacy, case management, confidentiality, delegation, informed consent, ethical/legal responsibilities).",
                DisplayOrder = 1,
                IsActive = true,
                Pathway = "both"
            },
            new ClientNeed
            {
                Id = "cn_sic",
                Code = "SIC",
                Name = "Safe and Effective Care Environment: Safety and Infection Control",
                Description = "Protecting clients and healthcare personnel from health and environmental hazards (accident prevention, emergency response, hazardous materials, infection control, surgical asepsis).",
                DisplayOrder = 2,
                IsActive = true,
                Pathway = "both"
            },
            new ClientNeed
            {
                Id = "cn_hpm",
                Code = "HPM",
                Name = "Health Promotion and Maintenance",
                Description = "Providing and directing nursing care incorporating knowledge of expected growth and development principles, prevention and early detection of health problems, and strategies to achieve optimal health.",
                DisplayOrder = 3,
                IsActive = true,
                Pathway = "both"
            },
            new ClientNeed
            {
                Id = "cn_psi",
                Code = "PSI",
                Name = "Psychosocial Integrity",
                Description = "Promoting and supporting the emotional, mental, and social well-being of the client experiencing stressful events, as well as clients with acute or chronic mental illness.",
                DisplayOrder = 4,
                IsActive = true,
                Pathway = "both"
            },
            new ClientNeed
            {
                Id = "cn_bcc",
                Code = "BCC",
                Name = "Physiological Integrity: Basic Care and Comfort",
                Description = "Providing comfort and assistance in the performance of activities of daily living (assistive devices, elimination, mobility, nutrition, personal hygiene, rest and sleep).",
                DisplayOrder = 5,
                IsActive = true,
                Pathway = "both"
            },
            new ClientNeed
            {
                Id = "cn_ppt",
                Code = "PPT",
                Name = "Physiological Integrity: Pharmacological and Parenteral Therapies",
                Description = "Providing care related to the administration of medications and parenteral therapies (adverse effects, blood products, dosage calculation, expected outcomes, intravenous therapy, total parenteral nutrition).",
                DisplayOrder = 6,
                IsActive = true,
                Pathway = "both"
            },
            new ClientNeed
            {
                Id = "cn_rrp",
                Code = "RRP",
                Name = "Physiological Integrity: Reduction of Risk Potential",
                Description = "Reducing the likelihood that clients will develop complications or health problems related to existing conditions, treatments or procedures (vital signs, diagnostic tests, lab values, post-op complications, surgical procedures).",
                DisplayOrder = 7,
                IsActive = true,
                Pathway = "both"
            },
            new ClientNeed
            {
                Id = "cn_pha",
                Code = "PHA",
                Name = "Physiological Integrity: Physiological Adaptation",
                Description = "Managing and providing care for clients with acute, chronic or life-threatening physical health conditions (alterations in body systems, fluid and electrolyte imbalances, hemodynamics, illness management, medical emergencies, pathophysiology).",
                DisplayOrder = 8,
                IsActive = true,
                Pathway = "both"
            }
        };

        var existingClientNeeds = await context.ClientNeeds
            .ToDictionaryAsync(cn => cn.Code, StringComparer.OrdinalIgnoreCase, cancellationToken);

        var missingClientNeeds = canonicalClientNeeds
            .Where(cn => !existingClientNeeds.ContainsKey(cn.Code))
            .ToList();

        if (missingClientNeeds.Count > 0)
        {
            logger.LogInformation("Seeding {Count} missing NCLEX Client Needs categories...", missingClientNeeds.Count);
            context.ClientNeeds.AddRange(missingClientNeeds);
            await context.SaveChangesAsync(cancellationToken);
        }

        // 7. Seed Initial Curriculum Taxonomy Hierarchy (if empty)
        if (!await context.Courses.AnyAsync(cancellationToken))
        {
            logger.LogInformation("Seeding initial NCLEX-RN and NCLEX-PN curriculum taxonomy...");
            var rnProgramme = await context.Programmes.FirstOrDefaultAsync(p => p.Code == ProgrammeCode.RN, cancellationToken);
            var pnProgramme = await context.Programmes.FirstOrDefaultAsync(p => p.Code == ProgrammeCode.PN, cancellationToken);

            if (rnProgramme != null)
            {
                var rnCourse = new Course
                {
                    Id = "course_rn_core",
                    ProgrammeId = rnProgramme.Id,
                    Title = "NCLEX-RN Comprehensive Nursing Curriculum",
                    Description = "Official comprehensive curriculum framework for Registered Nurse licensure candidates.",
                    DisplayOrder = 1,
                    IsPublished = true,
                    IsActive = true,
                };
                context.Courses.Add(rnCourse);

                var rnDomain = new SubjectDomain
                {
                    Id = "domain_rn_safe_care",
                    CourseId = rnCourse.Id,
                    Title = "Safe and Effective Care Environment",
                    Description = "Management of care, safety protocols, and infection control standards.",
                    DisplayOrder = 1,
                    IsActive = true,
                };
                context.SubjectDomains.Add(rnDomain);

                var rnCategory = new Category
                {
                    Id = "cat_rn_mgmt_care",
                    SubjectDomainId = rnDomain.Id,
                    Name = "Management of Care",
                    Slug = "management-of-care",
                    Description = "Principles of clinical delegation, legal rights, and prioritization.",
                    DisplayOrder = 1,
                    IsActive = true,
                };
                context.Categories.Add(rnCategory);

                var rnSubcat = new Subcategory
                {
                    Id = "subcat_rn_delegation",
                    CategoryId = rnCategory.Id,
                    Name = "Prioritization and Delegation",
                    Slug = "prioritization-and-delegation",
                    Description = "Assignment and supervision of nursing activities to UAP, LPN/VN, and team members.",
                    DisplayOrder = 1,
                    IsActive = true,
                };
                context.Subcategories.Add(rnSubcat);

                var rnTopic = new Topic
                {
                    Id = "topic_rn_delegation_rules",
                    SubcategoryId = rnSubcat.Id,
                    Title = "Five Rights of Nursing Delegation",
                    Summary = "Clinical criteria: Right task, circumstances, person, direction/communication, and supervision.",
                    Content = "Nursing delegation requires evaluation of client stability, scope of practice, and competence verification.",
                    DisplayOrder = 1,
                    IsPublished = true,
                };
                context.Topics.Add(rnTopic);
            }

            if (pnProgramme != null)
            {
                var pnCourse = new Course
                {
                    Id = "course_pn_core",
                    ProgrammeId = pnProgramme.Id,
                    Title = "NCLEX-PN Practical Nursing Review",
                    Description = "Curriculum framework for Practical / Vocational Nurse licensure candidates.",
                    DisplayOrder = 2,
                    IsPublished = true,
                    IsActive = true,
                };
                context.Courses.Add(pnCourse);

                var pnDomain = new SubjectDomain
                {
                    Id = "domain_pn_safe_care",
                    CourseId = pnCourse.Id,
                    Title = "Safe and Effective Care Environment",
                    Description = "Coordinated care, safety protocols, and client protection.",
                    DisplayOrder = 1,
                    IsActive = true,
                };
                context.SubjectDomains.Add(pnDomain);

                var pnCategory = new Category
                {
                    Id = "cat_pn_coord_care",
                    SubjectDomainId = pnDomain.Id,
                    Name = "Coordinated Care",
                    Slug = "coordinated-care",
                    Description = "Collaboration with healthcare team and supervision within scope.",
                    DisplayOrder = 1,
                    IsActive = true,
                };
                context.Categories.Add(pnCategory);

                var pnSubcat = new Subcategory
                {
                    Id = "subcat_pn_collaboration",
                    CategoryId = pnCategory.Id,
                    Name = "Clinical Collaboration",
                    Slug = "clinical-collaboration",
                    Description = "Participating in interprofessional care planning and implementation.",
                    DisplayOrder = 1,
                    IsActive = true,
                };
                context.Subcategories.Add(pnSubcat);

                var pnTopic = new Topic
                {
                    Id = "topic_pn_scope_practice",
                    SubcategoryId = pnSubcat.Id,
                    Title = "Scope of Practice and Client Advocacy",
                    Summary = "Roles and responsibilities of the practical nurse in multidisciplinary settings.",
                    Content = "The LPN/VN participates in data collection, planning, and care delivery under RN or physician direction.",
                    DisplayOrder = 1,
                    IsPublished = true,
                };
                context.Topics.Add(pnTopic);
            }

            await context.SaveChangesAsync(cancellationToken);
        }
    }


}
