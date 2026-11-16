# PREPFORD — LIVE AUTHENTICATION ROUND-TRIP REPORT

**Date:** 2026-11-16  
**Upstream Endpoint:** `https://explicitbackend.com`  
**Website Identity:** `WEBSITE_12` (`https://www.prepford.com/`)

---

## 1. Negative & Boundary Verification Results

| Scenario | Target | Observed Status / Result |
|---|---|---|
| Missing Casto session headers | `GET https://explicitbackend.com/api/castoline/system/user/list/current?fetchtype=current` | `401 Unauthorized` (`{"error":"Missing Casto authentication headers"}`) |
| Invalid/expired Casto session headers | `GET https://explicitbackend.com/api/castoline/system/user/list/current?fetchtype=current` | `401 Unauthorized` (`{"error":"Invalid or expired Casto session"}`) |
| Incorrect login credentials | `POST https://explicitbackend.com/api/castoline/auth/login` | `401 Unauthorized` |
| Cross-site POST (`sec-fetch-site: cross-site` / mismatched `Origin`) | `POST /api/castoline/auth/login` (BFF) | `403 Forbidden` (verified in `lexmacasto-integration.test.ts`) |
| Invalid website identity (`WEBSITE_11`) | `lexmaCastoRequest()` | `503 Service Unavailable` (`MISSING_APP_IDENTITY`, fail-closed) |
| Unknown strata resource / unauthenticated `examsLive` | `GET /api/castoline/strata/{hacked\|examsLive}` | `404` / `401` (verified in `lexmacasto-integration.test.ts`) |

---

## 2. Positive Authenticated Round-Trip (Blocked External Dependency)

- **Status:** **UNVERIFIED / BLOCKED_EXTERNAL_DEPENDENCY**
- **Reason:** No dedicated, authorized PrepFord (`WEBSITE_12`) integration test account credentials are available. Per policy, NURVIA/Qlex-Nursing credentials were not reused, real learner credentials were not used, and unauthorized production accounts were not created.
- **Outstanding Action:** Provision a dedicated `WEBSITE_12` integration test user in LexmaCasto and execute `POST /api/castoline/auth/login` -> `GET /api/castoline/auth/me` -> `POST /api/castoline/auth/logout` -> `GET /api/castoline/auth/me` (`401`).
