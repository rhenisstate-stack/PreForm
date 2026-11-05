# PrepFord NCLEX — Phase 7 Product & Educational Metrics Dictionary

**Document File:** `docs/architecture/PHASE_7_PRODUCT_METRICS_DICTIONARY.md`  
**Phase:** Phase 7 — Controlled Production Launch, Real-World Validation & Growth Readiness  
**Target:** Evidence-Based Growth, Analytics Integrity & Educational Evaluation  
**Date:** November 5, 2026  
**Auditor Roles:** Product Analytics Lead, Psychometrician, Lead Architect  

---

## 1. Overview & Data Authority

PrepFord strictly adheres to an **Evidence-Based Growth Philosophy**. Vanity metrics (such as page views or unverified registrations) are deprecated in favor of verified learner behaviors, pedagogical progression, and reliable commercial unit economics.

PostgreSQL 16+ is the sole authoritative source of truth for all computed metrics.

---

## 2. Product Engagement Metrics

### 2.1 Active Learner (AL)
- **Definition:** A registered user who has authenticated and performed at least one qualifying educational activity (answered a practice question, reviewed a study guide note, drilled a flashcard deck, or launched an exam) within the measurement window.
- **Data Source:** `AuditLogs` where `Action IN ('QuestionAnswered', 'StudyGuideRead', 'FlashcardReviewed', 'AttemptStarted')`.
- **Measurement Windows:** Daily Active Learners (DAL), Weekly Active Learners (WAL), Monthly Active Learners (MAL).
- **Exclusions:** Administrative logins (`role IN ('superadmin', 'admin', 'content_manager')`), background sync calls, or unauthenticated bounce traffic.

### 2.2 Study Session Completion Rate (SSCR)
- **Definition:** Percentage of initiated practice quiz or study studio sessions that are carried through to conclusion (all questions answered or all deck cards reviewed).
- **Calculation:** $\text{SSCR} = \frac{\text{Completed Study Sessions}}{\text{Initiated Study Sessions}} \times 100\%$
- **Benchmark Target:** $\ge 80\%$.

### 2.3 Assessment Completion Rate (ACR)
- **Definition:** Percentage of initiated timed mock examinations that reach formal finalization and scoring.
- **Calculation:** $\text{ACR} = \frac{\text{Count of Completed ExamAttempts}}{\text{Total ExamAttempts Initiated}} \times 100\%$
- **Target Threshold:** $\ge 90\%$.
- **Interpretation:** Drop-offs below 85% indicate cognitive fatigue, excessive exam length, or interface friction.

---

## 3. Educational & Psychometric Metrics

### 3.1 Item Difficulty Index ($P$)
- **Definition:** The proportion of test-takers who answer a specific question correctly.
- **Formula:** $P = \frac{N_{\text{correct}}}{N_{\text{total}}}$
- **Interpretation:**
  - $P > 0.85$: Very easy question (suitable for foundational confidence-building).
  - $0.40 \le P \le 0.85$: Ideal psychometric difficulty for NCLEX CAT adaptive routing.
  - $P < 0.40$: Difficult question (targeted for high-performing candidates).

### 3.2 Point-Biserial Discrimination Index ($r_{\text{pbis}}$)
- **Definition:** Correlation between performance on a specific question and the candidate's total exam score.
- **Formula:** $r_{\text{pbis}} = \frac{\bar{X}_1 - \bar{X}_0}{S_X} \sqrt{p(1-p)}$
- **Interpretation:**
  - $r_{\text{pbis}} \ge 0.30$: Excellent discrimination (strong students answer correctly; weak students miss).
  - $0.20 \le r_{\text{pbis}} < 0.30$: Acceptable discrimination.
  - $r_{\text{pbis}} < 0.15$: Question flagged for clinical review (may contain ambiguous wording or misleading distractors).

### 3.3 Client Needs Domain Mastery Score
- **Definition:** Candidate's percentage proficiency calculated individually across the 8 NCLEX Client Needs categories:
  1. `MOC`: Management of Care
  2. `SIC`: Safety and Infection Control
  3. `HPM`: Health Promotion and Maintenance
  4. `PSI`: Psychosocial Integrity
  5. `BCC`: Basic Care and Comfort
  6. `PPT`: Pharmacological and Parenteral Therapies
  7. `RRP`: Reduction of Risk Potential
  8. `PHA`: Physiological Adaptation
- **Data Source:** `AttemptResponses` joined with `Questions` and `ClientNeeds`.

### 3.4 PrepFord Readiness Score Index (RSI)
- **Definition:** Proprietary diagnostic projection calculating the candidate's estimated passing probability on the NCLEX examination, weighted by question difficulty ($P$) and longitudinal consistency over the preceding 60 days.
- **Educational Safeguard:** Displayed strictly with the disclaimer: *"Diagnostic estimate based on empirical study progression. Not an official NCLEX pass guarantee."*

---

## 4. Commercial & Business Metrics

### 4.1 Plan Conversion Rate (PCR)
- **Definition:** Percentage of registered candidates who upgrade to an active paid subscription tier (`rn-monthly`, `rn-quarterly`, `rn-annual`, `pn-monthly`, etc.).
- **Data Source:** `UserSubscriptions` joined with `Orders` where `Status = 'Completed'`.

### 4.2 Webhook Processing Latency (WPL)
- **Definition:** Elapsed time from Stripe webhook ingress at `/api/v1/payments/webhook` to successful `UserSubscription` activation in PostgreSQL.
- **Target SLA:** $< 500\text{ ms}$.

### 4.3 Subscription Retention & Churn Rate
- **Definition:** Percentage of recurring subscribers who cancel their renewal prior to their next billing interval.
- **Calculation:** $\text{Churn} = \frac{\text{Cancellations in Period}}{\text{Active Subscribers at Start of Period}} \times 100\%$
- **Target:** $< 5\%$ monthly churn.
