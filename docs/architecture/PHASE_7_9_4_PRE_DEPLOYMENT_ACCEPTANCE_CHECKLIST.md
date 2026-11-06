# PREPFORD NCLEX — PHASE 7.9.4
## WORK PACKAGE M: PRE-DEPLOYMENT ACCEPTANCE AND VERIFICATION CHECKLIST

**Document ID:** `PHASE_7_9_4_PRE_DEPLOYMENT_ACCEPTANCE_CHECKLIST.md`  
**Phase:** Phase 7.9.4 — Controlled Institutional Pilot Authorization, Deployment Governance & Operational Readiness  
**Release Candidate Commit:** `58aa98221ac9b2bd1106a9715749011ddaa90ed3` (Base: `6d33fc5`)  
**Commercial Mode:** Controlled Institutional Pilot (`pilot_grant`) — Live Stripe Disabled  
**Deployment Authority:** PrepFord Product Owner  
**Date of Audit:** 2026-11-06  

---

## 1. Executive Summary & Verification Rules

```
==================================================================================================
                                    CHECKLIST VERIFICATION RULE:
  DO NOT MARK ANY CHECKBOX COMPLETE WITHOUT EMPIRICAL EVIDENCE.
  This checklist separates technical evidence already verified in software from operational and
  governance items awaiting formal Product Owner or institutional decisions.
==================================================================================================
```

Work Package M serves as the executable gatekeeper for the controlled institutional pilot deployment. Every gate must be independently reconciled before ingress traffic is opened to candidates.

---

## 2. Definitive Pre-Deployment Verification Checklist

### 2.1 Source Code Baseline & Provenance
- [x] **Release Candidate SHA Confirmed:** Verified at `58aa98221ac9b2bd1106a9715749011ddaa90ed3` (Base: `6d33fc55b1ec42be13f60f3b2cb19cebadf34ce0`).
- [x] **Working Tree Verified:** `git status` reports 100% clean (0 uncommitted, 0 untracked files).
- [x] **Upstream Remote Synchronized:** In sync with `preform/feature/dotnet-backend-migration`.
- [x] **Codebase Preservation:** Verified zero diff across `apps/`, `packages/`, `tools/` between `6d33fc5` and `58aa982`.
- [x] **Tag Policy Honored:** Git tag `v0.7.0` has **NOT** been created; proposal prepared awaiting written authorization.

### 2.2 Technical Build & Test Verification
- [x] **Backend C# Compilation:** `dotnet build Preform.Api.csproj` passed with 0 Warnings and 0 Errors.
- [x] **Backend Test Project Compilation:** `dotnet build Preform.Api.Tests.csproj` passed with 0 Errors.
- [x] **Backend Automated Regression:** 474/474 backend unit and integration tests passed (Phase 7.9.3 TRX archived).
- [x] **Frontend TypeScript Verification:** `npm run typecheck` passed with 0 Errors (`tsc --noEmit` clean).
- [x] **Frontend Automated Regression:** 514/514 Vitest frontend unit and component tests passed (Phase 7.9.3 verified).
- [x] **Next.js Production Build:** `npm run build:web` independently reproduced with exit code 0 (139 static pages prerendered).
- [x] **Zero SQLite Dependencies:** `verify:no-sqlite` scanned 480 files; 0 SQLite runtime dependencies detected.
- [x] **Brand Consistency Guard:** `verify:brand` scanned 699 files; 0 un-allowlisted brand leaks detected.
- [x] **Security Test Integrity:** Entitlement lifecycle (8/8), Two-tier reauth (6/6), Distributed rate limit (4/4), BFF session sync (18/18), and Session concurrency (12/12) tests passed.

### 2.3 PostgreSQL 16 Persistence & Migration Chain
- [x] **PostgreSQL 16 Engine Authority:** Persistent engine verified as PostgreSQL 16.
- [x] **Migration Chain Lineage:** Exactly 14 sequential migrations verified in `apps/api/Migrations/`.
- [x] **Database Catalog Harmony:** `__EFMigrationsHistory` verified in PostgreSQL matching all 14 migrations.
- [x] **Relational Security Indexes:** Partial unique indexes `idx_user_subscriptions_active_unique` and `idx_payment_transactions_provider_event_id` verified active in PostgreSQL catalog.
- [x] **Disaster Recovery Restore Drill:** Staging restore drill verified on `prepford_staging_restore_drill` (RTO = 4m 12s, RPO $\le$ 1 hour).
- [ ] **Production Pre-Deployment Backup:** `[ ] PENDING EXECUTION` (Must be executed immediately prior to deployment).
- [x] **Migration Ownership Policy:** Defined migration runner established; multi-instance startup races documented.

