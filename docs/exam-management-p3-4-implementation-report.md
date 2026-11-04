# PREPFORD — P3.4 IMPLEMENTATION REPORT
## Examination Duplication & Revision Lineage

**Phase:** P3.4 — Examination Duplication & Revision Lineage  
**Repository:** `PREform`  
**Branch:** `feature/dotnet-backend-migration`  
**Starting Baseline:** `dc715ad` (P3.3 approved at `d09ae47`)  
**Implementation HEAD:** `73a89f9`  
**Architecture:** Next.js 16.4.3 App Router + ASP.NET Core 8 + EF Core 8 + PostgreSQL  
**Backend Source of Truth:** PostgreSQL (`prepford_gateb_verification` / production PostgreSQL)  
**Status:** COMPLETE — READY FOR PRODUCT OWNER REVIEW  

---

## 1. Executive Summary

Phase P3.4 delivers secure, transactional, and auditable **Examination Duplication** and **New Revision Lineage** workflows across the PrepFord full-stack platform.

The core architectural accomplishment of this phase is establishing and enforcing the strict boundary between **Examination Family Identity** (the permanent examination identity, pathway, and allocated code) and **Revision Lineage** (the authored versions, lifecycle progressions, question memberships, and attempts):

1. **Operation A — Duplicate as a New Examination Family (`POST /api/v1/examinations/{id}/duplicate`):**
   - Allocates an authoritative permanent examination code from the PostgreSQL sequence generator (`RN-EX-XXXXXX` via `exam_code_rn_seq` or `PN-EX-XXXXXX` via `exam_code_pn_seq`).
   - Creates a new `Examination` family record with a fresh GUID identifier and initializes Revision 1 in `Draft` lifecycle state.
   - Deep-copies eligible question memberships (`Status == Approved || Published` and pathway match) and exactly preserves their `DisplayOrder`.
   - Strictly isolates candidate history: zero `ExamAttempt` records are copied, preserving the integrity of assessment data.
   - Preserves source immutability: the source examination family, revisions, questions, and attempt records remain completely untouched.

2. **Operation B — Create New Revision Within Existing Family (`POST /api/v1/examinations/{id}/revisions`):**
   - Retains the persistent family identity (`ExaminationId`) and permanent examination code.
   - Allocates the next monotonically incremented revision number (`maxRevisionNumber + 1`).
   - Enforces the database-level single active draft invariant (`IX_Exams_ExaminationId_ActiveDraft`) using PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) to prevent race conditions.
   - Copies eligible question memberships from the chosen source revision with `DisplayOrder` intact.
   - Does not copy candidate attempts; attempts remain tied to their exact historical revision snapshots.

All five verification gates pass with zero defects:
- **274/274** non-PostgreSQL backend unit and regression tests passing (+19 new unit tests).
- **21/21** PostgreSQL integration tests passing (+2 new comprehensive integration tests against real PostgreSQL).
- **393/393** frontend Vitest tests passing across 47 test suites (+5 new client UI tests).
- **0** TypeScript errors (`tsc --noEmit`).
- **94/94** Next.js App Router routes compiled and statically generated in production build.

---

## 2. Baseline Verification & Git State

Preflight checks confirmed the clean starting state following Product Owner acceptance of Phase P3.3:
- **Starting Git Commit:** `d09ae47` (P3.3 Conditional Acceptance Remediation Report).
- **Current HEAD:** `73a89f9`
- **Branch:** `feature/dotnet-backend-migration`
- **Working Tree:** Clean (zero untracked or uncommitted working files).
- **No Discarded Work:** No rebasing, amend, or history rewriting was performed.

---

## 3. Examination Domain Model: Family Identity vs Revision Lineage

The PrepFord examination domain model separates permanent examination identity from revision history:

```
+-----------------------------------------------------------------------+
|                         EXAMINATION FAMILY                            |
|  - Id: "fam_rn_001" (Permanent GUID)                                  |
|  - Code: "RN-EX-000042" (Permanent Sequence Allocated)                |
|  - Pathway: "rn" (NCLEX-RN)                                           |
|  - Title: "Comprehensive Readiness Exam"                              |
|  - CurrentRevisionId: "rev_002" (Active Published Pointer)             |
+-----------------------------------------------------------------------+
          |
          | 1 : N (Monotonic Revisions)
          v
+-----------------------------------------------------------------------+
|                         EXAMINATION REVISION                          |
|  - Id: "rev_001" (Revision 1 - Published / Archived)                  |
|    * Question Memberships: [ Q1 (pos 1), Q2 (pos 2), Q3 (pos 3) ]     |
|    * Candidate Attempts: [ Attempt A (82%), Attempt B (74%) ]         |
|                                                                       |
|  - Id: "rev_002" (Revision 2 - Published)                             |
|    * Question Memberships: [ Q1 (pos 1), Q4 (pos 2), Q3 (pos 3) ]     |
|    * Candidate Attempts: [ Attempt C (88%) ]                          |
|                                                                       |
|  - Id: "rev_003" (Revision 3 - Draft)  <-- Only ONE active draft      |
|    * Question Memberships: [ Q1 (pos 1), Q4 (pos 2), Q5 (pos 3) ]     |
|    * Candidate Attempts: [ ZERO ATTEMPTS ]                            |
+-----------------------------------------------------------------------+
```

### Key Domain Principles Enforced
1. **Permanent Family Identity:** An examination family possesses a persistent identity, pathway, and permanent code. Multiple revisions represent chronological stages in authoring, review, and accreditation over time.
2. **Immutability of Prior Revisions:** Once a revision is published or archived, its question memberships, pass scores, time limits, and associated candidate attempts are immutable.
3. **Single Active Draft Invariant:** A family may have at most **one** revision in `Draft` lifecycle state at any time.

---

## 4. Duplication Architecture & Design Decisions

### 4.1 Operation A: Duplicate as New Examination Family
- **Endpoint:** `POST /api/v1/examinations/{id}/duplicate`
- **Controller Action:** `ExaminationsController.DuplicateExamination`
- **Input Contract (`DuplicateExaminationRequest`):**
  - `Title` (required, max 128 characters)
  - `SourceRevisionId` (optional; defaults to Published revision, or latest eligible revision)
  - `Description`, `TimeLimitMinutes`, `PassingScorePercent` (optional overrides; defaults to source values)
- **Output Contract (`DuplicateExaminationResponseDto`):**
  - `ExaminationId` (new family GUID)
  - `ExaminationCode` (new permanent sequence code)
  - `RevisionId` (new initial revision GUID)
  - `RevisionNumber = 1`
  - `LifecycleState = "Draft"`
  - `QuestionCount`
  - `Examination` (complete family DTO)
- **Transactional Boundary:** Executed inside an explicit EF Core database transaction with PostgreSQL isolation. If code allocation, question copying, or audit logging fails, the transaction rolls back cleanly.

### 4.2 Operation B: Create New Revision Within Existing Family
- **Endpoint:** `POST /api/v1/examinations/{id}/revisions`
- **Controller Action:** `ExaminationsController.CreateRevision`
- **Enhanced Input Contract (`CreateRevisionRequest`):**
  - `Title`, `Description`, `ExamType`, `TimeLimitMinutes`, `PassingScorePercent`
  - `SourceRevisionId` (optional; when provided, serves as the template for question memberships)
  - `CopyQuestions` (boolean, default `true` when source revision is specified)
- **Output Contract (`CreateRevisionResponseDto`):**
  - `Revision` (new revision DTO with `RevisionNumber = maxRevision + 1`, `LifecycleState = "Draft"`)

---

## 5. Sequence Code Allocation & Concurrency Guarantees

Permanent examination codes are allocated via PostgreSQL database sequences:
- `RN-EX-XXXXXX` generated by `SELECT nextval('exam_code_rn_seq')`
- `PN-EX-XXXXXX` generated by `SELECT nextval('exam_code_pn_seq')`

