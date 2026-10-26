# Implementation status

## Phase 0 — Repository audit and product baseline

**Status: complete.**

Audit report: `docs/audit-report.md`. Stack deviation decision: `docs/decisions.md` (decision 8).

Baseline verified with a locally created `.env` copied from `.env.example`.

Verification results (NestJS/Prisma baseline, before migration):

- `npm run lint` — passed (api + web)
- `npm run typecheck` — passed (api + web)
- `npm run test` — passed, 3 unit tests (requires `DATABASE_URL`)
- `npm run test:e2e` — passed, 3 API health tests with a mocked Prisma service (requires `DATABASE_URL`)
- `npm run build` — passed (api + web)
- `npx prisma validate` — passed; `npm run db:generate` — passed

## Phase 1 — Foundation, environment and quality gates (.NET backend migration)

**Status: in progress.**

Backend migration approved (see `docs/decisions.md` decision 8). Migrating from NestJS + Fastify + Prisma to ASP.NET Core Web API + EF Core + Npgsql on .NET 8 LTS.

**Completed:**
- [x] PostgreSQL 18 installed and running locally (service: postgresql-x64-18)
- [x] Local trust authentication configured for development (`pg_hba.conf` updated, service reloaded)
- [x] `preform` database created with `preform` user
- [x] ASP.NET Core Web API project created (`apps/api/Preform.Api.csproj`, .NET 8)
- [x] EF Core + Npgsql configured (`AppDbContext`, `Programme` entity)
- [x] EF Core migration `20261026120000_CreateProgrammes` created (Programme table, unique Code index, RN/PN seed)
- [x] Health controllers: `GET /api/v1/health/live`, `GET /api/v1/health/ready`
- [x] Programmes controller: `GET /api/v1/programmes`, `GET /api/v1/programmes/{id}`, `GET /api/v1/programmes/code/{code}`, `POST /api/v1/programmes`
- [x] OpenAPI/Swagger configured (`Swashbuckle.AspNetCore`, UI at API root in development)
- [x] xUnit test project created (`apps/api/Tests/Preform.Api.Tests.csproj`)
- [x] Health controller tests (live, ready)
- [x] Programme controller integration tests (list, by code, not found, create, duplicate, invalid)
- [x] Programme service unit tests (in-memory database)
- [x] Root `package.json` scripts updated for .NET backend
- [x] `.env.example` updated with ASP.NET Core settings
- [x] CI workflow updated (`.github/workflows/ci.yml`) with .NET 8 setup and PostgreSQL service

**Blocked:**
- [ ] .NET 8 SDK is NOT installed in this environment — `dotnet build`, `dotnet test`, and `dotnet ef` cannot be executed locally
- [ ] EF Core migrations cannot be applied or verified without `dotnet ef` CLI
- [ ] Backend tests cannot be run locally without .NET SDK

**Remaining:**
- [ ] Install .NET 8 SDK and run `dotnet build`, `dotnet test`, `dotnet ef database update`
- [ ] Verify EF Core migrations apply to the isolated `preform` test database
- [ ] Verify frontend can communicate with the .NET API (CORS, API contracts)
- [ ] Retire NestJS/Prisma backend only after all .NET verification criteria pass

- [x] npm workspaces and documented local development commands.
- [x] Environment example and server-side API environment validation.
- [x] PostgreSQL Compose service (CI) and local PostgreSQL 18 (development).
- [x] Separate liveness and database readiness endpoints.
- [x] ASP.NET Core middleware pipeline, CORS, health checks.
- [x] Lint, typecheck, unit-test, integration-test and build scripts.
- [x] CI workflow for install and core checks.

## Phase 2 — Design system, navigation and core UI shell

**Status: complete.**

