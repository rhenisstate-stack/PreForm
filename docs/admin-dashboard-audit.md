# PrepFord Admin Dashboard — Phase 0 Audit

**Date:** 2026-11-01
**Branch:** `feature/dotnet-backend-migration` (clean tree, no uncommitted user work)
**Scope:** Administrative experience upgrade, referenced against Studio Admin (`arhamkhnz/next-shadcn-admin-dashboard`, MIT).

---

## 1. Repository architecture

Monorepo (npm workspaces) with the .NET backend living inside `apps/api`:

```
PREform/
├── apps/web        # Next.js 16.4.3 app (App Router, Turbopack), workspace @prepford/web
├── apps/api        # ASP.NET Core (.NET 8) Web API — Preform.Api, EF Core 8 + Npgsql/PostgreSQL
├── docs/           # 40+ existing project reports and plans
├── scripts/        # verify:brand, verify:no-sqlite, blog image checks
├── compose.yaml    # PostgreSQL service (CI)
└── package.json    # root scripts: dev, build, lint, typecheck, test, test:e2e (dotnet xUnit)
```

Key tooling entry points:
- Frontend: `apps/web/package.json` — `dev`, `build`, `lint`(eslint), `typecheck`(tsc), `test`(vitest), `test:e2e`(Playwright)
- Backend: `apps/api/Preform.Api.csproj`; tests `apps/api/Tests/Preform.Api.Tests.csproj` (xUnit + `WebApplicationFactory`)
- shadcn config at repo root: `components.json` (style `new-york`, aliases `ui → @/components/ui`, css `apps/web/src/app/globals.css`)

⚠️ **Next.js 16.4.3 with `cacheComponents: true`** (`apps/web/next.config.ts`). `apps/web/AGENTS.md` warns this version has breaking changes vs. training data; all implementation must consult `node_modules/next/dist/docs/` before coding.

---

## 2. Frontend architecture and feature inventory

### 2.1 Route pattern
Every route uses a thin Server `page.tsx` (metadata) delegating to a co-located `'use client'` `page-client.tsx`. This convention should be preserved.

### 2.2 Route inventory

**Public** (`src/app/`): `/` (`home-client.tsx`), `/about`, `/blog`, `/blog/[slug]`, `/cart`, `/contact`, `/courses`, `/educators`, `/faq`, `/features`, `/nclex-rn`, `/nclex-pn`, `/privacy-policy`, `/programmes/[programme]` (static `rn`/`pn` via `generateStaticParams`), `/study-guide`, `/study-guide/[category]`, `/study-guide/[category]/[subject]`, `/subscriptions`, `/testimonials`, `/terms-and-conditions`, plus `not-found.tsx`, `manifest.ts`, `robots.ts`, `sitemap.ts`.

**Auth:** `/sign-in`, `/sign-up` (client forms + `src/components/auth/*`, Google OAuth via BFF `/api/auth/google`).

**Learner:** `/dashboard` (`dashboard\page-client.tsx`), `/dashboard/study` (layout wraps `study-studio-shell.tsx`), `/dashboard/study/quizzes|flashcards|review`, `/profile`.

**Admin — only 3 pages exist:**

| Route | Files | State |
|---|---|---|
| `/admin` | `src\app\admin\page.tsx` + `page-client.tsx` (`AdminOverviewClient`) | Working; **hardcoded mock metrics** |
| `/admin/subscriptions` | `src\app\admin\subscriptions\page.tsx` + `page-client.tsx` (1020 lines) | Fully functional plan CRUD against real API |
| `/admin/question-types` | `src\app\admin\question-types\page.tsx` (all-'use client', 370 lines) | Static catalogue of 18 question types; **no auth guard, no sidebar** |

`src\app\admin\layout.tsx` only sets `robots: { index: false }` — **no admin shell, no auth in the layout**.

**BFF route handlers** (`src/app/api/`): `admin\subscriptions\route.ts`, `admin\subscriptions\[id]\route.ts`, `auth\{login,register,logout,session,google,google\callback}`, `checkout`, `entitlements`, `contact`, `profile`, `profile\image`, `profile\change-password`, `questions\[id]\flag`, `study\[[...path]]`, `subscriptions`, `testimonials`.

