# PrepFord Examination Management — Gate C Remediation Report

**Date:** 2026-11-03
**Branch:** `feature/dotnet-backend-migration` (baseline `4674b14`)
**Status:** C1–C6 complete and verified. **Stopped before P3 per charter — owner approval required before any further gate.**

## 1. Scope

Remediate the blockers enumerated in `exam-management-gate-c-verification-report.md`, under the charter decisions:

- Preserve the verified grading security core: server-authoritative `IResponseValidationService.ValidateAndGradeAsync`, ownership checks, finalization recalculation.
- Never trust client-supplied `IsCorrect`/`ScoreAwarded`/totals.
- No authorization changes (`PrepfordAuthHandler`, `SessionService`, `RoleHierarchy` untouched).
- No test weakening: the legacy "80.0" sync expectation was corrected **to server-computed truth**, not relaxed.

## 2. Decisions (as executed)

### C1 — Explicit ungraded handling (Option B)

New persisted `ResponseGradingState` (`Graded = 1`, `Ungraded = 2`) on `AttemptResponse`; default `1` keeps all legacy rows graded. Missing/invalid answer key produces an explicit ungraded state: sync persists the candidate answer ungraded; direct submission rejects with 409 and persists nothing; ungraded responses are excluded from score denominators and block authoritative finalization. Full contract: `exam-management-gate-c-ungraded-grading-state-contract.md`.

### C2 — Attempt question set snapshot

New additive `ExamAttemptQuestion` snapshot entity with a **unique `(ExamAttemptId, QuestionId)` index**; two-level membership (exam-level + exact attempt set) enforced on all response mutations including sync. Attempt start seeds the set from the exam's question list in display order (CAT sub-selection out of scope — no selection logic exists). Legacy in-flight attempts fall back to exam-level membership with set lock-in on the first verified submission. Full contract: `exam-management-gate-c-attempt-question-membership-contract.md`.

### C3 — Secure legacy sync

Sync restructured around server-verified membership and the trusted grading path:

- Unknown or exam-foreign questions in a batch → the whole batch rejected atomically (400); **no question stubs can ever be created** from candidate input.
- Valid batch: attempt created `InProgress`, responses graded via `ValidateAndGradeAsync`, completed only when zero ungraded responses exist.
- Completed attempts can never be modified by sync — idempotent `"Attempt already persisted."` response (200 + no changes).
- In-progress (recovery) sync validates each question against the exact attempt set, upgrades persisted responses server-side, and recalculates authoritative totals from persisted state only.
- Client `ScorePercent`/`PerformanceTier`/`IsCorrect`/`ScoreAwarded` fields are consumed for wire compatibility and ignored.
- Regression fix per charter: the legacy sync test now expects the server-computed **100.0m** (both answers match authoritative keys), not the client fiction of 80.0.

### C4 — Candidate DTO protection

`GET /api/v1/attempts/{id}` now returns `CandidateAttemptDetailDto`/`CandidateAttemptResponseDto` instead of EF entities. While in progress, `isCorrect`, `scoreAwarded`, `scorePercent`, `passed` and `correctCount` are structurally omitted from the JSON payload (`[JsonIgnore(Condition = WhenWritingNull)]`); they disclose only after authoritative finalization, with server-computed values. At no stage does the payload contain answer keys, correct option identifiers, rationales, or grading-state internals. Full contract: `exam-management-gate-c-candidate-data-contract.md`.

### C5 — PostgreSQL verification

Full suite executed against a freshly recreated disposable `prepford_gateb_verification`: all 7 migrations applied in order, roles seeded idempotently (14 roles incl. `candidate`), `GradingState` default 1, unique membership index present. Evidence: `exam-management-gate-c-postgresql-verification-report.md`.

### C6 — Frontend build blocker

Initially failing (`page-client.tsx` TS7006 implicit-any at lines 177/275). Owner commits landed during the session; recheck shows `npm run build` now passes with no remaining TS errors. No isolated fix was needed — nothing was changed in `apps/web`.

## 3. Files changed

### Application code

