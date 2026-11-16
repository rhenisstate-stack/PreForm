# PREPFORD — WEBSITE IDENTITY REPORT

**Date:** 2026-11-16  
**Application:** PrepFord  
**Website Key:** `WEBSITE_12`  
**Registered Domain:** `https://www.prepford.com/`

---

## 1. Authoritative Identity Configuration

| Variable | Value | Scope |
|---|---|---|
| `SKEW_LINE_APP_NAME` | `Prepford` | Server-only |
| `SKEW_LINE_APP_TITLE` | `Prepford` | Server-only |
| `SKEW_LINE_APP_DOMAIN` | `https://www.prepford.com/` | Server-only |
| `SKEW_LINE_APP_KEY` | `WEBSITE_12` | Server-only |
| `SKEW_LINE_ACTIVE_BACKEND` | `dotnet` | Server-only |
| `SKEW_LINE_DOTNET_BASE_URL` | `http://108.61.9.189:8008` | Server-only |

No `NEXT_PUBLIC_` prefixes are used for any SKEW_LINE variable.

---

## 2. Fail-Closed Identity Isolation

Implemented in `apps/web/src/lib/env-config.ts`:
- `validatePrepfordEnvironment()` and `resolveSkewLineIdentity()` require `SKEW_LINE_APP_KEY === "WEBSITE_12"`, `SKEW_LINE_APP_NAME === "Prepford"`, `SKEW_LINE_APP_TITLE === "Prepford"`, and `SKEW_LINE_APP_DOMAIN === "https://www.prepford.com/"`.
- Any missing value, `WEBSITE_1`, `WEBSITE_11`, or Vercel preview domain fails closed with `SkewLineConfigurationError` (HTTP `503` at BFF routes).
- `buildSiteHeaders()` in `apps/web/src/lib/lexmacasto/headers.ts` constructs `x-site-key`, `x-site-domain`, and `x-site-name` exclusively from `resolveSkewLineIdentity()`, overriding any browser-supplied headers.

---

## 3. Canonical Domain & Production DNS/HTTPS Verification

Live HTTP probes conducted on 2026-11-16:
- `https://www.prepford.com/` -> `HTTP/1.1 200 OK` (`Server: Vercel`, `Strict-Transport-Security: max-age=63072000`).
- `https://prepford.com/` -> `HTTP/1.1 308 Permanent Redirect` to `Location: https://www.prepford.com/`.

---

## 4. Upstream Identity Verification & External Dependencies

- Live probe to `http://108.61.9.189:8008/api/castoline/strata/main/categories/list/absolute?fetchtype=absolute` with `x-site-key: WEBSITE_12`, `x-site-domain: https://www.prepford.com/`, `x-site-name: Prepford` returned `HTTP/1.1 200 OK` (`{"success":true,"message":"Categories Fetched Successfully ⚓",...}`).
- **External Dependency (Transport TLS)**: Port `8008` on `108.61.9.189` is plain HTTP (`ERR_SSL_WRONG_VERSION_NUMBER` on HTTPS). An HTTPS/TLS reverse proxy is required before enabling `APP_ENV=production` strict mode for LexmaCasto traffic.
