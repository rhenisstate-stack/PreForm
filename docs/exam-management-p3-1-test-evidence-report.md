# PrepFord Examination Management — P3.1 Test Evidence Report

**Phase:** P3.1 — Examination Domain Foundation  
**Stage:** Final Verification & Evidence Audit  
**Date:** 3 November 2026  
**Environment:** Isolated local loopback PostgreSQL 18 (`prepford_gateb_verification`)  
**Status:** ALL TESTS PASSING (100% SUCCESS RATE)

---

## 1. Test Execution Summary

| Test Suite | Target Environment | Total Executions | Passed | Failed | Skipped | Pass Rate |
|---|---|---|---|---|---|---|
| **PostgreSQL Integration Suite** | Local loopback `prepford_gateb_verification` | 18 | 18 | 0 | 0 | **100%** |
| **P3.1 Lifecycle & State Machine Suite** | In-Memory Provider (`ExaminationLifecycleTests`) | 17 | 17 | 0 | 0 | **100%** |
| **P3.1 Code Allocation Suite** | In-Memory Provider (`ExaminationCodeTests`) | 4 | 4 | 0 | 0 | **100%** |
| **P3.1 Attempt Snapshot Contract Suite** | In-Memory Provider (`AttemptSnapshotTests`) | 3 | 3 | 0 | 0 | **100%** |
| **Gate C Security & Protection Suites** | In-Memory Provider (`AttemptMembership`, `Grading`, `CandidateDataContract`) | 48 | 48 | 0 | 0 | **100%** |
| **Full Regression Non-Postgres Suite** | In-Memory Provider (All non-Postgres tests) | 217 | 217 | 0 | 0 | **100%** |
| **Total Across All Verification Gates** | Combined Postgres & In-Memory | **235** | **235** | **0** | **0** | **100%** |

---

## 2. Key Test Verification Details

### 2.1 P3.1 Domain & State Machine Tests (`ExaminationLifecycleTests`)
1. `CreateRevision_SetsDraftStateAndIncrementsRevisionNumber` — Confirms new revisions start in `Draft` state and increment `RevisionNumber`.
2. `CreateRevision_RejectsSecondDraftWhenActiveDraftExists` — Confirms invariant that at most one draft is permitted per Examination family.
3. `SubmitForReview_RequiresAtLeastOneQuestion` — Enforces question count validation before review submission.
4. `SubmitForReview_TransitionsDraftToInReview` — Confirms transition to `InReview` and audit record.
5. `RecommendApproval_AdvisoryEventPreservesInReviewState` — Verifies advisory review notes do not mutate state prematurely.
6. `ReturnForChanges_RequiresReasonAndReturnsToDraft` — Confirms mandatory reason requirement and transition back to `Draft`.
7. `Approve_SeparationOfDuties_CreatorCannotApproveOwnRevision` — **Mandatory Decision 4:** Verifies that a revision creator cannot approve their own revision.
8. `Approve_DifferentAdmin_Succeeds` — Confirms different administrator can approve eligible revisions.
9. `Publish_AtomicallyArchivesPreviousPublishedRevisionAndRecordsActiveAttempts` — Confirms atomic supersession of published revisions and recording of in-progress attempt counts in `AuditLog`.
10. `Archive_RecordsActiveAttemptsCount` — Confirms explicit archival records in-progress attempt counts.
11. `Restore_SuperadminOverride_Enforces30DayWindowAndNoDualPublished` — Confirms 30-day restoration window and Superadmin role authorization.
12. `Restore_RejectsRestorationIfAnotherRevisionIsCurrentlyPublished` — Enforces guard against dual-published revisions.
13. `Retire_ArchivedToRetired_IsTerminal` — Confirms terminal retirement state cannot be transitioned further.
14. `EmergencyRetire_SuperadminCanRetirePublishedDirectly` — Verifies Superadmin emergency override for immediate withdrawal.
15. `ConcurrencyTokenMismatch_ThrowsDbUpdateConcurrencyExceptionAndLogsConflict` — Verifies optimistic concurrency conflict detection and logging.
16. `RoleAuthorization_ContentManagerHasNoLifecycleAuthority` — Confirms Content Manager role has no examination lifecycle authority.
17. `InstructorAccess_CanOnlyViewPublishedExaminationsAndRevisions` — Confirms instructors are restricted strictly to `Published` revisions.

### 2.2 PostgreSQL Database Integration Tests (`PostgresIntegrationTests`)
Executed against `prepford_gateb_verification`:
1. `Postgres_SequenceAllocation_GeneratesSequentialCodesFromDatabaseSequences` — Confirms PostgreSQL sequences `exam_code_rn_seq` and `exam_code_pn_seq` advance correctly and produce pathway-scoped zero-padded codes (`RN-EX-000001`, `PN-EX-000001`).
2. `Postgres_PartialUniqueIndexes_EnforcesSinglePublishedAndSingleDraftPerFamily` — Verifies PostgreSQL partial unique indexes (`IX_Exams_ExaminationId_SinglePublished` and `IX_Exams_ExaminationId_ActiveDraft`) reject duplicate rows at the database engine level.
3. `Postgres_AttemptMetadataSnapshot_PersistsAndQueriesJsonb` — Verifies PostgreSQL `jsonb` column serialization, storage, and querying.
4. All 15 existing PostgreSQL tests (`Schema_DatabaseMigrationsAndSeeding_CreatesAllTables`, `QuestionTypes_Postgres_Seeder_Idempotent`, `GatewayHmac_ValidSignature_AuthenticatesSuccessfully`, `HealthCheck_DatabaseReady_ReturnsHealthy_200`, etc.) pass 100%.

### 2.3 Gate C Candidate Protection Revalidation
- `AttemptMembershipSecurityTests`: **100% Passed**. Relational `ExamAttemptQuestion` remains the authoritative source for question membership and presentation order.
- `GradingSecurityTests`: **100% Passed**. Authoritative server-side grading and ungated answer keys cannot be bypassed.
- `CandidateDataContractTests`: **100% Passed**. In-progress attempts omit candidate scores, outcomes, correctness indicators, and rationales.
