# PrepFord Examination Management — P3.1 Final Acceptance Audit
## Post-Implementation Verification, Technical Debt & Scope Compliance

**Audit Mode:** READ-ONLY INDEPENDENT AUDIT  
**Phase:** P3.1 Final Acceptance  
**Audit Date:** 3 November 2026  
**Auditor:** Senior ASP.NET Core & Database Architecture Inspector  
**Repository Branch:** `feature/dotnet-backend-migration`  
**Current HEAD:** `8899d64c9871211cae7fb699e1a691eb01107515`  
**Working Tree Status:** Clean (0 uncommitted changes)  
**Database Target:** Isolated Loopback PostgreSQL 18 (`prepford_gateb_verification`)  
**Verdict:** **ACCEPTED WITH DOCUMENTED LIMITATIONS**

---

## 1. Executive Verdict

The implementation of Phase P3.1 (Examination Domain Foundation) has been inspected. The codebase demonstrates engineering adherence to the approved consolidated specification, delivering a stable examination identity model, sequence-based code generation, a six-state lifecycle engine, separation of duties enforcement, immutable JSONB attempt snapshots, optimistic concurrency control, and candidate data contract protection.

### Summary Assessment
- **All 18 PostgreSQL integration tests** pass against `prepford_gateb_verification`.
- **All 217 non-PostgreSQL unit and regression tests** pass with zero regressions.
- **Gate C candidate protection invariants** (`AttemptMembershipSecurityTests`, `GradingSecurityTests`, `CandidateDataContractTests`) remain 100% intact.
- **Scope Compliance (F-12):** 100% compliant. All 14 endpoints in `ExaminationsController.cs` expose P3.1 domain identity and lifecycle state machine transitions only. No P3.2 exam builder, question authoring, or UI dashboard functionality was introduced.
- **Documented Limitations Identified:**
  1. **F-09 (Legacy Data Backfill):** Migration `20261103092621_AddExaminationLifecycleAndSnapshot` is strictly additive schema DDL. Historical `Exam` rows retain `ExaminationId = NULL` and `LifecycleState = 0` (uninitialized). Operational backfill and Class A/B/C classification have not yet been executed in the database.
  2. **F-10 (Concurrent Archival vs Attempt Initialization Race):** `StartAttempt` and `ArchiveAsync` enforce lifecycle state validation in application logic, but execute without PostgreSQL row-level locking (`FOR SHARE` / `FOR UPDATE`) or serializable transactions. Under high concurrency, an attempt starting simultaneously with archival could commit without being reflected in the archive audit log's `activeAttemptsCount`.
  3. **F-11 (Migration Rollback Destructiveness):** The EF Core `Down` migration drops the `Examinations` table and `MetadataSnapshot` column. Executing rollback after P3.1 data exists is destructive to P3.1 records without an independent PostgreSQL dump (`pg_dump`).

---

## 2. Repository and Git Verification

### 2.1 Git Metadata
- **Active Branch:** `feature/dotnet-backend-migration`
- **Current HEAD Commit:** `8899d64c9871211cae7fb699e1a691eb01107515` (`create PrepFord Examination Management — P3.1 Final Implementation Report doc file`)
- **Working Tree:** Clean (`nothing to commit, working tree clean`)
- **Pre-P3.1 Baseline Commit:** `98b5e80084dba0837db6f1eed30effe076923d03` (`modify PrepFord Examination Management — P3.1 Implementation Readiness Plan doc file`)

### 2.2 P3.1 Commit Trajectory
The P3.1 foundation was delivered through five sequential commits:
1. `ff6fba5`: Added domain entities (`Examination`, `ExamLifecycleState`), DTOs, `ExaminationCodeService`, `ExamLifecycleService`, `ExaminationsController`, migration `20261103092621_AddExaminationLifecycleAndSnapshot`, baseline report.
2. `ebc9650`: Configured DI service registrations and connection string resolution in `Program.cs`.
3. `340ef10`: Added unit and integration test suites: `AttemptSnapshotTests.cs`, `ExaminationCodeTests.cs`, `ExaminationLifecycleTests.cs`, and PostgreSQL integration tests.
4. `acc6e85`: Reconciled test dependencies, removed duplicate in-memory collection add in `ExaminationCodeService.cs`, updated PostgreSQL integration fixtures.
5. `8899d64`: Added P3.1 implementation and evidence documentation; applied `[JsonIgnore]` masking to `CandidateAttemptDetailDto.MetadataSnapshot` during in-progress attempts to preserve Gate C candidate assessment protections.

