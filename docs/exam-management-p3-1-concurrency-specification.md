# PrepFord Examination Management — P3.1 Concurrency Specification

## Status
- Decision ID: D5
- Status: OWNER APPROVED
- Approved direction: application-managed optimistic concurrency token
- Disallowed: SQL Server `rowversion` assumptions and new dependencies

## Repository evidence
The current backend is using ASP.NET Core 8 + EF Core with PostgreSQL/Npgsql. The current `Exam` entity has no concurrency token and no optimistic update checks. The owner-approved direction explicitly rejects SQL Server-style `RowVersion` semantics for PostgreSQL.

## Design goal
Prevent silent lost updates when multiple administrators edit the same Draft revision concurrently. The selected mechanism must be application-managed, database-compatible, and safe under PostgreSQL/Npgsql without introducing a new package or dependency.

## Recommended concurrency strategy
Use an application-managed optimistic concurrency token on the revision record, such as:
- `ConcurrencyToken` as a `long` integer or `Guid` value
- updated on every successful write to the revision
- checked in the update predicate when the revision is modified

### Recommended shape
- `ConcurrencyToken` (long) or `VersionStamp` (Guid) stored with the revision row
- When an authorized update is attempted, the API verifies that the supplied token matches the current revision token
- If the token mismatch occurs, the service returns a conflict response and no overwrite occurs

### Why this is safe
- It does not depend on SQL Server-specific `rowversion`
- It works cleanly with PostgreSQL and EF Core
- It is explicit in the service logic and easier to audit
- It avoids lost updates without hiding the conflict behind a silent overwrite

## Required behavior
When two administrators edit the same Draft revision:
1. the first valid update succeeds
2. the second update sees the stale token and fails with conflict
3. the second update does not overwrite the first
4. the API returns the project’s standard conflict response
5. audit history records both the successful update and the blocked stale update, when appropriate

## EF Core configuration recommendation
The implementation should configure the token as a regular scalar property rather than assuming a SQL Server timestamp semantics.

Recommended pattern (conceptually):
- add `ConcurrencyToken` scalar to the revision model
- initialize on create
- increment on each successful update or set a new token value
- include the expected token in the update predicate and in the update request

This is easier to audit than relying on database-generated rowversion semantics.

## API conflict response
When token mismatch occurs:
- return the appropriate conflict or stale-update response used by the project
- do not silently accept the stale payload
- ensure the client sees a clear stale revision error and the current revision values as needed

## Transaction interaction
- the token check must occur in the same transaction as the revision update
- the database should not allow a stale update to commit after the token check passes
- audit event creation should be part of the same unit-of-work if supported by the current transaction model

## Audit consistency
For a stale update rejection:
- record the blocked action, actor, revision ID, expected token, and current status in the audit log if the current infrastructure supports it
- do not create a misleading success audit entry for a rejected update

## Test cases required at implementation time
- two concurrent updates to same Draft revision
- stale write after an intervening valid update
- sequential update after a successful refresh
- no silent overwrite when a different actor modifies the same revision
- no audit-history corruption when an update conflicts

## Implementation constraints
- no new dependency installation
- no reliance on SQL Server `rowversion`
- no weakening of validation or silent retry loops that hide the conflict

## Remaining owner decisions
None on the product policy; the owner explicitly approved this strategy. The remaining technical detail is implementation structure, not product choice.

## Final recommendation
Implement a revision-level application-managed optimistic concurrency token and continue to enforce it at the service level. This is compatible with EF Core and PostgreSQL and preserves data integrity without requiring a new package or a SQL Server-specific mechanism.

## Status summary
- Owner policy: OWNER APPROVED
- Technical design: IMPLEMENTATION DETAIL REQUIRED
- Dependency status: no new dependency
- Next gate: OWNER REVIEW REQUIRED
