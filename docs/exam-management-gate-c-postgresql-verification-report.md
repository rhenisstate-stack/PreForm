# PrepFord Gate C — PostgreSQL Verification Report (C5)

**Date:** 2026-11-03
**Status:** Verified against a disposable loopback database. Owner approval required before any further gate work.

## 1. Scope

Prove, against real PostgreSQL (never the shared/production `prepford` database):

1. The full EF migration chain applies cleanly in order on a fresh database, including the new Gate C migration.
2. Role seeding (C5 root cause) is idempotent and produces the full role catalogue including `candidate`.
3. The Gate C schema changes (`AttemptResponses.GradingState` default, `ExamAttemptQuestions` table with its unique index) exist with the expected shape.
4. Gate B catalogue compatibility remains intact (Gate B Postgres tests still pass in the same run).

## 2. Disposal environment

- PostgreSQL server: `Host=127.0.0.1;Port=5432;Username=postgres` (loopback only).
- Database used: `prepford_gateb_verification` — **dropped and recreated fresh** before this evidence pass so the migration chain ran from zero on this session's model state.
- One-off migration-check database `prepford_gatec_migration_check` had been created earlier for a manual `dotnet ef database update` run of the 7-migration chain (verified: all migrations apply, `GradingState` column default `1`); it was **dropped/disposed** after the verification run.
- The tests themselves enforce disposal safety: `PostgresTestFixture` rejects any connection string whose host is not a loopback IP or whose database name is not `prepford_gateb_verification`.
- The production/shared `prepford` database was never touched.

## 3. Evidence

### 3.1 Migration chain (fresh database)

`"__EFMigrationsHistory"` after the test run's `MigrateAsync`:

1. `20261026120000_CreateProgrammes`
2. `20261027150000_AddMasterDomainModels`
3. `20261028090000_AddUserProfileImages`
4. `20261029100000_HarmonizeBackendSchema`
5. `20261031100000_AddStudyStudioFlashcards`
6. `20261102060000_AddQuestionTypeCapabilityAndStatus`
7. `20261103054224_AddAttemptQuestionSetAndGradingState` ← new Gate C migration

All 7 migrations applied in order with no checksum/discovery anomalies.

### 3.2 Role seeding (C5 root cause)

`SELECT * FROM "Roles"` → **14 roles** seeded, including the Gate B canonical set (`role-admin`, `role-content-mgr`, `role-exam-mgr`, `role-instructor`, `role-reviewer`, `role-student`, `role-superadmin`) and the newer canonical set (`admin`, `content_manager`, `exam_manager`, `instructor`, `reviewer`, `candidate` ← required candidate role, `superadmin`). The two seed batches with distinct timestamps prove the seeder ran idempotently — previously-seeded roles are not duplicated or erased when the catalogue is re-run on a populated database (idempotency fix from owner commit `43cae55`).

### 3.3 Gate C schema shape

- `AttemptResponses.GradingState`: `integer NOT NULL`, `column_default = 1` (`Graded`) — every legacy row and new default row is graded unless explicitly marked ungraded.
- `ExamAttemptQuestions` table present with columns `Id`, `ExamAttemptId`, `QuestionId`, `DisplayOrder`, `AssignedAt`.
- Unique composite index present:
  `CREATE UNIQUE INDEX "IX_ExamAttemptQuestions_ExamAttemptId_QuestionId" ON public."ExamAttemptQuestions" ("ExamAttemptId", "QuestionId")` plus `PK_ExamAttemptQuestions` and single-column lookup indexes.
- 31 public tables total; core catalogue tables (`Roles`, `Users`, `Exams`, `Questions`, `ExamQuestions`, `ExamAttempts`, `AttemptResponses`) all created and queryable.

### 3.4 Test execution

Full backend suite executed with `PREFORM_GATEB_TEST_CONNECTION_STRING=Host=127.0.0.1;Port=5432;Database=prepford_gateb_verification;Username=postgres;Password=postgres`:

- **208 passed, 0 failed, 0 skipped** (`Tests/Preform.Api.Tests.csproj`, no filter) — includes `PostgresIntegrationTests` (migrations + seeding + schema verification) and `QuestionTypePostgresGateBTests` (Gate B catalogue compatibility, reconciliation rollback/idempotency against PostgreSQL), both against the disposable database.

## 4. Conclusion

C5 is resolved: migration integrity, seeding idempotency (including the `candidate` role), and the Gate C schema additions are proven on disposable PostgreSQL. No shared database was modified. Evidence above; disposal complete.
