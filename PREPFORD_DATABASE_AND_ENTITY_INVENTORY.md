# PREPFORD NCLEX — FEATURE EXPANSION PROGRAMME
## DATABASE AND ENTITY INVENTORY

**Deliverable 3 of 7: Database & Entity Inventory**  
**Document File:** `PREPFORD_DATABASE_AND_ENTITY_INVENTORY.md`  
**Repository Working Directory:** `C:\Users\gitau\Documents\PREform`  
**Branch:** `feature/dotnet-backend-migration`  
**Database Engine:** PostgreSQL 16+  
**ORM:** Entity Framework Core 8.0.10 / Npgsql.EntityFrameworkCore.PostgreSQL 8.0.10  
**Context:** `Preform.Api.Data.AppDbContext` (`apps/api/Data/AppDbContext.cs`)  
**Authority:** Product Owner  
**Date:** November 5, 2026  

---

## 1. Executive Summary & Database Governance

PrepFord's relational database layer is managed authoritatively by ASP.NET Core Entity Framework Core 8 targeting PostgreSQL 16+. The system was previously migrated from an obsolete NestJS/Prisma architecture to EF Core on .NET 8.

### Core Database Rules:
1. **Schema Authority:** The `AppDbContext` (`apps/api/Data/AppDbContext.cs`) and EF Core migrations (`apps/api/Migrations/`) represent the sole authority for database schema.
2. **PostgreSQL Relational Exclusivity:** Zero SQLite dependencies exist at runtime or test execution. All tables reside in the default PostgreSQL schema `public`.
3. **Expand-and-Contract Migration Discipline:** All 9 database migrations are strictly additive and backward-compatible. Rolling back application code does not break the schema. No column or table drops may be executed during feature expansion.
4. **Seed Idempotence:** Initial catalog seeding (`CatalogSeeder.cs`) is idempotent and runs during startup for relational databases.

---

## 2. Complete Entity Inventory & Schema Definitions

`AppDbContext` manages **22 database tables** organized into 6 functional domain clusters:

```
Domain Clusters:
├── 1. Programme & Curriculum Taxonomy (6 tables)
│   ├── Programme
│   ├── Courses
│   ├── SubjectDomains
│   ├── Categories
│   ├── Subcategories
│   └── Topics
├── 2. Identity, RBAC & Security (8 tables)
│   ├── Users
│   ├── UserSessions
│   ├── SessionSecurityPolicies
│   ├── UserProfileImages
│   ├── Roles
│   ├── Permissions
│   ├── RolePermissions
│   └── UserRoles
├── 3. Question Bank Core (4 tables)
│   ├── QuestionTypeDefinitions
│   ├── Questions
│   ├── QuestionOptions
│   └── QuestionVersions
├── 4. Assessments & Examinations (6 tables)
│   ├── Examinations
│   ├── Exams
│   ├── ExamQuestions
│   ├── ExamAttempts
│   ├── ExamAttemptQuestions
│   └── AttemptResponses
├── 5. Commerce, Subscriptions & Orders (4 tables)
│   ├── SubscriptionPlans
│   ├── UserSubscriptions
│   ├── Orders
│   └── PaymentTransactions
└── 6. AI Study Studio & Spaced Repetition (3 tables)
    ├── FlashcardDecks
    ├── Flashcards
    └── FlashcardReviews
```

---

### Cluster 1: Programme & Curriculum Taxonomy

#### Table 1: `Programme`
- **Model:** `Preform.Api.Models.Programme` (`apps/api/Models/Programme.cs`)
- **Table Name:** `"Programme"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Columns:**
  - `Id` (`text`, PK, Non-nullable)
  - `Code` (`text`, Enum conversion `RN`, `PN`, `TEST`, `DUP`, Non-nullable, Unique)
  - `DisplayName` (`text`, Non-nullable)
  - `IsActive` (`boolean`, Non-nullable, Indexed)
  - `CreatedAt` (`timestamp with time zone`, Non-nullable)
  - `UpdatedAt` (`timestamp with time zone`, Non-nullable)
- **Indexes:**
  - `IX_Programme_Code` (Unique)
  - `IX_Programme_IsActive`
- **Seeded Data:** `RN` ("NCLEX-RN"), `PN` ("NCLEX-PN").

#### Table 2: `Courses`
- **Model:** `Preform.Api.Models.Course` (`apps/api/Models/LearningStructure.cs`)
- **Table Name:** `"Courses"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `ProgrammeId` $\rightarrow$ `Programme.Id` (Cascade delete)
- **Columns:**
  - `Id` (`text`, PK)
  - `ProgrammeId` (`text`, FK, Non-nullable)
  - `Title` (`character varying(128)`, Non-nullable)
  - `Description` (`character varying(1024)`)
  - `DisplayOrder` (`integer`, Default 0)
  - `IsPublished` (`boolean`, Default true)
  - `CreatedAt` (`timestamp with time zone`)
  - `UpdatedAt` (`timestamp with time zone`)
- **Relationships:** Has many `SubjectDomains`.
- **Status:** *Under-utilized.* Table exists, but no API endpoints or admin UI manage courses.

