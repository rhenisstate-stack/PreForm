# PREPFORD — VERCEL PRODUCTION DEPLOYMENT REPORT

**Date:** 2026-11-16 (Updated Phase 11)  
**Production Domain:** `https://www.prepford.com/`  
**Apex Redirect:** `https://prepford.com/` -> `308` -> `https://www.prepford.com/`

---

## 1. Git & Vercel Configuration State

- **Current Branch:** `feature/dotnet-backend-migration`
- **Current HEAD:** `5f560ae` (`docs(integration): add Qlex-Nursing/LexmaCasto integration and Phase 10 closure reports`)
- **Remotes:** `origin` (`https://github.com/de-scientist/PREform.git`), `preform` (`https://github.com/rhenisstate-stack/PreForm.git`)
- **Tracking Status:** `preform/feature/dotnet-backend-migration` (ahead by 3 verified commits; `git push --dry-run preform feature/dotnet-backend-migration` succeeded).
- **Production Branch (`main`):** `2aef11c` (`origin/main`).
- **Vercel CLI / Token:** `vercel` CLI is not installed locally, `VERCEL_TOKEN` is unset, and `.vercel/project.json` is not present locally.

---

## 2. Live Production Smoke Probes (`https://www.prepford.com/`)

| Route | Observed HTTP Status | Content-Type / Cache-Control | Interpretation |
|---|---|---|---|
| `/` | `200` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | Live homepage serving prior production build |
| `/sign-in` | `200` | `text/html; charset=utf-8` | Live sign-in page |
| `/sign-up` | `200` | `text/html; charset=utf-8` | Live sign-up page |
| `/api/castoline/config-status` | `404` | `text/html; charset=utf-8` | New Phase 9/10 BFF routes not yet deployed to Vercel production |
| `/api/castoline/auth/me` | `404` | `text/html; charset=utf-8` | New Phase 9/10 BFF routes not yet deployed to Vercel production |
| `/api/castoline/strata/categories` | `404` | `text/html; charset=utf-8` | New Phase 9/10 BFF routes not yet deployed to Vercel production |

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
