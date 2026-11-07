PREPFORD NCLEX — MONETIZATION MANAGEMENT
Phase 1: Comprehensive Architectural Audit & Reconciliation Report

Project: PrepFord NCLEX
Repository: C:\Users\gitau\Documents\PREform
Branch: feature/dotnet-backend-migration
Audit Date: November 7, 2026
Auditors: Antigravity AI & PrepFord Architecture Engineering
Scope: Subscription Plans, Card Appearance Customization, Entitlement Enforcement, Manual Authorization, Payment Verification, Offline Payments (Cash / M-Pesa / Bank Transfer), Revenue Analytics, and Audit Logging.

1. EXECUTIVE SUMMARY

An exhaustive architectural audit of the PrepFord codebase across the ASP.NET Core 8 Web API backend (apps/api) and the Next.js 16 App Router frontend (apps/web) was conducted in accordance with the Phase Zero mandate.

The audit verified that while foundational building blocks exist—specifically EF Core models for SubscriptionPlan, UserSubscription, Order, and PaymentTransaction, HMAC-SHA256 verified webhook processing, an offline/sandbox checkout simulation gate, and an initial UserEntitlementService—the platform lacks a production-grade, authoritative monetization management subsystem.

Key gaps identified:

No Manual Subscription Authorization Workflow: No mechanism exists to record, review, verify, or authorize offline payments (Cash, M-Pesa, Bank Transfer, Direct Deposit) or prevent duplicate transaction references.
No Subscription Card Appearance & Typography Customizer: Pricing cards on public pages use static Tailwind classes. There is no database-backed, versioned appearance editor with desktop/tablet/mobile preview, typography control, or WCAG-enforced color validation for Superadmin.
Coarse-Grained Entitlement Enforcement: UserEntitlementService currently only checks candidate account activity and pathway compatibility (RN vs PN vs Both) for examination attempts. It does not enforce fine-grained premium features (Practice Exams, Custom Tests, RATs, Study Notes, Flashcards, Spaced Repetition, Performance Intelligence).
Missing Learner Subscription & Transaction Administration: Administrators have no interface to search, filter, extend, suspend, reinstate, or cancel subscriptions, nor can they view transaction logs or revenue reconciliation.
No Authoritative Financial & Revenue Analytics: Revenue reporting is absent; there is no distinction between gross collections, refunds, reversals, pending offline payments, and net revenue.
Admin Navigation Incomplete: The Admin sidebar contains only a single link to /admin/subscriptions, lacking the full 8-section Monetization Management structure mandated by Section 3.

This report establishes the baseline evidence and outlines the additive, zero-downtime architecture reconciliation plan for Phases 2 through 11.

