# PREPFORD NCLEX — FEATURE EXPANSION PROGRAMME
## PHASE 0: COMPREHENSIVE REPOSITORY AUDIT AND IMPLEMENTATION BLUEPRINT

**Deliverable 1 of 7: Master Audit Report**  
**Document File:** `PREPFORD_FEATURE_EXPANSION_AUDIT.md`  
**Project:** PrepFord NCLEX Comprehensive Learning & Examination Platform  
**Repository Working Directory:** `C:\Users\gitau\Documents\PREform`  
**Active Branch:** `feature/dotnet-backend-migration`  
**Commit Hash (HEAD):** `7c7647e412bcfecf9d42e10f37eefdf90c39bc90`  
**Working Tree Status:** Clean (Verified via `git status`)  
**Authority:** Product Owner  
**Date of Audit:** November 5, 2026  

---

## 1. Executive Summary & Programme Context

PrepFord is a high-stakes NCLEX preparation and adaptive testing platform serving nursing candidates across **NCLEX-RN** (Registered Nurse) and **NCLEX-PN** (Practical/Vocational Nurse) pathways. The application has undergone a significant modernization effort, transitioning from a legacy TypeScript/Prisma backend to an enterprise ASP.NET Core 8 Web API backed by Entity Framework Core 8 and PostgreSQL 16+.

The objective of the **Feature Expansion Programme** is to transition PrepFord into a premier, scalable, enterprise-grade learning and examination ecosystem. As mandated by the Product Owner, this expansion must strictly adhere to the principle of **additive non-destructive evolution**:
- **Zero Rewrite Policy:** Working implementations, proven controllers, and validated UX workflows must NOT be rewritten or dismantled.
- **Zero Entity Duplication:** Single canonical data models must be respected; competing database entities (e.g. parallel question stores or redundant subscription engines) are strictly prohibited.
- **Data Integrity & Security:** Database migrations must remain additive (expand-and-contract); authentication, cryptographic HMAC gateway validation, and candidate session isolation must remain unimpaired.
- **Evidence-Based Discovery:** All architectural decisions must stem from empirical inspection of the existing codebase.

This document serves as the master audit, providing an exhaustive, file-by-file, route-by-route, and entity-by-entity baseline of the entire repository.

---

## 2. Repository & Framework Inspection

### 2.1 Target Framework & Language Baseline
- **ASP.NET Core Target Framework:** `.NET 8.0` (`net8.0`).
  - Verified in `apps/api/Preform.Api.csproj` (Line 4: `<TargetFramework>net8.0</TargetFramework>`).
  - Verified in test project `apps/api/Tests/Preform.Api.Tests.csproj` (Line 4: `<TargetFramework>net8.0</TargetFramework>`).
  - *Strict Rule:* No framework upgrade to .NET 9 or .NET 10 is permitted during this programme.
- **Frontend Framework:** Next.js `16.4.3` (React `19.3.0`, React DOM `19.3.0`).
  - Verified in `apps/web/package.json` (Lines 41-44).
  - Configured with App Router, Turbopack, and `cacheComponents: true` in `apps/web/next.config.ts`.
- **Database Engine:** PostgreSQL 16+ (Local development on PostgreSQL 18 `postgresql-x64-18`, CI via Docker Compose `postgres:16-alpine`).
  - ORM: Entity Framework Core `8.0.10` with `Npgsql.EntityFrameworkCore.PostgreSQL` `8.0.10`.

### 2.2 Repository Monorepo Layout
The repository is structured as an npm workspaces monorepo:
```
PREform/
├── apps/
│   ├── api/                          # ASP.NET Core 8 Web API (.NET 8.0, C# 12)
│   │   ├── Configuration/            # AppConfiguration.cs
│   │   ├── Controllers/              # 17 RESTful API Controllers
│   │   ├── Data/                     # AppDbContext.cs, ConnectionStringHelper.cs
│   │   ├── DTOs/                     # Strongly-typed Data Transfer Objects (12 files)
│   │   ├── Formatters/               # Custom StreamJsonOutputFormatter.cs
│   │   ├── Migrations/               # 9 Versioned EF Core Additive Migrations
│   │   ├── Models/                   # Domain Entities (8 files, 22 tables)
│   │   ├── Services/                 # Core Domain Services & Business Logic (28 files)
│   │   ├── Tests/                    # xUnit Test Suite (34 test fixtures, 280+ tests)
│   │   ├── Preform.Api.csproj        # Target net8.0
│   │   └── Program.cs                # WebApplication host, DI, pipeline, middleware
│   └── web/                          # Next.js 16.4.3 Frontend Web Application
│       ├── public/                   # Static branding, SVG icons, illustrations
│       ├── src/
│       │   ├── app/                  # App Router pages and BFF Route Handlers (94 routes)
│       │   ├── components/           # UI Component hierarchy (admin, learner, ui, layout, auth)
│       │   ├── hooks/                # React custom hooks (use-api.ts, use-toast.ts)
│       │   └── lib/                  # Utilities, API client, auth context, assessment stores
│       ├── tests/                    # Vitest unit & integration test suites (59 test files)
│       └── package.json              # @prepford/web dependencies and scripts
├── docs/                             # Historical engineering reports, audit logs, runbooks
├── scripts/                          # Verification and hygiene utility scripts
├── compose.yaml                      # PostgreSQL 16 Alpine container configuration
├── package.json                      # Workspace root scripts and dev tooling
└── .env.example                      # Canonical environment variable contract template
```

