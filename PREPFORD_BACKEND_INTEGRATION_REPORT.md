# PREPFORD — BACKEND INTEGRATION REPORT

**Date:** 2026-11-16  
**Target:** PrepFord (`apps/web` Next.js BFF + `apps/api` ASP.NET Core 8 + PostgreSQL)

---

## 1. Integration Architecture

PrepFord maintains strict separation between its authoritative NCLEX examination backend and the central LexmaCasto/Qlex-Nursing website integration:

```text
PREPFORD BROWSER
   │  (Same-origin requests; HttpOnly cookies only; zero secrets in JS)
   ▼
PREPFORD NEXT.JS BFF (apps/web/src/app/api/*)
   ├── /api/v1/* & /api/auth/* ──► PREPFORD ASP.NET CORE 8 + POSTGRESQL (INTERNAL_API_URL)
   │                                (NCLEX-RN/PN exams, NGN grading, study studio, RBAC)
   └── /api/castoline/*         ──► LEXMACASTO / QLEX-NURSING BACKEND (SKEW_LINE_DOTNET_BASE_URL)
                                    (WEBSITE_12, x-site-*, x-casto-line, x-casto-badge, fetchtype)
```

---

## 2. Centralized Integration Service (`apps/web/src/lib/lexmacasto/`)

- `contracts.ts`: Defines verified Qlex-Nursing auth endpoints (`/api/castoline/auth/login`, `/api/castoline/auth/register`, `/api/castoline/system/user/list/current?fetchtype=current`, `/api/castoline/auth/logout/sessions/distinct`, `/api/castoline/auth/logout/sessions/relative`) and allowlisted strata endpoints with mandatory `fetchtype`.
- `headers.ts`: Centralizes `buildSiteHeaders()`, `buildCastoAuthHeaders()`, `sanitizeHeaderValue()` (CRLF/control-char stripping), `redactHeadersForLog()`, and `redactPayloadForLog()`.
- `session.ts`: Manages `HttpOnly` cookies (`prepford_casto_line`, `prepford_casto_badge`, `prepford_casto_dashboard`) and `validateSameOriginRequest()` CSRF protection.
- `client.ts`: Implements `lexmaCastoRequest()` with `assertSafeBackendPath()`, `AbortController` timeouts (20s), `redirect: "manual"`, `cache: "no-store"`, error normalization (400/401/403/404/409/422/429/500/502/503/504), `extractCastoCredentialsFromLogin()`, and `sanitizeAuthUser()`.

---

## 3. BFF API Routes (`apps/web/src/app/api/castoline/`)

| Route | Method | Upstream Target | Security Controls |
|---|---|---|---|
| `/api/castoline/auth/login` | `POST` | `/api/castoline/auth/login` | Same-origin CSRF, JSON `415`, 32KB limit `413`, `HttpOnly` cookies, `no-store` |
| `/api/castoline/auth/register` | `POST` | `/api/castoline/auth/register` | Same-origin CSRF, forces `role: "Learner"`, `no-store` |
| `/api/castoline/auth/me` | `GET` | `/api/castoline/system/user/list/current?fetchtype=current` | Reads `HttpOnly` cookies, clears on `401`/`403`, `no-store` |
| `/api/castoline/auth/logout` | `POST` | `/api/castoline/auth/logout/sessions/{distinct\|relative}` | Same-origin CSRF, clears `HttpOnly` cookies even on upstream failure, `no-store` |
| `/api/castoline/strata/[resource]` | `GET` | `/api/castoline/strata/...` | Allowlist, bounded `page`/`perPage`, server-enforced `fetchtype`, `no-store` |
| `/api/castoline/config-status` | `GET` | Local validation only | Non-secret diagnostics, `no-store` |

---

## 4. PostgreSQL Ownership Boundaries

- **PostgreSQL (`apps/api`)** remains the sole authoritative datastore for PrepFord users, roles, `UserSessions`, NCLEX-RN/PN examinations, NGN question types, attempts, study guides, flashcards, subscriptions, and entitlements.
- No SQLite runtime dependency was introduced, and no destructive schema migrations were performed.
