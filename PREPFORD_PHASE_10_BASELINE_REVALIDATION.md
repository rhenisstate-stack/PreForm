# PREPFORD — PHASE 10 BASELINE REVALIDATION

**Date:** 2026-11-16  
**Branch:** `feature/dotnet-backend-migration`  
**HEAD Commit:** `b29c448` (`docs(phase7): add Phase 7 complete engineering remediation report`)  
**Workspace:** `c:\Users\gitau\Documents\PREform`

---

## 1. Scope & Baseline Verification

Revalidated the six previously generated integration reports (`PREPFORD_QLEX_INTEGRATION_AUDIT.md`, `PREPFORD_WEBSITE_IDENTITY_REPORT.md`, `PREPFORD_BACKEND_INTEGRATION_REPORT.md`, `PREPFORD_SECURITY_VERIFICATION_REPORT.md`, `PREPFORD_LIVE_INTEGRATION_VERIFICATION.md`, `PREPFORD_QLEX_INTEGRATION_FINAL_ACCEPTANCE_REPORT.md`) and current repository state.

---

## 2. Revalidation Evidence

- **Git State**: Clean integration baseline on `feature/dotnet-backend-migration` at `b29c448` with `WEBSITE_12` BFF and `src/lib/lexmacasto/` intact.
- **Configuration Integrity**:
  - `SKEW_LINE_APP_KEY='WEBSITE_12'`
  - `SKEW_LINE_APP_DOMAIN='https://www.prepford.com/'`
  - `SKEW_LINE_APP_NAME='Prepford'`
  - `SKEW_LINE_APP_TITLE='Prepford'`
  - Zero fallback to `WEBSITE_1` or `WEBSITE_11`; PrepFord ASP.NET Core 8 API (`resolvePrepfordApiBaseUrl()`) remains isolated from LexmaCasto (`resolveSkewLineBaseUrl()`).
- **Automated Test Revalidation**:
  - Command: `npm test --workspace @prepford/web -- tests/remote-backend-config.test.ts tests/lexmacasto-integration.test.ts tests/frontend-api-client-migration.test.ts tests/bff-session-synchronization.test.ts tests/security-regressions.test.ts tests/session-integrity.test.ts`
  - Result: **6/6 test files passed, 76/76 tests passed**.

---

## 3. Blockers Identified at Baseline

1. Plaintext HTTP upstream (`http://108.61.9.189:8008`) — addressed in Phase B.
2. Unverified live authenticated round-trip (no authorized `WEBSITE_12` test account) — addressed in Phase C.
3. 31 GateB PostgreSQL tests unexecuted (`PREFORM_GATEB_TEST_CONNECTION_STRING` unset) — addressed in Phase D.
4. Vercel production environment & deployment pending — addressed in Phase E/F.