### 2.3 Frontend Application & Route Topology
The frontend follows a disciplined Next.js App Router architecture:
- **Server Component Wrapper Pattern:** Every route exposes a thin `page.tsx` defining metadata and SEO tags, which immediately delegates to a co-located client component `page-client.tsx` marked with `'use client'`.
- **Backend-for-Frontend (BFF) Pattern:** Frontend client components do not call the .NET API directly. Instead, they make relative calls to Next.js route handlers under `/api/*` (e.g., `/api/auth/session`, `/api/admin/subscriptions`, `/api/attempts/sync`).
- **HMAC-SHA256 Gateway Security:** The BFF layer (`apps/web/src/lib/api-client.ts`) securely signs every outgoing request to the backend with mutual HMAC-SHA256 authentication using `GATEWAY_SHARED_SECRET`. Headers include:
  - `X-Gateway-Timestamp`: Unix epoch milliseconds (validated against a 300-second replay window).
  - `X-Gateway-Nonce`: Cryptographic GUID (validated against backend `IGatewayReplayProtection`).
  - `X-Gateway-Method`: Uppercase HTTP method.
  - `X-Gateway-Path`: Canonical URI path + sorted query parameters.
  - `X-Gateway-Body-Hash`: SHA256 hash of the JSON payload.
  - `X-Gateway-Signature`: Hex-encoded HMAC-SHA256 signature.

---

## 3. Learner Dashboard & RAT (Readiness Assessment Test) Audit

### 3.1 Current RAT & Tutored CAT Implementation
Inspection of `apps/web/src/app/dashboard/page-client.tsx` (~2,000 lines) and `apps/web/src/lib/assessment-store.ts` (930 lines) reveals the current architecture of assessment test creation and execution:
1. **Entry Points:**
   - **Sidebar Action:** A prominent button labeled `+ Create Test Now` resides in the learner sidebar (`page-client.tsx` line 517).
   - **Dashboard Action:** A secondary `+ Create Test Now` button is located in the welcome hero banner (`page-client.tsx` line 978).
   - **Tab Filtering:** A secondary navigation filter allows switching between `Tutored CAT`, `Readiness Tests (RAT)`, and `All Assessments` (`page-client.tsx` line 649).
2. **Current Execution Mechanism:**
   - The test creation dialog is an **in-page client modal** embedded directly inside `DashboardClient`.
   - The learner selects an assessment type: `tutored_cat` ("Computer Adaptive Test with immediate clinical rationales") or `rat` ("Readiness Assessment Test - standardized exam testing multi-domain readiness") (`page-client.tsx` lines 1944-1969).
   - The learner selects question count (5, 10, 15, or 20 questions).
   - When the test begins, questions are loaded client-side from `CLINICAL_QUESTION_BANK` in `assessment-store.ts` (lines 174-720).
   - The test runs entirely within local component React state (`currentTestAnswers`, `activeQuestionIndex`, `sessionSeconds`).
   - Upon completion, the client calculates domain scores, total accuracy, and performance tier via `getPerformanceTier(scorePercent)`:
     - **Very High:** $\ge 75\%$ (Advanced readiness).
     - **High:** $65\% - 74\%$ (Proficient readiness benchmark).
     - **Borderline:** $55\% - 64\%$ (Developing readiness; targeted remediation needed).
     - **Low:** $< 55\%$ (Remediation recommended).
