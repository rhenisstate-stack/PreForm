# PREPFORD — LIVE INTEGRATION VERIFICATION

**Date:** 2026-11-16  
**Target Environment:** Local BFF + Live Upstream LexmaCasto Backend (`http://108.61.9.189:8008`)  
**Production Domain:** `https://www.prepford.com/`

---

## 1. Live Connectivity & Identity Probes (2026-11-16)

| Check | Endpoint / Target | Observed Result | Status |
|---|---|---|---|
| Production Canonical Domain | `https://www.prepford.com/` | `HTTP/1.1 200 OK` (`Server: Vercel`, HSTS enabled) | PASS |
| Apex Redirect | `https://prepford.com/` | `HTTP/1.1 308 Permanent Redirect` -> `https://www.prepford.com/` | PASS |
| Upstream Strata + `WEBSITE_12` | `GET http://108.61.9.189:8008/api/castoline/strata/main/categories/list/absolute?fetchtype=absolute` | `HTTP/1.1 200 OK`, `Server: Kestrel`, `{"success":true,"message":"Categories Fetched Successfully ⚓",...}` | PASS |
| Upstream Current User (No Session) | `GET http://108.61.9.189:8008/api/castoline/system/user/list/current?fetchtype=current` | `HTTP/1.1 401 Unauthorized`, `{"error":"Missing Casto authentication headers"}` | PASS |
| Upstream Login (Invalid Credentials) | `POST http://108.61.9.189:8008/api/castoline/auth/login` | `HTTP/1.1 401 Unauthorized` | PASS |
| Upstream HTTPS/TLS Check | `https://108.61.9.189:8008/health` | `ERR_SSL_WRONG_VERSION_NUMBER` (port 8008 is plain HTTP) | EXTERNAL BLOCKER |

---

## 2. Blocked Live Checks (External Dependencies)

1. **Authenticated Live Login / Current-User / Logout Round-Trip**: Blocked — no authorized `WEBSITE_12` PrepFord test account credentials were provided for `http://108.61.9.189:8008`, and real learner accounts/records were not touched per policy.
2. **Production HTTPS Upstream Transport**: Blocked — `108.61.9.189:8008` does not terminate TLS. Strict production mode (`APP_ENV=production`) fails closed until an HTTPS reverse proxy is provisioned.
3. **Production Deployment Verification**: Local code changes have not yet been deployed to Vercel production (`https://www.prepford.com/`).
