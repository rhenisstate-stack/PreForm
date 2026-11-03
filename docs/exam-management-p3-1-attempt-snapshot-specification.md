# PrepFord Examination Management — P3.1 Attempt Snapshot Specification

## Status
- Decision ID: D3
- Status: OWNER APPROVED
- Approved direction: immutable server-generated attempt-level metadata snapshot at attempt start
- Related authority: `ExamAttemptQuestion` remains the exact question-membership authority

## Repository evidence
The current repository preserves the exact attempt-member set through `ExamAttemptQuestion`, as described in `apps/api/Models/Assessments.cs` and configured in `apps/api/Data/AppDbContext.cs`. There is no current attempt snapshot that captures the historical examination configuration used by the candidate. The existing `Exam` entity contains several candidate-relevant fields, but they are not versioned or frozen at attempt creation time.

## Core principle
The snapshot must preserve the examination configuration that was active when the candidate started the attempt. It is not a duplicate of the question-membership table and must not be treated as the same thing as `ExamAttemptQuestion`.

## Snapshot contract

### Recommended storage model
The safe default is an immutable relational snapshot table or equivalent serialized snapshot payload stored against each attempt, plus version metadata. The table should be created only when implementation begins, but the contract below is the approved design.

### Snapshot lifecycle
- created once, when the attempt begins
- immutable after creation
- server-generated only
- client-submitted values rejected or ignored
- kept even when the underlying revision is later archived or retired

## Proposed snapshot field set

| Field | Type | Source | Required | Candidate delivery impact | Result interpretation impact | Sensitive | Immutable |
|---|---|---|---|---|---|---|---|
| `AttemptId` | string | `ExamAttempt.Id` | Yes | No | No | No | Yes |
| `ExamRevisionId` | string | `Exam.Id` | Yes | No | Yes | No | Yes |
| `ExaminationId` | string | stable identity / parent | Yes | No | Yes | No | Yes |
| `Title` | string | `Exam.Title` | Yes | Yes | Yes | No | Yes |
| `Description` | string | `Exam.Description` | No | Yes | No | No | Yes |
| `Pathway` | string | `Exam.Pathway` | Yes | Yes | Yes | No | Yes |
| `ExamType` | enum or string | `Exam.ExamType` | Yes | Yes | Yes | No | Yes |
| `DurationMinutes` | int | `Exam.TimeLimitMinutes` | Yes | Yes | Yes | No | Yes |
| `PassingScorePercent` | decimal | `Exam.PassingScorePercent` | Yes | No | Yes | No | Yes |
| `ScoringConfiguration` | JSON or string reference | `Exam` configuration if later introduced | Conditional | No | Yes | No | Yes |
| `Instructions` | string | `Exam` candidate-facing instructions if present | No | Yes | No | No | Yes |
| `Category` | string | `Exam` category if later introduced | No | Yes | No | No | Yes |
| `Level` | string | `Exam` level if later introduced | No | Yes | No | No | Yes |
| `SnapshotVersion` | int | implementation-defined | Yes | No | No | No | Yes |
| `CreatedAt` | datetime | server time | Yes | No | No | No | Yes |

## Required evidence-based interpretation
The snapshot should include only the metadata that is both:
- necessary to interpret a historical attempt, and
- already present or clearly justified by the current domain model

This means the initial snapshot should not include speculative fields invented for a future question-builder or exam-library feature.

## Proposed snapshot creation timing
The snapshot must be created at the start of a candidate attempt, immediately after the attempt is created and before candidate interactions are accepted as authoritative for grading or completion.

Recommended transactional boundaries:
- create attempt row
- create exact membership records if required
- create metadata snapshot in same transaction if the database and service architecture support it
- if the full transaction is not possible, ensure snapshot creation occurs before the attempt is considered active for candidate work

## Serialization strategy
Two implementation options are valid if approved during implementation:

1. relational snapshot table (preferred if the data is mostly flat metadata)
2. JSON payload stored in a dedicated column, with a `SnapshotVersion` field for evolution

Recommended preference for this repository:
- relational table for clarity and integrity, unless the future exam metadata becomes highly nested
- include `SnapshotVersion` precisely to protect future compatibility

## Immutability enforcement
- do not allow updates after creation
- do not expose a write path that accepts user-supplied snapshot payloads
- use server-side generation only
- enforce immutability at the application and database layers if available

## Interaction with `ExamAttemptQuestion`
`ExamAttemptQuestion` must remain the exact authoritative source for:
- which questions are in the attempt
- order of question membership
- answer eligibility and validation

The metadata snapshot is complementary. It does not replace or duplicate membership logic.

## Historical attempts without snapshots
For existing attempts created before the snapshot pipeline exists:
- preserve the current behavior
- do not fabricate missing metadata
- do not guess an original title or passing score when the repository lacks a reliable source
- document any fallback as conservative and limited to current known data

## Candidate API exposure
The snapshot should not be submitted or accepted as an input payload from the candidate client. It is a server-side historical record. Candidate-facing APIs may expose a read-only summary of the metadata where it is already authorized, but the snapshot itself must remain server-controlled.

## Required safeguards
- no client override of snapshot values
- no snapshot edits after creation
- no snapshot creation for existing historical attempts without explicit data recovery policy
- no re-creation of the snapshot when an attempt already exists

## Remaining owner decisions
The following product decisions remain open and must be approved before implementation:
- whether to store the snapshot relationally or as a JSON payload
- whether the snapshot should include category, level, and instructions immediately or only after they are implemented in the actual Exam model
- whether archived or retired revisions keep their snapshot data in the same table or require a historical archive table

## Final recommendation
The approved architecture is sound: create a server-generated immutable metadata snapshot at attempt start, and keep `ExamAttemptQuestion` as the exact question-membership authority. This preserves historical result interpretation without conflating membership and configuration metadata.

## Status summary
- Product policy: OWNER APPROVED
- Implementation detail: REQUIRED before code changes
- Historicalfallback: REQUIRED for legacy attempts
- Next gate: OWNER REVIEW REQUIRED
