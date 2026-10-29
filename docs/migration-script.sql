-- PrepFord SQLite-to-PostgreSQL Authoritative Migration Script
-- Generated: 2026-10-29T09:12:12.249Z
BEGIN TRANSACTION;

-- 1. Seed Required RBAC Roles
INSERT INTO "Roles" ("Id", "Name", "Description", "IsSystem", "CreatedAt")
VALUES
  ('role_candidate', 'candidate', 'Standard nursing examination candidate', true, NOW()),
  ('role_admin', 'admin', 'Administrative privileges for subscription and platform management', true, NOW())
ON CONFLICT ("Id") DO NOTHING;

-- 2. Subscription Plans
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'rn-pro', 'nclex-rn-pro', 'NCLEX-RN Complete Preparation', 'RN-PRO', 'Full question bank, readiness assessments, and progress tracking for registered nurse candidates.', 'Registered Nurse (RN) licensure candidates seeking comprehensive preparation.',
  'RN', 'pro', 5900, NULL,
  'USD', 1, 'month', '30-Day Monthly Access',
  '["Full NCLEX-RN practice question bank","Detailed clinical & distractor answer rationales","Full-length practice exams","3 readiness assessments included","Topic-level performance & accuracy tracking"]', true, NULL, NULL, NULL,
  'Most Popular for RN', 1, true, '["rn"]',
  '2026-10-28T12:53:09.675Z', '2026-10-28T12:53:09.675Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'rn-pro-90', 'nclex-rn-pro-90', 'NCLEX-RN Complete Preparation (90-Day)', 'RN-PRO-90', '90-day quarterly access to the full NCLEX-RN question bank, readiness assessments, Study Guide notes, and domain progress tracking.', 'Registered Nurse (RN) candidates following a 1 to 3 month structured study schedule.',
  'RN', 'pro', 14900, 17700,
  'USD', 2, 'quarter', '90-Day Quarterly Access',
  '["Full NCLEX-RN practice question bank (90 days)","Detailed clinical & distractor answer rationales","7-domain Nursing Study Guide & clinical notes","3 readiness assessments included","Topic-level performance & accuracy tracking"]', true, NULL, NULL, NULL,
  'Most Popular for RN', 2, true, '["rn"]',
  '2026-10-28T12:53:09.675Z', '2026-10-28T12:53:09.675Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'pn-pro', 'nclex-pn-pro', 'NCLEX-PN Complete Preparation', 'PN-PRO', 'Full question bank, readiness assessments, and progress tracking for practical/vocational nurse candidates.', 'LPN and LVN candidates preparing for practical/vocational nursing licensure.',
  'PN', 'pro', 5900, NULL,
  'USD', 1, 'month', '30-Day Monthly Access',
  '["Full NCLEX-PN practice question bank","Option-by-option clinical & distractor rationales","7-domain Nursing Study Guide & clinical notes","3 readiness assessments included","Coordinated care & Client Needs progress tracking"]', true, NULL, NULL, NULL,
  'Recommended for PN Candidates', 3, true, '["pn"]',
  '2026-10-28T12:53:09.675Z', '2026-10-28T12:53:09.675Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'pn-pro-90', 'nclex-pn-pro-90', 'NCLEX-PN Complete Preparation (90-Day)', 'PN-PRO-90', '90-day quarterly access to the full NCLEX-PN question bank, readiness assessments, Study Guide notes, and progress tracking.', 'LPN and LVN candidates following a 1 to 3 month structured study schedule.',
  'PN', 'pro', 14900, 17700,
  'USD', 2, 'quarter', '90-Day Quarterly Access',
  '["Full NCLEX-PN practice question bank (90 days)","Option-by-option clinical & distractor rationales","7-domain Nursing Study Guide & clinical notes","3 readiness assessments included","Coordinated care & Client Needs progress tracking"]', true, NULL, NULL, NULL,
  'Recommended for PN Candidates', 4, true, '["pn"]',
  '2026-10-28T12:53:09.675Z', '2026-10-28T12:53:09.675Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'rn-starter', 'nclex-rn-starter', 'NCLEX-RN Starter Review', 'RN-STARTER', 'Essential study tools and sample question bank for registered nurse licensure candidates.', 'RN candidates beginning early topic review or supplemental practice.',
  'RN', 'starter', 2900, NULL,
  'USD', 1, 'month', '30-Day Monthly Access',
  '["Access to foundational RN practice questions","Detailed answer rationales","7-domain Nursing Study Guide access","Basic topic progress tracking"]', false, NULL, NULL, NULL,
  NULL, 5, true, '["rn"]',
  '2026-10-28T12:53:09.675Z', '2026-10-28T12:53:09.675Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'rn-starter-90', 'nclex-rn-starter-90', 'NCLEX-RN Starter Review (90-Day)', 'RN-STARTER-90', '90-day quarterly access to essential NCLEX-RN study tools, sample question practice, and clinical rationales.', 'RN candidates building foundational nursing knowledge over a full academic term.',
  'RN', 'starter', 7500, 8700,
  'USD', 2, 'quarter', '90-Day Quarterly Access',
  '["Access to foundational RN practice questions (90 days)","Detailed answer rationales","7-domain Nursing Study Guide access","Basic topic progress tracking"]', false, NULL, NULL, NULL,
  NULL, 6, true, '["rn"]',
  '2026-10-28T12:53:09.675Z', '2026-10-28T12:53:09.675Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'pn-starter', 'nclex-pn-starter', 'NCLEX-PN Starter Review', 'PN-STARTER', 'Essential study tools and sample question bank for practical nurse candidates.', 'LPN/LVN students seeking foundational question practice and study notes.',
  'PN', 'starter', 2900, NULL,
  'USD', 1, 'month', '30-Day Monthly Access',
  '["Access to foundational PN practice questions","Detailed answer & distractor rationales","7-domain Nursing Study Guide & notes","Basic topic progress tracking"]', false, NULL, NULL, NULL,
  NULL, 7, true, '["pn"]',
  '2026-10-28T12:53:09.675Z', '2026-10-28T12:53:09.675Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'pn-starter-90', 'nclex-pn-starter-90', 'NCLEX-PN Starter Review (90-Day)', 'PN-STARTER-90', '90-day quarterly access to essential NCLEX-PN study tools, sample question practice, and clinical rationales.', 'LPN/LVN students building foundational nursing knowledge over a full term.',
  'PN', 'starter', 7500, 8700,
  'USD', 2, 'quarter', '90-Day Quarterly Access',
  '["Access to foundational PN practice questions (90 days)","Detailed answer & distractor rationales","7-domain Nursing Study Guide & notes","Basic topic progress tracking"]', false, NULL, NULL, NULL,
  NULL, 8, true, '["pn"]',
  '2026-10-28T12:53:09.675Z', '2026-10-28T12:53:09.675Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'prep-premium', 'nclex-all-access', 'NCLEX-RN & PN All-Access', 'PREP-PREMIUM', 'Comprehensive multi-pathway suite with both RN and PN question banks, clinical scenarios, and study plans.', 'Candidates or bridging students who want full access to both RN and PN pathways.',
  'Both', 'premium', 8900, NULL,
  'USD', 1, 'month', '30-Day Monthly Access',
  '["Full question bank access (both PN & RN tracks)","Multi-step clinical scenario practice items","Structured daily study routine & domain tracking","Priority educator email support","High-alert pharmacology & Study Guide notes"]', false, NULL, NULL, NULL,
  'Dual Pathway Suite', 9, true, '["rn","pn"]',
  '2026-10-28T12:53:09.675Z', '2026-10-28T12:53:09.675Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'prep-premium-90', 'nclex-all-access-90', 'NCLEX-RN & PN All-Access (90-Day)', 'PREP-PREMIUM-90', '90-day quarterly access to both NCLEX-PN and NCLEX-RN pathways, clinical scenarios, and priority support.', 'Candidates seeking extended multi-pathway preparation and educator support.',
  'Both', 'premium', 22900, 26700,
  'USD', 2, 'quarter', '90-Day Quarterly Access',
  '["Full question bank access (both PN & RN tracks for 90 days)","Multi-step clinical scenario practice items","Structured daily study routine & domain tracking","Priority educator email support","High-alert pharmacology & Study Guide notes"]', false, NULL, NULL, NULL,
  'Best Value Dual Pathway', 10, true, '["rn","pn"]',
  '2026-10-28T12:53:09.675Z', '2026-10-28T12:53:09.675Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'rn-readiness', 'nclex-rn-readiness', 'NCLEX-RN Readiness Assessment Pack', 'RN-READINESS', '3 full-length server-scored practice assessments with domain-level scoring reports.', 'RN candidates who want standalone timed readiness assessments before exam day.',
  'RN', 'readiness', 3900, NULL,
  'USD', 4, 'one-time', 'One-Time Assessment Pack',
  '["3 timed, full-length RN practice assessments","Topic breakdown and domain score report","Readiness performance summary","Full rationale review for every question"]', false, NULL, NULL, NULL,
  NULL, 11, true, '["rn"]',
  '2026-10-28T12:53:09.675Z', '2026-10-28T12:53:09.675Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'pn-readiness', 'nclex-pn-readiness', 'NCLEX-PN Readiness Assessment Pack', 'PN-READINESS', '3 full-length practical nursing readiness assessments with Client Needs category scoring feedback.', 'PN candidates looking to benchmark their exam readiness with standalone timed assessments.',
  'PN', 'readiness', 3900, NULL,
  'USD', 4, 'one-time', 'One-Time Assessment Pack',
  '["3 timed, full-length PN practice assessments","Client Needs category score report","Readiness performance summary","Full rationale review for every question"]', false, NULL, NULL, NULL,
  NULL, 12, true, '["pn"]',
  '2026-10-28T12:53:09.675Z', '2026-10-28T12:53:09.675Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'custom-test-plan-1793191989633', 'custom-test-plan-1793191989633', 'Test Admin Plan', 'CUSTOM-TEST-PLAN-1793191989633', 'A test plan created via admin API', NULL,
  'Both', 'premium', 10900, NULL,
  'USD', 1, 'month', NULL,
  '["Feature A","Feature B"]', false, NULL, NULL, NULL,
  'Admin Special', 99, false, '["rn","pn"]',
  '2026-10-28T12:53:09.784Z', '2026-10-28T12:53:09.820Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'custom-test-plan-1793192220483', 'custom-test-plan-1793192220483', 'Test Admin Plan', 'CUSTOM-TEST-PLAN-1793192220483', 'A test plan created via admin API', NULL,
  'Both', 'premium', 10900, NULL,
  'USD', 1, 'month', NULL,
  '["Feature A","Feature B"]', false, NULL, NULL, NULL,
  'Admin Special', 99, false, '["rn","pn"]',
  '2026-10-28T12:57:00.507Z', '2026-10-28T12:57:00.594Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'custom-test-plan-1793193655619', 'custom-test-plan-1793193655619', 'Test Admin Plan', 'CUSTOM-TEST-PLAN-1793193655619', 'A test plan created via admin API', NULL,
  'Both', 'premium', 10900, NULL,
  'USD', 1, 'month', NULL,
  '["Feature A","Feature B"]', false, NULL, NULL, NULL,
  'Admin Special', 99, false, '["rn","pn"]',
  '2026-10-28T13:20:55.650Z', '2026-10-28T13:20:55.713Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'custom-test-plan-1793195046046', 'custom-test-plan-1793195046046', 'Test Admin Plan', 'CUSTOM-TEST-PLAN-1793195046046', 'A test plan created via admin API', NULL,
  'Both', 'premium', 10900, NULL,
  'USD', 1, 'month', NULL,
  '["Feature A","Feature B"]', false, NULL, NULL, NULL,
  'Admin Special', 99, false, '["rn","pn"]',
  '2026-10-28T13:44:06.097Z', '2026-10-28T13:44:06.337Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'custom-test-plan-1793196427663', 'custom-test-plan-1793196427663', 'Test Admin Plan', 'CUSTOM-TEST-PLAN-1793196427663', 'A test plan created via admin API', NULL,
  'Both', 'premium', 10900, NULL,
  'USD', 1, 'month', NULL,
  '["Feature A","Feature B"]', false, NULL, NULL, NULL,
  'Admin Special', 99, false, '["rn","pn"]',
  '2026-10-28T14:07:07.700Z', '2026-10-28T14:07:07.791Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'custom-test-plan-1793196681078', 'custom-test-plan-1793196681078', 'Test Admin Plan', 'CUSTOM-TEST-PLAN-1793196681078', 'A test plan created via admin API', NULL,
  'Both', 'premium', 10900, NULL,
  'USD', 1, 'month', NULL,
  '["Feature A","Feature B"]', false, NULL, NULL, NULL,
  'Admin Special', 99, false, '["rn","pn"]',
  '2026-10-28T14:11:21.104Z', '2026-10-28T14:11:21.231Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'custom-test-plan-1793250895643', 'custom-test-plan-1793250895643', 'Test Admin Plan', 'CUSTOM-TEST-PLAN-1793250895643', 'A test plan created via admin API', NULL,
  'Both', 'premium', 10900, NULL,
  'USD', 1, 'month', NULL,
  '["Feature A","Feature B"]', false, NULL, NULL, NULL,
  'Admin Special', 99, false, '["rn","pn"]',
  '2026-10-29T05:14:55.679Z', '2026-10-29T05:14:55.747Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'custom-test-plan-1793251862455', 'custom-test-plan-1793251862455', 'Test Admin Plan', 'CUSTOM-TEST-PLAN-1793251862455', 'A test plan created via admin API', NULL,
  'Both', 'premium', 10900, NULL,
  'USD', 1, 'month', NULL,
  '["Feature A","Feature B"]', false, NULL, NULL, NULL,
  'Admin Special', 99, false, '["rn","pn"]',
  '2026-10-29T05:31:02.482Z', '2026-10-29T05:31:02.552Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'custom-test-plan-1793253830455', 'custom-test-plan-1793253830455', 'Test Admin Plan', 'CUSTOM-TEST-PLAN-1793253830455', 'A test plan created via admin API', NULL,
  'Both', 'premium', 10900, NULL,
  'USD', 1, 'month', NULL,
  '["Feature A","Feature B"]', false, NULL, NULL, NULL,
  'Admin Special', 99, false, '["rn","pn"]',
  '2026-10-29T06:03:50.483Z', '2026-10-29T06:03:50.593Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'custom-test-plan-1793254027197', 'custom-test-plan-1793254027197', 'Test Admin Plan', 'CUSTOM-TEST-PLAN-1793254027197', 'A test plan created via admin API', NULL,
  'Both', 'premium', 10900, NULL,
  'USD', 1, 'month', NULL,
  '["Feature A","Feature B"]', false, NULL, NULL, NULL,
  'Admin Special', 99, false, '["rn","pn"]',
  '2026-10-29T06:07:07.244Z', '2026-10-29T06:07:07.393Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'custom-test-plan-1793254436440', 'custom-test-plan-1793254436440', 'Test Admin Plan', 'CUSTOM-TEST-PLAN-1793254436440', 'A test plan created via admin API', NULL,
  'Both', 'premium', 10900, NULL,
  'USD', 1, 'month', NULL,
  '["Feature A","Feature B"]', false, NULL, NULL, NULL,
  'Admin Special', 99, false, '["rn","pn"]',
  '2026-10-29T06:13:56.460Z', '2026-10-29T06:13:56.546Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'custom-test-plan-1793262683707', 'custom-test-plan-1793262683707', 'Test Admin Plan', 'CUSTOM-TEST-PLAN-1793262683707', 'A test plan created via admin API', NULL,
  'Both', 'premium', 10900, NULL,
  'USD', 1, 'month', NULL,
  '["Feature A","Feature B"]', false, NULL, NULL, NULL,
  'Admin Special', 99, false, '["rn","pn"]',
  '2026-10-29T08:31:23.744Z', '2026-10-29T08:31:23.863Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'custom-test-plan-1793263616443', 'custom-test-plan-1793263616443', 'Test Admin Plan', 'CUSTOM-TEST-PLAN-1793263616443', 'A test plan created via admin API', NULL,
  'Both', 'premium', 10900, NULL,
  'USD', 1, 'month', NULL,
  '["Feature A","Feature B"]', false, NULL, NULL, NULL,
  'Admin Special', 99, false, '["rn","pn"]',
  '2026-10-29T08:46:56.487Z', '2026-10-29T08:46:56.609Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";
