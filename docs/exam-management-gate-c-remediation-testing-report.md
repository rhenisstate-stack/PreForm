# PrepFord Examination Management — Gate C Remediation Testing Report

**Date:** 2026-11-03
**Branch:** `feature/dotnet-backend-migration` (baseline `4674b14`)
**Status:** All suites green. Owner approval required before any further gate work.

## 1. Execution environment

- Backend: `dotnet test` on `apps/api/Tests/Preform.Api.Tests.csproj` (net8.0). NU1900 network-scan warnings only (NuGet vulnerability metadata unavailable); pre-existing CS8633 nullability warning in `QuestionTypePostgresGateBTests`. No new warnings.
- PostgreSQL: disposable loopback database `prepford_gateb_verification`, **dropped and recreated fresh** before the run. Env var `PREFORM_GATEB_TEST_CONNECTION_STRING=Host=127.0.0.1;Port=5432;Database=prepford_gateb_verification;Username=postgres;Password=postgres`. The one-off `prepford_gatec_migration_check` database was disposed. The shared/production `prepford` database was never contacted.
- Frontend: `npm run build` and `npm test -- --run` in `apps/web`.

## 2. Backend results

| Run | Filter | Result |
|---|---|---|
| Full suite incl. PostgreSQL | *(none)* | **208 passed, 0 failed, 0 skipped** (46 s) |
| Provider-independent subset | `FullyQualifiedName!~PostgresIntegrationTests` (without PG env) | 194 passed; 2 "failures" were **environment-only** — the 12 PostgreSQL-dependent tests require `PREFORM_GATEB_TEST_CONNECTION_STRING` (expected `InvalidOperationException` guard) — resolved by the full run above |
| New membership suite | `FullyQualifiedName~AttemptMembershipSecurityTests` | **11 passed, 0 failed** (11 s) |
| New candidate-data-contract suite (serialized HTTP) | `FullyQualifiedName~CandidateDataContractTests` | **4 passed, 0 failed** (12 s) |
| Grading security suite (incl. new C1 cases) | `FullyQualifiedName~GradingSecurityTests` | **15 passed, 0 failed** (20 s) |

All PostgreSQL-specific evidence (migration chain order, role seeding incl. `candidate`, `GradingState` default, unique membership index, Gate B catalogue stability) was observed directly in the disposable database afterward — recorded in `exam-management-gate-c-postgresql-verification-report.md`.

## 3. Test changes made (none weakened)

- `AttemptMembershipSecurityTests` and `CandidateDataContractTests` — new files (total 15 new tests).
- Grading security tests — replaced loose failures with explicit coverage of missing-key/empty-option ungraded behavior, 409 direct submission, out-of-range handling, blocking finalization, and retry-after-repair. `SeedExamQuestionAsync` made idempotent to support the new scenarios.
- Legacy sync test `ExamAttempts_SyncAssessmentAttempt_PersistsClientCompletedAttempt` — rewritten against the new sync contract where questions are seeded and linked to the exam; expectation corrected **to server-computed truth** (`100.0m`; both answers match the authoritative keys and membership rows are asserted). The old 80.0 expectation was a client-fabricated total, not a weakened assertion.

## 4. Frontend results (C6)

| Command | Result |
|---|---|
| `npm run build` | **Success.** Full static generation completes; no remaining TS7006 errors in `src/app/admin/subscriptions/page-client.tsx` (owner commits resolved the blocker; no fix was needed from this remediation) |
| `npm test -- --run` | **44 test files, 381 tests passed, 0 failed** |

## 5. Known residual items

- `PrepfordAuthHandler`/`SessionService`/`RoleHierarchy` untouched — authorization hardening is deferred (out of Gate C scope per charter).
- The legacy in-flight fallback (exam-level membership before first verified submission) is a bounded compatibility window; all new attempts are snapshot-backed from start.
- TimeSpentSeconds persists as `0` for sync-imported responses (client timing is not trusted recovery data); direct submissions preserve the client-provided value.

## 6. Conclusion

Gate C remediation test evidence is complete and green: 208 backend tests (including PostgreSQL integration), 381 frontend tests, production build passing. No P3 work was performed; work paused here pending owner approval.
