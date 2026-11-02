# PREPFORD — EXAMINATION MANAGEMENT STUDIO
## P2 Baseline and Revalidation Report (Gate A)

**Prepared:** 2026-11-02  
**Gate:** A — Baseline and Revalidation (inspection only; no source modifications)  
**Status:** Baseline established — ready to proceed to Gate B

---

## 🎯 EXECUTIVE SUMMARY

This report establishes the verified repository baseline for P2 — Examination Domain Foundation. All findings were confirmed by inspecting actual source code, models, migrations, controllers, services, tests, and frontend contracts. No implementation has been performed.

**Critical discrepancy from Phase 1.1 audit:** The audit claimed question types are NOT seeded in the backend. In fact, **Migration `0002_AddMasterDomainModels` seeds 18 QuestionTypeDefinitions** (qt-1 through qt-18) directly in the `Up()` method. However:
- There is **no `QuestionTypesController`** to expose them via API.
- `CatalogSeeder` does **not** seed question types (only programmes, roles, subscription plans).
- No backend validation, grading, or response-contract support exists for any type.

The examination domain is **partially built**: `Exam`, `ExamAttempt`, `AttemptResponse`, `ExamQuestion` models and `ExamAttemptsController` exist with learner-facing attempt flow, but there is **no exam management API**, **no question management API**, and **no server-authoritative grading**.

---

## 🏗️ CONFIRMED ARCHITECTURE

### Technology Stack (verified)
| Component | Technology | Location |
|---|---|---|
| Backend framework | ASP.NET Core 8 Web API | `apps/api/Program.cs` |
| ORM | Entity Framework Core + Npgsql PostgreSQL | `apps/api/Data/AppDbContext.cs` |
| Authentication | `PrepfordAuth` (Bearer session + Gateway HMAC) | `apps/api/Services/PrepfordAuthHandler.cs` |
| Session service | `ISessionService` / `SessionService` | `apps/api/Services/SessionService.cs` |
| Role resolution | `RoleHierarchy` (static) | `apps/api/Services/RoleHierarchy.cs` |
| Authorization policies | 4 policies registered in `Program.cs` | `apps/api/Program.cs:41-58` |
| Frontend | Next.js App Router + React + TypeScript | `apps/web/` |
| API client | `ApiClient` with gateway HMAC signing | `apps/web/src/lib/api-client.ts` |
| Tests | xUnit (backend), Vitest + Playwright (frontend) | `apps/api/Tests/`, `apps/web/tests/`, `apps/web/e2e/` |

### Default schema
`public` (configured in `AppDbContext.OnModelCreating`, line 59).

### Migrations (5 total, all additive)
| Migration | ID | Key Changes |
|---|---|---|
| `0001_CreateProgrammes` | `20261026120000` | `Programme` table, seeds RN/PN |
| `0002_AddMasterDomainModels` | `20261027150000` | 21 tables incl. `Exams`, `ExamQuestions`, `ExamAttempts`, `AttemptResponses`, `Questions`, `QuestionOptions`, `QuestionVersions`, `QuestionTypeDefinitions`; seeds 18 question types + 7 roles |
| `0003_AddUserProfileImages` | `20261028090000` | `UserProfileImages` table + `Users` columns |
| `0004_HarmonizeBackendSchema` | `20261029100000` | `UserSessions` table, `Users` columns, subscription/order/payment tables |
| `0005_AddStudyStudioFlashcards` | `20261031100000` | Flashcard decks/cards/reviews tables |

---

## 📋 CONFIRMED ENTITY DEFINITIONS

### Examination entities (`apps/api/Models/Assessments.cs`)

**`Exam`** (table `public."Exams"`, line 22)
| Property | Type | Notes |
|---|---|---|
| `Id` | string (PK) | `Guid.NewGuid().ToString()` |
| `Title` | string (required, max 128) | |
| `Description` | string (max 1024) | |
| `Pathway` | string (required, max 10, default "rn") | "rn" or "pn" |
| `ExamType` | enum `ExamType` | Practice/CAT/MockSimulation/DiagnosticReadiness |
| `TimeLimitMinutes` | int | 0 = untimed |
| `PassingScorePercent` | decimal | default 75.0 |
| `IsPublished` | bool | default false |
| `CreatedAt`, `UpdatedAt` | DateTime | |

**`ExamQuestion`** (table `public."ExamQuestions"`, line 54)
| Property | Type | Notes |
|---|---|---|
| `Id` | string (PK) | |
| `ExamId` | string (required, FK → Exams) | cascade delete on Exam |
| `QuestionId` | string (required, FK → Questions) | restrict delete on Question |
| `DisplayOrder` | int | default 0 |
| Unique index | `(ExamId, QuestionId)` | |

