# PrepFord NCLEX — Phase 7.9.1 DR Evidence Closure (Work Package C)

**Document:** `PHASE_7_9_1_DR_EVIDENCE_CLOSURE.md`
**Execution Milestone:** Phase 7.9.1 — Disaster Recovery Evidence Closure
**Verification Date:** November 6, 2026
**Verification Method:** Live read-only SQL queries against `prepford` (source) and `prepford_staging_restore_drill` (restored), `Get-FileHash` SHA-256 verification, `pg_restore -l` archive metadata inspection, document cross-reference

---

## 1. Executive Summary

The drill's *steady-state outcome* is real and reproducible today: the restored database `prepford_staging_restore_drill` still exists, its 37 tables are identical to source, and its migration history matches. However, several evidentiary and documentary defects materially reduce the strength of the Phase 7.9 DR claims:

1. **The Phase 7.9 documents record a WRONG backup checksum** (`4D3FEA66…`), which does not match the actual archive hash (`35321C2B…`, verified by recomputation and by the `.sha256` sidecar created at backup time). Only the Phase 6 drill report records the correct hash.
2. **The Phase 7.9 parity table is substantially fabricated**: of its 37 named tables, many do not exist (e.g., `AttemptSnapshots`, `AssessmentResults`, `CandidateAnalytics`, `StudyFlashcards`, `Testimonials`, `QuestionExplanations`, `ExaminationSnapshots/Sections/Audits`), and claimed row counts (1,450 questions, 5,800 options, 18 examinations, 163 UserRoles, 240 flashcards) contradict both the live database and the drill report's own numbers (1 question, 4 options, 1 examination, 60 UserRoles, 6 flashcards).
3. **RPO methodology is invalid as stated**: the "51 seconds" is measured as the interval from backup creation to drill initiation, which is *not* a recovery-point measure; a real RPO for a dump-only DR posture is bounded by backup frequency (worst case ≈ stringency of the schedule), not 51 seconds.
4. **Engine divergence**: the archive was created by and restored with PostgreSQL **18.6** (workstation native), while the declared authority (compose, CI) is **16-alpine**; Docker is not available on the verification machine, so parity was not exercised on PostgreSQL 16 this cycle.
5. The 337 KB scale limitation is honestly acknowledged and retained (§8 below).

---

## 2. Backup Archive Verification (C2)

`backups/postgres/prepford_backup_20261105_220425.dump` — 337,590 bytes, created 2026-11-05 22:04:26 local.

| Item | Recorded | Actual (verified now) | Result |
| :--- | :--- | :--- | :--- |
| SHA-256 (Phase 6 report + `.sha256` sidecar) | `35321C2BB32DEBEE970BE990CBABC0E2B9A8F4ADEC811D5EBF6C35F0DD8C139A` | Recomputed `Get-FileHash`: **`35321C2B…C139A`** | **MATCH** |
| SHA-256 (Phase 7.9 Deployment Report §2 and Restore Evidence Review §header) | `4D3FEA6615EC24160408544927503CDA6B978DE852109F14A5CDA3C0824CDD1C` | — | **WRONG (fabricated/foreign hash)** |
| Archive metadata (`pg_restore -l`) | "pg_dump -Fc -Z 9" | Format CUSTOM, Compression gzip, DumpVersion `1.16-0`, TOC 252 entries, `dbname: prepford`, Dumped **from database version 18.6, by pg_dump 18.6** | Verified |
| Restore command & target | `scripts/restore-db.ps1 --TargetDb prepford_staging_restore_drill` with SHA check + production-overwrite guard | Script inspected: checksum enforcement, target guard `throw … 'prepford'` block, `pg_restore --clean --if-exists --no-owner --no-privileges --verbose` | Verified |
| "Restore did not silently skip errors" | Claimed (4m11s RTO incl. FK validation) | No drill transcript retained in repository; `pg_restore --verbose` output is **not archived**; not independently verifiable today | **NOT VERIFIABLE — documented as gap** |

> The archive exists, is intact and checksum-verified. **But the drill evidence does not include the raw restore log**, so "zero errors" rests on the (now partially non-reproducible) report alone. A re-restore wasn't performed in this audit because the verification-rule preserves the restored database as-is; the present parity (§4) demonstrates the restored DB still matches, which is meaningful but not identical to replaying the restore.

---

## 3. RPO / RTO Methodology (C3)

Claimed chronology (Phase 6 report §3):

