# PrepFord — Phase 6 Independent SQLite Retirement Audit & Release Gate Report

**Audited Repository:** `C:\Users\gitau\Documents\PREform`  
**Git Branch:** `feature/dotnet-backend-migration`  
**Audited Commit (HEAD):** `4b4b315690d04e9e7c872473830d7cc9288da691`  
**Working Tree Status:** Clean (`nothing to commit, working tree clean`)  
**Audit Date:** October 29, 2026  
**Auditor Roles:** Senior Backend Architect, Application Security Engineer, Database Engineer, QA Lead  

---

## 1. Executive Summary & Release Gate Verdicts

This independent release audit evaluated the completed Phase 6 milestone for **PrepFord** (NCLEX-RN & NCLEX-PN adaptive preparation platform), verifying claims that SQLite has been fully retired from application runtime paths and that persistence, authentication, and transactional integrity are properly enforced across the Next.js BFF and ASP.NET Core / PostgreSQL architecture.

### Release Gate Verdicts

| Environment | Verdict | Primary Gate Conditions / Justification |
| :--- | :--- | :--- |
| **Staging Release** | **CONDITIONAL GO** | **Permitted under strict operational constraints:**<br>1. **Single-Instance Next.js:** Staging Next.js container must run with replica count = 1 (or sticky sessions) due to in-memory session and revocation state.<br>2. **Network Isolation:** ASP.NET Core API (port 5000) must be isolated within private VPC/overlay network with no external routing to prevent header-spoofing on `/api/profile/image`.<br>3. **Sandbox Checkout Only:** Stripe/Mock checkout must strictly use sandbox test mode. |
| **Production Release** | **NO-GO** | **BLOCKED** by three architectural & security defects:<br>1. **SEC-01 (High):** `ProfileImageController` lacks `[Authorize]` and accepts unverified `X-Authenticated-User-Id` headers when claims are missing, allowing identity spoofing.<br>2. **SEC-02 (High):** Next.js BFF maintains sessions in a local JavaScript `Map` and `Set` in process memory rather than synchronizing with PostgreSQL `UserSessions`, preventing multi-replica scaling and reliable session revocation.<br>3. **ARCH-01 (Medium):** Student exam attempt histories remain persisted in browser `localStorage` and are not yet synchronized to PostgreSQL `ExamAttempts`. |

---

## 2. Audited Baseline & Environment Verification

### Repository State
- **Branch:** `feature/dotnet-backend-migration`
- **HEAD Commit:** `4b4b315690d04e9e7c872473830d7cc9288da691`
- **Ancestry Verification:** Commit `4b4b315` incorporates the prior reported commit `b59be30` as a direct ancestor (`git merge-base --is-ancestor b59be30 HEAD` returned `0`).
- **Working Tree:** Pristine. No uncommitted modifications or untracked runtime files.

### Toolchain Versions
- **Node.js:** `v24.21.0`
- **npm:** `11.19.0`
- **.NET SDK:** `10.0.403` (Targeting `net8.0` runtime)
- **PostgreSQL Server:** `16.x` on `localhost:5432` (`Database=prepford`)

### Preflight SQLite Backup Verification
The preflight backup directory created prior to SQLite runtime retirement was inspected and cryptographically verified:
- **Location:** `backups/sqlite-pre-removal-20261029/`
- **Database File:** `prepford.sqlite` (122,880 bytes)  
  *SHA-256:* `6ce1b4a69ad662ea7008cf896ca8ef1fbe147ca25dae24177579f6aa6a3aa5bc`
- **Shared Memory File:** `prepford.sqlite-shm` (32,768 bytes)  
  *SHA-256:* `068e16bfdb2a34431e15647548ec2eb0402b489d2c4e0f52b65103ecfa252f53`
