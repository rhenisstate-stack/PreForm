# PREPFORD — EXAMINATION MANAGEMENT STUDIO
## Testing Report (Phase 1.1 — Audit Only)

**Prepared:** 2026-11-02  
**Status:** AUDIT COMPLETE — NO TESTS EXECUTED, NO IMPLEMENTATION PERFORMED  
**Scope:** Audit and documentation only. No tests were executed during this audit. No test "pass/fail" status is claimed.

---

## 🎯 PURPOSE

This report documents the test-evidence inventory gathered during the Phase 1.1 Examination Domain Audit. It identifies all existing examination-related tests (xUnit, Vitest, Playwright), describes what each verifies, notes missing coverage, and explicitly states that **no tests were executed** — so no pass/fail claims are made.

---

## 🧪 SECTION 1 — BACKEND xUnit TESTS (`apps/api/Tests/`)

### 1.1 Examination-related tests

| Test File | Test Name / Scenario | What It Verifies | Executed? | Pass/Fail Claim |
|---|---|---|---|---|
| `ExamAttemptsPersistenceTests.cs` | `ExamAttempts_StartAttempt_PersistsInProgressAttempt` | POST `/api/v1/attempts` persists an `InProgress` `ExamAttempt` with correct `UserId` in in-memory DB | **No** | Not claimed |
| `ExamAttemptsPersistenceTests.cs` | `ExamAttempts_SyncAssessmentAttempt_PersistsClientCompletedAttempt` | POST `/api/v1/attempts/sync` persists a completed attempt + `AttemptResponse` rows; creates question stubs when missing | **No** | Not claimed |
| `ExamAttemptsPersistenceTests.cs` | `ExamAttempts_CandidateCannotViewAnotherCandidatesAttempt_ReturnsForbidden403` | Cross-candidate GET `/api/v1/attempts/{id}` returns 403 Forbidden | **No** | Not claimed |
| `RoleResolutionTests.cs` | `GetEffectiveRole_SingleRoles_ResolvesCorrectly` (7 cases) | `RoleHierarchy.GetEffectiveRole` resolves each single role correctly | **No** | Not claimed |
| `RoleResolutionTests.cs` | `GetEffectiveRole_MultiRoleCombinations_ResolvesToHighestPriority` (13 cases) | Multi-role input resolves to highest-priority role per `PriorityOrder` | **No** | Not claimed |
| `RoleResolutionTests.cs` | `GetEffectiveRole_NullOrEmpty_ReturnsCandidate` | Null/empty/whitespace roles resolve to `candidate` default | **No** | Not claimed |
| `RoleResolutionTests.cs` | `GetEffectiveRole_CaseAndWhitespaceInsensitive_NormalizesCorrectly` (5 cases) | Role matching is case- and whitespace-insensitive | **No** | Not claimed |
| `RoleResolutionTests.cs` | `GetEffectiveRole_UserEntity_HandlesMultipleRolesAndMissingNavigation` | `User`-based resolution handles null `Role` navigation and multi-role `UserRole` collections | **No** | Not claimed |
| `RoleResolutionTests.cs` | `GetEffectiveRole_ClaimsPrincipal_ResolvesHighestRole` | `ClaimsPrincipal`-based resolution picks highest role | **No** | Not claimed |
| `RoleResolutionTests.cs` | `PrivilegeHelpers_IsAdminAndIsSuperAdmin_ClassifiesCorrectly` (6 cases) | `IsAdmin` / `IsSuperAdmin` classify roles correctly | **No** | Not claimed |
| `RoleResolutionTests.cs` | `SuperAdminPolicy_SatisfiedByMultiRoleSuperAdmin_RejectsCandidateAlone` | `[Authorize]` policies (`RequireSuperAdmin`, `RequireAdmin`, `RequireContentManager`, `RequireExamManager`) behave as configured for superadmin vs candidate principals | **No** | Not claimed |

**Note:** These tests exist in source but were **not executed** during this audit. All backend tests use in-memory databases (`UseInMemoryDatabase`) except `PostgresIntegrationTests`, which requires live PostgreSQL.

### 1.2 Non-exam backend tests (for context)

| Test File | Scope |
|---|---|
| `AppTests.cs` | Health controller, programmes controller, profile image service & controller, subscriptions controller, gateway HMAC & replay security, authoritative session management |
| `PostgresIntegrationTests.cs` | Postgres schema/migrations/seeding, referential integrity, unique constraints, transaction rollback, RBAC on admin subscriptions (requires live Postgres) |

None of these are examination-management tests.

### 1.3 Missing backend test coverage

- No tests for exam CRUD (create/read/update/delete exams)
- No tests for exam templates
- No tests for exam publishing/unpublishing
- No tests for exam archiving
- No tests for exam deletion
- No tests for exam duplication or versioning
- No tests for question→exam assignment
- No tests for question-type registration/seeding
- No tests for grading logic
- No tests for `RequireExamManager` policy applied to exam endpoints (policy exists but guards nothing)
- No tests for results review endpoints (no such endpoints exist)

