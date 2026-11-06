# PREPFORD NCLEX — PHASE 7.9.3
## WORK PACKAGE K: POSTGRESQL 16 MIGRATION LINEAGE & SCHEMA INTEGRITY AUDIT

**Document ID:** `PHASE_7_9_3_POSTGRESQL_MIGRATION_ACCEPTANCE_AUDIT.md`  
**Phase:** Phase 7.9.3 — Independent Final Acceptance Audit, Security Verification & Controlled Pilot Readiness  
**Work Package:** K (Database and Migration Integrity)  
**Execution Date:** 2026-11-06  
**Auditor:** Independent Technical Auditor & Database Reliability Lead  
**Evaluated Branch:** `feature/dotnet-backend-migration` (HEAD: `6d33fc5`)  
**Database Authority:** PostgreSQL 16 (`prepford` & `prepford_staging_restore_drill`)  

---

## 1. Executive Summary & Audit Authority

PostgreSQL 16 is the authoritative runtime persistence engine for PrepFord NCLEX.

During Phase 7.9.1 and Phase 7.9.2, discrepancies were observed between migration directory numbering, EF Core model snapshots, and historical documentation claims. Phase 7.9.2 applied migration `20261106094853_AddEntitlementAndPaymentIndexes`.

This audit directly connected to PostgreSQL 16, queried `__EFMigrationsHistory` across both the primary development database (`prepford`) and the isolated staging restore drill database (`prepford_staging_restore_drill`), reconciled all 14 physical migrations against source files, and verified partial unique index definitions.

---

## 2. Definitive PostgreSQL 16 Migration Reconciliation Table

Direct execution of `SELECT "MigrationId", "ProductVersion" FROM public."__EFMigrationsHistory" ORDER BY 1;` against PostgreSQL 16 `prepford` confirmed exactly **14 applied migrations**, perfectly matching the 14 migration classes in `apps/api/Migrations/`:

| # | Physical Migration File Path in `apps/api/Migrations/` | Authoritative PostgreSQL `MigrationId` in `__EFMigrationsHistory` | Target Release Milestone | Migration Purpose | Status in `prepford` |
| :---: | :--- | :--- | :---: | :--- | :---: |
| **M1** | `0001_CreateProgrammes/20261026120000_CreateProgrammes.cs` | `20261026120000_CreateProgrammes` | Phase 1 | Initial schema, users, programmes, client needs | **APPLIED** |
| **M2** | `0002_AddMasterDomainModels/20261027150000_AddMasterDomainModels.cs` | `20261027150000_AddMasterDomainModels` | Phase 2 | Exams, questions, options, attempt responses | **APPLIED** |
| **M3** | `0003_AddUserProfileImages/20261028090000_AddUserProfileImages.cs` | `20261028090000_AddUserProfileImages` | Phase 3 | User profile picture storage and timestamps | **APPLIED** |
| **M4** | `0004_HarmonizeBackendSchema/20261029100000_HarmonizeBackendSchema.cs` | `20261029100000_HarmonizeBackendSchema` | Phase 4 | Schema alignment, audit logs, indexes | **APPLIED** |
| **M5** | `0005_AddStudyStudioFlashcards/20261031100000_AddStudyStudioFlashcards.cs` | `20261031100000_AddStudyStudioFlashcards` | Phase 5 | Spaced repetition flashcard decks and reviews | **APPLIED** |
| **M6** | `0006_AddQuestionTypeCapabilityAndStatus/20261102060000_AddQuestionTypeCapabilityAndStatus.cs` | `20261102060000_AddQuestionTypeCapabilityAndStatus` | Phase 6 | NGN question types and status transitions | **APPLIED** |
| **M7** | `0006_AddQuestionTypeCapabilityAndStatus/20261103054224_AddAttemptQuestionSetAndGradingState.cs` | `20261103054224_AddAttemptQuestionSetAndGradingState` | Phase 6 (P3.1) | Attempt question sets and grading snapshots | **APPLIED** |
| **M8** | `0007_AddExaminationLifecycleAndSnapshot/20261103092621_AddExaminationLifecycleAndSnapshot.cs` | `20261103092621_AddExaminationLifecycleAndSnapshot` | Phase 6 (P3.1) | Examination revisions and blueprint snapshots | **APPLIED** |
| **M9** | `0008_AddExamQuestionMembershipUniqueIndex/20261103120000_AddExamQuestionMembershipUniqueIndex.cs` | `20261103120000_AddExamQuestionMembershipUniqueIndex` | Phase 6 (P3.1) | Unique index on examination question membership | **APPLIED** |
| **M10** | `0009_AddSessionSecurityAndDeviceManagement/20261104200000_AddSessionSecurityAndDeviceManagement.cs` | `20261104200000_AddSessionSecurityAndDeviceManagement` | Phase 6 (P3.2) | Device tracking, client IDs, session security | **APPLIED** |
| **M11** | `0010_AddPhase1SecurityAndGovernance/20261105090932_AddPhase1SecurityAndGovernance.cs` | `20261105090932_AddPhase1SecurityAndGovernance` | Phase 7.9 | Rate limit buckets, IP access rules | **APPLIED** |
| **M12** | `0011_AddCurriculumTaxonomyAndQuestionBank/20261105105042_0011_AddCurriculumTaxonomyAndQuestionBank.cs` | `20261105105042_0011_AddCurriculumTaxonomyAndQuestionBank` | Phase 7.9 | Subject domains, categories, question bank | **APPLIED** |
| **M13** | `0012_AddExaminationConfigurationAndPolicies/20261105133831__0012_AddExaminationConfigurationAndPolicies.cs` | `20261105133831__0012_AddExaminationConfigurationAndPolicies` | Phase 7.9 | Session security policies, pass thresholds | **APPLIED** |
| **M14** | `0013_AddEntitlementAndPaymentIndexes/20261106094853_AddEntitlementAndPaymentIndexes.cs` | `20261106094853_AddEntitlementAndPaymentIndexes` | Phase 7.9.2 | Active subscription & payment idempotency unique indexes | **APPLIED** |

