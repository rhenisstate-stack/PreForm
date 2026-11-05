# PrepFord NCLEX — Phase 7 Release, Canary Validation & Rollback Strategy

**Document File:** `docs/architecture/PHASE_7_RELEASE_AND_ROLLBACK.md`  
**Phase:** Phase 7 — Controlled Production Launch  
**Repository Branch:** `feature/dotnet-backend-migration`  
**Date:** November 5, 2026  
**Auditor Roles:** Release Engineer, Lead SRE, Lead Database Reliability Engineer  

---

## 1. Controlled Release Philosophy

A production release at PrepFord is treated as a reversible operational event, not a point of no return. 

PrepFord enforces a **Phased Traffic Expansion** release strategy:
1. **Pre-Release Verification:** All automated quality gates, staging restore drills, and configuration validations must pass.
2. **Canary / Cohort Rollout:** New release image receives 10% traffic (or closed pilot cohort) for 60 minutes.
3. **Automated Verification Probes:** Critical health, error rates, and assessment telemetry are monitored continuously.
4. **Gradual Expansion:** If error rate remains $< 0.1\%$ and P95 latency is $< 200\text{ms}$, traffic expands to 50%, then 100%.
5. **Immediate Stop Conditions:** Any breach of critical safety conditions triggers an immediate automated rollback.

---

## 2. Release Execution Runbook

### Pre-Flight Checklist:
- [ ] Confirmed approved release commit tag (`v0.7.0-controlled-release`).
- [ ] Working tree clean, zero uncommitted modifications.
- [ ] Mandatory staging restore drill verified (RPO $\le 1$h, RTO $\le 15$m).
- [ ] Pre-deployment database snapshot taken via `scripts/backup-db.sh`.
- [ ] EF Core migration plan audited (non-destructive only; 0 column drops).
- [ ] Environment secrets verified (`JWT_SECRET`, `GATEWAY_SHARED_SECRET`, `DATABASE_URL`).
- [ ] SRE Incident Lead and DBRE Lead on active call.

### Release Steps:
```bash
# Step 1: Pre-Deployment Database Snapshot
./scripts/backup-db.sh

# Step 2: Apply Non-Destructive Database Migrations
cd apps/api && dotnet ef database update --connection "${DATABASE_URL}"

# Step 3: Deploy New Backend API Container (Blue/Green or Rolling)
docker compose -f compose.prod.yaml up -d --no-deps --build api

# Step 4: Validate Backend Readiness
curl -f http://localhost:4000/api/v1/health/ready || exit 1

# Step 5: Deploy Frontend BFF Container
docker compose -f compose.prod.yaml up -d --no-deps --build web

# Step 6: Post-Deployment Smoke Verification (13-Point Check)
./scripts/verify-release-smoke.sh
```

---

## 3. Post-Deployment Verification Matrix (13-Point Check)

1. Edge reverse proxy returns HTTP 200 for public landing page (`/`).
2. SSL/TLS certificate is valid and forces HTTPS redirect.
3. BFF health probe reports healthy.
4. API liveness probe (`/api/v1/health/live`) returns `{"status":"ok"}`.
5. API readiness probe (`/api/v1/health/ready`) returns `{"status":"ready"}`.
6. User authentication succeeds (JWT issued, session stored).
7. Learner dashboard renders welcome metrics and pathway info.
8. Question catalog queries return questions without answer key leakage.
9. Examination families query returns active blueprints.
10. Assessment attempt initializes, generating `AttemptMetadataSnapshot`.
11. Mid-exam state sync (`POST /api/v1/attempts/sync`) succeeds.
12. Examination submission succeeds with psychometric score calculation.
13. SRE Admin monitoring (`/api/v1/admin/monitoring/health`) confirms normal operational gauges.

---

## 4. Release Stop Conditions (Immediate Abort Triggers)

Traffic expansion is halted immediately and rollback is initiated if any of the following occur:
1. **Critical Authentication Failure:** Learners unable to log in or sessions randomly invalidated.
2. **Cross-Tenant Data Exposure:** Candidate sees another candidate's exam response or profile details.
3. **Assessment Data Loss:** `POST /api/v1/attempts/sync` returns HTTP 5xx or database fails to record responses.
4. **Answer Key Leakage:** Uncompleted attempt response payloads expose `CorrectOptionId` or `Rationale`.
5. **Grading Integrity Failure:** Correct answers marked incorrect or psychometric score miscalculated.
6. **Sustained Error Spike:** HTTP 5xx error rate exceeds $1.0\%$ over a 3-minute sliding window.
7. **Database Connection Saturation:** PostgreSQL pool utilization exceeds $85\%$ with growing query wait queue.

---

## 5. Rollback Procedures

### 5.1 Frontend Rollback
```bash
# Instantly repoint ingress proxy to previous immutable frontend image tag
docker compose -f compose.prod.yaml up -d --no-deps web:v0.6.9-previous
```
*Rollback Duration:* $\le 30$ seconds. Zero database impact.

### 5.2 Backend API Rollback
```bash
# Repoint ingress to previous backend API image tag
docker compose -f compose.prod.yaml up -d --no-deps api:v0.6.9-previous
```
*Rollback Duration:* $\le 45$ seconds. Because migrations are strictly backward-compatible, previous backend code functions seamlessly with the current database schema.

### 5.3 Database Disaster Recovery Rollback
In the catastrophic event of unrecoverable database corruption:
```bash
# Restore isolated pre-deployment snapshot using validated script
./scripts/restore-db.sh "backups/postgres/prepford_pre_release_snapshot.dump" "prepford_production"
```
*Measured Restoration Duration:* 2.1 seconds for datastore; 4 minutes 11 seconds for full service resumption.