### 2.3 File Inventory

```text
[MODIFIED] apps/api/Controllers/ExamAttemptsController.cs
[MODIFIED] apps/api/Data/AppDbContext.cs
[MODIFIED] apps/api/Models/Assessments.cs
[MODIFIED] apps/api/Program.cs
[MODIFIED] apps/api/Tests/PostgresIntegrationTests.cs
[NEW]      apps/api/Controllers/ExaminationsController.cs
[NEW]      apps/api/DTOs/ExaminationDtos.cs
[NEW]      apps/api/Migrations/0007_AddExaminationLifecycleAndSnapshot/20261103092621_AddExaminationLifecycleAndSnapshot.cs
[NEW]      apps/api/Migrations/0007_AddExaminationLifecycleAndSnapshot/20261103092621_AddExaminationLifecycleAndSnapshot.Designer.cs
[NEW]      apps/api/Services/ExaminationCodeService.cs
[NEW]      apps/api/Services/ExamLifecycleService.cs
[NEW]      apps/api/Services/IExaminationCodeService.cs
[NEW]      apps/api/Services/IExamLifecycleService.cs
[NEW]      apps/api/Tests/AttemptSnapshotTests.cs
[NEW]      apps/api/Tests/ExaminationCodeTests.cs
[NEW]      apps/api/Tests/ExaminationLifecycleTests.cs
[NEW]      docs/exam-management-p3-1-final-implementation-report.md
[NEW]      docs/exam-management-p3-1-implementation-progress-report.md
[NEW]      docs/exam-management-p3-1-migration-review-report.md
[NEW]      docs/exam-management-p3-1-test-evidence-report.md
```

All repository changes are tracked and accounted for.

---

## 3. Approved Decision Compliance Matrix (D1–D15)