2. EVIDENCE-BASED AUDIT OF EXISTING MONETIZATION SUBSYSTEM
2.1 Existing Subscription Plan Models & Database Entities
Backend Models (apps/api/Models/Subscriptions.cs):
SubscriptionPlan: Key Id (string), Slug (unique index), Name, Code, Description, Audience, Pathway ("RN", "PN", "Both"), PlanType ("starter", "pro", "premium", "readiness"), PriceCents, OriginalPriceCents, Currency, Interval (Monthly, Quarterly, Annual, OneTime), BillingInterval, DurationLabel, FeaturesJson, Popular, BgColour, AccentColour, TextColour, BadgeText, DisplayOrder, IsActive, EntitlementsJson, CreatedAt, UpdatedAt.
UserSubscription: Key Id (string), UserId, PlanId, OrderId (nullable), Pathway, Status (Active=1, PastDue=2, Cancelled=3, Expired=4), StartsAt, ExpiresAt, CancelledAt. Active unique index: idx_user_subscriptions_active_unique on (UserId, PlanId) WHERE Status = 1.
Order: Key Id, UserId, PlanId, AmountCents, Currency, Status (Pending=1, Completed=2, Failed=3, Cancelled=4, Refunded=5), Provider ("stripe", "paypal", "simulated"), ProviderSessionId, ProviderPaymentId, CreatedAt, UpdatedAt.
PaymentTransaction: Key Id, OrderId, ProviderEventId (unique index), EventType, AmountCents, Status, PayloadJson, CreatedAt.
Database Context (apps/api/Data/AppDbContext.cs):
Configures tables in the public PostgreSQL schema: "SubscriptionPlans", "UserSubscriptions", "Orders", "PaymentTransactions".
Proper foreign keys: UserSubscription -> Plan (Restrict), UserSubscription -> Order (SetNull), PaymentTransaction -> Order (SetNull).
2.2 Existing Plan Pricing & Canonical Configuration
Catalog Seeder (apps/api/Services/CatalogSeeder.cs): Seeds 12 canonical plans matching product specifications:
rn-pro: NCLEX-RN Complete Preparation ($59/mo, 30 days)
rn-pro-90: NCLEX-RN Complete Preparation (90-Day) ($149, 90 days)
pn-pro: NCLEX-PN Complete Preparation ($59/mo, 30 days)
pn-pro-90: NCLEX-PN Complete Preparation (90-Day) ($149, 90 days)
rn-starter: NCLEX-RN Starter Review ($29/mo, 30 days)
rn-starter-90: NCLEX-RN Starter Review (90-Day) ($75, 90 days)
pn-starter: NCLEX-PN Starter Review ($29/mo, 30 days)
pn-starter-90: NCLEX-PN Starter Review (90-Day) ($75, 90 days)
rn-readiness: NCLEX-RN Readiness Assessment Pack ($39, 3 CAT exams)
pn-readiness: NCLEX-PN Readiness Assessment Pack ($39, 3 CAT exams)
rn-premium-annual: NCLEX-RN Annual All-Access Pass ($279, 365 days)
pn-premium-annual: NCLEX-PN Annual All-Access Pass ($279, 365 days)
Frontend Mirror (apps/web/src/lib/products.ts & subscription-store.ts): In-memory catalog mirroring backend plans with WCAG AA color validation utilities.
2.3 RN & PN Isolation
Separation Integrity: All plans strictly define Pathway as "RN", "PN", or "Both".
Single-Pathway Safeguard: Verified by tests (tests/subscription-consistency-admin.test.tsx): rn-pro only grants rn entitlement; pn-pro only grants pn entitlement.
Dual-Access Plans: Only prep-premium and prep-premium-90 grant dual rn and pn entitlements.
2.4 Public Pricing Page & Checkout Workflow
Public Page (apps/web/src/app/subscriptions/page-client.tsx): Fetches plans from /api/subscriptions. Supports pathway and interval filters.
Checkout Flow: Cart -> apps/web/src/app/api/checkout/route.ts -> Calls ASP.NET Core CheckoutController.CreateCheckoutSession.
Environment Gate (apps/api/Services/ICheckoutService.cs): Strict fail-closed check: In production, simulated checkout is completely blocked. In development/staging, sandbox mock checkout creates completed order and active subscription.
2.5 Webhook Processing & Payment Verification
Endpoint (apps/api/Controllers/PaymentWebhookController.cs):
Enforces timing-safe HMAC-SHA256 signature verification using WEBHOOK_SIGNING_SECRET.
Idempotency verification prevents replay attacks via PaymentTransactions.ProviderEventId.
Processes payment_intent.succeeded, checkout.session.completed, and customer.subscription.deleted.
2.6 Centralized Entitlement Engine
UserEntitlementService (apps/api/Services/UserEntitlementService.cs):
Evaluates candidate status (inactive or suspended accounts rejected with descriptive error codes).
Administrative bypass with immutable audit logging (EntitlementBypass).
Checks candidate UserSubscriptions for Status == Active and ExpiresAt > nowUtc.
Validates requested pathway (rn vs pn).
Integrated into ExamAttemptsController across all 7 exam attempt access endpoints.
2.7 Pilot Grant Workflow
AdminUsersController.IssuePilotGrant: Allows administrators to issue a complimentary entitlement (duration 1-365 days) with conflict detection against active grants and audit logging.
3. DEFICIENCIES, GAPS & SECURITY VULNERABILITIES
3.1 Gap Analysis Matrix
Requirement Area	Existing State	Missing / Deficient Capability	Risk / Impact
Manual Authorization	Rudimentary IssuePilotGrant for 0-dollar grants.	No offline payment recording (Cash, M-Pesa, Bank Transfer, Direct Deposit). No receipt numbers, transaction references, or payment evidence uploads.	Inability to process offline cash or mobile money payments legitimately.
Payment Verification	Webhook verification for online transactions only.	No verification states (PendingVerification, Verified, Rejected). No maker-checker / approval segregation.	Financial leakage; fraud vulnerability; unverified manual access grants.
Duplicate Prevention	ProviderEventId unique index for online webhooks.	No duplicate detection for manual transaction references or receipt numbers.	Double-recording payments or duplicate credit granted to learners.
Plan Appearance Customization	4 static color fields in SubscriptionPlans (BgColour, etc.).	No typography controls, layout spacing, border radius, shadow, hover styling, responsive preview, versioning, or draft/publish workflow.	Superadmin cannot customize cards without developer code modifications.
Feature Entitlements	UserEntitlementService only checks pathway (rn/pn).	No feature-level authorization (Practice Exams, Custom Tests, RATs, Study Notes, Flashcards, Spaced Repetition, Performance Reports).	Premium features accessible without checking specific plan entitlements.
Learner Subscription Admin	None. No admin controller or view for learner subscriptions.	Cannot search, filter, paginate, extend, suspend, reinstate, or cancel subscriptions.	Admins cannot assist learners or enforce administrative lifecycle actions.
Transaction History	PaymentTransactions table exists, but no admin UI or query endpoints.	Admins cannot view financial ledger, transaction history, or issue refunds/reversals.	Complete lack of financial operational visibility.
Revenue Analytics	None.	No calculation of gross collections, net revenue, MRR, revenue by course, or payment method split.	Blindness to commercial performance and reconciliation discrepancies.
Admin Navigation	Single sidebar link: /admin/subscriptions.	Missing dedicated Monetization Management module with 8 child views.	Does not adhere to Section 3 navigation mandate.
4. ARCHITECTURE RECONCILIATION & DOMAIN MODEL SPECIFICATION

