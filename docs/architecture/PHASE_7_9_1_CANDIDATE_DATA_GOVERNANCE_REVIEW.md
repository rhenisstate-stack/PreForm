# PrepFord NCLEX — Phase 7.9.1 Candidate Data Governance Review (Work Package F)

**Document:** `PHASE_7_9_1_CANDIDATE_DATA_GOVERNANCE_REVIEW.md`
**Execution Milestone:** Phase 7.9.1 — Candidate Data Governance Review
**Verification Date:** November 6, 2026
**Verification Method:** Read-only source, schema, and documentation inspection. No sensitive data introduced; no privacy determinations made.

---

## 1. Scope Note

This review inspects the platform as **currently implemented** against the *planned* pilot data model described in `PHASE_7_9_PILOT_EVIDENCE_REVIEW.md` ("Real attempt answers, latency per item, CAT theta trajectory, difficulty transitions will be persisted in `AttemptAnswers` and `CandidateAnalytics`"). Several elements of the planned data collection exist only as documentation — a governance finding in itself, since a privacy posture must match what the system actually does.

**This review determines the current state, not legal sufficiency.** Regulatory compliance determinations (GDPR / Kenya DPA 2019 / FERPA-equivalents) are listed in §6 as **external approval items** requiring qualified review. The presence of an educational disclaimer is explicitly **not** treated as evidence of compliance.

---

## 2. What Is Actually Collected Today (verified)

| Planned item (tasking) | Status | Where |
| :--- | :--- | :--- |
| `AttemptAnswers` | **NOT IMPLEMENTED** (table does not exist) — closest existing entity: `AttemptResponse` (`Models/Assessments.cs:281–314`): selected options, server-computed correctness, `TimeSpentSeconds` (item latency), `AnsweredAt`, raw `UserId` linkage | Records raw identifier + per-item timing data |
| `CandidateAnalytics` | **NOT IMPLEMENTED** (no table, no entity) — only documented as future (`PHASE_7_9_PILOT_EVIDENCE_REVIEW.md:62`) | Planned but absent |
| CAT theta trajectory | **NOT IMPLEMENTED** — `PHASE_3_ASSESSMENT_DECISIONS.md:131` documents theta/Rasch deferral to future CAT phases | Planned but absent |
| Item latency | ✅ implemented as `AttemptResponse.TimeSpentSeconds` | Exists now |
| Dropout events | **PARTIAL** — `ExamAttempt.Abandoned` status only (no dedicated event table or timestamps for when abandonment occurred) | Exists as status transition only |
| Post-licensure outcome data | **NOT IMPLEMENTED** — no table/fields; the only "outcome" concept is an admin-verified testimonial flag (`Testimonials.OutcomeVerified`) | Not collected (correct sentinels absent) |

Personal identifiers currently persisted for candidates: `Email`, `PasswordHash`, `DisplayName`, `Pathway`, `TargetExamDate`, notification preferences, `AccountStatus` (`Identity.cs:6–60`); sessions also store `Email`, rotated token **hashes**, `ClientId`, `LastIpAddress` (raw), `UserAgent` (raw), `DeviceLabel`, `FingerprintHash` (hashed), `AuditLog.IpAddress/UserAgent`, and `PasswordResetToken.IpAddress/UserAgent`.

Suspicious-activity signals: `AuditLogs` and `SuspiciousActivities` record client churn events (new-client, UA change, IP change, client-identity change, suspicious context) with per-event severity/outcome and full old/new UA + IP (`SuspiciousClientDetectionTests.cs:66–244`).

---

## 3. Governance Controls Inventory