#### Table 3: `SubjectDomains`
- **Model:** `Preform.Api.Models.SubjectDomain` (`apps/api/Models/LearningStructure.cs`)
- **Table Name:** `"SubjectDomains"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `CourseId` $\rightarrow$ `Courses.Id` (Cascade delete)
- **Columns:**
  - `Id` (`text`, PK)
  - `CourseId` (`text`, FK, Non-nullable)
  - `Title` (`character varying(128)`, e.g., "Safe and Effective Care Environment")
  - `Description` (`character varying(1024)`)
  - `DisplayOrder` (`integer`, Default 0)
  - `IsActive` (`boolean`, Default true)
  - `CreatedAt` (`timestamp with time zone`)
  - `UpdatedAt` (`timestamp with time zone`)
- **Relationships:** Has many `Categories`.
- **Status:** *Under-utilized.* Table exists; needs alignment with NCSBN Client Needs categories.

#### Table 4: `Categories`
- **Model:** `Preform.Api.Models.Category` (`apps/api/Models/LearningStructure.cs`)
- **Table Name:** `"Categories"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `SubjectDomainId` $\rightarrow$ `SubjectDomains.Id` (Cascade delete)
- **Columns:**
  - `Id` (`text`, PK)
  - `SubjectDomainId` (`text`, FK, Non-nullable)
  - `Name` (`character varying(128)`, Non-nullable)
  - `Slug` (`character varying(128)`, Non-nullable)
  - `Description` (`character varying(1024)`)
  - `DisplayOrder` (`integer`)
  - `IsActive` (`boolean`)
  - `CreatedAt`, `UpdatedAt` (`timestamp with time zone`)
- **Relationships:** Has many `Subcategories`.

#### Table 5: `Subcategories`
- **Model:** `Preform.Api.Models.Subcategory` (`apps/api/Models/LearningStructure.cs`)
- **Table Name:** `"Subcategories"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `CategoryId` $\rightarrow$ `Categories.Id` (Cascade delete)
- **Columns:**
  - `Id` (`text`, PK)
  - `CategoryId` (`text`, FK, Non-nullable)
  - `Name` (`character varying(128)`, Non-nullable)
  - `Slug` (`character varying(128)`, Non-nullable)
  - `Description` (`character varying(1024)`)
  - `DisplayOrder` (`integer`)
  - `IsActive` (`boolean`)
  - `CreatedAt`, `UpdatedAt` (`timestamp with time zone`)
- **Relationships:** Has many `Topics`.

#### Table 6: `Topics`
- **Model:** `Preform.Api.Models.Topic` (`apps/api/Models/LearningStructure.cs`)
- **Table Name:** `"Topics"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `SubcategoryId` $\rightarrow$ `Subcategories.Id` (Cascade delete)
- **Columns:**
  - `Id` (`text`, PK)
  - `SubcategoryId` (`text`, FK, Non-nullable)
  - `Title` (`character varying(256)`, Non-nullable)
  - `Summary` (`character varying(1024)`)
  - `Content` (`text`, Clinical curriculum body text)
  - `DisplayOrder` (`integer`)
  - `IsPublished` (`boolean`)
  - `CreatedAt`, `UpdatedAt` (`timestamp with time zone`)
- **Relationships:** Referenced by `Questions.TopicId`.

---

### Cluster 2: Identity, RBAC & Security

#### Table 7: `Users`
- **Model:** `Preform.Api.Models.User` (`apps/api/Models/Identity.cs`)
- **Table Name:** `"Users"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Columns:**
  - `Id` (`text`, PK)
  - `Email` (`character varying(256)`, Non-nullable, Unique)
  - `PasswordHash` (`text`, Non-nullable, PBKDF2 hash)
  - `DisplayName` (`character varying(128)`, Non-nullable)
  - `Pathway` (`character varying(10)`, Default `"rn"`)
  - `TargetExamDate` (`character varying(32)`, Default `"2026-11-30"`)
  - `ActivePlan` (`character varying(128)`, Default `"NCLEX-RN Complete Preparation Plan"`)
  - `EmailNotifications` (`boolean`, Default true)
  - `StudyReminders` (`boolean`, Default true)
  - `IsActive` (`boolean`, Default true, Indexed)
  - `SecurityVersion` (`integer`, Default 1, Incremented on password/privilege change)
  - `HasProfileImage` (`boolean`, Default false)
  - `ProfileImageUpdatedAt` (`timestamp with time zone`, Nullable)
  - `CreatedAt`, `UpdatedAt` (`timestamp with time zone`)
- **Indexes:**
  - `IX_Users_Email` (Unique)
  - `IX_Users_IsActive`
- **Relationships:** Has many `UserSessions`, `UserRoles`, `AuditLogs`, `FlashcardDecks`; has one `UserProfileImage`.

#### Table 8: `UserSessions`
- **Model:** `Preform.Api.Models.UserSession` (`apps/api/Models/Identity.cs`)
- **Table Name:** `"UserSessions"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `UserId` $\rightarrow$ `Users.Id` (Cascade delete)
- **Columns:**
  - `Id` (`text`, PK)
  - `UserId` (`character varying(128)`, Non-nullable, FK)
  - `Email` (`character varying(256)`, Non-nullable)
  - `Role` (`character varying(64)`, Default `"candidate"`)
  - `DisplayName` (`character varying(128)`)
  - `TokenHash` (`character varying(128)`, SHA256 of bearer session token, Unique)
  - `CsrfToken` (`character varying(128)`)
  - `ClientId` (`character varying(64)`, Default `""`)
  - `CreatedAt`, `LastActiveAt` (`timestamp with time zone`)
  - `ExpiresAt`, `IdleExpiresAt`, `AbsoluteExpiresAt` (`timestamp with time zone`)
  - `Revoked` (`boolean`, Default false)
  - `RevokedAt` (`timestamp with time zone`, Nullable)
  - `RevocationReason` (`character varying(64)`, Nullable)
  - `LastIpAddress` (`character varying(64)`, Nullable)
  - `UserAgent` (`character varying(512)`, Nullable)
  - `DeviceLabel` (`character varying(128)`, Nullable)
  - `FingerprintHash` (`character varying(64)`, Nullable)
  - `SecurityVersion` (`integer`, Default 1)
