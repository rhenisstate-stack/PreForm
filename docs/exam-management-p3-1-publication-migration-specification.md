# PrepFord Examination Management — P3.1 Publication Migration Specification

## Status
- Decision ID: D7
- Stage: Architecture Review Remediation
- Status: SPECIFICATION REMEDIATED & COMPLETE
- Approved direction: Lifecycle state is the single source of truth; `IsPublished` is derived compatibility only

## Repository Evidence & Compatibility Rule
In `apps/api/Models/Assessments.cs`, `Exam` currently uses a boolean `IsPublished` property. To support existing frontend and candidate read paths during migration, `IsPublished` is preserved as a derived compatibility property synchronized directly from `LifecycleState == ExamLifecycleState.Published`. Direct writes to `IsPublished` by application logic outside the lifecycle transition pipeline are strictly prohibited.

## Non-Destructive Database Inventory Protocol

Before applying migrations or data backfills in staging or production, execute the following read-only inventory query:
```sql
SELECT 
    e."Id", 
    e."Title", 
    e."Pathway", 
    e."ExamType", 
    e."IsPublished", 
    e."CreatedAt", 
    e."UpdatedAt",
    (SELECT COUNT(*) FROM public."ExamAttempts" a WHERE a."ExamId" = e."Id") AS "AttemptCount",
    (SELECT COUNT(*) FROM public."ExamQuestions" q WHERE q."ExamId" = e."Id") AS "QuestionCount"
FROM public."Exams" e
ORDER BY e."Pathway", e."CreatedAt";
```

### Classification Taxonomy for Existing Records

| Class | Classification Criteria | Migration Action | Safeguard & Decision Status |
|---|---|---|---|
| **Class A** | **Safely Mappable:** Single published exam per pathway with active/completed attempts (e.g. `exam_rn_adaptive_cat`). | Allocate parent `Examination` family with sequential code; set `RevisionNumber = 1`; set `LifecycleState = Published`; sync `IsPublished = true`. | Preserves candidate attempt history without fabricating reviewer or approver metadata. |
| **Class B** | **Requires Owner Decision:** Multiple published exams for the same pathway, OR unpublished exams (`IsPublished = false`) that have candidate attempts. | Flag record for owner review. Do not automatically classify as Draft or Published. | Prevents exposing unapproved content or archiving active student exam families without product direction. |
| **Class C** | **Insufficient Evidence:** Incomplete orphaned drafts with no questions and no candidate attempts. | Map to `Draft` under a quarantined review flag or delete after owner confirmation. | Preserves auditability. |

## Staged Migration Sequence

1. **Step 1 — Additive Schema Migration:**
   - Create `Examinations` table with unique constraint on `Code`.
   - Add nullable `ExaminationId`, `RevisionNumber`, `LifecycleState`, and `ConcurrencyToken` to `Exams`.
   - Create sequence counters `exam_code_rn_seq` and `exam_code_pn_seq`.
2. **Step 2 — Data Backfill & Examination Creation:**
   - For Class A records: Generate stable `Examination` row; set `RevisionNumber = 1`; populate `ExaminationId`.
   - Set `Exam.LifecycleState = ExamLifecycleState.Published` for published records.
   - Set `Exam.LifecycleState = ExamLifecycleState.Draft` for verified unsubmitted drafts.
   - Do NOT populate `ApprovedBy`, `ReviewedBy`, or `PublishedBy` with fabricated names; set `CreatedBy = "system_migration"`.
3. **Step 3 — Constraint Enforcement:**
   - Make `Exam.ExaminationId` required (`NOT NULL`).
   - Add composite unique index `UNIQUE (ExaminationId, RevisionNumber)`.
   - Add partial unique indexes for single published and single active draft.
4. **Step 4 — Code Cutover:**
   - Services read and write `LifecycleState`.
   - Compatibility bridge synchronizes `IsPublished = (LifecycleState == ExamLifecycleState.Published)`.

## Rollback Considerations
Because all schema additions are strictly additive, rollback is non-destructive:
- Dropping the partial indexes and foreign key constraints restores previous schema behavior.
- Existing `Exam` rows and `ExamAttempt.ExamId` references remain 100% intact throughout migration and rollback.

## Status Summary
- Migration Strategy: ADDITIVE & STAGED
- Legacy Record Classification: CONSERVATIVE & AUDITED (No metadata fabrication)
- Rollback: NON-DESTRUCTIVE
- Next Gate: Implementation upon owner authorization
