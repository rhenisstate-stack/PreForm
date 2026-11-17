# PREPFORD — PHASE 12 FINAL PRODUCTION ACCEPTANCE REPORT

**Date:** 2026-11-17  
**Repository:** `c:\Users\gitau\Documents\PREform`  
**Production Domain:** `https://www.prepford.com/`  
**Central Identity:** `WEBSITE_12`  
**Upstream Backend:** `https://explicitbackend.com`  
**Phase 12 Release Decision:** **CONDITIONALLY ACCEPTED** (Pushed `53e850f` to owner-authorized `preform/feature/dotnet-backend-migration`; pending Vercel dashboard/CLI confirmation & deployment of `53e850f`, plus provisioned `WEBSITE_12` test account)

---

## 1. Executive Summary & Release Decision

Phase 12 verified the local Git state (`53e850f`, 5 commits ahead of `preform/feature/dotnet-backend-migration` at `b29c448` with zero divergence), audited the outgoing diff, and executed the owner-authorized push of `feature/dotnet-backend-migration` to `preform` (`https://github.com/rhenisstate-stack/PreForm.git`) at commit `53e850f4647cb63002bf58a17dc656bd4ebd22b6`. `origin/main` (`2aef11c`) was not modified.

Re-probing `https://explicitbackend.com` on `2026-11-17` confirmed upstream reachability (`HTTP 200 application/json; charset=utf-8` on `WEBSITE_12` strata). However, the release remains **CONDITIONALLY ACCEPTED** pending two external items requiring owner/admin completion:
1. **Vercel Production Project Verification, Env Vars & Deployment Confirmation:** Local `npx vercel whoami` (`Vercel CLI 65.16.0`) is `Logged out`, `VERCEL_TOKEN` is unset, and `.vercel/project.json` is absent. Live probes ~90 seconds after the push confirm `https://www.prepford.com/api/castoline/*` still returns `HTTP 404` (`text/html; charset=utf-8`), so the owner must verify in Vercel that `www.prepford.com` is linked to `rhenisstate-stack/PreForm` with Production Branch `feature/dotnet-backend-migration`, verify the 6 server-side `SKEW_LINE_*` Production environment variables, and confirm/trigger deployment of `53e850f`+.
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

The following six server-side variables are required in Vercel's **Production** scope (none with `NEXT_PUBLIC_`):

| Variable | Local `.env.local` / `apps/web/.env.local` Presence | Vercel Production Status |
|---|---|---|
| `SKEW_LINE_APP_NAME` | Present (server-side) | **UNVERIFIED** (no authenticated Vercel access) |
| `SKEW_LINE_APP_TITLE` | Present (server-side) | **UNVERIFIED** (no authenticated Vercel access) |
| `SKEW_LINE_APP_DOMAIN` | Present (server-side) | **UNVERIFIED** (no authenticated Vercel access) |
| `SKEW_LINE_APP_KEY` | Present (server-side) | **UNVERIFIED** (no authenticated Vercel access) |
| `SKEW_LINE_ACTIVE_BACKEND` | Present (server-side) | **UNVERIFIED** (no authenticated Vercel access) |
| `SKEW_LINE_DOTNET_BASE_URL` | Present (server-side) | **UNVERIFIED** (no authenticated Vercel access) |

*(Per security policy, variable values and secrets are not printed.)*

---

## 5. Deployment Commit SHA & Deployment Result

- **Git Push to Authorized Production Branch:** **COMPLETED** — `git push preform feature/dotnet-backend-migration` pushed `b29c448..53e850f` to `https://github.com/rhenisstate-stack/PreForm.git` (`refs/heads/feature/dotnet-backend-migration` verified at `53e850f4647cb63002bf58a17dc656bd4ebd22b6`). `origin/main` (`2aef11c`) was not modified.
- **Vercel Deployment Status:** **PENDING OWNER VERIFICATION / DEPLOYMENT** — No Vercel CLI authentication or `VERCEL_TOKEN` is available locally, and `https://www.prepford.com/api/castoline/*` still returned `404` ~90 seconds after the push.
- **Live Production Observation:** `https://www.prepford.com/` is still serving an older production build that does not include `/api/castoline/*`.

---

