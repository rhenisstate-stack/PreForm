# PREPFORD — PHASE 15 FINAL PRODUCTION ACCEPTANCE REPORT

**Date:** 2026-11-17  
**Repository:** `c:\Users\gitau\Documents\PREform` (`rhenisstate-stack/PreForm`)  
**Authorized Production Branch:** `preform/feature/dotnet-backend-migration` (`feature/dotnet-backend-migration`)  
**Latest Reported Commit (pre-Phase 15 docs):** `ceedc1c8a1ed9f6eef50da4dfc954f0456630b90`  
**Production Domain:** `https://www.prepford.com/`  
**Application Identity:** `WEBSITE_12`  
**Upstream Backend:** `https://explicitbackend.com`  
**Phase 15 Release Decision:** **CONDITIONALLY ACCEPTED** (External dependency: no authorized `WEBSITE_12` test account credentials are available locally; positive login lifecycle was not executed and was not fabricated.)

---

## 1. Account Provisioning Evidence (No Credentials Exposed)

- Inspected local configuration and environment sources without printing or logging any secret values:
  - `.env`, `.env.local`, `apps/web/.env.local`, and active process environment variables (`PREPFORD*`, `CASTO*`, `WEBSITE*`, `TEST*`, `VERCEL*`, `SKEW*`).
  - Existing test suite (`apps/web/tests/lexmacasto-integration.test.ts` and `apps/web/src/lib/lexmacasto/*`).
- **Finding:** No authorized `WEBSITE_12` test account email/password or session credentials exist in any untracked local secret file or environment variable.
- **Compliance:** Per policy, no NURVIA/Qlex-Nursing (`WEBSITE_11`) account was reused, no real learner credentials were used, and no unauthorized account was created.
- **Dependency Status:** **BLOCKED_EXTERNAL_DEPENDENCY** — awaiting an authorized LexmaCasto/Qlex-Nursing administrator to provision a dedicated non-production `WEBSITE_12` test account (minimum `Learner` permissions) in an untracked local secret file or approved secret manager.

---

## 2. Pre-Authentication TLS Verification

Executed `GET https://www.prepford.com/api/castoline/config-status` prior to any authentication attempt:

- **HTTP Status:** `200 OK` (`Cache-Control: no-store`, `Strict-Transport-Security: max-age=63072000`, `X-Vercel-Id: bom1::wzmm7-1794906963278-ef78833c84bc`)
- **Payload:**
  ```json
  {"valid":true,"appName":"Prepford","appTitle":"Prepford","appDomain":"https://www.prepford.com/","appKeyConfigured":true,"activeBackend":"dotnet","isHttpsBackend":true,"errors":[],"warnings":[]}
  ```
- **Direct Upstream TLS Check (`https://explicitbackend.com/api/castoline/strata/main/categories/list/absolute`):** `scheme=https`, `ssl_verify_result=0`, `http_code=400` (fail-closed without `WEBSITE_12` app headers).
- **Live BFF Connectivity (`GET https://www.prepford.com/api/castoline/strata/categories`):** `200 OK` (`Cache-Control: no-store`, `"Categories Fetched Successfully ⚓"`, `X-Vercel-Id: bom1::iad1::tdf2s-1794907054404-626947b916d2`).
- **Result:** **PASS** — production upstream HTTPS and certificate validation remain verified.

---

## 3. Positive Login Result

- **Status:** **NOT EXECUTED / BLOCKED_EXTERNAL_DEPENDENCY**
- **Reason:** No authorized `WEBSITE_12` test credentials are available. Credentials were not fabricated or guessed.

---

## 4. Cookie Attributes

- **Positive Login Session Establishment (`prepford_casto_line`, `prepford_casto_badge`, `prepford_casto_dashboard`):** **PENDING** (blocked on authorized `WEBSITE_12` login).
- **Observed Cookie-Clearing Attributes (`POST https://www.prepford.com/api/castoline/auth/logout`, same-origin):**
  - `prepford_casto_line=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Secure; HttpOnly; SameSite=lax`
  - `prepford_casto_badge=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Secure; HttpOnly; SameSite=lax`
  - `prepford_casto_dashboard=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Secure; HttpOnly; SameSite=lax`

---

## 5. Authenticated Identity Result (`/api/castoline/auth/me`)

- **Authenticated `GET /api/castoline/auth/me`:** **PENDING** (blocked on authorized `WEBSITE_12` login).
- **Unauthenticated / Invalid-Cookie Baseline:**
  - Without cookies: `401 Unauthorized` (`Cache-Control: no-store`, `{"success":false,"message":"Not authenticated.","errorCode":"UNAUTHORIZED"}`, `X-Vercel-Id: bom1::iad1::mnp7b-1794907057599-3d0db4df1a75`).
  - With forged cookie (`prepford_casto_line=invalid.session.token`): `401 Unauthorized` (`Cache-Control: no-store`, `{"success":false,"message":"Not authenticated.","errorCode":"UNAUTHORIZED"}`, `X-Vercel-Id: bom1::iad1::9dwtg-1794907058420-0457be0f3ca6`).

---

## 6. Protected Resource Authorization Result

- **Authenticated Role-Scoped Resource Check:** **PENDING** (blocked on authorized `WEBSITE_12` login).
- **Unauthenticated Protected Resource (`GET https://www.prepford.com/api/castoline/strata/examsLive`):** `401 Unauthorized` (`Cache-Control: no-store`, `{"success":false,"message":"Authentication is required for this resource."}`, `X-Vercel-Id: bom1::iad1::54bjx-1794907065953-4896ce865324`).

---

## 7. Logout and Cookie-Clearing Result

