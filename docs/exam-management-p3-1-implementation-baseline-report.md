# PrepFord Examination Management — P3.1 Implementation Baseline Report

**Phase:** P3.1 — Examination Domain Foundation  
**Stage:** Gate 0 — Pre-Implementation Baseline & Revalidation  
**Date:** 3 November 2026  
**Status:** GATE 0 COMPLETE — REPOSITORY VERIFIED & SAFE FOR IMPLEMENTATION  
**Authorization:** Granted by PrepFord Product Owner  

---

## 1. Executive Summary

This report establishes the verified baseline of the PrepFord codebase immediately prior to the execution of Phase P3.1 implementation workstreams. Repository state, actual entity models, framework dependencies, isolation guards, and test suites were executed and validated.

All 15 PostgreSQL integration tests and all 193 non-PostgreSQL unit and regression tests passed (100% pass rate across 208 total test executions). The repository working tree is clean, and the environment is confirmed safe for controlled additive implementation.

---

## 2. Git & Working Tree State

- **Branch:** `feature/dotnet-backend-migration`
- **HEAD Commit:** `98b5e80084dba0837db6f1eed30effe076923d03`
- **Working Tree:** Clean (no unstaged or cached modifications)
- **Recent Git History:**
  - `98b5e80` modify PrepFord Examination Management — P3.1 Implementation Readiness Plan doc file
  - `cc2c8de` modify PrepFord Examination Management — P3.1 Concurrency Specification
  - `036466f` edit the PrepFord Examination Management — P3.1 Authorization Specification doc file
  - `a750eea` create the PrepFord Examination Management — P3.1 PostgreSQL Verification Report doc file
  - `ea0ae3a` create the PrepFord Examination Management — P3.1 PostgreSQL Preflight Verification Report doc file

---

## 3. Existing Model Definitions & Consumer Reference Inspection

The existing codebase was inspected to identify all shared models, primary keys, property types, and consumers:

### 3.1 `Exam` (`apps/api/Models/Assessments.cs`)
- **Key:** `public string Id { get; set; } = Guid.NewGuid().ToString();` (string UUID, table `public.Exams`)
- **Fields:** `Title` (varchar(128)), `Description` (varchar(1024)), `Pathway` (varchar(10), default `"rn"`), `ExamType` (enum `ExamType`: `Practice=1`, `CAT=2`, `MockSimulation=3`, `DiagnosticReadiness=4`), `TimeLimitMinutes` (int, default 0), `PassingScorePercent` (decimal, default 75.0m), `IsPublished` (bool), `CreatedAt` (DateTime), `UpdatedAt` (DateTime).
- **Navigation:** `ExamQuestions` (`ICollection<ExamQuestion>`), `Attempts` (`ICollection<ExamAttempt>`).

### 3.2 `ExamAttempt` (`apps/api/Models/Assessments.cs`)
- **Key:** `public string Id { get; set; } = Guid.NewGuid().ToString();`
- **Candidate Identifier:** `public string UserId { get; set; } = string.Empty;` referencing `User.Id` (NOT `CandidateId`).
- **Exam Link:** `public string ExamId { get; set; } = string.Empty;` referencing `Exam.Id`.
- **Status & Scoring:** `Status` (enum `AttemptStatus`: `InProgress=1`, `Completed=2`, `Abandoned=3`), `ScorePercent` (decimal), `Passed` (bool, NOT `IsPassed`).
- **Timestamps:** `StartedAt` (DateTime), `CompletedAt` (DateTime?).
- **Navigation:** `Responses` (`ICollection<AttemptResponse>`).

### 3.3 `ExamAttemptQuestion` (`apps/api/Models/Assessments.cs`)
- **Key:** `public string Id { get; set; } = Guid.NewGuid().ToString();`
- **Foreign Keys:** `ExamAttemptId` (string -> `ExamAttempt.Id`), `QuestionId` (string -> `Question.Id`).
- **Sequence Ordering:** `DisplayOrder` (int, NOT `SequenceNumber`).
- **Timestamp:** `AssignedAt` (DateTime).

### 3.4 Active Consumers Identified
1. `apps/api/Controllers/ExamAttemptsController.cs` (Start attempt, submit answer, attempt summaries, candidate detail DTOs)
2. `apps/api/Services/AttemptQuestionService.cs` (Gate C question membership validation & recording)
3. `apps/api/Services/ResponseValidationService.cs` (Question option validation & response structure)
4. `apps/api/Services/CatalogSeeder.cs` (Role & catalogue seeding)
5. `apps/api/Tests/AttemptMembershipSecurityTests.cs` (Gate C attempt question tamper protection)
6. `apps/api/Tests/CandidateDataContractTests.cs` (Gate C candidate response data masking)
7. `apps/api/Tests/GradingSecurityTests.cs` (Gate C server-authoritative scoring)
8. `apps/api/Tests/AppTests.cs` (Configuration loading)

