# PrepFord Gate C — Attempt Question Membership Contract (C2)

**Date:** 2026-11-03
**Status:** Implemented and verified. Owner approval required before any further gate work.

## 1. Problem

Before this remediation there was zero enforcement that a submitted `QuestionId` belonged to the attempt's exam or to the set of questions assigned to that attempt. A candidate (or a compromised client) could answer arbitrary database questions on any attempt, which directly undermines test validity even with server-authoritative grading.

## 2. Design

### 2.1 Attempt question set snapshot

New entity `ExamAttemptQuestion` (`Models/Assessments.cs`, table `ExamAttemptQuestions`):

| Column | Type | Notes |
|---|---|---|
| `Id` | text (PK) | Generated with prefix `eaq_` by `AttemptQuestionService`. |
| `ExamAttemptId` | text (FK) | Indexed. |
| `QuestionId` | text (FK) | Indexed. |
| `DisplayOrder` | int | Order used when the set was recorded. |
| `AssignedAt` | timestamptz | When the question became part of the attempt. |

Constraints (PostgreSQL, created by migration `20261103054224_AddAttemptQuestionSetAndGradingState`):

- `PK_ExamAttemptQuestions` — unique `Id`.
- `IX_ExamAttemptQuestions_ExamAttemptId_QuestionId` — **unique** `(ExamAttemptId, QuestionId)`: a question can be recorded once per attempt.
- Indexes on `ExamAttemptId` and `QuestionId` for validation lookups.

The snapshot is the single authority for "which questions were actually assigned to this attempt."

### 2.2 Two-level membership rule

`IAttemptQuestionService.ValidateMembershipAsync(attempt, questionId)` accepts a response mutation only when **both** hold:

1. **Exam level** — the question is linked to the attempt's exam through `ExamQuestions`.
2. **Attempt level** — the attempt has snapshot rows, and each submitted question references a question in that exact set.

Fall-back for legacy in-flight attempts (created before Gate C and therefore without snapshot rows): exam-level membership is authoritative, and **the first verified submission locks the set** — `RecordQuestionMembershipAsync` records each verified question into the snapshot at submit/sync time, after which the exact attempt-set rule applies going forward.

### 2.3 When the set is recorded

- `StartAttempt` — the attempt's authorized question set is seeded from the exam's question list in `DisplayOrder` at attempt start. (Adaptive/CAT sub-selection is not implemented in this repository and remains out of scope; the full published list is the set.)
- `CreateSyncedAttemptAsync` (sync import of a new attempt) — the snapshot is recorded from the server-verified question plan after every submitted question has been verified.
- `SubmitResponse` / sync recovery — verified questions are recorded (covers legacy in-flight attempts and is idempotent for snapshot-backed ones; service only saves when changes exist).

## 3. Enforcement points

| Endpoint | Behavior on non-member question |
|---|---|
| `POST /api/v1/attempts/{id}/responses` | Membership validated **before** grading. Unknown/missing question in the database → **404**; database question that fails exam-level or attempt-level membership → **400**. Nothing is persisted. |
| `POST /api/v1/attempts/sync` (new attempt) | The **whole batch is rejected atomically** with **400** (`rejectedQuestions` listed, `unverifiableQuestionCount`) when any question is unknown or not part of the target exam. No attempt, no responses, no membership rows are written. |
| `POST /api/v1/attempts/sync` (existing in-progress attempt) | Each question is validated against the **exact attempt set** (with legacy exam-level fallback); rejected entries are returned in `rejectedQuestions` and skipped; valid entries are graded and persisted. |
| `POST /api/v1/attempts` (start) | Snapshot recorded at start time. |

## 4. Non-goals and fences

- Sync **never creates question records or stubs** from candidate input: untrusted stems, options, rationales and correct-answer indices in `SyncAttemptQuestionItem` are accepted for wire compatibility and ignored.
- Candidate input `IsCorrect`/`ScoreAwarded`/totals remain untrusted — see the ungraded grading state contract and remediation report.
- `PrepfordAuthHandler`, `SessionService`, and `RoleHierarchy` are untouched; ownership checks remain separate and mandatory before membership validation matters.

## 5. Verification

`Tests/AttemptMembershipSecurityTests.cs` — 11 tests covering: direct submission member acceptance, exam-level foreign question rejection (404/400 distinction), attempt-set foreign question rejection, legacy in-flight fallback with set lock-in after first verified submission, atomic sync batch rejection (foreign + valid in one batch → nothing persisted), question-stub creation impossibility, and idempotent membership recording. See `exam-management-gate-c-remediation-testing-report.md` for run evidence.
