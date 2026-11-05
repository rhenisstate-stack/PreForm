# PrepFord NCLEX — Phase 7 Launch Gap Analysis

**Document File:** `docs/architecture/PHASE_7_LAUNCH_GAP_ANALYSIS.md`  
**Phase:** Phase 7 — Controlled Production Launch  
**Repository Branch:** `feature/dotnet-backend-migration`  
**Date:** November 5, 2026  
**Auditor Roles:** Lead Systems Architect, Product Manager, Security Lead  

---

## 1. Executive Gap Matrix

Following the completion of Phase 6 and the successful execution of the mandatory staging restore drill, this gap analysis establishes the delta between the verified staging baseline and full unrestricted public launch:

```
[ Verified Phase 6 Baseline (01f784c) ]
                  │
                  ▼
[ Staging Restore Drill (PASSED: RPO=51s, RTO=4m11s) ]
                  │
                  ▼
[ Phase 7 Launch Gap Resolution ] ──► [ Controlled Pilot (25-50 Learners) ] ──► [ Public Production Launch ]
```

---

## 2. Itemized Launch Gap Catalog

### GAP-P7-01: Live Payment Gateway Onboarding & Merchant Verification
- **Category:** Commercial / Billing Integrity
- **Current State:**  
  The backend implements `CheckoutService.cs` and `PaymentWebhookController.cs` with server-authoritative entitlements, timing-safe HMAC signature verification (`FixedTimeEquals`), and idempotency tracking in `PaymentTransactions`. However, `ENABLE_MOCK_CHECKOUT=true` is only valid in non-production environments; when `APP_ENV=production`, checkout strictly fails closed (`Live payment gateway configuration is pending`).
- **Gap:**  
  PrepFord cannot accept real credit cards or process live monetary transactions until a production Stripe account is connected and production API keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) are provisioned.
- **Resolution Plan:**  
  1. Product Owner to provide approved merchant account credentials for Stripe.
  2. Configure live API keys in secure secrets manager.
  3. Validate end-to-end checkout with a test credit card in Stripe live mode ($1.00 authorization and immediate refund).
  4. Alternatively, execute the Phase 7 Pilot under an approved closed-cohort complimentary grant model (`PILOT_GRANT` entitlement).
- **Blocker Status:** **BLOCKS PUBLIC COMMERCIAL LAUNCH; DOES NOT BLOCK CONTROLLED PILOT.**

---

### GAP-P7-02: Real-World Heterogeneous Browser & Mobile Usability Testing
- **Category:** User Experience & Quality Assurance
- **Current State:**  
  513 automated tests verify React component mounting, user event triggers, and API mocks in JSDOM. In addition, responsive breakpoints (360px, 390px, 768px, 1024px, 1280px, 1440px) were audited via screenshot capture in earlier milestones.
- **Gap:**  
  Automated testing cannot detect subtle touch-target layout shifts, virtual keyboard occlusions during rationale reading, or battery/memory throttling on real mobile devices (iOS Safari and Android Chrome).
- **Resolution Plan:**  
  Execute the structured 10-journey Pilot Test Plan with a controlled cohort of 25–50 real nursing candidates on physical desktop and mobile hardware.
- **Blocker Status:** **MANDATORY PREREQUISITE FOR PUBLIC LAUNCH.**

---

### GAP-P7-03: Edge Reverse Proxy Ingress & Automated TLS Certificate Lifecycle
- **Category:** Infrastructure & Network Security
- **Current State:**  
  Next.js and ASP.NET Core API run natively in containerized environments. Mutual HMAC authentication (`X-Gateway-Signature`) is enforced between BFF and API.
- **Gap:**  
  Production ingress proxy (e.g. Caddy, Cloudflare, or AWS ALB) must be formalized in deployment IaC with automated Let's Encrypt TLS renewal, HTTP-to-HTTPS redirect, and rate limiting at the perimeter.
- **Resolution Plan:**  
  Standardize Docker Compose production override (`compose.prod.yaml`) bundling Caddy reverse proxy with automatic TLS and trusted forwarded headers.
- **Blocker Status:** **RESOLVED IN P7.1 INFRASTRUCTURE READINESS.**

---

### GAP-P7-04: SRE Alerting Notification Channels
- **Category:** Site Reliability Engineering & Observability
- **Current State:**  
  The API provides `/api/v1/health/live` and `/api/v1/health/ready`. SRE runbooks with P1–P4 incident classifications exist in `PHASE_6_OPERATIONAL_RUNBOOK.md`.
- **Gap:**  
  Alert triggers are codified, but outbound webhooks to notification channels (e.g. PagerDuty, Slack SRE webhook, or Opsgenie) require live endpoint routing.
- **Resolution Plan:**  
  Wire health check probe poller to outbound operational notification webhooks in staging and production topologies.
- **Blocker Status:** **OPERATIONAL PREREQUISITE FOR UNATTENDED PRODUCTION RUNS.**

---

### GAP-P7-05: Learner Content Feedback & Clinical Typo Reporting Workflow
- **Category:** Educational Quality & Content Governance
- **Current State:**  
  Administrators can review and edit questions via `QuestionsController.cs`. However, learners taking examinations lacked a direct 1-click in-exam flag button to report potential clinical inaccuracies or typographical errors without leaving the exam screen.
- **Gap:**  
  Need an in-app educational reporting channel so candidate feedback flows directly to clinical content reviewers.
- **Resolution Plan:**  
  Provide an in-app Content Feedback Drawer linked to `AuditLogs` or support ticketing, ensuring clinical questions flagged by learners are queued for review.
- **Blocker Status:** **ENHANCEMENT; PILOT COHORT CAN USE DEDICATED FEEDBACK FORM.**

---

## 3. Summary of Gap Resolution Roadmap

| Gap ID | Description | Severity | Target Resolution Milestone | Status |
| :--- | :--- | :---: | :---: | :---: |
| **GAP-P7-01** | Live Stripe Merchant Gateway Onboarding | High | P7.2 Payment Readiness | Documented / Staging Verified |
| **GAP-P7-02** | Real-World Mobile Pilot Validation | High | P7.3 Learner Pilot | Plan Authored / Cohort Ready |
| **GAP-P7-03** | Production Ingress & TLS Architecture | Medium | P7.1 Infrastructure Readiness | Verified & Codified |
| **GAP-P7-04** | SRE Alerting Webhooks | Medium | P7.4 Observability & Support | Runbook & Triggers Defined |
| **GAP-P7-05** | Educational Typo Reporting Flow | Low | P7.3 Pilot Governance | Feedback Template Codified |