- **Authenticated Upstream Session Invalidation:** **PENDING** (blocked on authorized `WEBSITE_12` login).
- **Same-Origin Unauthenticated / Replayed Logout (`POST https://www.prepford.com/api/castoline/auth/logout`):**
  - `200 OK`, `Cache-Control: no-store`, `{"success":true,"message":"Signed out locally.","data":"Signed out locally."}`, `X-Vercel-Id: bom1::iad1::vpckb-1794907105414-00598f6ba398`.
  - Clears `prepford_casto_line`, `prepford_casto_badge`, and `prepford_casto_dashboard` with `Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Secure; HttpOnly; SameSite=lax`, returning no token to the browser.

---

## 8. Post-Logout 401 Result

- **Post-Authenticated-Logout `GET /api/castoline/auth/me`:** **PENDING** (blocked on authorized `WEBSITE_12` login).

---

## 9. Negative Security Checks (Live Production, `2026-11-17`)

| Check | Request | Observed Response | X-Vercel-Id |
|---|---|---|---|
| Invalid credentials | `POST /api/castoline/auth/login` (`Origin: https://www.prepford.com`) | `401 Unauthorized`, `Cache-Control: no-store`, `errorCode: "UNAUTHORIZED"` | `bom1::iad1::8h6cm-1794907087572-6fc7fbb0574c` |
| Invalid session cookie | `GET /api/castoline/auth/me` (`Cookie: prepford_casto_line=invalid.session.token`) | `401 Unauthorized`, `Cache-Control: no-store`, `errorCode: "UNAUTHORIZED"` | `bom1::iad1::9dwtg-1794907058420-0457be0f3ca6` |
| Missing/replayed logout session | `POST /api/castoline/auth/logout` (`Origin: https://www.prepford.com`) | `200 OK`, `Cache-Control: no-store`, `"Signed out locally."`, clears all 3 cookies | `bom1::iad1::vpckb-1794907105414-00598f6ba398` |
| Missing required body fields | `POST /api/castoline/auth/login` (`{}`) | `400 Bad Request`, `Cache-Control: no-store`, `"Email is required."` | `bom1::iad1::pvr2w-1794907061823-9876d865f634` |
| Malformed JSON body | `POST /api/castoline/auth/login` (`{not-json`) | `400 Bad Request`, `Cache-Control: no-store`, `"Invalid JSON request body."` | `bom1::iad1::p4v6x-1794907064424-d5496f301a0d` |
| Cross-origin login POST | `POST /api/castoline/auth/login` (`Origin: https://evil.example`) | `403 Forbidden`, `Cache-Control: no-store`, `"Request origin mismatch."` | `bom1::iad1::7prns-1794907065199-b829d394b876` |
| Cross-origin logout POST | `POST /api/castoline/auth/logout` (`Origin: https://evil.example`) | `403 Forbidden`, `Cache-Control: no-store`, `"Request origin mismatch."` | `bom1::iad1::6zq4t-1794907088699-084993ce20e2` |
| Unauthorized protected resource | `GET /api/castoline/strata/examsLive` | `401 Unauthorized`, `Cache-Control: no-store` | `bom1::iad1::54bjx-1794907065953-4896ce865324` |

*(Reused Phase 14 evidence where implementation is unchanged: `GET /api/castoline/strata/hacked` -> `404`, `22` deployed JS chunks -> `0` sensitive string leaks.)*

---

## 10. Deployment Metadata & Evidence Limitations

- **Expected Repository:** `rhenisstate-stack/PreForm`
- **Authorized Production Branch:** `feature/dotnet-backend-migration` (`preform/feature/dotnet-backend-migration`)
- **Production Domain:** `https://www.prepford.com/`
- **Evidence Limitation:** `VERCEL_TOKEN` is unset, and `.vercel/`, `~/.vercel`, and `%APPDATA%\com.vercel.cli\Data\auth.json` are absent locally. Exact Vercel dashboard Project Name, Deployment ID, Deployment Timestamp, and Deployed Commit SHA could not be queried via CLI and remain unverified from the Vercel dashboard.

---

## 11. Regression Results

- No application source code, tests, NCLEX-RN/PN, NGN question types, Study Studio, subscriptions/entitlements, Stripe/payment controls, PostgreSQL architecture, or `WEBSITE_12` / `https://explicitbackend.com` configuration were modified in Phase 15.
- Preserved verified baseline from Phases 11/12/14:
  - Phase 11 Vitest: `160/160` passed.
  - ASP.NET Core + GateB PostgreSQL: `646/646` passed.
  - SQLite runtime guard: passed (`0` SQLite runtime dependencies).
  - Phase 14/15 live production security probes: passed.

---

## 12. Final Release Decision

**CONDITIONALLY ACCEPTED**

Production upstream HTTPS (`isHttpsBackend: true`), certificate verification (`ssl_verify_result=0`), BFF connectivity, cookie-clearing policy, CSRF origin enforcement, and all negative authentication/authorization controls are verified on `https://www.prepford.com/`. Full **ACCEPTED** status remains gated solely on provisioning an authorized `WEBSITE_12` test account and executing the positive login -> cookie inspection -> `/api/castoline/auth/me` -> protected resource -> logout -> post-logout `401` lifecycle against production.

> **Phase 16 Follow-up (`2026-11-17`):** See `PREPFORD_PHASE_16_FINAL_PRODUCTION_ACCEPTANCE.md`. Production configuration (`isHttpsBackend: true`) and upstream TLS (`ssl_verify_result=0`) were re-verified; the authorized `WEBSITE_12` test account remains unprovisioned, so the release decision remains **CONDITIONALLY ACCEPTED**.