---

## 3. Discrepancy Resolution: Phase 7.9.2 Document Error

### 3.1 The Documentation Error
Section 3 of `docs/architecture/PHASE_7_9_2_RELEASE_PROVENANCE_RECONCILIATION.md` stated:
> *"Physical inspection of PostgreSQL 16 database prepford confirmed the following complete migration chain in `__EFMigrationsHistory`: 1. `20261101111956_InitialCreate`, 2. `20261102025114_AddAuditLogsTable`, 3. `20261102031732_AddRoleHierarchySystem`..."*

### 3.2 The Ground Truth
- The migration IDs listed above **never existed** in the actual database or code. They were placeholder names authored during an early documentation draft.
- The actual physical migration IDs are shown in Section 2 above (beginning with `20261026120000_CreateProgrammes` and ending with `20261106094853_AddEntitlementAndPaymentIndexes`).
- **Confirmation:** The actual database schema and EF Core model snapshot (`AppDbContextModelSnapshot.cs`) are 100% in agreement with the 14 physical migrations. Zero unapplied or missing migrations exist.

---

## 4. PostgreSQL Index & Constraint Verification

Direct SQL query against `pg_indexes` in PostgreSQL 16 confirmed the exact definitions of the security indexes applied by migration 14:

```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE indexname IN ('idx_user_subscriptions_active_unique', 'idx_payment_transactions_provider_event_id');
```

**Results:**
1. **Active Subscription Uniqueness:**
   ```sql
   CREATE UNIQUE INDEX idx_user_subscriptions_active_unique 
   ON public."UserSubscriptions" USING btree ("UserId", "PlanId") 
   WHERE ("Status" = 1)
   ```
   *Behavior:* Enforces that a candidate can only have a single active (`Status = 1`) subscription per plan. Attempts to issue or purchase duplicate active plans fail at the database level.
2. **Provider Event Idempotency:**
   ```sql
   CREATE UNIQUE INDEX idx_payment_transactions_provider_event_id 
   ON public."PaymentTransactions" USING btree ("ProviderEventId")
   ```
   *Behavior:* Enforces that every provider payment webhook event ID is recorded at most once, preventing duplicate transaction records and multiple subscription grants on replayed webhooks.

---

## 5. Staging Restore Drill Verification

Inspection of the isolated backup verification database `prepford_staging_restore_drill` showed:
- Contains all 37 database tables.
- Contains 13 migrations in `__EFMigrationsHistory` (M1 through M13).
- Does not yet have M14 (`20261106094853_AddEntitlementAndPaymentIndexes`) applied, confirming that it represents an authentic pre-7.9.2 restoration state suitable for upgrade drill testing.

---

## 6. Work Package K Audit Determination

```
========================================================================================
             WORK PACKAGE K DETERMINATION: PASS / SATISFIED (GATE G8)
========================================================================================
```

The PostgreSQL 16 migration lineage is complete, valid, discoverable, and verified across all 14 migrations. The documentation naming error in the Phase 7.9.2 report is resolved. Partial unique indexes are active and enforce data integrity.