- **Indexes:**
  - `IX_UserSessions_TokenHash` (Unique)
  - `IX_UserSessions_UserId_Revoked`
  - `IX_UserSessions_Email_Revoked`
  - `IX_UserSessions_UserId_Revoked_AbsoluteExpiresAt`
  - `IX_UserSessions_ClientId_Revoked_AbsoluteExpiresAt`
  - `IX_UserSessions_IdleExpiresAt`
  - `IX_UserSessions_AbsoluteExpiresAt`

#### Table 9: `SessionSecurityPolicies`
- **Model:** `Preform.Api.Models.SessionSecurityPolicy` (`apps/api/Models/Identity.cs`)
- **Table Name:** `"SessionSecurityPolicies"`, Schema: `"public"`
- **Primary Key:** `Id` (`character varying(64)`, Default `"global_policy"`)
- **Columns:**
  - `Id` (`character varying(64)`, PK)
  - `MaxConcurrentSessions` (`integer`, Default 2)
  - `MaxSessionsPerClient` (`integer`, Default 1)
  - `IdleTimeoutMinutes` (`integer`, Default 300)
  - `AbsoluteTimeoutMinutes` (`integer`, Default 10080 — 7 days)
  - `EnforceFingerprint` (`boolean`, Default true)
  - `EnforceIpConsistency` (`boolean`, Default false)
  - `AllowIpDrift` (`boolean`, Default true)
  - `RotateOnLogin`, `RotateOnPrivilegeChange`, `RotateOnPasswordChange` (`boolean`, Default true)
  - `PolicyVersion` (`integer`, Default 1)
  - `UpdatedAt` (`timestamp with time zone`)
  - `UpdatedBy` (`character varying(128)`)
  - `IsActive` (`boolean`, Default true)

#### Table 10: `UserProfileImages`
- **Model:** `Preform.Api.Models.UserProfileImage` (`apps/api/Models/Identity.cs`)
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `UserId` $\rightarrow$ `Users.Id` (Cascade delete, One-to-One)
- **Columns:**
  - `Id` (`text`, PK)
  - `UserId` (`character varying(128)`, Non-nullable, Unique FK)
  - `UserEmail` (`character varying(256)`, Non-nullable, Unique)
  - `ImageData` (`bytea`, Non-nullable binary content, max 2MB)
  - `ContentType` (`character varying(64)`, e.g., `"image/png"`, `"image/jpeg"`)
  - `SizeBytes` (`integer`, Non-nullable)
  - `Sha256Hash` (`character varying(64)`, Non-nullable)
  - `CreatedAt`, `UpdatedAt` (`timestamp with time zone`)

#### Table 11: `Roles`
- **Model:** `Preform.Api.Models.Role` (`apps/api/Models/Identity.cs`)
- **Primary Key:** `Id` (`text`, GUID string)
- **Columns:**
  - `Id` (`text`, PK)
  - `Name` (`character varying(64)`, Non-nullable, Unique)
  - `Description` (`character varying(256)`)
  - `IsSystem` (`boolean`, Default false)
  - `CreatedAt` (`timestamp with time zone`)
- **Indexes:** `IX_Roles_Name` (Unique)
- **Seeded Roles:** `superadmin`, `admin`, `content_manager`, `exam_manager`, `reviewer`, `instructor`, `candidate`.

#### Table 12: `Permissions`
- **Model:** `Preform.Api.Models.Permission` (`apps/api/Models/Identity.cs`)
- **Primary Key:** `Id` (`text`, GUID string)
- **Columns:**
  - `Id` (`text`, PK)
  - `Key` (`character varying(64)`, Non-nullable, Unique, e.g. `"questions:write"`, `"exams:publish"`)
  - `Name` (`character varying(128)`, Non-nullable)
  - `Category` (`character varying(64)`)
- **Indexes:** `IX_Permissions_Key` (Unique)
- **Status:** *Dormant.* Table exists, but permissions are unseeded and unqueried.

#### Table 13: `RolePermissions`
- **Model:** `Preform.Api.Models.RolePermission` (`apps/api/Models/Identity.cs`)
- **Primary Key:** Composite (`RoleId`, `PermissionId`)
- **Foreign Keys:**
  - `RoleId` $\rightarrow$ `Roles.Id` (Cascade delete)
  - `PermissionId` $\rightarrow$ `Permissions.Id` (Cascade delete)
- **Status:** *Dormant.*

#### Table 14: `UserRoles`
- **Model:** `Preform.Api.Models.UserRole` (`apps/api/Models/Identity.cs`)
- **Primary Key:** Composite (`UserId`, `RoleId`)
- **Foreign Keys:**
  - `UserId` $\rightarrow$ `Users.Id` (Cascade delete)
  - `RoleId` $\rightarrow$ `Roles.Id` (Cascade delete)
- **Columns:**
  - `UserId` (`text`, PK, FK)
  - `RoleId` (`text`, PK, FK)
  - `AssignedAt` (`timestamp with time zone`)
