# PREPFORD — PHASE 12 FINAL PRODUCTION ACCEPTANCE REPORT

**Date:** 2026-11-17  
**Repository:** `c:\Users\gitau\Documents\PREform`  
**Production Domain:** `https://www.prepford.com/`  
**Central Identity:** `WEBSITE_12`  
**Upstream Backend:** `https://explicitbackend.com`  
**Phase 12 Release Decision:** **CONDITIONALLY ACCEPTED** (Production `/api/castoline/*` BFF is live on `https://www.prepford.com/`, but `SKEW_LINE_DOTNET_BASE_URL` in Vercel Production is currently `http://` (`isHttpsBackend: false`) instead of `https://explicitbackend.com`, and `WEBSITE_12` positive auth lifecycle remains pending)

---

## 1. Executive Summary & Release Decision

Phase 12 verified and pushed the reviewed integration to the owner-authorized production branch `preform/feature/dotnet-backend-migration` (`https://github.com/rhenisstate-stack/PreForm.git`) without modifying `origin/main`.

Live production probes on `https://www.prepford.com/` on `2026-11-17` confirm the PrepFord BFF deployment is now live:
- `/api/castoline/config-status` returns `200 application/json` (`no-store`), `/api/castoline/auth/me` returns `401` (`no-store`), and `/api/castoline/strata/categories` returns `200` (`no-store`, live upstream categories fetched).
- Live negative auth, malformed JSON, missing-field, CSRF (`403` on `Origin: https://evil.example`), and strata allowlist (`404`/`401`) checks all pass on `https://www.prepford.com/`.
- Live client bundle scan across all 22 `/_next/static` chunks returned `0` leaks of `WEBSITE_12`, `WEBSITE_11`, `WEBSITE_1`, `explicitbackend`, `108.61.9.189`, or `SKEW_LINE`.

However, full `ACCEPTED` status remains blocked by two external configuration/account items:
1. **Vercel Production `SKEW_LINE_DOTNET_BASE_URL` Must Be Updated to `https://explicitbackend.com`:** `/api/castoline/config-status` currently reports `"isHttpsBackend": false` with warning `"Remote SKEW_LINE backend uses unencrypted HTTP. Configure an HTTPS/TLS reverse proxy before transmitting production credentials."` Vercel Production must be updated to `SKEW_LINE_DOTNET_BASE_URL=https://explicitbackend.com` and redeployed, and the Vercel project metadata (`rhenisstate-stack/PreForm`, `feature/dotnet-backend-migration`) confirmed in the dashboard.
2. **Authorized `WEBSITE_12` Test Account:** No dedicated `WEBSITE_12` test credentials are provisioned locally, preventing live positive login -> `/api/castoline/auth/me` -> `/api/castoline/auth/logout` -> `401` verification.

No application source code was modified in Phase 12; the reviewed integration implementation remains intact.

---

## 2. Starting Git State & Reviewed Commit

- **Current Branch:** `feature/dotnet-backend-migration`
- **HEAD Commit:** `1dace0964d15cf75d71a0d3fc2267a1f0072bad3` (`1dace09` — `docs(phase11): update external dependency status and add Phase 11 final acceptance report`)
- **Working Tree:** Clean at Phase 12 start (`ahead 4` relative to `preform/feature/dotnet-backend-migration`)
- **Remotes:**
  - `origin`: `https://github.com/de-scientist/PREform.git` (`refs/heads/main` at `2aef11c61130e3d215f6d70bef03c5742fe025dc`)
  - `preform`: `https://github.com/rhenisstate-stack/PreForm.git` (`refs/heads/feature/dotnet-backend-migration` at `b29c448698435f8b0215b9dd208f9819f783b1d7`)
- **Local Branches:** `feature/dotnet-backend-migration` (`1dace09`), `main` (`2aef11c`), `backup/feature-before-large-file-cleanup` (`06622d6`), `backup/rebase-combined-4e988a7` (`4e988a7`)

---

## 3. Vercel Project & Production Branch Verification

