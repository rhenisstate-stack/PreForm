# PrepFord Examination Management — P3.1 PostgreSQL Verification Report

**Phase:** P3.1 — Examination Domain Foundation  
**Stage:** PostgreSQL Verification Completion  
**Execution Date:** 3 November 2026  
**Status:** VERIFIED — READY FOR OWNER IMPLEMENTATION REVIEW  
**Implementation Authorization:** NOT GRANTED (Awaiting Owner Approval)

---

## 1. Executive Summary

This report establishes the complete verification of the dedicated, isolated PostgreSQL test environment for Phase P3.1 (Examination Domain Foundation). All 15 PostgreSQL integration tests and all 56 non-PostgreSQL unit and domain tests passed (100% pass rate).

The security isolation guard in `apps/api/Tests/PostgresIntegrationTests.cs` was verified to strictly reject unisolated or remote connections, while allowing execution against the dedicated loopback database `prepford_gateb_verification`. Zero destructive operations, data loss, schema resets, or migrations were executed. Gate C server-authoritative grading and attempt membership protections remain 100% intact.

---

## 2. Repository & Environment Revalidation

### 2.1 Repository State
- **Branch:** `feature/dotnet-backend-migration`
- **HEAD Commit:** `ea0ae3a7d3bf8dfaa799c8bcdd572ffaf07fb0ba`
- **Working Tree Status:** Clean (no uncommitted or modified files)

### 2.2 PostgreSQL Client & Server Evidence
- **Client Binary:** `C:\Program Files\PostgreSQL\18\bin\psql.exe`
- **Client Version:** `psql (PostgreSQL) 18.6`
- **Server Utility:** `C:\Program Files\PostgreSQL\18\bin\pg_isready.exe`
- **Service Name:** `postgresql-x64-18` (Windows Service, configured under NT AUTHORITY\NetworkService)
- **Local Service & Socket Status:** Verified running and accepting connections on loopback interface:
  - Command: `pg_isready.exe -h 127.0.0.1 -p 5432 -U postgres`
  - Output: `127.0.0.1:5432 - accepting connections`

---

## 3. Dedicated Database Isolation & Inspection

### 3.1 Target Database Verification
- **Permitted Database Name:** `prepford_gateb_verification`
- **Host Target:** `127.0.0.1` (loopback strictly verified)
- **Port:** `5432`
- **Superuser:** `postgres`

### 3.2 Pre-Existing Schema & Table Inspection
The database `prepford_gateb_verification` pre-existed on the local instance and was inspected non-destructively without truncation, deletion, or resetting.
- **Table Count:** 31 public tables
- **Key Tables Present:** `Exams`, `ExamQuestions`, `ExamAttempts`, `ExamAttemptQuestions`, `AttemptResponses`, `QuestionTypeDefinitions`, `Users`, `Roles`, `UserSessions`, `Orders`, `AuditLogs`, `__EFMigrationsHistory`.
- **Applied Migrations in `__EFMigrationsHistory`:**
  1. `20261026120000_CreateProgrammes` (8.0.10)
  2. `20261027150000_AddMasterDomainModels` (8.0.10)
  3. `20261028090000_AddUserProfileImages` (8.0.10)
  4. `20261029100000_HarmonizeBackendSchema` (8.0.10)
  5. `20261031100000_AddStudyStudioFlashcards` (8.0.10)
  6. `20261102060000_AddQuestionTypeCapabilityAndStatus` (8.0.10)
  7. `20261103054224_AddAttemptQuestionSetAndGradingState` (8.0.10)

---

## 4. Environment Variable Configuration & Safety Guard Inspection

### 4.1 Process-Scoped Environment Variable
The environment variable `PREFORM_GATEB_TEST_CONNECTION_STRING` was configured in the ephemeral test process only, targeting `Host=127.0.0.1;Port=5432;Database=prepford_gateb_verification;`.
- No credentials were written to `.env`, source code, git-tracked files, or repository documentation.