- **Usage:** Populated during user registration (`"candidate"`) and superadmin bootstrap (`"superadmin"`).

#### Table 15: `AuditLogs`
- **Model:** `Preform.Api.Models.AuditLog` (`apps/api/Models/Identity.cs`)
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `ActorId` $\rightarrow$ `Users.Id` (Nullable, SetNull/Restrict)
- **Columns:**
  - `Id` (`text`, PK)
  - `ActorId` (`text`, Nullable FK)
  - `Action` (`character varying(64)`, Non-nullable)
  - `EntityType` (`character varying(64)`, Non-nullable)
  - `EntityId` (`character varying(128)`, Nullable)
  - `Description` (`character varying(1024)`)
  - `Outcome` (`character varying(32)`, Default `"Success"`)
  - `IpAddress` (`character varying(64)`, Nullable)
  - `Timestamp` (`timestamp with time zone`, Default UtcNow)
- **Indexes:**
  - `IX_AuditLogs_ActorId`
  - `IX_AuditLogs_Action`
  - `IX_AuditLogs_Timestamp`

---

### Cluster 3: Question Bank Core

#### Table 16: `QuestionTypeDefinitions`
- **Model:** `Preform.Api.Models.QuestionTypeDefinition` (`apps/api/Models/Questions.cs`)
- **Primary Key:** `Id` (`text`, GUID string)
- **Columns:**
  - `Id` (`text`, PK)
  - `Key` (`character varying(64)`, Non-nullable, Unique, e.g. `"single-choice"`, `"sata"`, `"case-study"`)
  - `Name` (`character varying(128)`, Non-nullable)
  - `Description` (`character varying(512)`)
  - `Category` (`character varying(64)`, Default `"Traditional"`)
  - `SupportedScoring` (`character varying(64)`, Default `"ExactMatch"`)
  - `CapabilityFlags` (`integer`, Bitmask `QuestionTypeCapability`)
  - `ImplementationStatus` (`character varying(32)`, Default `"Catalogued"`)
  - `IsActive` (`boolean`, Default true)
  - `DisplayOrder` (`integer`, Default 0)
- **Indexes:** `IX_QuestionTypeDefinitions_Key` (Unique)
- **Seeded Records:** 18 canonical question types seeded by `QuestionTypeCatalogueSeeder.cs`.

#### Table 17: `Questions`
- **Model:** `Preform.Api.Models.Question` (`apps/api/Models/Questions.cs`)
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `TopicId` $\rightarrow$ `Topics.Id` (Nullable, SetNull)
  - `CreatedById` $\rightarrow$ `Users.Id` (Nullable, Restrict)
  - `ReviewedById` $\rightarrow$ `Users.Id` (Nullable, Restrict)
- **Columns:**
  - `Id` (`text`, PK)
  - `Pathway` (`character varying(10)`, Non-nullable, `"rn"` or `"pn"`)
  - `TopicId` (`text`, Nullable FK)
  - `QuestionTypeKey` (`character varying(64)`, Non-nullable, Default `"single-choice"`)
  - `Stem` (`text`, Non-nullable clinical vignette question)
  - `Instructions` (`text`, Nullable)
  - `Difficulty` (`integer`, Enum `Easy`=1, `Moderate`=2, `Hard`=3, `Expert`=4)
  - `Status` (`integer`, Enum `Draft`=0, `InReview`=1, `Approved`=2, `Published`=3, `Archived`=4)
  - `Version` (`integer`, Default 1)
  - `ClinicalScenario` (`text`, Case study unfolding narrative)
  - `ExhibitsJson` (`text`, Serialized labs, vitals, provider notes)
  - `OverallRationale` (`text`, Comprehensive clinical rationale)
  - `CreatedById`, `ReviewedById` (`text`, Nullable FKs)
  - `CreatedAt`, `UpdatedAt` (`timestamp with time zone`)
- **Indexes:**
  - `IX_Questions_Pathway`
  - `IX_Questions_QuestionTypeKey`
  - `IX_Questions_Status`
- **Relationships:** Has many `QuestionOptions`, `QuestionVersions`.

#### Table 18: `QuestionOptions`
- **Model:** `Preform.Api.Models.QuestionOption` (`apps/api/Models/Questions.cs`)
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `QuestionId` $\rightarrow$ `Questions.Id` (Cascade delete)
- **Columns:**
  - `Id` (`text`, PK)
  - `QuestionId` (`text`, Non-nullable FK)
  - `OptionKey` (`character varying(32)`, Non-nullable, e.g., `"A"`, `"B"`, `"1"`, `"2"`)
  - `Content` (`text`, Non-nullable option text)
  - `DisplayOrder` (`integer`, Default 0)
  - `IsCorrect` (`boolean`, Default false)
  - `Rationale` (`text`, Clinical explanation for this choice)
  - `DistractorRationale` (`text`, Why this choice is clinically unsafe or a distractor)
- **Indexes:** `IX_QuestionOptions_QuestionId`

#### Table 19: `QuestionVersions`
- **Model:** `Preform.Api.Models.QuestionVersion` (`apps/api/Models/Questions.cs`)
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `QuestionId` $\rightarrow$ `Questions.Id` (Cascade delete)
- **Columns:**
  - `Id` (`text`, PK)
  - `QuestionId` (`text`, Non-nullable FK)
  - `VersionNumber` (`integer`, Default 1)
  - `SnapshotJson` (`text`, Non-nullable JSON snapshot of question state)
  - `CreatedById` (`text`, Nullable)
  - `CreatedAt` (`timestamp with time zone`)
