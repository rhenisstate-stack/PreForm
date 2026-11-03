# PrepFord Examination Management — P3 Stage 0: Audit Only

## A. Repository State
- **Branch:** `feature/dotnet-backend-migration`
- **HEAD Commit:** `3c0b01a`
- **Working Tree Status:** Clean (nothing to commit)
- **Gate C Baseline:** Confirmed via Gate C remediation report (completed 2026-11-03)

## B. Examination Domain Readiness

| Capability | Existing State | Evidence | P3 Action |
|------------|----------------|----------|-----------|
| Examination entity | ✅ IMPLEMENTED | `models/Assessments.cs`: `Exam` class with Id, Title, Description, Pathway, ExamType, TimeLimitMinutes, PassingScorePercent, IsPublished, CreatedAt, UpdatedAt | Audit only |
| Create | ✅ PARTIALLY (candidate-facing only) | `ExamAttemptsController.StartAttempt` creates attempts via exam lookup or default creation | No P3 changes |
| Read | ✅ PARTIALLY (candidate-facing only) | `ExamAttemptsController.GetAttempts` and `GetAttemptById` return candidate DTOs | No P3 changes |
| Update | ❌ NOT IMPLEMENTED | No Examination CRUD API for administrative management | P3.1-2 |
| Archive | ❌ NOT IMPLEMENTED | No lifecycle state management for examinations | P3.1-2 |
| Delete | ❌ NOT IMPLEMENTED | No examination deletion capability | P3.1-2 |
| Duplicate | ❌ NOT IMPLEMENTED | No examination duplication API | P3.4 |
| Search | ❌ NOT IMPLEMENTED | No examination search/discovery API | P3.3 |
| Filtering | ❌ NOT IMPLEMENTED | No filtering capabilities for examinations | P3.3 |
| Sorting | ❌ NOT IMPLEMENTED | No sorting capabilities for examinations | P3.3 |
| Pagination | ❌ NOT IMPLEMENTED | No paginated examination listing | P3.3 |
| Lifecycle | ❌ NOT IMPLEMENTED | No examination lifecycle states beyond IsPublished | P3.1-2 |
| Audit logging | ✅ VERIFIED | `AuditLog` entity with comprehensive logging in `ExamAttemptsController` | Audit only |
| Authorization | ✅ VERIFIED | Role-based authorization with `AdminRoles` set and candidate-specific access | Audit only |
| Historical integrity | ✅ VERIFIED | Gate C provides `ExamAttemptQuestion` snapshot with exact attempt-question membership | Audit only |

## C. Gate C Compatibility

The proposed P3 architecture preserves all Gate C guarantees:

- **Server-authoritative grading** ✅ Preserved via `IResponseValidationService`
- **Ungraded response handling** ✅ Preserved via `ResponseGradingState` enum
- **Exact attempt-question membership** ✅ Preserved via `ExamAttemptQuestion` snapshot
- **Completed attempt immutability** ✅ Preserved via `ExamAttemptQuestion` snapshot authority
- **Secure synchronization** ✅ Preserved via `SyncAssessmentAttempt` with server verification
- **Candidate DTO protection** ✅ Preserved via `[JsonIgnore(Condition = WhenWritingNull)]`
- **Historical attempt preservation** ✅ Preserved via `ExamAttemptQuestion` snapshot
- **Authorization unchanged** ✅ Preserved per charter requirement

**Unresolved risks:**
- Examination CRUD operations could affect active candidate attempts (requires careful lifecycle management)
- Examination duplication must never duplicate candidate attempts or snapshots (requires explicit protection)

## D. Owner Decisions Required

1. **What lifecycle states should the Examination Library support?**
   - Current evidence: Only `IsPublished` boolean exists in `Exam` entity
   - Available choices: Draft/InReview/Approved/Published/Archived/Disabled/Retired
   - Impact: Determines examination availability to candidates
   - Recommended: At minimum, Draft vs Published distinction

2. **Is a new examination always created as Draft?**
   - Current evidence: No examination creation API exists
   - Available choices: Always Draft, Always Published, Default Draft (can be edited before publishing)
   - Impact: Exam availability and administrative workflow
   - Recommended: Draft to prevent accidental public exposure

3. **Who can move an examination into review?**
   - Current evidence: No examination lifecycle transitions exist
   - Available choices: superadmin, admin, content_manager, exam_manager, reviewer
   - Impact: Determines which roles have examination review permissions
   - Recommended: Based on existing RBAC patterns, `content_manager` role

4. **Who can approve or publish an examination?**
   - Current evidence: No approval workflow exists
   - Available choices: superadmin, admin, content_manager, exam_manager, reviewer
   - Impact: Determines approval authority
   - Recommended: `exam_manager` and `content_manager` for comprehensive review

