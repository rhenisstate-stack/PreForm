# PrepFord NCLEX — Phase 7.9.1 Regression Verification (Work Package H)

**Document:** `PHASE_7_9_1_REGRESSION_VERIFICATION.md`
**Execution Milestone:** Phase 7.9.1 — Regression & Acceptance Verification
**Verification Date:** November 6, 2026
**Environment:** Windows workstation, Node v24.21.0 / npm 11.19.0, .NET SDK 10.0.403 (project targets net8.0), PostgreSQL 18.6 native (test authority database `prepford_gateb_verification` created fresh from an isolated loopback reset; dev authority `prepford` untouched except read-only queries), Docker unavailable

**Source commit for all runs:** `35fa06b067319e3e694f2b6b64a0a616f8942c14` (HEAD of `feature/dotnet-backend-migration`; working tree clean at start of the audit except the new Phase 7.9.1 deliverables)

No test was modified, excluded, or filtered to force a result. Two environmental corrections were required before a valid run could be attributed (documented below). All counts below were observed directly in the runs.

---

## 1. Backend Suites

| Suite | Command | Exit Code | Result | Duration |
| :--- | :--- | ---: | :--- | ---: |
| Full backend (unit + domain + PostgreSQL integration) — first attempt | `$env:PREFORM_GATEB_TEST_CONNECTION_STRING='Host=127.0.0.1;Port=5432;Database=prepford_gateb_verification;…'; dotnet test apps/api/Tests/Preform.Api.Tests.csproj --logger trx --logger "console;verbosity=minimal" --results-directory artifacts/phase791-test-results` | **1** | **458 total, 456 passed, 2 failed, 0 skipped** | 1 m 44 s |
| PostgreSQL-focused subset — after isolated DB reset | `dotnet test apps/api/Tests/Preform.Api.Tests.csproj --filter "FullyQualifiedName~PostgresqlGate|FullyQualifiedName~PostgresIntegrationTests"` (same env var) | 0 | **20/20 passed** | 1 m 27 s |
| Full backend — final clean rerun | same full command as attempt 1 | **0** | **458 total, 458 passed, 0 failed, 0 skipped** | 3 m 04 s |

### Environmental corrections (documented, no product code touched)

1. **First attempt failures (2)**: `SessionSecurityPostgresGateTests.SweepUnderAdvisoryLock_…` and `SessionSecurityPostgresGateTests.RejectionPath_…` failed with `23505 duplicate key value violates unique constraint "IX_UserSessions_TokenHash"`. Root cause: the fixture's `InitializePostgresDatabaseAsync` only runs `MigrateAsync()` + seeding and never cleans the shared test database, so **rows from previous runs persisted**. The isolated verification database `prepford_gateb_verification` was dropped and recreated (`scratch/reset_gateb_db.sql`), after which the class and then the entire suite passed.
   - *Deliverable note (test-harmony defect):* the integration suite is **not idempotent across runs without a fresh DB**. Recommend the fixture drop/create (or truncate) the schema per fixture initialization.
2. A leftover `Preform.Api` process (spawned by the interrupted earlier rerun) briefly held `bin\Debug\net8.0\Preform.Api.exe` during an intermediate rerun (build-only MSB3027 error; not a test failure). Process was terminated; subsequent clear runs succeeded.

### Full-run attributed evidence

- TRX artifacts: `artifacts/phase791-test-results/gitau_CS-ICT_2026-11-06_08_36_42_net8.0.trx` (final full run — green) and `…_08_29_15_net8.0.trx` (first run — 456/458).
- Compilation: one build warning cycle (CS8633 in `QuestionTypePostgresGateBTests.cs:296`; three nullable warnings in API code CS8604/CS8602/CS8601 during intermediate builds). No test modifications required for PASS.

### Gate G5/G6 correlation with Phase 7.9 claims

- Phase 7.9 claimed **458 backend** — the *number* matches (458 found), but **"all passing" only holds after the environmental DB reset.** The acceptance report's `426 unit + 32 integration = 458` arithmetic is not how xUnit aggregated them in the single run; the split is not reconstructible from a single susit runner (only a filtered subset of 20 was re-run separately). The claim's arithmetic remains unverifiable as stated.
- The regression re-execution confirms the suite *is* currently green on a clean authority DB. G5/G6 pass **as re-executed** (see Final Gate Matrix).

---

## 2. Frontend Suite (Vitest)