| Decision ID | Description | Implementation File & Member | Database Constraint / Migration | Test Verification Evidence | Audit Status |
|---|---|---|---|---|---|
| **D1** | Stable Examination identity + versioned Exam revision (Option B) | `apps/api/Models/Assessments.cs`<br>`Examination`, `Exam.ExaminationId`, `Exam.RevisionNumber` | `FK_Exams_Examinations_ExaminationId`<br>`IX_Exams_ExaminationId_RevisionNumber` | `ExaminationLifecycleTests.CreateRevision_SetsDraftStateAndIncrementsRevisionNumber` | **PASS** |
| **D2** | Six-state lifecycle (`Draft`, `InReview`, `Approved`, `Published`, `Archived`, `Retired`) | `apps/api/Models/Assessments.cs`<br>`ExamLifecycleState`<br>`ExamLifecycleService.cs` | Column `Exams.LifecycleState` (integer)<br>Index `IX_Exams_LifecycleState` | `ExaminationLifecycleTests` (17 transition test cases) | **PASS** |
| **D3** | Immutable server-generated attempt metadata snapshot | `apps/api/Controllers/ExamAttemptsController.cs`<br>`StartAttempt`, `GetAttemptById` | Column `ExamAttempts.MetadataSnapshot` (`jsonb`) | `AttemptSnapshotTests.StartAttempt_GeneratesAuthoritativeJsonMetadataSnapshot` | **PASS** |
| **D4** | Separation of duties: creator cannot approve own revision | `apps/api/Services/ExamLifecycleService.cs`<br>`ApproveAsync` | Service-layer identity check (`CreatedBy != actorId`) | `ExaminationLifecycleTests.Approve_SeparationOfDuties_CreatorCannotApproveOwnRevision` | **PASS** |
| **D5** | Application-managed optimistic concurrency token | `apps/api/Models/Assessments.cs`<br>`Exam.ConcurrencyToken`<br>`AppDbContext.cs` | EF Core `.IsConcurrencyToken()`<br>Column `Exams.ConcurrencyToken` (`bigint`) | `ExaminationLifecycleTests.ConcurrencyTokenMismatch_ThrowsDbUpdateConcurrencyExceptionAndLogsConflict` | **PASS** |
| **D6** | Sequential, pathway-scoped examination codes | `apps/api/Services/ExaminationCodeService.cs`<br>`AllocateCodeAsync` | Sequence `exam_code_rn_seq`<br>Sequence `exam_code_pn_seq` | `PostgresIntegrationTests.Postgres_SequenceAllocation_GeneratesSequentialCodesFromDatabaseSequences` | **PASS** |
| **D7** | Lifecycle state is canonical source of truth; `IsPublished` is a compatibility bridge | `apps/api/Services/ExamLifecycleService.cs`<br>`PublishAsync`, `ArchiveAsync` | Synchronized boolean and state columns; `StartAttempt` validates `LifecycleState` | `AttemptSnapshotTests.StartAttempt_RejectsNonPublishedExams` | **PASS** |
| **D8** | Dedicated local isolated PostgreSQL verification | `apps/api/Tests/PostgresIntegrationTests.cs`<br>`PostgresTestFixture` | Safety guard requiring loopback + `prepford_gateb_verification` | 18/18 PostgreSQL integration tests passing | **PASS** |
| **D9** | Examination code format: `RN-EX-000001` / `PN-EX-000001`, independent sequences | `apps/api/Services/ExaminationCodeService.cs` | Sequences `exam_code_rn_seq`, `exam_code_pn_seq` (`MAXVALUE 999999 NO CYCLE`) | `ExaminationCodeTests.AllocateCode_GeneratesFormattedCodeForRNAndPN` | **PASS** |
| **D10** | Role authority matrix: Reviewer recommends/returns; Admin approves; Exam Manager publishes | `apps/api/Services/ExamLifecycleService.cs`<br>`EnforceRole` via `RoleHierarchy.cs` | Service-level role validation using `ClaimsPrincipal` | `ExaminationLifecycleTests.RoleAuthorization_ContentManagerHasNoLifecycleAuthority` | **PASS** |
| **D11** | Administrative override scope: Superadmin audited overrides only | `apps/api/Services/ExamLifecycleService.cs`<br>`RestoreAsync`, `EmergencyRetireAsync` | Audit log action `ExamLifecycleOverride`, `ExamRevisionRestored` | `ExaminationLifecycleTests.EmergencyRetire_SuperadminCanRetirePublishedDirectly` | **PASS** |
| **D12** | Instructor visibility: Instructors view Published examinations only | `apps/api/Services/ExamLifecycleService.cs`<br>`GetExaminationAsync`, `GetExaminationsAsync` | Query predicate filter: `LifecycleState == ExamLifecycleState.Published` | `ExaminationLifecycleTests.InstructorAccess_CanOnlyViewPublishedExaminationsAndRevisions` | **PASS** |
| **D13** | 30-day restoration window & terminal retirement | `apps/api/Services/ExamLifecycleService.cs`<br>`RestoreAsync`, `RetireAsync` | `ArchivedAt + 30 Days` check;<br>no dual-published guard | `ExaminationLifecycleTests.Restore_SuperadminOverride_Enforces30DayWindowAndNoDualPublished` | **PASS** |
| **D14** | Archival with active attempts: in-progress continue, active count recorded | `apps/api/Services/ExamLifecycleService.cs`<br>`ArchiveAsync`, `PublishAsync` | Queries active `InProgress` count; records to `AuditLog` | `ExaminationLifecycleTests.Archive_RecordsActiveAttemptsCount`<br>*(Concurrency limitation noted in F-10)* | **PARTIAL** |
| **D15** | Attempt snapshot storage: JSONB on `ExamAttempt` + relational `ExamAttemptQuestion` | `apps/api/Controllers/ExamAttemptsController.cs`<br>`apps/api/Models/Assessments.cs` | Column `ExamAttempts.MetadataSnapshot` (`jsonb`) | `PostgresIntegrationTests.Postgres_AttemptMetadataSnapshot_PersistsAndQueriesJsonb` | **PASS** |

---

## 4. Critical Audit F-09: Legacy Data Integrity