- **Write-Ahead Log:** `prepford.sqlite-wal` (0 bytes)  
  *SHA-256:* `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- **Status:** **PASS**. Preserved off runtime search paths.

---

## 3. Architecture Overview & System Topology

The target architecture transitions PrepFord from a dual-database model (Next.js with embedded SQLite + ASP.NET Core with PostgreSQL) to a unified, authoritative PostgreSQL relational backend.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT BROWSERS                                   |
|   - Student Portal, Candidate Exam Interface, Admin Console                       |
|   - Assessment Responses (Current: localStorage; Target: API ExamAttempts)        |
+-----------------------------------------------------------------------------------+
                                         |  HTTPS
                                         v
+-----------------------------------------------------------------------------------+
|                        NEXT.JS 16 APP ROUTER / BFF LAYER                          |
|   - Port 3000 | Turbopack / Webpack Bundler                                       |
|   - Authentication Gateway (Login, Register, Logout)                              |
|   - Session Validation: In-Memory Map & Revocation Set [DEFECT: Non-Durable]      |
|   - Gateway Client: Signs requests with HMAC-SHA256 (Secret: PREP_GATEWAY_SECRET) |
+-----------------------------------------------------------------------------------+
                                         |  HTTP + X-Gateway-Signature
                                         |  (Private Internal Network Only)
                                         v
+-----------------------------------------------------------------------------------+
|                            ASP.NET CORE 8 WEB API                                 |
|   - Port 5000 | Kestrel | .NET 8.0 Web API                                        |
|   - PrepfordAuthHandler: Authenticates Gateway HMAC Signature                     |
|   - Controllers: Auth, Users, Profile, ProfileImage [DEFECT: Missing [Authorize]],|
|                  Subscriptions, Checkout, ExamAttempts                            |
|   - SessionService, SubscriptionService, CheckoutService, UserService             |
+-----------------------------------------------------------------------------------+
                                         |  Npgsql / EF Core 8.0
                                         v
+-----------------------------------------------------------------------------------+
|                            POSTGRESQL 16+ DATABASE                                |
|   - Database: prepford | Port 5432                                                |
|   - 10 Authoritative Relational Tables (Users, UserSessions, ExamAttempts, etc.)  |
|   - Applied EF Core Migrations: 0001, 0002, 0003, 0004                            |
+-----------------------------------------------------------------------------------+
```

---

## 4. SQLite Retirement & Architecture Guard Audit

### Claims Audited
1. No active application code imports `node:sqlite`, `DatabaseSync`, `better-sqlite3`, `sqlite3`, `Microsoft.Data.Sqlite`, or `UseSqlite`.
2. Package dependencies for SQLite have been uninstalled or isolated from runtime builds.
3. An automated architecture guard runs in CI to prevent regression.

### Inspection Evidence
- **Source Code Scan:** Comprehensive regex scans across `apps/web/src` and `apps/api` confirmed **0 occurrences** of SQLite runtime modules or connection builders.
- **Package Manifests:**
  - `apps/web/package.json`: Contains no SQLite packages.
  - `apps/api/Preform.Api.csproj`: Package references strictly limited to `Npgsql.EntityFrameworkCore.PostgreSQL` (Version `8.0.4`) and `Microsoft.EntityFrameworkCore.Design` (Version `8.0.4`). `Microsoft.Data.Sqlite` is completely absent.
- **Migration & Reconciliation Tooling Isolation:**
  - `scripts/migrate-sqlite-to-postgres.ts` and `scripts/reconcile-sqlite-postgres.ts` reside exclusively in the top-level maintenance tooling directory.
  - Neither script is imported by `apps/web/src` or bundled into Next.js server actions / routes.
- **Automated Architecture Guard:**
  - Verified `scripts/verify-no-sqlite-runtime.ts` and `apps/web/tests/architecture-sqlite-guard.test.ts`.
  - The script scans 193 files in `apps/web/src` and `apps/api`, asserting that banned tokens (`node:sqlite`, `DatabaseSync`, `better-sqlite3`, `sqlite3`, `Microsoft.Data.Sqlite`, `UseSqlite`, `apps/web/.data`) do not exist.
  - Execution result: `npm run verify:no-sqlite` exited with code `0`, scanning 193 files with 0 violations.

**Section Status:** **PASS**

---

## 5. Authentication, Session Durability & Revocation Audit

### Findings & Architecture Analysis
Inspection of `apps/web/src/lib/session.ts` and the backend `apps/api/Services/SessionService.cs` revealed a critical architectural mismatch:

1. **In-Memory Storage in Next.js BFF:**
   In `apps/web/src/lib/session.ts` (lines 40–41):
   ```typescript
   const memorySessions = new Map<string, StoredSession>();
   const revokedSessionIds = new Set<string>();
   ```
   Sessions are stored in an un-persisted, in-process Node.js `Map`. Revoked session IDs are placed in an in-process `Set`.
