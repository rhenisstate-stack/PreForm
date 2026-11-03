# PrepFord Gate C — Ungraded Grading State Contract (C1)

**Date:** 2026-11-03
**Status:** Implemented and verified. Owner approval required before any further gate work.

## 1. Problem

Before this remediation, a question whose answer key was missing or invalid (e.g., empty option list, deleted correct option) was silently persisted as `IsCorrect = false, ScoreAwarded = 0`. The candidate was penalized for a defect in server-owned grading data. The charter requires an **explicit ungraded state** that is distinct from "answered incorrectly."

## 2. Decision (charter Option B)

An explicit persistence-level grading state is introduced and enforced everywhere a response's grading data is read or written.

- New enum `ResponseGradingState` (`Models/Assessments.cs`), deliberately assigned non-default values so that ungraded can never be the implicit zero:
  - `Graded = 1` — `IsCorrect`/`ScoreAwarded` are server-derived and authoritative.
  - `Ungraded = 2` — authoritative grading data was unavailable; the stored `IsCorrect`/`ScoreAwarded` carry **no meaning** and must never be interpreted as a grade.
- `AttemptResponse.GradingState` is persisted (`GradingState integer NOT NULL DEFAULT 1` in PostgreSQL; default `1` keeps every pre-Gate-C legacy row **Graded** — no historical semantics change).
- Grading-model support: `GradingResult` gained an `Ungraded` property and a `UngradedResult(string)` factory. Graders now return an ungraded result when a question has an empty option list or no correct option key, instead of fabricating an incorrect grade.

## 3. Semantics of the ungraded state

| Concern | Rule |
|---|---|
| Candidate answer data | Sync (recovery) **persists** the candidate's submitted answer with `GradingState = Ungraded` so nothing is lost; direct submission rejects the response and **persists nothing**. |
| Score denominators | `Ungraded` responses are **excluded** from every score calculation. The completed score is `graded correct / graded total`, never normalized as if the ungraded question were worth zero. |
| Authoritative finalization | **Blocked** while any response in the attempt is `Ungraded`:
| Direct submission (`POST {id}/responses`) | Returns **409 Conflict** with `ungradable = true`; no response row is written. |
| Finalization (`POST {id}/submit`) | Returns **409 Conflict** with `gradingIncomplete` and `ungradedResponseCount`; the attempt stays `InProgress` and no score/pass flags are computed. |
| Sync import (new attempt) | Response rows are persisted as `Ungraded`; the attempt remains `InProgress` with no `scorePercent`/`passed` discloses; sync response carries `gradingIncomplete = true`. |
| Sync import (existing in-progress attempt) | Ungraded answers are appended (idempotent — an existing ungraded row is not duplicated); finalization is deferred. |
| Repair / retry | Once the authoritative key exists again, a retry grades normally: direct submission yields `Graded` on the (new or existing) response; sync recovery upgrades an existing ungraded response to `Graded`; the attempt can then finalize. |
| Out-of-range option index | This is an **invalid payload** (400), not a missing key: the validation service checks for an empty option list first (→ `Ungraded`), and only then validates selected indices against the authoritative option count (→ invalid). No row is written for an out-of-range submission. |

## 4. Enforcement points (all reuse the trusted grading path)

- `Services/Grading/GradingModels.cs` — `Ungraded` property, `UngradedResult` factory.
- Grader implementations — empty options / missing correct option key produce `GradingResult.Ungraded`.
- `Services/ResponseValidationService.cs` — classification order: malformed question/type (invalid) → empty authoritative options or no correct option (`Ungraded`) → out-of-range selection (invalid) → authoritative grade.
- `Controllers/ExamAttemptsController.cs`:
  - `SubmitResponse` — 409 `ungradable` rejection on `validation.Ungraded`; alternates 400/404 for ordinary validation failures.
  - `SubmitAndCompleteAttempt` — 409 finalization block when `ungradedResponses > 0`; score denominators count only `Graded` rows.
  - `CreateSyncedAttemptAsync` — persists ungraded rows, defers finalization, returns `gradingIncomplete` payload.
  - `SyncIntoInProgressAttemptAsync` — same contract on the recovery path, with authoritative totals always recalculated from persisted state.
- `GET {id}` detail (`CandidateAttemptDetailDto`) — `gradingIncomplete` flag surfaces the state to the candidate without disclosing grading data (see the candidate data contract doc).

## 5. Why not other options considered

- **Silently incorrect (old behavior)** penalizes candidates for server data defects and corrupts score statistics — rejected by the charter.
- **Blocking persistence of the answer entirely** (for sync) would discard recovery data. Direct submission does reject and persist nothing; sync's recovery role justifies persisting the answer with the explicit ungraded marker.

## 6. Verification

Tests in `Tests/GradingSecurityTests.cs` and `Tests/AttemptMembershipSecurityTests.cs` cover: missing answer key, empty option list, out-of-range payload handling, direct-submission 409, sync ungraded persistence with finalization deferred (409 on `submit`), and retry-after-repair. See `exam-management-gate-c-remediation-testing-report.md` for run evidence.