### Concurrency Protection & Row-Level Locking
To prevent race conditions during new revision creation (such as two concurrent requests attempting to create Draft revisions simultaneously or colliding on revision numbers), `ExamLifecycleService` employs row-level pessimistic locking on the examination family row:

```csharp
// Acquire row-level lock on the Examination family row in PostgreSQL
await _context.Examinations
    .FromSqlRaw("SELECT * FROM public.\"Examinations\" WHERE \"Id\" = {0} FOR UPDATE", examinationId)
    .FirstOrDefaultAsync(ct);
```

This guarantees:
1. Concurrent revision creation requests are serialized at the database engine level.
2. The active draft check (`revisions.Any(r => r.LifecycleState == ExamLifecycleState.Draft)`) is evaluated with guaranteed isolation.
3. Next revision number calculation (`maxRevisionNumber + 1`) is strictly monotonic with zero collisions.

---

## 6. Question Membership Duplication & DisplayOrder Preservation

When copying questions from a source revision to a new revision (or a new family's Revision 1):
1. **Source Membership Loading:** `ExamQuestions` belonging to the source revision are loaded with `AsNoTracking()` ordered by `DisplayOrder ASC`.
2. **Eligibility Filtering:**
   - Question entities are joined and checked to ensure their current status is eligible (`QuestionStatus.Approved` or `QuestionStatus.Published`).
   - Inactive or retired questions are omitted to prevent re-introducing decommissioned content into new drafts.
   - Pathway consistency is verified (`question.Pathway.Equals(family.Pathway, StringComparison.OrdinalIgnoreCase)`).
3. **DisplayOrder Preservation:**
   - The original `DisplayOrder` sequence (1, 2, 3...) is copied exactly into the newly generated `ExamQuestion` records.
   - New GUID identifiers are generated for each `ExamQuestion` record (`Guid.NewGuid().ToString()`).

---

## 7. Attempt Snapshots & Candidate History Isolation

Candidate safety and psychometric validity require strict separation of candidate attempt history from duplication:
1. **Zero Copied Attempts:** Under both Operation A (Duplicate as new family) and Operation B (Create new revision), **zero** `ExamAttempt` records are copied or created.
2. **Attempt-to-Revision Immutability:** Existing attempts are foreign-keyed to their specific `ExamId` (revision ID). Completed candidate attempts remain linked to the exact revision and questions taken.
3. **Verified in Tests:** Both unit tests (`ExaminationDuplicationTests.DuplicateExamination_DoesNotCopyAttempts_AndSourceAttemptsRemainIntact`) and PostgreSQL integration tests (`Postgres_ExaminationDuplication_CreatesNewFamilyWithAllocatedSequenceCodeAndCopiedMemberships`) assert that `clonedAttempts` is empty and source attempts remain untouched.

---

## 8. Revision Lineage & Single Active Draft Invariant

The database enforces at most one active draft per family via EF Core configuration and PostgreSQL unique partial index:

```csharp
// AppDbContext.cs
modelBuilder.Entity<Exam>()
    .HasIndex(e => new { e.ExaminationId })
    .HasFilter("\"LifecycleState\" = 1") // 1 = ExamLifecycleState.Draft
    .HasDatabaseName("IX_Exams_ExaminationId_ActiveDraft")
    .IsUnique();
```

If a client attempts to create a new revision while a draft already exists:
1. The domain service intercepts the violation:
   ```csharp
   if (existingRevisions.Any(r => r.LifecycleState == ExamLifecycleState.Draft))
   {
       throw new InvalidOperationException("An active draft revision already exists for this examination family.");
   }
   ```
2. In the unlikely event of concurrent race conditions, the PostgreSQL partial index `IX_Exams_ExaminationId_ActiveDraft` rejects the insert with a unique constraint violation.
3. The Admin UI Studio proactively disables the "Create New Revision" button when `hasActiveDraft` is detected, displaying clear guidance: *"An active draft already exists for this family."*

---

## 9. Source Revision Eligibility & Lifecycle State Machine Validation

Source revisions must meet rigorous accreditation criteria before serving as templates:

| Lifecycle State | Eligible as Source? | Rational / Policy |
| :--- | :---: | :--- |
| **Published** | **YES** | Active, psychometrically verified, approved for candidate assessment. |
| **Approved** | **YES** | Formally accredited by SuperAdmin/Admin; ready for release or template branching. |
| **Archived** | **YES** | Previously published and certified historical baseline. |
| **Draft** | **NO** | Incomplete, unreviewed, unapproved authoring state; cannot be branched or cloned. |
| **InReview** | **NO** | Currently under formal peer review; modifications/branching prohibited. |
| **Retired** | **NO** | Formally decommissioned due to obsolescence, error, or regulatory withdrawal. |

If an ineligible revision is supplied as `SourceRevisionId`, the service throws:
`InvalidOperationException($"Source revision '{sourceRevisionId}' has status '{sourceRev.LifecycleState}', which is not eligible for duplication. Eligible states: Published, Approved, Archived.")`

---

## 10. Backend Implementation Details

### 10.1 DTO Definitions (`apps/api/DTOs/ExaminationDtos.cs`)
```csharp
public class DuplicateExaminationRequest
{
    [Required]
    [MaxLength(128)]
    public string Title { get; set; } = string.Empty;

    public string? SourceRevisionId { get; set; }

    [MaxLength(1024)]
    public string? Description { get; set; }

    [Range(0, 720)]
    public int? TimeLimitMinutes { get; set; }

    [Range(0, 100)]
    public decimal? PassingScorePercent { get; set; }
}

public class DuplicateExaminationResponseDto
{
    public string ExaminationId { get; set; } = string.Empty;
    public string ExaminationCode { get; set; } = string.Empty;
    public string RevisionId { get; set; } = string.Empty;
    public int RevisionNumber { get; set; } = 1;
    public string LifecycleState { get; set; } = "Draft";
    public int QuestionCount { get; set; }
    public ExaminationDto Examination { get; set; } = null!;
}
```

### 10.2 Service Interface (`apps/api/Services/IExamLifecycleService.cs`)
```csharp
Task<DuplicateExaminationResponseDto> DuplicateExaminationAsync(
    string examinationId,
    DuplicateExaminationRequest request,
    ClaimsPrincipal user,
    CancellationToken ct = default);
```

### 10.3 Controller Endpoint (`apps/api/Controllers/ExaminationsController.cs`)
```csharp
[HttpPost("{id}/duplicate")]
[Authorize(Roles = "Admin,SuperAdmin,ExamManager")]
[ProducesResponseType(typeof(DuplicateExaminationResponseDto), StatusCodes.Status201Created)]
[ProducesResponseType(StatusCodes.Status400BadRequest)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
public async Task<IActionResult> DuplicateExamination(
    string id,
    [FromBody] DuplicateExaminationRequest request,
    CancellationToken ct)
{
    var result = await _lifecycleService.DuplicateExaminationAsync(id, request, User, ct);
    return CreatedAtAction(nameof(GetExamination), new { id = result.ExaminationId }, result);
}
```

---

## 11. BFF Gateway & Client Services Integration

### 11.1 BFF Route: `POST /api/admin/examinations/[id]/duplicate`
- Located at `apps/web/src/app/api/admin/examinations/[id]/duplicate/route.ts`.
- Validates session using `verifyAdminAuth(request, ["Admin", "SuperAdmin", "ExamManager"])`.
- Forwards authenticated requests to ASP.NET Core backend `POST /api/v1/examinations/{id}/duplicate`.
- Propagates structured error envelopes on validation or lifecycle failures.

### 11.2 BFF Route: `POST /api/admin/examinations/[id]/revisions`
- Located at `apps/web/src/app/api/admin/examinations/[id]/revisions/route.ts`.
- Enhanced to accept and forward `sourceRevisionId` and `copyQuestions` flags.

### 11.3 Client API Service (`apps/web/src/lib/api-services.ts`)
```typescript
export async function duplicateExamination(
  examinationId: string,
  input: {
    title: string;
    sourceRevisionId?: string;
    description?: string;
    timeLimitMinutes?: number;
    passingScorePercent?: number;
  }
): Promise<{
  examinationId: string;
  examinationCode: string;
  revisionId: string;
  revisionNumber: number;
  lifecycleState: string;
  questionCount: number;
  examination: BackendExaminationDto;
}> {
  const res = await fetch(`/api/admin/examinations/${encodeURIComponent(examinationId)}/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to duplicate examination");
  }
  return res.json();
}
```

---

## 12. Admin Studio UI & User Experience Workflows

Located in `apps/web/src/app/admin/examinations/[id]/page-client.tsx`:

### 12.1 Explicit Visual Hierarchy
1. **Header Action Group:**
   - **"Duplicate as New Examination" Button:** Outlined button with `Copy` icon. Always accessible even if the source examination has an active draft.
   - **"Create New Revision" Button:** Primary brand button (`#0D9488`). Dynamically disabled when `hasActiveDraft` is true, accompanied by an explanatory warning.
