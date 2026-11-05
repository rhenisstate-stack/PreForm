# PrepFord NCLEX — Phase 7.9 Release Manifest (v0.7.0)

**Document:** `PHASE_7_9_RELEASE_MANIFEST.md`  
**Release Identifier:** `v0.7.0`  
**Git Branch:** `feature/dotnet-backend-migration`  
**Release Commit SHA:** `3bcb90c8a52e008101a1829e1db7f7b3b3a726ea`  
**Release Target:** Controlled Production Pilot Release  
**Commercial Gate:** Authorized `pilot_grant` entitlement (Live Stripe disabled)  
**Date:** November 5, 2026  
**Release Manager:** PrepFord Operations & Engineering Release Authority  

---

## 1. Release Identification & Build Digests

| Component | Source Path | Artifact Output | Build Digest / Version | Verification Tool |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Web** | `apps/web/` | `.next/standalone` | Next.js 16.4.3 (Turbopack) | `npm run build:web` |
| **Backend API** | `apps/api/` | `bin/Release/net8.0/publish/` | ASP.NET Core 8.0.10 | `dotnet publish -c Release` |
| **Database Migrations**| `apps/api/Migrations/` | 13 EF Core SQL scripts | Migration 0001–0013 | `dotnet ef database update` |
| **Docker Compose** | `compose.yaml` | Multi-container stack | `prepford-stack-v0.7.0` | `docker compose config` |

---

## 2. Environment Variables & Secret Configuration

The target environment requires the following environment variables:

```ini
# Core Runtime Environment
ASPNETCORE_ENVIRONMENT=Production
NODE_ENV=production
APP_ENV=production

# Database Authority
ConnectionStrings__DefaultConnection=Host=postgres;Port=5432;Database=prepford;Username=prepford_app;Password=${DB_PASSWORD};SSL Mode=Prefer;Trust Server Certificate=true;

# Cryptographic Keys & Tokens
JwtSettings__SecretKey=${JWT_SECRET_KEY_MIN_32_BYTES}
JwtSettings__Issuer=prepford.com
JwtSettings__Audience=prepford.com
JwtSettings__ExpiryMinutes=120
GatewaySecurity__InternalKey=${GATEWAY_INTERNAL_HMAC_KEY}

# Commercial Pilot Controls
Stripe__SecretKey=
Stripe__PublishableKey=
Stripe__WebhookSecret=
COMMERCIAL_MODE=pilot_grant
ALLOW_LIVE_STRIPE=false

# CORS & Host Boundaries
Cors__AllowedOrigins=https://pilot.prepford.com,https://prepford.com
```

---

## 3. Database Migration Sequence

Database migrations must be applied sequentially prior to routing traffic:
1. `20261028_0001_InitialIdentity`
2. `20261029_0002_SubscriptionsAndOrders`
3. `20261030_0003_LearningStructureAndQuestions`
4. `20261031_0004_StudyMaterialsAndTestimonials`
5. `20261102_0005_QuestionTypesCatalogue`
6. `20261103_0006_ExaminationAuthoring`
7. `20261103_0007_ExaminationLifecycle`
8. `20261103_0008_GradingAndSnapshots`
9. `20261104_0009_ExaminationDiscovery`
10. `20261104_0010_SuspiciousClientDetection`
11. `20261104_0011_SessionSecurityEngine`
12. `20261105_0012_ReauthRateLimiter`
13. `20261105_0013_AnalyticsAndReporting`

*Status in authoritative database:* **All 13 migrations currently applied and active.**

---

## 4. Deployment Procedure (Blue/Green Controlled Switch)

```
[ Step 1: Pre-Flight ]
  - Verify clean working tree and tests passing (458 backend, 513 frontend).
  - Take pre-deployment full database snapshot:
    `./scripts/backup-db.sh prepford production`

[ Step 2: Green Environment Boot ]
  - Deploy new containers to Green pool (Port 3001 for Web, Port 5001 for API).
  - Inject production environment configuration.
  - Verify database connectivity and schema migrations:
    `curl http://localhost:5001/api/v1/health/ready`

[ Step 3: Green Smoke Testing ]
  - Execute automated smoke test suite against Green port 5001:
    - Candidate authentication.
    - Entitlement resolution (`GET /api/v1/checkout/entitlements`).
    - Question delivery (`GET /api/v1/questions?page=1&pageSize=10`).
    - Security lockout checks.

[ Step 4: Traffic Cutover ]
  - Reconfigure Edge Reverse Proxy upstream from Blue (3000/5000) to Green (3001/5001).
  - Reload Nginx / Traefik configuration without dropping active connections.

[ Step 5: Post-Cutover Verification ]
  - Query production health endpoint: `https://prepford.com/api/v1/health/live`.
  - Confirm 0 unexpected error spikes in structured logs.
  - Retain Blue pool on standby for 60 minutes.
```

---

## 5. Rollback Runbook & Triggers

### 5.1 Automated Rollback Triggers
A rollback to Blue pool (`v0.6.0`) will be triggered immediately if any of the following occur within the 60-minute observation window:
1. API HTTP 5xx error rate exceeds \(1.0\%\) over a rolling 5-minute window.
2. Health check `/api/v1/health/ready` fails for two consecutive 30-second probes.
3. CAT item delivery p95 latency exceeds \(500\text{ms}\).
4. Unhandled database exceptions or connection exhaustion occurs.
5. Inadvertent activation of live payment flows or payment crashes.

### 5.2 Rollback Execution Steps
1. Revert Edge Reverse Proxy upstream immediately back to Blue pool.
2. Invalidate corrupted session tokens if any security anomaly was detected:
   `UPDATE "UserSessions" SET "IsRevoked" = true WHERE "CreatedAt" >= NOW() - INTERVAL '1 hour';`
3. If database schema was corrupted (non-backward compatible), restore from pre-deployment snapshot:
   `./scripts/restore-db.sh prepford_backup_pre_deploy.dump prepford staging`
4. Notify Product Owner and incident response channel.
