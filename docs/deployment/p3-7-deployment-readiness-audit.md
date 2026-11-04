# PREPFORD — P3.7 DEPLOYMENT READINESS AUDIT

**Phase:** P3.7 — Deployment Readiness & Controlled Release Validation  
**Workstream:** P3.7.1 — Repository-Wide Deployment Readiness Audit  
**Repository:** `C:\Users\gitau\Documents\PREform`  
**Branch:** `feature/dotnet-backend-migration`  
**Accepted Baseline:** `a332855734288cefd9095642a8b3e8c142ecdc6c` (Commit `5cbed6d0efcd7e0d27746971bc771f3d65296b96` adds P3.6 closure)  
**Execution Date:** November 4, 2026  
**Auditor Roles:** Senior Release Engineer, DevOps Engineer, Application Security Engineer, Database Reliability Engineer, QA Lead  
**Overall Readiness Verdict:** **READY FOR STAGING — PRODUCTION BLOCKED PENDING PRODUCT OWNER AUTHORIZATION**  

---

## 1. Executive Summary & Audit Mandate

This deployment readiness audit independently examines the end-to-end release readiness of PrepFord. The evaluation encompasses frontend hosting, ASP.NET Core backend hosting, PostgreSQL persistence, authentication and gateway security, CI/CD pipeline behavior, health and readiness endpoints, logging, configuration management, and rollback mechanisms.

### Key Audit Findings
1. **Frontend Architecture:** Next.js 16.4.3 (React 19, TypeScript, Turbopack) compiles cleanly. All 94 static and dynamic routes generate without errors. The client UI communicates strictly through Next.js BFF route handlers (`/api/admin/...`, `/api/auth/...`, `/api/study/...`).
2. **Backend Architecture:** ASP.NET Core 8 Web API builds cleanly and packages release artifacts (`dotnet publish -c Release`). All domain services, authentication schemes, role authorization policies, and database contexts initialize correctly.
3. **Database Architecture:** PostgreSQL is established as the sole system of record. Zero SQLite imports or runtime dependencies remain in active execution paths (enforced by `tests/architecture-sqlite-guard.test.ts`). All 9 EF Core migrations are verified and applied in sequence.
4. **Authentication & Gateway Security:** `PrepfordAuth` scheme uses Bearer session tokens and cryptographic Gateway HMAC validation (`x-gateway-signature` header using `GATEWAY_SHARED_SECRET` with replay protection within 300s). No server secrets are leaked through `NEXT_PUBLIC_*` variables.
5. **Release Blockers:** Live production deployment remains strictly blocked pending explicit Product Owner approval. Staging deployment is fully ready to proceed.

---

## 2. Deployment Readiness Matrix

Each component is classified as:
- **READY:** Fully verified and operational for release.
- **READY WITH CONDITIONS:** Operationally verified but requires explicit environment configuration or operational flags.
- **BLOCKED:** Critical blocker that prevents production release.
- **NOT APPLICABLE:** Not required for current release phase.
- **NOT VERIFIED:** Evidence unavailable.

| # | Inspection Dimension | Target Component | Classification | Evidence & Operational Verification |
|:---:|---|---|:---:|---|
| **1** | Frontend Web Build | Next.js 16.4.3 (`apps/web`) | **READY** | `npm run build:web` succeeds with exit code 0; 94/94 static and dynamic routes generated cleanly. |
| **2** | Backend API Build | ASP.NET Core 8 (`apps/api`) | **READY** | `dotnet build Preform.Api.csproj` and `dotnet publish -c Release` succeed with exit code 0. |
| **3** | TypeScript Typecheck | TypeScript Strict Mode | **READY** | `npm run typecheck` (`tsc --noEmit`) passes with 0 errors. |
| **4** | Frontend Test Suite | Vitest (`apps/web/tests`) | **READY** | 401 tests pass across 48 test files (0 failures, 0 skipped). |
| **5** | Backend Unit Suite | xUnit (`Preform.Api.Tests`) | **READY** | 274 unit tests pass with 0 failures (`dotnet test --filter "!~Postgres"`). |
| **6** | PostgreSQL Integration | Loopback Database Suite | **READY** | 21 integration tests pass targeting `prepford_gateb_verification` via `PREFORM_GATEB_TEST_CONNECTION_STRING`. |
| **7** | Zero-SQLite Guard | Runtime Storage Enforcement | **READY** | `tests/architecture-sqlite-guard.test.ts` passes; no runtime SQLite imports exist in `apps/web/src` or `apps/api`. |
| **8** | Database Migrations | EF Core 8 / Npgsql | **READY** | All 9 migrations inventory verified; all applied in `__EFMigrationsHistory`; 0 destructive column drops. |
| **9** | Health Endpoints | ASP.NET Core Health Checks | **READY** | Liveness `/api/v1/health/live` and database readiness `/api/v1/health/ready` implemented and mapped in `Program.cs`. |
| **10** | Gateway HMAC Signing | Inter-Service Security | **READY** | `api-client.ts` signs requests with timestamped HMAC SHA256; `PrepfordAuthHandler.cs` verifies signature and enforces replay guard. |
| **11** | Production Secret Guard | Env Variable Leak Prevention | **READY** | `SESSION_SECRET` and `GATEWAY_SHARED_SECRET` enforce strict production checks; 0 server secrets exposed via `NEXT_PUBLIC_*`. |
| **12** | CORS Configuration | API Access Policy | **READY WITH CONDITIONS** | `WEB_ORIGIN` configurable via environment; default `http://localhost:3000` must be set to canonical web domain in staging/production. |
| **13** | Payment Gateway | Merchant Checkout Provider | **READY WITH CONDITIONS** | Architecture fails closed (`503` in production); staging requires `ENABLE_MOCK_CHECKOUT=true` until live Stripe/PayPal keys are provisioned. |
| **14** | Production Deployment | Live Production Release | **BLOCKED** | Deployment execution is strictly withheld pending formal Product Owner authorization. |
| **15** | CI/CD Automation | GitHub Actions (`ci.yml`) | **READY WITH CONDITIONS** | Pipeline validates lint, typecheck, tests, and builds against PostgreSQL service container; deployment step to staging is manual/gated. |
| **16** | Backup & Recovery | Database Disaster Recovery | **READY** | `pg_dump` and `psql` restore rehearsed with 100% parity across 32 tables and 9 migrations; runbook established. |
| **17** | Rollback Capability | Version Reversion Runbook | **READY** | Decoupled rollback procedures defined for frontend, backend, configuration, and traffic. |