2. **Disconnection from PostgreSQL Session Table:**
   While the PostgreSQL database contains an authoritative `UserSessions` table (managed by EF Core and `SessionService.cs` in ASP.NET Core), Next.js does **not** call the ASP.NET Core session endpoints during login (`apps/web/src/app/api/auth/login/route.ts`), logout, or session verification (`verifySession`).
3. **Multi-Replica Invalidation Failure (Split-Brain Revocation):**
   If Next.js is deployed to a staging or production cluster with $>1$ container replica or behind a round-robin load balancer:
   - A logout or security revocation on **Instance A** only updates Instance A's local `revokedSessionIds` set.
   - Subsequent requests from the student routed to **Instance B** will successfully validate against Instance B's local state, bypassing revocation.
4. **Process Restart Eviction:**
   Any container restart, redeploy, or worker recycle purges all active user sessions and revocation blacklists, forcing all connected students to re-authenticate.

**Section Status:** **FAIL** (Production blocker; Staging requires single-instance pinning)

---

## 6. Gateway Boundary & API Security Audit

### 1. Gateway Signature Protocol
- **Implementation:** `apps/web/src/lib/server-api-client.ts` generates an HMAC-SHA256 signature passed in the `X-Gateway-Signature` HTTP header using `PREP_GATEWAY_SECRET`.
- **HMAC Payload:** The signature payload is computed strictly from:
  ```typescript
  const payload = `${userId}|${email}|${role}`;
  ```
- **Vulnerabilities Identified:**
  - **No Replay Protection:** The payload lacks a timestamp (`X-Gateway-Timestamp`), nonce, HTTP method, request path, or SHA256 body digest. Once captured, a valid signature for a user can be replayed indefinitely against any endpoint.
  - **Non-Constant Time Comparison:** In `apps/api/Infrastructure/PrepfordAuthHandler.cs` (line 46):
    ```csharp
    if (!string.Equals(expectedSignature, signature, StringComparison.OrdinalIgnoreCase))
    ```
    This comparison is vulnerable to timing analysis. It must use `CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expectedSignature), Encoding.UTF8.GetBytes(signature))`.

### 2. High-Severity Vulnerability: `ProfileImageController` Spoofing
- **Location:** `apps/api/Controllers/ProfileImageController.cs`
- **Issue:**
  The controller lacks the `[Authorize]` attribute.
  In lines 31–40, the `ResolveAuthenticatedUser()` method checks for authenticated claims, but if claims are null, it falls back to:
  ```csharp
  var headerId = Request.Headers["X-Authenticated-User-Id"].FirstOrDefault();
  var headerEmail = Request.Headers["X-Authenticated-User-Email"].FirstOrDefault();
  if (Guid.TryParse(headerId, out var parsedId))
  {
      return (parsedId, headerEmail ?? "user@prepford.local", "Student");
  }
  ```
- **Security Impact:**
  `ResolveAuthenticatedUser()` accepts unauthenticated header values **without verifying the `X-Gateway-Signature`**. If port 5000 on the ASP.NET Core API is exposed directly to the network or accessible via a misconfigured proxy, any unauthenticated attacker can supply arbitrary `X-Authenticated-User-Id` values to read or overwrite another user's profile picture.

**Section Status:** **FAIL** (High severity vulnerability requiring remediation before public or staging exposure)

---

## 7. PostgreSQL Persistence, Schema & Migrations Audit

### Database Entities & Migrations
The EF Core migration history and schema definitions in `apps/api/Data/PreformDbContext.cs` were verified against PostgreSQL 16:
- **Registered DbSets (10 Tables):**
  1. `Users` — User core identity and credentials.
  2. `UserProfiles` — Extended profile metadata and nursing pathway.
  3. `UserSessions` — Session records and token hashes.
  4. `SubscriptionPlans` — Subscription catalog, tiers, and pricing.
  5. `Subscriptions` — Active and historical user subscriptions.
  6. `AuditLogs` — Administrative, security, and auth audit records.
  7. `CheckoutOrders` — Orders created through checkout flow.
  8. `CheckoutOrderItems` — Line items associated with checkout orders.
  9. `ExamAttempts` — Candidate test sessions, timing, and status.
  10. `AttemptResponses` — Item-level responses and scoring metadata.

- **Applied EF Core Migrations:**
  - `20261029103000_0001_InitialCreate.cs`
  - `20261029110000_0002_SubscriptionsAndAudit.cs`
  - `20261029113000_0003_CheckoutEntities.cs`
  - `20261029120000_0004_ExamAttempts.cs`

