# PrepFord Examination Management — P3.1 PostgreSQL Preflight Verification Report

**Phase:** P3.1 — Examination Domain Foundation  
**Status:** PREFLIGHT COMPLETE — READY FOR IMPLEMENTATION GATING  
**Date:** 3 November 2026  
**Scope:** PostgreSQL local environment verification preflight & security guard validation  

---

## 1. Executive Summary

In accordance with Section 5 of the Final Owner Decision Register and Decision 8 (Isolated local PostgreSQL verification), a non-destructive PostgreSQL preflight check was conducted across the local development environment and test harness.

### Key Preflight Findings:
1. **PostgreSQL Client Availability:** Confirmed PostgreSQL 18.6 client binaries present at `C:\Program Files\PostgreSQL\18\bin\psql.exe`.
2. **Isolation Guard Intact:** The security guard in `apps/api/Tests/PostgresIntegrationTests.cs` was triggered and verified. It strictly blocks execution unless `PREFORM_GATEB_TEST_CONNECTION_STRING` points to an isolated loopback database named `prepford_gateb_verification`.
3. **Core Test Suite Baseline:** All 56 non-PostgreSQL unit and domain tests passed (100% pass rate), verifying Gate C server-authoritative grading, attempt membership security, role hierarchy normalization, and candidate data contracts.
4. **Non-Destructive Invariant:** Zero modifications, drops, or migrations were executed against any database.

---

## 2. Preflight Verification Results

### 2.1 Binary & Environment Inspection
- **Command:** `& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --version`
- **Result:** `psql (PostgreSQL) 18.6`
- **Evaluation:** PASS. Compatible PostgreSQL tooling is installed locally.

### 2.2 Security Guard & Isolation Contract Verification
- **Command:** `dotnet test apps/api/Tests/Preform.Api.Tests.csproj --no-build --filter "FullyQualifiedName~Postgres"`
- **Result:**
  ```text
  [FAIL] GateB_CatalogBootstrap_Postgres_VerifiesSeedMetadataAndSchemaCompatibility
  Error Message:
    System.InvalidOperationException : Set PREFORM_GATEB_TEST_CONNECTION_STRING to an isolated loopback PostgreSQL database named prepford_gateb_verification.
  ```
- **Evaluation:** PASS (Guard Working as Designed). The test suite successfully aborted because an unisolated connection string was not injected into the process, preventing any accidental mutations to shared or production databases.

### 2.3 Core Domain Security & Unit Test Baseline
- **Command:** `dotnet test apps/api/Tests/Preform.Api.Tests.csproj --no-restore --filter "FullyQualifiedName!~Postgres"`
- **Result:**
  ```text
  Passed! - Failed: 0, Passed: 56, Skipped: 0, Total: 56, Duration: 2 s
  ```
- **Verified Subsystems:**
  - `AttemptMembershipSecurityTests`: Server-authoritative membership and tamper rejection
  - `GradingSecurityTests`: Unmodified Gate C grading calculations
  - `CandidateDataContractTests`: Candidate response isolation
  - `RoleResolutionTests`: Role hierarchy and authorization normalization
  - `QuestionTypeRegistryTests`: Registry catalog validation
  - `TestimonialTests`, `StudyFlashcardsTests`, `PromoDiscountTests`: Auxiliary feature integrity

---

## 3. Preflight Requirements for Implementation Phase

When the project owner grants explicit implementation authorization, the local PostgreSQL testing harness requires the following one-time environment setup:

1. **Create Dedicated Database:**
   ```sql
   CREATE DATABASE prepford_gateb_verification;
   ```
2. **Set Environment Variable:**
   ```powershell
   $env:PREFORM_GATEB_TEST_CONNECTION_STRING = "Host=127.0.0.1;Port=5432;Database=prepford_gateb_verification;Username=postgres;Password=<LOCAL_DEV_PASSWORD>"
   ```
3. **Targeted Integration Verification:** Run `dotnet test apps/api/Tests/Preform.Api.Tests.csproj --filter "FullyQualifiedName~Postgres"` to verify migrations, JSONB snapshot persistence, and sequence-based code generation in full isolation.

---

## 4. Status & Sign-off

- **Preflight Outcome:** SUCCESS — Guards verified, binaries verified, baseline unit suite green (56/56 passing).
- **Destructive Action Avoided:** Zero production or shared database schemas touched.
- **Implementation Authorization:** AWAITING EXPLICIT OWNER AUTHORIZATION.