- **Status:** *Under-utilized.* Exists in schema; needs activation during question revisioning.

---

### Cluster 4: Assessments & Examinations

#### Table 20: `Examinations`
- **Model:** `Preform.Api.Models.Examination` (`apps/api/Models/Assessments.cs`)
- **Table Name:** `"Examinations"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `CurrentRevisionId` $\rightarrow$ `Exams.Id` (Nullable, SetNull)
  - `SuccessorExaminationId` $\rightarrow$ `Examinations.Id` (Nullable, Restrict)
- **Columns:**
  - `Id` (`text`, PK)
  - `Pathway` (`character varying(10)`, Non-nullable, `"rn"` or `"pn"`)
  - `Code` (`character varying(16)`, Non-nullable, Unique sequential code, e.g. `"RN-EX-000001"`)
  - `Title` (`character varying(128)`, Non-nullable)
  - `CreatedBy` (`character varying(128)`, Non-nullable)
  - `CurrentRevisionId` (`character varying(128)`, Nullable FK)
  - `SuccessorExaminationId` (`character varying(128)`, Nullable FK)
  - `CreatedAt` (`timestamp with time zone`)
- **Indexes:**
  - `IX_Examinations_Code` (Unique)
  - `IX_Examinations_Pathway_Code` (Unique)
- **Relationships:** Has many `Exams` (`Revisions`).

#### Table 21: `Exams`
- **Model:** `Preform.Api.Models.Exam` (`apps/api/Models/Assessments.cs`)
- **Table Name:** `"Exams"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `ExaminationId` $\rightarrow$ `Examinations.Id` (Nullable, Restrict)
- **Columns:**
  - `Id` (`text`, PK)
  - `ExaminationId` (`character varying(128)`, Nullable FK)
  - `Title` (`character varying(128)`, Non-nullable)
  - `Description` (`character varying(1024)`)
  - `Pathway` (`character varying(10)`, Non-nullable, `"rn"` or `"pn"`)
  - `ExamType` (`integer`, Enum `Practice`=1, `CAT`=2, `MockSimulation`=3, `DiagnosticReadiness`=4)
  - `RevisionNumber` (`integer`, Default 1)
  - `LifecycleState` (`integer`, Enum `Draft`=1, `InReview`=2, `Approved`=3, `Published`=4, `Archived`=5, `Retired`=6)
  - `ConcurrencyToken` (`bigint`, Default 1, Concurrency token)
  - `TimeLimitMinutes` (`integer`, Default 0 for untimed)
  - `PassingScorePercent` (`numeric`, Default 75.0)
  - `IsPublished` (`boolean`, Default false)
  - `CreatedBy`, `SubmittedBy`, `ReviewedBy`, `ApprovedBy`, `PublishedBy`, `ArchivedBy`, `RetiredBy` (`character varying(128)`)
  - `SubmittedAt`, `ReviewedAt`, `ApprovedAt`, `PublishedAt`, `ArchivedAt`, `RetiredAt` (`timestamp with time zone`, Nullable)
  - `CreatedAt`, `UpdatedAt` (`timestamp with time zone`)
- **Indexes:**
  - `IX_Exams_Pathway`
  - `IX_Exams_IsPublished`
  - `IX_Exams_LifecycleState`
  - `IX_Exams_IsPublished_Pathway_UpdatedAt`
  - `IX_Exams_ExaminationId_RevisionNumber` (Unique)
  - `IX_Exams_ExaminationId_SinglePublished` (Unique partial index where `LifecycleState = 4`)
  - `IX_Exams_ExaminationId_ActiveDraft` (Unique partial index where `LifecycleState = 1`)
- **Relationships:** Has many `ExamQuestions`, `ExamAttempts`.

#### Table 22: `ExamQuestions`
- **Model:** `Preform.Api.Models.ExamQuestion` (`apps/api/Models/Assessments.cs`)
- **Table Name:** `"ExamQuestions"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `ExamId` $\rightarrow$ `Exams.Id` (Cascade delete)
  - `QuestionId` $\rightarrow$ `Questions.Id` (Restrict)
- **Columns:**
  - `Id` (`text`, PK)
  - `ExamId` (`text`, Non-nullable FK)
  - `QuestionId` (`text`, Non-nullable FK)
  - `DisplayOrder` (`integer`, Default 0)
- **Indexes:**
  - `IX_ExamQuestions_ExamId_QuestionId` (Unique)

#### Table 23: `ExamAttempts`
- **Model:** `Preform.Api.Models.ExamAttempt` (`apps/api/Models/Assessments.cs`)
- **Table Name:** `"ExamAttempts"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `UserId` $\rightarrow$ `Users.Id` (Cascade delete)
  - `ExamId` $\rightarrow$ `Exams.Id` (Restrict)
- **Columns:**
  - `Id` (`text`, PK)
  - `UserId` (`text`, Non-nullable FK)
  - `ExamId` (`text`, Non-nullable FK)
  - `Status` (`integer`, Enum `InProgress`=1, `Completed`=2, `Abandoned`=3)
  - `ScorePercent` (`numeric`, Default 0.0)
  - `Passed` (`boolean`, Default false)
  - `StartedAt` (`timestamp with time zone`)
  - `CompletedAt` (`timestamp with time zone`, Nullable)
  - `MetadataSnapshot` (`jsonb`, Immutable server snapshot of title, code, settings at attempt initialization)