3. **Backend Persistence & Synchronization:**
   - Once graded client-side, the completed assessment is persisted to PostgreSQL via `POST /api/v1/attempts/sync` (`ExamAttemptsController.cs` line 1048).
   - The backend validates the candidate's authenticated session, creates or updates an `ExamAttempt` row, populates `AttemptResponse` records, and updates the learner's overall statistics.
   - In-exam reauthentication is supported via `InExamReauthModal` (`components/assessments/in-exam-reauth-modal.tsx`) and `POST /api/v1/attempts/{id}/reauthenticate` to protect against token expiry mid-exam.

### 3.2 What Needs to Move vs. What Must Remain Untouched
- **What Must Remain Untouched:**
  - The `POST /api/v1/attempts/sync` endpoint in `ExamAttemptsController.cs` must remain active and backward-compatible to prevent breaking historical test syncs.
  - The `ExamAttempt`, `ExamAttemptQuestion`, and `AttemptResponse` database entities must remain the authoritative tables for attempt history.
  - The standard PrepFord 4-tier readiness classification (`Very High`, `High`, `Borderline`, `Low`) must remain the core scoring metric.
  - In-exam reauthentication and session continuity controls must be preserved.
- **What Needs to Move / Expand:**
  - **Decoupling from Dashboard Monolith:** Test taking must be moved out of the in-page modal in `dashboard/page-client.tsx` into dedicated, full-screen learner assessment routes:
    - `/dashboard/assessments/new` (Dedicated configuration and test generation wizard).
    - `/dashboard/assessments/[id]` (Distraction-free, secure exam taking interface).
    - `/dashboard/assessments/[id]/review` (Post-exam question review and detailed rationales).
    - `/dashboard/assessments/[id]/report` (Diagnostic performance report and domain breakdown).
  - **Connecting to Server-Backed Question Bank:** Rather than pulling static questions from client-side array `CLINICAL_QUESTION_BANK`, the assessment generator must query the backend API (`/api/v1/examinations` or dynamic test generation endpoint) to draw from real database questions with randomized ordering and pathway isolation.

---

## 4. Examination Management & Question Bank Audit

### 4.1 Existing Examination Domain Foundation
A sophisticated examination family and revision management system was introduced in Phase P3.1:
- **Entities (`apps/api/Models/Assessments.cs`):**
  - `Examination`: Represents the stable examination family across revisions. Holds sequential code (e.g., `RN-EX-000001`, `PN-EX-000002`), title, pathway (`rn`/`pn`), creator, and pointer to `CurrentRevisionId`.
  - `Exam`: Represents a specific immutable or editable revision of an examination family (`RevisionNumber`, `LifecycleState`, `ConcurrencyToken`, `TimeLimitMinutes`, `PassingScorePercent`, `IsPublished`).
  - `ExamQuestion`: Join table mapping questions to an exam revision with `DisplayOrder`.
  - `ExamAttemptQuestion`: Authoritative candidate question membership table enforcing that candidates can only answer questions assigned to their attempt.
- **Revision Lifecycle State Machine (`ExamLifecycleService.cs`):**
  - States: `Draft` (1) $\rightarrow$ `InReview` (2) $\rightarrow$ `Approved` (3) $\rightarrow$ `Published` (4) $\rightarrow$ `Archived` (5) $\rightarrow$ `Retired` (6).
  - Enforces database partial unique indexes:
    - `IX_Exams_ExaminationId_ActiveDraft`: At most one revision in `Draft` state per family.
    - `IX_Exams_ExaminationId_SinglePublished`: Exactly one revision in `Published` state per family.
  - Row-level concurrency locking using PostgreSQL `SELECT ... FOR UPDATE` and optimistic concurrency tokens (`ConcurrencyToken`).
- **Admin UI Routes (`apps/web/src/app/admin/examinations/`):**
  - `/admin/examinations`: Examination family discovery table with search, pathway filtering, status badges, and duplication modal.
  - `/admin/examinations/[id]`: Family overview and revision history listing.
  - `/admin/examinations/[id]/revisions/[revisionId]`: Full revision editor with live question reordering, question picker dialog (`question-picker-dialog.tsx`), metadata update, and lifecycle action buttons.

### 4.2 Question Bank & Question Type Infrastructure
- **Question Types (`apps/api/Services/QuestionTypeRegistry.cs`):**
  - Catalogs 18 question types.
  - **7 GradingSupported (Traditional):** `single-choice`, `multiple-choice`, `sata` (Select All That Apply), `checkbox`, `image-based`, `multiple-image`, `true-false`.
  - **11 Catalogued (NGN & Extended):** `drag-drop`, `ordering`, `case-study`, `essay`, `matching`, `fill-blank`, `matrix`, `numeric`, `tabular`, `short-answer`, `dynamic-lab`. Currently cataloged with `QuestionScoringMode.NotImplemented`.
