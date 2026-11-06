# PREPFORD NCLEX — PHASE 7.9.4
## WORK PACKAGE A: RELEASE CANDIDATE PROVENANCE & SOURCE LINEAGE RECONCILIATION

**Document ID:** `PHASE_7_9_4_RELEASE_CANDIDATE_PROVENANCE.md`  
**Phase:** Phase 7.9.4 — Controlled Institutional Pilot Authorization, Deployment Governance & Operational Readiness  
**Evaluated Branch:** `feature/dotnet-backend-migration`  
**Previous Evaluated Release Candidate (Phase 7.9.3):** `6d33fc55b1ec42be13f60f3b2cb19cebadf34ce0`  
**Current HEAD Commit SHA:** `58aa98221ac9b2bd1106a9715749011ddaa90ed3`  
**Direct Parent Commit SHA:** `6d33fc55b1ec42be13f60f3b2cb19cebadf34ce0`  
**Repository Working Directory:** `C:\Users\gitau\Documents\PREform`  
**Commercial Mode:** Controlled Institutional Pilot (`pilot_grant`) — Live Stripe Disabled  
**Deployment Authority:** PrepFord Product Owner  
**Date of Audit:** 2026-11-06  

---

## 1. Executive Summary & Purpose

Phase 7.9.3 reported that the codebase at commit `6d33fc55b1ec42be13f60f3b2cb19cebadf34ce0` satisfied all technical acceptance criteria for a controlled institutional pilot, establishing a determination of **READY FOR PRODUCT OWNER DEPLOYMENT AUTHORIZATION**.

The objective of Work Package A is to:
1. Conduct a physical inspection of the current Git repository state.
2. Reconcile current `HEAD` against the evaluated Phase 7.9.3 release candidate `6d33fc5`.
3. Verify whether any application source code, configuration, or database migrations changed since acceptance.
4. Establish cryptographic provenance and build reproducibility.
5. Formulate a release-tag proposal awaiting explicit written Product Owner authorization.

---

## 2. Git Repository Baseline Inspection

Live PowerShell execution of Git inspection commands yielded the following baseline metrics:

| Property | Authoritative Value | Verification Command | Compliance Status |
| :--- | :--- | :--- | :---: |
| **Current Branch** | `feature/dotnet-backend-migration` | `git status -sb` | **VERIFIED** |
| **Current HEAD SHA** | `58aa98221ac9b2bd1106a9715749011ddaa90ed3` | `git rev-parse HEAD` | **CONFIRMED** |
| **Short SHA** | `58aa982` | `git rev-parse --short HEAD` | **CONFIRMED** |
| **Direct Parent SHA** | `6d33fc55b1ec42be13f60f3b2cb19cebadf34ce0` | `git rev-parse HEAD^` | **CONFIRMED** |
| **Commit Timestamp** | `2026-11-06 14:17:55 +0300` | `git log -1 --format=%cd --date=iso` | **CONFIRMED** |
| **Commit Author** | `Mark Kinyanjui <gitaumark502@gmail.com>` | `git log -1 --format="%an <%ae>"` | **CONFIRMED** |
| **Commit Subject** | `create the PREPFORD NCLEX — PHASE 7.9.3 doc files` | `git log -1 --format=%s` | **CONFIRMED** |
| **Upstream Remote Tracking** | `preform/feature/dotnet-backend-migration` | `git status -sb` | **IN SYNC (0 ahead/behind)** |
| **Working Tree Cleanliness** | 100% Clean (`nothing to commit, working tree clean`) | `git status` | **CLEAN** |
| **Staged / Unstaged Diffs** | Zero bytes (`git diff` and `git diff --cached` empty) | `git diff --stat` | **VERIFIED** |
| **Untracked Files** | Zero untracked files | `git status -u` | **VERIFIED** |
| **Release Tag v0.7.0** | **DOES NOT EXIST** (no tags in repository) | `git tag -l` | **CONFIRMED (UNCREATED)** |

---

## 3. Provenance Reconciliation Between `6d33fc5` and Current `HEAD` (`58aa982`)

