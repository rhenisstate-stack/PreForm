# PREPFORD — P3.7 ENVIRONMENT & CONFIGURATION READINESS

**Phase:** P3.7 — Deployment Readiness & Controlled Release Validation  
**Workstream:** P3.7.2 — Environment and Configuration Readiness  
**Repository:** `C:\Users\gitau\Documents\PREform`  
**Execution Date:** November 4, 2026  
**Auditor Roles:** Senior DevOps Engineer, Application Security Engineer  

---

## 1. Configuration Principles & Security Rules

1. **Strict Secret Hygiene:** No secrets, credentials, or private signing keys are committed to Git. All secrets are injected dynamically via hosting platform environment variables or secure vault stores.
2. **Zero Client Secret Leakage:** No server-side secret (`SESSION_SECRET`, `GATEWAY_SHARED_SECRET`, `DATABASE_URL`, `STRIPE_SECRET_KEY`, `GOOGLE_CLIENT_SECRET`) is ever prefixed with `NEXT_PUBLIC_` or imported into client components.
3. **Environment Isolation:** Staging environments must utilize dedicated, distinct credentials and connection strings completely isolated from production. Staging must never connect to production PostgreSQL or use production HMAC keys.
4. **Fail-Closed Production Guards:** In production (`NODE_ENV=production` and `APP_ENV=production`), missing critical secrets (`SESSION_SECRET`, `GATEWAY_SHARED_SECRET`) abort startup immediately rather than falling back to development defaults.
5. **No Secret Printing:** Secrets must never be logged, echoed in test runs, printed in error messages, or embedded in generated artifacts.

---

## 2. Environment-Variable Inventory

The following comprehensive inventory details every configuration variable across Frontend (`apps/web`) and Backend (`apps/api`):

| Variable Name | Application | Environment | Required | Secret | Purpose | Validation | Source | Status |
|---|:---:|:---:|:---:|:---:|---|---|:---:|:---:|
| `NODE_ENV` | Frontend | All | Yes | No | Node.js execution runtime mode (`development`, `test`, `production`) | Verified by Next.js runtime | Process / CI | **Verified** |
| `APP_ENV` | Frontend / Backend | All | Yes | No | Application environment level (`development`, `staging`, `production`) | Parsed in session and payment guards | Hosting Env | **Verified** |
| `PORT` | Frontend | Staging, Prod | No | No | Port on which the Next.js web application listens (default 3000) | Clamped integer parser | Hosting / Docker | **Verified** |
| `WEB_ORIGIN` | Backend | All | Yes | No | Authorized CORS origin for frontend requests (e.g. `https://staging.prepford.com`) | CORS policy check in `Program.cs` | Hosting Env | **Verified** |
| `INTERNAL_API_URL` | Frontend | All | Yes | No | Private network endpoint for ASP.NET Core backend (e.g. `http://api:4000`) | URL validation in `api-client.ts` | Hosting Env | **Verified** |
| `API_GATEWAY_URL` | Frontend | Staging, Prod | No | No | Public or gateway URL for ASP.NET Core backend if distinct from internal URL | URL validation in `api-client.ts` | Hosting Env | **Verified** |
| `NEXT_PUBLIC_API_URL` | Frontend | Local, Staging | No | No | Fallback browser API URL for direct client queries | URL format verification | Hosting Env | **Verified** |
| `NEXT_PUBLIC_APP_URL` | Frontend | All | Yes | No | Canonical public web URL used for SEO, canonical links, and OAuth redirects | Validated in auth client | Hosting Env | **Verified** |
| `NEXT_PUBLIC_ENABLE_MOCK_CHECKOUT` | Frontend | Local, Staging | No | No | Enables mock checkout UI in non-production environments | Boolean check; forced false in prod | Hosting Env | **Verified** |
| `SESSION_SECRET` | Frontend | All | Yes | **YES** | Cryptographic key (min 32 chars) for signing `preform_session` cookies | Throws in production if missing or weak | Secret Store | **Verified** |
| `GATEWAY_SHARED_SECRET` | Both | All | Yes | **YES** | Symmetric secret used to sign and verify `x-gateway-signature` HMAC | Throws in production if missing | Secret Store | **Verified** |
| `DATABASE_URL` | Backend | All | Yes | **YES** | Primary PostgreSQL connection URI (`postgresql://user:pass@host:port/db?schema=public`) | Checked via `PostgresHealthCheck` | Secret Store | **Verified** |
| `PREFORM_GATEB_TEST_CONNECTION_STRING` | Backend | Test | No | No | Isolated loopback PostgreSQL guard connection string for integration tests | Checked in `PostgresTestFixture.cs` | Ephemeral CI | **Verified** |
| `ASPNETCORE_ENVIRONMENT` | Backend | All | Yes | No | ASP.NET Core hosting mode (`Development`, `Staging`, `Production`, `Testing`) | Read by host builder | Hosting / Systemd | **Verified** |
| `ASPNETCORE_URLS` | Backend | Staging, Prod | Yes | No | HTTP listening endpoints for ASP.NET Core (e.g. `http://0.0.0.0:4000`) | Read by Kestrel web server | Hosting / Docker | **Verified** |
| `GOOGLE_CLIENT_ID` | Both | Staging, Prod | No | No | Google OAuth 2.0 Client ID for candidate social sign-in | Validated during OAuth handshake | GCP Console | **Verified** |
| `GOOGLE_CLIENT_SECRET` | Frontend | Staging, Prod | No | **YES** | Google OAuth 2.0 Client Secret | Validated in `/api/auth/google/callback` | Secret Store | **Verified** |
| `STRIPE_SECRET_KEY` | Both | Prod | No | **YES** | Live Stripe API secret key for payment processing | Required once live merchant active | Secret Store | **Deferred** |
| `PAYPAL_CLIENT_SECRET` | Both | Prod | No | **YES** | Live PayPal REST API secret | Required once live merchant active | Secret Store | **Deferred** |
| `WEBHOOK_SIGNING_SECRET` | Backend | Staging, Prod | No | **YES** | Secret for validating external payment webhook signatures | Verified in webhook handler | Secret Store | **Deferred** |
| `CONTACT_EMAIL_RECIPIENT` | Frontend | All | No | No | Email address for contact form inquiries (e.g. `support@prepford.com`) | Validated in contact route handler | Hosting Env | **Verified** |
| `BOOTSTRAP_SUPERADMIN_ENABLED` | Backend | Staging | No | No | Enables initial administrative user creation on first startup | Read in `Program.cs` | Hosting Env | **Verified** |
| `SUPERADMIN_EMAIL` | Backend | Staging | No | No | Initial Superadmin account email address | Validated in `AdminBootstrapService` | Hosting Env | **Verified** |
| `SUPERADMIN_PASSWORD` | Backend | Staging | No | **YES** | Initial Superadmin account temporary password | Password complexity validation | Secret Store | **Verified** |