| File | Change |
|---|---|
| `apps/api/Models/Assessments.cs` | `ResponseGradingState` enum; `AttemptResponse.GradingState`; `ExamAttemptQuestion` entity. |
| `apps/api/Data/AppDbContext.cs` | `ExamAttemptQuestions` set, unique index configuration. |
| `apps/api/Migrations/0006_AddQuestionTypeCapabilityAndStatus/20261103054224_AddAttemptQuestionSetAndGradingState.cs` | Rewritten as a proper **additive** migration (owner's committed version recreated the whole schema); verified against a fresh database. |
| `apps/api/Migrations/0001_CreateProgrammes/AppDbContextModelSnapshot.cs` | Matches the model (GradingState + ExamAttemptQuestion). |
| `apps/api/Services/ResponseValidationService.cs` | Ungraded classification (empty options/missing key → Ungraded, before range check); out-of-range option index → invalid payload. |
| `apps/api/Services/Grading/GradingModels.cs` | `GradingResult.Ungraded` property and `UngradedResult` factory; grader semantics for missing grading data. |
| `apps/api/Services/AttemptQuestionService.cs` | **New.** `IAttemptQuestionService` — `ValidateMembershipAsync` (two-level rule + legacy fallback), `RecordQuestionMembershipAsync` (idempotent, `eaq_` ids, saves only when nothing recorded). |
| `apps/api/Controllers/ExamAttemptsController.cs` | Membership checks (404/400), 409 ungradable direct submission, 409 finalization block on ungraded, sync split into `CreateSyncedAttemptAsync` + `SyncIntoInProgressAttemptAsync`, DTO-based `GetAttemptById` with conditional JSON ignore, attempt-set recording at start/submit/sync. |
| `apps/api/Program.cs` | DI registration for `IAttemptQuestionService`. |

### Tests

| File | Change |
|---|---|
| `apps/api/Tests/GradingSecurityTests.cs` | C1 tests (missing key, empty options, 409 direct, out-of-range, sync ungraded + blocked finalization, retry-after-repair, mixed); `SeedExamQuestionAsync` made idempotent per exam. |
| `apps/api/Tests/AttemptMembershipSecurityTests.cs` | **New**, 11 tests over membership direct + sync paths. |
| `apps/api/Tests/CandidateDataContractTests.cs` | **New**, 4 serialized HTTP contract tests (C4). |
| `apps/api/Tests/AppTests.cs` | Legacy sync test rewritten to seeded exam linkage, membership assertions and server-computed **100.0**; controller constructor updated for the new service. |

### Documentation

New: this report, the Stage 0 audit, C1/C2/C4 contract docs, the PostgreSQL verification report, and `exam-management-gate-c-remediation-testing-report.md`.
Updated: `exam-management-implementation-report.md`, `exam-management-testing-report.md`, `exam-management-upgrade-plan.md`.

## 4. Acceptance matrix

| # | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| 1 | Missing answer key never silently graded incorrect; explicit ungraded state persisted | ✅ | `ResponseGradingState`/`GradingState DEFAULT 1`; grader + validation service; `GradingSecurityTests` C1 cases |
| 2 | Direct submission of ungradable question → 409, persists nothing | ✅ | `GradingSecurityTests` 409 test |
| 3 | Ungraded responses excluded from score denominators | ✅ | Score math counts only `Graded` rows (`SubmitAndCompleteAttempt`, sync, DTO) |
| 4 | Authoritative finalization blocked while ungraded (409) | ✅ | `SubmitAndCompleteAttempt`; C1 tests; PG verification of bare contract |
| 5 | Exact attempt-question membership enforced on direct submission | ✅ | `AttemptQuestionService` + controller gate; `AttemptMembershipSecurityTests` |
| 6 | Sync never creates question records/stubs; foreign questions reject batch atomically | ✅ | `CreateSyncedAttemptAsync`; stub-impossible + atomic-rejection tests |
| 7 | Sync must not modify completed attempts; idempotent | ✅ | `"Attempt already persisted."` path; tests |
| 8 | Sync regrades through the trusted path; completions recalculated server-side | ✅ | Sync split methods; rewritten sync test (100.0) |
| 9 | Legacy in-flight attempts recover (recovery sync into `SyncIntoInProgressAttemptAsync`) with set lock-in | ✅ | `AttemptMembershipSecurityTests` legacy fallback tests |
| 10 | No EF-serialized or grading data on candidate endpoints before finalization | ✅ | DTO + `[JsonIgnore(WhenWritingNull)]`; `CandidateDataContractTests` (byte-level) |
| 11 | Answer keys/rationales never serialized to candidates | ✅ | `CandidateDataContractTests` any-stage payloads |
| 12 | Test hardening preserved (80.0 → server truth, no test weakening) | ✅ | Rewritten `ExamAttempts_SyncAssessmentAttempt_PersistsClientCompletedAttempt` |
| 13 | Authorization files untouched | ✅ | No diffs in `PrepfordAuthHandler`/`SessionService`/`RoleHierarchy` |
| 14 | Disposable PostgreSQL: migration chain + seeding + schema verified; shared DB untouched | ✅ | `exam-management-gate-c-postgresql-verification-report.md` |
| 15 | Full backend regression green | ✅ | **208 passed / 0 failed** incl. PG tests (see testing report) |
| 16 | Frontend build + tests | ✅ | `npm run build` passes (owner fix); test run in testing report |
| 17 | Documentation deliverables | ✅ | This and sibling docs |
| 18 | Stop before P3 | ✅ | No P3 work started |

## 5. Out of scope / deferred

- Adaptive (CAT) sub-selection of the attempt question set — no such selection logic exists in the repo.
- P3 work of any kind (per charter; explicit owner approval required).
- Any alternative grader/authoring expansion beyond fixing ungraded semantics.