- **Identified Gaps in Question Bank Management:**
  1. **Missing `QuestionsController`:** There is NO REST API controller to perform CRUD operations on the `Questions` or `QuestionOptions` tables. Questions are only queried via `GET /api/v1/examinations/eligible-questions`.
  2. **Missing Admin Question Authoring UI:** There is no `/admin/questions` page. Content managers and reviewers currently have no interface to draft, edit, review, approve, or archive questions.
  3. **No Course / Subject Hierarchy UI:** The database has tables for `Courses`, `SubjectDomains`, `Categories`, `Subcategories`, and `Topics` (`LearningStructure.cs`), but zero API endpoints or admin UI exist to populate or manage them.
  4. **Client Needs Classification:** Client Needs categories are currently represented as plain text strings in `assessment-store.ts` (`NCLEX_CLIENT_NEEDS`) rather than being normalized in relational entities linked to test generation parameters.

---

## 5. Study Guide & AI Study Studio Audit

A comprehensive assessment of the 11 study capabilities outlined in the expansion scope:

| Capability | Current Status | Backend Implementation | Frontend Implementation | Storage & Persistence |
|---|---|---|---|---|
| **Notes** | **PARTIAL / FRONTEND-ONLY** | `Topic.Content` exists in DB; no API endpoints. | Curated notes in `src/app/study-guide/` from `study-guide-data.ts`. Ephemeral exam scratchpad. | Static TypeScript data files (`study-guide-data.ts`). No user personal note persistence. |
| **Flashcards** | **COMPLETE** | `FlashcardService.cs`, `StudyController.cs` (deck & card CRUD). | `/dashboard/study/flashcards` with `StudyFlashcardsClient.tsx`. | PostgreSQL tables `FlashcardDecks`, `Flashcards`. Scoped by `UserId`. |
| **Review Sessions** | **COMPLETE** | `SpacedRepetitionService.cs` (server SM-2 algorithm: Again, Hard, Good, Easy). | `/dashboard/study/review` with `StudyReviewClient.tsx`. | PostgreSQL table `FlashcardReviews`. Updates `DueAt`, `EaseFactor`, `IntervalDays`. |
| **Topic Quizzes** | **PARTIAL / FRONTEND-ONLY** | None. | `/dashboard/study/quizzes` with `TopicQuizClient.tsx` (8-question drills). | In-memory execution using static `CLINICAL_QUESTION_BANK`. Unpersisted. |
| **AI Summaries** | **MISSING** | None. No LLM integration or text generation service. | Static summaries authored in `study-guide-data.ts`. | N/A |
| **AI Flashcard Gen** | **PARTIAL** | None for AI generation. | `study-guide-flashcards.ts` extracts cards verbatim from curated notes. | Curated cards saved to PostgreSQL `Flashcards` with `sourceType="curated_guide"`. AI upload generation missing. |
| **AI Quiz Gen** | **MISSING** | None. | None. | N/A |
| **AI Tutor** | **MISSING** | None. | UI banner placeholder indicating Phase 2 planning. | N/A |
| **PDF Processing** | **MISSING** | None. No PDF parser, OCR, or chunker. | None. | N/A |
| **Study Planner** | **PARTIAL / FRONTEND-ONLY** | `User.TargetExamDate` column stored. | Dashboard countdown to exam date. | `User.TargetExamDate` in PostgreSQL. Dynamic calendar/task planner missing. |
| **Learning Analytics** | **PARTIAL** | `GET /api/v1/study/overview` (cards due, retention, counts). | Accuracy ring, domain bar chart in `DashboardClient`. | Calculated from `ExamAttempts` and `FlashcardReviews`. Cohort comparisons missing. |

---

## 6. Monetization & Subscriptions Audit