---

## 🟦 SECTION 2 — FRONTEND VITEST TESTS (`apps/web/tests/`)

40+ test files exist. None are examination-management related. Representative inventory:

| Test File | Scope |
|---|---|
| `admin-shell.test.tsx` | Admin shell rendering/authorization display |
| `authentication-upgrade.test.tsx` | Auth flows |
| `rbac-access.spec.ts` (e2e) | RBAC access (Playwright, not vitest) |
| `subscription-consistency-admin.test.tsx` | Subscription admin consistency |
| `question-flagging.test.tsx` | Question flagging (study studio) |
| `study-studio.test.tsx` | Study studio flashcards |
| `security-regressions.test.tsx` | Security regression |
| `session-integrity.test.ts` | Session integrity |
| `assessment-integrity.test.ts` | Assessment integrity (study studio quiz, not exam) |
| `password-strength.test.tsx`, `contact-validation.test.ts`, `checkout-security.test.ts`, ... | Various non-exam areas |

### Missing frontend vitest coverage
- No exam library tests
- No exam builder tests
- No exam preview tests
- No question-type renderer tests
- No exam-management page tests

---

## 🎭 SECTION 3 — FRONTEND PLAYWRIGHT E2E TESTS (`apps/web/e2e/`)

| Spec File | Scope |
|---|---|
| `student-auth.spec.ts` | Student authentication |
| `profile-security.spec.ts` | Profile security |
| `subscription-catalog.spec.ts` | Subscription catalog |
| `checkout-entitlements.spec.ts` | Checkout/entitlements |
| `rbac-access.spec.ts` | RBAC access |
| `zz-diag.spec.ts` | Diagnostics |

None are examination-management related. No E2E coverage for exam library, builder, preview, or question-type rendering.

---

## ⚠️ SECTION 4 — TEST EXECUTION STATEMENT

**No tests were executed during this audit.** Therefore:

- No xUnit test is claimed to pass or fail.
- No Vitest test is claimed to pass or fail.
- No Playwright test is claimed to pass or fail.

To establish baseline test status, the following would need to be run (outside the scope of this audit):

```bash
# Backend xUnit (in-memory DB tests)
cd apps/api && dotnet test

# Frontend Vitest
cd apps/web && npx vitest run

# Frontend Playwright E2E (requires dev servers)
cd apps/web && npx playwright test
```

`PostgresIntegrationTests.cs` additionally requires a live PostgreSQL instance at the connection string in `PostgresTestFixture.ConnectionString`.

---

## 📁 FILES CHANGED

| File | Action |
|---|---|
| `docs/exam-management-testing-report.md` | Created — audit-only testing report |

No source code, test files, controllers, services, models, migrations, or frontend files were modified.

---

**STOP CONDITION:** Phase 1.1 audit and all associated reports are complete. Do not begin Phase 2 implementation until the audit has been reviewed and approved.

---

## Gate B Testing Update — Question-Type Foundation

The Phase 1.1 statements above are historical and remain unchanged. Gate B verification was run after adding registry, API, seeding, serialization, validation, and migration-metadata tests.

### Executed

| Command | Result |
|---|---|
| `dotnet test apps\api\Tests\Preform.Api.Tests.csproj --no-restore --filter "FullyQualifiedName!~PostgresIntegrationTests" "-p:BaseOutputPath=C:\Users\gitau\AppData\Local\Temp\PREformGateB\bin\"` | **172 passed, 0 failed, 0 skipped** |

The separate base output directory avoids overwriting binaries held by a running `Preform.Api` process. The build emitted NU1900 warnings because NuGet vulnerability metadata could not be fetched from `api.nuget.org`; test compilation and execution completed successfully.

The run covers the existing provider-independent regression suite and new tests for canonical registry keys, scoring/status accuracy, safe DTOs, active/inactive visibility, empty/partial/full catalogue seeding, ID and metadata preservation, duplicate detection, payload limits/schema checks, and EF migration/index metadata.

### Not executed

- `PostgresIntegrationTests` were excluded. The fixture has a hard-coded connection to the shared `prepford` database; no isolated/disposable database was configured. Although the local PostgreSQL port is reachable, tests were not run against a potentially shared database.
- Migration 0006 execution, Npgsql transaction behavior, PostgreSQL unique-index enforcement, and runtime reconciliation on PostgreSQL remain unverified.
- The previous Gate A report recorded 133 passing tests. That historical count is not a direct apples-to-apples comparison with the current 171-pass run because the current command excludes PostgreSQL tests and adds Gate B coverage.

**Required follow-up:** execute the migration and seeding integration tests using an explicitly disposable PostgreSQL database before considering Gate B fully verified.