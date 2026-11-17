# PREPFORD — LIVE AUTHENTICATION ROUND-TRIP REPORT

**Date:** 2026-11-17 (Updated Phase 12)  
**Upstream Endpoint:** `https://explicitbackend.com` (`TLSv1.3`, valid Let's Encrypt cert; re-probed `2026-11-17`: `GET /api/castoline/strata/main/categories/list/absolute?fetchtype=absolute` with `WEBSITE_12` returned `200 application/json; charset=utf-8`)  
**Website Identity:** `WEBSITE_12` (`https://www.prepford.com/`)

---

## 1. Negative & Boundary Verification Results

| Scenario | Target | Observed Status / Result |
|---|---|---|
| Missing Casto session headers | `GET https://explicitbackend.com/api/castoline/system/user/list/current?fetchtype=current` | `401 Unauthorized` (`{"error":"Missing Casto authentication headers"}`) |
| Invalid/expired Casto session headers | `GET https://explicitbackend.com/api/castoline/system/user/list/current?fetchtype=current` | `401 Unauthorized` (`{"error":"Invalid or expired Casto session"}`) |
| Incorrect login credentials | `POST https://www.prepford.com/api/castoline/auth/login` (live BFF) | `401 Unauthorized` (`Cache-Control: no-store`, `errorCode: "UNAUTHORIZED"`) |
| Missing required login fields | `POST https://www.prepford.com/api/castoline/auth/login` (live BFF `{}`) | `400 Bad Request` (`Cache-Control: no-store`, `Email is required.`) |
| Malformed JSON login body | `POST https://www.prepford.com/api/castoline/auth/login` (live BFF) | `400 Bad Request` (`Cache-Control: no-store`, `Invalid JSON request body.`) |
| Cross-site POST (`Origin: https://evil.example`) | `POST https://www.prepford.com/api/castoline/auth/login` (live BFF) | `403 Forbidden` (`Cache-Control: no-store`, `Request origin mismatch.`) |
| Invalid website identity (`WEBSITE_11`) | `lexmaCastoRequest()` | `503 Service Unavailable` (`MISSING_APP_IDENTITY`, fail-closed) |
| Unknown / protected strata resource | `GET https://www.prepford.com/api/castoline/strata/{hacked\|examsLive}` (live BFF) | `404` / `401` (`Cache-Control: no-store`) |

---

## 2. Positive Authenticated Round-Trip (External Dependency)

- **Status:** **UNVERIFIED / BLOCKED_EXTERNAL_DEPENDENCY**
- **Reason:** No authorized `WEBSITE_12` PrepFord integration test account credentials have been supplied. Per policy, NURVIA/Qlex-Nursing credentials were not reused, real learner credentials were not used, and unauthorized production accounts were not created.
- **Provisioning Request:** Request an authorized administrator to provision one dedicated `WEBSITE_12` integration test user in LexmaCasto (role: `Learner`) and supply its credentials via a secure channel to execute the 12-step login -> `/api/castoline/auth/me` -> `/api/castoline/auth/logout` -> `401` lifecycle test.