---

## 4. Environment & Dependency Baseline

- **.NET SDK & Runtime:** .NET 8.0.14 (`net8.0`)
- **Entity Framework Core:** `Microsoft.EntityFrameworkCore` 8.0.10
- **PostgreSQL Driver:** `Npgsql.EntityFrameworkCore.PostgreSQL` 8.0.10
- **PostgreSQL Server:** PostgreSQL 18.6 running locally on `127.0.0.1:5432` (`postgresql-x64-18`)
- **Target Verification Database:** `prepford_gateb_verification`
- **Isolation Guard:** `PREFORM_GATEB_TEST_CONNECTION_STRING` required in `apps/api/Tests/PostgresIntegrationTests.cs`; rejects any non-loopback connection or database other than `prepford_gateb_verification`.

---

## 5. Baseline Test Execution Results

Prior to making any code modifications, the entire backend test harness was executed against the isolated environment:

### 5.1 PostgreSQL Integration Test Suite
- **Command:** `dotnet test apps/api/Tests/Preform.Api.Tests.csproj --no-build --filter "FullyQualifiedName~Postgres"`
- **Result:** **15 / 15 Passed** (0 Failed, 0 Skipped, Duration: 14s)
- **Verified Subsystems:** EF Core schema migrations, table creation, foreign-key constraints, duplicate email unique constraints, transaction rollback, RBAC role authorization (admin, superadmin, instructor, candidate, anonymous), profile tampering rejection, webhook signature verification, and Gate B catalog rollback.

### 5.2 Non-PostgreSQL Unit & Regression Suite
- **Command:** `dotnet test apps/api/Tests/Preform.Api.Tests.csproj --no-build --filter "FullyQualifiedName!~Postgres"`
- **Result:** **193 / 193 Passed** across 56 test methods (0 Failed, 0 Skipped, Duration: 6s)
- **Verified Subsystems:**
  - Gate C Attempt Membership Security: 4 test methods
  - Gate C Server-Authoritative Grading: 5 test methods
  - Gate C Candidate Data Contract Isolation: 4 test methods
  - Role Resolution Hierarchy: 1 test method
  - Question Type Contract Validators: 18 test methods (expanded theories)
  - Study studio flashcards, promo discounts, testimonials: All passing

---

## 6. Risks, Invariants & Safeguards

1. **Gate C Integrity Invariant:** `ExamAttempt.ExamId` must permanently point to the exact `Exam` revision record used by the candidate. `ExamAttemptQuestion` remains the exact relational source of truth for question membership.
2. **String Identifier Convention:** All primary keys and foreign keys in the existing database schema use `string` (PostgreSQL `text` columns). `Examination.Id`, `Exam.ExaminationId`, etc., must adhere to this convention to preserve compatibility.
3. **Additive Schema Only:** No existing columns will be renamed or dropped. New fields will be added with safe defaults or nullability.
4. **Isolated Verification Only:** Migrations and database tests will strictly target `prepford_gateb_verification`. Zero operations will touch `prepford` or any shared/production database.

---

## 7. Implementation Workstream Plan

Implementation will proceed through the authorized stages:
- **P3.1-A:** Domain Entities & EF Core Model Configuration (`Examination`, `Exam` extensions, `ExamAttempt` snapshot column, indexes)
- **P3.1-B:** Examination Code Allocation System (`ExaminationCodeService`, PostgreSQL sequences `exam_code_rn_seq` / `exam_code_pn_seq`)
- **P3.1-C:** Lifecycle Domain Service (`ExamLifecycleService`, 6 states, 10 validated transitions, separation of duties)
- **P3.1-D:** Authorization & Audit Integration (Policy checks, separation-of-duties service guard, `AuditLog` mapping)
- **P3.1-E:** Attempt Metadata Snapshot Integration (`ExamAttemptsController.StartAttempt` atomic JSONB capture & fallback)
- **P3.1-F:** Concurrency & Publication Integrity (EF Core token, partial unique indexes, atomic supersession)
- **P3.1-G:** EF Core Migration & Local Verification (Generate migration, test on `prepford_gateb_verification`, full regression test run)
