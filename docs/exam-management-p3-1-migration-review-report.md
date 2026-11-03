# PrepFord Examination Management — P3.1 Migration Review Report

**Phase:** P3.1 — Examination Domain Foundation  
**Migration ID:** `20261103092621_AddExaminationLifecycleAndSnapshot`  
**Database Target:** `prepford_gateb_verification` (Isolated loopback verification database)  
**Verification Date:** 3 November 2026  
**Status:** MIGRATION VERIFIED AND APPLIED SAFELY

---

## 1. Executive Summary

This report documents the review, structure, safety, and application verification of the EF Core migration `20261103092621_AddExaminationLifecycleAndSnapshot`.

The migration is strictly additive and non-destructive. It does not alter existing primary key types, does not delete existing tables or columns, does not mutate existing candidate attempt responses, and preserves all Gate C candidate assessment protections.

---

## 2. Migration Schema Inventory

### 2.1 Table Operations
- **New Table:** `public."Examinations"`
  - `Id`: `text` (Primary Key, string UUID format)
  - `Pathway`: `varchar(10)` (NOT NULL, "rn" or "pn")
  - `Code`: `varchar(16)` (NOT NULL, UNIQUE)
  - `Title`: `varchar(128)` (NOT NULL)
  - `CreatedAt`: `timestamp with time zone` (NOT NULL)
  - `CreatedBy`: `varchar(128)` (NOT NULL)
  - `CurrentRevisionId`: `varchar(128)` (NULL, Foreign Key to `Exams.Id` with `ON DELETE SET NULL`)
  - `SuccessorExaminationId`: `text` (NULL, Self-referential Foreign Key to `Examinations.Id` with `ON DELETE RESTRICT`)

### 2.2 Additive Column Additions to `public."Exams"`
All added columns are nullable or have safe default values:
- `ExaminationId`: `text` (NULL, Foreign Key to `Examinations.Id` with `ON DELETE RESTRICT`)
- `RevisionNumber`: `integer` (DEFAULT 0, NOT NULL)
- `LifecycleState`: `integer` (DEFAULT 0, NOT NULL)
- `ConcurrencyToken`: `bigint` (DEFAULT 0, NOT NULL)
- `CreatedBy`: `varchar(128)` (DEFAULT '', NOT NULL)
- `SubmittedBy`: `varchar(128)` (NULL)
- `SubmittedAt`: `timestamp with time zone` (NULL)
- `ReviewedBy`: `varchar(128)` (NULL)
- `ReviewedAt`: `timestamp with time zone` (NULL)
- `ApprovedBy`: `varchar(128)` (NULL)
- `ApprovedAt`: `timestamp with time zone` (NULL)
- `PublishedBy`: `varchar(128)` (NULL)
- `PublishedAt`: `timestamp with time zone` (NULL)
- `ArchivedBy`: `varchar(128)` (NULL)
- `ArchivedAt`: `timestamp with time zone` (NULL)
- `RetiredBy`: `varchar(128)` (NULL)
- `RetiredAt`: `timestamp with time zone` (NULL)

### 2.3 Additive Column Additions to `public."ExamAttempts"`
- `MetadataSnapshot`: `jsonb` (NULL) — stores immutable server-generated JSON metadata document.

### 2.4 PostgreSQL Sequences
- `exam_code_rn_seq`: `START 1 INCREMENT 1 MINVALUE 1 MAXVALUE 999999 NO CYCLE`
- `exam_code_pn_seq`: `START 1 INCREMENT 1 MINVALUE 1 MAXVALUE 999999 NO CYCLE`

### 2.5 Indexes & Invariants
- `IX_Examinations_Code`: UNIQUE on `(Code)`
- `IX_Examinations_Pathway_Code`: UNIQUE on `(Pathway, Code)`
- `IX_Exams_ExaminationId_RevisionNumber`: UNIQUE on `(ExaminationId, RevisionNumber)`
- `IX_Exams_ExaminationId_SinglePublished`: PARTIAL UNIQUE on `(ExaminationId)` WHERE `"LifecycleState" = 4`
- `IX_Exams_ExaminationId_ActiveDraft`: PARTIAL UNIQUE on `(ExaminationId)` WHERE `"LifecycleState" = 1`
- `IX_Exams_LifecycleState`: Non-unique index on `(LifecycleState)`

---

## 3. Database Execution Evidence

The migration was applied to `prepford_gateb_verification` on `127.0.0.1:5432`:

```text
Applying migration '20261103092621_AddExaminationLifecycleAndSnapshot'.
ALTER TABLE public."Exams" ADD "ApprovedAt" timestamp with time zone;
...
ALTER TABLE public."ExamAttempts" ADD "MetadataSnapshot" jsonb;
CREATE TABLE public."Examinations" (...);
CREATE UNIQUE INDEX "IX_Exams_ExaminationId_ActiveDraft" ON public."Exams" ("ExaminationId") WHERE "LifecycleState" = 1;
CREATE UNIQUE INDEX "IX_Exams_ExaminationId_RevisionNumber" ON public."Exams" ("ExaminationId", "RevisionNumber");
CREATE UNIQUE INDEX "IX_Exams_ExaminationId_SinglePublished" ON public."Exams" ("ExaminationId") WHERE "LifecycleState" = 4;
CREATE INDEX "IX_Exams_LifecycleState" ON public."Exams" ("LifecycleState");
CREATE UNIQUE INDEX "IX_Examinations_Code" ON public."Examinations" ("Code");
CREATE UNIQUE INDEX "IX_Examinations_Pathway_Code" ON public."Examinations" ("Pathway", "Code");
CREATE SEQUENCE IF NOT EXISTS exam_code_rn_seq ...;
CREATE SEQUENCE IF NOT EXISTS exam_code_pn_seq ...;
INSERT INTO public."__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20261103092621_AddExaminationLifecycleAndSnapshot', '8.0.10');
Done.
```

Confirmation query against PostgreSQL database:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('Examinations', 'Exams', 'ExamAttempts');
-- Returned: Examinations, Exams, ExamAttempts

SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema='public';
-- Returned: exam_code_rn_seq, exam_code_pn_seq
```

---

## 4. Rollback Verification

The migration `Down` method safely drops:
1. Foreign key constraints `FK_Exams_Examinations_ExaminationId`
2. Tables `Examinations`
3. Partial unique indexes and standard indexes
4. Additive columns from `Exams` and `ExamAttempts`
5. Sequences `exam_code_rn_seq` and `exam_code_pn_seq`

Rollback capability is fully preserved without data destruction of pre-existing schemas.
