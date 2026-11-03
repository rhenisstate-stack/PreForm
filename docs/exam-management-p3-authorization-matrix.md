# PrepFord Examination Management — P3 Authorization Matrix

## 1. Role Hierarchy Overview

**Current Roles (from `RoleHierarchy`):**
- `superadmin` - Ultimate administrative privileges
- `admin` - System administration
- `administrator` - Alias for admin
- `content_manager` - Content management
- `manager` - Exam management
- `exam_manager` - Examination management
- `reviewer` - Review and approval
- `instructor` - Educational instruction
- `candidate` - Test taker

**Role Normalization:**
- `administrator` → `admin` (normalized by `RoleHierarchy`)
- Other aliases may exist per `PrepfordAuthHandler` conventions

## 2. Examination Management Permissions

### 2.1 Permission Matrix

| Role | List Exams | Get Exam | Create Exam | Update Exam | Duplicate Exam | Change Status | Archive Exam | Archive Restrictions |
|------|------------|----------|-------------|-------------|----------------|---------------|--------------|----------------------|
| superadmin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | None |
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | None |
| administrator | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | None |
| content_manager | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | Can create/update only Draft |
| manager | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | Can create/update only Draft |
| exam_manager | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | Cannot archive, can duplicate |
| reviewer | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Read-only, can reject |
| instructor | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Read-only |
| candidate | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | No access |

### 2.2 Permission Definitions

**ExamReadPermission:**
- Required for: List Exams, Get Exam
- Authorization: `superadmin`, `admin`, `content_manager`, `exam_manager`
- Scope: Read access to examination metadata

**ExamCreatePermission:**
- Required for: Create Exam
- Authorization: `superadmin`, `admin`, `content_manager`
- Scope: Create new examination records

**ExamUpdatePermission:**
- Required for: Update Exam
- Authorization: `superadmin`, `admin`, `content_manager` (Draft only), `exam_manager` (Published only)
- Scope: Modify examination metadata

**ExamDuplicatePermission:**
- Required for: Duplicate Exam
- Authorization: `superadmin`, `admin`, `exam_manager`
- Scope: Create copy of existing examination

**ExamStatusChangePermission:**
- Required for: Change Status
- Authorization: `superadmin`, `admin`, `exam_manager`, `content_manager`
- Scope: Lifecycle state transitions

**ExamArchivePermission:**
- Required for: Archive Exam
- Authorization: `superadmin`, `admin`, `exam_manager`
- Scope: Soft delete with history preservation

### 2.3 Object-Level Authorization

**Examination Ownership:**
- Draft examinations: Owner can edit (creator user ID)
- Published examinations: Read-only for all authorized users
- Archived examinations: Read-only for all authorized users

**Access Control Rules:**
1. **Create Permission:**
   - Creates examination with current user as `CreatedBy`
   - Starts with `Status = Draft`

2. **Update Permission:**
   - Draft: Owner (`CreatedBy`) can update
   - Published: Only `superadmin`, `admin`, `exam_manager` can update
   - Update creates new version, preserves historical reference

3. **Duplicate Permission:**
   - Creates new examination with copied metadata
   - `CreatedBy` = current user
   - `Status` = Draft
   - Never copies `CreatedAt` timestamp

4. **Archive Permission:**
   - Sets `Status = Archived`
   - Records `ArchivedAt` and `ArchivedBy`
   - Prevents archiving if active attempts exist
   - Preserves all historical data

## 3. Current Authorization Implementation

### 3.1 Existing Patterns

**Controller Attributes:**
```csharp
[Authorize(Policy = "RequireContentManager")] // for programme operations
[Authorize(Roles = "admin,superadmin,exam_manager")] // for specific actions
```

**Service-Level Authorization:**
- Some operations use `RoleHierarchy.GetEffectiveRole(User)`
- Ownership checks implemented in controllers
- Gateway HMAC authentication also supported

### 3.2 Authorization Decision Points

1. **Global Policy:**
   - Most administrative operations require `RequireContentManager` or `RequireAdmin`
   - Candidate operations use ownership-based checks

2. **Examination-Specific Rules:**
   - Based on `Status` and `CreatedBy` fields
   - Additional restrictions for published examinations

3. **Integration with Gate C:**
   - No changes to `PrepfordAuthHandler` or `SessionService`
   - Existing role hierarchy preserved
   - Object-level access added for examination management

