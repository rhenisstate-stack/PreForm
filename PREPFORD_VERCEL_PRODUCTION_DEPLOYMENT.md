# PREPFORD — VERCEL PRODUCTION DEPLOYMENT REPORT

**Date:** 2026-11-17 (Updated Phase 16 — Production Config & TLS Re-Verified; Vercel Dashboard Metadata Still Inaccessible via CLI)  
**Production Domain:** `https://www.prepford.com/`  
**Apex Redirect:** `https://prepford.com/` -> `308` -> `https://www.prepford.com/`

---

## 1. Git & Vercel Configuration State

- **Owner-Authorized Production Branch:** `preform/feature/dotnet-backend-migration` (`https://github.com/rhenisstate-stack/PreForm.git`)
- **Current Branch:** `feature/dotnet-backend-migration`
- **Verified Remote HEAD (pre-Phase 16 report commit):** `c633b72` (`preform/feature/dotnet-backend-migration`). `origin/main` (`2aef11c`) was not modified or pushed.
- **Vercel CLI / Token (Phase 15 re-check):** `VERCEL_TOKEN` is unset, and `.vercel/project.json`, `~/.vercel`, and `%APPDATA%\com.vercel.cli\Data\auth.json` are absent locally. Exact Vercel deployment ID, timestamp, and deployed commit SHA from the Vercel dashboard remain unverified via local CLI (evidence limitation).
- **Live Deployment & TLS Evidence:** `/api/castoline/config-status` now reports `isHttpsBackend: true` with `errors: []` and `warnings: []`, confirming Vercel Production's `SKEW_LINE_DOTNET_BASE_URL` has been updated to HTTPS and redeployed.

---

## 2. Live Production Smoke Probes (`https://www.prepford.com/`) — Phase 15 (2026-11-17)

| Route | Observed HTTP Status | Content-Type / Cache-Control | Response Summary / Notes |
|---|---|---|---|
| `GET /` (Phase 14) | `200` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | `server: Vercel` |
| `GET /sign-in` (Phase 14) | `200` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | `server: Vercel` |
| `GET /sign-up` (Phase 14) | `200` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | `server: Vercel` |
| `GET /api/castoline/config-status` (Phase 16) | `200` | `application/json` / `no-store` | `valid: true`, `appName: "Prepford"`, `appTitle: "Prepford"`, `appDomain: "https://www.prepford.com/"`, `appKeyConfigured: true`, `activeBackend: "dotnet"`, **`isHttpsBackend: true`**, `errors: []`, `warnings: []` (`x-vercel-id: bom1::dv2ln-1794907489895-d1c43e3508d1`) |
| `GET /api/castoline/auth/me` | `401` | `application/json` / `no-store` | `{"success":false,"message":"Not authenticated.","errorCode":"UNAUTHORIZED"}` (`x-vercel-id: bom1::iad1::mnp7b-1794907057599-3d0db4df1a75`) |
| `GET /api/castoline/strata/categories` | `200` | `application/json` / `no-store` | `{"success":true,"message":"Categories Fetched Successfully ⚓",...}` (`x-vercel-id: bom1::iad1::tdf2s-1794907054404-626947b916d2`) |

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