### 4.2 Isolation Guard Inspection (`PostgresIntegrationTests.cs`)
The guard code in `PostgresTestFixture` enforces the following invariants:
```csharp
var connectionString = new NpgsqlConnectionStringBuilder(configured);
if (!IPAddress.TryParse(connectionString.Host, out var address)
    || !IPAddress.IsLoopback(address)
    || !string.Equals(connectionString.Database, "prepford_gateb_verification", StringComparison.Ordinal))
{
    throw new InvalidOperationException(
        "PostgreSQL integration tests only accept a loopback connection to the isolated prepford_gateb_verification database.");
}
```
- **Guard Validation Evidence:**
  - Running without the environment variable throws `InvalidOperationException: Set PREFORM_GATEB_TEST_CONNECTION_STRING to an isolated loopback PostgreSQL database named prepford_gateb_verification.`
  - Connecting to any non-loopback host or any database other than `prepford_gateb_verification` throws `InvalidOperationException`.
  - No fallback to `prepford`, production, or remote instances is physically possible.

---

## 5. PostgreSQL Integration Test Results

- **Command Executed:**
  ```powershell
  dotnet test apps/api/Tests/Preform.Api.Tests.csproj --filter "FullyQualifiedName~Postgres" --logger "console;verbosity=normal"
  ```
- **Total Tests Discovered:** 15
- **Passed:** 15
- **Failed:** 0
- **Skipped:** 0
- **Execution Time:** ~25.8 seconds

### 5.1 Test Breakdown

| Test Name | Fixture / Class | Result | Verification Focus |
|---|---|---|---|
| `Npgsql_CanParse_PostgresUrlWithQueryParam` | `DbConnectionStringTests` | Passed | Npgsql connection string query parameter parsing |
| `Npgsql_CanParse_PostgresUrl` | `DbConnectionStringTests` | Passed | PostgreSQL URL scheme normalization |
| `Schema_DatabaseMigrationsAndSeeding_CreatesAllTables` | `PostgresIntegrationTests` | Passed | Full EF migration schema & catalog seeding |
| `ReferentialIntegrity_UserSessionWithoutValidUser_ThrowsDbUpdateException` | `PostgresIntegrationTests` | Passed | Foreign key constraints on PostgreSQL |
| `UniqueConstraint_DuplicateUserEmail_ThrowsDbUpdateException` | `PostgresIntegrationTests` | Passed | Unique email index collision abort |
| `TransactionRollback_PreservesCleanState_WhenCheckoutFails` | `PostgresIntegrationTests` | Passed | Atomic transaction rollback on failure |
| `RBAC_AdminSubscriptions_CandidateAccessIsForbidden_403` | `PostgresIntegrationTests` | Passed | PostgreSQL-backed candidate access denial |
| `RBAC_AdminSubscriptions_InstructorAccessIsForbidden_403` | `PostgresIntegrationTests` | Passed | PostgreSQL-backed instructor access denial |
| `RBAC_AdminSubscriptions_AdminAccessIsAllowed_200` | `PostgresIntegrationTests` | Passed | PostgreSQL-backed admin access authorization |
| `RBAC_AdminSubscriptions_SuperAdminAccessIsAllowed_200` | `PostgresIntegrationTests` | Passed | PostgreSQL-backed superadmin authorization |
| `RBAC_AdminSubscriptions_Unauthenticated_Returns401` | `PostgresIntegrationTests` | Passed | Unauthenticated 401 handling |
| `Profile_DisallowedRoleAndPlanTampering_IgnoredOrRejected` | `PostgresIntegrationTests` | Passed | Role/plan field tampering protection |
| `Webhook_InvalidSignature_ReturnsBadRequest_400` | `PostgresIntegrationTests` | Passed | Webhook signature rejection |
| `FailurePath_SafeErrorResponses_NeverLeakStackTraces` | `PostgresIntegrationTests` | Passed | Stack trace sanitization on error |
| `ReconciliationRollbackAndHttpCatalogueUsePostgresSafely` | `QuestionTypePostgresGateBTests` | Passed | Gate B catalog seeder & constraint rollback |

### 5.2 Migration & Cleanup Activity
- **EF Core Migrations Applied:** `No migrations were applied. The database is already up to date.`
- **Fixture Cleanup Scope:**
  - `QuestionTypePostgresGateBTests` captured baseline state, tested duplicate constraints and catalog rollbacks in transactional try/finally blocks, dropped temporary constraint `CK_GateB_ForceReconciliationFailure`, and restored question types to baseline.
  - `PostgresIntegrationTests` used explicit GUID identifiers (`usr_tamper_...`, `ord_tx_...`) and transaction rollbacks, preventing cross-test pollution.

