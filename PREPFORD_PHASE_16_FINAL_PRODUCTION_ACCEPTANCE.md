# PREPFORD — PHASE 16 FINAL PRODUCTION ACCEPTANCE REPORT

**Date:** 2026-11-17  
**Repository:** `c:\Users\gitau\Documents\PREform` (`rhenisstate-stack/PreForm`)  
**Target / Authorized Production Branch:** `feature/dotnet-backend-migration` (`preform/feature/dotnet-backend-migration`)  
**Starting Commit:** `c633b72` (verified ancestor of `HEAD`; `origin/main` remains untouched at `2aef11c`)  
**Production Domain:** `https://www.prepford.com/`  
**Application Identity:** `WEBSITE_12`  
**Upstream Backend:** `https://explicitbackend.com`  
**Phase 16 Release Decision:** **CONDITIONALLY ACCEPTED** (Authorized `WEBSITE_12` test account remains unprovisioned; positive authentication lifecycle was not executed and was not fabricated.)

---

## 1. Initial Repository State & Contract Review (Directly Observed)

- **Branch & Tracking:** `feature/dotnet-backend-migration` tracking `preform/feature/dotnet-backend-migration` (`https://github.com/rhenisstate-stack/PreForm.git`).
- **History & Remote Integrity:** `c633b72` is present in `HEAD` history (`git merge-base --is-ancestor c633b72 HEAD` exited `0`). `origin/main` (`https://github.com/de-scientist/PREform.git`) remains untouched at `2aef11c`.
- **Reviewed BFF Contracts (`apps/web/src/lib/lexmacasto/session.ts` & `apps/web/src/app/api/castoline/auth/*`):**
  - Session cookies (`prepford_casto_line`, `prepford_casto_badge`, `prepford_casto_dashboard`): `httpOnly: true`, `secure: true` (production), `sameSite: "lax"`, `path: "/"`, `maxAge: 604800` (7 days); cleared with `maxAge: 0, expires: new Date(0)`.
  - CSRF protection (`validateSameOriginRequest`): rejects `sec-fetch-site: cross-site` and `Origin` / `Referer` host mismatches on state-changing requests (`403 Forbidden`).
  - `/api/castoline/auth/me`: requires both `prepford_casto_line` and `prepford_casto_badge`, proxies `GET /api/castoline/system/user/list/current?fetchtype=current`, sanitizes via `sanitizeAuthUser`, and clears cookies on `401`/`403`.
  - `/api/castoline/auth/logout`: enforces same-origin CSRF, invokes `POST /api/castoline/auth/logout/sessions/distinct` (or `relative`) when a session exists, clears all 3 cookies, and returns `Cache-Control: no-store`.

---

## 2. Account Provisioning Status & External Dependency (Directly Observed)

- **Secret & Env Inspection (Keys Only):** Inspected `.env.local`, `apps/web/.env.local`, and process environment variables (`PREPFORD*`, `CASTO*`, `WEBSITE*`, `TEST*`, `VERCEL*`, `SKEW*`, `LEXMA*`). No `WEBSITE_12` test account credentials exist locally.
- **Git Ignore Verification:** `.gitignore` excludes `.env` and `.env.*` (except `!.env.example`).
- **Policy Compliance:** Did not reuse `WEBSITE_11` (NURVIA/Qlex-Nursing) credentials, did not use real learner credentials, and did not create unauthorized production accounts.
- **External Dependency:** **BLOCKED_EXTERNAL_DEPENDENCY** — awaiting an authorized LexmaCasto/Qlex administrator to provision a dedicated non-production `WEBSITE_12` test account in an approved secret manager or untracked local secret file.

---

## 3. Production Configuration & TLS Gate (Directly Observed in Phase 16)

- **`GET https://www.prepford.com/api/castoline/config-status`:**
  - **Status:** `200 OK`
  - **Headers:** `Cache-Control: no-store`, `Strict-Transport-Security: max-age=63072000`, `X-Vercel-Id: bom1::dv2ln-1794907489895-d1c43e3508d1`
  - **Body:** `{"valid":true,"appName":"Prepford","appTitle":"Prepford","appDomain":"https://www.prepford.com/","appKeyConfigured":true,"activeBackend":"dotnet","isHttpsBackend":true,"errors":[],"warnings":[]}`