- **Indexes:**
  - `IX_ExamAttempts_UserId`
  - `IX_ExamAttempts_ExamId`
- **Relationships:** Has many `AttemptResponses`, `ExamAttemptQuestions`.

#### Table 24: `ExamAttemptQuestions`
- **Model:** `Preform.Api.Models.ExamAttemptQuestion` (`apps/api/Models/Assessments.cs`)
- **Table Name:** `"ExamAttemptQuestions"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `ExamAttemptId` $\rightarrow$ `ExamAttempts.Id` (Cascade delete)
  - `QuestionId` $\rightarrow$ `Questions.Id` (Restrict)
- **Columns:**
  - `Id` (`text`, PK)
  - `ExamAttemptId` (`text`, Non-nullable FK)
  - `QuestionId` (`text`, Non-nullable FK)
  - `DisplayOrder` (`integer`, Default 0)
  - `AssignedAt` (`timestamp with time zone`)
- **Indexes:**
  - `IX_ExamAttemptQuestions_ExamAttemptId`
  - `IX_ExamAttemptQuestions_ExamAttemptId_QuestionId` (Unique)

#### Table 25: `AttemptResponses`
- **Model:** `Preform.Api.Models.AttemptResponse` (`apps/api/Models/Assessments.cs`)
- **Table Name:** `"AttemptResponses"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `ExamAttemptId` $\rightarrow$ `ExamAttempts.Id` (Cascade delete)
  - `QuestionId` $\rightarrow$ `Questions.Id` (Restrict)
- **Columns:**
  - `Id` (`text`, PK)
  - `ExamAttemptId` (`text`, Non-nullable FK)
  - `QuestionId` (`text`, Non-nullable FK)
  - `SelectedOptionsJson` (`text`, Serialized JSON array of chosen option keys)
  - `IsCorrect` (`boolean`, Default false)
  - `ScoreAwarded` (`numeric`, Default 0.0)
  - `GradingState` (`integer`, Enum `Graded`=1, `Ungraded`=2)
  - `TimeSpentSeconds` (`integer`, Default 0)
  - `AnsweredAt` (`timestamp with time zone`)
- **Indexes:**
  - `IX_AttemptResponses_ExamAttemptId`

---

### Cluster 5: Commerce, Subscriptions & Orders

#### Table 26: `SubscriptionPlans`
- **Model:** `Preform.Api.Models.SubscriptionPlan` (`apps/api/Models/Subscriptions.cs`)
- **Table Name:** `"SubscriptionPlans"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Columns:**
  - `Id` (`text`, PK)
  - `Slug` (`character varying(128)`, Non-nullable, Unique)
  - `Name` (`character varying(128)`, Non-nullable)
  - `Code` (`character varying(64)`)
  - `Description` (`character varying(1024)`)
  - `Audience` (`character varying(256)`)
  - `Pathway` (`character varying(32)`, Non-nullable, `"RN"`, `"PN"`, `"Both"`)
  - `PlanType` (`character varying(64)`, Default `"pro"`)
  - `PriceCents` (`integer`, Default 5900)
  - `OriginalPriceCents` (`integer`, Nullable)
  - `Currency` (`character varying(10)`, Default `"USD"`)
  - `Interval` (`integer`, Enum `Monthly`=1, `Quarterly`=2, `Annual`=3, `OneTime`=4)
  - `BillingInterval` (`character varying(32)`, Default `"month"`)
  - `DurationLabel` (`character varying(64)`)
  - `FeaturesJson` (`text`, Serialized string array)
  - `Popular` (`boolean`, Default false)
  - `BgColour`, `AccentColour`, `TextColour` (`character varying(32)`, Nullable)
  - `BadgeText` (`character varying(64)`, Nullable)
  - `DisplayOrder` (`integer`, Default 0)
  - `IsActive` (`boolean`, Default true)
  - `EntitlementsJson` (`text`, Default `"[\"rn\"]"`)
  - `CreatedAt`, `UpdatedAt` (`timestamp with time zone`)
- **Indexes:**
  - `IX_SubscriptionPlans_Slug` (Unique)
  - `IX_SubscriptionPlans_Pathway_IsActive`
  - `IX_SubscriptionPlans_DisplayOrder`

#### Table 27: `UserSubscriptions`
- **Model:** `Preform.Api.Models.UserSubscription` (`apps/api/Models/Subscriptions.cs`)
- **Table Name:** `"UserSubscriptions"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `UserId` $\rightarrow$ `Users.Id` (Cascade delete)
  - `PlanId` $\rightarrow$ `SubscriptionPlans.Id` (Restrict)
  - `OrderId` $\rightarrow$ `Orders.Id` (Nullable, SetNull)
- **Columns:**
  - `Id` (`text`, PK)
  - `UserId` (`character varying(128)`, Non-nullable FK)
  - `PlanId` (`character varying(128)`, Non-nullable FK)
  - `OrderId` (`character varying(128)`, Nullable FK)
  - `Pathway` (`character varying(32)`, Default `"rn"`)
  - `Status` (`integer`, Enum `Active`=1, `PastDue`=2, `Cancelled`=3, `Expired`=4)
  - `StartsAt`, `ExpiresAt` (`timestamp with time zone`)
  - `CancelledAt` (`timestamp with time zone`, Nullable)
- **Indexes:**
  - `IX_UserSubscriptions_UserId`
  - `IX_UserSubscriptions_Status`

