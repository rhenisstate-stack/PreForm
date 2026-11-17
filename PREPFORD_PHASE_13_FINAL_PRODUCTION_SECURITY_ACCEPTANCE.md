# PREPFORD — PHASE 13 FINAL PRODUCTION SECURITY & ACCEPTANCE REPORT

**Date:** 2026-11-17  
**Repository:** `c:\Users\gitau\Documents\PREform`  
**Authorized Remote & Branch:** `preform/feature/dotnet-backend-migration` (`https://github.com/rhenisstate-stack/PreForm.git`)  
**Production Domain:** `https://www.prepford.com/`  
**Central Identity:** `WEBSITE_12`  
**Required Upstream Backend:** `https://explicitbackend.com`  
**Phase 13 Release Decision:** **CONDITIONALLY ACCEPTED** (Production BFF is live and negative/CSRF/bundle security checks pass, but `https://www.prepford.com/api/castoline/config-status` still reports `isHttpsBackend: false` and `WEBSITE_12` positive auth lifecycle remains pending)

---

## 1. Executive Summary & Release Decision

Phase 13 audited the live production BFF configuration, upstream TLS enforcement in source code, and Vercel CLI/project accessibility on `2026-11-17`:
- **Live Production BFF Status (`https://www.prepford.com/`):**
  - `GET /api/castoline/config-status` returns `HTTP 200` (`Cache-Control: no-store`) with `valid: true`, `appName: "Prepford"`, `appTitle: "Prepford"`, `appDomain: "https://www.prepford.com/"`, `appKeyConfigured: true`, `activeBackend: "dotnet"`, and **`isHttpsBackend: false`** (warning: `"Remote SKEW_LINE backend uses unencrypted HTTP. Configure an HTTPS/TLS reverse proxy before transmitting production credentials."`).
  - `GET /api/castoline/strata/categories` returns `HTTP 200` (`Cache-Control: no-store`, `"Categories Fetched Successfully ⚓"`).
- **Source-Code TLS & Fallback Audit:**
  - Inspected `apps/web/src/lib/env-config.ts` and `apps/web/src/lib/lexmacasto/*.ts`.
  - Confirmed **0** occurrences of `rejectUnauthorized`, `NODE_TLS_REJECT_UNAUTHORIZED`, or silent `https://` → `http://` downgrade paths. The production `isHttpsBackend: false` state is caused directly by Vercel Production's `SKEW_LINE_DOTNET_BASE_URL` environment variable still holding an `http://` value rather than `https://explicitbackend.com`.
- **Vercel CLI / Dashboard Access:**
  - `npx vercel whoami` (`Vercel CLI 65.17.0`) is `Logged out`, `VERCEL_TOKEN` is unset, and `.vercel/` is absent locally. Updating `SKEW_LINE_DOTNET_BASE_URL` in Vercel Production and recording the Vercel deployment ID/SHA requires owner dashboard or authenticated CLI access.
- **Authorized `WEBSITE_12` Test Account:**
  - No dedicated `WEBSITE_12` test credentials are provisioned locally.

Under Phase 13 release criteria, the release decision remains **CONDITIONALLY ACCEPTED** until:
1. `SKEW_LINE_DOTNET_BASE_URL` in Vercel Production is updated to `https://explicitbackend.com` and redeployed so `config-status` reports `isHttpsBackend: true` with no HTTP warning, and
2. An authorized `WEBSITE_12` test account is provisioned to execute the full positive login → `/api/castoline/auth/me` → cookie audit → logout → `401` lifecycle against `https://www.prepford.com/`.

---

## 2. Production Deployment Identity & Vercel Verification

| Field | Status / Value |
|---|---|
| Authorized Git Repository | `rhenisstate-stack/PreForm` (`https://github.com/rhenisstate-stack/PreForm.git`) |
| Authorized Production Branch | `feature/dotnet-backend-migration` (verified at `0955380980ef6d80e93424be2778ca782714aea4` prior to Phase 13 report commit) |
| Production Domain | `https://www.prepford.com/` |
| Vercel Project / Deployment ID / Exact Deployed SHA | **PENDING OWNER VERIFICATION** (`npx vercel whoami` is `Logged out`, `VERCEL_TOKEN` unset) |
| Production TLS Upstream Status | **FAIL (`isHttpsBackend: false`)** — `SKEW_LINE_DOTNET_BASE_URL` in Vercel Production must be updated to `https://explicitbackend.com` |

