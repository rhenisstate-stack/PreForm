# PREPFORD — LIVE AUTHENTICATION ROUND-TRIP REPORT

**Date:** 2026-11-16 (Updated Phase 11)  
**Upstream Endpoint:** `https://explicitbackend.com` (`TLSv1.3`, valid Let's Encrypt cert)  
**Website Identity:** `WEBSITE_12` (`https://www.prepford.com/`)

---

## 1. Negative & Boundary Verification Results

| Scenario | Target | Observed Status / Result |
|---|---|---|
| Missing Casto session headers | `GET https://explicitbackend.com/api/castoline/system/user/list/current?fetchtype=current` | `401 Unauthorized` (`{"error":"Missing Casto authentication headers"}`) |
| Invalid/expired Casto session headers | `GET https://explicitbackend.com/api/castoline/system/user/list/current?fetchtype=current` | `401 Unauthorized` (`{"error":"Invalid or expired Casto session"}`) |
| Incorrect login credentials | `POST https://explicitbackend.com/api/castoline/auth/login` | `401 Unauthorized` |
| Cross-site POST (`sec-fetch-site: cross-site` / mismatched `Origin`) | `POST /api/castoline/auth/login` (BFF) | `403 Forbidden` (`lexmacasto-integration.test.ts`) |
| Invalid website identity (`WEBSITE_11`) | `lexmaCastoRequest()` | `503 Service Unavailable` (`MISSING_APP_IDENTITY`, fail-closed) |
| Unknown strata resource / unauthenticated `examsLive` | `GET /api/castoline/strata/{hacked\|examsLive}` | `404` / `401` (`lexmacasto-integration.test.ts`) |

---

## 2. Positive Authenticated Round-Trip (External Dependency)

- **Status:** **UNVERIFIED / BLOCKED_EXTERNAL_DEPENDENCY**
- **Reason:** No authorized `WEBSITE_12` PrepFord integration test account credentials have been supplied. Per policy, NURVIA/Qlex-Nursing credentials were not reused, real learner credentials were not used, and unauthorized production accounts were not created.
- **Provisioning Request:** Request an authorized administrator to provision one dedicated `WEBSITE_12` integration test user in LexmaCasto (role: `Learner`) and supply its credentials via a secure channel to execute the 12-step login -> `/api/castoline/auth/me` -> `/api/castoline/auth/logout` -> `401` lifecycle test.