### Assessment Attempt State Discrepancy
While the backend has completed tables for `ExamAttempts` and `AttemptResponses`, client inspection of `apps/web/src/lib/assessment-store.ts` and `apps/web/src/app/(student)/student/dashboard/page-client.tsx` reveals that active exam state and recent test results are still stored in the browser's `localStorage`. They are not yet piped into ASP.NET Core's `/api/attempts` endpoints.

**Section Status:** **PASS** (Database schema & EF Core migrations ready); **PARTIAL** (Candidate assessment data flow needs frontend API integration).

---

## 8. Catalog, Checkout & Entitlement Security Audit

### Mock Checkout & Sandbox Isolation
- **Endpoint Inspection:** `apps/web/src/app/api/checkout/route.ts` and `apps/api/Services/CheckoutService.cs`.
- **Fail-Closed Verification:**
  - `isSandboxCheckoutPermitted()` verifies that `NODE_ENV !== "production"` and `ALLOW_MOCK_CHECKOUT === "true"`.
  - In production mode, requests attempting mock checkout are rejected with `400 Bad Request` / `503 Service Unavailable`.
  - In `CheckoutService.cs`, production requires a valid Stripe secret key (`Stripe:SecretKey`); absent keys fail-closed and throw `InvalidOperationException`.
- **Entitlement Isolation:** Free tier users are restricted to 10 diagnostic questions; active full subscribers receive unrestricted Q-Bank access via `EntitlementService.cs`.

**Section Status:** **PASS**

---

## 9. Data Migration & Reconciliation Audit

### Verification of Historical Data Portability
- **Migration Engine:** `scripts/migrate-sqlite-to-postgres.ts` utilizes batch streaming, foreign key preservation, and password hash integrity checks.
- **Reconciliation Audit:** Inspected `docs/data-migration-report.json` and executed dry-run reconciliation via `scripts/reconcile-sqlite-postgres.ts`.
- **Results:**
  - Users: 100% matched, 0 hash mismatches.
  - Profiles: 100% matched, 0 pathway discrepancies.
  - Subscription Plans: 100% matched.
  - Audit Logs: 100% matched, timestamps verified in UTC.
  - Overall discrepancy count: **0**.

**Section Status:** **PASS**

---

## 10. Independent Verification Matrix & Test Provider Truth

Every test and verification suite was executed independently. The table below documents the exact commands, execution outputs, and whether tests ran against in-memory doubles or live PostgreSQL.

| Verification Step | Command Line | Real Provider / Target | Result | Evidence / Details |
| :--- | :--- | :--- | :---: | :--- |
| **SQLite Guard** | `npm run verify:no-sqlite` | Static Repository AST Scanner | **PASS** | 193 files scanned, 0 violations found. Exit code 0. |
| **Web TypeScript** | `npm run typecheck --workspace @preform/web` | TypeScript 5.8 Compiler (`tsc`) | **PASS** | 0 type errors across Next.js app. Exit code 0. |
| **Web Linter** | `npm run lint --workspace @preform/web` | ESLint 9 / Next Core Web Vitals | **PASS** | 0 errors, 2 React compiler memoization warnings. Exit code 0. |
| **Web Unit / Int** | `npm run test --workspace @preform/web` | Vitest 2.1.9 (Node Environment) | **PASS** | 33 test files passed, 257 tests passed (131.2s). Exit code 0. |
| **Web Production Build** | `npm run build --workspace @preform/web` | Next.js 16.0.1 Compiler & Bundler | **PASS** | 82/82 routes compiled and statically optimized. Exit code 0. |
| **.NET Unit Tests** | `dotnet test apps/api/Tests/Preform.Api.Tests.csproj` (`AppTests.cs`) | `Microsoft.EntityFrameworkCore.InMemory` | **PASS** | 19 unit tests passed. Uses in-memory fake DB provider. |
| **.NET Integration** | `dotnet test apps/api/Tests/Preform.Api.Tests.csproj` (`PostgresIntegrationTests.cs`) | `Npgsql.EntityFrameworkCore.PostgreSQL` (`Host=localhost:5432;Database=prepford`) | **PASS** | 8 integration tests passed against live local PostgreSQL. |
| **Full Stack E2E** | Playwright Web-to-API-to-DB | Running Next.js + ASP.NET Core Stack | **NOT RUN / BLOCKED** | Requires running dual-server hosting stack; marked unverified. |

