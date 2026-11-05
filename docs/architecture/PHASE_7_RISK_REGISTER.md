# PrepFord NCLEX — Phase 7 Launch Risk Register

**Document File:** `docs/architecture/PHASE_7_RISK_REGISTER.md`  
**Phase:** Phase 7 — Controlled Production Launch, Real-World Validation & Growth Readiness  
**Repository Branch:** `feature/dotnet-backend-migration`  
**Date:** November 5, 2026  
**Auditor Roles:** SRE Lead, DBRE Lead, Security Lead, Product Owner  

---

## 1. Risk Evaluation Framework

Risks are assessed using a standard $5 \times 5$ risk scoring matrix:
- **Severity / Impact:** 1 (Insignificant) to 5 (Catastrophic)
- **Likelihood:** 1 (Rare) to 5 (Almost Certain)
- **Risk Score:** $\text{Severity} \times \text{Likelihood}$ (1–6: Low, 8–12: Medium, 15–25: High)

---

## 2. Launch Risk Inventory

| Risk ID | Risk Category | Description & Potential Impact | Sev | Lik | Score | Mitigation Strategy & Safeguards | Risk Owner | Launch Blocker? |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: |
| **RSK-P7-01** | **Commercial** | Production checkout fails closed due to unconfigured live Stripe credentials; real learners cannot purchase subscriptions. | 4 | 3 | **12 (Med)** | Strict fail-closed error prevents fraudulent access. Product Owner must onboard live Stripe keys before public launch. Controlled pilot operates under approved trial/grant model. | Commercial Lead | **Yes (for Public Launch)** |
| **RSK-P7-02** | **Disaster Recovery** | Database snapshot restoration exceeds 15-minute RTO during high-concurrency production failure. | 5 | 1 | **5 (Low)** | Validated staging restore drill achieved RTO of 4m 11s. Automated script `scripts/restore-db.sh` uses parallel `pg_restore`. Daily snapshot policy codified. | DBRE Lead | **No (Mitigated)** |
| **RSK-P7-03** | **Security / Auth** | Clock drift between BFF container and API container causes false HMAC signature rejection (`401 Unauthorized`). | 3 | 2 | **6 (Low)** | NTP daemon active on container hosts; signature verification includes $\pm 5$-second timestamp leeway in `PrepfordAuthHandler`. | Security Lead | **No (Mitigated)** |
| **RSK-P7-04** | **Data Integrity** | Mid-exam learner disconnects during sudden network outage, leading to lost question responses. | 3 | 2 | **6 (Low)** | Client BFF caches responses in local storage and uses `POST /api/v1/attempts/sync` with server-authoritative timestamps to re-sync upon reconnection. | Frontend Lead | **No (Mitigated)** |
| **RSK-P7-05** | **Scalability** | Sudden traffic spike during scheduled cohort test causes PostgreSQL connection pool exhaustion. | 4 | 2 | **8 (Med)** | Connection pool configured with `MaxPoolSize=100`, query timeouts enforced (30s), rate limiting throttles abusive clients via `IpFilteringMiddleware`. | Backend Lead | **No (Mitigated)** |
| **RSK-P7-06** | **Educational** | Clinical question rationale contains typo or ambiguous phrasing, confusing nursing candidate. | 2 | 3 | **6 (Low)** | Provided in-app question report mechanism and structured pilot feedback template. Content reviews required before publishing new revisions. | Clinical Editor | **No (Manageable)** |
| **RSK-P7-07** | **Rollback Risk** | Forward-fix required after an irreversible EF Core migration is applied to production. | 4 | 2 | **8 (Med)** | Mandatory pre-migration `pg_dump` snapshot enforced in release runbook. Non-destructive migration design rule enforced across all 13 migrations. | Lead Architect | **No (Mitigated)** |
| **RSK-P7-08** | **Session Hijacking** | Concurrent credential sharing among learners attempting to share a single paid account. | 3 | 2 | **6 (Low)** | Session security engine strictly limits concurrent active sessions per user account; remote session revocation terminates unauthorized devices. | Security Lead | **No (Mitigated)** |

---

## 3. Risk Acceptance & Governance

1. All High-severity technical and disaster recovery risks have been mitigated and empirically validated.
2. The remaining commercial launch blocker (RSK-P7-01) is strictly isolated and managed through the gated pilot release strategy.
3. No critical unmitigated data loss or security risks remain.