To resolve all audit deficiencies additively without disrupting existing database records or active features, we specify the following architectural extensions:

4.1 Extended & New Database Domain Entities

ManualSubscriptionAuthorization (New Entity):

Id: GUID string (man_auth_...).
UserId: Foreign key to Users.
PlanId: Foreign key to SubscriptionPlans.
Pathway: "rn" | "pn" | "both".
PaymentMethod: Cash, MPesa, BankTransfer, DirectDeposit, Other.
AmountCents: Decimal monetary amount in cents.
Currency: ISO currency (e.g. USD, KES).
TransactionReference: Unique string (e.g., M-Pesa receipt code or bank wire reference). Unique index to prevent duplicate submissions.
ReceiptNumber: Administrative paper receipt number.
PaymentDate: Date money was received.
EvidenceUrl: Secure URL/path to uploaded payment proof.
Notes: Administrative context.
Status: PendingVerification (1), Verified (2), Rejected (3), Cancelled (4).
RequestedByAdminId: Admin who recorded the payment.
VerifiedByAdminId: Admin who verified and approved access.
RejectionReason: Optional reason if rejected.
SubscriptionId: Foreign key to resulting UserSubscription.
OrderId: Foreign key to resulting Order.
CreatedAt, VerifiedAt.

SubscriptionPlanAppearance (New Entity):

Id: GUID string.
PlanId: Foreign key to SubscriptionPlans (or null for global theme defaults).
Version: Integer sequence number.
IsPublished: Boolean (Draft vs Published).
TypographyJson: JSON storing font family, sizes (heading, description, price, features), weights, line heights, letter spacing, alignment.
ColorsJson: JSON storing title, price, description, features, billing period, badge, and button colors.
CardStylingJson: JSON storing background, border color, border width, border radius, shadow, hover effect, recommended background.
ButtonStylingJson: JSON storing button background, text color, border, radius, font size, hover states, button label.
LayoutJson: JSON storing card padding, width, spacing, feature list spacing, badge positioning.
CreatedAt, CreatedBy, PublishedAt, PublishedBy.