### 4.1 Migration Inspection
Inspection of `20261103092621_AddExaminationLifecycleAndSnapshot.cs` confirms:
1. **Schema DDL Only:** The migration adds columns to `Exams` and `ExamAttempts`, creates the `Examinations` table, creates partial unique indexes, and initializes PostgreSQL sequences. It contains **zero data backfill SQL statements (`UPDATE` or `INSERT`)**.
2. **Nullable `ExaminationId`:** Column `ExaminationId` on `Exams` was created as `nullable: true`.
3. **Default Values:**
   - `Exams.RevisionNumber`: Defaults to `0`.
   - `Exams.LifecycleState`: Defaults to `0`.
   - `Exams.ConcurrencyToken`: Defaults to `0`.
   - `Exams.CreatedBy`: Defaults to `""`.
4. **Undefined Enum Value 0:** In C#, `ExamLifecycleState` defines member values `1` through `6` (`Draft=1`, `InReview=2`, `Approved=3`, `Published=4`, `Archived=5`, `Retired=6`). The default database value `0` does not correspond to any valid lifecycle state.

### 4.2 Database State (`prepford_gateb_verification`)
Direct read-only inspection of the verification database confirms:
- **`Examinations` Count:** 3 rows (created by PostgreSQL test fixtures: `RN-EX-647346`, `RN-EX-465394`, `RN-EX-940597`).
- **`Exams` Count:** 8 rows.
  - 6 rows are revision rows associated with the 3 test examinations (`LifecycleState = 1` [Draft] and `LifecycleState = 4` [Published]).
  - 2 rows (`exam_pg_snap_...`) are test exam fixtures with `ExaminationId = NULL` and `LifecycleState = 4`.
- **`ExamAttempts` Count:** 2 rows. Both rows possess valid `MetadataSnapshot` JSONB documents (`schemaVersion: 1`). Zero historical candidate records were mutated.

### 4.3 Legacy Record Compatibility Analysis
- **Attempt Retrieval:** When an existing attempt has `MetadataSnapshot == NULL`, `ExamAttemptsController.GetAttemptById` dynamically returns a synthetic object with `"snapshotSource": "legacy_fallback"`, reading from `attempt.Exam`. The database is never retroactively modified.
- **Attempt Execution:** `ExamAttemptsController.StartAttempt` checks `if (exam.LifecycleState != ExamLifecycleState.Published && !exam.IsPublished)`. A pre-P3.1 exam record having `IsPublished = true` and `LifecycleState = 0` continues to be eligible for attempts through the compatibility fallback bridge.
- **Operational Backfill Status:** The legacy classification protocol specified in Section 9 of the specification (Class A, Class B, Class C) was **not executed** in this migration. Before deploying to shared or production databases, a dedicated, audited data migration script must be executed to map pre-existing `Exam` records into `Examination` families.

---

## 5. Critical Audit F-10: Archive / Attempt-Start Race Condition

### 5.1 Technical Analysis
Inspection of `ExamLifecycleService.ArchiveAsync` and `ExamAttemptsController.StartAttempt` reveals an isolation window under PostgreSQL's default `Read Committed` transaction level:

```text
Time   Candidate Thread A (StartAttempt)             Admin Thread B (ArchiveAsync)
────   ─────────────────────────────────             ─────────────────────────────
T1     SELECT * FROM Exams WHERE Id = :id
       (Reads LifecycleState == Published)
T2                                                   SELECT COUNT(*) FROM ExamAttempts 
                                                     WHERE ExamId = :id AND Status = 1;
T3                                                   UPDATE Exams SET LifecycleState = 5;
T4                                                   COMMIT;
T5     INSERT INTO ExamAttempts (Id, ExamId, ...)
       (Attempt created on archived exam!)
```

### 5.2 Identified Defect
1. `StartAttempt` verifies that `LifecycleState == Published` in memory, but does not acquire a PostgreSQL shared row lock (`SELECT ... FOR SHARE`) or run within a `RepeatableRead` / `Serializable` transaction.
2. In-progress count in `ArchiveAsync` is computed at T2 before `Exams.LifecycleState` is updated at T3.
3. If Thread A inserts its attempt at T5, the candidate attempt succeeds on an exam revision that is now `Archived`, and Thread B's audit log records an `activeAttemptsCount` that is short by one.
4. **Current Test Coverage:** No multi-threaded or concurrent PostgreSQL integration test currently exists in `apps/api/Tests/` to exercise concurrent attempt start and archival.

