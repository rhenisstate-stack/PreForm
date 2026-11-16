# PREPFORD — VERCEL PRODUCTION DEPLOYMENT REPORT

**Date:** 2026-11-16 (Updated Phase 12)  
**Production Domain:** `https://www.prepford.com/`  
**Apex Redirect:** `https://prepford.com/` -> `308` -> `https://www.prepford.com/`

---

## 1. Git & Vercel Configuration State

- **Current Branch:** `feature/dotnet-backend-migration`
- **Current HEAD:** `1dace09` (`docs(phase11): update external dependency status and add Phase 11 final acceptance report`)
- **Remotes:** `origin` (`https://github.com/de-scientist/PREform.git`), `preform` (`https://github.com/rhenisstate-stack/PreForm.git`)
- **Tracking Status:** `preform/feature/dotnet-backend-migration` (`b29c448`, local branch ahead by 4 commits).
- **Production Branch (`main`):** `2aef11c` (`origin/main`). `preform` remote currently has `refs/heads/feature/dotnet-backend-migration` (`b29c448`) and no `main` branch.
- **Vercel CLI / Token:** `vercel` is not globally installed, `npx vercel whoami` (`Vercel CLI 65.16.0`) reports `Logged out`, `VERCEL_TOKEN` is unset, and `.vercel/project.json` is not present locally.

---

## 2. Live Production Smoke Probes (`https://www.prepford.com/`) — Phase 12

| Route | Observed HTTP Status | Content-Type / Cache-Control | Response Headers / Notes |
|---|---|---|---|
| `/` | `200` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | `server: Vercel`, `x-vercel-id: bom1::mlncr-1794833575206-fb4016b64d10` (prior build) |
| `/sign-in` | `200` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | `server: Vercel`, `x-vercel-id: bom1::9944b-1794833575680-bffb7f7f6b61` |
| `/sign-up` | `200` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | `server: Vercel`, `x-vercel-id: bom1::rpfss-1794833575822-7a9bd1811ca2` |
| `/api/castoline/config-status` | `404` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | Phase 9/10 BFF routes not yet deployed to Vercel production |
| `/api/castoline/auth/me` | `404` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | Phase 9/10 BFF routes not yet deployed to Vercel production |
| `/api/castoline/strata/categories` | `404` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | Phase 9/10 BFF routes not yet deployed to Vercel production |

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
