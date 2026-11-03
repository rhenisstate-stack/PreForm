# PrepFord Examination Management — P3 API Contract Proposal

## 1. API Overview

**Base Path:** `api/v1/examinations`

**API Characteristics:**
- RESTful design with conventional HTTP methods
- Resource-based URLs
- JSON request/response payloads
- Role-based authorization
- Comprehensive error responses
- Audit logging for all operations

## 2. Proposed Endpoints

### 2.1 List Examinations
**GET** `/api/v1/examinations`

**Purpose:** Retrieve paginated list of examinations with search, filtering, and sorting capabilities.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | integer | false | Page number (1-based), default: 1 |
| pageSize | integer | false | Items per page, default: 20, max: 100 |
| search | string | false | Full-text search in title, description, code |
| category | string | false | Filter by examination category |
| level | string | false | Filter by difficulty level |
| type | string | false | Filter by exam type (Practice, CAT, etc.) |
| pathway | string | false | Filter by pathway (RN/PN) |
| status | string | false | Filter by lifecycle status (Draft, Published, etc.) |
| createdBy | string | false | Filter by creator user ID |
| createdAfter | string | false | Filter by creation date (ISO 8601) |
| createdBefore | string | false | Filter by creation date (ISO 8601) |
| sortBy | string | false | Sort field (created, updated, title, status), default: created |
| sortDirection | string | false | Sort direction (asc, desc), default: desc |

