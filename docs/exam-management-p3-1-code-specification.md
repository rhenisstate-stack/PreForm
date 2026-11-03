# PrepFord Examination Management — P3.1 Examination Code Specification

## Status
- Decision IDs: D6 & D9
- Stage: Architecture Review Remediation
- Status: SPECIFICATION REMEDIATED & COMPLETE
- Approved format: Option A — `RN-EX-000001` / `PN-EX-000001`

## Repository Evidence & Constraints
In `apps/api/Models/Assessments.cs`, `Exam` currently includes `Pathway` (`"rn"` or `"pn"`), but lacks a sequential examination code and database uniqueness constraints. The owner has approved sequential pathway-scoped codes formatted as `RN-EX-000001` and `PN-EX-000001`.

## Approved Policy Rules

1. **Format:** Pathway prefix (`RN-EX-` or `PN-EX-`) followed by a 6-digit zero-padded sequential integer:
   - Registered Nursing: `RN-EX-000001` through `RN-EX-999999`
   - Practical Nursing: `PN-EX-000001` through `PN-EX-999999`
2. **Pathway Independence:** RN and PN maintain separate, independent sequence counters.
3. **Allocation Scope:** Assigned strictly at creation of the stable `Examination` family entity, **not** per revision.
4. **Lineage Retention:** All revisions under the same `Examination` identity retain the exact same examination code.
5. **Permanence & Immutability:** Codes are permanent and never reused, reassigned, or modified, even after archival or retirement.
6. **No Historical Fabrication:** Existing legacy records must not receive fabricated historical codes.

## Database Sequence Mechanics & Schema

### 1. PostgreSQL Sequence Definitions
```sql
CREATE SEQUENCE IF NOT EXISTS exam_code_rn_seq 
    START WITH 1 
    INCREMENT BY 1 
    MINVALUE 1 
    MAXVALUE 999999 
    NO CYCLE;

CREATE SEQUENCE IF NOT EXISTS exam_code_pn_seq 
    START WITH 1 
    INCREMENT BY 1 
    MINVALUE 1 
    MAXVALUE 999999 
    NO CYCLE;
```

### 2. Sequence Characteristics & Invariants
- **Non-Transactional Allocation:** In PostgreSQL, calling `nextval()` advances the sequence immediately and is not rolled back if the enclosing transaction aborts.
- **Acceptance of Numerical Gaps:** Because sequence advancement is non-transactional, failed or cancelled transactions will produce numerical gaps (e.g., `RN-EX-000003` followed by `RN-EX-000005`). Per approved Decision 1 (D6 & D9), **numerical gaps are acceptable**; uniqueness and pathway isolation are the enforced guarantees.
- **Ceiling Protection:** The `MAXVALUE 999999 NO CYCLE` clause prevents silent wrapping. If the sequence reaches 999,999, any subsequent allocation throws an exception, preventing duplicate code reuse.
- **Uniqueness Enforcement:** An explicit unique index on `Examination.Code` (`CREATE UNIQUE INDEX "IX_Examinations_Code" ON public."Examinations" ("Code");`) provides absolute database-level collision protection.

### 3. Allocation Algorithm in `ExaminationCodeService`
```csharp
public async Task<string> AllocateCodeAsync(string pathway, CancellationToken cancellationToken)
{
    var normalizedPathway = pathway.Trim().ToLowerInvariant();
    var sequenceName = normalizedPathway switch
    {
        "rn" => "exam_code_rn_seq",
        "pn" => "exam_code_pn_seq",
        _ => throw new ArgumentException($"Unsupported examination pathway: {pathway}")
    };

    var prefix = normalizedPathway == "rn" ? "RN-EX-" : "PN-EX-";

    // Allocate nextval directly from PostgreSQL sequence
    var val = await _db.Database
        .SqlQueryRaw<long>($"SELECT nextval('{sequenceName}') AS \"Value\"")
        .SingleAsync(cancellationToken);

    if (val > 999999)
    {
        throw new InvalidOperationException($"Examination code sequence ceiling reached for pathway: {pathway}");
    }

    return $"{prefix}{val:D6}";
}
```

## Status Summary
- Format: `RN-EX-000001` / `PN-EX-000001`
- Allocation: POSTGRESQL SEQUENCE-BACKED (Non-transactional, gap-tolerant)
- Collision Immunity: DATABASE UNIQUE INDEX
- Next Gate: Implementation upon owner authorization
