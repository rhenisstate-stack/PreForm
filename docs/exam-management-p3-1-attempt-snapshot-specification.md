# PrepFord Examination Management — P3.1 Attempt Snapshot Specification

## Status
- Decision IDs: D3, D15
- Status: OWNER APPROVED
- Approved storage model: Option A — Versioned JSONB metadata snapshot on `ExamAttempt` + relational `ExamAttemptQuestion` membership
- Authority boundaries:
  - `ExamAttempt.MetadataSnapshot` (JSONB): Authoritative for examination-level configuration at attempt start
  - `ExamAttemptQuestion` (Relational): Authoritative for exact question membership, order, and response linkage

## Repository evidence
In `apps/api/Models/Assessments.cs`, `ExamAttempt` represents a candidate's attempt at an exam. Gate C established `ExamAttemptQuestion` as the authoritative relational table for question membership, randomized order, and server-authoritative grading isolation. Currently, `ExamAttempt` has no frozen examination configuration metadata.

## Approved snapshot architecture

### Storage format
The metadata snapshot is stored directly on `ExamAttempt` as a PostgreSQL `JSONB` column named `MetadataSnapshot` (mapped in EF Core as a strongly typed owned/value entity or serialized document).

### Relational membership preservation
- `ExamAttemptQuestion` remains completely intact and continues to serve as the relational source of truth for:
  - Exact question IDs assigned to the candidate
  - Assigned sequence order
  - Question response binding (`AttemptResponse`)
  - Server-authoritative grading scores
- The JSONB snapshot **does not duplicate question text or replace `ExamAttemptQuestion`**.

### Snapshot lifecycle & immutability
1. **Creation timing:** Created atomically in the same database transaction that initializes the `ExamAttempt` row.
2. **Server-authoritative:** Generated entirely by backend services from the authoritative `Exam` revision and `Examination` records. Client-provided snapshot payloads are strictly rejected.
3. **Immutable:** Once written, `MetadataSnapshot` is read-only. No API endpoint or background job modifies historical attempt snapshots.

## JSONB Snapshot Schema (Version 1)

```json
{
  "schemaVersion": 1,
  "snapshotCreatedAtUtc": "2026-11-03T10:00:00Z",
  "examination": {
    "id": "0192e210-aaaa-7000-8000-000000000001",
    "code": "RN-EX-000001",
    "pathway": "RN"
  },
  "revision": {
    "id": "0192e210-bbbb-7000-8000-000000000001",
    "revisionNumber": 1,
    "title": "Comprehensive Nursing Licensure Exam - Core Practice",
    "description": "Standard preparatory practice exam for RN candidates.",
    "examType": "Practice",
    "timeLimitMinutes": 150,
    "passingScorePercent": 75.0,
    "publishedAtUtc": "2026-11-01T08:00:00Z"
  },
  "deliverySettings": {
    "shuffleQuestions": true,
    "allowReview": true,
    "showFeedbackImmediately": false
  }
}
```

## Schema evolution & versioning
- The snapshot schema includes a top-level `schemaVersion` integer property (currently `1`).
- When future examination settings are added, `schemaVersion` will be incremented.
- The snapshot deserializer supports version-tolerant polymorphic mapping.

## Legacy attempt compatibility (Fallback path)
- Existing historical `ExamAttempt` records in the database lack a `MetadataSnapshot` (the column will be `NULL`).
- **Strict rule:** The system will **never fabricate snapshots** for historical attempts.
- When an API or report queries an attempt where `MetadataSnapshot IS NULL`:
  - The service executes a documented fallback reader: it reads the associated `Exam` revision row dynamically.
  - The API response explicitly marks `snapshotSource = "legacy_fallback"`.
  - No retroactive write to `MetadataSnapshot` is performed during reads.

## Status summary
- Product policy: OWNER APPROVED (Option A)
- Entity representation: JSONB column on `ExamAttempt` (`MetadataSnapshot`)
- Relational membership: `ExamAttemptQuestion` preserved
- Legacy handling: Explicit documented fallback without fabrication
- Next gate: Implementation upon owner authorization