---

## 6. Non-PostgreSQL Regression Suite Results

- **Command Executed:**
  ```powershell
  dotnet test apps/api/Tests/Preform.Api.Tests.csproj --no-restore --filter "FullyQualifiedName!~Postgres"
  ```
- **Total Test Methods Discovered:** 56 (193 test executions with expanded theory test cases)
- **Passed:** 193
- **Failed:** 0
- **Skipped:** 0
- **Execution Time:** ~13.0 seconds
- **Sandbox Environment Note:** .NET `vstest.console` uses local TCP loopback IPC to communicate with `testhost`. Under standard Windows sandbox restrictions, process-to-process loopback IPC is intercepted, leading to transient connection timeouts if run without loopback socket allowance; running with loopback socket permissions executes cleanly in ~13s.

### 6.1 Subsystem Integrity Summary
1. **Attempt Membership Security (Gate C):**
   - `GateC_MembershipContract_OnlyAssignedQuestionsAreDeliverable` (Passed)
   - `GateC_CandidateResponseTampering_RejectedForUnassignedQuestion` (Passed)
   - `GateC_SequencePreservation_ReturnsAssignedOrderDeterministically` (Passed)
   - `GateC_ActiveAttempt_BlocksQuestionListMutationWhileInProgress` (Passed)
2. **Server-Authoritative Grading (Gate C):**
   - `GateC_GradingContract_SingleChoice_ServerAuthoritativeScore` (Passed)
   - `GateC_GradingContract_SATA_PartialCredit_ServerAuthoritative` (Passed)
   - `GateC_GradingContract_ClientScorePayload_IgnoredByServer` (Passed)
   - `GateC_GradingContract_UngradedQuestions_RemainUngradedUntilEvaluated` (Passed)
   - `GateC_GradingContract_PassingThreshold_EnforcesServerCutScore` (Passed)
3. **Candidate Data Isolation (Gate C):**
   - `GateC_DataContract_AttemptDetail_ExcludesCorrectAnswersAndScoringDetails` (Passed)
   - `GateC_DataContract_OptionText_PreservedWithoutScoringLeakage` (Passed)
   - `GateC_DataContract_SubmittedAttempt_RevealsCorrectnessOnlyAfterSubmission` (Passed)
   - `GateC_DataContract_NoAnswerKeyField_OnAnyCandidateFacingEndpoint` (Passed)
4. **Role Hierarchy & Authorization:**
   - `RoleResolution_ResolvesHierarchyAndNormalizationConsistently` (Passed)
   - `AdminBootstrap_SeedSuperadmin_PreservesExistingUserIfPresent` (Passed)
   - `AdminBootstrap_SeedSuperadmin_CreatesAdminUser_WhenNoneExists` (Passed)
5. **Question Type Registry & Contracts:**
   - `QuestionTypeRegistry_Has18CatalogueTypes_AndExpectedCapabilities` (Passed)
   - 18 question type contract validator test suites (All Passed across all parametrized theory test cases)
6. **Auxiliary Domain Contracts:**
   - Promo discount tests, study flashcards tests, testimonial tests (All Passed)

---

## 7. Destructive Action & Safety Invariants

- **Production / Shared Databases Touched:** 0 (Strictly avoided)
- **Databases Dropped or Reset:** 0
- **Existing Schemas Altered:** 0
- **P3.1 Application Features Implemented:** 0 (Strictly deferred until authorization)
- **Application Code / Entities Modified:** 0

---

## 8. Final Readiness Classification

**Status:** **VERIFIED — READY FOR OWNER IMPLEMENTATION REVIEW**

All prerequisites for Phase P3.1 implementation authorization are now satisfied:
1. All 15 owner architectural and policy decisions are formally approved.
2. The consolidated implementation specification is complete and internally consistent.
3. The dedicated PostgreSQL verification database (`prepford_gateb_verification`) is confirmed on loopback.
4. The test fixture isolation safety guard is active and enforced.
5. 15/15 PostgreSQL integration tests pass cleanly without failures.
6. 56/56 non-PostgreSQL unit and Gate C regression tests pass cleanly without regression.
7. Zero blockers remain.