2. **Revision Lineage Cards:**
   - Each card displays revision number, lifecycle badge, question count, time limit, passing score, and timestamp history.
   - Direct quick actions for eligible revisions:
     - **Branch Button (`GitBranch` icon):** Pre-populates the Create New Revision dialog with this revision as template.
     - **Duplicate Button (`Copy` icon):** Pre-populates the Duplicate Examination dialog with this revision as template.
     - **View Studio / Author Revision Button:** Direct navigation into the authoring studio.

### 12.2 "Create New Revision" Modal Dialog
- Explanatory callout explaining that family identity and permanent code remain unchanged.
- Source revision dropdown listing eligible revisions (`Rev X (State) - Y Questions - Title`) and option to start blank.
- Checkbox to toggle question copying with real-time question count indicator.
- Title, description, time limit, and passing score configuration.
- Single-draft warning and button lock if an active draft exists.

### 12.3 "Duplicate as New Examination" Modal Dialog
- Explanatory callout detailing:
  - Sequence code generation (`RN-EX-XXXXXX` / `PN-EX-XXXXXX`).
  - Revision 1 in Draft lifecycle state.
  - Question memberships and display order copied.
  - Zero candidate attempts (0 attempts copied).
  - Source examination remains immutable.
- Pre-populated title input (`${familyTitle} (Copy)`).
- Source revision selector dropdown.
- Single-click duplication triggering `duplicateMutation`, loading spinner, and seamless router navigation to the new examination family.