| Run | Command | Exit Code | Result |
| :--- | :--- | ---: | :--- |
| Cold run (no backend API running) | `npm run test` (workspace `@prepford/web`, i.e. `vitest run`) | **1** | **513 total, 497 passed, 16 failed; 8 test files failed** (~7 min 47 s) |
| Re-run of the 8 failing files **with the backend API live** (`dotnet run --no-build`, Development, listening on 0.0.0.0:4000, confirmed up-to-date migrations) | `npm run test -- tests/authentication-upgrade.test.tsx … tests/subscription-consistency-admin.test.tsx` | **1** | **11 of 16 still failing** across 6 files; 5 recovered |

**Claimed Phase 7.9 value: "513/513 passing across 63 suites" — NOT reproducible at HEAD in this environment.**

### Failure classification

**Could not be reproduced with a live backend (verified that 5 tests recovered → backend-dependent):** tests in `authentication-upgrade.test.tsx` (2) and `learner-analytics.test.tsx` (1).

**Persist after backend is live (11 total):**

| File | Failing tests | Failure signature |
| :--- | :--- | :--- |
| `tests/learner-security-settings.test.tsx` | 4 | `TestingLibraryElementError`: expected UI text ("2 Sessions", "Safari on iOS (iPhone)", "Password changed successfully") never rendered — UI/test drift or data-shape drift against the real backend |
| `tests/learner-dashboard-security-center.test.tsx` | 2 | Same waitFor timeouts around session termination & sign-out flows |
| `tests/checkout-security.test.ts` | 2 | `expected 503 to be 200` — BFF strict fail-closed path returning 503 while the backend route expressed success/404 in the dev authority database (suspected seed/data mismatch: plan slug or entitlement lookup failing for `rn-pro` / `prep-premium` — under review; **not a network outage** since API was listening) |
| `tests/profile-image-upload.test.tsx` | 1 | `expected 503 to be 200` on `/api/profile/image` (BFF fail-closed on a backend response not equal 403/400) |
| `tests/profile-security-remediation.test.ts` | 1 | `expected 503 to be 200` on authenticated profile PUT |
| `tests/subscription-consistency-admin.test.tsx` | 1 | `expected 503 to be 201` on admin plan create |

The 503-family share a single root cause signature: the BFF route (`apps/web/src/app/api/profile/route.ts`, checkout BFF, admin route) codifies "**In non-test environments, strictly fail closed on backend unavailability**" (`profile/route.ts:254–262`) — in these tests the backend fetch did not succeed **in the vitest-worker context** and therefore the route returns 503 (via `api-client.ts:314` catch-all on Abort/failed fetch, or via the explicit 503 branch). Even in the rerun with the API up, these 11 tests never recovered to 200/201.

**Interpretation:** these failures are environment-sensitive (they demand a live backend historically wired to a dev seed), and the persistent values in the vitest process are not environment-identical to the Phase 7.9 workspace. **Whether each of the 11 is a genuine regression vs environment-diction could not be fully isolated** in this cycle without further refactor of the test runners. Regardless, the suite as committed does not self-satisfy "passing" without an elaborate environment and details of the *final* dev seed; the claim "513/513 passing" is therefore **rejected as a release artifact** and G7 fails as evidenced.

No tests were modified or skipped to obtain these numbers. **Frontend "test counts" recorded: 513 total, 497 pass, 16 fail cold (8 failing files); 513 total, 11 fail with backend live.**

---

## 3. TypeScript / Build / Architecture Guards

| Check | Command | Exit Code | Result |
| :--- | :--- | ---: | :--- |
| TypeScript check | `npm run typecheck` (workspace web: `tsc --noEmit`) | **0** | 0 errors |
| Web lint | `npm run lint` (workspace web: `eslint`) | **1** | **3,299 problems: 348 errors** (react-hooks/set-state-in-effect ×many, react-hooks/purity, rules-of-hooks violation in `app/profile/page-client.tsx:380`, `no-explicit-any`, unescaped entities, prefer-const) + 2,951 warnings — **not clean** |
| Backend release build | `dotnet build apps/api/Preform.Api.csproj -c Release --nologo` | **0** | 0 errors, 3 nullable warnings (CS8601 in `ExamLifecycleService.cs:2594`; CS8633 in test logger), ~52 s |
| Web production build | `npm run build:web` (`next build`) | **1** | **FAILS**: compiles OK (44 s) then aborts prerendering `/_global-error` with `TypeError: Cannot read properties of null (reading 'useContext')` (digest 1285948714) after 5 retries; 0/139 pages generated |
| Web production build (clean cache) | `.next` removed, rebuilt | **1** | **same deterministic failure** — not a stale-cache issue |
| Architecture guard (no SQLite) | `npm run verify:no-sqlite` | **0** | 0 SQLite references across 472 files |
| Brand consistency guard | `npm run verify:brand` | **0** | pass (℠ acceptable-legacy exemptions documented in the check) |

