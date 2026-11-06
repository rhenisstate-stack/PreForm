# PrepFord NCLEX — Phase 7.9.1 Operational Acceptance Report

**Document:** `PHASE_7_9_1_OPERATIONAL_ACCEPTANCE_REPORT.md`
**Execution Milestone:** Phase 7.9.1 — Final Pre-Authorization Verification, Session Policy Reconciliation & Release Evidence Closure
**Verification Date:** November 6, 2026
**Verification Authority:** Independent Phase 7.9.1 Audit (this exercise)
**Decision Authority:** PrepFord Product Owner (unassigned — remains open)

---

## 1. Final Determination

$$\mathbf{NOT\ READY\ —\ MATERIAL\ DEFECTS\ AND\ DOCUMENTARY\ INTEGRITY\ GAPS\ REMAIN}$$

Release candidate `v0.7.0` is **not** in a state where it can be submitted for Product Owner deployment authorization. The underlying platform is substantially real and technically competent — the session engine, assessment security and backend test machinery verify well. But the release package, as held at commit `35fa06b`, is undermined by:

1. **A failed production web build** (deterministic, reproduces on clean cache);
2. **A frontend test suite that does not pass** (both as committed → 16 failures, and with backend live → 11 persistent failures);
3. **A commercial enforcement gap** (pilot-grant revocation/expiry not enforced on exam-related requests — the commercial pilot model's own boundary);
4. **Fabricated or overstated evidence** in the Phase 7.9 documents (nonexistent release SHA, wrong backup checksum, invented parity table, overstated Stripe fail-closed mechanism, fabricated migration names, unverifiable performance claims);
5. **No reproducible release identity** (no tag, no CI record, no build digest, docs citing a commit SHA that has never existed).

No production deployment action has been taken or is implied. **Only a separate, explicit written Product Owner authorization may initiate the controlled production deployment workflow.** The Phase 7.9 acceptance report's "READY FOR PRODUCT OWNER DEPLOYMENT AUTHORIZATION" is **revoked by this re-assessment.**

---

## 2. Verified Facts (summary with exact values)

| Item | Verified state at HEAD `35fa06b067319e…` |
| :--- | :--- |
| Release commit | `35fa06b` exists, is HEAD, docs-only (`PilotGrantSecurityTests.cs` is the only code addition in the "release delta" since `3bcb90c`); **parent is `fe3eb86`**, not `3bcb90c` as tasked; no `v0.7.0` tag anywhere |
| Working tree | Clean at audit start; at close contains only new `PHASE_7_9_1_*.md` deliverables + one status banner edit (documented); scratch/log files untracked |
| Backend tests | **458/458 passing** (1 m 44 s first attempt 456/458 — 2 environmental failures on a stale test DB; 3 m 04 s final green TRX committed to `artifacts/phase791-test-results/`) |
| Frontend tests | **497/513 passing cold (16 failures / 8 files); 11 failures persist with backend live; "513/513" claim NOT reproducible** |
| TypeScript | 0 errors (`tsc --noEmit` exit 0) |
| Production build | **`npm run build:web` FAILS at `/_global-error` prerender** (`TypeError: Cannot read properties of null (reading 'useContext')`, 0/139 pages; deterministic on clean cache) → release-impossible as-is |
| Lint | 348 errors / 3,299 problems |
| Architecture guards | SQLite guard: 0 refs / 472 files ✅; brand check ✅ |
| Database & migrations | PostgreSQL 16 = declared authority (compose, CI); **actual drill/workstation engine 18.6**; `prepford` = 37 tables; **13 applied migrations** (12 tracked + 1 legacy `20261103054224_AddAttemptQuestionSetAndGradingState`); restored `prepford_staging_restore_drill` identical (37/37 tables row-identical, same 13 migration rows, 39 FKs, 2 sequences); release manifest's migration list is fabricated |
| Session policy (G13) | **Resolved**: `SessionSecurityPolicies.global_policy` → MaxConcurrentSessions=**2**, MaxSessionsPerClient=**1** (same-client rotation), idle 300 min sliding / absolute 7 days (effective=min), enforced per-request via DB + `pg_advisory_xact_lock` across instances; new login rejected at limit (409/403); revocation/suspension/password-change all immediate; **the deliberate-vs-involuntary reauth tiers are documented but unenforced, with a pending owner decision** on the mid-exam admin-revocation bypass; rate limiters process-local/X-Forwarded-For spoofable |
| DR evidence scope | Backup real & SHA-verified (35321C2B…; sidecar + Phase 6 report agree); 7.9 docs record a **wrong** checksum (4D3FEA…); RTO 4m11s timeline plausible; **RPO claim methodologically invalid** (51 s measures backup→drill gap; effective RPO = backup cadence, no WAL archiving); raw restore log not archived; live parity re-verified but dataset is a near-empty bootstrap (1 question / 0 attempts) |
| Performance evidence | No load-test tooling/raw outputs exist anywhere; "38 ms P95 @ 100 candidates" and "500-candidate capacity" = **reported but unverified** |
| Payment boundary | No Stripe code exists (cannot be enabled by any env/frontend/request/config change — nothing to enable); production checkout fails closed per request via `APP_ENV`; **no startup 503 gate exists** (claim false); webhook has committed fallback secret + unsigned-pass in non-prod |
| Pilot grants | Issued/revoked `RequireAdmin`-gated with actor-attributed audit rows ✅; duplicate protection race-prone (no unique index); **revocation/expiry NOT enforced on exam-related requests** (StartAttempt/resume/delivery have no entitlement check; pathway is client-controlled) → the G10 premise "server-authoritative entitlement" is false at code level |
| Candidate data governance | Privacy notice exists; **no server-side consent record; no deletion/erasure/retention implementation; raw IP/UA despite notice claim; no read-audit trail; unrestricted planned post-licensure linkage** → institutional/regulatory questions remain external approval items |
| Deployment governance | Authorization record correctly unsigned; cutover HELD; observation protocol now banner-marked `NOT EXECUTED — AWAITING EXPLICIT PRODUCT OWNER AUTHORIZATION`; six-stage chain kept distinct; but decision block single-box conflation and wrong SHA repeat across all four documents |

**G13 result: CONDITIONAL** (core verified; interruption-policy decision and three code-level hardening items outstanding).
**Gate tally: 4 FAIL (G1, G7, G8, G10), 1 OPEN (G4), 6 CONDITIONAL (G2, G3, G6, G11, G13, G14), 5 PASS (G5, G9, G12, G15 + data-governance noted separately).** See `PHASE_7_9_1_FINAL_RELEASE_GATE_MATRIX.md`.

---

## 3. Open Risks (ranked)

| # | Risk | Severity | Owner-action |
| --- | :--- | :--- | :--- |
| R1 | Production build broken (`/_global-error` prerender) — cannot produce deployable artifacts | **Critical** | Dedicated Next 16/React 19.3 fix cycle per `apps/web/AGENTS.md` guidance |
| R2 | Entitlement not enforced server-side on exam access; revoked/expired grants keep access; BFF fallback layer can manufacture entitlement display | **High (commercial)** | Implement per-request entitlement guard on exam surfaces (DB-read each request, incl. revoked/expiry), correct BFF fallback |
| R3 | Evidence-integrity pattern across Phase 7.9 documents (SHA, checksum, parity table, migration names, enforcement claims) | **High (governance)** | Regenerate acceptance package from audited facts; hold all deployment docs to artifact attribution |
| R4 | Frontend suite green-claim unproducible; 11 persistent failures including security-settings UI drift | **High (quality signal)** | Triage root causes (UI drift/seed/environment); restore to green with committed env recipe |
| R5 | Session reauth "two-tier policy" unenforced + pending owner decision (mid-exam admin-revocation bypass); spoofable process-local rate limiter; BFF cookie-trust fallback | **Medium (security)** | Owner decision + minimal hardening per Session Audit §5 |
| R6 | DR: RPO misframed, restore logs unarchived, engine mismatch vs 16-authority, no production-scale re-drill | **Medium (operational)** | RPO restatement, log retention, `--jobs 4` scale re-drill ≥500 attempts |
| R7 | Webhook fail-open in non-prod + committed fallback secret; duplicate-grant/handling races (no unique indices) | **Medium (pre-Phase-8)** | Fail closed in all envs; remove fallback secret; add partial unique indexes |
| R8 | Data governance: consent/erasure/retention unimplemented; unrestricted post-licensure intent | **Medium (regulatory)** | Legal review + implement consent records & deletion pipeline before real candidate data |
| R9 | Performance claims unverifiable | **Low (marketing integrity)** | Reclassify; build committed load-test kit |
| R10 | Overall release identity (no tag/CI/build digest) | **Process** | Tag + attribut evidence |

---

## 4. External Approvals Required (not engineering-closable)

1. **Legal/regulatory (qualified review):** processing bases (GDPR/Kenya DPA 2019), child-data treatment, educational-record custody rules, retention-period specificity, DSAR/erasure SLAs, cross-border transfer posture.
2. **Post-licensure correlation program:** data-sharing agreement + candidate consent instrument + de-identification thresholds — must not begin without those.
3. **Stripe merchant underwriting + production key handling + webhook HMAC scheme conformance** (required only before Phase 8 public launch).
4. **Product Owner decisions** explicitly reserved: acceptance of operational limitations (DR scale, simulation-only evidence), the two-tier interruption-policy ratification, admin-vs-superadmin grant issuance authority.

---

## 5. Path to READY (minimum gate-clearance package)

Executing the following converts the four FAIL gates and loads the CONDITIONAL set:

1. **R1:** fix the web production build; re-run `npm run build:web` to green and commit page count/output evidence.
2. **R4:** triage the 11 persistent frontend failures; produce a passing Vitest baseline with a committed environment recipe (live-API env variables documented or mocks aligned).
3. **R2:** implement per-request server-side entitlement enforcement on exam surfaces with revoked/expiry handling + regression tests; add unique partial indexes; correct G10.
4. **R3 + G1:** pick the code release commit, tag `v0.7.0`, regenerate every Phase 7.9/7.9.1 document (manifest, acceptance, authorization record) from audited facts; commit test/build/DB artifacts under `artifacts/`.
5. **G13 conditions:** owner decision + encode or de-claim the two-tier policy; distributed or documented rate limiter; BFF fail-closed fallback.
6. **G2/G3/G4:** re-drill with archived raw logs, corrected RPO statement, regenerated parity table from the actual schema; verify on PostgreSQL 16 (container) when Docker is available.
7. **G14:** commit a load-test kit; run 100-user baseline; defer 500-user capacity until measured.
8. **Regenerate acceptance: after the above, prepare a fresh authorization package for the Product Owner.**

No corrective coding was performed in this phase beyond documentation (the banner); G12/G5/G9/G15 verified without changes. No tests were modified to produce results. No production data, grants, credentials, traffic or environment variables were touched.

---

## 6. Standing Human-Authorization Boundary

Even when all gates clear, deployment may **only** begin upon a separate, explicit, written Product Owner authorization recorded against the regenerated release package. This report is not that authorization. No production deployment, migration application, traffic cutover, pilot-grant issuance, Stripe enablement, public registration opening, or public-launch declaration is authorized or performed by this exercise.

---

*Phase 7.9.1 closes as: **NOT READY — MATERIAL DEFECTS AND DOCUMENTARY INTEGRITY GAPS REMAIN.** The honest open-gate posture adopted here supersedes the previous manufactured 15/15 result.*
