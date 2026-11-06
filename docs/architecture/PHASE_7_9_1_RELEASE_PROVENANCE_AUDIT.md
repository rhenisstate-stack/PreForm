# PrepFord NCLEX — Phase 7.9.1 Release Provenance Audit (Work Package A)

**Document:** `PHASE_7_9_1_RELEASE_PROVENANCE_AUDIT.md`
**Execution Milestone:** Phase 7.9.1 — Pre-Authorization Verification
**Verification Date:** November 6, 2026
**Verification Method:** Direct git inspection, live database queries, document cross-reference, test re-execution
**Working-Tree State at Audit Start:** CLEAN (0 modified/untracked entries; `git status --porcelain` output empty)

---

## 1. Executive Summary

The provenance claims of the Phase 7.9 acceptance package **do not reconcile** with the repository as inspected.

| Claim (Phase 7.9 package / tasking) | Recorded Value | Actual Repository State | Verdict |
| :--- | :--- | :--- | :--- |
| Release commit | `3bcb90c8a52e008101a1829e1db7f7b3b3a726ea` (acceptance report §header, manifest §header, authorization record §header, deployment report §header) | Full SHA **does not exist in this repository** (`git cat-file -t` fails) | **FABRICATED / UNRECONCILED** |
| Short release ref | `3bcb90c` | Resolves to a *different* commit, `3bcb90c39a146e91c0106a8c8b43cdbedbcd8381` ("Phase 7 Product & Educational Metrics Dictionary" doc commit) | **MISATTRIBUTED** — that commit is not a release commit |
| Release commit per Phase 7.9.1 tasking | `35fa06b` | `35fa06b067319e3e694f2b6b64a0a616f8942c14` exists and is HEAD of `feature/dotnet-backend-migration` | **VERIFIED** (but it is a docs-only commit) |
| Parent baseline of `35fa06b` | `3bcb90c` | Actual parent is `fe3eb860...` ("Phase 7.9 Technology Baseline Reconciliation" doc). `3bcb90c` is **three commits behind** HEAD | **INCORRECT** |
| Migration count | "13 migrations applied, `20261028_0001_InitialIdentity` … `20261105_0013_AnalyticsAndReporting`" | 13 rows in live `__EFMigrationsHistory`, but with different IDs (`20261026120000_CreateProgrammes` … `20261105133831__0012_AddExaminationConfigurationAndPolicies`). Repository contains **12** migration directories. Manifest names match no applied migration | **UNRECONCILED** |
| Backend tests | 458 passing | Rerun at HEAD: **458 total, 456 passed, 2 failed** (both environmental; passed after test-DB reset) | **PARTIALLY VERIFIED** |
| Frontend tests | 513 passing | Rerun at HEAD (see §6) | see Regression Report |
| Working tree | "clean branch, 0 uncommitted conflicts" | Confirmed clean at audit start | **VERIFIED** |

**Provenance conclusion:** The Phase 7.9 documents were finalized **at commit `35fa06b`** (the finalizing commit adds them), yet every one of them cites a release commit full SHA that never existed. Test counts approximately match reality, but the commit attribution is unusable as evidence of what was tested.

---

## 2. Repository Baseline Facts (Verified)

Inspection performed November 6, 2026, working directory `C:\Users\gitau\Documents\PREform`:

```
Branch:              feature/dotnet-backend-migration
HEAD (short):        35fa06b
HEAD (full):         35fa06b067319e3e694f2b6b64a0a616f8942c14
Subject:             docs(arch): finalize phase 7.9 release verification and acceptance package
Author / Date:       Mark Kinyanjui <gitaumark502@gmail.com> — 2026-11-05 22:57:24 +03:00
Parent:              fe3eb8603c510539439c7a9b3caa7571ffd74eb1
Tags:                none (no v0.7.0 tag exists anywhere — no `v0.7*` tag matches)
Working tree:        clean at audit start
```

Recent topology (linear):

```
35fa06b  docs(arch): finalize phase 7.9 release verification and acceptance package   ← HEAD (docs only)
fe3eb86  create the Phase 7.9 Technology Baseline Reconciliation doc file             ← actual parent
73d2551  create the compare-table sql scratch file
3bcb90c  create the Phase 7 Product & Educational Metrics Dictionary doc file        ← cited "parent baseline" (incorrect)
5201143  create the Phase 7 Payment Integration & Commercial Readiness doc file
6ca944c  create the Phase 6 Staging PostgreSQL Restore Drill Report doc file
```

