# PREPFORD — QLEX-NURSING / LEXMACASTO INTEGRATION AUDIT

**Date:** 2026-11-16  
**Target Application:** PrepFord (`c:\Users\gitau\Documents\PREform`)  
**Reference Implementation:** Qlex-Nursing (`c:\Users\gitau\Documents\Qlex-Nursing`)  
**Integration Precedent:** NURVIA (`c:\Users\gitau\Documents\NURVIA`)

---

## 1. Executive Audit Summary

This audit establishes the authoritative Qlex-Nursing/LexmaCasto integration contract, compares it against NURVIA's hardened BFF precedent, and maps it onto PrepFord's existing Next.js 16 (App Router) + React 19 + ASP.NET Core 8 + PostgreSQL architecture without compromising PrepFord's NCLEX examination engine.

---

## 2. Qlex-Nursing Reference Findings (Authoritative Contract)

Direct inspection of `Qlex-Nursing/src/middleware.ts`, `src/lib/config/siteHeaders.ts`, `src/lib/api/api/api.ts`, and `src/app/api/auth/*` established:

1. **Required Website Identity Headers**:
   - `x-site-key` (from `SKEW_LINE_APP_KEY`)
   - `x-site-domain` (from `SKEW_LINE_APP_DOMAIN`)
   - `x-site-name` (from `SKEW_LINE_APP_NAME`)
   - Telemetry/context headers: `x-site-path`, `x-site-ip-address`, `x-site-location`, `x-site-country`, `x-site-brouser` (preserved spelling), `x-site-time`, `x-site-referrer`, `x-site-mobile`, `x-site-request-id`, `x-site-session-id`.
2. **Custom Session Headers**:
   - `x-casto-line` and `x-casto-badge` returned on login (`user.castoLine`, `user.castoBadge`) and required on authenticated requests (`/api/castoline/system/user/list/current` and `/api/castoline/auth/logout/sessions/*`).
3. **Verified Upstream Endpoints & Mandatory `fetchtype`**:
   - Login: `POST /api/castoline/auth/login`
   - Register: `POST /api/castoline/auth/register`
   - Current User: `GET /api/castoline/system/user/list/current?fetchtype=current` (not `/api/castoline/auth/me`)
   - Logout: `POST /api/castoline/auth/logout/sessions/distinct` and `POST /api/castoline/auth/logout/sessions/relative` with `{ target_dashboard }`
   - Strata lists: `/api/castoline/strata/{main|learning|assessment|institution}/{resource}/list/{absolute|live}?fetchtype={absolute|live}`

---

## 3. NURVIA Integration Precedent Findings

Direct inspection of `NURVIA/apps/web/lib/lexmacasto/*`, `NURVIA/apps/web/lib/api-config.mjs`, and `NURVIA/apps/web/app/api/auth/*` established the hardened BFF pattern:
- **HttpOnly Cookie Isolation**: `castoLine` and `castoBadge` are stored exclusively in `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookies and stripped from browser-facing JSON.
- **Same-Origin CSRF Protection**: State-changing `POST` routes validate `sec-fetch-site`, `Origin`, and `Referer` against `Host` without inventing an unsupported `/csrf` endpoint.
- **Server-Owned Header Precedence**: `buildSiteHeaders` and `buildCastoAuthHeaders` override any caller-supplied headers.
- **Route Allowlisting & `fetchtype` Enforcement**: Only allowlisted `/api/castoline/...` paths are permitted; `fetchtype` cannot be omitted or overridden by query parameters.

---

## 4. Existing PrepFord Architecture & Compatibility Matrix

| Layer | PrepFord Existing Component | Compatibility & Integration Boundary |
|---|---|---|
| Frontend | Next.js 16.4.3 App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, RHF + Zod | Preserved intact; browser calls same-origin `/api/*` BFF routes only. |
| Local Backend | ASP.NET Core 8 (`apps/api`, `http://localhost:4000`) + EF Core 8 + PostgreSQL | Preserved as authoritative owner of NCLEX-RN/PN exams, question banks, NGN grading, study studio, subscriptions, and RBAC. |
| Central Integration | `apps/web/src/lib/lexmacasto/*` + `/api/castoline/*` BFF routes | Dedicated server-side integration to `SKEW_LINE_DOTNET_BASE_URL` using `WEBSITE_12`. |
| Content Hierarchy | Main / Learning / Assessment / Institution strata | Mapped via `/api/castoline/strata/[resource]` without altering PrepFord's PostgreSQL schema. |

---

## 5. Identified Discrepancies & Remediations

1. **Cross-Website Key Contamination (P0/P1)**: `.env.example`, `.env.local`, `apps/web/src/lib/env-config.ts`, `apps/web/src/lib/backend-diagnostics.ts`, and `apps/web/tests/remote-backend-config.test.ts` previously referenced `WEBSITE_1` (Qlex-Nursing's key), and `apps/web/.env.local` contained a `# NURVIA` header comment. Remediated to enforce `WEBSITE_12` exclusively with fail-closed validation.
2. **Backend URL Misrouting Bug (P1)**: `resolveBackendBaseUrl()` in `env-config.ts` previously prioritized `SKEW_LINE_DOTNET_BASE_URL` over `INTERNAL_API_URL`, which caused `api-client.ts` (`getApiBaseUrl()`) to route PrepFord-local `/api/v1/*` requests to `108.61.9.189:8008` instead of PrepFord's ASP.NET Core 8 API (`http://localhost:4000`). Remediated by separating `resolvePrepfordApiBaseUrl()` from `resolveSkewLineBaseUrl()`.
3. **Upstream Transport Security (External Dependency)**: `http://108.61.9.189:8008` serves plain HTTP (`ERR_SSL_WRONG_VERSION_NUMBER` on HTTPS probe). Strict production mode (`NODE_ENV=production && APP_ENV=production`) fails closed until an HTTPS reverse proxy is configured.