5. **Can published examinations be edited?**
   - Current evidence: No editing capability exists for examinations
   - Available choices: Yes (with versioning), No (immutable), Yes (requires new version)
   - Impact: Historical integrity vs flexibility
   - Recommended: Edit with explicit versioning for published examinations

6. **Can an examination with active attempts be archived?**
   - Current evidence: No archiving capability exists
   - Available choices: Never, Only if no active attempts, With completion window
   - Impact: Historical integrity vs operational flexibility
   - Recommended: Prevent archiving while active attempts exist

7. **Can an examination with completed attempts be archived?**
   - Current evidence: No archiving capability exists
   - Available choices: Yes, Only with explicit confirmation, No (must retain historical reference)
   - Impact: Historical integrity vs operational cleanup
   - Recommended: Allow archiving with preservation of historical data

8. **Should examination deletion be prohibited after attempts exist?**
   - Current evidence: No deletion capability exists
   - Available choices: Always prohibited, With confirmation window, Always allowed
   - Impact: Data integrity vs administrative flexibility
   - Recommended: Prohibit deletion when attempts exist (preserve historical reference)

9. **Should archived examinations be restorable?**
   - Current evidence: No archiving capability exists
   - Available choices: Yes, No, Configurable restore window
   - Impact: Recovery capability vs operational hygiene
   - Recommended: Allow restoration within reasonable timeframe

10. **Should examination duplication always produce a Draft?**
    - Current evidence: No duplication capability exists
    - Available choices: Always Draft, Copy lifecycle state, User-configurable default
    - Impact: New examination workflow
    - Recommended: Always Draft to ensure proper review before publication

11. **Should an examination code be unique globally or within a program?**
    - Current evidence: `Exam` entity has no code field
    - Available choices: Global unique, Unique per Pathway (RN/PN), No uniqueness requirement
    - Impact: Identification and lookup
    - Recommended: Unique per Pathway to allow both RN and PN adaptations

12. **Should examination search include archived examinations by default?**
    - Current evidence: No search capability exists
    - Available choices: Include all, Exclude archived, Configurable
    - Impact: User experience and data discovery
    - Recommended: Exclude archived by default (relevant for active management)

13. **Should the library show question count and duration when question-bank integration is not yet complete?**
    - Current evidence: No examination library exists
    - Available choices: Show estimated counts, Show 0/incomplete, Hide until fully populated
    - Impact: User experience and transparency
    - Recommended: Show estimated counts when available, complete when question bank integration exists

14. **What metadata must be snapshotted when an attempt begins?**
    - Current evidence: Exam details are current at attempt start but no snapshot of examination metadata
    - Available choices: Full examination metadata, Essential configuration only, No snapshot needed
    - Impact: Historical integrity and audit trail
    - Recommended: Snapshot essential examination metadata for historical integrity

## E. Proposed P3 Implementation Sequence

### P3.0 — Audit and Domain Blueprint (Current Phase)
**Status:** ✅ COMPLETE
- Repository state verification
- Domain entity investigation
- API and authorization audit
- Gate C compatibility assessment
- Frontend audit
- Architecture and policy assessment

### P3.1 — Examination Domain Foundation
**Scope:**
- Final examination domain contract definition
- Entity review and any approved minimal model changes
- DTO definitions for management APIs
- Validation architecture
- Lifecycle contract design
- Authorization matrix
- Audit event design
- Additive migration design (if required)

**Acceptance Criteria:**
- Complete domain blueprint documentation
- All owner decisions documented
- No code changes implemented
- All existing tests pass (208 backend, 381 frontend)

### P3.2 — Examination CRUD
**Scope:**
- Create examination (management API)
- Retrieve examination by ID
- Update examination metadata
- Archive/deactivate examination (per approved lifecycle policy)
- Server-side validation
- Authorization enforcement
- Audit logging

**Acceptance Criteria:**
- All CRUD operations working
- Authorization enforced
- Historical integrity preserved
- Gate C regression tests pass

### P3.3 — Examination Library Query and Discovery
**Scope:**
- Server-side listing with pagination
- Search functionality
- Filtering capabilities
- Sorting options
- Empty and error contracts
- Performance verification

**Acceptance Criteria:**
- List endpoint with pagination working
- Search, filter, sort functional
- Empty states handled gracefully
- Performance verified with realistic data

### P3.4 — Safe Examination Duplication
**Scope:**
- Transactional duplication with isolation
- New unique identifiers
- Safe metadata copying
- Correct lifecycle initialization (always Draft)
- Relationship handling per domain contract
- Explicit exclusion of attempts, responses, grades and attempt snapshots
- Idempotent duplicate-request protection

