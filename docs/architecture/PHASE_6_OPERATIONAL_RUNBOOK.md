# PREPFORD NCLEX — PHASE 6 SRE INCIDENT RESPONSE RUNBOOK
## Incident Severity Triage, Correlation ID Tracing, Database Alert Procedures & Operational Playbooks

**Document File:** `docs/architecture/PHASE_6_OPERATIONAL_RUNBOOK.md`  
**Phase:** Phase 6 — Product Readiness & Operational Resilience  
**Repository:** `C:\Users\gitau\Documents\PREform`  
**Baseline Commit:** `f1beb3148828eed5ee08f83f065515cc44d383a9`  
**Date:** November 5, 2026  
**Auditor Roles:** Site Reliability Engineer (SRE Lead), DevOps Commander, Technical Auditor  

---

## 1. Incident Severity Classification & Response Matrix

| Severity Level | Definition & Criteria | Target Response (MTTA) | Target Resolution (MTTR) | Notification & Escalation |
| :---: | :--- | :---: | :---: | :--- |
| **P1 — Critical** | Platform outage, database unavailable, assessment delivery blocked, data loss risk. | $\le$ 5 minutes | $\le$ 1 hour | PagerDuty SRE on-call, Lead Architect, Engineering Director. |
| **P2 — Major** | Core feature degraded (e.g. reporting unavailable, elevated API latency $> 250\text{ ms}$, rate limiter locking valid users). | $\le$ 15 minutes | $\le$ 4 hours | SRE on-call, Backend Lead. |
| **P3 — Moderate** | Non-critical component degraded (e.g. profile picture upload failure, minor analytics delay, UI alignment glitch). | $\le$ 2 hours | $\le$ 24 hours | On-call engineer, QA Lead. |
| **P4 — Low** | Cosmetic issue, minor telemetry delay, documentation typo. | Next business day | Next release cycle | Engineering backlog. |

---

## 2. Correlation ID Diagnostics & Request Tracing

Every request traversing the Next.js BFF and ASP.NET Core API carries a unique correlation identifier:
- Header: `X-Correlation-Id: corr_{timestamp}_{randomHex}`.
- Format: Present in all RFC 7807 problem details error responses and structured backend log entries.

### 2.1 Tracing a Failed Candidate Workflow
When a candidate or educator reports an error:
1. Retrieve the `X-Correlation-Id` or `traceId` from the error modal or candidate ticket.
2. Search structured logs (e.g. Seq, Datadog, CloudWatch, or `journalctl`):
   ```bash
   # Filter logs by correlation identifier
   grep "corr_1730836200_a1b2c3d4" /var/log/prepford/api.log
   ```
3. Inspect the JSON log payload for exception type, caller identity (`ActorId`), HTTP status, and database query timing.

---

## 3. High Database Latency Incident Playbook (`P2 Alert: Latency > 100 ms`)

### Symptoms
- `/admin/monitoring` badge turns Rose (`Critical`) or Amber (`Degraded`).
- Database roundtrip probe exceeds 100 ms.
- Elevated 504 gateway timeouts on assessment submission.

### Diagnostic Steps
1. Open the Operational Monitoring dashboard at `/admin/monitoring` to review current latency and active session concurrency.
2. Query active PostgreSQL connections and running queries:
   ```sql
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
   FROM pg_stat_activity
   WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
     AND state != 'idle';
   ```
3. Identify whether a large unindexed reporting query or long transaction is holding row locks.

### Mitigation Steps
1. If a long-running reporting query is blocking assessment delivery, terminate the specific backend process:
   ```sql
   SELECT pg_cancel_backend(<pid>);
   -- If unresponsive:
   SELECT pg_terminate_backend(<pid>);
   ```
2. Check connection pool utilization in ASP.NET Core (`NpgsqlConnectionPool`). If connections are exhausted, restart the API container to reset connection pools.
3. Verify that rate limiters on `/api/v1/admin/reports/*` are operational to prevent reporting denial-of-service.

---

## 4. Assessment Interruption & Candidate Recovery Playbook

### Scenario: Candidate Session Token Expired During Active Examination
- **Automatic Protection:** The application displays the non-dismissible `InExamReauthModal`.
- **Candidate Action:** Candidate enters password and clicks "Verify & Resume".
- **Backend Validation:** Validates credentials without resetting `StartedAt` or changing question indices.
- **Support Override:** If candidate cannot remember password:
  - Administrator navigates to `/admin/security/sessions`.
  - Admin verifies identity, resets candidate password via `/admin/users/[id]`, or extends session policy temporarily.

### Scenario: Browser Crashed / Power Outage During Test
- **Recovery Action:** Candidate logs back in and visits `/dashboard`.
- **System State:** The dashboard detects the active `InProgress` attempt.
- **Resumption:** Candidate clicks "Resume Assessment", fetching `/api/attempts/{id}/questions`. All prior responses and remaining time are preserved.

---

## 5. Deployment Rollback Playbook (`P1/P2 Trigger`)

If a newly deployed release causes startup crash loops, database timeouts, or security regressions:

### Step 1: Immediate Ingress Traffic Rollback
```bash
# Shift traffic back to previous stable container image
kubectl rollout undo deployment/prepford-api
kubectl rollout undo deployment/prepford-web
```

### Step 2: Verify Health Status
```bash
# Verify backend readiness probe
curl -I http://localhost:4000/api/v1/health/ready
# Expected: HTTP/1.1 200 OK {"status":"ready"}

# Verify frontend response
curl -I http://localhost:3000/
# Expected: HTTP/1.1 200 OK
```

### Step 3: Schema Verification
Because all 12 PrepFord migrations follow strict additive non-destructive patterns, rolling back code containers requires zero database schema modifications.

---

## 6. SRE On-Call Escalation Directory

- **Primary SRE On-Call:** `sre-oncall@prepford.internal` / PagerDuty Team PrepFord-Core
- **Database Administrator (DBRE):** `dbre@prepford.internal`
- **Application Security Architect:** `security@prepford.internal`
- **Incident Commander:** `incident-commander@prepford.internal`