## 4. Proposed Authorization Implementation

### 4.1 Policy Configuration

**New Authorization Policies:**
```csharp
// Existing policies (unchanged)
AuthorizePolicy.RequireContentManager
AuthorizePolicy.RequireAdmin

// New policies for P3
AuthorizePolicy.RequireExaminationRead
AuthorizePolicy.RequireExaminationCreate
AuthorizePolicy.RequireExaminationUpdate
AuthorizePolicy.RequireExaminationDuplicate
AuthorizePolicy.RequireExaminationStatusChange
AuthorizePolicy.RequireExaminationArchive
```

**Policy Mappings:**
| Policy | Roles |
|--------|-------|
| RequireExaminationRead | superadmin, admin, content_manager, exam_manager |
| RequireExaminationCreate | superadmin, admin, content_manager |
| RequireExaminationUpdate | superadmin, admin, content_manager (Draft), exam_manager (Published) |
| RequireExaminationDuplicate | superadmin, admin, exam_manager |
| RequireExaminationStatusChange | superadmin, admin, exam_manager, content_manager |
| RequireExaminationArchive | superadmin, admin, exam_manager |

### 4.2 Service-Level Authorization

**ExaminationAuthorizationService:**
```csharp
public interface IExaminationAuthorizationService
{
    Task<bool> CanReadExaminationAsync(string examinationId, string userId, IReadOnlyCollection<string> roles);
    Task<bool> CanCreateExaminationAsync(string userId, IReadOnlyCollection<string> roles);
    Task<bool> CanUpdateExaminationAsync(string examinationId, string userId, IReadOnlyCollection<string> roles);
    Task<bool> CanDuplicateExaminationAsync(string examinationId, string userId, IReadOnlyCollection<string> roles);
    Task<bool> CanChangeStatusAsync(string examinationId, string userId, IReadOnlyCollection<string> roles);
    Task<bool> CanArchiveExaminationAsync(string examinationId, string userId, IReadOnlyCollection<string> roles);
    Task<bool> CanBypassArchiveRestrictionAsync(string examinationId, IReadOnlyCollection<string> roles);
}
```

### 4.3 Controller Authorization Attributes

**Endpoint Authorization Examples:**
```csharp
[HttpGet]
[Authorize(Policy = "RequireExaminationRead")]
public async Task<IActionResult> GetExaminations(...) { ... }

[HttpPost]
[Authorize(Policy = "RequireExaminationCreate")]
public async Task<IActionResult> CreateExamination(...) { ... }

[HttpPatch("{id}")]
[Authorize(Policy = "RequireExaminationUpdate")]
public async Task<IActionResult> UpdateExamination(string id, ...) { ... }

[HttpPost("{id}/duplicate")]
[Authorize(Policy = "RequireExaminationDuplicate")]
public async Task<IActionResult> DuplicateExamination(string id, ...) { ... }

[HttpPost("{id}/status")]
[Authorize(Policy = "RequireExaminationStatusChange")]
public async Task<IActionResult> ChangeStatus(string id, ...) { ... }

[HttpDelete("{id}")]
[Authorize(Policy = "RequireExaminationArchive")]
public async Task<IActionResult> ArchiveExamination(string id, ...) { ... }
```

## 5. Object-Level Access Control

### 5.1 Examination Access Rules

**Access Decision Tree:**
```
CanAccess(examinationId, userId, roles):
  1. HasExaminationReadPermission(roles)?
  2.  If yes → CanAccessWithPermission(examinationId, userId, roles)
  3.  Else → Forbidden

CanAccessWithPermission(examinationId, userId, roles):
  1. Get examination from database
  2.  If examination.Status == "Archived":
  3.      If userHasArchivePermission(roles) OR userId == examination.ArchivedBy:
  4.          Allow (read-only)
  5.      Else → Deny
  6.  If examination.Status == "Published":
  7.      Allow (read-only)
  8.  If examination.Status == "InReview" || "Approved":
  9.      If userHasUpdatePermission(roles):
  10.         Allow (read-write)
  11.     Else → Deny
  12. If examination.Status == "Draft":
  13.     If userId == examination.CreatedBy:
  14.         Allow (read-write)
  15.     Else if userHasUpdatePermission(roles):
  16.         Allow (read-only)
  17.     Else → Deny
```

### 5.2 Status-Specific Rules

