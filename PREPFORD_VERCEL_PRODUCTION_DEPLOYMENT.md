# PREPFORD — VERCEL PRODUCTION DEPLOYMENT REPORT

**Date:** 2026-11-17 (Updated Phase 12 — Owner-Authorized Push Executed)  
**Production Domain:** `https://www.prepford.com/`  
**Apex Redirect:** `https://prepford.com/` -> `308` -> `https://www.prepford.com/`

---

## 1. Git & Vercel Configuration State

- **Owner-Authorized Production Branch:** `preform/feature/dotnet-backend-migration` (`https://github.com/rhenisstate-stack/PreForm.git`)
- **Current Branch:** `feature/dotnet-backend-migration`
- **Pushed Commit:** `53e850f4647cb63002bf58a17dc656bd4ebd22b6` (`53e850f` — `docs(phase12): record production deployment and WEBSITE_12 auth blockers`, containing reviewed integration commits `9a94f8b`, `1297c18`, `5f560ae`, `1dace09`, `53e850f`)
- **Remote Push Result:** `b29c448..53e850f  feature/dotnet-backend-migration -> feature/dotnet-backend-migration` (`git ls-remote preform refs/heads/feature/dotnet-backend-migration` verified `53e850f4647cb63002bf58a17dc656bd4ebd22b6`). `origin/main` (`2aef11c`) was not modified or pushed.
- **Vercel CLI / Token:** `vercel` is not globally installed, `npx vercel whoami` (`Vercel CLI 65.16.0`) reports `Logged out`, `VERCEL_TOKEN` is unset, and `.vercel/project.json` is not present locally.
- **Vercel Project Settings (Requires Owner Dashboard / Authenticated CLI Verification):**
  - Connected repository: `rhenisstate-stack/PreForm` (pending owner verification)
  - Production Branch: `feature/dotnet-backend-migration` (pending owner verification)
  - Root Directory: `apps/web` (pending owner verification)
  - Node.js runtime: `24.x` (pending owner verification)

---

## 2. Live Production Smoke Probes (`https://www.prepford.com/`) — Post-Push (2026-11-17)

| Route | Observed HTTP Status | Content-Type / Cache-Control | Response Headers / Notes |
|---|---|---|---|
| `/` | `200` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | `server: Vercel`, `x-vercel-id: bom1::jh9sp-1794895487720-08592b3d57f5` (prior build) |
| `/sign-in` | `200` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | `server: Vercel`, `x-vercel-id: bom1::659tq-1794895488020-04d4c7eb5cdf` |
| `/sign-up` | `200` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | `server: Vercel`, `x-vercel-id: bom1::jh9sp-1794895488134-e200db41f835` |
| `/api/castoline/config-status` | `404` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | BFF routes still `404` ~90s after push; Vercel project/branch/build requires owner verification |
| `/api/castoline/auth/me` | `404` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | BFF routes still `404` ~90s after push |
| `/api/castoline/strata/categories` | `404` | `text/html; charset=utf-8` / `public, max-age=0, must-revalidate` | BFF routes still `404` ~90s after push |

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
