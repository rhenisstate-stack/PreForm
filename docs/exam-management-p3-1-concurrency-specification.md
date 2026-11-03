# PrepFord Examination Management — P3.1 Concurrency Specification

## Status
- Decision ID: D5
- Stage: Architecture Review Remediation
- Status: SPECIFICATION REMEDIATED & COMPLETE
- Approved direction: Application-managed optimistic concurrency token on revision rows

## Repository Evidence & EF Core Integration
The PrepFord API uses ASP.NET Core 8 and EF Core 8.0.10 with Npgsql. Standard optimistic concurrency is achieved by designating a scalar property as a concurrency token using EF Core's fluent API (`.IsConcurrencyToken()`). This eliminates reliance on SQL Server-specific `rowversion` or raw SQL updates while integrating cleanly with EF Core change tracking and transaction pipelines.

## Concurrency Token Model

### 1. Entity Property Definition
On the `Exam` entity (`apps/api/Models/Assessments.cs`):
```csharp
[ConcurrencyCheck]
public long ConcurrencyToken { get; set; } = 1;
```

### 2. EF Core Model Configuration (`AppDbContext.cs`)
```csharp
modelBuilder.Entity<Exam>(entity =>
{
    entity.Property(e => e.ConcurrencyToken).IsConcurrencyToken();
});
```

### 3. Update Behavior & Token Increment
- When an authorized administrator updates a revision:
  1. The client sends the `expectedConcurrencyToken` in the request payload or header.
  2. The service loads the entity and verifies that `revision.ConcurrencyToken == request.ExpectedConcurrencyToken`.
  3. If matched, the service applies modifications and increments the token:
     ```csharp
     revision.ConcurrencyToken++;
     ```
  4. During `SaveChangesAsync()`, EF Core generates an update statement that checks the original concurrency token value in the `WHERE` clause:
     ```sql
     UPDATE public."Exams"
     SET "Title" = @p0, "ConcurrencyToken" = @p1, "UpdatedAt" = @p2
     WHERE "Id" = @p3 AND "ConcurrencyToken" = @p4;
     ```
  5. If rows affected is `0` (because a concurrent update modified the row), EF Core throws `DbUpdateConcurrencyException`.

## Operations Covered by Concurrency Enforcement

Optimistic concurrency is strictly enforced across all revision mutation and lifecycle paths:
1. **Draft Content Updates:** Modifying `Title`, `Description`, `TimeLimitMinutes`, or `PassingScorePercent`.
2. **Question Set Mutations:** Adding, removing, or reordering questions within `ExamQuestions`.
3. **Lifecycle State Transitions:**
   - `SubmitForReview` (`Draft -> InReview`)
   - `ReturnForChanges` (`InReview -> Draft`)
   - `Approve` (`InReview -> Approved`)
   - `Publish` (`Approved -> Published`)
   - `Archive` (`Published -> Archived`)
   - `Restore` (`Archived -> Published`)
   - `Retire` (`Archived -> Retired`)

## Conflict Response & Audit Persistence

### HTTP 409 Conflict Response Envelope
When `DbUpdateConcurrencyException` occurs:
```json
{
  "error": "ConcurrencyConflict",
  "message": "The examination revision was modified by another administrator. Please refresh your view and retry.",
  "revisionId": "exam_rev_001",
  "currentConcurrencyToken": 3
}
```

### Audit Trail Logging
Upon encountering a concurrency conflict:
- An entry is recorded in `AuditLogs`:
  - `Action`: `"ExamRevisionUpdateConflict"`
  - `EntityType`: `"Exam"`
  - `EntityId`: `revision.Id`
  - `Outcome`: `"Conflict"`
  - `Description`: Serialized metadata detailing the attempted update, expected token, and actor ID.

## Status Summary
- Concurrency Mechanism: EF CORE `.IsConcurrencyToken()` (Standard, provider-agnostic)
- Coverage: ALL MUTATION & LIFECYCLE PATHS
- HTTP Status: 409 CONFLICT
- Next Gate: Implementation upon owner authorization