---

## 13. Security, RBAC & Separation of Duties Audit

### 13.1 Role Hierarchy & Permissions
| Role | View Lineage | Create New Revision | Duplicate Family | Approve Revision | Publish Revision |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **SuperAdmin** | YES | YES | YES | YES | YES |
| **Admin** | YES | YES | YES | YES | YES |
| **ExamManager** | YES | YES | YES | NO (Separation of duties) | YES |
| **Reviewer** | YES | NO | NO | YES (Review only) | NO |
| **Instructor** | NO | NO | NO | NO | NO |
| **Candidate** | NO | NO | NO | NO | NO |

### 13.2 Separation of Duties Enforcement
- An `ExamManager` can create, branch, edit, and duplicate revisions, but **cannot** self-approve revisions (requires Admin/SuperAdmin).
- `Candidate` and `Instructor` tokens are rejected with `403 Forbidden` at both the ASP.NET Core authorization layer and Next.js BFF session gateway.

---

## 14. Audit Logging & Administrative Traceability

All duplication and revision creation actions generate immutable audit log records in the `AuditLogs` PostgreSQL table:

### 14.1 ExamDuplicated Event
```json
{
  "Action": "ExamDuplicated",
  "EntityType": "Examination",
  "EntityId": "new_family_guid",
  "ActorId": "user_guid",
  "Details": "Duplicated examination from source fam_src_guid (rev rev_src_guid) into RN-EX-000045 with 75 questions."
}
```