- **Independent Upstream TLS Verification (`https://explicitbackend.com/api/castoline/strata/main/categories/list/absolute`):**
  - `scheme=https`, `ssl_verify_result=0`, `upstream_http_code=400` (fail-closed without `WEBSITE_12` headers).

---

## 4. Positive Authentication Lifecycle (Blocked / Not Executed)

Because no authorized `WEBSITE_12` test account has been provisioned:
- **A. Login:** **NOT EXECUTED** (external dependency).
- **B. Cookie Inspection (Login Issuance):** **NOT EXECUTED** (external dependency). Code contract verified in `session.ts`; cookie-clearing attributes on `POST /api/castoline/auth/logout` were directly observed in Phase 15 (`Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Secure; HttpOnly; SameSite=lax`).
- **C. Authenticated `/api/castoline/auth/me`:** **NOT EXECUTED** (external dependency).
- **D. Protected Resource Access (Authenticated):** **NOT EXECUTED** (external dependency).
- **E. Logout (Authenticated Upstream Revocation):** **NOT EXECUTED** (external dependency).
- **F. Post-Logout Verification (`401`):** **NOT EXECUTED** (external dependency).

---

## 5. Evidence Classification & Reused Baselines

### Reused Previously Reported Production Evidence (Phase 14 & Phase 15 — Implementation Unchanged)
- Invalid credentials (`POST /api/castoline/auth/login`) → `401 Unauthorized` (`UNAUTHORIZED`, `X-Vercel-Id: bom1::iad1::8h6cm-1794907087572-6fc7fbb0574c`).
- Empty body `{}` / malformed JSON `{not-json` (`POST /api/castoline/auth/login`) → `400 Bad Request`.
- Missing cookie / forged `prepford_casto_line` (`GET /api/castoline/auth/me`) → `401 Unauthorized`.
- Cross-origin `POST /api/castoline/auth/login` and `POST /api/castoline/auth/logout` (`Origin: https://evil.example`) → `403 Forbidden` (`"Request origin mismatch."`).
- Unauthenticated protected resource (`GET /api/castoline/strata/examsLive`) → `401 Unauthorized`; unknown resource (`strata/hacked`) → `404`; public categories (`strata/categories`) → `200 OK`.
- Unauthenticated/replayed same-origin `POST /api/castoline/auth/logout` → `200 OK` (`"Signed out locally."`), clearing all 3 cookies.
- Deployed JS bundle scan (`22` chunks) → `0` occurrences of `WEBSITE_12`, `WEBSITE_11`, `WEBSITE_1`, `explicitbackend`, `108.61.9.189`, or `SKEW_LINE`.

### Reused Local Automated Test Baselines (No Source Code Modified)
- Phase 11 Vitest: `160/160` passed.
- ASP.NET Core + GateB PostgreSQL: `646/646` passed.
- SQLite runtime dependency guard: passed (`0` SQLite runtime dependencies).

### Unverified Assumptions & Deployment Metadata Limitations
- **Vercel Dashboard Metadata:** `VERCEL_TOKEN` is unset and `.vercel/`, `~/.vercel`, and `%APPDATA%\com.vercel.cli\Data\auth.json` are absent locally. Exact Vercel project name, deployment ID, deployment timestamp, and deployed commit SHA from the Vercel dashboard remain unverified via CLI.
- **Unverified Runtime Behavior:** Live upstream behavior for `WEBSITE_12` login, session token issuance, `/api/castoline/auth/me` profile payload, learner-scoped protected resource responses, and upstream `/logout/sessions/distinct` revocation remain unverified until an authorized `WEBSITE_12` test account is supplied.

---

## 6. Final Release Decision

**CONDITIONALLY ACCEPTED**

Production configuration, upstream HTTPS (`isHttpsBackend: true`, `ssl_verify_result=0`), CSRF protection, cookie-clearing policy, and all negative authentication/authorization controls are verified. Full **ACCEPTED** status remains blocked solely on provisioning an authorized `WEBSITE_12` test account and executing the positive authentication lifecycle against `https://www.prepford.com/`.
