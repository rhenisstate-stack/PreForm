# PREPFORD — SECURITY VERIFICATION REPORT

**Date:** 2026-11-16  
**Target:** PrepFord (`c:\Users\gitau\Documents\PREform`)

---

## 1. Secret & Identity Isolation

- `SKEW_LINE_APP_KEY` (`WEBSITE_12`), `SKEW_LINE_APP_DOMAIN` (`https://www.prepford.com/`), and `SKEW_LINE_DOTNET_BASE_URL` are server-only environment variables (zero `NEXT_PUBLIC_*` prefixes).
- `buildSiteHeaders()` in `apps/web/src/lib/lexmacasto/headers.ts` overrides any browser-supplied `x-site-key` or `x-site-domain` headers.
- `extractCastoCredentialsFromLogin()` and `sanitizeAuthUser()` in `apps/web/src/lib/lexmacasto/client.ts` strip `castoLine` and `castoBadge` from all browser-facing JSON responses.
- `/api/castoline/config-status` returns non-secret boolean/status diagnostics only (`appKeyConfigured: true`) and never leaks `WEBSITE_12` or `108.61.9.189`.

---

## 2. CSRF, Origin & Request Boundary Protection

- `validateSameOriginRequest()` in `apps/web/src/lib/lexmacasto/session.ts` enforces `sec-fetch-site !== "cross-site"` and `Origin`/`Referer` host matching against `Host` on all state-changing `/api/castoline/*` `POST` routes.
- Content-Type enforcement (`application/json`, `415`) and request body size limits (`32KB`, `413`) are enforced on `/api/castoline/auth/login` and `/api/castoline/auth/register`.
- `assertSafeBackendPath()` restricts upstream LexmaCasto calls to `/api/castoline/...` paths, rejecting `..`, `//`, and CRLF/NUL injection (tested before `.trim()`).

---

## 3. Cookie & Session Security

- Casto session tokens are stored exclusively in `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` (in production) cookies: `prepford_casto_line`, `prepford_casto_badge`, `prepford_casto_dashboard`.
- `/api/castoline/auth/me` validates the session against `/api/castoline/system/user/list/current?fetchtype=current` and clears local Casto cookies on `401`/`403` or incomplete user responses.
- `/api/castoline/auth/logout` revokes the upstream session via `LOGOUT_DISTINCT` / `LOGOUT_RELATIVE` and clears local Casto cookies even if upstream revocation fails.

---

## 4. Caching, RBAC & Logging Redaction

- All `/api/castoline/*` routes and `/api/auth/session`, `/api/auth/logout` set `Cache-Control: no-store`.
- `/api/castoline/auth/register` forces `role: "Learner"` to prevent client-side privilege escalation.
- PrepFord's existing ASP.NET Core 8 RBAC (`candidate`, `admin`, `superadmin`, `instructor`, `reviewer`) and HMAC gateway signing (`GATEWAY_SHARED_SECRET`) remain intact and isolated from LexmaCasto.
- `redactHeadersForLog()` and `redactPayloadForLog()` redact `x-site-key`, `x-casto-line`, `x-casto-badge`, `password`, `pin`, and `token` values.