**Completed:**
- [x] shadcn/ui component system installed (button, card, dialog, dropdown-menu, popover, sheet, toggle, toggle-group, separator, label, input, badge, avatar, skeleton, scroll-area, navigation-menu)
- [x] Design tokens extended with shadcn/ui CSS variables (light/dark themes)
- [x] Theme provider with next-themes (light/dark/system, persisted)
- [x] TanStack Query provider + API client layer (`src/lib/api.ts`, `src/hooks/use-api.ts`)
- [x] React Hook Form + Zod installed (available for forms)
- [x] Vitest + React Testing Library + jsdom test infrastructure
- [x] Shared public shell: PublicHeader, PublicFooter, AnnouncementBar, NotificationPanel, ProfileMenu, CartButton, ThemeSwitcher
- [x] Root layout uses shared shell + Toaster + Providers
- [x] CORS added to .NET API (`AllowFrontend` policy from WEB_ORIGIN)
- [x] Radix-based NavigationMenu component for desktop dropdowns
- [x] Homepage refactored to use shared shell with all interactive sections:
  - HeroSection with pathway selection (RN/PN preserved in state)
  - ExamPathwayCards (RN/PN cards with feature lists)
  - SubscriptionCards (fetches programmes from real API `/api/v1/programmes`)
  - FeatureShowcase (4 feature cards)
  - HowItWorks (6-step journey)
  - CourseFinderQuiz (4-question recommendation quiz)
  - TestimonialsPreview (approved content only, link to /testimonials)
  - FAQPreview (6 FAQs, link to /faq)
  - FinalCTA (Buy Now / Try Now)
- [x] Theme selector with Light/Dark/System options (System default)
- [x] Cookie consent utilities (`src/lib/cookie.ts`, types)
- [x] Loading, error, empty state patterns
- [x] All public routes created:
  - `/` (homepage)
  - `/nclex-rn` (RN pathway page)
  - `/nclex-pn` (PN pathway page)
  - `/courses` (course catalogue)
  - `/subscriptions` (pricing and plan selection)
  - `/features` (feature showcase)
  - `/educators` (for educators page)
  - `/testimonials` (testimonials page)
  - `/contact` (contact form)
  - `/faq` (FAQ page)
  - `/privacy-policy` (privacy policy)
  - `/terms-and-conditions` (terms and conditions)
  - `/sign-in` (sign in)
  - `/sign-up` (sign up)
  - `/programmes/[programme]` (existing RN/PN routes)

**Blocked:**
- [ ] .NET 8 SDK is NOT installed locally — backend build/test verification deferred to CI
- [ ] Backend announcement endpoint not yet implemented — announcements use null data (documented dependency)
- [ ] Backend cart/subscription/checkout endpoints not yet implemented — cart uses hardcoded count (documented dependency)
- [ ] Browser-based visual QA against Archer Review references cannot be performed — no browser tool available in this environment

- [x] npm workspaces and documented local development commands.
- [x] Environment example and server-side API environment validation.
- [x] PostgreSQL Compose service (CI) and local PostgreSQL 18 (development).
- [x] Separate liveness and database readiness endpoints.
- [x] ASP.NET Core middleware pipeline, CORS, health checks.
- [x] Lint, typecheck, unit-test, integration-test and build scripts.
- [x] CI workflow for install and core checks.

## Phase 3 — RN and PN Pathways

**Status: complete.**

- [x] `/nclex-rn` and `/nclex-pn` product pages
- [x] Pathway-specific learning tools, question previews, assessment features
- [x] Sample question interaction not yet available (content not implemented — documented gap)

## Remaining phases

| Phase | Scope | Status |
|---|---|---|
| 3 | RN and PN product pages | Complete |
| 4 | Supporting pages (Courses, Features, Educators, Testimonials, Contact, FAQ) | Complete |
| 5 | Commerce (subscriptions, cart, checkout) — blocked on backend endpoints | Not started |
| 6 | Profile, notifications, support — blocked on backend auth/support endpoints | Not started |
| 7 | Legal and Cookie Consent | Partially complete (pages exist, cookie banner pending) |
| 8 | Quality Assurance | Not started |

## Decisions and blockers

- RN and PN share one application; programme-specific content and assessment rules must remain distinct.
- No question or clinical learning content has been fabricated or imported.
- Formal CAT is blocked on an approved psychometric method, calibrated item data and validation.
- Payments and AI are blocked on provider, policy and credential decisions.
- Backend migrated from NestJS/TypeScript + Prisma to .NET 8 / ASP.NET Core / EF Core + Npgsql (decision 8).
- .NET 8 SDK is not installed locally — build and test verification must be performed in an environment with the SDK.
- PostgreSQL 18 is running locally with trust authentication; `preform` database and `preform` user created.
- Backend CORS configured for `WEB_ORIGIN` (http://localhost:3000) to enable frontend API calls.
- Browser-based visual QA against Archer Review references cannot be performed — no browser tool available in this environment.
- Announcements, cart state, and subscription endpoints are not yet implemented on the backend — frontend uses null/placeholder data with documented dependencies.