**Gate G8 conclusion: FAIL. Typecheck is clean, but lint carries 348 errors and the production web build cannot complete — the claimed "0 TypeScript errors; 139/139 Next.js pages generated" is half-true (typecheck true; build false). The build failure reproduces on a clean cache.**

The `/_global-error` prerender failure is a **material release blocker** (the deployment procedure requires `npm run build:web` artifacts). Diagnosis for the fix owner: `/_global-error` prerenders with a React 19.3/Next 16.4.3 context lookup returning null — likely an import/literal structure in the (missing) custom error page or a Next-internal boundary; requires a dedicated fix cycle with `node_modules/next/dist/docs` guidance (per `apps/web/AGENTS.md`, this Next version deviates from common knowledge).

---

## 4. Migration Verification

| Check | Method | Result |
| :--- | :--- | :--- |
| Repo migration inventory | Count of `apps/api/Migrations/*/` dirs | **12** migration directories (0001–0012) |
| Applied history in dev authority (`prepford`) | Live SQL on `__EFMigrationsHistory` | **13 rows** — 12 GitHub-tracked migrations + 1 legacy `20261103054224_AddAttemptQuestionSetAndGradingState` (applied before renumbering; retained in DB) |
| Applied history in restored drill DB | Live SQL | **13 rows, identical set** |
| Pending model changes | Live `dotnet run` boot log: "No migrations were applied. The database is already up to date." | none pending |
| **Discrepancy** | Phase 7.9 documents cite "13 migrations, `20261028_0001_InitialIdentity` … `20261105_0013_AnalyticsAndReporting`" | The **names do not match** any applied migration; count (13) matches only via the legacy row |

The migration system itself is healthy (12 tracked + 1 legacy consistent across source/restored). The *documented* migration names are fabricated — see Provenance Audit.

---

## 5. Session / Reauthentication / Entitlement / Payment / Answer-Protection Focus Suites

All re-executed at HEAD within the full clean backend run; individually verifiable in the TRX artifact:

- `SessionSecurityEngineTests`, `SessionSecurityPolicyDatabaseTests`, `SessionAccountingLockoutTests`, `SessionSecurityPostgresGateTests` (20/20 fresh-DB), `ReauthRateLimiterObservationTests`, `ExamContinuityReauthTests`, `LearnerSecurityControllerTests`, `AdminSecurityControllerTests`, `Phase1SecurityTests` — **all green** (final run).
- `PilotGrantSecurityTests` (4/4 green), `Phase8SecurityHardeningTests` (reauth limiting + gateway HMAC session-user mismatch — green), `GradingSecurityTests` (client-supplied correctness ignored; missing-answer-key = explicit Ungraded — green).
- **Frontend session/reauth tests:** `session-integrity`, `bff-session-synchronization`, `bff-exam-reauth`, `in-exam-reauth-modal`, `bff-security-routes`, `bff-security-events-phase6` — **all PASSED** in the cold run (their siblings in security-settings/security-center files failed; see §2).

---

## 6. Skipped / Excluded Items

| Item | Status | Justification |
| :--- | :--- | :--- |
| Playwright E2E (`apps/web/test:e2e`) | NOT RUN | Requires full compose stack + browser binaries; not part of the Phase 7.9 claimed counts; tasking's minimum list does not include it. Not excluded to game counts — never claimed. |
| `npm run test:e2e` (root: dotnet integration filter) | COVERED by full backend run | Subsumed by the 458 run (all Postgres integration tests included; 20/20 confirmed in the filtered pass). |
| Lighthouse / load tests | NOT RUN | No harness exists in-repo (see Performance Evidence Review — classified, not claimed). |
| Docker/16-container parity re-test | NOT RUN | Docker unavailable in this environment; documented limitation, not skipped silently. |

---

## 7. Summary Numbers (exact, for the Gate Matrix)

| Suite | Claimed (Phase 7.9) | Verified now |
| :--- | :--- | :--- |
| Backend total | 458 passing | **458/458 passing** (after required isolated-DB reset; first attempt 456/458) |
| PostgreSQL integration subset | 32 passing | 20 tests ran under this filter on the fresh authority and passed (filter captured named integration classes; full run green) — **32-vs-20 arithmetic discrepancy noted** |
| Frontend | 513/513 | **497/513 cold — 16 failures; 11 still failing with backend live — claim NOT REPRODUCED** |
| TypeScript | 0 errors | 0 errors ✅ |
| Production build | 139/139 pages | **BUILD FAILS on /_global-error (deterministic)** ❌ |
| Lint | (not claimed in 7.9 as clean?) | 348 errors ❌ |
| Guards (SQLite/brand) | 0 violations | 0 violations ✅ / ✅ |
