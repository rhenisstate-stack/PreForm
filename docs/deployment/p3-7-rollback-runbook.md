# PREPFORD — P3.7 ROLLBACK & REVERSION RUNBOOK

**Phase:** P3.7 — Deployment Readiness & Controlled Release Validation  
**Workstream:** P3.7.6 — Rollback Strategy and Rehearsal  
**Execution Date:** November 4, 2026  
**Auditor Roles:** Senior Release Engineer, Incident Response Lead  

---

## 1. Rollback Architecture & Taxonomy

When a release anomaly, operational regression, or unhandled defect emerges post-deployment, rollback must occur with speed, precision, and zero data corruption. PrepFord categorizes rollbacks into distinct operational tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        INCIDENT DETECTION                              │
│         (Health Check / Alerting / Error Spike / Smoke Failure)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
[ 1. TRAFFIC ROLLBACK ]    [ 2. APP CODE ROLLBACK ]   [ 3. CONFIG ROLLBACK ]
  (Edge DNS / Ingress)       (Frontend / Backend)       (Env / Secrets)
                                    │
                                    ▼
                         [ 4. DATABASE RECOVERY ]
                           (Non-destructive /
                            Point-In-Time PITR)
```

1. **Traffic Rollback:** Shift 100% of ingress traffic back to the previous stable deployment container/slot via load balancer or CDN routing.
2. **Application Code Rollback:** Revert frontend (`apps/web`) to previous deployment artifact and backend (`apps/api`) to previous release binary.
3. **Configuration Rollback:** Revert incorrect environment variables or rotate misconfigured signing keys.
4. **Database Rollback:** Restore from pre-deployment snapshot only in the catastrophic event of unrecoverable data corruption. *Crucially, because all 9 PrepFord migrations are additive and backward-compatible (workstream P3.7.4), application rollbacks do NOT require database schema rollbacks.*

---

## 2. Rollback Triggers & Decision Matrix

| # | Anomaly Scenario | Immediate Trigger Threshold | Decision Authority | Primary Rollback Action | Expected Data-Loss Risk |
|:---:|---|---|:---:|---|:---:|
| **1** | Frontend Deployment Failure | Build failure, asset 404s, client runtime crashes | Release Lead | Traffic / Frontend Rollback | **Zero** |
| **2** | Backend Deployment Failure | Kestrel crash loop, unhandled boot exceptions | Release Lead | Traffic / Backend Rollback | **Zero** |
| **3** | Database Migration Failure | SQL error or timeout during `database update` | DBRE / Tech Lead | Abort migration; preserve current DB | **Zero** |
| **4** | Health-Check Failure | `/api/v1/health/ready` returns 503 for >60s | Incident Commander | Traffic Rollback to prior slot | **Zero** |
| **5** | Authentication Failure | Gateway HMAC mismatch (401s), session decryption errors | Security Lead | Config Rollback (`GATEWAY_SHARED_SECRET`) | **Zero** |
| **6** | Exam Authoring Failure | Draft saving blocked, 409 concurrency loops | Tech Lead | Application Rollback | **Zero** |
| **7** | Exam Discovery Failure | Library query timeout, candidate filter bypass | Tech Lead | Application Rollback | **Zero** |
| **8** | Candidate Attempt Failure | StartAttempt 500s, question grading exceptions | Product Owner | Application Rollback | **Zero** |
| **9** | Unexpected Error Rate Spike | HTTP 5xx rate exceeds 1.0% over 5-minute window | SRE Lead | Traffic Rollback | **Zero** |
| **10** | Latency / Performance Dip | p95 response time exceeds 2000ms for >3 minutes | SRE Lead | Traffic Rollback | **Zero** |
| **11** | Configuration Error | Misconfigured `WEB_ORIGIN` (CORS rejection) | Release Lead | Hot-reload configuration | **Zero** |
| **12** | Partial Deployment | Frontend updated but backend deployment timed out | Release Lead | Revert frontend to match active backend | **Zero** |

---

## 3. Step-by-Step Rollback Procedures

### 3.1 Scenario A: Frontend Application Rollback
**Trigger:** Next.js runtime error, client script failure, or UI asset corruption.
1. **Decision:** Release Lead authorizes frontend rollback.
2. **Action:**
   - On Vercel / Cloudflare: Instantly promote the previous deployment via CLI or dashboard (`vercel rollback`).
   - On Container / Kubernetes: Update container image tag to previous build SHA:
     ```bash
     kubectl set image deployment/prepford-web prepford-web=prepford-web:previous-sha
     ```
3. **Validation:**
   - Execute HTTP probe: `curl -i https://staging.prepford.com/` (Verify 200 OK).
   - Verify client hydration in browser without console exceptions.
4. **Completion:** Mark frontend rollback complete; log in incident tracker.

### 3.2 Scenario B: Backend API Rollback
**Trigger:** `/api/v1/health/ready` failing, 500 error spike, or inter-service gateway failure.
1. **Decision:** Release Lead or Incident Commander authorizes backend rollback.
2. **Action:**
   - Revert backend container image or systemd binary to previous release:
     ```bash
     kubectl set image deployment/prepford-api prepford-api=prepford-api:previous-sha
     # Or for systemd:
     systemctl stop prepford-api
     cp /opt/prepford/releases/previous/Preform.Api.dll /opt/prepford/current/
     systemctl start prepford-api
     ```
3. **Database Compatibility Check:** Because migrations are non-destructive and backward-compatible, the previous backend version can safely query the existing PostgreSQL schema.
4. **Validation:**
   - Probe liveness: `curl -i https://api-staging.prepford.com/api/v1/health/live` (200 OK).
   - Probe readiness: `curl -i https://api-staging.prepford.com/api/v1/health/ready` (200 OK).
5. **Completion:** Confirm inter-service communication restored; notify Product Owner.

### 3.3 Scenario C: Database Migration Failure & Recovery
**Trigger:** EF Core migration throws unhandled DDL exception midway.
1. **Decision:** DBRE declares migration abort.
2. **Action:**
   - EF Core migrations wrap DDL in PostgreSQL transactions by default. If a migration fails, PostgreSQL automatically rolls back the transaction.
   - Verify migration status in `__EFMigrationsHistory`:
     ```sql
     SELECT * FROM public."__EFMigrationsHistory" ORDER BY 1 DESC LIMIT 3;
     ```
   - If schema state was partially modified outside a transaction, restore the pre-migration snapshot:
     ```powershell
     pg_restore -h <db-host> -U <db-user> -d prepford --clean staging_pre_migration_backup.dump
     ```
3. **Validation:** Run automated unit and integration tests against restored database to verify table and sequence integrity.
4. **Completion:** Document failure cause and reschedule release after migration patch.

---

## 4. Staging Rollback Rehearsal Evidence

### Rehearsal Protocol
1. **Initial State:** Target running candidate release `5cbed6d` against `prepford_gateb_verification`.
2. **Simulated Trigger:** Injected invalid configuration parameter into gateway client (`GATEWAY_SHARED_SECRET_INVALID`), causing downstream HMAC verification rejection (HTTP 401).
3. **Execution of Rollback:**
   - Identified configuration mismatch in `api-client.ts`.
   - Reverted configuration to valid symmetric secret.
   - Refreshed application session and verified HMAC handshake.
4. **Verification:**
   - Subsequent API requests succeeded with HTTP 200 OK.
   - All examination data, question associations, and candidate records remained completely intact.
   - Zero data corruption or attempt invalidation occurred.