**Response:**
```json
{
  "success": true,
  "examinations": [
    {
      "id": "exam_123",
      "title": "NCLEX-RN Practice Exam",
      "description": "Standard practice examination for RN candidates",
      "code": "RN-PRACT-001",
      "pathway": "rn",
      "type": "Practice",
      "level": "Intermediate",
      "category": "Core Clinical Skills",
      "targetProgram": "RN",
      "targetAudience": "All RN candidates",
      "duration": 180,
      "passingScore": 75.0,
      "status": "Published",
      "version": 1,
      "createdAt": "2026-01-15T10:30:00Z",
      "updatedAt": "2026-01-20T14:45:00Z",
      "createdBy": "user_456",
      "questionCount": 50,
      "activeAttemptCount": 0,
      "completedAttemptCount": 12
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 156,
    "totalPages": 8,
    "hasPrevious": false,
    "hasNext": true
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions

### 2.2 Get Examination
**GET** `/api/v1/examinations/{id}`

**Purpose:** Retrieve detailed information about a specific examination.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | true | Examination ID |

**Response:**
```json
{
  "success": true,
  "examination": {
    "id": "exam_123",
    "title": "NCLEX-RN Practice Exam",
    "description": "Standard practice examination for RN candidates",
    "code": "RN-PRACT-001",
    "pathway": "rn",
    "type": "Practice",
    "level": "Intermediate",
    "category": "Core Clinical Skills",
    "targetProgram": "RN",
    "targetAudience": "All RN candidates",
    "duration": 180,
    "passingScore": 75.0,
    "instructions": "Read all questions carefully...",
    "status": "Published",
    "version": 1,
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-01-20T14:45:00Z",
    "createdBy": "user_456",
    "lastModifiedBy": "user_789",
    "publishedAt": "2026-01-22T09:00:00Z",
    "archivedAt": null,
    "archivedBy": null,
    "questionCount": 50,
    "activeAttemptCount": 0,
    "completedAttemptCount": 12,
    "hasAttemptedQuestions": false
  }
}
```

**Error Responses:**
- `404 Not Found`: Examination not found
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions

### 2.3 Create Examination
**POST** `/api/v1/examinations`

**Purpose:** Create a new examination.

**Request Body:**
```json
{
  "title": "NCLEX-RN Practice Exam",
  "description": "Standard practice examination for RN candidates",
  "code": "RN-PRACT-001",
  "pathway": "rn",
  "type": "Practice",
  "level": "Intermediate",
  "category": "Core Clinical Skills",
  "targetProgram": "RN",
  "targetAudience": "All RN candidates",
  "duration": 180,
  "passingScore": 75.0,
  "instructions": "Read all questions carefully...",
  "status": "Draft"
}
```

**Response:**
```json
{
  "success": true,
  "examination": {
    "id": "exam_123",
    "title": "NCLEX-RN Practice Exam",
    "description": "Standard practice examination for RN candidates",
    "code": "RN-PRACT-001",
    "pathway": "rn",
    "type": "Practice",
    "level": "Intermediate",
    "category": "Core Clinical Skills",
    "targetProgram": "RN",
    "targetAudience": "All RN candidates",
    "duration": 180,
    "passingScore": 75.0,
    "instructions": "Read all questions carefully...",
    "status": "Draft",
    "version": 1,
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-01-15T10:30:00Z",
    "createdBy": "user_456"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request body
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `409 Conflict`: Examination code already exists

### 2.4 Update Examination
**PATCH** `/api/v1/examinations/{id}`

**Purpose:** Update examination metadata (partial update allowed).

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | true | Examination ID |

**Request Body (partial update allowed):**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "status": "InReview"
}
```

**Response:**
```json
{
  "success": true,
  "examination": {
    "id": "exam_123",
    "title": "Updated Title",
    "description": "Updated description",
    "status": "InReview",
    "updatedAt": "2026-01-20T15:00:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request body
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Examination not found
- `409 Conflict`: Status transition not allowed

### 2.5 Duplicate Examination
**POST** `/api/v1/examinations/{id}/duplicate`

**Purpose:** Create a copy of an existing examination (always starts as Draft).

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | true | Source examination ID |

**Request Body (optional):**
```json
{
  "newTitle": "Copy of NCLEX-RN Practice Exam",
  "newCode": "RN-PRACT-002",
  "newStatus": "Draft"
}
```

**Response:**
```json
{
  "success": true,
  "examination": {
    "id": "exam_456",
    "title": "Copy of NCLEX-RN Practice Exam",
    "code": "RN-PRACT-002",
    "status": "Draft",
    "createdAt": "2026-01-20T15:30:00Z"
  },
  "message": "Examination duplicated successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Examination not found
- `409 Conflict`: Duplicate code conflict

### 2.6 Change Examination Status
**POST** `/api/v1/examinations/{id}/status`

**Purpose:** Transition examination between lifecycle states.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | true | Examination ID |

**Request Body:**
```json
{
  "status": "Published"
}
```

**Valid Transitions:**
- `Draft` → `InReview`
- `Draft` → `Rejected`
- `InReview` → `Approved`
- `InReview` → `Rejected`
- `Approved` → `Published`
- `Published` → `Archived`
- `Published` → `Retired`
- `Archived` → `Restored`

**Response:**
```json
{
  "success": true,
  "examination": {
    "id": "exam_123",
    "status": "Published",
    "updatedAt": "2026-01-20T16:00:00Z"
  },
  "message": "Examination status changed to Published"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid status or transition
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Examination not found
- `409 Conflict`: Invalid transition (e.g., archived with active attempts)

### 2.7 Archive Examination
**DELETE** `/api/v1/examinations/{id}`

**Purpose:** Archive examination (soft delete, preserves history).

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | true | Examination ID |

**Request Body (optional):**
```json
{
  "reason": "Draft examination no longer needed"
}
```

**Response:**
```json
{
  "success": true,
  "examination": {
    "id": "exam_123",
    "status": "Archived",
    "archivedAt": "2026-01-20T16:30:00Z",
    "archivedBy": "user_789"
  },
  "message": "Examination archived successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Examination not found
- `409 Conflict`: Cannot archive examination with active attempts

## 3. DTO Contracts

### 3.1 ExaminationDto
```csharp
public record ExaminationDto
{
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Code { get; init; } = string.Empty;
    public string Pathway { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public string Level { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
    public string TargetProgram { get; init; } = string.Empty;
    public string TargetAudience { get; init; } = string.Empty;
    public int Duration { get; init; }
    public decimal PassingScore { get; init; }
    public string Instructions { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public int Version { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
    public string CreatedBy { get; init; } = string.Empty;
    public string? LastModifiedBy { get; init; }
    public DateTime? PublishedAt { get; init; }
    public DateTime? ArchivedAt { get; init; }
    public string? ArchivedBy { get; init; }
    public int QuestionCount { get; init; }
    public int ActiveAttemptCount { get; init; }
    public int CompletedAttemptCount { get; init; }
    public bool HasAttemptedQuestions { get; init; }
}
```

### 3.2 CreateExaminationRequest
```csharp
public record CreateExaminationRequest
{
    [Required(ErrorMessage = "Title is required")]
    [StringLength(128, ErrorMessage = "Title cannot exceed 128 characters")]
    public string Title { get; init; } = string.Empty;

    [StringLength(1024, ErrorMessage = "Description cannot exceed 1024 characters")]
    public string Description { get; init; } = string.Empty;

    [Required(ErrorMessage = "Code is required")]
    [StringLength(20, ErrorMessage = "Code cannot exceed 20 characters")]
    public string Code { get; init; } = string.Empty;

    [Required(ErrorMessage = "Pathway is required")]
    [RegularExpression("^(rn|pn)$", ErrorMessage = "Pathway must be 'rn' or 'pn'")]
    public string Pathway { get; init; } = string.Empty;

    [Required(ErrorMessage = "Type is required")]
    public string Type { get; init; } = string.Empty;

    [StringLength(50, ErrorMessage = "Level cannot exceed 50 characters")]
    public string Level { get; init; } = string.Empty;

    [StringLength(100, ErrorMessage = "Category cannot exceed 100 characters")]
    public string Category { get; init; } = string.Empty;

    [StringLength(50, ErrorMessage = "Target program cannot exceed 50 characters")]
    public string TargetProgram { get; init; } = string.Empty;

    [StringLength(100, ErrorMessage = "Target audience cannot exceed 100 characters")]
    public string TargetAudience { get; init; } = string.Empty;

    [Range(1, 1440, ErrorMessage = "Duration must be between 1 and 1440 minutes")]
    public int Duration { get; init; } = 180;

    [Range(0, 100, ErrorMessage = "Passing score must be between 0 and 100")]
    public decimal PassingScore { get; init; } = 75.0m;

    [StringLength(2000, ErrorMessage = "Instructions cannot exceed 2000 characters")]
    public string Instructions { get; init; } = string.Empty;

    public string Status { get; init; } = "Draft";
}
```

### 3.3 UpdateExaminationRequest
```csharp
public record UpdateExaminationRequest
{
    [StringLength(128, ErrorMessage = "Title cannot exceed 128 characters")]
    public string? Title { get; init; }

    [StringLength(1024, ErrorMessage = "Description cannot exceed 1024 characters")]
    public string? Description { get; init; }

    [StringLength(50, ErrorMessage = "Level cannot exceed 50 characters")]
    public string? Level { get; init; }

    [StringLength(100, ErrorMessage = "Category cannot exceed 100 characters")]
    public string? Category { get; init; }

    [Range(1, 1440, ErrorMessage = "Duration must be between 1 and 1440 minutes")]
    public int? Duration { get; init; }

    [Range(0, 100, ErrorMessage = "Passing score must be between 0 and 100")]
    public decimal? PassingScore { get; init; }

    [StringLength(2000, ErrorMessage = "Instructions cannot exceed 2000 characters")]
    public string? Instructions { get; init; }
}
```

### 3.4 ExaminationFilterDto
```csharp
public record ExaminationFilterDto
{
    public string? Search { get; init; }
    public string? Category { get; init; }
    public string? Level { get; init; }
    public string? Type { get; init; }
    public string? Pathway { get; init; }
    public string? Status { get; init; }
    public string? CreatedBy { get; init; }
    public DateTime? CreatedAfter { get; init; }
    public DateTime? CreatedBefore { get; init; }
    public string SortBy { get; init; } = "created";
    public string SortDirection { get; init; } = "desc";
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}
```

### 3.5 StatusTransitionRequest
```csharp
public record StatusTransitionRequest
{
    [Required(ErrorMessage = "Status is required")]
    public string Status { get; init; } = string.Empty;

    [StringLength(500, ErrorMessage = "Reason cannot exceed 500 characters")]
    public string? Reason { get; init; }
}
```

### 3.6 ArchiveExaminationRequest
```csharp
public record ArchiveExaminationRequest
{
    [StringLength(500, ErrorMessage = "Reason cannot exceed 500 characters")]
    public string? Reason { get; init; }
}
```

## 4. Response Contracts

### 4.1 Standard API Response
```csharp
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Message { get; set; }
    public List<string>? Errors { get; set; }
}
```

### 4.2 Paginated Response
```csharp
public class PaginatedResponse<T>
{
    public List<T> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
    public bool HasPrevious => Page > 1;
    public bool HasNext => Page < TotalPages;
}
```

## 5. Error Response Contracts

### 5.1 Validation Error Response
```json
{
  "success": false,
  "errors": [
    "Title is required",
    "Duration must be between 1 and 1440 minutes"
  ]
}
```

### 5.2 Business Logic Error Response
```json
{
  "success": false,
  "message": "Cannot archive examination with active attempts",
  "errors": [
    "Examination has 3 active attempts"
  ]
}
```

### 5.3 Authentication Error Response
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 5.4 Authorization Error Response
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 5.5 Not Found Error Response
```json
{
  "success": false,
  "message": "Examination not found"
}
```

## 6. Security Requirements

### 6.1 Authentication
- All endpoints require valid authentication
- JWT bearer tokens or gateway HMAC headers accepted
- Session validation for all operations

### 6.2 Authorization
- **List examinations:** `superadmin`, `admin`, `content_manager`, `exam_manager`
- **Get examination:** Same as list
- **Create examination:** `superadmin`, `admin`, `content_manager`
- **Update examination:** Same as create (or examination owner if in Draft)
- **Duplicate examination:** Same as create
- **Change status:** `superadmin`, `admin`, `exam_manager`, `content_manager`
- **Archive examination:** `superadmin`, `admin`, `exam_manager`

### 6.3 Object-Level Authorization
- Examination ownership checked for update operations
- Published examinations cannot be edited (unless new version approved)
- Archived examinations cannot be modified (except status to Restored)

### 6.4 Audit Requirements
- All operations logged with actor identity
- Request context preserved (IP, user agent, etc.)
- Change descriptions included
- Failed operations logged with reasons

## 7. Validation Rules

### 7.1 Create/Update Validation
- **Title:** Required, 1-128 characters
- **Code:** Required, 1-20 characters, unique per pathway
- **Pathway:** Required, must be "rn" or "pn"
- **Duration:** 1-1440 minutes
- **PassingScore:** 0-100%

### 7.2 Status Transition Validation
- **Draft → InReview:** Allowed for content_manager, exam_manager
- **Draft → Rejected:** Allowed for content_manager, exam_manager
- **InReview → Approved:** Allowed for content_manager, exam_manager
- **InReview → Rejected:** Allowed for content_manager, exam_manager
- **Approved → Published:** Allowed for exam_manager, content_manager
- **Published → Archived:** Allowed for exam_manager, admin
- **Published → Retired:** Allowed for superadmin only
- **Archived → Restored:** Allowed for admin, exam_manager

### 7.3 Constraint Validation
- **Code uniqueness:** Enforced per pathway during create/update
- **Active attempts:** Prevents editing/archiving when attempts exist
- **Version consistency:** Optimistic concurrency with RowVersion

## 8. Performance Considerations

### 8.1 Query Optimization
- Indexed fields: code, pathway, status, createdAt, updatedAt
- Composite indexes: (status, pathway, updatedAt)
- Full-text search index for title/description

### 8.2 Pagination
- Default page size: 20 items
- Maximum page size: 100 items
- Efficient pagination with keyset or offset-based

### 8.3 Caching
- Examination list cached by role/filter combination
- Examination detail cached for 5 minutes
- Invalidation on write operations

## 9. Integration Points

### 9.1 Existing Gate C Dependencies
- **Attempt validation:** Uses `IAttemptQuestionService` for membership checks
- **Question reference:** Validates against existing `ExamQuestion` relationships
- **Scoring configuration:** Reads `PassingScorePercent` from existing `Exam` entity

### 9.2 Future Phase Dependencies
- **Question bank integration:** Hook for future question selection logic
- **CAT algorithms:** Extensible for adaptive testing
- **Results analytics:** Placeholder fields for future metrics

## 10. Implementation Notes

### 10.1 Backward Compatibility
- No breaking changes to existing APIs
- All new fields nullable with sensible defaults
- Existing examination records continue to work

### 10.2 Migration Path
- Additive database schema changes only
- No data migration required
- Can be rolled back easily

### 10.3 Testing Strategy
- Unit tests for all validation rules
- Integration tests for all endpoints
- PostgreSQL integration tests
- Gate C regression tests
- Frontend integration tests

## 11. Documentation

### 11.1 API Documentation
- Swagger/OpenAPI specification
- Request/response examples
- Error codes documented
- Authentication/authorization details

### 11.2 Client Documentation
- TypeScript DTO definitions
- Usage examples
- Parameter descriptions
- Error handling guidance

This API contract provides a complete, production-ready specification for the Examination Library functionality while maintaining full compatibility with existing Gate C security and functional requirements.