## 6. Production Route Smoke-Test Results

Executed against `https://www.prepford.com/` on `2026-11-17` (~90 seconds post-push):

| Method & URL | HTTP Status | Content-Type | Cache-Control | Result / Contract Check |
|---|---|---|---|---|
| `GET https://www.prepford.com/` | `200` | `text/html; charset=utf-8` | `public, max-age=0, must-revalidate` | **PASS** (prior build live) |
| `GET https://www.prepford.com/sign-in` | `200` | `text/html; charset=utf-8` | `public, max-age=0, must-revalidate` | **PASS** |
| `GET https://www.prepford.com/sign-up` | `200` | `text/html; charset=utf-8` | `public, max-age=0, must-revalidate` | **PASS** |
| `GET https://www.prepford.com/api/castoline/config-status` | `404` | `text/html; charset=utf-8` | `public, max-age=0, must-revalidate` | **PENDING DEPLOYMENT** (route missing in currently live build) |
| `GET https://www.prepford.com/api/castoline/auth/me` | `404` | `text/html; charset=utf-8` | `public, max-age=0, must-revalidate` | **PENDING DEPLOYMENT** (route missing in currently live build) |
| `GET https://www.prepford.com/api/castoline/strata/categories` | `404` | `text/html; charset=utf-8` | `public, max-age=0, must-revalidate` | **PENDING DEPLOYMENT** (route missing in currently live build) |

---

## 7. Authorized Authentication Lifecycle Results

- **Positive Lifecycle (`WEBSITE_12` Login -> `/api/castoline/auth/me` -> Logout -> `401`):** **UNVERIFIED / BLOCKED_EXTERNAL_DEPENDENCY** — no authorized `WEBSITE_12` test account credentials are available locally.
- **Negative & Boundary Controls:** Preserved from Phase 11 (`lexmacasto-integration.test.ts` and `remote-backend-config.test.ts`). Direct probe to `https://explicitbackend.com/api/castoline/strata/main/categories/list/absolute?fetchtype=absolute` with `WEBSITE_12` on `2026-11-17` returned `HTTP 200 application/json; charset=utf-8`.

---

## 8. Security Audit Results

- **Live Production Bundle Scan (`https://www.prepford.com/`):**
  - Fetched HTML for `/`, `/sign-in`, and `/sign-up` and scanned all **22** referenced `/_next/static/immutable/chunks/*.js` bundles.
  - **Findings:** **0** occurrences of `WEBSITE_12`, `WEBSITE_11`, `WEBSITE_1`, `explicitbackend`, `108.61.9.189`, `SKEW_LINE`, or `castoline`.
- **Post-Deployment Security Audit:** Pending fresh Vercel Production deployment of commit `1dace09`+ to inspect the newly deployed client bundles, `Cache-Control: no-store` headers, HttpOnly/Secure/SameSite cookie attributes, and CSRF rejection in production.

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

1. **Vercel Project & Production Deployment Confirmation:** Verify in the Vercel dashboard (or via authenticated Vercel CLI) that `www.prepford.com` is connected to `rhenisstate-stack/PreForm` with Production Branch `feature/dotnet-backend-migration`, Root Directory `apps/web`, and the 6 server-side `SKEW_LINE_*` Production environment variables, then confirm/trigger deployment of the pushed commit.
2. **Authorized `WEBSITE_12` Test Account:** Provision a dedicated `WEBSITE_12` test user in LexmaCasto and supply credentials through a secure local channel (untracked local env/secret file) to execute the positive and negative production authentication lifecycle.

---

## 11. Explicit Release Recommendation

**CONDITIONALLY ACCEPTED** — Retain `CONDITIONALLY ACCEPTED` until:
1. Vercel confirms `rhenisstate-stack/PreForm` (`feature/dotnet-backend-migration`) as the Production branch and deploys the reviewed commit to `https://www.prepford.com/` with all 6 server-side `SKEW_LINE_*` Production variables verified,
2. Live `/api/castoline/*` smoke tests, upstream BFF connectivity, and post-deployment bundle/security checks pass on `https://www.prepford.com/`, and
3. The authorized `WEBSITE_12` positive and negative authentication lifecycle is executed against the live deployment.