#### Table 28: `Orders`
- **Model:** `Preform.Api.Models.Order` (`apps/api/Models/Subscriptions.cs`)
- **Table Name:** `"Orders"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `UserId` $\rightarrow$ `Users.Id` (Restrict)
  - `PlanId` $\rightarrow$ `SubscriptionPlans.Id` (Restrict)
- **Columns:**
  - `Id` (`text`, PK)
  - `UserId` (`character varying(128)`, Non-nullable FK)
  - `PlanId` (`character varying(128)`, Non-nullable FK)
  - `AmountCents` (`integer`, Non-nullable)
  - `Currency` (`character varying(10)`, Default `"USD"`)
  - `Status` (`integer`, Enum `Pending`=1, `Completed`=2, `Failed`=3, `Cancelled`=4, `Refunded`=5)
  - `Provider` (`character varying(64)`, Default `"simulated"`)
  - `ProviderSessionId` (`character varying(256)`, Nullable, Indexed)
  - `ProviderPaymentId` (`character varying(256)`, Nullable)
  - `CreatedAt`, `UpdatedAt` (`timestamp with time zone`)
- **Indexes:**
  - `IX_Orders_UserId`
  - `IX_Orders_ProviderSessionId`

#### Table 29: `PaymentTransactions`
- **Model:** `Preform.Api.Models.PaymentTransaction` (`apps/api/Models/Subscriptions.cs`)
- **Table Name:** `"PaymentTransactions"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `OrderId` $\rightarrow$ `Orders.Id` (Nullable, SetNull)
- **Columns:**
  - `Id` (`text`, PK)
  - `OrderId` (`character varying(128)`, Nullable FK)
  - `ProviderEventId` (`character varying(128)`, Non-nullable, Unique)
  - `EventType` (`character varying(64)`, Non-nullable)
  - `AmountCents` (`integer`)
  - `Status` (`character varying(32)`, Default `"processed"`)
  - `PayloadJson` (`text`, Default `"{}"`)
  - `CreatedAt` (`timestamp with time zone`)
- **Indexes:**
  - `IX_PaymentTransactions_ProviderEventId` (Unique)
  - `IX_PaymentTransactions_OrderId`

#### Table 30: `Testimonials`
- **Model:** `Preform.Api.Models.Testimonial` (`apps/api/Models/Testimonials.cs`)
- **Table Name:** `"Testimonials"`, Schema: `"public"`
- **Primary Key:** `Id` (`uuid`)
- **Columns:**
  - `Id` (`uuid`, PK)
  - `UserId` (`character varying(128)`, Nullable)
  - `DisplayName` (`character varying(128)`, Non-nullable)
  - `Pathway` (`character varying(20)`, Default `"RN"`)
  - `Quote` (`character varying(1000)`, Non-nullable)
  - `AvatarUrl` (`character varying(512)`, Nullable)
  - `Status` (`integer`, Enum `Pending`=0, `Approved`=1, `Rejected`=2)
  - `ConsentGranted` (`boolean`, Default false)
  - `OutcomeVerified` (`boolean`, Default false)
  - `CreatedAt` (`timestamp with time zone`)
  - `ModeratedAt` (`timestamp with time zone`, Nullable)
  - `ModeratedBy` (`character varying(128)`, Nullable)

---

### Cluster 6: AI Study Studio & Spaced Repetition

#### Table 31: `FlashcardDecks`
- **Model:** `Preform.Api.Models.FlashcardDeck` (`apps/api/Models/Study.cs`)
- **Table Name:** `"FlashcardDecks"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `UserId` $\rightarrow$ `Users.Id` (Cascade delete)
- **Columns:**
  - `Id` (`text`, PK)
  - `UserId` (`character varying(128)`, Non-nullable FK)
  - `UserEmail` (`character varying(256)`, Non-nullable)
  - `Name` (`character varying(160)`, Non-nullable)
  - `Description` (`character varying(512)`)
  - `Programme` (`character varying(10)`, Default `"rn"`)
  - `SourceType` (`character varying(32)`, Default `"manual"` or `"curated_guide"`)
  - `SourceReference` (`character varying(256)`)
  - `TopicSlug` (`character varying(64)`)
  - `TopicTitle` (`character varying(160)`)
  - `IsArchived` (`boolean`, Default false)
  - `CreatedAt`, `UpdatedAt` (`timestamp with time zone`)
- **Indexes:**
  - `IX_FlashcardDecks_UserId`
  - `IX_FlashcardDecks_UserId_IsArchived`
  - `IX_FlashcardDecks_UserId_Programme`
- **Relationships:** Has many `Flashcards`.

#### Table 32: `Flashcards`
- **Model:** `Preform.Api.Models.Flashcard` (`apps/api/Models/Study.cs`)
- **Table Name:** `"Flashcards"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `DeckId` $\rightarrow$ `FlashcardDecks.Id` (Cascade delete)
- **Columns:**
  - `Id` (`text`, PK)
  - `DeckId` (`character varying(128)`, Non-nullable FK)
  - `UserId` (`character varying(128)`, Non-nullable denormalized owner)
  - `Front` (`character varying(512)`, Non-nullable prompt/question)
  - `Back` (`character varying(1024)`, Non-nullable recall answer)
  - `Explanation` (`character varying(1024)`)
  - `Difficulty` (`character varying(16)`, Default `"medium"`)
  - `Programme` (`character varying(10)`, Default `"rn"`)
  - `Status` (`character varying(32)`, Default `"active"`)
  - `SourceType` (`character varying(64)`, Default `"manual"`)
  - `SourceReference` (`character varying(256)`)
  - `RepetitionCount` (`integer`, Default 0)
  - `EaseFactor` (`double precision`, Default 2.5)
  - `IntervalDays` (`integer`, Default 0)
  - `DueAt` (`timestamp with time zone`, Default UtcNow)
  - `LastReviewedAt` (`timestamp with time zone`, Nullable)
  - `CreatedAt`, `UpdatedAt` (`timestamp with time zone`)