EntitlementDefinition & SubscriptionPlanEntitlement (New Entities):

EntitlementDefinition: Code (PK, e.g. practice_exams, custom_tests, rats, study_notes, flashcards, spaced_repetition, quizzes, performance_reports), Name, Category, Description, CoursePathway, IsActive.
SubscriptionPlanEntitlement: PlanId, EntitlementCode, UsageLimit (null for unlimited), MetadataJson.

Enhancements to Existing Entities:

UserSubscription: Add SuspendedAt, SuspensionReason, CancelledBy, ExtendedAt, ExtendedBy, IsManual, ManualAuthorizationId, Notes.
Order: Add PaymentMethod (enum/string), ReceiptNumber, TransactionReference, VerifiedBy, VerifiedAt, Notes, PaymentEvidenceUrl, ManualAuthorizationId.
SubscriptionPlan: Add PublicationStatus (Draft, Published, Archived), InternalCode.
4.2 Centralized Lifecycle State Machine
5. PLANNED EXECUTION PHASES (PHASES 2–11)
Phase 2 — Database & Domain Layer:
Implement domain models: ManualSubscriptionAuthorization, SubscriptionPlanAppearance, EntitlementDefinition, SubscriptionPlanEntitlement.
Update UserSubscription, Order, SubscriptionPlan with lifecycle fields.
Register DbSets and fluent relationships in AppDbContext.
Add EF Core migration 0015_AddMonetizationManagementSubsystem with safe, reversible SQL.
Phase 3 — Subscription Plan Management:
Enhance AdminSubscriptionsController: Add plan duplication (POST /api/v1/admin/subscriptions/{id}/duplicate), publication status toggling, hard deletion guards (block delete if active subscriptions or payment references exist), and restore.
Phase 4 — Appearance Customization:
Implement appearance endpoints (GET/PUT/POST /api/v1/admin/subscriptions/appearance).
Build responsive split-pane Appearance Editor on frontend with real-time preview (Desktop, Tablet, Mobile), controlled typography/color/layout inputs, WCAG AA compliance validation, and Draft/Publish controls.
Phase 5 — Centralized Entitlement Engine:
Extend IUserEntitlementService with granular feature checks: HasFeatureEntitlementAsync(userId, featureCode, pathway).
Integrate entitlement evaluation across PrepFord premium features (Practice Exams, RATs, Custom Tests, Study Studio, Flashcards).
Phase 6 — Manual Subscription Authorization Workflow:
Build ManualAuthorizationController: Search learners by email/name/ID, record offline payment (Cash, M-Pesa, Bank Transfer), submit for verification, verify payment, reject payment, and atomic subscription activation.
Frontend: Multi-step wizard with learner search, plan selection, receipt/reference validation, dual-confirmation modal, and top-center notifications.
Phase 7 — Online Payment Integration Reconciliation:
Ensure consistent entitlement activation between online webhook processing and manual verification.
Audit idempotency keys and fail-closed production gates.
Phase 8 — Subscription Lifecycle Management:
Implement background/scheduled expiration checks.
Implement admin actions: Extend, Suspend, Reinstate, Cancel, Refund.
Phase 9 — Analytics & Reporting:
Implement MonetizationAnalyticsController returning verified gross revenue, refunds, net collections, active/pending/expired counts, course breakdown (RN vs PN), and payment method distribution.
Build comprehensive Monetization Overview and Revenue Analytics dashboards in frontend.
Phase 10 — Comprehensive Testing & Verification:
xUnit backend tests covering Plan CRUD, duplicate reference protection, manual authorization, payment verification, lifecycle transitions, and RN/PN isolation.
Vitest frontend tests covering admin navigation, plan editor, appearance preview, manual authorization modal, and subscriptions table.
Phase 11 — Final Verification & Audit Closure:
Verify full build, pass all tests, review migrations and RBAC, and compile the final Master Implementation Report.
6. AUDIT CONCLUSION & READINESS GATE

The codebase has been thoroughly audited. The baseline compiles cleanly, existing frontend tests pass, and existing database models provide an excellent foundation for non-destructive, additive enhancement.

We are ready to proceed to Phase 2: Database and Domain Layer.