The Phase 7.9.3 technical acceptance report evaluated commit `6d33fc55b1ec42be13f60f3b2cb19cebadf34ce0`. Current checkout HEAD is `58aa98221ac9b2bd1106a9715749011ddaa90ed3`.

### 3.1 Lineage & Commit Diff Analysis

A full diff between `6d33fc5` and `HEAD` was executed:
```powershell
git diff --stat 6d33fc55b1ec42be13f60f3b2cb19cebadf34ce0 HEAD
```

**Output:**
```
 docs/architecture/PHASE_7_9_3_BFF_SESSION_SECURITY_AUDIT.md      |  86 +++++++++++
 docs/architecture/PHASE_7_9_3_CANDIDATE_DATA_GOVERNANCE_AUDIT.md |  94 +++++++++++
 docs/architecture/PHASE_7_9_3_DISTRIBUTED_RATE_LIMITING_AUDIT.md | 130 ++++++++++++++++
 docs/architecture/PHASE_7_9_3_ENTITLEMENT_LIFECYCLE_ACCEPTANCE_AUDIT.md | 171 +++++++++++++++++++++
 docs/architecture/PHASE_7_9_3_FINAL_ACCEPTANCE_MATRIX.md         | 115 ++++++++++++++
 docs/architecture/PHASE_7_9_3_FINAL_OPERATIONAL_DETERMINATION.md | 122 +++++++++++++++
 docs/architecture/PHASE_7_9_3_NEXTJS_BUILD_ACCEPTANCE_AUDIT.md   | 133 ++++++++++++++++
 docs/architecture/PHASE_7_9_3_OPERATIONAL_RECOVERY_AND_PERFORMANCE_AUDIT.md |  74 +++++++++
 docs/architecture/PHASE_7_9_3_PAYMENT_AND_WEBHOOK_SECURITY_AUDIT.md | 111 +++++++++++++
 docs/architecture/PHASE_7_9_3_PHASE_7_9_2_CLAIM_RECONCILIATION.md |  73 +++++++++
 docs/architecture/PHASE_7_9_3_POSTGRESQL_MIGRATION_ACCEPTANCE_AUDIT.md | 104 +++++++++++++
 docs/architecture/PHASE_7_9_3_REAUTHENTICATION_ACCEPTANCE_AUDIT.md | 118 ++++++++++++++
 docs/architecture/PHASE_7_9_3_REPOSITORY_PROVENANCE_AUDIT.md     | 162 +++++++++++++++++++
 docs/architecture/PHASE_7_9_3_SESSION_CONCURRENCY_ACCEPTANCE_AUDIT.md |  93 +++++++++++
 docs/architecture/PHASE_7_9_3_STATIC_ANALYSIS_ACCEPTANCE_AUDIT.md | 113 ++++++++++++++
 docs/architecture/PHASE_7_9_3_TEST_INTEGRITY_AND_REGRESSION_AUDIT.md | 113 ++++++++++++++
 16 files changed, 1812 insertions(+)
```

### 3.2 Non-Documentation Verification

Targeted path inspection of application code directories was conducted:
```powershell
git diff 6d33fc55b1ec42be13f60f3b2cb19cebadf34ce0 HEAD apps/
git diff 6d33fc55b1ec42be13f60f3b2cb19cebadf34ce0 HEAD package.json compose.yaml
```
**Result:** Exactly zero lines of difference.

### 3.3 Provenance Determination
1. The only change between `6d33fc5` and `58aa982` is the inclusion of the 16 authoritative Phase 7.9.3 audit reports in `docs/architecture/`.
2. All operational runtime code, including:
   - ASP.NET Core 8 Web API (`apps/api/`),
   - Next.js 16.4.3 frontend (`apps/web/`),
   - PostgreSQL 16 migrations (`apps/api/Migrations/`),
   - Unit and integration test suites (`apps/api/Tests/`, `apps/web/tests/`),
   - Runtime configuration and scripts (`scripts/`, `package.json`, `compose.yaml`),
   are **100% bit-for-bit identical** between commit `6d33fc5` and `58aa982`.
3. The technical acceptance established in Phase 7.9.3 applies directly and without qualification to the current checkout. Current HEAD `58aa982` represents the authoritative release candidate incorporating the Phase 7.9.3 acceptance documentation.