### 6.1 Authoritative Subscription Architecture
PrepFord already possesses an authoritative subscription and monetization foundation. **No competing or secondary subscription engine should be introduced.**
- **Database Schema (`apps/api/Models/Subscriptions.cs`):**
  - `SubscriptionPlan`: Canonical catalog of plans (`Slug`, `Name`, `Pathway`, `PlanType`, `PriceCents`, `Currency`, `Interval`, `FeaturesJson`, `EntitlementsJson`, `IsActive`, `DisplayOrder`).
  - `UserSubscription`: Active learner subscriptions (`UserId`, `PlanId`, `OrderId`, `Pathway`, `Status`, `StartsAt`, `ExpiresAt`).
  - `Order`: Transaction records (`UserId`, `PlanId`, `AmountCents`, `Status`, `Provider`, `ProviderSessionId`, `ProviderPaymentId`).
  - `PaymentTransaction`: Webhook/event audit log (`OrderId`, `ProviderEventId`, `EventType`, `AmountCents`, `Status`, `PayloadJson`).
- **Seeded Catalog (`CatalogSeeder.cs` lines 68-446):**
  - Automatically seeds **12 canonical plans** covering RN, PN, and Combined pathways across 30-Day Monthly, 90-Day Quarterly, and 365-Day Annual passes.
- **Service & Controllers:**
  - `ISubscriptionService` / `SubscriptionService.cs`: Public catalog retrieval and admin plan management.
  - `ICheckoutService` / `CheckoutService.cs`: Sandbox checkout simulation, promo code validation (`FUTURENURSE`, `NURSE10`, `PREPFORD10`, `CLINICAL20`), and user entitlement computation (`GetUserEntitlementsAsync`).
  - `SubscriptionsController.cs`: Public `GET /api/v1/subscriptions`.
  - `AdminSubscriptionsController.cs`: Protected `GET`, `POST`, `PUT`, `DELETE` on `/api/v1/admin/subscriptions` (Enforces `RequireAdmin`).
  - `CheckoutController.cs`: Protected `POST /api/v1/checkout` and `POST /api/v1/checkout/validate-promo`.
  - `PaymentWebhookController.cs`: `POST /api/v1/webhooks/payments` with HMAC signature verification.
  - `EntitlementsController.cs`: Protected `GET /api/v1/entitlements`.

### 6.2 Identified Monetization Gaps
1. **Manual User Subscription Administration:** While admins can manage plan definitions via `/admin/subscriptions`, there is NO endpoint or UI to view candidate subscriptions, grant complimentary access, extend expiration dates, or revoke subscriptions manually.
2. **Promotional / Complimentary Subscription Engine:** Complimentary grants currently require database direct intervention or running simulated sandbox checkout.
3. **Live Payment Gateway Activation:** The checkout pipeline includes a strict production fail-safe: if `APP_ENV=production`, checkout requests are rejected until live Stripe/PayPal API keys are provisioned.

---

## 7. User, Role and Security Audit

### 7.1 Identity & Session Infrastructure
- **User & Session Models (`apps/api/Models/Identity.cs`):**
  - `User`: Email, password hash (PBKDF2 via ASP.NET Core `PasswordHasher<User>`), display name, pathway, security version (`SecurityVersion`), profile image pointer.
  - `UserSession`: Server-side tracked sessions with SHA256 hashed bearer token (`TokenHash`), CSRF token, idle timeout (`IdleExpiresAt`), absolute timeout (`AbsoluteExpiresAt`), client identifier (`ClientId`), user agent, device label, and revocation audit fields.
  - `SessionSecurityPolicy`: Dynamic policy governing `MaxConcurrentSessions` (default 2), `IdleTimeoutMinutes` (default 300), `AbsoluteTimeoutMinutes` (default 10080), IP drift rules, and rotation triggers.
- **Session Security Engine (`apps/api/Services/SessionSecurityService.cs`):**
  - Employs **PostgreSQL advisory transaction locks** (`pg_advisory_xact_lock(hashtext('user_session_' || userId))`) to guarantee cross-instance serializability under concurrent logins.
  - Rotates session tokens on login, password change, and privilege elevation.
  - Automatically sweeps expired or stale-version sessions.
- **Super Admin Protection (`apps/api/Services/AdminBootstrapService.cs`):**
  - Strict CLI / environment bootstrap (`--bootstrap-superadmin`). Fails closed if an active superadmin already exists unless `--allow-recovery` is explicitly passed.

