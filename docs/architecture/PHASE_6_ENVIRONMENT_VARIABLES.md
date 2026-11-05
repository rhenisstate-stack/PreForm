# PREPFORD NCLEX — PHASE 6 ENVIRONMENT VARIABLE & CONFIGURATION REFERENCE
## Authoritative Guide to System Configuration, Secrets Classification & Fail-Closed Validation

**Document File:** `docs/architecture/PHASE_6_ENVIRONMENT_VARIABLES.md`  
**Phase:** Phase 6 — Product Readiness & Operational Resilience  
**Repository:** `C:\Users\gitau\Documents\PREform`  
**Baseline Commit:** `f1beb3148828eed5ee08f83f065515cc44d383a9`  
**Date:** November 5, 2026  
**Auditor Roles:** Senior DevOps Engineer, Application Security Engineer  

---

## 1. Configuration Principles & Security Rules

1. **Zero Secret Leakage:** Production secrets must NEVER be committed to Git or embedded in client-side bundles (no `NEXT_PUBLIC_` prefixes on secret credentials).
2. **Fail-Closed Startup:** Production environments refuse to boot if required security secrets are missing or set to placeholder/development values.
3. **Environment Segregation:** Development, Staging, and Production environments use distinct credentials and keys.

---

## 2. Environment Variable Matrix

| Variable Name | Purpose | Sensitivity | Required / Optional | Environments | Safe Example Value | Validation Behavior When Missing |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `NODE_ENV` | Next.js runtime environment | Non-Sensitive | **Required** | All | `production` / `development` | Defaults to `development`. |
| `APP_ENV` | PrepFord application environment tier | Non-Sensitive | **Required** | All | `production` / `staging` / `development` | Defaults to `development`. Production triggers strict security gates. |
| `PORT` | Web server listening port | Non-Sensitive | Optional | All | `3000` | Defaults to `3000` for web, `4000` for API. |
| `WEB_ORIGIN` | Allowed CORS origin for browser requests | Non-Sensitive | **Required** in Prod | All | `https://prepford.com` | Defaults to `http://localhost:3000` in dev. In prod, mismatches trigger CORS rejection. |
| `DATABASE_URL` | PostgreSQL connection string | **Sensitive (Secret)** | **Required** | All | `postgresql://user:pass@pg.host:5432/prepford?schema=public` | Fatal error on startup: database connection fails. |
| `GATEWAY_SHARED_SECRET` | Secret for mutual HMAC signing between BFF and API | **Sensitive (Secret)** | **Required** in Prod (>= 32 chars) | All | `<generate-random-32-char-hex-or-base64>` | In production, BFF and API refuse to start if missing or default. |
| `SESSION_SECRET` | Secret used to sign and verify candidate session cookies | **Sensitive (Secret)** | **Required** in Prod (>= 32 chars) | All | `<generate-random-32-char-hex-or-base64>` | In production, cookie signing fails if missing. |
| `WEBHOOK_SIGNING_SECRET`| Secret used to verify Stripe/payment webhook signatures | **Sensitive (Secret)** | **Required** in Prod | All | `<generate-random-32-char-hex-or-base64>` | Production rejects all payment webhooks with 400 signature mismatch. |
| `ENABLE_MOCK_CHECKOUT` | Allows simulated sandbox purchases in non-prod | Non-Sensitive | Optional | Dev / Staging | `false` in Prod; `true` in Dev/Staging | Defaults to `false`. Production ignores `true` and fails closed. |
| `INTERNAL_API_URL` | Internal backend URL reachable by BFF container | Non-Sensitive | **Required** in Prod | Staging / Prod | `http://prepford-api:4000` | Defaults to `http://127.0.0.1:4000`. |
| `API_GATEWAY_URL` | Gateway route URL for backend dispatches | Non-Sensitive | Optional | All | `http://prepford-api:4000` | Falls back to `INTERNAL_API_URL`. |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID for social sign-in | Non-Sensitive | Optional | All | `123456789-abc.apps.googleusercontent.com` | Google sign-in button disabled if missing. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret for token exchange | **Sensitive (Secret)** | Optional | All | `<google-oauth-secret>` | Token exchange fails if missing. |
| `CONTACT_EMAIL_RECIPIENT`| Destination email for contact form inquiries | Non-Sensitive | Optional | All | `support@prepford.com` | Defaults to `support@prepford.com`. |

---

## 3. Environment-Specific Profiles

### 3.1 Local Development (`.env.local`)
```bash
NODE_ENV=development
APP_ENV=development
PORT=3000
WEB_ORIGIN=http://localhost:3000
INTERNAL_API_URL=http://localhost:4000
DATABASE_URL=postgresql://postgres:local-dev-only-change-me@localhost:5432/prepford?schema=public
GATEWAY_SHARED_SECRET=prepford-default-internal-gateway-secret-32-chars!
SESSION_SECRET=prepford-local-dev-session-secret-change-me-32-chars!
ENABLE_MOCK_CHECKOUT=true
```

### 3.2 Production (`Production Environment Vault / K8s Secrets`)
```bash
NODE_ENV=production
APP_ENV=production
PORT=3000
WEB_ORIGIN=https://prepford.com
INTERNAL_API_URL=http://prepford-api-cluster:4000
DATABASE_URL=postgresql://prepford_prod_app:<REDACTED>@pg-ha.internal:5432/prepford_prod?sslmode=require&schema=public
GATEWAY_SHARED_SECRET=<32+ character high-entropy cryptographically random string>
SESSION_SECRET=<32+ character high-entropy cryptographically random string>
WEBHOOK_SIGNING_SECRET=<32+ character Stripe webhook signing secret>
ENABLE_MOCK_CHECKOUT=false
```

---

## 4. Verification Check

To verify that required secrets are set correctly prior to release, run the validation probe:
```bash
# Validates that all production-mandated environment variables are non-default
node -e "
  const env = process.env.APP_ENV || 'development';
  if (env === 'production') {
    const required = ['DATABASE_URL', 'GATEWAY_SHARED_SECRET', 'SESSION_SECRET', 'WEBHOOK_SIGNING_SECRET'];
    for (const r of required) {
      if (!process.env[r] || process.env[r].includes('default') || process.env[r].includes('change-me')) {
        console.error('FATAL: Production secret ' + r + ' is missing or set to a development default value!');
        process.exit(1);
      }
    }
    console.log('Production configuration validation passed.');
  }
"
```
