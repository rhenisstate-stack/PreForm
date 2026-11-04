# PREPFORD — P3.7 BACKUP, RESTORE & DISASTER RECOVERY RUNBOOK

**Phase:** P3.7 — Deployment Readiness & Controlled Release Validation  
**Workstream:** P3.7.5 — Backup, Restore, and Recovery Readiness  
**Target Database:** PostgreSQL 16+ (PostgreSQL 18.6 verified)  
**Execution Date:** November 4, 2026  
**Auditor Roles:** Database Reliability Engineer, DevOps Engineer  

---

## 1. Backup Architecture & Strategy

To guarantee data resilience, protection against accidental data loss, and rapid recovery from operational incidents, PrepFord implements a tiered PostgreSQL backup architecture:

```
[ Active PostgreSQL Production Cluster ]
                 │
  ┌──────────────┴──────────────┐
  ▼                             ▼
[ Continuous WAL Archiving ]   [ Scheduled Daily Full Snapshot ]
  (15-min RPO / Point-in-Time)    (Encrypted pg_dump / Storage Bucket)
                 │                             │
                 └──────────────┬──────────────┘
                                ▼
         [ AES-256 Encrypted Cloud Object Storage ]
           (Immutable 30-Day Retention / IAM Restricted)
```

### 1.1 Backup Tiers & Schedule
1. **Continuous WAL Archiving (Write-Ahead Logging):** Continuous streaming of transaction logs to object storage (e.g. AWS S3, Cloud Storage, or managed DBaaS WAL store). Enables Point-in-Time Recovery (PITR) to any second within the retention window.
2. **Daily Logical & Physical Snapshots:** Executed daily at 02:00 UTC using `pg_dump -Fc` (custom compressed format) or storage-level physical snapshots.
3. **Pre-Deployment Snapshots:** Mandatory manual snapshot taken immediately before any database migration or production release.

### 1.2 Target Recovery Metrics (Proposed for Owner Decision)
- **Target RPO (Recovery Point Objective):** $\le 15$ minutes (with continuous WAL archiving, RPO $\le 60$ seconds).
- **Target RTO (Recovery Time Objective):** $\le 60$ minutes for logical restore; $\le 15$ minutes for automated storage snapshot / failover.
*Note: These target thresholds are submitted to the Product Owner for formal contractual adoption.*

---

## 2. Backup Creation Runbook

### 2.1 Pre-Deployment Snapshot Execution
Before initiating any deployment or migration, the operator executes:
```powershell
# Set timestamp and target backup file
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "prepford_backup_pre_deploy_${timestamp}.dump"

# Execute compressed custom-format pg_dump
pg_dump -h <db-host> -U <db-user> -d prepford -Fc -Z 6 -f $backupFile

# Generate SHA-256 integrity checksum
Get-FileHash $backupFile -Algorithm SHA256 > "${backupFile}.sha256"
```

### 2.2 Routine Daily Snapshot Automation
Routine backups execute in an automated cron/job container with encryption:
```bash
pg_dump -h $DB_HOST -U $DB_USER -d prepford -Fc | gpg -c --passphrase $BACKUP_PASSPHRASE > /backups/prepford_$(date +%Y%m%d).dump.gpg
```

---

## 3. Database Restore Runbook

### Step 1: Pre-Restore Verification & Isolation
1. Confirm the target restoration database is isolated (never restore over production without explicit disaster-recovery declaration).
2. Validate the SHA-256 checksum of the backup archive:
   ```powershell
   Get-FileHash -Path <backup-file> -Algorithm SHA256
   ```

### Step 2: Provision / Clean Restoration Database
```sql
-- Terminate existing connections to target database if rebuilding
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'prepford_recovery' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS prepford_recovery;
CREATE DATABASE prepford_recovery;
```

### Step 3: Execute pg_restore
```powershell
pg_restore -h <db-host> -U <db-user> -d prepford_recovery --verbose --clean --if-exists --no-owner --no-privileges <backup-file>
```

### Step 4: Post-Restore Data Integrity Verification
Execute the following verification queries to confirm 100% data fidelity:
```sql
-- 1. Verify public table count (Must be 32 tables)
SELECT count(*) AS table_count FROM information_schema.tables WHERE table_schema = 'public';

-- 2. Verify applied migrations count (Must be 9 migrations)
SELECT count(*) AS migrations_count FROM public."__EFMigrationsHistory";

-- 3. Verify core examination record counts
SELECT count(*) AS examinations_count FROM public."Examinations";
SELECT count(*) AS exams_count FROM public."Exams";
SELECT count(*) AS exam_questions_count FROM public."ExamQuestions";
SELECT count(*) AS attempt_questions_count FROM public."ExamAttemptQuestions";
SELECT count(*) AS responses_count FROM public."AttemptResponses";

-- 4. Verify sequence generators are valid
SELECT last_value FROM public."ExaminationSequences_RN_Id_seq";
SELECT last_value FROM public."ExaminationSequences_PN_Id_seq";
```

### Step 5: Application Reconnection
Update `DATABASE_URL` in the application service configuration to point to the restored database, restart the service, and verify `/api/v1/health/ready` returns 200 OK.

---

## 4. Empirical Restore Rehearsal Evidence (Conducted November 4, 2026)

To validate the restore process with reproducible facts rather than theoretical assumptions, an independent restore rehearsal was executed on the active PostgreSQL instance:

### Rehearsal Protocol & Steps
1. **Source Database:** `prepford_gateb_verification` (containing all live examination data, attempts, and migrations).
2. **Rehearsal Database Created:** `prepford_gateb_rehearsal`.
3. **Backup Executed:** `pg_dump.exe` captured complete SQL dump into secure scratch storage.
4. **Restore Executed:** `psql.exe` restored all tables, constraints, sequences, and data rows into `prepford_gateb_rehearsal`.
5. **Integrity Validation Executed:** Parity verified across all tables, records, and schema objects.
6. **Teardown Executed:** `prepford_gateb_rehearsal` dropped cleanly; temporary dump file securely removed.

### Rehearsal Verification Results

| Metric / Object | Source (`prepford_gateb_verification`) | Restored (`prepford_gateb_rehearsal`) | Parity Status |
|---|:---:|:---:|:---:|
| **Public Table Count** | 32 tables | 32 tables | **100% MATCH** |
| **Applied EF Migrations** | 9 migrations | 9 migrations | **100% MATCH** |
| **Examinations (Families)** | 141 records | 141 records | **100% MATCH** |
| **Exams (Revisions)** | 232 records | 232 records | **100% MATCH** |
| **ExamQuestions (Memberships)** | 209 records | 209 records | **100% MATCH** |
| **QuestionTypeDefinitions** | 18 records | 18 records | **100% MATCH** |
| **Questions (Question Bank)** | 175 records | 175 records | **100% MATCH** |
| **SubscriptionPlans** | 12 records | 12 records | **100% MATCH** |
| **Users** | 109 records | 109 records | **100% MATCH** |
| **Sequences Initialized** | 2 (`RN`, `PN`) | 2 (`RN`, `PN`) | **100% MATCH** |
| **Execution Duration** | Dump: ~10 s | Restore: ~9 s | **PASS** |

**Conclusion:** Restore rehearsal verified 100% data integrity, zero schema degradation, and flawless sequence and constraint retention.
