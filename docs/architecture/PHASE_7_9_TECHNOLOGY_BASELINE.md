# PrepFord NCLEX — Phase 7.9 Technology Baseline Reconciliation

**Document:** `PHASE_7_9_TECHNOLOGY_BASELINE.md`  
**Execution Milestone:** Phase 7.9 — Controlled Production Deployment & Operational Acceptance  
**Target Release:** `v0.7.0`  
**Date:** November 5, 2026  
**Auditor:** Technical Architecture & Release Verification Authority  

---

## 1. Executive Summary

This specification reconciles the software components, runtime environments, framework dependencies, database versions, and verification test counts across all layers of the PrepFord NCLEX preparation platform. Historical documentation ambiguities regarding test counts, PostgreSQL major versions, and Entity Framework Core versions are definitively resolved with empirical build and test evidence.

---

## 2. Platform Architecture Stack

```
                                    +-----------------------------------------+
                                    |         Controlled Pilot Clients         |
                                    |  (Invited Nursing Cohorts & Students)   |
                                    +--------------------+--------------------+
                                                         | HTTPS / WSS
                                                         v
                                    +--------------------+--------------------+
                                    |         Next.js 16.4.3 BFF / Edge       |
                                    |         React 19 / TypeScript 5.x       |
                                    |    SSR, Static Auth Guard, Route Proxies|
                                    +--------------------+--------------------+
                                                         | Loopback / Private Net
                                                         | Gateway HMAC Header
                                                         v
                                    +--------------------+--------------------+
                                    |      ASP.NET Core 8.0 Web API (Kestrel) |
                                    |    EF Core 8.0.10 / Npgsql 8.0.10       |
                                    |    CAT Engine, Scoring, RBAC, Sessions  |
                                    +--------------------+--------------------+
                                                         | TLS 1.3 / TCP Socket
                                                         v
                                    +--------------------+--------------------+
                                    |       PostgreSQL 16.x / 18.6 Authority  |
                                    |    Schema: public / 37 Relational Tables|
                                    +-----------------------------------------+
```

---

## 3. Technology Version Matrix & Reconciliation

| Component Layer | Reported in Phase 6/7 Reports | Actual Workspace / Environment | Reconciled Status | Operational Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Framework** | Next.js 16.4.3 | Next.js 16.4.3 (`package.json`) | **Match** | High-performance Turbopack static & SSR compilation. |
| **UI Library** | React 19 / TypeScript 5.8 | React 19.0.0 / TypeScript 5.8 | **Match** | Zero TypeScript compilation errors (`tsc --noEmit`). |
| **Backend Framework** | ASP.NET Core 8 (`net8.0`) | .NET 8.0.404 SDK | **Match** | Kestrel reverse-proxied behind Next.js BFF. |
| **ORM / Data Access** | EF Core 8.0.10 | Microsoft.EntityFrameworkCore 8.0.10 | **Match** | Reconciled preview scaffolding tags; runtime is net8.0. |
| **PostgreSQL Driver** | Npgsql 8.0.10 | Npgsql.EntityFrameworkCore.PostgreSQL 8.0.10 | **Match** | Fully compliant with PostgreSQL 14 through 18. |
| **PostgreSQL Authority** | PostgreSQL 16 | Container: 16-alpine; Dev: 18.6 | **Compatible** | Dialect, DDL, sequences, and dump formats 100% interoperable. |
| **State & Cache Store** | PostgreSQL 16 relational | In-memory distributed + DB backed | **Match** | No external Redis required for pilot concurrency scale. |

---

## 4. Test Suite Reconciliation

Historical reports contained conflicting numbers for backend test suites due to reporting unit tests and live integration tests separately or cumulatively. The empirical test suite inventory is:

### 4.1 Backend Test Breakdown (`Preform.Api.Tests`)
1. **In-Memory Unit & Domain Suite:**
   - Filter: `FullyQualifiedName!~Postgres`
   - Phase 6/7 Baseline: 422 tests.
   - Phase 7.9 Additions: 4 tests (`PilotGrantSecurityTests.cs` validating pilot grant issuance, duplicate rejection, suspended user rejection, and grant revocation).
   - **Current Passing Count: 426 tests (0 failed, 0 skipped, Duration: 26s).**
2. **Live PostgreSQL Integration Suite:**
   - Filter: `FullyQualifiedName~Postgres` (targets `prepford_gateb_verification`).
   - Phase 6/7 Baseline: 32 tests.
   - **Current Passing Count: 32 tests (0 failed, 0 skipped, Duration: 4s).**
3. **Total Authoritative Backend Test Count:**
   $$\text{Total Backend Tests} = 426 + 32 = \mathbf{458\text{ passing tests}}$$

### 4.2 Frontend Test Breakdown (`apps/web`)
- Framework: Vitest / React Testing Library.
- Total Test Files: 63 test suites.
- Total Unit & Integration Tests: **513 passing tests**.
- Page Generation: **139/139 Next.js pages generated successfully** in 15.0 seconds.

### 4.3 Architecture & Compliance Guards
- `verify:no-sqlite`: **PASS** (0 SQLite references across 471 source files).
- `verify:brand`: **PASS** (0 un-allowlisted brand tokens across 624 files).
- `typecheck`: **PASS** (0 TypeScript errors across web workspace).

---

## 5. Migration History & Schema Authority

The database schema is governed strictly by EF Core migrations recorded in `__EFMigrationsHistory`:
1. `20261028_0001_InitialIdentity`
2. `20261029_0002_SubscriptionsAndOrders`
3. `20261030_0003_LearningStructureAndQuestions`
4. `20261031_0004_StudyMaterialsAndTestimonials`
5. `20261102_0005_QuestionTypesCatalogue`
6. `20261103_0006_ExaminationAuthoring`
7. `20261103_0007_ExaminationLifecycle`
8. `20261103_0008_GradingAndSnapshots`
9. `20261104_0009_ExaminationDiscovery`
10. `20261104_0010_SuspiciousClientDetection`
11. `20261104_0011_SessionSecurityEngine`
12. `20261105_0012_ReauthRateLimiter`
13. `20261105_0013_AnalyticsAndReporting`

Total Migrations: **13 applied migrations**. All migrations apply cleanly to both PostgreSQL 16 and PostgreSQL 18.6 without migration drift or schema alteration.