**`ExamAttempt`** (table `public."ExamAttempts"`, line 71)
| Property | Type | Notes |
|---|---|---|
| `Id` | string (PK) | |
| `UserId` | string (required, FK → Users) | cascade delete |
| `ExamId` | string (required, FK → Exams) | restrict delete |
| `Status` | enum `AttemptStatus` | InProgress/Completed/Abandoned |
| `ScorePercent` | decimal | default 0 |
| `Passed` | bool | default false |
| `StartedAt`, `CompletedAt` | DateTime / nullable | |

**`AttemptResponse`** (table `public."AttemptResponses"`, line 97)
| Property | Type | Notes |
|---|---|---|
| `Id` | string (PK) | |
| `ExamAttemptId` | string (required, FK → ExamAttempts) | cascade delete |
| `QuestionId` | string (required, FK → Questions) | restrict delete |
| `SelectedOptionsJson` | string | default "[]", serialized `List<int>` indices |
| `IsCorrect` | bool | default false (client-supplied, NOT trusted) |
| `ScoreAwarded` | decimal | default 0 (client-supplied, NOT trusted) |
| `TimeSpentSeconds` | int | default 0 |
| `AnsweredAt` | DateTime | |

### Question entities (`apps/api/Models/Questions.cs`)

**`QuestionTypeDefinition`** (table `public."QuestionTypeDefinitions"`, line 24)
| Property | Type | Notes |
|---|---|---|
| `Id` | string (PK) | |
| `Key` | string (max 64, unique) | e.g. "single-choice", "sata" |
| `Name` | string (max 128) | |
| `Description` | string (max 512) | |
| `Category` | string (max 64) | "Traditional", "NGN", "Clinical" |
| `SupportedScoring` | string (max 64) | "ExactMatch", "PartialCredit", "ManualReview" |
| `IsActive` | bool | default true |
| `DisplayOrder` | int | default 0 |
| Unique index | `Key` | |

**`Question`** (table `public."Questions"`, line 51)
| Property | Type | Notes |
|---|---|---|
| `Id` | string (PK) | |
| `Pathway` | string (max 10, default "rn") | |
| `TopicId` | string (nullable, FK → Topics) | set null on delete |
| `QuestionTypeKey` | string (max 64, required, default "single-choice") | FK-like to QuestionTypeDefinitions.Key (no enforced FK) |
| `Stem` | string | |
| `Instructions` | string (nullable) | |
| `Difficulty` | enum `QuestionDifficulty` | Easy/Moderate/Hard/Expert |
| `Status` | enum `QuestionStatus` | Draft/InReview/Approved/Published/Archived |
| `Version` | int | default 1 |
| `ClinicalScenario`, `ExhibitsJson`, `OverallRationale` | string (nullable) | |
| `CreatedById`, `ReviewedById` | string (nullable, FK → Users) | restrict delete |
| `CreatedAt`, `UpdatedAt` | DateTime | |

**`QuestionOption`** (table `public."QuestionOptions"`, line 98)
| Property | Type | Notes |
|---|---|---|
| `Id` | string (PK) | |
| `QuestionId` | string (required, FK → Questions) | cascade delete |
| `OptionKey` | string (max 32) | e.g. "A", "B", "1", "2" |
| `Content` | string | |
| `DisplayOrder` | int | default 0 |
| `IsCorrect` | bool | default false |
| `Rationale`, `DistractorRationale` | string (nullable) | |

**`QuestionVersion`** (table `public."QuestionVersions"`, line 124)
| Property | Type | Notes |
|---|---|---|
| `Id` | string (PK) | |
| `QuestionId` | string (required, FK → Questions) | cascade delete |
| `VersionNumber` | int | default 1 |
| `SnapshotJson` | string | |
| `CreatedById` | string (nullable, FK → Users) | |
| `CreatedAt` | DateTime | |

### RBAC / Identity entities (`apps/api/Models/Identity.cs`)
- **`User`** (table `Users`) — Id, Email (unique), PasswordHash, DisplayName, Pathway, IsActive, etc.
- **`Role`** (table `Roles`) — Id, Name (unique), Description, IsSystem
- **`Permission`** (table `Permissions`) — Id, Key (unique), Name, Category
- **`RolePermission`** (table `RolePermissions`) — composite PK (RoleId, PermissionId)
- **`UserRole`** (table `UserRoles`) — composite PK (UserId, RoleId)
- **`UserSession`** (table `UserSessions`) — Id, UserId, Email, Role, TokenHash (unique), CsrfToken, ExpiresAt, Revoked
- **`AuditLog`** (table `AuditLogs`) — Id, ActorId, Action, EntityType, EntityId, Description, Outcome, IpAddress, Timestamp

