# PrepFord Examination Management — P3 Domain Blueprint

## 1. Domain Boundaries

### Examination Entity
**Current Entity:** `models/Assessments.cs` `Exam` class

**Existing Properties:**
- `Id` (string, GUID-based)
- `Title` (required, 128 chars max)
- `Description` (optional, 1024 chars)
- `Pathway` (required, "rn" or "pn", 10 chars max)
- `ExamType` (enum: Practice, CAT, MockSimulation, DiagnosticReadiness)
- `TimeLimitMinutes` (int, 0 for untimed)
- `PassingScorePercent` (decimal, default 75.0)
- `IsPublished` (bool, default false)
- `CreatedAt` (DateTime)
- `UpdatedAt` (DateTime)
- `ExamQuestions` (ICollection<ExamQuestion>)
- `Attempts` (ICollection<ExamAttempt>)

**Proposed Additions for P3:**
- `ExamCode` (optional string, unique per pathway)
- `Category` (optional string, program categorization)
- `Level` (optional string, difficulty level)
- `TargetProgram` (optional string, RN/PN specific)
- `TargetAudience` (optional string, user segment)
- `Instructions` (optional string, examination directions)
- `LifecycleStatus` (enum: Draft, InReview, Approved, Published, Archived, Retired)
- `Version` (int, for published examination revisions)
- `ArchivedAt` (DateTime?, when archived)
- `ArchivedBy` (string?, who archived)

### Examination Management Service
**Current Services:**
- `IAttemptQuestionService` - Membership validation and recording
- `IResponseValidationService` - Server-authoritative grading
- `IProgrammeService` - Programme management (RN/PN)

**Proposed Service:**
- `IExaminationManagementService` - CRUD operations, lifecycle management, duplication
- Responsibility: Examination metadata management only (no question bank operations)
- Integration: With existing `IAttemptQuestionService` for attempt validation

### Examination Repository/Abstraction
**Current Persistence:** EF Core DbContext with `Exams` DbSet

**Proposed Patterns:**
- Extension of existing EF Core model
- Use of existing migration framework
- Maintain all foreign key relationships
- Add new indexes for search/filtering

### Examination Request/Response DTOs
**Current DTOs:**
- `CandidateAttemptDetailDto` - Candidate-facing
- `AttemptSummaryDto` - Candidate-facing list
- `CreateProgrammeRequest` - Programme creation

**Proposed DTOs:**
- `ExaminationDto` - Management read response
- `CreateExaminationRequest` - Full creation payload
- `UpdateExaminationRequest` - Partial update payload
- `ExaminationFilterDto` - Search/filter parameters
- `DuplicateExaminationRequest` - Duplication options

### Examination Validation
**Current Validation:**
- Entity Framework Core validation
- Controller-level try/catch with specific exception types
- Existing API validation patterns

**Proposed Validation:**
- FluentValidation for cross-property rules
- Unique constraint validation (exam code)
- Lifecycle transition validation
- Permission-based access control validation

### Examination Lifecycle Handling
**Current Lifecycle:**
- `IsPublished` boolean only
- Implicit active/archived based on this flag

**Proposed Lifecycle:**
```
Draft -> InReview -> Approved -> Published -> (Archived/Retired)
       |                     |
       |-----> Rejected <------|
```

**Transition Rules:**
- Draft: Always creatable, editable
- InReview: Can be approved or rejected
- Approved: Can be published or rejected
- Published: Can be archived or edited (creates new version)
- Archived: Can be restored
- Retired: Permanent, cannot be restored

### Examination Audit Events
**Current Audit:**
- `AuditLog` entity used throughout
- Action types: Various CRUD operations

**Proposed Events:**
- `ExaminationCreated`
- `ExaminationMetadataUpdated`
- `ExaminationStatusChanged`
- `ExaminationDuplicated`
- `ExaminationArchived`
- `ExaminationRestored`
- `ExaminationDeleted`

### Examination List/Search Query Model
**Current Search:** None

**Proposed Query Model:**
- Full-text search on title, description, code
- Multi-field filtering (category, type, status, pathway)
- Date range filtering (created, updated, archived)
- Creator filtering (created by)
- Pagination support (skip/take or page/size)
- Sorting options (created, updated, title, status)

## 2. Concurrency Strategy

**Current Concurrency:** None implemented

**Recommended Strategy:**
- **Row Version Concurrency:** Add `RowVersion` property to `Exam` entity
- **Rationale:** 
  - Minimal performance impact
  - Compatible with existing EF Core patterns
  - Simple to implement
  - Supports both optimistic concurrency and change detection

**Implementation:**
```csharp
[Timestamp]
public byte[] RowVersion { get; set; }
```

## 3. Auditability

**Current Audit Infrastructure:**
- `AuditLog` entity with ActorId, Action, EntityType, EntityId, Description, Outcome, Timestamp
- Used extensively throughout codebase
- Comprehensive logging in `ExamAttemptsController`