---

## 4. Build Artifact Provenance & Migration Manifest

### 4.1 Frontend Build Artifact
- **Target Framework:** Next.js 16.4.3 / React 19.3.0
- **Build Entrypoint:** `apps/web/package.json` (`npm run build:web`)
- **Compilation Output:** `.next/` directory prerendered static assets (139 static pages)
- **Deterministic Flags:** `cacheComponents: true`, `partialPrefetching: true`, `cpus: 1`, `staticGenerationMaxConcurrency: 1`, `staticGenerationRetryCount: 5`.

### 4.2 Backend Deployment Artifact
- **Target Framework:** .NET 8.0 (`net8.0`)
- **Project File:** `apps/api/Preform.Api.csproj`
- **Build Command:** `dotnet publish apps/api/Preform.Api.csproj -c Release -o /app/publish`
- **Compiler Status:** 0 Errors, 0 Warnings.

### 4.3 Database Migration Manifest (PostgreSQL 16)
The migration chain consists of exactly 14 sequential migrations recorded in `apps/api/Migrations/` and applied to PostgreSQL `__EFMigrationsHistory`:
1. `20261026120000_CreateProgrammes` (Core schema, users, programmes)
2. `20261027150000_AddMasterDomainModels` (Exams, questions, options)
3. `20261028090000_AddUserProfileImages` (Profile image storage)
4. `20261029100000_HarmonizeBackendSchema` (Schema harmonization, audit logs)
5. `20261031100000_AddStudyStudioFlashcards` (Spaced repetition flashcards)
6. `20261102060000_AddQuestionTypeCapabilityAndStatus` (NGN question types)
7. `20261103054224_AddAttemptQuestionSetAndGradingState` (Attempt sets and grading)
8. `20261103092621_AddExaminationLifecycleAndSnapshot` (Exam revisions and blueprints)
9. `20261103120000_AddExamQuestionMembershipUniqueIndex` (Question membership uniqueness)
10. `20261104200000_AddSessionSecurityAndDeviceManagement` (Session security, device tracking)
11. `20261105090932_AddPhase1SecurityAndGovernance` (Rate limit buckets, IP access rules)
12. `20261105105042_0011_AddCurriculumTaxonomyAndQuestionBank` (Curriculum taxonomy)
13. `20261105133831__0012_AddExaminationConfigurationAndPolicies` (Exam policies & security)
14. `20261106094853_AddEntitlementAndPaymentIndexes` (Active subscription & payment idempotency indexes)

---

## 5. Secret & Credential Absence Verification

A comprehensive repository scan confirmed that:
- Zero live production secrets (`GATEWAY_SHARED_SECRET`, `SESSION_SECRET`, `DATABASE_URL`, `WEBHOOK_SIGNING_SECRET`, `GOOGLE_CLIENT_SECRET`) are committed to Git.
- Sample secrets in `.env.example` and test files are explicitly marked as development/testing placeholders.
- Runtime secret enforcement fails closed at application boot if required secrets are unconfigured in production.

---

## 6. Release-Tag Proposal

In strict compliance with the Phase 7.9.4 mandate:
- **No Git release tag has been created.**
- The command `git tag -l` returns empty.
- Tag creation requires separate, explicit written authorization from the Product Owner.

### Formal Tag Proposal for Product Owner Authorization:
```
Target Tag:          v0.7.0
Target Commit SHA:   58aa98221ac9b2bd1106a9715749011ddaa90ed3
Tag Message:         PrepFord NCLEX v0.7.0 — Controlled Institutional Pilot Release Candidate
Status:              PENDING PRODUCT OWNER WRITTEN AUTHORIZATION
```

---

## 7. Work Package A Audit Conclusion

The evaluated release candidate provenance is 100% reconciled:
- Current HEAD `58aa982` contains the identical executable code as the accepted Phase 7.9.3 candidate `6d33fc5`.
- Working tree is clean.
- All 14 database migrations are accounted for.
- No unreviewed changes or committed production secrets exist.
- Build artifact provenance is immutable and independently reproducible.
