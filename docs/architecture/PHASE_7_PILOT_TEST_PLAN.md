# PrepFord NCLEX — Phase 7 Controlled Learner Pilot Testing Plan

**Document File:** `docs/architecture/PHASE_7_PILOT_TEST_PLAN.md`  
**Phase:** Phase 7 — Real-World Validation & Controlled Production Launch  
**Cohort Scope:** 25–50 Vetted Nursing Candidates (RN & PN Pathways)  
**Pilot Window:** 14 Calendar Days  
**Lead Facilitator:** Head of Product & Clinical Operations Lead  
**Date:** November 5, 2026  

---

## 1. Pilot Mission & Objectives

The primary objective of the PrepFord Controlled Pilot is to evaluate real-world usability, educational effectiveness, assessment reliability, and mobile ergonomics with actual nursing candidates before opening public production traffic.

PrepFord recognizes that automated unit and integration tests prove code correctness, but only real learners can validate cognitive clarity, clinical rationale helpfulness, and onboarding friction.

### Pilot Core Questions:
1. Can candidates seamlessly complete registration, email verification, and onboarding without technical assistance?
2. Does the server-authoritative assessment delivery engine function flawlessly across varied home networks and mobile connections?
3. Are the clinical rationales clear, pedagogically sound, and aligned with NCLEX Client Needs categories?
4. Do learners experience session stability when switching between mobile phones, tablets, and desktop laptops?
5. What are the highest-friction user journeys that must be refined before scaling?

---

## 2. Participant Cohort Selection & Governance

### 2.1 Cohort Composition
- **Total Learners:** 30 Candidates
  - 18 NCLEX-RN Candidates (Associate Degree & Baccalaureate nursing seniors).
  - 12 NCLEX-PN Candidates (Practical nursing graduates preparing for licensure).
- **Device Distribution:**
  - 50% Mobile-first learners (iOS Safari & Android Chrome).
  - 30% Laptop/Desktop users (macOS & Windows / Chrome, Edge, Safari).
  - 20% Tablet users (iPadOS Safari).

### 2.2 Privacy & Data Governance
- Candidates agree to a standard Educational Pilot Privacy Agreement.
- No real payment or banking information is collected.
- Accounts are provisioned under the `pilot_grant` commercial entitlement model.
- Candidate feedback is anonymized for public reporting.

---

## 3. End-to-End Learner Journey Checklist

Each pilot participant is guided through 10 structured milestone journeys:

| Journey ID | Title | Key Learner Actions | Validation Criteria |
| :---: | :--- | :--- | :--- |
| **LJ-01** | **Registration & Onboarding** | Create account, set target exam date, select pathway (`RN` or `PN`). | Receives verification email, session established, onboarding walkthrough displays. |
| **LJ-02** | **Session & Device Security** | Sign in on phone and laptop; inspect `/dashboard/settings/security`. | Displays active device models, IP addresses, session count; remote termination works. |
| **LJ-03** | **Study Guide Reading** | Read cardiovascular and pharmacology study notes in `/study-guide`. | Clean typography, mobile readability, responsive clinical tables, zero broken images. |
| **LJ-04** | **Flashcard Spaced Repetition** | Drill SM-2 flashcard decks in `/dashboard/study`. | Flip card, select rating (Again, Hard, Good, Easy), review stats recalculate correctly. |
| **LJ-05** | **Practice Quiz Generation** | Filter 10 questions by Client Needs category (`Management of Care`, `Pharmacological`). | Questions match selected taxonomy; answer selection responsive; rationale displays upon check. |
| **LJ-06** | **Timed Mock Exam Launch** | Start comprehensive 75-question timed mock exam. | Server-authoritative timer countdown begins; questions shuffled; answer keys concealed. |
| **LJ-07** | **Mid-Exam State Sync** | Answer 30 questions, pause or refresh browser window. | State resumes seamlessly via `POST /api/v1/attempts/sync` without lost answers or timer jump. |
| **LJ-08** | **Exam Submission & Scoring** | Submit examination for final grading. | Idempotent scoring completes; psychometric breakdown calculated; full rationales unlocked. |
| **LJ-09** | **Readiness & Domain Mastery** | Review performance radar and passing probability index in `/dashboard/analytics`. | NCLEX passing probability calculated; weak Client Needs categories highlighted. |
| **LJ-10** | **Feedback & Issue Reporting** | Submit feedback survey and report any clinical question ambiguities. | Feedback logged in defect register; educational reviews triggered. |

---

## 4. Structured Learner Feedback Instrument

Participants complete a 5-dimension Likert evaluation (1 = Strongly Disagree, 5 = Strongly Agree):
1. **Onboarding & Usability:** Platform was intuitive and easy to navigate.
2. **Exam Engine Realism:** Timed testing felt true to NCLEX interface expectations.
3. **Clinical Content Quality:** Question scenarios and clinical rationales were insightful and accurate.
4. **Mobile Experience:** Using PrepFord on my smartphone was smooth and readable.
5. **Perceived Value & Confidence:** PrepFord improved my NCLEX readiness confidence.