Branch composition at `35fa06b`: since `3bcb90c`, exactly **4 commits**, all doc/scratch additions:

| Commit | Files | Nature |
| :--- | :--- | :--- |
| `73d2551` | `scratch/compare_tables.sql` | SQL scratch (used for live parity audit; itself valid) |
| `fe3eb86` | `docs/…PHASE_7_9_TECHNOLOGY_BASELINE.md`, `…BASELINE_AUDIT.md`, `…RESTORE_EVIDENCE_REVIEW.md`, `…PILOT_ENTITLEMENT_SECURITY_REVIEW.md`, `…PILOT_EVIDENCE_REVIEW.md`, `…PRODUCTION_ENVIRONMENT_VERIFICATION.md` + `apps/api/Tests/PilotGrantSecurityTests.cs` (262 lines) | **The only code change in the "release delta" — a new test file** |
| `35fa06b` | 6 docs (Acceptance, Authorization Record, Deployment Report, Post-Deployment Observation, Pilot Access Security Report, Release Manifest) | Documentation only |

> **Scope implication:** no application code changed between `3bcb90c` and `35fa06b` other than adding `PilotGrantSecurityTests.cs`. The "release candidate" therefore corresponds to the codebase as of `3bcb90c` (or earlier); `35fa06b`/`fe3eb86` differ only by documents and one test file.

---

## 3. Release Commit Attribution Failure — Detail

Incoming tasking states *Reported Release Commit `35fa06b`, Reported Parent Baseline `3bcb90c`*. The Phase 7.9 documents themselves state *Release Commit `3bcb90c8a52e008101a1829e1db7f7b3b3a726ea`*. All three are mutually inconsistent:

1. **`35fa06b` exists** and is HEAD — but it is the *release-documentation commit*, not a code release snapshot.
2. **`3bcb90c8a52e…` does not exist.** Someone recorded a plausible-looking but wrong full SHA. Only the 7-character prefix collides with a real commit whose full SHA is `3bcb90c39a146e…`.
3. **`3bcb90c` is not the parent of `35fa06b`**; the parent is `fe3eb86`.

No re-executable provenance anchor for `v0.7.0` exists: there is **no git tag, no CI run record, and no build manifest digest** tying compiled artifacts to any specific commit.

---

## 4. Release Manifest Reconciliation (`PHASE_7_9_RELEASE_MANIFEST.md`)

| Manifest Claim | Verification | Result |
| :--- | :--- | :--- |
| Release commit `3bcb90c8a52e…` | Not in object DB | **FAIL** |
| Web build `.next/standalone` via `npm run build:web` | No standalone output shipped in repo; rebuild appears clean (see Regression Report) | Executable but untraceable to a digest |
| Backend `bin/Release/net8.0/publish/` via `dotnet publish -c Release` | No published artifact retained | Untraceable |
| "13 EF Core SQL scripts, Migration 0001–0013" as `20261028_0001_InitialIdentity … 20261105_0013_AnalyticsAndReporting` | Migration IDs in `__EFMigrationsHistory` (both `prepford` and `prepford_staging_restore_drill`): `20261026120000_CreateProgrammes, 20261027150000_AddMasterDomainModels, 20261028090000_AddUserProfileImages, 20261029100000_HarmonizeBackendSchema, 20261031100000_AddStudyStudioFlashcards, 20261102060000_AddQuestionTypeCapabilityAndStatus, 20261103054224_AddAttemptQuestionSetAndGradingState, 20261103092621_AddExaminationLifecycleAndSnapshot, 20261103120000_AddExamQuestionMembershipUniqueIndex, 20261104200000_AddSessionSecurityAndDeviceManagement, 20261105090932_AddPhase1SecurityAndGovernance, 20261105105042_0011_AddCurriculumTaxonomyAndQuestionBank, 20261105133831__0012_AddExaminationConfigurationAndPolicies` | **FAIL — fabricated list.** Count (13) coincidentally matches DB (12 repo dirs + 1 legacy entry) |
| Environment block `JwtSettings__SecretKey/Issuer/Audience/ExpiryMinutes=120`, `GatewaySecurity__InternalKey`, `Stripe__SecretKey`, `ALLOW_LIVE_STRIPE`, `COMMERCIAL_MODE`, `Cors__AllowedOrigins` | None of these keys are read by any current API code. Session policy is DB-driven (`SessionSecurityPolicies`), not `JwtSettings`. Stripe gating is via `APP_ENV` + `ENABLE_MOCK_CHECKOUT` (`ICheckoutService.cs:99–115, 144–153`) | **STALE / FABRICATED** |
| Migration command `.output ../migrate` EF bundle | Matches root `package.json db:generate` | Plausible |

