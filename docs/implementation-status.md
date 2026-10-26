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

**Status: initial public shell scaffolded and production build verified; authentication and student/admin shells remain outstanding.**

- [x] Responsive public landing page and RN/PN pathway routes.
- [x] Keyboard focus, reduced-motion support and small-screen layouts.
- [ ] Authenticated student and administrator layouts.
- [ ] Shared reusable form, navigation and application-state components.
- [ ] shadcn/ui component system (adopt as the single component system; do not maintain two competing systems).

## Remaining phases

| Phase | Scope | Status |
|---|---|---|
| 3 | Public pages, original sample content and dynamic pricing UI | Not started |
| 4 | Authentication, onboarding and programme selection | Not started |
| 5 | Versioned question bank, practice and rationales | Not started |
| 6 | Administrator content management | Not started |
| 7 | Readiness assessments; CAT only with validated methods and item data | Not started |
| 8 | Data-backed analytics and explainable recommendations | Not started |
| 9 | Approved-source AI Study Studio foundations | Not started |
| 10 | Flashcards and spaced repetition | Not started |
| 11 | Contextual AI tutor | Not started |
| 12 | Secure document learning and advanced study tools | Not started |
| 13 | Admin-managed plans and server-enforced entitlements | Not started |
| 14 | Accessibility, responsive and product-flow QA | Not started |
| 15 | Security, integration and release readiness | Not started |

## Decisions and blockers

- RN and PN share one application; programme-specific content and assessment rules must remain distinct.
- No question or clinical learning content has been fabricated or imported.
- Formal CAT is blocked on an approved psychometric method, calibrated item data and validation.
- Payments and AI are blocked on provider, policy and credential decisions.
- Backend migrated from NestJS/TypeScript + Prisma to .NET 8 / ASP.NET Core / EF Core + Npgsql (decision 8).
- .NET 8 SDK is not installed locally — build and test verification must be performed in an environment with the SDK.
- PostgreSQL 18 is running locally with trust authentication; `preform` database and `preform` user created.