### 2.3 Existing admin dashboard composition (per page, duplicated)
- `AdminOverviewClient` (`admin\page-client.tsx`): client auth/role guard → duplicated `<aside className="hidden lg:flex w-64">` sidebar → inline breadcrumbs → header → **4 hardcoded stat cards** (1,280 students / 2,450 questions etc., L211-264) → quick links.
- `AdminSubscriptionsClient` (`admin\subscriptions\page-client.tsx`): own `adminNavItems` (3 items), own guard, real plan CRUD via `fetch("/api/admin/subscriptions")`, `Dialog` forms with live WCAG contrast validation (`src\lib\color-contrast.ts`), archive confirm dialog.
- Navigation arrays define **8 links** in the overview (`/admin/programmes`, `/admin/questions`, `/admin/exams`, `/admin/users`, `/admin/audit-logs` among them) but **only 3 routes exist** — 5 dead links → 404.

### 2.4 Reusable component inventory (`apps/web/src/components`)
- `ui\` — shadcn new-york: `button`, `badge`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `avatar`, `sheet`, `popover`, `navigation-menu`, `scroll-area`, `separator`, `skeleton`, `sonner`, `toggle`, `toggle-group`, custom `text-image-section`, `app-illustration`. **Not present:** `sidebar`, `breadcrumb`, `chart`, `command`, `table`, `tabs`, `select`, `form`, `checkbox`, `switch`.
- `layout\` — `public-header.tsx` (608 lines; hides itself only for `/dashboard`, `/sign-in`, `/sign-up` — **`/admin/*` renders inside public site chrome today**), `public-footer.tsx`, `announcement-bar.tsx`, `notification-panel.tsx` (`NotificationPanel`, `ProfileMenu`, `CartButton`), `personalized-welcome.tsx` (`formatRoleTitle`, `getAuthorizedWorkspace`), `theme-switcher.tsx` (next-themes light/dark/system), `branded-loading.tsx`.
- `auth\`, `home\`, `learner\` (`study-studio\` shell + 4 clients), `testimonials\`, `assessments\question-flag-button.tsx`, top-level `providers.tsx`.
- **No `components/admin/` directory exists yet.**

### 2.5 API client layer
- `src\lib\api-client.ts` (~370 lines): server-side BFF client. Base URL resolution `API_GATEWAY_URL → INTERNAL_API_URL → NEXT_PUBLIC_API_URL → 127.0.0.1:{BACKEND_PORT|4000}`; **HMAC-SHA256 gateway signing** (`createCanonicalGatewayAuthHeaders`, canonical v1: timestamp/method/path/nonce/body-hash); Bearer pass-through; 10s AbortController; typed `ApiResponse<T>` / `ApiClientError`; mock handler hook for tests.
- `src\lib\api-services.ts` (~436 lines): `authService`, `profileService`, `subscriptionService` (incl. admin CRUD), `checkoutService`, `attemptsService` + DTOs.
- **`src\lib\api.ts` — legacy parallel client** (`NEXT_PUBLIC_API_BASE_URL`, raw `apiFetch`) still used by `src\hooks\use-api.ts`. Drift risk; consolidate during upgrade.
- `src\lib\session.ts` (543 lines): HMAC-signed cookie `prepford_session`, `verifyAdminAuth()` server guard returning 401/403, `ALLOWED_ADMIN_ROLES` (`session.ts` L90-96) = `{admin, superadmin, administrator, manager, content_manager}`; unsigned cookies claiming admin roles are rejected.
- Admin clients call BFF routes with raw `fetch` + local `useState` rather than TanStack Query.
- **TanStack Query** provider: `src\components\providers.tsx` (`staleTime: 5min`, `gcTime: 10min`, `refetchOnWindowFocus: false`). Current usage is sparse: `hooks\use-api.ts`, `lib\use-question-flag.ts`, `assessments\question-flag-button.tsx`.

### 2.6 Auth & RBAC (frontend)
- Context: `src\lib\auth-context.tsx` — `AuthProvider`/`useAuth` (`user`, `isAuthenticated`, `isLoading`, `login`, `registerUser`, `logout`, `refreshSession`) over BFF `/api/auth/*` via raw `fetch`. `AuthUser.role` is a free-form string.
- **No route middleware** — protection is (a) server-side `verifyAdminAuth()` inside BFF route handlers, and (b) **duplicated client guards per admin page** with ad-hoc predicates (`role.includes("admin") || role.includes("manager") || role.includes("reviewer") ...`).
- **Privilege-selection defect:** overview guard includes `reviewer`; `subscriptions` guard **excludes `reviewer`** — a Question Reviewer sees the overview but is blocked from plans (also inconsistent with backend, which enforces `admin/superadmin/administrator` only).
- Role title/workspace mapping: `personalized-welcome.tsx` (`superadmin/admin/administrator/content manager/exam manager/question reviewer/instructor/student` → `/admin` or `/dashboard`).
- Theme mount: `src\app\layout.tsx` L124 `<Providers attribute="class" defaultTheme="system" enableSystem>` — admin pages have **no visible ThemeSwitcher**.

### 2.7 Theming
- Tailwind **v4 CSS-first** (`no tailwind.config`): `src\app\globals.css` — `@import "tailwindcss"`, `@custom-variant dark`, light tokens (`--background #F8FAFC`, `--foreground/--primary #142B4A` deep navy, `--secondary #0F766E` teal, `--radius 0.75rem`), brand aliases (`--ink/--paper/--teal/--navy/--gold`), status tokens, `.dark` overrides (L106+), `@theme inline` mapping.
- Matches the required brand palette almost exactly; guidance in ✅.

### 2.8 Library usage
| Library | State |
|---|---|
| `@tanstack/react-table` | **Not installed** — no data-table primitives |
| `@tanstack/react-query` | Installed, provider mounted, sparsely used |
| `recharts` ^2.15.0 | **Installed but unused** (v2 deprecated branch; v3 available) |
| `cmdk` ^1.0.0 | **Installed but unused** — no command palette component |
| `react-hook-form` + `zod` | Used in auth/profile forms; available for admin forms |
| `sonner` | Installed and mounted in root layout |
| `next-themes` | Installed, working light/dark/system |

### 2.9 Frontend tests
- **Vitest:** 43 files in `apps/web/tests\` (jsdom, setup `tests\setup.ts`). Admin-relevant: `subscription-consistency-admin.test.tsx`, `security-regressions.test.ts`, `session-integrity.test.ts`, `color-contrast-wcag.test.ts`, plus auth/checkout/study suites.
- **Playwright:** 5 specs in `apps\web\e2e\` — `rbac-access.spec.ts` (student blocked from `/admin`, 403 on admin API, role-tamper rejection), `student-auth.spec.ts`, `profile-security.spec.ts`, `subscription-catalog.spec.ts`, `checkout-entitlements.spec.ts`. Web server config points API at 127.0.0.1:5000.
- **Gap:** no tests for `/admin` overview, `/admin/question-types`; obviously none for the 5 dead links.

---

## 3. Backend architecture and integration inventory

### 3.1 Stack
`apps/api` — `Preform.Api`, .NET 8, EF Core 8, **Npgsql/PostgreSQL** (schema `public`), DbContext `apps\api\Data\AppDbContext.cs` (29 DbSets). Migrations: 5 (`0001_CreateProgrammes` → `0005_AddStudyStudioFlashcards`). Startup: `Database.Migrate()` + `CatalogSeeder.SeedAsync` (`apps\api\Services\CatalogSeeder.cs`).

### 3.2 Controllers & endpoints (13 controllers)

| Controller | Route | Auth | Notes |
|---|---|---|---|
| `AuthController` | `api/v1/auth/*` | anonymous register/login/validate; `[Authorize]` logout/revoke/session | AuditLog on register/login/failure/revoke |
| `AdminSubscriptionsController` | `api/v1/admin/subscriptions` | **`[Authorize(Policy = "RequireAdmin")]`** | GET/POST/PUT/DELETE(plan) — **primary existing admin feature**; writes AuditLog |
| `SubscriptionsController` | `api/v1/subscriptions` | anonymous catalog reads | |
| `TestimonialsController` | `api/v1/testimonials` + `api/v1/admin/testimonials/{id}/status` | anon list/submit; admin moderation PATCH | writes AuditLog |
| `ProgrammesController` | `api/v1/programmes` | **none — POST create is unauthenticated (security gap)** | |
| `ExamAttemptsController` | `api/v1/attempts` | `[Authorize]`; admin roles (`admin/superadmin/administrator/exam_manager`, inline set, L90) may query `?userId=` others | CAT-style assessments |
| `StudyController` | `api/v1/study/*` | `[Authorize]`, ownership-scoped flashcards | SM-2 scheduling server-authoritative |
| `CheckoutController` | `api/v1/checkout` | `[Authorize]` (+ anon promo validate) | simulated provider, hardcoded promos |
| `PaymentWebhookController` | `api/v1/webhooks/payments` | `[AllowAnonymous]` + in-process HMAC verify | |
| `EntitlementsController` | `api/v1/entitlements` | `[Authorize]` | |
| `ProfileController` / `ProfileImageController` | `api/v1/profile(+/image)` | `[Authorize]`, ownership-enforced | |
| `HealthController` (+ mapped endpoints) | `api/v1/health/live|ready` | anonymous | readiness runs `PostgresHealthCheck` |

**Total admin-policy endpoints: 5** (4 plan CRUD + testimonial moderation).

### 3.3 Entities (`apps\api\Models\`)
- `Identity.cs`: `User` (Pathway rn/pn/both, ActivePlan, IsActive), `UserSession`, `UserProfileImage`, `Role`, **`Permission`**, `RolePermission`, `UserRole`, **`AuditLog`** (ActorId, Action, EntityType, EntityId, Description, Outcome, IpAddress, Timestamp).
- `Programme.cs` + `LearningStructure.cs`: `Programme` (enum RN/PN/TEST/DUP) → `Course` (IsPublished) → `SubjectDomain` → `Category` → `Subcategory` → `Topic` (Content, IsPublished). **Hierarchy exists in schema; no domain admin CRUD exposes it.**
- `Questions.cs`: `QuestionTypeDefinition` (18 types: Traditional/NGN/Clinical), `Question` (Stem, Difficulty, **Status Draft→Archived, Version**, ClinicalScenario, ExhibitsJson, CreatedById/ReviewedById — authoring/review workflow), `QuestionOption` (+rationales), `QuestionVersion` (snapshot audit).
- `Assessments.cs`: `Exam` (ExamType Practice/CAT/MockSimulation/DiagnosticReadiness, TimeLimitMinutes, PassingScorePercent, IsPublished), `ExamQuestion`, `ExamAttempt` (ScorePercent, Passed), `AttemptResponse`.
- `Subscriptions.cs`: `SubscriptionPlan` (12 seeded plans), `UserSubscription` (Status Active/PastDue/Cancelled/Expired), `Order`, `PaymentTransaction`.
- `Study.cs`: `FlashcardDeck` (user-owned by design), `Flashcard` (SM-2 state), `FlashcardReview`.
- `Testimonials.cs`: `Testimonial` (Pending/Approved/Rejected, consent + outcome flags).

### 3.4 Auth & RBAC (backend) — authoritative findings
- **Scheme:** custom `PrepfordAuth` (`apps\api\Services\PrepfordAuthHandler.cs`): bearer `prf_sess_…` tokens validated against `UserSessions` via SHA-256 hash (`SessionService.cs`; 7-day / 30-day sessions, CSRF token), **plus** gateway HMAC fallback (`X-Gateway-Signature`, `GATEWAY_SHARED_SECRET`, ±60s skew, replay cache). Not JWT, not cookie — do not replace.
- `RoleHierarchy.cs`: roles `superadmin, admin, administrator, exam_manager, content_manager, reviewer, instructor, candidate` (administrator normalized to `admin`).
- Policies (`Program.cs` L41-54): `RequireAdmin` (admin/superadmin/administrator), `RequireSuperAdmin`, `RequireContentManager` (content_manager/admin/superadmin), `RequireExamManager` (exam_manager/superadmin). **Only `RequireAdmin` is attached anywhere.** The other three are registered but unused.
- **Permission tables are dead schema.** `Permission`/`RolePermission` exist in models/migration 0002, but no seeder populates them and no policy checks them; effective RBAC is role-string matching. The documented matrix (`docs\rbac-permission-matrix.md`, e.g. `questions.manage` = superadmin/admin/content_manager; `exams.publish` = superadmin/exam_manager; `users.manage.roles` = superadmin only) is **documentation-only**, not enforced by code.
- `AdminBootstrapService.cs`: fail-closed first Super Admin creation (≥12-char password, recovery flag, transactional, audited); activated via `--bootstrap-superadmin` CLI or env.
- Middleware pipeline (`Program.cs`): `UseHttpsRedirection → UseCors(AllowFrontend from WEB_ORIGIN) → UseAuthentication → UseAuthorization → MapControllers` + custom `StreamJsonOutputFormatter`.
- Performance note: `SessionService.ValidateTokenAsync` writes `LastActiveAt` to DB on **every** authenticated request.

### 3.5 Audit logging
Write-only, ad-hoc inserts in `AuthController` (register/login success-failure/revoke), `ProfileController` (updated/password), `ExamAttemptsController` (attempt persisted), `TestimonialsController` (moderation), `AdminBootstrapService`, `SubscriptionService` (plan created/updated/archived). **No read endpoint exists**; `AuditLog.IpAddress` never populated; no event is recorded in checkout/webhook or programme create flows.

### 3.6 Analytics / dashboard endpoints
**None exist.** No stats, trends, revenue, cohort, or audit-read endpoints anywhere in `apps/api`. Dashboard numbers in the current admin overview are frontend static values.

### 3.7 Backend tests (xUnit)
`AppTests.cs` (health, programmes, profile image security incl. cross-user 403 + gateway spoof 401, subscriptions, gateway replay security, session revocation, attempt persistence), `RoleResolutionTests.cs` (role hierarchy + policy matrix — verifies the registered policies, including unused ones), `AdminBootstrapTests.cs`, `PromoDiscountTests.cs`, `StudyFlashcardsTests.cs` (auth 401, ownership, SM-2 progression), `TestimonialTests.cs`, `PostgresIntegrationTests.cs` (real PG fixture; **RBAC matrix on admin subscriptions: candidate 403, instructor 403, admin 200, superadmin 200, anon 401**; webhook signature 400; no stack-trace leaks), `DbConnectionStringTests.cs`.
Not covered: AuthController login flows, exams, entitlements, any admin permission matrix beyond subscriptions.

---

## 4. RBAC audit summary (six admin roles + candidate)

Actual, code-level truth:

| Role key | Real backend power today |
|---|---|
| `superadmin` | Same as admin (no distinction enforced anywhere); bootstrap creation |
| `admin` / `administrator` | `RequireAdmin` policy: subscription plan CRUD, attempt querying, testimonial moderation, session revoke of others (allowed in `revoke-session` via RoleHierarchy) |
| `content_manager` | **None enforced** (policy registered, unused) |
| `exam_manager` | May query any candidate's exam attempts (`ExamAttemptsController` inline role check only) |
| `reviewer` | **None enforced** |
| `instructor` | **None enforced** (explicitly 403 on subscriptions per `PostgresIntegrationTests.cs`) |

Documented intended matrix (`docs\rbac-permission-matrix.md`) exists but is aspirational. The frontend role predicates already diverge from backend truth (reviewer / manager string-matching).

---

## 5. Studio Admin reference audit

- **Official repo:** `https://github.com/arhamkhnz/next-shadcn-admin-dashboard` (Mohammed Arham Khan, 3.2k★). Demo: `studio-admin.arhamkhnz.com`. Editions also exist for Base UI / React Aria / TanStack Start — **use the Radix/shadcn edition**.
- **Licence: MIT** (verified `LICENSE` — "MIT License… Copyright (c) 2024 Mohammed Arham Khan") — unrestricted reuse with attribution retained in docs.
- **Compatibility (verified from its `package.json` @ main):**
  | Studio Admin | PrepFord (`apps/web`) | Verdict |
  |---|---|---|
  | Next.js ^16.4.3 App Router | 16.4.3 | ✅ exact match |
  | React ^19.3.1 | 19.3.0 | ✅ |
  | Tailwind v4 (tw-animate-css) | Tailwind v4 (`@tailwindcss/turbopack` + `tailwindcss-animate`) | ✅ (token names align) |
  | shadcn/ui (Radix) | shadcn new-york via Radix (`components.json`) | ✅ |
  | `next-themes` 0.4.6 | identical version | ✅ |
  | `cmdk`, `vaul`, `date-fns` | present (cmdk unused) | ✅ |
  | `recharts` ^3.8 | `recharts` ^2.15 installed/unused | ⚠️ upgrade to v3 to match its `chart.tsx` |
  | `@tanstack/react-table` ^9 | not installed | ➕ required addition |
  | `zustand`, `dnd-kit`, `fullcalendar`, `shiki`, etc. | absent | ❌ **do not adopt** — only port needed pattern code |

- **Structure reference (from repo tree):** shell under `src/app/(main)/dashboard/` with `_components/sidebar/app-sidebar.tsx|nav-main.tsx|nav-user.tsx`, `_components/header/{search-dialog,layout-controls,theme-switcher,account-switcher}`, `src/components/ui/{sidebar,breadcrumb,chart,command,table,tabs,form,select,switch,checkbox}.tsx`, nav data in `src/navigation/sidebar/sidebar-items.ts` (typed `NavGroup/NavMainItem/NavSubItem` with icons, badges, expandable parents — exactly the model PrepFord's role-aware nav needs), preferences in `src/lib/preferences/{theme,layout}.ts`.
- **Assessment:** Studio Admin is UI-only (mock data, no backend/auth integration) — safe to use purely as a design/layout/component reference. Its Next.js 16 + Tailwind v4 + shadcn parity means component code ports minimally. PrepFord already ships the shadcn `card/dialog/dropdown/input` subset; the missing `ui/{sidebar,breadcrumb,chart,command,table,tabs,form,select…}` primitives are standard shadcn registry additions (Radix peers already present, with `@radix-ui/react-collapsible`/etc. to add as needed).

---

## 6. Known defects (frontend evidence)

1. **5 dead nav links** → `/admin/programmes`, `/admin/questions`, `/admin/exams`, `/admin/users`, `/admin/audit-logs` don't exist (`admin\page-client.tsx` L27-36).
2. **Admin shell duplicated & divergent** per page (nav arrays 8 vs 3 items; guards include/exclude `reviewer` inconsistently).
3. **`/admin/*` renders inside public site chrome** — `public-header.tsx` L259-265 excludes `/dashboard`,`/sign-in`,`/sign-up` only; `admin\layout.tsx` adds no shell.
4. **`/admin/question-types` has no auth guard** and no sidebar (all-'use client' page).
5. **No mobile admin navigation** (`hidden lg:flex` only); no `usePathname` active state (hardcoded `current: true`).
6. **Hardcoded dashboard metrics** (L211-264 of `page-client.tsx`) — violates the "no arbitrary frontend data" requirement.
7. **No `loading.tsx`/`error.tsx`** anywhere; no error boundaries in admin.
8. **Unused deps:** `recharts` (v2), `cmdk`, plus `embla-carousel-react`, `input-otp`, `vaul` (unreferenced in `src/`), unused `ui/toaster.tsx`.
9. **Legacy `src\lib\api.ts`** parallel to `api-client.ts` with different env var — drift risk.
10. **No admin ThemeSwitcher**, though theme tokens work.
11. Backend: unauthenticated `POST api/v1/programmes` (§3.2) — must be fixed before exposing programme admin to the UI.

## 7. Gaps and missing integrations (honest inventory)

**What already works:** sign-in/auth/session, subscription plan admin CRUD (validated server-side, audited), testimonial moderation, health checks, learner dashboard/study studio, checkout with entitlements, per-user flashcards, exam attempt persistence, audit-log writes for core events.

**Existing backend data with no admin surface (backend first, then UI):**
- Question bank — entities, statuses, review workflow, 18 types: **no CRUD endpoints**.
- Exams/Mock/RAT — `Exam`/`ExamAttempt` exist (incl. `DiagnosticReadiness` type): **no admin endpoints**.
- Learning hierarchy (Programme→Course→SubjectDomain→Category→Subcategory→Topic): only programmes have a public GET; **no domain/content admin endpoints**, and POST programmes is unauthorized.
- Students/users directory, role assignment, activation: **no endpoints**.
- Audit log read: **no endpoint**.
- Analytics (registrations, enrolments, attempts, readiness, revenue): **no endpoints**.
- Content (blog/blog posts, FAQ, announcements — `hooks\use-api.ts` fetches some): no admin CRUD.
- Coupons exist as hardcoded promo strings (`CheckoutService` L36) — no entity/CRUD.

**Genuinely absent in DB schema:** study materials/summaries module, real coupon entities, payments provider wiring (simulated), notification content entities. Any of these need new entities + migrations — must be justified per module.

## 8. Risks and dependencies

- **R1 — Next 16.4.3 breaking changes** (`cacheComponents`); docs in `node_modules/next/dist/docs/` must govern component/page wiring.
- **R2 — RBAC turbulence:** frontend predicates ≠ backend policies ≠ documented matrix. Upgrading UI without agreeing enforcement limits will ship controls some roles can't use, or hide things they can. Backend policy application (using already-registered `RequireContentManager`/`RequireExamManager`/`RequireSuperAdmin`) is preferable to a permission-table rollout in this phase — permission schema stays untouched (no migrations to tables, no role semantics changes).
- **R3 — Payment/financial data:** no analytics endpoints exist; fabricating revenue numbers is prohibited. Finance cards ship only after `ApiGateway`-backed stats endpoints exist, or render as unavailable-state.
- **R4 — Simulated payments** mean "revenue" is not real money; label accordingly.
- **R5 — Assessment by-blow:** exam rules say no CAT unless a validated psychometric implementation exists — it does not; do not add.
- **R6 — Public site regression:** admin changes must not affect public routes; `public-header.tsx` exclusion-list change (adding `/admin`) is the only shared surface touched.
- **R7 — Legacy `lib/api.ts` consumers** (`hooks\use-api.ts` used by public pages) — consolidating the client touches public data paths; sequence carefully.

---

## 9. Upgrade opportunities (summary for plan)

1. Single admin shell: `AdminSidebar` + `AdminHeader` (role-aware, collapsible, mobile drawer, breadcrumbs, search/command palette, theme switcher) — replaces per-page duplication.
2. Port Studio Admin's `sidebar-items` typed nav model, `ui/sidebar`, `ui/breadcrumb`, `ui/command`, `ui/chart`, `ui/table`, `ui/tabs/form/select` primitives.
3. TanStack Query for all admin server state with mutation invalidation; retire raw `fetch` in admin clients.
4. New minimal backend capability set (phased): admin CRUD for questions/exams/learning structure, users/roles/audit read, stats endpoints — each with existing-policy authorization + xUnit coverage + audit-log writes.
5. Dashboard overview with real data behind feature-gated cards, charts via recharts v3 `ui/chart`, activity feed from AuditLog.
6. Fix security gaps surfaced by audit: `[Authorize]` programme POST, admin-shell-level server guard (`verifyAdminAuth` already exists) — plus mobile/keyboard/a11y work.

**Recommendation sequence and phase plan are in `docs/admin-dashboard-upgrade-plan.md`.** Implementation must not begin until that plan is approved.