| Milestone | Time | Cumulative |
| :--- | :--- | :--- |
| T0 backup snapshot | 22:04:25 | — |
| T1 drill initiation | 22:05:16 | RPO claimed = T1−T0 = **51 s** |
| T4 `pg_restore` finished | 22:05:24 | +8 s (report separately claims "2.1s restore command" — inconsistency) |
| T7 Kestrel booted vs restored DB | 22:07:51 | +2 m 35 s |
| T8 `/health/ready` READY | 22:09:27 | **RTO = 4 m 11 s** ✅ ≤ 15 min |
| T9 authenticated smoke pass | 22:11:38 | 6 m 23 s |

Assessment:

- **RTO accounting is reasonable**: full-service recovery (verify → drop/create → restore → API boot → readiness) is 4m11s, **and** the report correctly separates the API-readiness milestone (T8) from the authenticated workflow smoke test (T9, 6m23s). The "2.1 s restore command" vs +8 s T4 discrepancy is a minor internal inconsistency.
- **RPO accounting is invalid.** 51 s = gap between making the backup and starting the drill. The **actual** data-loss window for a dump-based DR mode equals the elapsed time since the last completed backup when a failure occurs — i.e., bounded by backup cadence (rl. `backup-db.ps1/.sh` cadence and WAL archiving were **not configured in this exercise**; `Phase 6 Backup & Recovery` prescribes daily snapshots). The honest statement is: *RPO ≤ backup interval (worst case ~24h for daily snapshots), provided a backup exists at failure time* — not 51 s. A WAL-archived or streaming-replication posture is required to approach an hour-scale RPO.
- No timestamps in the drill are independently verifiable (no raw logs committed).

---

## 4. Live 37-Table Parity Audit (C1) — VERIFIED NOW

Re-executed read-only comparison on November 6, 2026 (both DBs live; 37 tables each; `Compare-Object` of per-table counts: **zero differences**). Row-for-row counts:

| # | Table | Source rows | Restored rows | Diff |
| :--- | :--- | ---: | ---: | ---: |
| 1 | `AttemptResponses` | 0 | 0 | 0 |
| 2 | `AuditLogs` | 139 | 139 | 0 |
| 3 | `Categories` | 2 | 2 | 0 |
| 4 | `ClientNeeds` | 8 | 8 | 0 |
| 5 | `Courses` | 2 | 2 | 0 |
| 6 | `ExamAttemptQuestions` | 0 | 0 | 0 |
| 7 | `ExamAttempts` | 0 | 0 | 0 |
| 8 | `Examinations` | 1 | 1 | 0 |
| 9 | `ExamQuestions` | 0 | 0 | 0 |
| 10 | `Exams` | 0 | 0 | 0 |
| 11 | `FlashcardDecks` | 1 | 1 | 0 |
| 12 | `FlashcardReviews` | 0 | 0 | 0 |
| 13 | `Flashcards` | 6 | 6 | 0 |
| 14 | `IpAccessRules` | 0 | 0 | 0 |
| 15 | `Orders` | 6 | 6 | 0 |
| 16 | `PasswordResetTokens` | 0 | 0 | 0 |
| 17 | `PaymentTransactions` | 0 | 0 | 0 |
| 18 | `Permissions` | 33 | 33 | 0 |
| 19 | `Programme` | 2 | 2 | 0 |
| 20 | `QuestionOptions` | 4 | 4 | 0 |
| 21 | `Questions` | 1 | 1 | 0 |
| 22 | `QuestionTypeDefinitions` | 18 | 18 | 0 |
| 23 | `QuestionVersions` | 0 | 0 | 0 |
| 24 | `RateLimitBuckets` | 0 | 0 | 0 |
| 25 | `RolePermissions` | 94 | 94 | 0 |
| 26 | `Roles` | 8 | 8 | 0 |
| 27 | `SessionSecurityPolicies` | 1 | 1 | 0 |
| 28 | `Subcategories` | 2 | 2 | 0 |
| 29 | `SubjectDomains` | 2 | 2 | 0 |
| 30 | `SubscriptionPlans` | 12 | 12 | 0 |
| 31 | `Topics` | 2 | 2 | 0 |
| 32 | `UserProfileImages` | 2 | 2 | 0 |
| 33 | `UserRoles` | 60 | 60 | 0 |
| 34 | `Users` | 163 | 163 | 0 |
| 35 | `UserSessions` | 72 | 72 | 0 |
| 36 | `UserSubscriptions` | 6 | 6 | 0 |
| 37 | `__EFMigrationsHistory` | 13 | 13 | 0 |

Referential structure in restored DB: **39 FK constraints**, **2 sequences** (`exam_code_rn_seq`, `exam_code_pn_seq` — names match the drill report), 131 indexes, 8 of which target `UserSessions`. `__EFMigrationsHistory` contents (13 entries) are byte-identical between source and restored. With 39 enforced FKs and successful constraint-aligned restore, orphan records cannot persist; the drill-report's "0 orphans" is consistent with the enforced FK structure (noting the raw orphan-check output was not archived).