---

## 3. Infrastructure & Hosting Component Audit

### 3.1 Next.js Frontend Deployment
- **Framework:** Next.js 16.4.3 with React 19 and Turbopack.
- **Node Runtime:** Node.js `>=24.0.0` (active v24.21.0, npm 11.19.0).
- **Hosting Targets:** Vercel, Node.js standalone server container, or Cloudflare Pages with Node bridge.
- **BFF Architecture:** The frontend hosts Next.js Route Handlers (`src/app/api/...`) that authenticate requests via `verifyAdminAuth` and proxy downstream calls to ASP.NET Core via `apiClient`.
- **Static Assets:** Optimized visual assets, blog articles, and manifest files compile during `next build`.
- **Operational Assessment:** Fully ready for deployment. Requires environment variable configuration for `API_GATEWAY_URL`, `SESSION_SECRET`, and `GATEWAY_SHARED_SECRET`.

### 3.2 ASP.NET Core Backend Deployment
- **Framework:** ASP.NET Core 8 on .NET 8 runtime (SDK 10.0.403 installed, targeting `net8.0`).
- **Hosting Targets:** Linux/Windows container (Docker/OCI), systemd service on Linux VM, or Azure App Service.
- **Port & URL Binding:** Configurable via `ASPNETCORE_URLS` (default `http://0.0.0.0:4000`).
- **Service Dependency:** Requires PostgreSQL connection string (`DATABASE_URL` or `ConnectionStrings:DefaultConnection`).
- **Startup Migration Execution:** `Program.cs` executes `dbContext.Database.Migrate()` on startup when `ASPNETCORE_ENVIRONMENT != "Testing"`.
- **Operational Assessment:** Fully ready for deployment. Release binary verified via `dotnet publish -c Release`.

### 3.3 PostgreSQL System of Record
- **Engine Version:** PostgreSQL 16+ (verified locally on PostgreSQL 18.6).
- **Driver:** Npgsql 8.x with Entity Framework Core.
- **Connection Format:** Supports standard ADO.NET connection strings as well as URI-style strings (`postgresql://user:pass@host:port/db?schema=public`) via `ConnectionStringHelper`.
- **Tables Verified:** 32 tables in `public` schema.
- **Migration History:** Managed via `public."__EFMigrationsHistory"`.
- **Operational Assessment:** Fully operational. Migration safety verified in workstream P3.7.4.

---

## 4. Missing Configuration, Gaps & Security Concerns

1. **Staging Environment Variables:** Staging-specific connection strings, distinct `SESSION_SECRET`, and distinct `GATEWAY_SHARED_SECRET` must be populated in the staging hosting provider's dashboard. Under no circumstances may staging share production credentials.
2. **Startup Migration vs. CI/CD Migration:** `Program.cs` contains code to apply migrations on startup (`dbContext.Database.Migrate()`). In a clustered multi-instance deployment (e.g. 2+ API pods), concurrent startup migrations could lead to race conditions. For staging single-instance this is acceptable; for production, executing migrations via an explicit deployment step or migration bundle (`dotnet ef migrations bundle`) before scaling traffic is recommended.
3. **CORS Explicit Origin:** The backend defaults `WEB_ORIGIN` to `http://localhost:3000`. In staging, `WEB_ORIGIN` must explicitly be set to the staging frontend URL (e.g. `https://staging.prepford.com`).
4. **Mock Checkout Flag:** `ENABLE_MOCK_CHECKOUT` must be set to `true` in staging to permit complete end-to-end checkout validation without real payment cards. It must remain strictly `false` or unset in production.

---

## 5. Opportunities for Safe Automation

1. **Staging Pre-Flight Check Script:** A script that verifies `/api/v1/health/live`, `/api/v1/health/ready`, and gateway signature verification before routing user traffic.
2. **Database Migration Verification Gate:** Running `dotnet ef migrations list` in CI to ensure no migrations are omitted from `__EFMigrationsHistory`.
3. **Automated Rollback Trigger:** Automated health check monitoring that signals container rollback if `/api/v1/health/ready` returns non-200 within 60 seconds of deployment.

---

## 6. Audit Conclusion & Decision

- **Staging Deployment Status:** **APPROVED TO PREPARE & VALIDATE.**
- **Production Deployment Status:** **STRICTLY BLOCKED.** Production deployment runbooks may be drafted and rehearsed in staging, but production execution requires separate, explicit authorization from the PrepFord Product Owner.
