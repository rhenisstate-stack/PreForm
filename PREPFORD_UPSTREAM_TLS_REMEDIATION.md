# PREPFORD — UPSTREAM TLS REMEDIATION REPORT

**Date:** 2026-11-16  
**Previous Upstream Configuration:** `http://108.61.9.189:8008`  
**Verified HTTPS Upstream Configuration:** `https://explicitbackend.com`

---

## 1. Investigation Findings

1. **Direct Port 8008 Probe**: `https://108.61.9.189:8008` failed with `ERR_SSL_WRONG_VERSION_NUMBER` (Kestrel on port 8008 serves plain HTTP only).
2. **Reverse Proxy & DNS Discovery**:
   - `http://108.61.9.189:80` returned `nginx/1.28.3 (Ubuntu)`.
   - `explicitbackend.com` resolves via DNS A record to `108.61.9.189`.
   - `https://108.61.9.189/health` failed with `ERR_TLS_CERT_ALTNAME_INVALID` (certificate is bound to hostname, not IP).
3. **Strict TLS Verification on `https://explicitbackend.com:443`**:
   - Protocol: `TLSv1.3`
   - Authorized: `true` (strict certificate chain & hostname validation)
   - Subject: `CN=explicitbackend.com`
   - SAN: `DNS:explicitbackend.com, DNS:www.explicitbackend.com`
   - Issuer: `Let's Encrypt` (`CN=YE2`)
   - Validity: `Oct 16 08:20:08 2026 GMT` to `Jan 14 08:20:07 2027 GMT`

---

## 2. Live `WEBSITE_12` Verification over HTTPS

| Endpoint | Headers | Observed Result |
|---|---|---|
| `GET https://explicitbackend.com/api/castoline/strata/main/categories/list/absolute?fetchtype=absolute` | `x-site-key: WEBSITE_12`, `x-site-domain: https://www.prepford.com/`, `x-site-name: Prepford` | `HTTP 200 OK` |
| `GET https://explicitbackend.com/api/castoline/system/user/list/current?fetchtype=current` | `WEBSITE_12` (no Casto session) | `HTTP 401 Unauthorized` |
| `POST https://explicitbackend.com/api/castoline/auth/login` | `WEBSITE_12`, invalid credentials | `HTTP 401 Unauthorized` |

---

## 3. Configuration Remediation & Verification

- Updated `SKEW_LINE_DOTNET_BASE_URL=https://explicitbackend.com` in `.env.example`, `.env.local`, and `apps/web/.env.local`.
- Added strict production HTTPS test in `apps/web/tests/remote-backend-config.test.ts` (`NODE_ENV=production`, `APP_ENV=production`, `SKEW_LINE_DOTNET_BASE_URL=https://explicitbackend.com` -> `valid: true`, `errors: []`, `warnings: []`, `isHttpsBackend: true`).
- Re-ran `remote-backend-config.test.ts` + `lexmacasto-integration.test.ts`: **19/19 tests passed**.

---

## 4. Status

**RESOLVED** — Upstream transport security is verified over `TLSv1.3` at `https://explicitbackend.com` without weakening certificate or hostname validation.
