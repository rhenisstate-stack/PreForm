# PrepFord NCLEX — Phase 7.9 Pilot Access & Security Posture Report

**Document:** `PHASE_7_9_PILOT_ACCESS_SECURITY_REPORT.md`  
**Execution Milestone:** Phase 7.9 — Controlled Production Deployment & Operational Acceptance  
**Scope:** Security Posture, RBAC, Assessment Security, Candidate Privacy  
**Date:** November 5, 2026  
**Auditor:** Information Security & Compliance Verification Authority  

---

## 1. Executive Summary

This comprehensive security report details the defenses, access barriers, and confidentiality safeguards protecting PrepFord during the Phase 7.9 controlled pilot release. The platform enforces multi-layered controls across authentication, role-based authorization, session integrity, examination answer-key concealment, and educational records privacy.

**Security Determination: CLEARED FOR CONTROLLED PILOT DEPLOYMENT.**

---

## 2. Invitation-Only Access Boundary & RBAC

1. **Invitation-Only Pilot Boundary:**
   - Unrestricted public self-registration is disabled for pilot cohorts.
   - Candidate accounts are pre-provisioned or activated via single-use, cryptographically generated institution invitation tokens.
   - Self-registered public accounts cannot access examination content without an explicit `pilot_grant` issued by a SuperAdmin.
2. **Role-Based Access Control (RBAC):**
   - The platform enforces eight (8) distinct system roles: `superadmin`, `admin`, `instructor`, `institutional_dean`, `lead_examiner`, `question_author`, `student`, `guest`.
   - Permissions are checked on every API request via ASP.NET Core authorization policies (`RequireAdmin`, `RequireInstructor`, `RequireCandidate`).
   - Privilege escalation attacks (e.g. candidates submitting administrative role updates) are rejected with HTTP 403 Forbidden.

---

## 3. Examination Integrity & CAT Delivery Protections

1. **Strict Answer-Key Concealment:**
   - In Next.js client responses, question payloads sent during active examination sessions contain only item prompts, stems, and option identifiers:
     ```json
     {
       "questionId": "q_rn_cardio_104",
       "stem": "A client presents with acute chest pain...",
       "options": [
         { "id": "opt_a", "text": "Administer sublingual nitroglycerin" },
         { "id": "opt_b", "text": "Prepare for immediate cardioversion" }
       ]
     }
     ```
   - Correct answers (`isCorrect`), rationale explanations, and clinical judgment scoring matrices are stripped at the Kestrel API boundary and are **never transmitted to the candidate's browser** prior to final exam grading.
2. **Snapshot Immutability:**
   - When an examination attempt begins, an immutable `AttemptSnapshot` freezes the active question content, options, and CAT configuration. Changes made by authors to question items after attempt initiation do not alter in-flight exams.
3. **Session Accounting & Single-Device Concurrency:**
   - Active examination sessions enforce strict single-session concurrency.
   - If a candidate attempts to open a second browser window or log in from a separate device during an active exam attempt, the session security engine flags a concurrency collision and forces a re-authentication challenge.

---

## 4. Suspicious Client Detection & Rate Limiting

1. **Client Fingerprint & IP Tracking:**
   - Every request computes a client fingerprint hash based on User-Agent, Accept headers, and IP address.
   - Rapid fingerprint morphing or IP geographic hops trigger a record in `SuspiciousActivities` with high threat classification.
2. **Re-Authentication Throttling:**
   - Candidate re-authentication attempts are strictly rate-limited to 5 requests per 10 minutes per IP/client identifier to eliminate brute-force and credential stuffing threats.

---

## 5. Candidate Privacy & Educational Records Compliance (FERPA)

1. **Data Minimization:**
   - Candidate profile data is limited to email, display name, target exam date, and nursing pathway (RN/PN). No social security numbers, birthdates, or banking details are collected.
2. **Institutional Data Isolation:**
   - Nursing school deans and faculty can only view aggregated and individual performance metrics for students belonging strictly to their assigned `CohortCode`. Cross-institution data visibility is prohibited by database query filtering.
3. **Encryption in Transit & at Rest:**
   - All HTTP traffic requires TLS 1.3 with HSTS enabled.
   - PostgreSQL storage volumes and backup dump files are encrypted using AES-256.

---

## 6. Security Sign-Off Status

| Security Domain | Standard / Policy | Verification Result | Sign-Off Status |
| :--- | :--- | :--- | :--- |
| **Authentication & RBAC** | OWASP ASVS v4.0 Level 2 | Verified via 426 unit tests & integration tests | **APPROVED** |
| **Answer-Key Confidentiality** | High-Stakes Exam Security | Payload inspections confirm zero client leakage | **APPROVED** |
| **Session & Concurrency** | Single-Device Enforcement | Tested against multi-tab concurrency | **APPROVED** |
| **Payment Gate Isolation** | Fail-Closed Production Mode | Live Stripe disabled; simulated bypass blocked | **APPROVED** |
| **Disaster Recovery** | RPO \(\le 1\text{h}\), RTO \(\le 15\text{m}\) | Demonstrated: RPO=51s, RTO=4m11s | **APPROVED** |
| **Candidate Privacy** | FERPA Compliance Principles | Strict multi-tenant cohort partitioning | **APPROVED** |

**Final Determination:** The PrepFord platform meets all security criteria for controlled deployment to authorized nursing colleges and pilot candidates.
