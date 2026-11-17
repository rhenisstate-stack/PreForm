# PREPFORD — LIVE AUTHENTICATION ROUND-TRIP REPORT

**Date:** 2026-11-17 (Updated Phase 16 — Pre-Auth Config & TLS Re-Verified; Positive `WEBSITE_12` Lifecycle Still Blocked on Credentials)  
**Upstream Endpoint:** `https://explicitbackend.com` (`TLSv1.3`, valid Let's Encrypt cert; production `/api/castoline/config-status` now reports `isHttpsBackend: true` with `warnings: []`)  
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
| Invalid session cookie (`prepford_casto_line=invalid.session.token`) | `GET https://www.prepford.com/api/castoline/auth/me` (live BFF) | `401 Unauthorized` (`Cache-Control: no-store`, `errorCode: "UNAUTHORIZED"`, `X-Vercel-Id: bom1::iad1::9dwtg-1794907058420-0457be0f3ca6`) |
| Unauthenticated / replayed same-origin logout | `POST https://www.prepford.com/api/castoline/auth/logout` (live BFF) | `200 OK` (`Cache-Control: no-store`, `"Signed out locally."`, clears `prepford_casto_line`, `prepford_casto_badge`, `prepford_casto_dashboard` with `Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Secure; HttpOnly; SameSite=lax`) |
| Cross-site logout (`Origin: https://evil.example`) | `POST https://www.prepford.com/api/castoline/auth/logout` (live BFF) | `403 Forbidden` (`Cache-Control: no-store`, `"Request origin mismatch."`, `X-Vercel-Id: bom1::iad1::6zq4t-1794907088699-084993ce20e2`) |

---

## 2. Positive Authenticated Round-Trip (External Dependency)

- **Status:** **UNVERIFIED / BLOCKED_EXTERNAL_DEPENDENCY (Phase 16)**
- **Reason:** Inspected `.env`, `.env.local`, `apps/web/.env.local`, `.gitignore` (`.env` / `.env.*` excluded), and process environment variables; no authorized `WEBSITE_12` PrepFord integration test account credentials are present locally. Per policy, NURVIA/Qlex-Nursing (`WEBSITE_11`) credentials were not reused, real learner credentials were not used, and unauthorized production accounts were not created.
- **Provisioning Request:** Request an authorized administrator to provision one dedicated `WEBSITE_12` integration test user in LexmaCasto (role: `Learner`) and supply its credentials via a secure channel to execute the 12-step login -> `/api/castoline/auth/me` -> `/api/castoline/auth/logout` -> `401` lifecycle test.
