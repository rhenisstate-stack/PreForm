# PrepFord Examination Management — P3.1 Examination Code Specification

## Status
- Decision ID: D6 & D9
- Status: OWNER APPROVED
- Approved direction: sequential, pathway-scoped examination codes
- Approved code format: Option A — `RN-EX-000001` / `PN-EX-000001`
- Scope: Stable examination identity code allocation and immutability

## Repository evidence
The current `Exam` entity in `apps/api/Models/Assessments.cs` includes `Pathway` but no code field and no uniqueness constraint. The repository documents (`docs/exam-management-p3-owner-decisions.md`) propose `ExamCode` as unique per pathway. The owner has approved the exact code format and allocation rules.

## Approved product policy
1. **Format:** Pathway-prefixed, zero-padded 6-digit sequential codes:
   - Registered Nursing (RN): `RN-EX-000001`
   - Practical Nursing (PN): `PN-EX-000001`
2. **Independent sequences:** RN and PN maintain separate, independent numerical counters starting at 1.
3. **Allocation level:** Codes are assigned when a stable `Examination` identity is created, not when an individual revision is created.
4. **Lineage retention:** All revisions under one stable `Examination` family retain the exact same examination code.
5. **Permanence:** Codes are permanent and never reused or reassigned, even after archival or retirement.
6. **Transaction safety:** Code allocation must be atomic and concurrency-safe under concurrent requests.
7. **No partial creation:** A failed transaction must roll back cleanly and not leave an orphaned code or partially created examination.
8. **No historical fabrication:** Existing legacy examination records must not receive fabricated historical codes; existing records without codes will be addressed via explicit migration rules.

## Database schema & allocation architecture

### Storage location
- The `Code` field is stored on the stable `Examination` entity (`Examination.Code`, `varchar(16)` or `text`, not null).
- An explicit unique constraint and index is placed on `(Pathway, Code)` (or globally on `Code` as codes are globally unique given the pathway prefix).

### PostgreSQL allocation pattern
To achieve concurrency safety without fragile max-plus-one logic, the implementation will utilize dedicated PostgreSQL sequences per pathway or an atomic pathway counter table:

```sql
-- PostgreSQL sequences per pathway
CREATE SEQUENCE IF NOT EXISTS exam_code_rn_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS exam_code_pn_seq START WITH 1 INCREMENT BY 1;
```

In the allocation service:
1. Determine pathway (`RN` vs `PN`).
2. Fetch next sequence value within the active transaction:
   - For RN: `SELECT nextval('exam_code_rn_seq')` -> formatted as `$"RN-EX-{val:D6}"`
   - For PN: `SELECT nextval('exam_code_pn_seq')` -> formatted as `$"PN-EX-{val:D6}"`
3. If pathway is not RN or PN, reject transaction with validation error.
4. Insert `Examination` record with allocated `Code`.
5. Unique constraint on `Code` guarantees absolute collision immunity.

### Collision handling
If a duplicate code allocation occurs (e.g., in a failover or edge case):
- The database unique constraint aborts the transaction immediately.
- The service catches the constraint violation and returns a standard API 409 Conflict error.
- The collision event is logged with actor, timestamp, and attempted pathway.
- No partial record remains in the database.

## Historical records policy
- Legacy `Exam` records in the repository without codes will not be populated with fabricated codes.
- During migration, existing records may be assigned an explicit legacy indicator or migrated under a documented non-overlapping sequence after owner validation.

## Status summary
- Product policy: OWNER APPROVED (Option A)
- Allocation pattern: FULLY SPECIFIED (PostgreSQL sequence-backed)
- Database constraints: UNIQUE INDEX on `Code`
- Next gate: Implementation upon owner authorization