---

## 🔑 CONFIRMED QUESTION-TYPE CATALOGUE

The 18 keys are defined in **two places**:

### 1. Backend migration seed (`apps/api/Migrations/0002_AddMasterDomainModels/20261027150000_AddMasterDomainModels.cs`, lines 456-482)
Seeds 18 rows in `QuestionTypeDefinitions` with keys: `single-choice`, `multiple-choice`, `sata`, `checkbox`, `image-based`, `multiple-image`, `drag-drop`, `ordering`, `case-study`, `essay`, `matching`, `fill-blank`, `matrix`, `numeric`, `true-false`, `tabular`, `short-answer`, `dynamic-lab`.

### 2. Frontend catalogue (`apps/web/src/app/admin/question-types/page.tsx`, lines 37-218)
Defines the same 18 keys with identical names, categories, and scoring strategies. Display names match the migration seed exactly.

**Verification:** The frontend keys and migration seed keys **match exactly** — 18 keys, same order, same categories, same scoring strategies.

**Gap:** No backend controller exposes `QuestionTypeDefinitions`. No `CatalogSeeder` seeding (only migration). No backend validation/grading per type.

---

## 🔐 CONFIRMED AUTHENTICATION AND AUTHORIZATION

### Authentication (`PrepfordAuthHandler`, `apps/api/Services/PrepfordAuthHandler.cs`)
Two paths:
1. **Bearer session token:** `Authorization: Bearer <token>` → `SessionService.ValidateTokenAsync` → claims: `NameIdentifier`, `Email`, `Role`, `Name`, `sessionId`, `csrfToken`
2. **Gateway HMAC:** Headers `X-Gateway-Signature`, `X-Authenticated-User-Id`, `X-Authenticated-User-Email`, `X-Authenticated-User-Role`, `X-Gateway-Timestamp`, `X-Gateway-Nonce`, `X-Gateway-Content-SHA256` → HMACSHA256 verification + replay protection

### Role hierarchy (`RoleHierarchy.cs`)
| Canonical Key | Priority | Is Admin |
|---|---|---|
| `superadmin` | 1 | Yes |
| `admin` | 2 | Yes |
| `administrator` | 2 | Yes (normalizes to `admin`) |
| `exam_manager` | 3 | No |
| `content_manager` | 4 | No |
| `reviewer` | 5 | No |
| `instructor` | 6 | No |
| `candidate` | 7 | No (default) |

### Authorization policies (`Program.cs:41-58`)
| Policy | Allowed Roles | Currently Guards |
|---|---|---|
| `RequireAdmin` | admin, superadmin, administrator | `AdminSubscriptionsController` |
| `RequireSuperAdmin` | superadmin | Nothing |
| `RequireContentManager` | content_manager, admin, superadmin, administrator | `ProgrammesController.CreateProgramme` |
| `RequireExamManager` | exam_manager, superadmin | **Nothing (defined but unused)** |

### Frontend RBAC
- `apps/web/src/lib/session.ts`: `ALLOWED_ADMIN_ROLES` = {admin, superadmin, administrator, manager, content_manager} — includes **"manager"** which does NOT exist in backend `RoleHierarchy`.
- `apps/web/src/lib/admin/authz.ts`: `ADMIN_SHELL_ROLES` includes "manager" (non-existent backend role); `SUBSCRIPTION_ADMIN_ROLES` includes "manager".

### Discrepancy: `"manager"` role
The frontend treats `"manager"` as an admin-capable role, but `RoleHierarchy` does not define `"manager"`. A user with role `"manager"` would pass frontend checks but fail all backend policies.

---

## 🔌 CONFIRMED EXAMINATION API

Only one examination-related controller exists: `ExamAttemptsController` (`apps/api/Controllers/ExamAttemptsController.cs`), route `api/v1/attempts`, `[Authorize]` on class.

| Method | Route | Action | Auth | Notes |
|---|---|---|---|---|
| GET | `/api/v1/attempts` | `GetAttempts` | `[Authorize]` + ownership | Candidate sees own; admin roles see any |
| GET | `/api/v1/attempts/{id}` | `GetAttemptById` | `[Authorize]` + ownership | |
| POST | `/api/v1/attempts` | `StartAttempt` | `[Authorize]` | Creates `InProgress` attempt; falls back to default CAT exam |
| POST | `/api/v1/attempts/{id}/responses` | `SubmitResponse` | `[Authorize]` + ownership | Trusts client `IsCorrect`/`ScoreAwarded` |
| POST | `/api/v1/attempts/{id}/submit` | `SubmitAndCompleteAttempt` | `[Authorize]` + ownership | Computes `correct/total * 100` server-side at completion |
| POST | `/api/v1/attempts/sync` | `SyncAssessmentAttempt` | `[Authorize]` + ownership | Syncs client-completed attempt; creates question stubs |