> [!IMPORTANT]
> **Provider Distinction:** The 27 passing .NET tests consist of 19 unit tests utilizing EF Core's In-Memory provider (`Microsoft.EntityFrameworkCore.InMemory`) and 8 integration tests executing against real PostgreSQL via Npgsql. The passing unit tests demonstrate business logic validity, but should not be conflated with full relational integration.

---

## 11. Risk Register & Vulnerability Catalog

| Risk ID | Severity | Category | Description | Mitigating Action / Workaround |
| :---: | :---: | :---: | :--- | :--- |
| **SEC-01** | **HIGH** | Security / Auth | `ProfileImageController` lacks `[Authorize]` and accepts raw `X-Authenticated-User-Id` headers without gateway HMAC verification. | Enforce `[Authorize]` and remove unauthenticated header fallback. Ensure port 5000 is isolated in staging. |
| **SEC-02** | **HIGH** | Reliability / Auth | Next.js BFF sessions reside in process memory (`Map` & `Set`), causing multi-instance desynchronization and revocation bypass. | Pin staging Next.js to 1 container instance; wire BFF to PostgreSQL `UserSessions` before production. |
| **SEC-03** | **MEDIUM** | Security / Cryptography | Gateway signature signs `${userId}\|${email}\|${role}` without timestamp or path binding, enabling signature replay. | Add timestamp, HTTP path, and body hash to HMAC payload; use constant-time string comparison. |
| **ARCH-01** | **MEDIUM** | Architecture / Data | Candidate exam attempts are stored in client `localStorage` rather than synced to PostgreSQL `ExamAttempts`. | Wire frontend exam engine to backend `/api/attempts` endpoints. |
| **COMP-01** | **LOW** | Code Quality | React 19 compiler warnings on component memoization in candidate assessment views. | Refactor hook dependency arrays in assessment views. |

---

## 12. Prioritized Remediation Roadmap

### Phase A: Staging Release Gate Prerequisites (Immediate)
1. **Network Firewalling:** Ensure the ASP.NET Core service (port 5000) is accessible **only** to the Next.js container via internal Docker network or private VPC routing.
2. **Container Pinning:** Configure staging Next.js deployment replica count to `1` (or configure sticky sessions on ingress) to prevent session desynchronization.
3. **Environment Flags:** Verify `NODE_ENV=staging`, `ALLOW_MOCK_CHECKOUT=true`, and `DATABASE_URL` / `ConnectionStrings__DefaultConnection` point to staging PostgreSQL.

### Phase B: Production Release Gate Prerequisites (Blocking)
1. **Remediate `ProfileImageController` (SEC-01):**
   - Add `[Authorize]` attribute to `apps/api/Controllers/ProfileImageController.cs`.
   - Remove header parsing fallback in `ResolveAuthenticatedUser()`. Require verified claims generated by `PrepfordAuthHandler`.
2. **Harden Gateway Protocol (SEC-03):**
   - Incorporate UNIX epoch timestamp, HTTP method, and URL path into `payload`: `${timestamp}:${method}:${path}:${userId}:${email}:${role}`.
   - Enforce 60-second signature expiration window in `PrepfordAuthHandler.cs`.
   - Implement `CryptographicOperations.FixedTimeEquals` for all signature comparisons.
3. **Durable Session Persistence (SEC-02):**
   - Replace in-memory `Map` in `apps/web/src/lib/session.ts` with HTTP calls to ASP.NET Core's `SessionService` backed by PostgreSQL `UserSessions` (or shared Redis session cache).
4. **Connect Exam Attempt Pipeline (ARCH-01):**
   - Integrate Next.js assessment completion handlers with ASP.NET Core `/api/attempts` endpoints to persist exam responses to `ExamAttempts` and `AttemptResponses`.
5. **Live Payment Provider Integration:**
   - Configure live Stripe webhook handlers and secret keys, disabling mock checkout completely.

---

## 13. Audit Sign-Off

- **Report Published:** `docs/phase-6-independent-release-audit.md`
- **Auditor Verdict:** **CONDITIONAL GO for Staging** | **NO-GO for Production**
- **Audited Commit:** `4b4b315690d04e9e7c872473830d7cc9288da691`
- **Status of Working Tree:** Clean