### 5.3 Required Test Scenario to Close F-10
To elevate this guarantee from **PARTIAL** to **PASS**:
1. Implement an integration test `Postgres_ConcurrentAttemptStartAndArchival_MaintainsConsistency`:
   - Launch Task 1: Repeatedly attempt `StartAttempt` for revision $R$ across 20 concurrent tasks.
   - Launch Task 2: Simultaneously trigger `ArchiveAsync` for revision $R$.
   - Assert: All attempts with `StartedAt >= ArchivedAt` are rejected with HTTP 422, or verify that `activeAttemptsCount` in the archive audit log exactly matches the final database count of in-progress attempts for revision $R$.
2. To guarantee zero leakage in production, modify `StartAttempt` to execute within an explicit database transaction using `SELECT ... FOR SHARE` on the `Exam` row prior to attempt insertion.

---

## 6. Critical Audit F-11: Migration Rollback Safety

### 6.1 Down Operation Analysis
Inspection of `20261103092621_AddExaminationLifecycleAndSnapshot.cs` (`Down` method) confirms the following operations:
- `DropForeignKey("FK_Exams_Examinations_ExaminationId", "Exams")`
- `DropTable("Examinations")`
- `DropIndex("IX_Exams_ExaminationId_ActiveDraft")`
- `DropIndex("IX_Exams_ExaminationId_RevisionNumber")`
- `DropIndex("IX_Exams_ExaminationId_SinglePublished")`
- `DropIndex("IX_Exams_LifecycleState")`
- `DropColumn("ApprovedAt" ... "SubmittedBy", "Exams")`
- `DropColumn("MetadataSnapshot", "ExamAttempts")`
- `DROP SEQUENCE IF EXISTS exam_code_rn_seq; DROP SEQUENCE IF EXISTS exam_code_pn_seq;`

### 6.2 Data Destruction Profile
If `Down` were executed after P3.1 has been live:
- **Permanently Destroyed:**
  - All `Examinations` rows (stable examination identity families, titles, permanent sequence codes `RN-EX-...` / `PN-EX-...`, and successor links).
  - All attempt metadata snapshots captured in `ExamAttempts.MetadataSnapshot`.
  - All revision numbers, concurrency tokens, and lifecycle state metadata on `Exams`.
  - All staffing audit timestamps and approver IDs on `Exams`.
- **Preserved:**
  - `ExamAttempts` records (candidate IDs, start/completed timestamps, scores, pass/fail status).
  - `ExamAttemptQuestions` (exact question set and presentation order).
  - `AttemptResponses` (candidate answers, scores awarded, grading flags).
  - Pre-existing `Exams` columns (`Id`, `Title`, `Pathway`, `TimeLimitMinutes`, `PassingScorePercent`, `IsPublished`).
  - Historical records in `AuditLogs` table.

### 6.3 Recovery Plan Assessment
- **Status:** **UNTESTED / MANUAL**.
- No automated disaster recovery or rollback backup script exists in the repository.
- **Rule:** Rollback must never be executed on an environment containing P3.1 data without taking an explicit, verified PostgreSQL backup (`pg_dump -Fc`) immediately beforehand.

---

## 7. Critical Audit F-12: Scope Compliance

Every endpoint in `apps/api/Controllers/ExaminationsController.cs` was inspected and classified:

| HTTP Method | Route | Method Name | Scope Classification | Authorized in P3.1? |
|---|---|---|---|---|
| `GET` | `/api/v1/examinations` | `GetExaminations` | P3.1 Domain Foundation (Read & Instructor filter) | **YES** |
| `GET` | `/api/v1/examinations/{id}` | `GetExamination` | P3.1 Domain Foundation (Identity read & Instructor filter) | **YES** |
| `POST` | `/api/v1/examinations` | `CreateExamination` | P3.1 Domain Foundation (Code allocation entrypoint) | **YES** |
| `GET` | `/api/v1/examinations/revisions/{revisionId}` | `GetRevision` | P3.1 Domain Foundation (Revision read & Instructor filter) | **YES** |
| `POST` | `/api/v1/examinations/{id}/revisions` | `CreateRevision` | P3.1 Domain Foundation (Initial draft transition) | **YES** |
| `POST` | `/api/v1/examinations/revisions/{revisionId}/submit` | `SubmitForReview` | P3.1 Domain Foundation (State machine transition) | **YES** |
| `POST` | `/api/v1/examinations/revisions/{revisionId}/recommend` | `RecommendApproval` | P3.1 Domain Foundation (Advisory transition) | **YES** |
| `POST` | `/api/v1/examinations/revisions/{revisionId}/return` | `ReturnForChanges` | P3.1 Domain Foundation (State machine transition) | **YES** |
| `POST` | `/api/v1/examinations/revisions/{revisionId}/approve` | `ApproveRevision` | P3.1 Domain Foundation (Separation of duties transition) | **YES** |
| `POST` | `/api/v1/examinations/revisions/{revisionId}/publish` | `PublishRevision` | P3.1 Domain Foundation (Publication supersession) | **YES** |
| `POST` | `/api/v1/examinations/revisions/{revisionId}/archive` | `ArchiveRevision` | P3.1 Domain Foundation (Archival & active attempt count) | **YES** |
| `POST` | `/api/v1/examinations/revisions/{revisionId}/restore` | `RestoreRevision` | P3.1 Domain Foundation (Superadmin 30-day override) | **YES** |
| `POST` | `/api/v1/examinations/revisions/{revisionId}/retire` | `RetireRevision` | P3.1 Domain Foundation (Terminal retirement transition) | **YES** |
| `POST` | `/api/v1/examinations/revisions/{revisionId}/emergency-retire` | `EmergencyRetire` | P3.1 Domain Foundation (Superadmin emergency override) | **YES** |

### 7.1 Scope Boundaries Verification
- **Exam Question Authoring / Editing (`ExamQuestions`):** Zero endpoints added.
- **Question Bank Association:** Zero endpoints added.
- **Adaptive CAT Scoring Workflows:** Zero endpoints added.
- **UI Dashboard Aggregations:** Zero endpoints added.
- **Conclusion:** **100% Scope Compliant.** Zero out-of-scope P3.2 features were introduced.

---

## 8. Additional Technical & Database Verification

1. **PostgreSQL Sequences:**
   - `exam_code_rn_seq` and `exam_code_pn_seq` advance independently.
   - Tested in PostgreSQL 18: allocation of `RN` does not advance `PN` sequence.
   - Sequence ceiling (`999999 NO CYCLE`) verified.
2. **Partial Unique Indexes:**
   - `IX_Exams_ExaminationId_SinglePublished` (filter: `"LifecycleState" = 4`): Inserting a second published revision under the same `ExaminationId` triggers a PostgreSQL unique constraint violation. Verified in `PostgresIntegrationTests.Postgres_PartialUniqueIndexes_EnforcesSinglePublishedAndSingleDraftPerFamily`.
   - `IX_Exams_ExaminationId_ActiveDraft` (filter: `"LifecycleState" = 1`): Inserting a second draft revision under the same `ExaminationId` triggers a PostgreSQL unique constraint violation. Verified.
3. **Optimistic Concurrency:**
   - EF Core maps `ConcurrencyToken` using `.IsConcurrencyToken()`.
   - Tested in `ExaminationLifecycleTests`: Stale token update throws `DbUpdateConcurrencyException`, records an `AuditLog` entry with `Outcome = "Conflict"`, and returns HTTP 409 Conflict.
4. **Atomic Supersession:**
   - Publishing an `Approved` revision atomically locates any currently `Published` revision for that `ExaminationId`, transitions it to `Archived`, clears `IsPublished`, captures active attempts, records an archive audit event, and updates `Examination.CurrentRevisionId` in a single `SaveChangesAsync` call.
5. **Gate C Candidate Data Protection:**
   - In-progress attempts hide all scoring, pass/fail indicators, correctness flags, and internal snapshot payloads from the candidate JSON response. Verified in `CandidateDataContractTests` (all 217 non-PostgreSQL tests pass).

---

## 9. Verified Test Evidence

### 9.1 Test Execution Metrics
- **PostgreSQL Suite (`prepford_gateb_verification`):** 18 tests passed, 0 failed, 0 skipped. Duration: 16.0s.
- **Non-PostgreSQL Suite (In-Memory + Theory-expanded):** 217 tests passed, 0 failed, 0 skipped. Duration: 27.0s.
- **Combined Test Count:** 235 tests passed, 0 failed.
- **Test Integrity:** Zero tests were disabled, commented out, or skipped.