---

## 3. Environment-by-Environment Verification Model

### 3.1 Local Development
- **Frontend Target:** `http://localhost:3000`
- **Backend Target:** `http://localhost:4000`
- **Database:** Local PostgreSQL (`prepford` on `127.0.0.1:5432`)
- **Authentication:** Local development session secrets; mock checkout enabled (`ENABLE_MOCK_CHECKOUT=true`).
- **File:** `.env.example` serves as baseline template.

### 3.2 Automated Testing
- **Frontend Runner:** Vitest with JSDOM event emulation.
- **Backend Runner:** xUnit on .NET 8.
- **Database:** Isolated loopback database `prepford_gateb_verification` (127.0.0.1:5432) guarded by `PREFORM_GATEB_TEST_CONNECTION_STRING`.
- **Invariants:** 100% ephemeral state; no external network egress required; zero production data contact.

### 3.3 Staging Environment
- **Frontend Target:** `https://staging.prepford.com` (or staging preview deployment URL)
- **Backend Target:** `https://api-staging.prepford.com` (or private VPC service mesh `http://prepford-api-staging:4000`)
- **Database:** Dedicated staging PostgreSQL instance (`prepford_staging`).
- **Isolation Boundaries:**
  - Distinct `SESSION_SECRET` generated via `openssl rand -hex 32`.
  - Distinct `GATEWAY_SHARED_SECRET` generated via `openssl rand -hex 32`.
  - Staging `WEB_ORIGIN` set to `https://staging.prepford.com`.
  - `ENABLE_MOCK_CHECKOUT=true` to allow end-to-end checkout validation without financial charges.
  - Test candidate accounts use synthetic email patterns (`*@staging.prepford.test`).

### 3.4 Production Environment
- **Frontend Target:** `https://prepford.com`
- **Backend Target:** Private cluster service mesh (`http://prepford-api-prod:4000`) behind ingress TLS termination (`https://api.prepford.com`).
- **Database:** Production PostgreSQL cluster with automated WAL archiving and multi-AZ failover.
- **Strict Controls:**
  - `ENABLE_MOCK_CHECKOUT` strictly unset or `false`.
  - `SESSION_SECRET` and `GATEWAY_SHARED_SECRET` populated from production secrets vault.
  - `ASPNETCORE_ENVIRONMENT=Production` and `NODE_ENV=production`.
  - Live merchant keys provisioned prior to enabling payment checkout.

---

## 4. Verification Checklists & Sign-Off

- [x] All environment variables cataloged and typed.
- [x] No credentials or secrets committed to repository.
- [x] `NEXT_PUBLIC_*` namespace verified to contain zero server secrets.
- [x] Production fail-closed guards verified in code for session and gateway secrets.
- [x] Connection string parsing verified for both URI and ADO.NET syntax.
- [x] Staging isolation model verified to prevent cross-environment contamination.
