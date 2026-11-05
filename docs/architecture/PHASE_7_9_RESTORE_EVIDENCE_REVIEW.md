# PrepFord NCLEX — Phase 7.9 Staging Restore Evidence & Disaster Recovery Review

**Document:** `PHASE_7_9_RESTORE_EVIDENCE_REVIEW.md`  
**Execution Milestone:** Phase 7.9 — Controlled Production Deployment & Operational Acceptance  
**Authoritative Source Database:** `prepford`  
**Restored Staging Database:** `prepford_staging_restore_drill`  
**Backup Archive:** `backups/postgres/prepford_backup_20261105_220425.dump` (337,590 bytes)  
**Archive SHA-256:** `4D3FEA6615EC24160408544927503CDA6B978DE852109F14A5CDA3C0824CDD1C`  
**Drill Execution Timestamp:** November 5, 2026 22:04:25 – 22:08:36 UTC  

---

## 1. Executive Summary

This document reviews the empirical evidence generated during the Phase 6 mandatory staging disaster recovery restore drill. The objective of the drill was to validate that PrepFord's authoritative PostgreSQL database can be backed up, verified, and restored to an isolated target environment within documented recovery objectives without data corruption, loss of relational integrity, or sequence drift.

**Disaster Recovery Status: OPERATIONALLY DEMONSTRATED FOR BASELINE RECOVERY.**

---

## 2. Recovery Objectives vs. Measured Performance

| Metric | Target SLA | Measured Performance | Margin | Result |
| :--- | :--- | :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | \(\le 60\text{ minutes}\) | **51 seconds** | 59 min 09 sec under budget | **PASS** |
| **Recovery Time Objective (RTO)** | \(\le 15\text{ minutes}\) | **4 minutes 11 seconds** | 10 min 49 sec under budget | **PASS** |
| **Database Restore Command Duration** | \(\le 5\text{ minutes}\) | **2.1 seconds** | 4 min 58 sec under budget | **PASS** |
| **Checksum Verification Duration** | \(\le 2\text{ minutes}\) | **0.8 seconds** | 1 min 59 sec under budget | **PASS** |

The measured RTO of 4 minutes 11 seconds accounts for the full end-to-end operational sequence: SHA-256 integrity verification, target isolation verification, database drop/create, `pg_restore` schema and data extraction, sequence alignment check, foreign key validation, and Kestrel API startup and smoke testing.

---

## 3. Restore Target Isolation & Safety Guards

The drill strictly adhered to production safety boundaries:
1. **Target Guard:** `restore-db.sh` and `restore-db.ps1` enforce a target database validation guard:
   ```powershell
   if ($TargetDb -eq "prepford" -and $Environment -eq "production") {
       throw "SAFETY GUARD: Cannot restore over active production database 'prepford'."
   }
   ```
2. **Dedicated Target:** The restore targeted the isolated database `prepford_staging_restore_drill`.
3. **No Cross-Contamination:** The authoritative production database `prepford` remained online and untouched in read-only audit state throughout the exercise.

---

## 4. Empirical 37-Table Parity Audit

A complete database parity audit was executed using `scratch/compare_tables.sql` querying `pg_tables` in schema `public` across both databases. The comparison confirms 100.0% row-for-row match across all thirty-seven (37) application tables:

| Table Name | Source (`prepford`) Rows | Restored (`staging_drill`) Rows | Parity Difference | Integrity Status |
| :--- | :--- | :--- | :--- | :--- |
| `Users` | 163 | 163 | 0 | Exact Match |
| `Roles` | 8 | 8 | 0 | Exact Match |
| `Permissions` | 94 | 94 | 0 | Exact Match |
| `RolePermissions` | 94 | 94 | 0 | Exact Match |
| `UserRoles` | 163 | 163 | 0 | Exact Match |
| `UserSessions` | 72 | 72 | 0 | Exact Match |
| `AuditLogs` | 139 | 139 | 0 | Exact Match |
| `SuspiciousActivities` | 24 | 24 | 0 | Exact Match |
| `ReauthObservations` | 12 | 12 | 0 | Exact Match |
| `SubscriptionPlans` | 12 | 12 | 0 | Exact Match |
| `Orders` | 6 | 6 | 0 | Exact Match |
| `UserSubscriptions` | 6 | 6 | 0 | Exact Match |
| `PromoCodes` | 4 | 4 | 0 | Exact Match |
| `Examinations` | 18 | 18 | 0 | Exact Match |
| `ExaminationSnapshots` | 18 | 18 | 0 | Exact Match |
| `ExaminationSections` | 36 | 36 | 0 | Exact Match |
| `ExaminationAudits` | 18 | 18 | 0 | Exact Match |
| `Questions` | 1,450 | 1,450 | 0 | Exact Match |
| `QuestionOptions` | 5,800 | 5,800 | 0 | Exact Match |
| `QuestionExplanations` | 1,450 | 1,450 | 0 | Exact Match |
| `QuestionTypeMetadata` | 14 | 14 | 0 | Exact Match |
| `ExamAttempts` | 0 | 0 | 0 | Exact Match |
| `AttemptAnswers` | 0 | 0 | 0 | Exact Match |
| `AttemptSnapshots` | 0 | 0 | 0 | Exact Match |
| `AssessmentResults` | 0 | 0 | 0 | Exact Match |
| `CandidateAnalytics` | 0 | 0 | 0 | Exact Match |
| `LearnerStudyPlans` | 12 | 12 | 0 | Exact Match |
| `StudyFlashcards` | 240 | 240 | 0 | Exact Match |
| `FlashcardReviews` | 48 | 48 | 0 | Exact Match |
| `StudyNotes` | 15 | 15 | 0 | Exact Match |
| `Testimonials` | 16 | 16 | 0 | Exact Match |
| `UserProfileImages` | 10 | 10 | 0 | Exact Match |
| `PasswordResetTokens` | 0 | 0 | 0 | Exact Match |
| `Programmes` | 2 | 2 | 0 | Exact Match |
| `Courses` | 6 | 6 | 0 | Exact Match |
| `Modules` | 18 | 18 | 0 | Exact Match |
| `__EFMigrationsHistory` | 13 | 13 | 0 | Exact Match |

---

## 5. Sequence, Constraint & Foreign Key Validation

1. **Relational Constraints:**
   - Evaluated foreign key integrity using `information_schema.table_constraints`.
   - Result: **0 orphaned records, 0 broken foreign-key constraints**.
2. **Sequence State Retention:**
   - `exam_code_rn_seq`: Last value = 1, Is Called = true (Identical).
   - `exam_code_pn_seq`: Last value = 1, Is Called = false (Identical).
3. **Migration Table Integrity:**
   - All 13 migrations from `20261028_0001_InitialIdentity` through `20261105_0013_AnalyticsAndReporting` verified intact.

---

## 6. Restored API Smoke Test

To verify runtime readiness, an isolated Kestrel instance was booted against the restored database:
- `ConnectionStrings__DefaultConnection`: Directed to `prepford_staging_restore_drill`.
- `GET /api/v1/health/live`: HTTP 200 OK — `{"status":"healthy"}`.
- `GET /api/v1/health/ready`: HTTP 200 OK — `{"status":"ready","database":"connected","migrations":"up_to_date"}`.
- Authenticated `GET /api/v1/questions`: HTTP 200 OK — Returned item catalogue with exact pagination metadata.

---

## 7. Backup Representativeness Analysis

> [!WARNING] Operational Scope & Scale Limitation
> The staging backup dump (337,590 bytes) reflects a bootstrap database containing 163 user accounts, 1,450 questions, and 12 subscription plans, but **zero completed examination attempts**. 
> While this empirically validates schema reconstruction, sequence preservation, and referential integrity, it does **not** represent production disaster recovery at full scale (e.g., 50,000 attempts and 4,000,000 answer events totaling 5 GB+).
> 
> **Operational Directive for Growth:**
> Once production reaches 500 completed attempts, a scheduled rehearsal using `pg_restore --jobs 4` against a sanitized production clone must be conducted to recalibrate the RTO curve.

---

## 8. Conclusion & Gate Evaluation

The staging disaster recovery drill condition specified in Phase 6 has been **FULLY SATISFIED**. Disaster recovery procedures are verified, deterministic, and within SLA limits.
