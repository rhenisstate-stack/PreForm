# PREPFORD — PHASE 14 FINAL RELEASE ACCEPTANCE REPORT

**Date:** 2026-11-17  
**Repository:** `c:\Users\gitau\Documents\PREform`  
**Authorized Production Branch:** `preform/feature/dotnet-backend-migration` (`https://github.com/rhenisstate-stack/PreForm.git`)  
**Production Domain:** `https://www.prepford.com/`  
**Central Identity:** `WEBSITE_12`  
**Upstream Backend:** `https://explicitbackend.com`  
**Phase 14 Release Decision:** **CONDITIONALLY ACCEPTED** (Production upstream HTTPS `isHttpsBackend: true` is now **VERIFIED & CLOSED**; positive `WEBSITE_12` authentication lifecycle remains **PENDING** authorized test credentials, and Vercel dashboard deployment metadata remains unverified via local CLI)

---

## 1. Executive Summary & Release Decision

Phase 14 verified the updated Vercel Production deployment on `https://www.prepford.com/` and closed the Production TLS gate:
- `GET https://www.prepford.com/api/castoline/config-status` now returns `HTTP 200` (`Cache-Control: no-store`) with `valid: true`, `appKeyConfigured: true`, `activeBackend: "dotnet"`, **`isHttpsBackend: true`**, `errors: []`, and **`warnings: []`**.
- `GET https://www.prepford.com/api/castoline/strata/categories` returns `HTTP 200` (`Cache-Control: no-store`, `"Categories Fetched Successfully ⚓"`), confirming live HTTPS upstream communication through the PrepFord BFF.
- Source-code audit confirmed certificate validation remains enabled (`0` `rejectUnauthorized: false` / `NODE_TLS_REJECT_UNAUTHORIZED` overrides) and `0` silent HTTP fallback paths exist.
- All Phase 14 negative auth, malformed JSON, CSRF (`403` on cross-origin `POST`), strata allowlist (`404`/`401`), and 22-chunk production JS bundle scans passed with zero leaks.

Under Phase 14 release criteria, full `ACCEPTED` requires both production TLS **and** the authorized `WEBSITE_12` positive authentication lifecycle. Because no authorized `WEBSITE_12` test account credentials are available locally, the release decision remains **CONDITIONALLY ACCEPTED**.

---

## 2. Vercel Deployment & Environment Verification

- **Authorized Git Repository & Branch:** `rhenisstate-stack/PreForm` (`preform/feature/dotnet-backend-migration`, `de094112902c2dfdc41e82241f3e3640d1108033` prior to Phase 14 report commit). `origin/main` (`2aef11c`) was not modified.
- **Vercel CLI / Token:** `npx vercel whoami` (`Vercel CLI 65.17.0`) is `Logged out`, `VERCEL_TOKEN` is unset, and `.vercel/` is absent locally; exact Vercel deployment ID, timestamp, and deployed commit SHA from the Vercel dashboard could not be queried via CLI.
- **Sanitized Production Config (`GET https://www.prepford.com/api/castoline/config-status`):**
  - `appName`: `"Prepford"`
  - `appTitle`: `"Prepford"`
  - `appDomain`: `"https://www.prepford.com/"`
  - `appKeyConfigured`: `true` (server-side only; `0` client bundle occurrences)
  - `activeBackend`: `"dotnet"`
  - `isHttpsBackend`: `true`
  - `errors`: `[]`, `warnings`: `[]`

---

## 3. Production Upstream HTTPS & Route Verification (`2026-11-17`)

| Method & URL | HTTP Status | Cache-Control | Result / Contract Check |
|---|---|---|---|
| `GET https://www.prepford.com/api/castoline/config-status` | `200` | `no-store` | **PASS** (`isHttpsBackend: true`, `warnings: []`, `x-vercel-id: bom1::btxkm-1794902336315-65575c5954ac`) |
| `GET https://www.prepford.com/api/castoline/strata/categories` | `200` | `no-store` | **PASS** (`"Categories Fetched Successfully ⚓"`, `x-vercel-id: bom1::iad1::wzhbn-1794902337044-2ad61a30b442`) |
| `GET https://www.prepford.com/api/castoline/auth/me` | `401` | `no-store` | **PASS** (`UNAUTHORIZED`) |
| `POST https://www.prepford.com/api/castoline/auth/login` (invalid creds) | `401` | `no-store` | **PASS** (`UNAUTHORIZED`) |
| `POST https://www.prepford.com/api/castoline/auth/login` (empty `{}`) | `400` | `no-store` | **PASS** (`"Email is required."`) |
| `POST https://www.prepford.com/api/castoline/auth/login` (malformed JSON) | `400` | `no-store` | **PASS** (`"Invalid JSON request body."`) |
| `POST https://www.prepford.com/api/castoline/auth/login` (`Origin: https://evil.example`) | `403` | `no-store` | **PASS** (`"Request origin mismatch."`) |
| `GET https://www.prepford.com/api/castoline/strata/hacked` | `404` | `no-store` | **PASS** (non-allowlisted resource rejected) |
| `GET https://www.prepford.com/api/castoline/strata/examsLive` | `401` | `no-store` | **PASS** (unauthenticated protected strata rejected) |

---

## 4. Authentication Lifecycle

- **Positive `WEBSITE_12` Lifecycle (Login -> Session Cookies -> `/api/castoline/auth/me` -> Logout -> `401`):** **PENDING EXTERNAL DEPENDENCY** — no authorized `WEBSITE_12` test account credentials are available locally in environment variables or untracked secret files.
- **Negative & Boundary Controls:** All live production negative checks (`401`, `400`, `403`, `404`) passed on `2026-11-17` after HTTPS deployment.

---

## 5. Security & Regression Integrity

- **Deployed JS Bundle Scan (`https://www.prepford.com/`):** Scanned all **22** `/_next/static` JS chunks referenced by `/`, `/sign-in`, and `/sign-up` → **0** occurrences of `WEBSITE_12`, `WEBSITE_11`, `WEBSITE_1`, `explicitbackend`, `108.61.9.189`, or `SKEW_LINE`.
- **Scope & Regression Preservation:** No application source code was modified in Phase 14. NCLEX-RN/PN, NGN question types, Study Studio, subscriptions/entitlements, Stripe/payment controls, and PostgreSQL architecture remain untouched (preserving the Phase 11/12 baseline: `160/160` Vitest, `646/646` ASP.NET Core + GateB PostgreSQL, `0` SQLite runtime dependencies across `772` files, `0` TypeScript errors).

---

## 6. Remaining External Dependencies & Release Recommendation

1. **Authorized `WEBSITE_12` Test Account:** Provision a dedicated `WEBSITE_12` test user in LexmaCasto and supply credentials in an untracked local secret file or environment variable to execute the positive login → `/api/castoline/auth/me` → cookie attribute audit → logout → `401` lifecycle against `https://www.prepford.com/`.
2. **Optional Vercel Dashboard Record:** Record the exact Vercel deployment ID, timestamp, and deployed commit SHA from the Vercel dashboard (`rhenisstate-stack/PreForm`, `feature/dotnet-backend-migration`).

**Release Decision:** **CONDITIONALLY ACCEPTED** until the authorized `WEBSITE_12` positive authentication lifecycle is executed and passes against `https://www.prepford.com/`.
