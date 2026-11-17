# PREPFORD — VERCEL PRODUCTION DEPLOYMENT REPORT

**Date:** 2026-11-17 (Updated Phase 13 — Live Production BFF Deployed; `SKEW_LINE_DOTNET_BASE_URL` Still `http://` in Vercel Production)  
**Production Domain:** `https://www.prepford.com/`  
**Apex Redirect:** `https://prepford.com/` -> `308` -> `https://www.prepford.com/`

---

## 1. Git & Vercel Configuration State

- **Owner-Authorized Production Branch:** `preform/feature/dotnet-backend-migration` (`https://github.com/rhenisstate-stack/PreForm.git`)
- **Current Branch:** `feature/dotnet-backend-migration`
- **Remote HEAD:** `f5be06aea6c37a89888531f4c9a85702abfd0df7` (`f5be06a` — `docs(phase12): record push to preform/feature/dotnet-backend-migration and post-push probes`, containing reviewed integration commits `9a94f8b`, `1297c18`, `5f560ae`, `1dace09`, `53e850f`, `f5be06a`). `origin/main` (`2aef11c`) was not modified or pushed.
- **Vercel CLI / Token:** `vercel` is not globally installed, `npx vercel whoami` (`Vercel CLI 65.16.0`) reports `Logged out`, `VERCEL_TOKEN` is unset, and `.vercel/project.json` is not present locally. Therefore, the Vercel deployment ID, exact deployed SHA metadata, and Vercel dashboard settings (`rhenisstate-stack/PreForm`, Production Branch `feature/dotnet-backend-migration`, Root Directory `apps/web`, Node `24.x`) cannot be read via CLI.
- **Live Deployment Evidence:** All `/api/castoline/*` BFF routes are now live and serving JSON on `https://www.prepford.com/`, confirming the Phase 9/10/11/12 integration has been deployed to Vercel Production.

---

## 2. Live Production Smoke Probes (`https://www.prepford.com/`) — 2026-11-17

| Route | Observed HTTP Status | Content-Type / Cache-Control | Response Summary / Notes |
|---|---|---|---|
| `GET /` | `200` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | `server: Vercel`, `x-vercel-id: bom1::vz7tx-1794900936565-bb4368add6f1` |
| `GET /sign-in` | `200` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | `server: Vercel`, `x-vercel-id: bom1::9dwtg-1794900938245-39cf822e0d83` |
| `GET /sign-up` | `200` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | `server: Vercel`, `x-vercel-id: bom1::vnp5b-1794900939450-e6bd557c28c7` |
| `GET /api/castoline/config-status` | `200` | `application/json` / `no-store` | `valid: true`, `appName: "Prepford"`, `appTitle: "Prepford"`, `appDomain: "https://www.prepford.com/"`, `appKeyConfigured: true`, `activeBackend: "dotnet"`, **`isHttpsBackend: false`** (warning: unencrypted HTTP upstream) |
| `GET /api/castoline/auth/me` | `401` | `application/json` / `no-store` | `{"success":false,"message":"Not authenticated.","errorCode":"UNAUTHORIZED"}` |
| `GET /api/castoline/strata/categories` | `200` | `application/json` / `no-store` | `{"success":true,"message":"Categories Fetched Successfully ⚓",...}` (live upstream BFF round-trip confirmed) |

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