- **Owner-Authorized Target:** `rhenisstate-stack/PreForm` (`preform/feature/dotnet-backend-migration`) serving `https://www.prepford.com/`.
- **Local Vercel State:** `vercel` is not installed globally, `.vercel/project.json` and `apps/web/.vercel` do not exist, `VERCEL_TOKEN` is unset, and `npx vercel whoami` (`Vercel CLI 65.16.0`) returned `Logged out`.
- **Unverified Vercel Project Settings (Requires Owner Dashboard / Authenticated CLI Access):**
  - Linked Vercel project ID/name (`rhenisstate-stack/PreForm` expected)
  - Configured Production branch (`feature/dotnet-backend-migration` expected)
  - Root directory (`apps/web` expected)
  - Framework/build configuration and Node.js runtime version (`>=24.0.0` declared in root `package.json`)
- **Canonical Domain Observed Live:** `https://www.prepford.com/` responds with `server: Vercel` and `x-vercel-id: bom1::...`.

---

## 4. Production Environment-Variable Verification

Verified via sanitized `GET https://www.prepford.com/api/castoline/config-status` (`2026-11-17`):

| Variable | Local `.env.local` / `apps/web/.env.local` Presence | Vercel Production Status |
|---|---|---|
| `SKEW_LINE_APP_NAME` | Present (server-side) | **CONFIGURED** (`appName: "Prepford"`) |
| `SKEW_LINE_APP_TITLE` | Present (server-side) | **CONFIGURED** (`appTitle: "Prepford"`) |
| `SKEW_LINE_APP_DOMAIN` | Present (server-side) | **CONFIGURED** (`appDomain: "https://www.prepford.com/"`) |
| `SKEW_LINE_APP_KEY` | Present (server-side) | **CONFIGURED** (`appKeyConfigured: true`, not exposed in client bundles) |
| `SKEW_LINE_ACTIVE_BACKEND` | Present (server-side) | **CONFIGURED** (`activeBackend: "dotnet"`) |
| `SKEW_LINE_DOTNET_BASE_URL` | Present (server-side, `https://`) | **MISCONFIGURED (`http://`)** — `isHttpsBackend: false` with warning `"Remote SKEW_LINE backend uses unencrypted HTTP. Configure an HTTPS/TLS reverse proxy before transmitting production credentials."` Must be updated to `https://explicitbackend.com` in Vercel Production. |

*(Per security policy, variable values and secrets are not printed.)*

---

## 5. Deployment Commit SHA & Deployment Result

- **Git Push to Authorized Production Branch:** **COMPLETED** — `preform/feature/dotnet-backend-migration` (`https://github.com/rhenisstate-stack/PreForm.git`) at `f5be06aea6c37a89888531f4c9a85702abfd0df7`. `origin/main` (`2aef11c`) was not modified.
- **Vercel Deployment Status:** **DEPLOYED LIVE** on `https://www.prepford.com/` (`/api/castoline/*` routes are live and serving JSON). Exact Vercel deployment ID and deployed commit SHA remain unverified locally because `npx vercel whoami` is `Logged out` and `VERCEL_TOKEN` is unset.

---

## 6. Production Route Smoke-Test Results

Executed against `https://www.prepford.com/` on `2026-11-17`:

| Method & URL | HTTP Status | Content-Type | Cache-Control | Result / Contract Check |
|---|---|---|---|---|
| `GET https://www.prepford.com/` | `200` | `text/html; charset=utf-8` | `public, max-age=0, must-revalidate` | **PASS** |
| `GET https://www.prepford.com/sign-in` | `200` | `text/html; charset=utf-8` | `public, max-age=0, must-revalidate` | **PASS** |
| `GET https://www.prepford.com/sign-up` | `200` | `text/html; charset=utf-8` | `public, max-age=0, must-revalidate` | **PASS** |
| `GET https://www.prepford.com/api/castoline/config-status` | `200` | `application/json` | `no-store` | **PASS (route/contract)**; **WARN (`isHttpsBackend: false`)** |
| `GET https://www.prepford.com/api/castoline/auth/me` | `401` | `application/json` | `no-store` | **PASS** (`{"success":false,"message":"Not authenticated.","errorCode":"UNAUTHORIZED"}`) |
| `GET https://www.prepford.com/api/castoline/strata/categories` | `200` | `application/json` | `no-store` | **PASS** (`"Categories Fetched Successfully ⚓"`, upstream BFF connectivity verified) |

---

## 7. Authorized Authentication Lifecycle Results