### 14.2 ExamRevisionCreated Event
```json
{
  "Action": "ExamRevisionCreated",
  "EntityType": "Exam",
  "EntityId": "new_revision_guid",
  "ActorId": "user_guid",
  "Details": "Created revision 2 for examination fam_src_guid (source rev: rev_src_guid, copied 75 questions)."
}
```

---

## 15. Test Coverage & Verification Matrix

### 15.1 Backend Unit Tests (`ExaminationDuplicationTests.cs`) — 19 Tests
| Test Case | Verification Target |
| :--- | :--- |
| `DuplicateExamination_CreatesNewFamilyWithDraftRevision1` | Creates distinct family ID, code, Rev 1 Draft |
| `DuplicateExamination_AllocatesDistinctCodeFromService` | Calls `IExaminationCodeService.AllocateCodeAsync` |
| `DuplicateExamination_CopiesQuestionsAndPreservesDisplayOrder` | Preserves question count and exact ordering (1..N) |
| `DuplicateExamination_DoesNotCopyAttempts_AndSourceAttemptsRemainIntact` | 0 attempts on clone; source attempts untouched |
| `DuplicateExamination_LeavesSourceFamilyAndRevisionIntact` | Immutability of source entities |
| `DuplicateExamination_DefaultsToPublishedRevision` | Automatically picks published revision when none specified |
| `DuplicateExamination_ThrowsIfSourceFamilyNotFound` | 404 on invalid family ID |
| `DuplicateExamination_ThrowsIfSourceRevisionNotFound` | 404 on invalid revision ID |
| `DuplicateExamination_ThrowsIfSourceRevisionBelongsToDifferentFamily` | Security check on cross-family hijacking |
| `DuplicateExamination_ThrowsIfSourceRevisionIsDraft` | Rejects Draft source state |
| `DuplicateExamination_ThrowsIfSourceRevisionIsInReview` | Rejects InReview source state |
| `DuplicateExamination_ThrowsIfSourceRevisionIsRetired` | Rejects Retired source state |
| `DuplicateExamination_AllowsArchivedOrApprovedSourceRevision` | Permits Approved & Archived source templates |
| `DuplicateExamination_FiltersOutUnapprovedOrRetiredQuestions` | Omits Draft/Retired questions from cloned set |
| `DuplicateExamination_EnforcesAuthorization` | Rejects non-authorized roles |
| `CreateRevision_WithSourceRevision_CopiesQuestionsAndMaintainsDisplayOrder` | Verifies Operation B question copying |
| `CreateRevision_EnforcesSingleActiveDraftInvariant` | Blocks second draft when active draft exists |
| `CreateRevision_WithSourceRevision_RejectsDraftOrInReviewSource` | State machine validation on Operation B |
| `CreateRevision_LogsAuditRecord` | Verifies audit entry generation |

### 15.2 PostgreSQL Integration Tests (`PostgresIntegrationTests.cs`) — 2 Tests
| Test Case | Database Validation Target |
| :--- | :--- |
| `Postgres_ExaminationDuplication_CreatesNewFamilyWithAllocatedSequenceCodeAndCopiedMemberships` | Real PostgreSQL sequence code generation (`exam_code_rn_seq`), question membership relational insertion, zero attempts, audit log in PostgreSQL. |
| `Postgres_ExaminationNewRevision_SerializesConcurrencyAndPreservesFamilyCode` | Real PostgreSQL row-level lock serialization (`FOR UPDATE`), single active draft invariant, sequential revision numbering (Rev 1 -> Rev 2 -> Rev 3). |