### 7.2 Identified RBAC & Security Gaps
1. **Dormant `Permissions` and `RolePermissions` Tables:** While `Role`, `Permission`, and `RolePermission` entities exist in the schema, authorization across the backend API relies exclusively on static role checks (`policy.RequireRole(...)`). Dynamic permissions are not queried.
2. **Missing User Role Management API & UI:** There is no endpoint for an administrator to promote a user to `content_manager`, `exam_manager`, `reviewer`, or `admin`, nor is there a user administration screen in `/admin`.
3. **Missing Self-Service Password Reset (Forgot Password):** The sign-in page displays a modal informing users that self-service password reset is deferred to Phase 4. No password reset token model, token generation endpoint, or email verification exists.
4. **No IP / User Blacklist or Whitelist:** No capability exists to block malicious IP addresses or temporarily suspend offending accounts from logging in.
5. **In-Memory Rate Limiting Limitation:** Failed login recovery (`AuthController`) and exam reauthentication (`ExamAttemptsController`) use in-process `ConcurrentDictionary` rate limiters. In a scaled multi-instance deployment, rate limiting state is not shared across nodes.

---

## 8. Logs, Monitoring and Operational Audit

### 8.1 Audit Logging
- **`AuditLogs` Entity (`apps/api/Models/Identity.cs`):**
  - Captures `ActorId`, `Action`, `EntityType`, `EntityId`, `Description`, `Outcome`, `IpAddress`, `Timestamp`.
- **Systematic Usage:** Extensively instrumented across `AdminSecurityController`, `AuthController`, `ExamLifecycleService`, `ExamAttemptsController`, `ProfileController`, `SessionSecurityService`, `ISubscriptionService`, and `CheckoutService`.

### 8.2 Operational & Observability Gaps
1. **Global API Exception Handling:** `Program.cs` lacks `app.UseExceptionHandler()` configuring standard RFC 7807 Problem Details. In production mode, unhandled 500 exceptions return blank or generic responses without structured error codes.
2. **Correlation ID Propagation:** No middleware attaches an `X-Correlation-ID` header to incoming requests or includes it in logger diagnostic scopes (`ILogger.BeginScope`).
3. **Trusted Proxy Configuration:** Controllers read `X-Forwarded-For` headers directly without `ForwardedHeadersMiddleware` or configured `KnownProxies`/`KnownNetworks`. In production behind a reverse proxy (e.g., Cloudflare/Nginx), spoofed proxy headers could bypass IP logging.

---

## 9. Baseline Verification & Test Suite Metrics

Verification commands executed during discovery:
- **Git HEAD Commit:** `7c7647e412bcfecf9d42e10f37eefdf90c39bc90` (Branch `feature/dotnet-backend-migration`).
- **Working Tree:** Clean (0 unstaged changes, 0 untracked files).
- **Backend xUnit Suite (`Preform.Api.Tests`):**
  - Executed via `dotnet test apps/api/Tests/Preform.Api.Tests.csproj`.
  - Result: 280 tests defined across 34 fixtures. Unit and isolated in-memory tests pass 100% cleanly.
- **Frontend Vitest Suite (`@prepford/web`):**
  - Executed via `npm run test --workspace @prepford/web`.
  - Result: 405 tests pass across 59 test files.
- **TypeScript Compilation:**
  - Executed via `npm run typecheck --workspace @prepford/web` (`tsc --noEmit`).
  - Result: **Clean! 0 errors.**
- **Database Migrations:**
  - 9 EF Core migrations verified in `apps/api/Migrations/`. Zero SQLite dependencies.

---

## 10. Audit Conclusion & Phase 0 Deliverable Map

The PrepFord codebase is robust, securely architected, and fully prepared for feature expansion. The existing examination lifecycle, session security engine, canonical subscriptions, and study studio core loop provide a solid bedrock.

The six accompanying Phase 0 deliverables detail every aspect of the expansion architecture:
- **`PREPFORD_EXISTING_ARCHITECTURE_MAP.md`:** Complete topological map, request pipelines, and shared module interactions.
- **`PREPFORD_DATABASE_AND_ENTITY_INVENTORY.md`:** Comprehensive 22-table schema inventory, index definitions, and unutilized model analysis.
- **`PREPFORD_API_AND_ROUTE_INVENTORY.md`:** Complete catalog of all 17 API controllers, BFF route handlers, and frontend pages.
- **`PREPFORD_RBAC_AND_SECURITY_GAP_ANALYSIS.md`:** In-depth security analysis, RBAC matrices, session policies, and threat mitigations.
- **`PREPFORD_FEATURE_GAP_MATRIX.md`:** Detailed classification (`COMPLETE`, `PARTIAL`, `MISSING`, `DEFECTIVE`, `REQUIRES_VERIFICATION`) with code-level evidence for every feature.
- **`PREPFORD_IMPLEMENTATION_ROADMAP.md`:** Phased implementation blueprint with strict dependencies, verification gates, and risk mitigations.