---

## 5. Deployment / Governance Document Cross-Check

| Document | Commit cited | Consistent? |
| :--- | :--- | :--- |
| `PHASE_7_9_ACCEPTANCE_REPORT.md` | `3bcb90c8a52e…` | No |
| `PHASE_7_9_RELEASE_MANIFEST.md` | `3bcb90c8a52e…` | No |
| `PHASE_7_9_DEPLOYMENT_AUTHORIZATION_RECORD.md` | `3bcb90c8a52e…` | No |
| `PHASE_7_9_DEPLOYMENT_REPORT.md` | `3bcb90c8a52e…` | No |
| Gate G1 claim ("Commit `3bcb90c`") | Short ref of unrelated dictionary-doc commit | No |

The acceptance report additionally claims G1 PASS on the basis of this wrong commit — see Gate Matrix re-assessment.

---

## 6. Test Evidence Attribution

- **No CI evidence for this branch's tip exists in the repository.** `.github/workflows/ci.yml` triggers only on push/PR against `main`; there are no stored CI run artifacts for `feature/dotnet-backend-migration` tip.
- Phase 7.9 claims therefore rely on local runs that were never committed, per Section 2's rule that test counts not be copied without re-execution. All suites were **re-executed at HEAD `35fa06b`** during this audit — see `PHASE_7_9_1_REGRESSION_VERIFICATION.md` for exact commands, exit codes and counts.
- Backend totals were re-run and are **approximately** as claimed (458 found) but with 2 environmental failures prior to test-database cleanup (see Regression Report).
- The `426 unit + 32 live Postgres = 458` arithmetic in the acceptance report is internally contradicted by its own gate matrix (§2 claims 426/426 and 32/32 separately, §3 claims 458 total). Actual counts: see Regression Report.

---

## 7. Environment Configuration Facts

- `apps/api/appsettings.json` contains only Logging / AllowedHosts / `DATABASE_URL`.
- `.env` (local dev): `POSTGRES_*`, `DATABASE_URL=postgresql://…@localhost:5432/preford?schema=public` — the **local dev authority is `prepford` on PostgreSQL 18.6 (native workstation)**, not the 16-alpine container (Docker is not even installed on this machine; `docker` command not found).
- Compose stack (`compose.yaml`) targets `postgres:16-alpine` — declared authority. No container was running at audit time; all live database evidence in this audit comes from the workstation PostgreSQL 18.6 instance.
- The manifest's `ConnectionStrings__DefaultConnection` block, Stripe keys and CORS origins are **proposal values**, not verified configuration.

---

## 8. Provenance Verdict

**UNSATISFACTORY — the release identity is not demonstrable.**

Whatever the achieved code and test quality, v0.7.0 currently cannot be attributed to a specific commit, tag, CI run, or build digest. The recorded commit SHA is fabricated, the parent-baseline claim in the tasking conflicts with the repository, no tag exists, and the manifest's migration and environment claims do not match the system as inspected.

**Required correction before Product Owner authorization (minimum package):**
1. Determine which code commit is the actual release candidate (recommend: `fe3eb86`, the last commit containing the only code change in the delta, or re-create release docs atop its chosen code commit).
2. Tag that commit as `v0.7.0` and record the full SHA, parent, and author-dated release manifest regenerated from `git show`.
3. Correct the manifest migration sequence and environment block to match the real `__EFMigrationsHistory` IDs and `appsettings`/code-read keys.
4. Re-run all suites at the tagged commit and attach per-suite outputs/trx to the release package.

This audit does not modify any of the above; corrections are recorded as the outstanding corrective action in the Final Release Gate Matrix (G1 = FAIL as evidenced now).
