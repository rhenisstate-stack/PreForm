# PrepFord Gate C — Candidate Data Contract (C4)

**Date:** 2026-11-03
**Status:** Implemented and verified. Owner approval required before any further gate work.

## 1. Problem

The candidate-facing attempt detail endpoint needed guarantees that:

1. Raw EF entities are never serialized onto the wire (leaks internal fields such as `GradingState`, navigation properties, and runtime metadata).
2. Grading outcome data (`IsCorrect`, `ScoreAwarded`, and finalization-only aggregates) is disclosed **only after authoritative finalization** — never while the attempt is in progress, even as `null` noise in the payload.

## 2. Contract

### 2.1 Endpoints and DTOs

- `GET /api/v1/attempts` (list) → `AttemptSummaryDto` — identity, status, aggregate score of completed attempts, no per-response data.
- `GET /api/v1/attempts/{id}` (detail) → `CandidateAttemptDetailDto` / `CandidateAttemptResponseDto` — **read below**.
- Full EF entities (`ExamAttempt`, `AttemptResponse`, `Question`, `QuestionOption`) are never returned by any attempt endpoint.

### 2.2 Disclosure timing

| Field | In progress | After finalization |
|---|---|---|
| `scorePercent`, `passed`, `performanceTier`, `correctCount` | **Omitted from the JSON payload** (declared `[JsonIgnore(Condition = WhenWritingNull)]` and left `null`) | Serialized with server-computed authoritative values |
| `candidateAttempt.responses[].isCorrect`, `.scoreAwarded` | **Omitted from the JSON payload** | Serialized per response |
| `gradingIncomplete` | `bool` present (true when any response is `Ungraded`) | Present |
| `questionId`, `selectedOptionsJson`, `timeSpentSeconds`, `answeredAt` | Serialized always — the candidate's own answers, needed for offline/continuity recovery | Serialized always |

The omission (not merely `null`) is deliberate: the serialized response for an in-progress attempt must not contain the keys `isCorrect`, `scoreAwarded`, `scorePercent`, `passed`, or `correctCount` at all. This is asserted byte-level in tests against the raw HTTP body.

### 2.3 Never-disclosed data (any stage)

- Answer keys: correct option indices/keys, `CorrectAnswerIndices`, `Rationale`, `QuestionOption.IsCorrect`.
- Internal grading state enum values (`Graded`/`Ungraded`) and `GradingState` fields.
- EF runtime metadata (`$id`, `$type`) or navigation shapes (`ExamAttempt`, `AttemptResponse`).

Note on `POST {id}/responses`: the endpoint returns `{ isCorrect, scoreAwarded }` **after** each validated submission. This preserved behavior is teacher-feedback for the candidate's own already-graded answer and is distinct from answer-key disclosure; keys and rationale remain server-internal.

Note on sync: legacy client fields (`ScorePercent`, `PerformanceTier`, `IsCorrect`, etc.) are consumed for wire compatibility and are never reflected into persisted or returned authoritative values.

## 3. Implementation notes

- `Controllers/ExamAttemptsController.cs` maps the entities to DTOs explicitly; the DTO classes live with the controller and are the only serialized shapes.
- Conditional ignore is per-property attribute-based (`System.Text.Json.Serialization`), so it holds regardless of app-level JSON options; the response body formatter (`Formatters/StreamJsonOutputFormatter`) serializes camelCase, and the contract keys referenced in this doc are camelCase.
- Access is owner-checked (`attempt.UserId == caller.userId`) with the admin-role exception preserved; serialization never bypasses that check.

## 4. Verification

`Tests/CandidateDataContractTests.cs` — serialized HTTP contract tests over a real `WebApplicationFactory` pipeline:

1. In-progress attempt payload structurally omits all grading and finalization-only fields, and still exposes the candidate's own answers for recovery.
2. Payload never contains EF internal shapes (`Graded`/`Ungraded` enum names, `gradingState`, navigation names, `$id`/`$type`).
3. Payload never contains answer keys or rationales at any attempt stage.
4. Completed attempt discloses only server-computed authoritative grading values (`scorePercent`, `passed`, `correctCount`, per-response `isCorrect`/`scoreAwarded`).

Run evidence: see `exam-management-gate-c-remediation-testing-report.md`.