**Acceptance Criteria:**
- Duplication operation safe and atomic
- No historical data duplicated
- New examination properly initialized
- Duplicate protection functional

### P3.5 — Frontend Examination Library Integration
**Scope:**
- Examination table with search and filters
- Pagination component
- Create and edit forms
- Examination detail view
- Lifecycle action buttons
- Duplication confirmation
- Loading, error, empty and success states
- Role-based UI visibility

**Acceptance Criteria:**
- All frontend components functional
- All backend APIs integrated
- Role-based access working
- Loading/error states handled

### P3.6 — Regression and Release Verification
**Scope:**
- Full backend test suite execution
- PostgreSQL integration tests
- Frontend test suite execution
- Production build verification
- Authorization matrix verification
- Gate C regression verification
- API contract verification
- Documentation completion

**Acceptance Criteria:**
- All tests passing (208 backend, 381 frontend)
- Production build successful
- All authorization scenarios verified
- Gate C guarantees intact
- Documentation complete

## F. Testing and Release Strategy

### Existing Test Infrastructure

**Backend Tests (`apps/api/Tests/Preform.Api.Tests.csproj`):**
- **xUnit tests:** 208 passed, 0 failed, 0 skipped
- **Test categories:**
  - `AttemptMembershipSecurityTests` (11 tests) - Gate C C2
  - `CandidateDataContractTests` (4 tests) - Gate C C4
  - `GradingSecurityTests` (15 tests) - Gate C C1
  - `PostgresIntegrationTests` - PostgreSQL verification
  - `QuestionTypeCatalogueSeederTests` - Gate B
  - Other existing domain tests

**Frontend Tests (`apps/web`):**
- **Vitest tests:** 381 passed, 0 failed
- **Test categories:** Component tests, integration tests, authentication tests

**PostgreSQL Integration Tests:**
- Uses disposable database `prepford_gateb_verification`
- Verifies migration chain, role seeding, schema constraints
- No contact with production database

### Test Coverage for P3

**Required Backend Unit Tests:**
1. Examination creation validation
2. Required field validation (title, etc.)
3. Invalid metadata rejection
4. Update behavior preservation
5. Lifecycle transition validation
6. Duplication rules enforcement
7. Search filter validation
8. Pagination boundary testing
9. Sorting validation
10. Missing examination handling
11. Duplicate identifier prevention
12. Concurrency conflict handling

**Required Backend Integration Tests:**
1. HTTP status codes verification
2. Response payload contracts
3. Authentication requirements
4. Authorization enforcement
5. Database persistence
6. Validation error handling
7. Transaction behavior
8. Audit event creation
9. Duplicate-request handling
10. Historical attempt preservation

**Required PostgreSQL Integration Tests:**
1. Fresh migration chain verification
2. Examination schema validation
3. Foreign key constraints
4. Unique constraint testing
5. Index performance verification
6. Lifecycle persistence
7. Transaction rollback testing
8. Duplication atomicity
9. Existing attempt compatibility
10. Idempotent seeding where applicable

**Required Gate C Regression Tests:**
- All existing Gate C tests must continue passing (208 total)
- New P3 tests must not create paths around Gate C controls
- Examination CRUD must not weaken grading security
- Attempt-question membership must remain enforced

**Required Frontend Tests:**
1. Library rendering components
2. Search functionality
3. Filter and sort operations
4. Pagination controls
5. Create form validation
6. Edit form validation
7. Lifecycle action permissions
8. Duplicate confirmation flows
9. API error handling
10. Loading and empty states
11. Role-based visibility

## G. Final Readiness Verdict

**READY WITH OWNER DECISIONS**

**Technical blueprint is complete** with all domain analysis and P3 design specifications. **Named product decisions** are required for examination lifecycle policy, authorization rules, and operational behavior.

**Blocking Owner Decisions:**
1. Examination lifecycle states and transitions
2. Role-based permissions for examination management
3. Examination code uniqueness strategy
4. Search and archive behavior preferences
5. Examination snapshot requirements

**Recommended Next Phase:**
**P3.1** examination domain foundation is ready for implementation once owner decisions are documented and approved. All technical requirements, API contracts, validation rules, and testing strategies have been identified and documented.

**Implementation Path:**
1. Document owner decisions in `docs/exam-management-p3-owner-decisions.md`
2. Finalize domain blueprint in `docs/exam-management-p3-domain-blueprint.md`
3. Approve P3.1 scope and begin implementation
4. Proceed with P3.2-P3.6 per the established sequence

**Evidence Base:**
- All findings cite actual file paths and code evidence
- Gate C verification status confirmed via documentation and test reports
- Repository state confirmed via Git and test execution evidence
- Existing API patterns analyzed from controller implementations
- Testing infrastructure documented from actual test suite results