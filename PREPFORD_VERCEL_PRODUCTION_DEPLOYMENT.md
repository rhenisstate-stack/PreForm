# PREPFORD — VERCEL PRODUCTION DEPLOYMENT REPORT

**Date:** 2026-11-17 (Updated Phase 14 — Production HTTPS Confirmed `isHttpsBackend: true`)  
**Production Domain:** `https://www.prepford.com/`  
**Apex Redirect:** `https://prepford.com/` -> `308` -> `https://www.prepford.com/`

---

## 1. Git & Vercel Configuration State

- **Owner-Authorized Production Branch:** `preform/feature/dotnet-backend-migration` (`https://github.com/rhenisstate-stack/PreForm.git`)
- **Current Branch:** `feature/dotnet-backend-migration`
- **Verified Remote HEAD (pre-Phase 14 report commit):** `de094112902c2dfdc41e82241f3e3640d1108033` (`de09411`). `origin/main` (`2aef11c`) was not modified or pushed.
- **Vercel CLI / Token:** `vercel` is not globally installed, `npx vercel whoami` (`Vercel CLI 65.17.0`) reports `Logged out`, `VERCEL_TOKEN` is unset, and `.vercel/project.json` is not present locally. Exact Vercel deployment ID, timestamp, and deployed commit SHA from the Vercel dashboard remain unverified via CLI.
- **Live Deployment & TLS Evidence:** `/api/castoline/config-status` now reports `isHttpsBackend: true` with `errors: []` and `warnings: []`, confirming Vercel Production's `SKEW_LINE_DOTNET_BASE_URL` has been updated to HTTPS and redeployed.

---

## 2. Live Production Smoke Probes (`https://www.prepford.com/`) — Phase 14 (2026-11-17)

| Route | Observed HTTP Status | Content-Type / Cache-Control | Response Summary / Notes |
|---|---|---|---|
| `GET /` | `200` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | `server: Vercel` |
| `GET /sign-in` | `200` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | `server: Vercel` |
| `GET /sign-up` | `200` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | `server: Vercel` |
| `GET /api/castoline/config-status` | `200` | `application/json` / `no-store` | `valid: true`, `appName: "Prepford"`, `appTitle: "Prepford"`, `appDomain: "https://www.prepford.com/"`, `appKeyConfigured: true`, `activeBackend: "dotnet"`, **`isHttpsBackend: true`**, `errors: []`, `warnings: []` (`x-vercel-id: bom1::btxkm-1794902336315-65575c5954ac`) |
| `GET /api/castoline/auth/me` | `401` | `application/json` / `no-store` | `{"success":false,"message":"Not authenticated.","errorCode":"UNAUTHORIZED"}` |
| `GET /api/castoline/strata/categories` | `200` | `application/json` / `no-store` | `{"success":true,"message":"Categories Fetched Successfully ⚓",...}` (`x-vercel-id: bom1::iad1::wzhbn-1794902337044-2ad61a30b442`) |

---

## 3. Required Vercel Production Environment Variables & Deployment Steps

Configure in Vercel Production (server-side only, zero `NEXT_PUBLIC_` prefixes):
- `SKEW_LINE_APP_NAME=Prepford`
- `SKEW_LINE_APP_TITLE=Prepford`
- `SKEW_LINE_APP_DOMAIN=https://www.prepford.com/`
- `SKEW_LINE_APP_KEY=WEBSITE_12`
- `SKEW_LINE_ACTIVE_BACKEND=dotnet`
- `SKEW_LINE_DOTNET_BASE_URL=https://explicitbackend.com`

Then merge/promote the verified commit to the Vercel production branch, deploy, and re-run live smoke probes against `https://www.prepford.com/api/castoline/*`.
