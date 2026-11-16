# PREPFORD — VERCEL PRODUCTION DEPLOYMENT REPORT

**Date:** 2026-11-16  
**Production Domain:** `https://www.prepford.com/`  
**Apex Redirect:** `https://prepford.com/` -> `308` -> `https://www.prepford.com/`

---

## 1. Local Environment & Deployment Readiness

- **Vercel CLI Status**: `vercel` CLI is not installed in this environment, `VERCEL_TOKEN` is not set, and `.vercel/project.json` is not present locally.
- **Required Server-Side Vercel Production Environment Variables** (no `NEXT_PUBLIC_` prefixes):
  - `SKEW_LINE_APP_NAME=Prepford`
  - `SKEW_LINE_APP_TITLE=Prepford`
  - `SKEW_LINE_APP_DOMAIN=https://www.prepford.com/`
  - `SKEW_LINE_APP_KEY=WEBSITE_12`
  - `SKEW_LINE_ACTIVE_BACKEND=dotnet`
  - `SKEW_LINE_DOTNET_BASE_URL=https://explicitbackend.com`

---

## 2. Production Smoke Status

- Existing live production domain `https://www.prepford.com/` responds `HTTP 200 OK` (`Server: Vercel`, `Strict-Transport-Security: max-age=63072000`) and `https://prepford.com/` redirects `308` to `https://www.prepford.com/`.
- **Pending Action**: Commit and push `feature/dotnet-backend-migration` (or merge to the Vercel production branch), configure the 6 server-side environment variables above in Vercel Production, trigger deployment, and run production smoke tests against `/api/castoline/config-status`, `/api/castoline/strata/categories`, and authenticated `/api/castoline/auth/*` routes.