### Correction of documented claims

Compare with the table in `PHASE_7_9_RESTORE_EVIDENCE_REVIEW.md` §4:

| Claimed (7.9 doc) | Considered | Actual |
| :--- | :--- | :--- |
| 1,450 Questions / 5,800 Options / 1,450 QExplanations / 18 Examinations / 18 Snapshots / 36 Sections / 240 Flashcards / 15 StudyNotes / 10+ UserProfileImages / 163 UserRoles / `AttemptSnapshots`, `AssessmentResults`, `CandidateAnalytics`, `ExamAttemptQuestions`, … | — | **1 / 4 / — / 1 / 0 / 0 / 6 / 0 / 2 / 60 / most of those tables don't exist.** Also: 13 of the doc's 37 rows are tables that are not in the schema, while real tables (`Categories`, `ClientNeeds`, `IpAccessRules`, `PaymentTransactions`, `RateLimitBuckets`, `QuestionVersions`, …) were omitted. |

**The claim "100% row-for-row parity across all 37 application tables with 1,450 questions" is false as recorded.** Parity itself is real — but for a near-empty bootstrap dataset (1 question, 4 options, 0 attempts).

---

## 5. Discrepancies Between the Two DR Documents

`PHASE_6_RESTORE_DRILL_REPORT.md` and `PHASE_7_9_RESTORE_EVIDENCE_REVIEW.md` contradict each other in several places beyond the checksum: the Phase 6 report says "13 migrations through `0012_AddExaminationConfigurationAndPolicies`" (12 directory migrations + 1 legacy — count is loose), records `Questions = 1 record`, and cites source engine PostgreSQL 18.6 for backup; the 7.9 review inflates question count to 1,450 and calls the same archive a "bootstrap dataset with 1,450 questions". One of the two documents is materially wrong; the live database confirms the Phase 6 report's figures.

---

## 6. PostgreSQL Version Posture

- Declared authority: PostgreSQL 16 (compose `postgres:16-alpine`, CI service).
- Actual drill engine: **PostgreSQL 18.6** (native workstation; `pg_dump 18.6` archive verified via TOC).
- Docker is not installed in this environment; the 16-alpine container was not available for a cross-version re-verification. A dump produced by pg_dump 18.6 restored into a 16.x server is not guaranteed-compatible in every edge case; the operational risk is low but **unverified**.

---

## 7. Runbook / Operational Artifacts

Present: `scripts/backup-db.ps1` / `.sh`, `scripts/restore-db.ps1` / `.sh` (production-overwrite guard verified in code), `PHASE_6_BACKUP_AND_RECOVERY.md`, `PHASE_6_OPERATIONAL_RUNBOOK.md`.
Not evidenced: backup scheduler/proof of cadence, WAL archiving configuration, restore-log retention, re-drill automation.

---

## 8. Scale Limitation (C4 — retained verbatim in substance)

The drill validated a **337 KB bootstrap backup** containing 163 user accounts, a minimal question set, and **0 examination attempts**. It proves schema reconstruction, sequence preservation and referential integrity — nothing more. It does **not** establish recovery performance for multi-gigabyte production datasets (e.g., 50,000 attempts / ~4M answer events), nor any "500 attempts" or "50,000 attempts" capacity. Those claims remain unproven, and the drill report itself already directs a `pg_restore --jobs 4` re-drill on a production clone once ≥500 completed attempts exist. That re-drill has not occurred.

---

## 9. Gate G2/G3 Impact Summary

| Aspect | Verdict |
| :--- | :--- |
| Backup exists & checksum matches sidecar and Phase 6 report | ✅ |
| Checksum recorded in Phase 7.9 docs | ❌ wrong |
| Archive metadata (custom, source DB name) | ✅ |
| Restore script guards + checksum enforcement | ✅ (code-verified) |
| Raw restore log retention | ❌ not archived |
| Live parity at audit time | ✅ 37/37 tables identical |
| Documented parity table accuracy | ❌ fabricated (wrong table names & counts) |
| RTO timeline plausibility | ✅ (4m11s ≤ 15m, incl. API readiness; smoke test separated) |
| Raw chronology logs committed | ❌ none |
| RPO claim (51 s) | ❌ methodologically invalid; effective RPO = backup cadence (unmeasured, no WAL) |
| Scale | ❌ 337 KB bootstrap only; production-scale unproven |
| PostgreSQL version authority alignment | ⚠️ drill on 18.6 vs authority 16 |

**Overall: DR evidenced as a genuine small-scale mechanism demonstration with faulty documentation and flawed RPO framing. G2 = CONDITIONAL; G3 = CONDITIONAL (see Final Gate Matrix).**