| Control (required by tasking) | Status | Evidence |
| :--- | :--- | :--- |
| Candidate-facing privacy notice | ✅ PRESENT | `apps/web/src/app/privacy-policy/page.tsx` — 20-section policy; states collection of registration identifiers, device/UA/IP ("truncated or pseudonymized where feasible"), assessment telemetry (items, answers, elapsed times, scores); retention/deletion/anonymization claims; data export/erasure rights; asserts GDPR Art. 6 bases and Kenya DPA 2019 alignment |
| Consent / lawful basis recorded | ⚠️ WEAK | Signup has only a UI checkbox ("agree to Terms… Privacy Policy" — `sign-up/page-client.tsx:430–458` + `validation/auth.ts:127–131`), validated **client-side only**. The API `Register` endpoint (`AuthController.cs:125–199`) records neither consent flag nor terms-acceptance timestamp. No `ConsentGranted` schema field for users. (Only testimonial flow records consent, `Testimonials.cs:39`.) **Lawful basis can therefore not be evidenced per candidate.** |
| Purpose limitation | ⚠️ PARTIAL | Privacy notice states purposes broadly; no technical purpose-limitation (field-level separation between "pilot analytics" vs "service operations") exists. The planned post-exam theta-vs-licensure correlation (`PHASE_7_9_PILOT_EVIDENCE_REVIEW.md:68`) implies a *new* purpose **with no documented restriction** on linking candidate records to later licensure outcomes |
| Data minimization | ⚠️ PARTIAL | IP and User-Agent are stored **in raw form** (`UserSession.LastIpAddress/UserAgent`), even though the privacy notice claims IP truncation/pseudonymization "where feasible" — **the claim is currently untrue in code**. Only tokens and fingerprint are hashed |
| Access restrictions | ✅ mostly | Analytics reads are behind `[Authorize]` + per-user ownership checks (`LearnerAnalyticsController.cs:13–21, 101–106`), non-admin forbidden from other candidates; admin analytics under `RequireAdmin` (`AdminReportsController.cs:10–13`); audit log access admin-only (`AdminAuditLogsController.cs:10`). **No "institution" role exists** for institution-scoped pilots — planned institutional data sharing has no RBAC surface yet |
| Retention & deletion | ❌ ABSENT | No purge/retention jobs (no `IHostedService`/`BackgroundService` sweeps found); **no account deletion endpoint** (only admin `Suspended`/`Deactivated` status, `AdminUsersController.cs:54, 366`); no self-service data-portable export (admin-only CSV aggregates). The privacy notice's "assessment telemetry destroyed or fully anonymized on account closure" has **no implementation** |
| Anonymization / pseudonymization | ⚠️ MINIMAL | Tokens and fingerprint hashed; IP/UA raw; analytics linkage by **raw `UserId`** — full pseudonymized separation is not implemented |
| Export controls | ⚠️ ADMIN-ONLY | Admin CSV exports of aggregate assessment/qm data (`AdminReportsController.cs:58, 128`, permission `audit_logs.export`); no candidate export |
| Auditability of administrative access | ⚠️ WRITES ONLY | `AuditLogs` covers mutations/security events **only**; no audit record on any GET/analytics read, including admin pulls of candidate analytics. `PHASE_4_IMPLEMENTATION_REPORT.md:141` confirms writes-only design |
| Restrictions on post-licensure linkage | ❌ ABSENT | Intent to correlate candidate θ with NCSBN outcomes documented (`PILOT_EVIDENCE_REVIEW.md:68`); **no schema, no policy, no consent flow, no restriction** on that linkage |

---

## 4. Disclaimer Position

Educational disclaimers are present and consistently worded (footer, NCLEX pages, FAQ, contact, testimonial flows) — accuracy of readiness claims is properly bounded. They make **no data governance or regulatory claims** and cannot substitute for compliance. (Tasking requirement honored as a review principle: the disclaimer is not counted as compliance evidence.)

---

## 5. Governance Gaps (ranked)

1. **No server-side consent record.** Signup consent exists only as a client-driven checkbox. No lawful-basis evidence attaches to any candidate record.
2. **No account deletion / erasure / retention pipeline.** The privacy notice's retention & erasure commitments are currently unfulfillable promises.
3. **Raw IP / UA retention while the notice claims truncation/pseudonymization.** Either implement truncation/hashing or correct the notice before pilot.
4. **No read-audit trail** for administrative access to candidate analytics.
5. **Planned post-licensure outcome linkage has no restriction, consent or schema policy.** This is the highest-risk *future* collection (health-adjacent professional status) and must not be enabled until policy + candidate-consent exist.
6. **No institution-scoped RBAC** exists for the institutional pilot model (institutional administrators would need scoped, auditable access).
7. **Planned tables** (`AttemptAnswers`, `CandidateAnalytics`, theta trajectories) don't exist yet — good governance chance to bake in minimization/pseudonymization keys at creation time rather than retrofit.

---

## 6. External Approval Items (not decidable in this audit)

These require qualified legal review and cannot be closed by engineering evidence:

1. Lawful basis selection per data category (contract / legitimate interest / consent) under GDPR; Kenya Data Protection Act 2019 obligations, data-controller registration, and cross-border transfer posture.
2. Whether candidate data constitutes "personal data of persons under 18" in target cohorts, with associated parental-consent or child-data treatment.
3. Educational-record equivalence (e.g., FERPA if institutional custody applies) for institutional pilots.
4. Retention period definitions for assessment telemetry, audit logs, and backup archives (currently "as long as necessary" — insufficiently specific for a notice).
5. The post-licensure correlation program (data-sharing agreement with third parties, consent instrument, de-identification threshold).
6. Privacy-notice sufficiency & language/localization, DSAR/erasure SLA commitments (no implementation, no SLA defined).

---

## 7. Gate Impact

Data governance as evidenced today would place any "candidate data governance" gate at **OPEN/CONDITIONAL**: privacy notice exists and common analytics RBAC is in place, but consent records, deletion/retention implementation, raw IP handling vs notice, and read-audit trails are absent, and the planned post-licensure program is unrestricted. The Phase 7.9 acceptance package contained **no candidate-data-governance gate** (G1–G15) — this audit adds the dimension rather than re-scoring an existing gate (see Gate Matrix §"Data governance — newly surfaced").