**Required P3 Events:**
- All examination operations automatically audited
- Actor identity captured (user ID from authentication)
- Change context preserved (user agent, request details)
- No sensitive data in audit descriptions
- Performance consideration for large-scale operations

## 4. Database Schema Changes

### Additive Changes Required:

1. **ExamCode field**
   - Type: string
   - Nullable: true (for backward compatibility)
   - Unique constraint: per pathway (RN/PN)
   - Index: for lookup performance

2. **Category field**
   - Type: string
   - Nullable: true
   - Index: for filtering

3. **Level field**
   - Type: string
   - Nullable: true
   - Index: for filtering/sorting

4. **TargetProgram field**
   - Type: string (RN/PN)
   - Nullable: true
   - Index: for filtering

5. **TargetAudience field**
   - Type: string
   - Nullable: true
   - Index: for filtering

6. **LifecycleStatus field**
   - Type: enum (Draft, InReview, Approved, Published, Archived, Retired)
   - Default: Draft
   - Index: for filtering by status

7. **Version field**
   - Type: int
   - Default: 1
   - Update: Increment on metadata changes

8. **ArchivedAt/ArchivedBy fields**
   - Type: DateTime?/string?
   - Nullable: true

### Non-Breaking Changes:
- All existing examination records preserved
- Foreign key relationships maintained
- Existing attempt-question snapshots unaffected
- All existing APIs continue to work

## 5. Migration Strategy

**Current Migration:**
- `20261103054224_AddAttemptQuestionSetAndGradingState` (Gate C)
- Additive migrations only

**Proposed Migration for P3:**
- `202701010001_AddExaminationManagementFields` (additive only)
- No data migration required
- All new fields nullable with sensible defaults
- Foreign key constraints preserved
- Unique indexes added for new fields

**Rollback Strategy:**
- Migration is purely additive
- Can be rolled back by removing new fields
- No data loss risk
- Existing functionality preserved

## 6. Implementation Dependencies

**Required for P3.1:**
- None (audit and blueprint phase only)

**Required for P3.2:**
- New DTO definitions
- Validation logic
- Service implementation
- Controller endpoints
- Unit tests

**Required for P3.3:**
- Search/filter implementation
- Pagination logic
- Query optimization
- Frontend integration

**Required for P3.4:**
- Transaction management
- Duplication logic
- Identity management
- Audit logging

**Required for P3.5:**
- Frontend components
- API client integration
- Query hooks
- Form handling

**Required for P3.6:**
- Test execution
- Performance verification
- Documentation
- Release validation

## 7. Risk Assessment

**High Risk Areas:**
1. **Examination editing during active attempts**
   - Risk: Historical integrity compromise
   - Mitigation: Prevent editing of published examinations with active attempts

2. **Examination deletion**
   - Risk: Loss of historical reference
   - Mitigation: Prohibit deletion when attempts exist

3. **Duplication complexity**
   - Risk: Incomplete duplication or data leakage
   - Mitigation: Strict exclusion rules, transactional safety

**Medium Risk Areas:**
1. **Search performance**
   - Risk: Slow response times with large datasets
   - Mitigation: Proper indexing, pagination limits

2. **Authorization complexity**
   - Risk: Permission gaps
   - Mitigation: Comprehensive authorization matrix

**Low Risk Areas:**
1. **Database schema changes**
   - Risk: Migration complexity
   - Mitigation: Purely additive changes

2. **API contract changes**
   - Risk: Client compatibility
   - Mitigation: Backward compatibility maintained

## 8. Success Criteria

**P3.1 Acceptance Criteria:**
- Complete domain blueprint documented
- All owner decisions recorded
- No code changes implemented
- All existing tests continue to pass
- Migration design finalized

**P3.2 Acceptance Criteria:**
- Create examination: Returns 201 Created with valid DTO
- Retrieve examination: Returns correct DTO for existing ID
- Update examination: Returns updated DTO with changes applied
- Archive examination: Changes status to Archived, preserves history
- Authorization enforced for all operations
- Historical integrity preserved
- All Gate C tests continue to pass

**P3.3 Acceptance Criteria:**
- List examinations: Returns paginated list with search/filter/sort
- Empty states handled gracefully
- Error states documented and tested
- Performance verified with realistic data

**P3.4 Acceptance Criteria:**
- Duplicate examination: Creates new examination with safe metadata copy
- Original examination unchanged
- New examination always starts as Draft
- No attempts or snapshots duplicated
- Transaction atomicity verified

**P3.5 Acceptance Criteria:**
- All frontend components functional
- All API integrations working
- Role-based access enforced
- Loading/error states handled

**P3.6 Acceptance Criteria:**
- All tests passing (208 backend, 381 frontend)
- Production build successful
- Gate C regression verified
- Documentation complete