INSERT INTO "SubscriptionPlans" (
  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
) VALUES (
  'custom-test-plan-1793263856572', 'custom-test-plan-1793263856572', 'Test Admin Plan', 'CUSTOM-TEST-PLAN-1793263856572', 'A test plan created via admin API', NULL,
  'Both', 'premium', 10900, NULL,
  'USD', 1, 'month', NULL,
  '["Feature A","Feature B"]', false, NULL, NULL, NULL,
  'Admin Special', 99, false, '["rn","pn"]',
  '2026-10-29T08:50:56.650Z', '2026-10-29T08:50:56.763Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "Name" = EXCLUDED."Name",
  "Description" = EXCLUDED."Description",
  "PriceCents" = EXCLUDED."PriceCents",
  "IsActive" = EXCLUDED."IsActive",
  "UpdatedAt" = EXCLUDED."UpdatedAt";

-- 3. Users and User Roles
INSERT INTO "Users" (
  "Id", "Email", "PasswordHash", "DisplayName", "Pathway", "TargetExamDate", "ActivePlan",
  "EmailNotifications", "StudyReminders", "IsActive", "HasProfileImage", "ProfileImageUpdatedAt",
  "CreatedAt", "UpdatedAt"
) VALUES (
  'prf_usr_85d27643549b141f2c22', 'rhenisstate@gmail.com', 'RESET_REQUIRED_f08f7c07ec8029eeae147afda9504a85', 'Rhenisstate', 'rn',
  '2026-11-30', 'NCLEX-RN Complete Preparation Plan', true, true,
  true, true, '2026-10-28T07:19:09.187Z',
  '2026-10-28T07:19:19.794Z', '2026-10-28T07:19:19.794Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "DisplayName" = EXCLUDED."DisplayName",
  "Pathway" = EXCLUDED."Pathway",
  "TargetExamDate" = EXCLUDED."TargetExamDate",
  "UpdatedAt" = EXCLUDED."UpdatedAt";

INSERT INTO "UserRoles" ("UserId", "RoleId")
VALUES ('prf_usr_85d27643549b141f2c22', 'role_candidate')
ON CONFLICT DO NOTHING;
INSERT INTO "Users" (
  "Id", "Email", "PasswordHash", "DisplayName", "Pathway", "TargetExamDate", "ActivePlan",
  "EmailNotifications", "StudyReminders", "IsActive", "HasProfileImage", "ProfileImageUpdatedAt",
  "CreatedAt", "UpdatedAt"
) VALUES (
  'prf_usr_jane_learner_123', 'jane.learner@nursing.edu', 'RESET_REQUIRED_1cfb7b0bee6086fb774177a767bfe08b', 'Jane Learner', 'rn',
  '2026-12-15', 'NCLEX-RN Complete Preparation Plan', true, true,
  true, false, NULL,
  '2026-10-29T08:51:56.401Z', '2026-10-29T08:51:56.401Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "DisplayName" = EXCLUDED."DisplayName",
  "Pathway" = EXCLUDED."Pathway",
  "TargetExamDate" = EXCLUDED."TargetExamDate",
  "UpdatedAt" = EXCLUDED."UpdatedAt";

INSERT INTO "UserRoles" ("UserId", "RoleId")
VALUES ('prf_usr_jane_learner_123', 'role_candidate')
ON CONFLICT DO NOTHING;
INSERT INTO "Users" (
  "Id", "Email", "PasswordHash", "DisplayName", "Pathway", "TargetExamDate", "ActivePlan",
  "EmailNotifications", "StudyReminders", "IsActive", "HasProfileImage", "ProfileImageUpdatedAt",
  "CreatedAt", "UpdatedAt"
) VALUES (
  'prf_usr_alex_checkout_456', 'alex.checkout@nursing.edu', 'RESET_REQUIRED_e78ffa9823b550f4b2b92e8ce7923dd2', 'Alex Candidate', 'both',
  '2026-11-30', 'NCLEX-RN & PN All-Access', true, true,
  true, false, NULL,
  '2026-10-29T08:52:15.116Z', '2026-10-29T08:52:15.116Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "DisplayName" = EXCLUDED."DisplayName",
  "Pathway" = EXCLUDED."Pathway",
  "TargetExamDate" = EXCLUDED."TargetExamDate",
  "UpdatedAt" = EXCLUDED."UpdatedAt";

INSERT INTO "UserRoles" ("UserId", "RoleId")
VALUES ('prf_usr_alex_checkout_456', 'role_candidate')
ON CONFLICT DO NOTHING;
INSERT INTO "Users" (
  "Id", "Email", "PasswordHash", "DisplayName", "Pathway", "TargetExamDate", "ActivePlan",
  "EmailNotifications", "StudyReminders", "IsActive", "HasProfileImage", "ProfileImageUpdatedAt",
  "CreatedAt", "UpdatedAt"
) VALUES (
  'usr_jane_sec_001', 'jane.security@nursing.edu', 'RESET_REQUIRED_878797fa7c6f514ae22d7621c6393f40', 'Jane Security', 'rn',
  '2026-11-30', 'NCLEX-RN Complete Preparation Plan', true, true,
  true, false, NULL,
  '2026-10-29T06:03:45.244Z', '2026-10-29T08:50:51.254Z'
) ON CONFLICT ("Id") DO UPDATE SET
  "DisplayName" = EXCLUDED."DisplayName",
  "Pathway" = EXCLUDED."Pathway",
  "TargetExamDate" = EXCLUDED."TargetExamDate",
  "UpdatedAt" = EXCLUDED."UpdatedAt";

INSERT INTO "UserRoles" ("UserId", "RoleId")
VALUES ('usr_jane_sec_001', 'role_candidate')
ON CONFLICT DO NOTHING;

-- 4. User Sessions (Revoked)
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793253825243_77477301124a95a4268cbb834b5cb591', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793253825243_77477301124a95a4268cbb834b5cb591', 'd8179a890552d4c0399f79851481c830', '2026-10-29T06:03:45.244Z',
  '2026-11-05T06:03:45.244Z', '2026-10-29T06:03:45.244Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793253825324_bf0dbd62875c659a0248fc648e2b450f', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793253825324_bf0dbd62875c659a0248fc648e2b450f', 'a89c8051e1ed54ca4dc12f4b251ec64e', '2026-10-29T06:03:45.324Z',
  '2026-11-05T06:03:45.324Z', '2026-10-29T06:03:45.324Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793253825335_66eea80961bb1cd096116408b6698a5f', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793253825335_66eea80961bb1cd096116408b6698a5f', 'e45e16f8ca1a783cc7fb7b30d2d6c080', '2026-10-29T06:03:45.336Z',
  '2026-11-05T06:03:45.336Z', '2026-10-29T06:03:45.336Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793254004318_27cec44e2726cac5b12ff29b7650d55a', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793254004318_27cec44e2726cac5b12ff29b7650d55a', '4791b383474ee47cecb12301af87ea60', '2026-10-29T06:06:44.319Z',
  '2026-11-05T06:06:44.319Z', '2026-10-29T06:06:44.319Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793254004361_664d1092be89002656afc6595a4bfba4', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793254004361_664d1092be89002656afc6595a4bfba4', '6291cdc70924c8b37061addd1b148a96', '2026-10-29T06:06:44.362Z',
  '2026-11-05T06:06:44.362Z', '2026-10-29T06:06:44.362Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793254004369_51ac45d4f88ccec21ca551a9fe2034a0', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793254004369_51ac45d4f88ccec21ca551a9fe2034a0', 'daf933054ab90166fe543d6ae6118726', '2026-10-29T06:06:44.369Z',
  '2026-11-05T06:06:44.369Z', '2026-10-29T06:06:44.369Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793254023095_a6ecb62ec915fa122efc0449640aa8c9', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793254023095_a6ecb62ec915fa122efc0449640aa8c9', '458a8bb23c5cb436dc2d2ce373b756d5', '2026-10-29T06:07:03.098Z',
  '2026-11-05T06:07:03.098Z', '2026-10-29T06:07:03.098Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793254023204_3c00125ba96347b00c0e5dc4b0cd3729', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793254023204_3c00125ba96347b00c0e5dc4b0cd3729', '7f74d3083df818d3fe742d2366dd3acc', '2026-10-29T06:07:03.204Z',
  '2026-11-05T06:07:03.204Z', '2026-10-29T06:07:03.204Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793254023217_58beb0265d927a43161de17fd96aebda', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793254023217_58beb0265d927a43161de17fd96aebda', 'caf1e32a5617afe68b0ca4c6f311e5d4', '2026-10-29T06:07:03.217Z',
  '2026-11-05T06:07:03.217Z', '2026-10-29T06:07:03.217Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793254431348_1a878db6ab7db626b66bb578c8878941', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793254431348_1a878db6ab7db626b66bb578c8878941', 'e5746bb531908991e155e058ec51cdc4', '2026-10-29T06:13:51.348Z',
  '2026-11-05T06:13:51.348Z', '2026-10-29T06:13:51.348Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793254431426_76c0a051060f54e43ed2c194d5eeb4c3', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793254431426_76c0a051060f54e43ed2c194d5eeb4c3', 'b804f54ad443bfe0e4327229ec94a1af', '2026-10-29T06:13:51.426Z',
  '2026-11-05T06:13:51.426Z', '2026-10-29T06:13:51.426Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793254431434_5707f63eb00d1ebb11fa07e6d6f6453f', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793254431434_5707f63eb00d1ebb11fa07e6d6f6453f', 'a90a258ccf4e306945b128c6ca9ac213', '2026-10-29T06:13:51.435Z',
  '2026-11-05T06:13:51.435Z', '2026-10-29T06:13:51.435Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793262677084_8f98f51d08b3bcd494a8a82512a44e6a', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793262677084_8f98f51d08b3bcd494a8a82512a44e6a', '3ff773dd05f79afdfd5f1cfe7c443d3e', '2026-10-29T08:31:17.088Z',
  '2026-11-05T08:31:17.088Z', '2026-10-29T08:31:17.088Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793262677156_1e4fbd2bae8288def03e8b855a632d35', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793262677156_1e4fbd2bae8288def03e8b855a632d35', 'fe90a725f237c5e330c5b3b8fedcb4d6', '2026-10-29T08:31:17.156Z',
  '2026-11-05T08:31:17.156Z', '2026-10-29T08:31:17.156Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793262677164_3e75d1fcdf90816048eb5bbb9bdbf9a6', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793262677164_3e75d1fcdf90816048eb5bbb9bdbf9a6', '1f5525cfddb6607508ba3d23609a0514', '2026-10-29T08:31:17.164Z',
  '2026-11-05T08:31:17.164Z', '2026-10-29T08:31:17.164Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793263608695_e041b69b7e8ab94702f00b3d082da478', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793263608695_e041b69b7e8ab94702f00b3d082da478', '786fe5be959b98748f945d06df9173b9', '2026-10-29T08:46:48.696Z',
  '2026-11-05T08:46:48.696Z', '2026-10-29T08:46:48.696Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793263608831_7bb68aa6e2dd047b34c21fcccc2ab0a8', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793263608831_7bb68aa6e2dd047b34c21fcccc2ab0a8', 'd36b0c33d84adc79124a62b88fbd537c', '2026-10-29T08:46:48.831Z',
  '2026-11-05T08:46:48.831Z', '2026-10-29T08:46:48.831Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793263608838_a507708ed3f358ab18cbb5daf9ab1ebd', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793263608838_a507708ed3f358ab18cbb5daf9ab1ebd', 'f523a034c52e4425e357caf74b469ee9', '2026-10-29T08:46:48.838Z',
  '2026-11-05T08:46:48.838Z', '2026-10-29T08:46:48.838Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793263850915_eeaa33690d4abc636d6c9ad3dd21421b', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793263850915_eeaa33690d4abc636d6c9ad3dd21421b', 'f01c93216ec1b49e98fba43d3408817f', '2026-10-29T08:50:50.920Z',
  '2026-11-05T08:50:50.920Z', '2026-10-29T08:50:50.920Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793263851009_063b78aa03ce79fc23df943d24ad92ae', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793263851009_063b78aa03ce79fc23df943d24ad92ae', 'a47cfde48e2c9bfb6d57810f43afa429', '2026-10-29T08:50:51.009Z',
  '2026-11-05T08:50:51.009Z', '2026-10-29T08:50:51.009Z', true
) ON CONFLICT ("Id") DO NOTHING;
INSERT INTO "UserSessions" (
  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
) VALUES (
  'sess_1793263851016_5a0c6ded9309f7f3524449f7bc320783', 'usr_jane_sec_001', 'jane.security@nursing.edu', 'candidate', 'jane.security',
  'legacy_migrated_revoked_sess_1793263851016_5a0c6ded9309f7f3524449f7bc320783', 'fd231741c50df78b2113c3a4e4f9ca97', '2026-10-29T08:50:51.016Z',
  '2026-11-05T08:50:51.016Z', '2026-10-29T08:50:51.016Z', true
) ON CONFLICT ("Id") DO NOTHING;

COMMIT;