- **Positive Lifecycle (`WEBSITE_12` Login -> `/api/castoline/auth/me` -> Logout -> `401`):** **UNVERIFIED / BLOCKED_EXTERNAL_DEPENDENCY** — no authorized `WEBSITE_12` test account credentials are available locally.
- **Live Production Negative & Boundary Controls (`https://www.prepford.com/`, `2026-11-17`):**
  - `POST /api/castoline/auth/login` (invalid credentials) -> `401` (`no-store`)
  - `POST /api/castoline/auth/login` (missing fields `{}`) -> `400` (`no-store`, `"Email is required."`)
  - `POST /api/castoline/auth/login` (malformed JSON) -> `400` (`no-store`, `"Invalid JSON request body."`)
  - `POST /api/castoline/auth/login` (cross-origin `Origin: https://evil.example`) -> `403` (`no-store`, `"Request origin mismatch."`)
  - `GET /api/castoline/strata/hacked` -> `404` (`no-store`)
  - `GET /api/castoline/strata/examsLive` (unauthenticated) -> `401` (`no-store`)

---

## 8. Security Audit Results

- **Live Production Bundle Scan (`https://www.prepford.com/`, `2026-11-17`):**
  - Fetched HTML for `/`, `/sign-in`, and `/sign-up` and scanned all **22** referenced `/_next/static` JS chunks.
  - **Findings:** **0** occurrences of `WEBSITE_12`, `WEBSITE_11`, `WEBSITE_1`, `explicitbackend`, `108.61.9.189`, or `SKEW_LINE`.
- **Cache-Control & CSRF Controls:** All probed `/api/castoline/*` responses returned `Cache-Control: no-store`, and cross-origin `POST` was rejected with `403`.
- **Transport Finding:** `/api/castoline/config-status` reports `isHttpsBackend: false`, indicating Vercel Production's `SKEW_LINE_DOTNET_BASE_URL` is currently using `http://` instead of `https://explicitbackend.com`. Must be remediated in Vercel Production before transmitting production credentials.

---

## 9. Regression Test Results

Re-run in Phase 12 (no source code changes made):

| Check | Command | Phase 12 Result |
|---|---|---|
| TypeScript | `npm run typecheck` (`tsc --noEmit`) | **PASS** (`0` errors) |
| SQLite Runtime Guard | `npm run verify:no-sqlite` | **PASS** (`0` SQLite runtime dependencies across `772` files) |
| Vitest (13 Regression & Integration Suites) | `npx --workspace @prepford/web vitest run ...` | **PASS** (`13/13` files, `160/160` tests passed) |
| ASP.NET Core + GateB PostgreSQL | `dotnet test apps/api/Tests/Preform.Api.Tests.csproj --no-restore` | **Baseline preserved from Phase 11** (`646/646` passed; no code changed in Phase 12) |

---

## 10. Remaining External Dependencies

1. **Vercel Production `SKEW_LINE_DOTNET_BASE_URL` Remediation & Project Metadata Confirmation:** Update `SKEW_LINE_DOTNET_BASE_URL` in Vercel **Production** scope from `http://...` to `https://explicitbackend.com`, trigger a fresh Production deployment so `/api/castoline/config-status` reports `"isHttpsBackend": true` with `warnings: []`, and confirm the Vercel project metadata (`rhenisstate-stack/PreForm`, Production Branch `feature/dotnet-backend-migration`, deployment ID/SHA).
2. **Authorized `WEBSITE_12` Test Account:** Provision a dedicated `WEBSITE_12` test user in LexmaCasto and supply credentials through a secure local channel (untracked local env/secret file) to execute the positive production authentication lifecycle.

---

## 11. Explicit Release Recommendation

**CONDITIONALLY ACCEPTED** — Retain `CONDITIONALLY ACCEPTED` until:
1. Vercel confirms `rhenisstate-stack/PreForm` (`feature/dotnet-backend-migration`) and updates `SKEW_LINE_DOTNET_BASE_URL=https://explicitbackend.com` in Production + redeploys so `/api/castoline/config-status` reports `"isHttpsBackend": true`, and
2. The authorized `WEBSITE_12` positive authentication lifecycle (login -> `/api/castoline/auth/me` -> HttpOnly/Secure/SameSite cookie check -> logout -> `401`) is executed against `https://www.prepford.com/`.
