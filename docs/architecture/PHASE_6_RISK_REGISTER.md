# PREPFORD NCLEX — PHASE 6 RISK REGISTER
## Production Risk Identification, Impact Assessment & Mitigation Strategies

**Document File:** `docs/architecture/PHASE_6_RISK_REGISTER.md`  
**Phase:** Phase 6 — Product Readiness & Operational Resilience  
**Repository:** `C:\Users\gitau\Documents\PREform`  
**Baseline Commit:** `f1beb3148828eed5ee08f83f065515cc44d383a9`  
**Date:** November 5, 2026  
**Auditor Roles:** Application Security Engineer, Reliability Architect, Product Owner  

---

## 1. Risk Evaluation Matrix

Risks are categorized across standard impact and likelihood levels:
- **Severity Tiers:** `Critical`, `High`, `Medium`, `Low`.
- **Likelihood:** `High` (> 50%), `Medium` (10–50%), `Low` (< 10%).
- **Acceptance Impact:** `Blocking` (must be resolved before production release) or `Non-Blocking / Monitored` (acceptable with controls in place).

---

## 2. Identified Production & Operational Risks

| Risk ID | Severity | Category | Risk Description | Impact | Likelihood | Mitigation Strategy | Owner | Blocking? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-P6-01** | **Low** | Test Harness | Obsolete navigation assertion in `admin-shell.test.tsx` rejects valid `/admin/questions` route | False-positive CI failure | **High** | Update test assertion in WP-6.1 to reflect actual implemented routes. | QA Lead | **Resolved in WP-6.1** |
| **RSK-P6-02** | **Medium** | Security / Billing | Deployment to production without live payment gateway keys could permit simulated checkout | Financial loss / improper access | **Low** | Fail-closed gate in `ICheckoutService.cs` strictly forbids mock checkouts when `APP_ENV=production`. | SecOps / DevOps | **No (Mitigated)** |
| **RSK-P6-03** | **Medium** | Infrastructure | Missing or default `GATEWAY_SHARED_SECRET` in production could expose internal backend APIs | Unauthorized API invocation | **Low** | Fail-closed startup check in Next.js BFF refuses to boot if secret is missing or default in production. | Security Architect | **No (Mitigated)** |
| **RSK-P6-04** | **Medium** | Operations / DB | Database connection pool exhaustion during concurrent high-volume reporting or CSV exports | High API latency or 503 errors | **Medium** | Bounded pagination (`maxPageSize=100`), streaming CSV memory buffers, and live DB latency health probe. | DBRE / SRE Lead | **No (Mitigated)** |
| **RSK-P6-05** | **Low** | Assessment Delivery | Client and server clock drift during timed assessments | Candidate confusion or premature timeout | **Low** | Server-authoritative timer: server sets `StartedAt` and rejects submissions past deadline. | Backend Lead | **No (Mitigated)** |
| **RSK-P6-06** | **Low** | Data Protection | Potential IDOR parameter tampering in learner performance analytics | Learner privacy violation | **Low** | All learner endpoints extract caller identity strictly from authenticated claims; URL tampering blocked. | Security Architect | **No (Mitigated)** |
| **RSK-P6-07** | **Medium** | Disaster Recovery | Prolonged recovery time during catastrophic PostgreSQL database corruption | Extended platform downtime | **Low** | Automated daily pg_dump + continuous WAL archiving; tested restore runbooks with RPO=1h, RTO=15m. | DBRE Lead | **No (Mitigated)** |
| **RSK-P6-08** | **Low** | Test Harness | Parallel test CPU contention causes transient timeouts in jsdom `waitFor` | Flaky local test runs | **Medium** | Increase timeout thresholds in test helpers and wrap async states in `act()`. | QA Lead | **Resolved in WP-6.1** |

---

## 3. Risk Governance & Sign-Off

All identified risks are either remediated directly in Phase 6 work packages or continuously mitigated by architectural controls established in Phases 1–5. Zero unmitigated Critical or High severity risks remain.