**No endpoints exist for:** exam CRUD, question management, question-type management, publishing, archiving, deletion, duplication, versioning, results review, or grading.

**Security concern:** `SubmitResponse` trusts client-submitted `IsCorrect` and `ScoreAwarded`. `SubmitAndCompleteAttempt` recomputes score from responses but trusts `IsCorrect` flags on those responses.

---

## 🧪 BASELINE TEST RESULTS

Backend test suite executed: **`dotnet test apps/api/Tests/Preform.Api.Tests.csproj`**

| Metric | Value |
|---|---|
| Command | `dotnet test apps/api/Tests/Preform.Api.Tests.csproj --no-restore` |
| Environment | .NET 8.0.403, in-memory databases (no PostgreSQL required) |
| Total tests | 133 |
| Passed | 133 |
| Failed | 0 |
| Skipped | 0 |
| Duration | 14 s |

**All 133 tests pass.** This includes:
- `ExamAttemptsPersistenceTests` (3 tests) — attempt start, sync, cross-candidate 403
- `RoleResolutionTests` (8 test methods) — role resolution, policy evaluation
- `GatewayHmacAndReplaySecurityTests` (5 tests) — HMAC signing, replay, tampering
- `AuthoritativeSessionManagementTests` (1 test) — session revocation
- Programme, profile image, subscription, health tests

**PostgreSQL integration tests** (`PostgresIntegrationTests`) require a live PostgreSQL instance at `Host=localhost;Port=5432;Database=prepford;Username=postgres;Password=postgres` and were **not executed** (no database available in this environment).

**Frontend tests:** Not executed (would require `npm install` and test runner in `apps/web/`). No examination-management tests exist in frontend test suites.

---

## ⚠️ DIFFERENCES BETWEEN PHASE 1.1 AUDIT AND CURRENT SOURCE

| Audit Claim | Actual Source | Discrepancy |
|---|---|---|
| Question types NOT seeded | Migration `0002` seeds 18 `QuestionTypeDefinitions` rows | **Incorrect** — types are seeded by migration, not CatalogSeeder |
| `ExamTemplatesController` referenced | Does not exist | Controller reference was erroneous |
| `ExamResultsController`, `ExamSessionsController` referenced | Do not exist | Controller references were erroneous |
| `ExaminationService`, `QuestionBankService`, `GradingService` referenced | Do not exist | Service references were erroneous |
| RBAC described as "comprehensive" | 4 policies; `RequireExamManager` guards nothing | Overstated |
| `ExamAttemptsController` uses `[Authorize]` policies | Uses ad-hoc `AdminRoles` hashset (`admin`, `superadmin`, `administrator`, `exam_manager`) | Inconsistent with policy-based auth elsewhere |
| Frontend `authz.ts` / `session.ts` role sets | Include `"manager"` (non-existent backend role) | Frontend/backend mismatch |

---

## ✅ GATE A EXIT CRITERIA

- [x] Repository findings documented
- [x] Existing test baseline recorded (133 passed, 0 failed)
- [x] Architecture discrepancies identified (question-type seeding, missing controllers/services, RBAC gaps, `"manager"` role mismatch)
- [x] Confirmed implementation plan: proceed to Gate B (question-type foundation)

**Decision:** Proceed to Gate B — Question-Type Foundation. No material contradictions block implementation.

---

## 📁 FILES EXAMINED (BASELINE EVIDENCE)

All files listed in the subagent exploration report plus the following directly read:
- `apps/api/Models/Programme.cs`
- `apps/api/Controllers/AuthController.cs`
- `apps/api/Controllers/AdminSubscriptionsController.cs`
- `apps/api/Migrations/0002_AddMasterDomainModels/20261027150000_AddMasterDomainModels.cs` (lines 456-482 — question-type seed data)
- `apps/web/src/app/admin/layout.tsx`
- `apps/web/src/app/admin/page.tsx`
- `apps/web/src/app/admin/page-client.tsx`
- `apps/web/src/lib/session.ts`
- `apps/web/src/lib/auth-context.tsx`
- `apps/web/src/lib/admin/authz.ts`
- `apps/web/src/lib/admin/navigation.tsx`

**No files were modified.** Gate A is inspection-only.