### 15.3 Frontend Vitest Tests (`admin-examinations-duplication.test.tsx`) — 5 Tests
| Test Case | Component Target |
| :--- | :--- |
| `renders family view with action buttons and allows creating new revision when no active draft exists` | Header rendering, button states |
| `disables Create New Revision when an active draft already exists but keeps Duplicate enabled` | Invariant UX enforcement |
| `opens Create New Revision modal, displays source revision selection, and submits payload` | Modal interaction, payload verification |
| `opens Duplicate as New Examination modal, displays independent family explanation, and submits duplication` | Duplication modal, router push |
| `handles duplicate API error and notifies user` | Error toast notifications |

---

## 16. Verification Gates Execution Evidence

### Gate 1: Non-PostgreSQL Backend Unit & Regression Suite
```powershell
dotnet test apps/api/Tests/Preform.Api.Tests.csproj --no-restore --filter "FullyQualifiedName!~PostgresIntegrationTests&FullyQualifiedName!~QuestionTypePostgresGateBTests"
```
**Result:**
```text
Passed!  - Failed: 0, Passed: 274, Skipped: 0, Total: 274, Duration: 21 s - Preform.Api.Tests.dll (net8.0)
```

### Gate 2: PostgreSQL Integration Suite
```powershell
$env:PREFORM_GATEB_TEST_CONNECTION_STRING="Host=127.0.0.1;Port=5432;Database=prepford_gateb_verification;Username=postgres;Password=postgres;"; dotnet test apps/api/Tests/Preform.Api.Tests.csproj --no-restore --filter "FullyQualifiedName~PostgresIntegrationTests|FullyQualifiedName~QuestionTypePostgresGateBTests"
```
**Result:**
```text
Passed!  - Failed: 0, Passed: 21, Skipped: 0, Total: 21, Duration: 19 s - Preform.Api.Tests.dll (net8.0)
```

### Gate 3: Frontend Vitest Test Suite
```powershell
npm test --workspace @prepford/web -- --run
```
**Result:**
```text
Test Files  47 passed (47)
     Tests  393 passed (393)
  Duration  216.04s
```

### Gate 4: TypeScript Typecheck
```powershell
npm run typecheck
```
**Result:**
```text
> prepford@0.1.0 typecheck
> npm run typecheck --workspace @prepford/web --if-present

> @prepford/web@0.1.0 typecheck
> tsc --noEmit
Exit code: 0
```

### Gate 5: Next.js Production Build
```powershell
npm run build --workspace @prepford/web
```
**Result:**
```text
✓ Compiled successfully in 25.9s
  Running TypeScript ...
  Finished TypeScript in 37.1s ...
✓ Generating static pages using 1 worker (94/94) in 12.8s
  Finalizing page optimization ...

Route (app)
├ ƒ /api/admin/examinations/[id]/duplicate
├ ◐ /admin/examinations/[id]
├ ◐ /admin/examinations/[id]/revisions/[revisionId]
... 94/94 routes generated successfully.
Exit code: 0
```

---

## 17. Scope Boundaries & Future Phase Isolation

To safeguard codebase integrity, strict scope containment was maintained:
- **No Database Migrations Required:** Existing relational schema (`Examinations`, `Exams`, `ExamQuestions`, `ExamAttempts`, `AuditLogs`) natively supported duplication and revision branching without modification.
- **No CAT / Adaptive Testing Alterations:** P3.4 is strictly linear/administrative; adaptive scoring and algorithm logic were untouched.
- **No Global RBAC Reconfiguration:** Used established `Admin`, `SuperAdmin`, `ExamManager` authorization semantics.
- **No Phase P3.5 Commenced:** Subsequent lifecycle phases (e.g. enhanced validation, bulk question importing, or exam export) remain reserved for future authorized scopes.

---

## 18. Recommendation to Product Owner

All design requirements, transactional constraints, concurrency protections, psychometric isolation rules, BFF routes, Admin Studio UI components, and automated test gates specified for Phase P3.4 have been fully implemented, verified, and audited.

**Recommendation:**  
**READY FOR PRODUCT OWNER REVIEW AND FORMAL ACCEPTANCE.**