- **Indexes:**
  - `IX_Flashcards_DeckId`
  - `IX_Flashcards_UserId_DueAt`
  - `IX_Flashcards_UserId_Status`
- **Relationships:** Has many `FlashcardReviews`.

#### Table 33: `FlashcardReviews`
- **Model:** `Preform.Api.Models.FlashcardReview` (`apps/api/Models/Study.cs`)
- **Table Name:** `"FlashcardReviews"`, Schema: `"public"`
- **Primary Key:** `Id` (`text`, GUID string)
- **Foreign Keys:**
  - `FlashcardId` $\rightarrow$ `Flashcards.Id` (Cascade delete)
- **Columns:**
  - `Id` (`text`, PK)
  - `FlashcardId` (`character varying(128)`, Non-nullable FK)
  - `UserId` (`character varying(128)`, Non-nullable)
  - `RecallRating` (`integer`, 0=Again, 1=Hard, 2=Good, 3=Easy)
  - `IntervalDays` (`integer`)
  - `EaseFactor` (`double precision`)
  - `RepetitionCount` (`integer`)
  - `ReviewedAt` (`timestamp with time zone`, Default UtcNow)
- **Indexes:**
  - `IX_FlashcardReviews_FlashcardId`
  - `IX_FlashcardReviews_UserId_ReviewedAt`

---

## 3. EF Core Migration History & Preflight Inventory

All 9 migrations are strictly additive, non-destructive, and recorded in `__EFMigrationsHistory`:

| Step | Migration Identifier | Date | Migration Description | Impacted Entities |
|---|---|---|---|---|
| 1 | `20261026120000_CreateProgrammes` | 2026-10-26 | Baseline programme table creation | `Programme` |
| 2 | `20261027150000_AddMasterDomainModels` | 2026-10-27 | Curriculum, identity, assessments, commerce master models | `Courses`, `SubjectDomains`, `Categories`, `Subcategories`, `Topics`, `Users`, `Roles`, `Permissions`, `RolePermissions`, `UserRoles`, `Questions`, `QuestionOptions`, `Examinations`, `Exams`, `ExamQuestions`, `ExamAttempts`, `AttemptResponses`, `SubscriptionPlans`, `UserSubscriptions`, `Orders`, `PaymentTransactions`, `AuditLogs`, `Testimonials` |
| 3 | `20261028090000_AddUserProfileImages` | 2026-10-28 | Binary avatar storage in PostgreSQL | `UserProfileImages` |
| 4 | `20261029100000_HarmonizeBackendSchema` | 2026-10-29 | Schema harmonization with Next.js BFF | `SubscriptionPlans`, `Users` |
| 5 | `20261031100000_AddStudyStudioFlashcards` | 2026-10-31 | AI Study Studio Phase 1 SM-2 tables | `FlashcardDecks`, `Flashcards`, `FlashcardReviews` |
| 6 | `20261102060000_AddQuestionTypeCapabilityAndStatus` | 2026-11-02 | Question type capability bitmasks and status | `QuestionTypeDefinitions` |
| 7 | `20261103054224_AddAttemptQuestionSetAndGradingState` | 2026-11-03 | Candidate attempt membership and Ungraded state | `ExamAttemptQuestions`, `AttemptResponses` |
| 8 | `20261103092621_AddExaminationLifecycleAndSnapshot` | 2026-11-03 | Revision lifecycle, concurrency token, jsonb snapshot | `Examinations`, `Exams`, `ExamAttempts` |
| 9 | `20261104200000_AddSessionSecurityAndDeviceManagement` | 2026-11-04 | Advanced session policies, device tracking, client IDs | `UserSessions`, `SessionSecurityPolicies` |

---

## 4. Under-Utilized Entities & Expansion Opportunities

The audit reveals several well-designed database entities that were created during earlier migration phases but currently lack API exposure or administrative UI. The expansion programme can leverage these existing entities immediately without schema modifications:

1. **`Permissions` & `RolePermissions` Tables:**
   - Pre-existing schema allows granular permission keys (e.g., `questions:create`, `exams:publish`, `users:assign_role`).
   - *Action:* Seed canonical permissions and attach dynamic policy checks to complement static role checks.
2. **`Courses`, `SubjectDomains`, `Categories`, `Subcategories`, `Topics`:**
   - Full 5-tier relational curriculum structure is already modeled in PostgreSQL.
   - *Action:* Expose CRUD controllers and connect static `study-guide-data.ts` and `NCLEX_CLIENT_NEEDS` directly to these relational tables.
3. **`QuestionVersions` Table:**
   - Already modeled with `SnapshotJson` and `VersionNumber`.
   - *Action:* Activate automatic snapshot persistence when questions are edited in the question bank.
4. **`Exam.MetadataSnapshot` (`jsonb`):**
   - Stores frozen examination title, settings, and schema version at attempt initialization time.
   - *Action:* Reused directly by the decoupled assessment runner to ensure attempt immutability even if the parent examination revision changes.
