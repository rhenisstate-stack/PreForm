# PrepFord NCLEX — Phase 7.9 Post-Deployment Observation & Monitoring Protocol

**Document:** `PHASE_7_9_POST_DEPLOYMENT_OBSERVATION.md`  
**Execution Milestone:** Phase 7.9 — Controlled Production Deployment & Operational Acceptance  
**Target Release:** `v0.7.0`  
**Observation Window:** T+0 to T+60 minutes (Immediate Release), T+0 to T+24 hours (Cohort Stabilization)  
**Date:** November 5, 2026  
**Operations Lead:** Site Reliability & Monitoring Authority  

---

## 1. Executive Summary

This protocol defines the telemetry metrics, Service Level Indicators (SLIs), Service Level Objectives (SLOs), automated alerting thresholds, and incident escalation procedures governing the post-deployment observation period for PrepFord Release `v0.7.0`.

---

## 2. Service Level Objectives & Telemetry Thresholds

| Service Layer / Metric | Indicator (SLI) | Pilot SLO Target | Warning Threshold | Critical Incident / Rollback |
| :--- | :--- | :--- | :--- | :--- |
| **API Availability** | Successful HTTP 2xx/3xx/4xx vs total | \(\ge 99.9\%\) | \(< 99.5\%\) | \(< 99.0\%\) over 5 min |
| **Server Error Rate** | HTTP 5xx responses / total requests | \(\le 0.1\%\) | \(\ge 0.5\%\) | \(\ge 1.0\%\) over 5 min |
| **CAT Question Latency**| p95 latency for `POST .../next-question` | \(\le 75\text{ms}\) | \(> 150\text{ms}\) | \(> 500\text{ms}\) |
| **Web Page Load Time** | First Contentful Paint (FCP) | \(\le 1.2\text{s}\) | \(> 2.0\text{s}\) | \(> 3.5\text{s}\) |
| **Database Connections**| Active pool connections / max pool | \(\le 40\%\) | \(> 70\%\) | \(> 85\%\) |
| **Reauth Collisions** | Session concurrency reauth events | \(\le 2\%\) attempts | \(> 5\%\) | \(> 15\%\) |
| **Live Stripe Activity**| Any invocation of live credit card API | **0 events** | \(\ge 1\) attempt | \(\ge 1\) attempt (Immediate Halt) |

---

## 3. Observation Windows & Cadence

### 3.1 Initial Intensive Window (T+0 to T+60 minutes)
- Continuous monitoring of Kestrel and Next.js stdout/stderr streams.
- Real-time error tailing for unhandled exceptions or 500 Internal Server Errors.
- Standby Blue deployment maintained live with instant rollback capability.
- Active verification of first cohort logins and test attempt initializations.

### 3.2 Pilot Stabilization Window (T+1 hour to T+24 hours)
- Hourly automated health snapshots and database connection pool audits.
- Review of `AuditLogs` for all administrative `pilot_grant` actions.
- Review of `SuspiciousActivities` for fraudulent login patterns or credential sharing.
- Daily aggregation of candidate examination metrics (mean item duration, completion rates).

---

## 4. Candidate Experience & Operational Health Telemetry

1. **Mid-Exam Dropouts:**
   - Monitored via `ExamAttempts` status transitions (`InProgress` \(\to\) `Abandoned`).
   - If dropout rate exceeds \(5.0\%\), engineering will review client network logs for WebSocket / HTTP timeout disconnects.
2. **Scoring Latency:**
   - Grading pipeline must compute and persist candidate CAT results within 500ms of final item submission.
3. **Session Expiry Smoothing:**
   - JWT tokens automatically refresh in the background via Next.js BFF cookies to prevent candidate disruptions during multi-hour mock examinations.

---

## 5. Incident Escalation Protocol

```
[ Anomaly Detected by Telemetry Probe ]
                    |
                    v
    +-------------------------------+
    | Is Alert Critical / Rollback? |
    +---------------+---------------+
                    |
           +--------+--------+
      YES  |                 | NO
           v                 v
[ Immediate Action ]   [ Triage Investigation ]
1. Trigger Blue Rollback1. Identify root cause component
2. Freeze Pilot Ingress 2. Deploy hotfix if non-breaking
3. Notify Product Owner 3. Re-evaluate within 30 minutes
4. Capture heap / logs
```

---

## 6. Go / No-Go Decision Gate for Ongoing Pilot

At the conclusion of the initial 24-hour observation window, a formal decision will be made to either:
1. **CONTINUE PILOT EXPANSION:** System meets all SLOs; proceed with onboarding remaining invited nursing colleges.
2. **PAUSE / PATCH:** System operational with non-critical defects; withhold new cohort invites until patched.
3. **ROLLBACK & ABORT:** Critical system failures or data corruption; return to development cycle.