### 2.4 Security & Cryptographic Configuration
- [x] **Zero Committed Production Secrets:** Scanned repository; zero live production secrets found.
- [x] **Fail-Closed Runtime Guards:** `GATEWAY_SHARED_SECRET` and `SESSION_SECRET` abort boot in production if unconfigured.
- [x] **BFF Inter-Service HMAC Authentication:** Timing-safe `CryptographicOperations.FixedTimeEquals` with 300s replay window.
- [x] **Client Bundle Sanitization:** No server secrets prefixed with `NEXT_PUBLIC_` or exposed in client bundles.
- [x] **Session Cookie Hardening:** Candidate cookies configured with `HttpOnly; Secure; SameSite=Lax; Path=/`.
- [x] **Trusted Ingress Proxy Options:** Forwarded headers restricted strictly to configured IP ranges (`ForwardLimit=1`).
- [x] **CORS Origin Whitelisting:** Restricted to explicit `WEB_ORIGIN` domain without permissive wildcards.
- [ ] **Production Vault Secret Provisioning:** `[ ] PENDING PRODUCT OWNER AND DEVOPS EXECUTION`.

### 2.5 Institutional Governance & Candidate Data Protection
- [x] **Governance Realities Acknowledged:** Confirmed candidate consent table and automated retention sweeps remain unimplemented in DB.
- [x] **Data Processing Roles Delineated:** Institution designated as Data Controller; PrepFord designated as Data Processor.
- [ ] **Participating Institution Identified:** `[ ] PENDING PRODUCT OWNER DECISION`.
- [ ] **Institutional Pilot DPA Executed:** `[ ] PENDING PRODUCT OWNER AND UNIVERSITY SIGN-OFF`.
- [ ] **Candidate Roster Whitelist Approved:** `[ ] PENDING INSTITUTIONAL COORDINATOR APPROVAL`.
- [ ] **Pilot Privacy Notice & Student Disclosure Approved:** `[ ] PENDING INSTITUTIONAL LEGAL APPROVAL`.
- [x] **Candidate Onboarding Lifecycle Defined:** 12-stage lifecycle runbook prepared.
- [x] **Incident Response & Pilot Stop Policy Established:** 10 stop conditions and 14 incident procedures approved.

### 2.6 Commercial Mode & Entitlement Boundaries
- [x] **Commercial Mode Active:** `COMMERCIAL_MODE=pilot_grant`.
- [x] **Live Stripe Uninstalled:** `Stripe.net` package removed; real credit card processing hard-disabled.
- [x] **Public Exam Registration Disabled:** Public self-registered users cannot access exams without an explicit pilot grant.
- [x] **No Real Grants Issued:** No live pilot grants issued prior to formal deployment authorization.

### 2.7 Deployment Authority & Operational Windows
- [ ] **Deployment Lead Designated:** `[ ] PENDING PRODUCT OWNER APPOINTMENT`.
- [ ] **Deployment Window Scheduled:** `[ ] PENDING PRODUCT OWNER AND INSTITUTIONAL APPROVAL`.
- [ ] **Maintenance Banner Pre-Staged:** `[ ] READY FOR ACTIVATION`.
- [ ] **Product Owner Written Deployment Authorization:** `[ ] PENDING EXPLICIT PRODUCT OWNER SIGNATURE`.

---

## 3. Pre-Deployment Verification Summary

```
==================================================================================================
                                    CHECKLIST STATUS SUMMARY:
  • Technical & Architectural Readiness: 100% SATISFIED (All build, test, and code gates passed)
  • Security & Persistence Integrity:    100% SATISFIED (Zero leaks, 14 migrations verified)
  • Operational Infrastructure Provisioning: PENDING PRODUCT OWNER DECISION
  • Institutional DPA & Cohort Approval:     PENDING PRODUCT OWNER & INSTITUTIONAL DECISION
  • Final Written Deployment Authorization:  PENDING EXPLICIT PRODUCT OWNER SIGNATURE
==================================================================================================
```

Ingress traffic to candidate cohorts must remain blocked until all pending operational, institutional, and authorization gates are signed off.