**Draft Examinations:**
- Owner can read/write
- Admins can read/write
- Others cannot access

**Published Examinations:**
- All authorized users can read
- Admins can update (creates new version)
- Others cannot modify

**Archived Examinations:**
- All authorized users can read
- Admins can restore (change status to Restored)
- Cannot be modified

**InReview/Approved Examinations:**
- Admins can read/write
- Content managers can read/write for InReview
- Reviewers can read/write for InReview

### 5.3 Archive Restriction Logic

**Archive Permission Matrix:**
```
CanArchive(examinationId, userId, roles):
  1. HasExaminationArchivePermission(roles)
  2.  If yes → CanArchiveSafely(examinationId, userId, roles)
  3.  Else → Deny

CanArchiveSafely(examinationId, userId, roles):
  1. Get examination and count active attempts
  2.  If activeAttempts > 0:
  3.      If userCanBypassRestrictions(roles):
  4.          Allow with warning
  5.      Else:
  6.          Deny with explanation
  7.  If archivedAt != null && currentTime - archivedAt < 30 days:
  8.      If userHasEmergencyPermission(roles):
  9.          Allow with justification
  10.     Else:
  11.         Deny
  12. Allow archive
```

## 6. Authorization Testing

### 6.1 Unit Tests

**Authorization Service Tests:**
- Test all permission combinations
- Test object-level access rules
- Test status transition authorization
- Test archive restriction logic

**Controller Action Tests:**
- Test HTTP status codes for authorization failures
- Test 401 vs 403 responses
- Test role-based access patterns
- Test object-level authorization

### 6.2 Integration Tests

**Authorization Matrix Tests:**
- Test complete role-to-permission mapping
- Test edge cases and exceptions
- Test authorization service integration

**Gate C Regression Tests:**
- Ensure existing authorization patterns still work
- Test candidate examination access unchanged
- Test admin authorization unchanged

## 7. Implementation Recommendations

### 7.1 Service-Based Authorization

**Advantages:**
- Centralized authorization logic
- Reusable across endpoints
- Easier testing and maintenance
- Consistent implementation

**Implementation:**
- Create `IExaminationAuthorizationService`
- Implement in `ExaminationAuthorizationService`
- Use in controllers and services
- Integrate with existing `RoleHierarchy`

### 7.2 Policy-Based Configuration

**Benefits:**
- Declarative authorization rules
- Easy to modify and extend
- Consistent with existing patterns
- Support for future role additions

**Implementation:**
- Configure policies in `Program.cs`
- Use attribute-based authorization in controllers
- Support both role and policy-based checks

### 7.3 Caching Strategy

**Authorization Cache:**
- Cache role-to-permission mappings
- Cache user permissions per session
- Invalidate on role changes
- TTL: session duration

## 8. Migration Considerations

### 8.1 Backward Compatibility

**Existing Authorization:**
- All existing roles continue to work
- No breaking changes to existing permissions
- Admin roles maintain all existing access
- Candidate access patterns unchanged

### 8.2 New Permission Integration

**Gradual Rollout:**
- Start with read-only access for all roles
- Gradually enable create/update permissions
- Implement archive functionality
- Add status transition rules

**Testing Strategy:**
- Backward compatibility tests first
- New permission tests second
- Integration tests last

## 9. Security Considerations

### 9.1 Authorization Bypass Prevention

**Security Rules:**
- No authorization bypass allowed
- All object-level checks enforced
- Audit logging for all authorization decisions
- Rate limiting on authorization endpoints

### 9.2 Data Protection

**Information Disclosure:**
- Examination metadata accessible based on permissions
- No exposure of internal IDs to unauthorized users
- Soft deletes preserve all data
- Audit logs capture all access attempts

### 9.3 Performance Impact

**Authorization Overhead:**
- Minimal impact on read operations
- Moderate impact on write operations
- Caching reduces repetitive checks
- Database optimization for permission indexes

## 10. Documentation

### 10.1 Authorization Documentation

**Policy Documentation:**
- Each policy documented with roles and purposes
- Object-level rules explained
- Error conditions described
- Testing scenarios included

**Implementation Documentation:**
- Authorization service design
- Controller attribute usage
- Database schema implications
- Testing strategy

This Authorization Matrix provides a comprehensive specification for examination management authorization while maintaining full compatibility with existing PrepFord RBAC patterns and Gate C security requirements.