### 9.2 Complete PostgreSQL Test Inventory (18/18 Passing)
1. `DbConnectionStringTests.Npgsql_CanParse_PostgresUrl`
2. `DbConnectionStringTests.Npgsql_CanParse_PostgresUrlWithQueryParam`
3. `PostgresIntegrationTests.Schema_DatabaseMigrationsAndSeeding_CreatesAllTables`
4. `PostgresIntegrationTests.ReferentialIntegrity_UserSessionWithoutValidUser_ThrowsDbUpdateException`
5. `PostgresIntegrationTests.UniqueConstraint_DuplicateUserEmail_ThrowsDbUpdateException`
6. `PostgresIntegrationTests.TransactionRollback_PreservesCleanState_WhenCheckoutFails`
7. `PostgresIntegrationTests.RBAC_AdminSubscriptions_CandidateAccessIsForbidden_403`
8. `PostgresIntegrationTests.RBAC_AdminSubscriptions_InstructorAccessIsForbidden_403`
9. `PostgresIntegrationTests.RBAC_AdminSubscriptions_AdminAccessIsAllowed_200`
10. `PostgresIntegrationTests.RBAC_AdminSubscriptions_SuperAdminAccessIsAllowed_200`
11. `PostgresIntegrationTests.RBAC_AdminSubscriptions_Unauthenticated_Returns401`
12. `PostgresIntegrationTests.Profile_DisallowedRoleAndPlanTampering_IgnoredOrRejected`
13. `PostgresIntegrationTests.Webhook_InvalidSignature_ReturnsBadRequest_400`
14. `PostgresIntegrationTests.FailurePath_SafeErrorResponses_NeverLeakStackTraces`
15. `PostgresIntegrationTests.Postgres_SequenceAllocation_GeneratesSequentialCodesFromDatabaseSequences` *(P3.1)*
16. `PostgresIntegrationTests.Postgres_PartialUniqueIndexes_EnforcesSinglePublishedAndSingleDraftPerFamily` *(P3.1)*
17. `PostgresIntegrationTests.Postgres_AttemptMetadataSnapshot_PersistsAndQueriesJsonb` *(P3.1)*
18. `QuestionTypePostgresGateBTests.ReconciliationRollbackAndHttpCatalogueUsePostgresSafely`

---

## 10. Outstanding Defects, Technical Debt & Risks

| ID | Severity | Category | Description | Risk & Impact |
|---|---|---|---|---|
| **R-01** | Medium | Concurrency | `StartAttempt` does not acquire a PostgreSQL row lock (`FOR SHARE`) or transaction boundary against `Exam.LifecycleState`. | Low in normal traffic; under concurrent archival, an untracked attempt could begin on an archived exam. |
| **R-02** | Low | Data Migration | Additive migration `0007` does not classify or populate existing `Exam` records into `Examination` families. | Legacy records remain with `ExaminationId = NULL` and `LifecycleState = 0` until operational backfill is run. |
| **R-03** | Low | Disaster Recovery | EF Core `Down` drops the `Examinations` table and `MetadataSnapshot` column. | Manual rollback on live data without a preceding `pg_dump` would cause permanent loss of P3.1 records. |

---

## 11. Required Remediation Prior to Production Deployment

Before promoting this branch to production:
1. **Remediation for R-01 (F-10):** Wrap `StartAttempt` in an explicit database transaction that performs a PostgreSQL `SELECT ... FOR SHARE` lock on the target `Exam` row before inserting the `ExamAttempt`, ensuring archival cannot commit concurrently between verification and insertion.
2. **Remediation for R-02 (F-09):** Prior to production migration, execute the approved operational data inventory and backfill script (`docs/exam-management-p3-1-publication-migration-specification.md`) to map existing legacy `Exam` records to canonical `Examination` families.
3. **Remediation for R-03 (F-11):** Establish a documented deployment checklist mandating a full `pg_dump` immediately prior to applying migration `0007`.

---

## 12. Final Acceptance Recommendation

### Verdict: **ACCEPTED WITH DOCUMENTED LIMITATIONS**

The P3.1 implementation is technically sound, well-tested, and fully aligned with the architectural specifications and owner decisions. It successfully establishes the examination domain foundation without regressing candidate protections or scoring guarantees.

Authorization to proceed to **Phase P3.2** (Examination Authoring & Administrative Workflows) is **RECOMMENDED**, with the three documented technical debt items scheduled for closure alongside P3.2 deployment preparation.