---

## 3. Production TLS & Upstream Verification

- **Live `GET https://www.prepford.com/api/castoline/config-status` (`2026-11-17`):**
  - Status: `200`, `Cache-Control: no-store`
  - Payload: `{"valid":true,"appName":"Prepford","appTitle":"Prepford","appDomain":"https://www.prepford.com/","appKeyConfigured":true,"activeBackend":"dotnet","isHttpsBackend":false,"errors":[],"warnings":["Remote SKEW_LINE backend uses unencrypted HTTP. Configure an HTTPS/TLS reverse proxy before transmitting production credentials."]}`
- **Live `GET https://www.prepford.com/api/castoline/strata/categories` (`2026-11-17`):**
  - Status: `200`, `Cache-Control: no-store`, `"Categories Fetched Successfully ⚓"`
- **Source-Code TLS Inspection (`apps/web/src/lib/env-config.ts`, `apps/web/src/lib/lexmacasto/*.ts`):**
  - No `rejectUnauthorized: false` or `NODE_TLS_REJECT_UNAUTHORIZED` overrides exist.
  - No silent fallback from `https://` to `http://` exists; `resolveSkewLineBaseUrl()` uses `SKEW_LINE_DOTNET_BASE_URL` verbatim.
  - Note: `isStrictProd` in `env-config.ts` checks `NODE_ENV === "production" && APP_ENV === "production"`, so when `APP_ENV` is unset on Vercel, an `http://` `SKEW_LINE_DOTNET_BASE_URL` emits a warning (`isHttpsBackend: false`) rather than failing closed at startup. Setting `SKEW_LINE_DOTNET_BASE_URL=https://explicitbackend.com` in Vercel Production resolves the transport warning without code changes.

---

## 4. Authorized `WEBSITE_12` Authentication Lifecycle

- **Positive Lifecycle (`WEBSITE_12` Login -> `/api/castoline/auth/me` -> Cookie Audit -> Logout -> `401`):**
  - **Status:** **PENDING EXTERNAL DEPENDENCY** — no authorized `WEBSITE_12` test account credentials are available locally.
- **Negative & Boundary Controls (Verified Live on `https://www.prepford.com/` in Phase 12 & Preserved):**
  - Invalid login credentials -> `401` (`no-store`)
  - Missing login fields (`{}`) -> `400` (`no-store`, `"Email is required."`)
  - Malformed JSON body -> `400` (`no-store`, `"Invalid JSON request body."`)
  - Cross-origin `POST` (`Origin: https://evil.example`) -> `403` (`no-store`, `"Request origin mismatch."`)
  - Unknown strata resource (`/api/castoline/strata/hacked`) -> `404` (`no-store`)
  - Unauthenticated protected strata (`/api/castoline/strata/examsLive`) -> `401` (`no-store`)

---

## 5. Security & Regression Baseline

- **Production JS Bundle Audit (Preserved from Phase 12):** Scanned all **22** `/_next/static` chunks referenced by `/`, `/sign-in`, and `/sign-up` on `https://www.prepford.com/` → **0** leaks of `WEBSITE_12`, `WEBSITE_11`, `WEBSITE_1`, `explicitbackend`, `108.61.9.189`, or `SKEW_LINE`.
- **Regression Baseline (No application code modified in Phase 12/13):**
  - TypeScript (`npm run typecheck`): `0` errors
  - SQLite guard (`npm run verify:no-sqlite`): `0` runtime SQLite dependencies across `772` files
  - Vitest: `160/160` passed across `13` suites
  - ASP.NET Core + GateB PostgreSQL: `646/646` passed

---

## 6. Remaining External Dependencies & Required Owner Actions

1. **Update `SKEW_LINE_DOTNET_BASE_URL` in Vercel Production:**
   - In the Vercel dashboard for `rhenisstate-stack/PreForm` (Production Branch `feature/dotnet-backend-migration`), set `SKEW_LINE_DOTNET_BASE_URL=https://explicitbackend.com` in **Production** scope, preserve the other 5 `SKEW_LINE_*` variables, trigger a fresh Production deployment, and record the deployment ID / commit SHA.
2. **Provision Authorized `WEBSITE_12` Test Account:**
   - Supply dedicated `WEBSITE_12` test credentials via an untracked local secret file or environment variable (never in chat or Git) to run the positive login → `/api/castoline/auth/me` → cookie audit → logout → `401` lifecycle against `https://www.prepford.com/`.
