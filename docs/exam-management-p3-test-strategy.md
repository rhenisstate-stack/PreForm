# PrepFord Examination Management — P3 Test Strategy

## 1. Testing Overview

**Testing Philosophy:**
- Test the API contracts, not implementation details
- Verify security and integrity, not functionality alone
- Ensure Gate C compliance is maintained
- Validate authorization and audit requirements
- Test edge cases and error conditions

**Test Hierarchy:**
1. Unit Tests (Test implementation details)
2. Integration Tests (Test component interactions)
3. PostgreSQL Integration Tests (Test database operations)
4. End-to-End Tests (Test complete workflows)

## 2. Existing Test Infrastructure

### 2.1 Backend Tests (`apps/api/Tests/Preform.Api.Tests.csproj`)

**Test Framework:** xUnit
**Database:** Disposable PostgreSQL instances
**Authentication:** Gateway HMAC and bearer tokens

**Test Categories:**
- **Gate C Tests:** `AttemptMembershipSecurityTests`, `CandidateDataContractTests`, `GradingSecurityTests`
- **Gate B Tests:** `QuestionTypeCatalogueSeederTests`, `QuestionTypePostgresGateBTests`
- **Integration Tests:** `PostgresIntegrationTests`, `AppTests`
- **Unit Tests:** `QuestionTypeServiceTests`, `QuestionTypesControllerTests`
- **Authorization Tests:** `RoleResolutionTests`, `AdminBootstrapTests`
- **Other:** `StudyFlashcardsTests`, `PromoDiscountTests`, `TestimonialTests`

**Current Status:** 208 backend tests passing, 0 failing

### 2.2 Frontend Tests (`apps/web`)

**Test Framework:** Vitest
**Testing Library:** React Testing Library
**Build Tools:** Vitest, Playwright (E2E)

**Test Categories:**
- Component tests (React components)
- Integration tests (API client integration)
- Authentication tests
- UI/UX tests

**Current Status:** 381 frontend tests passing, 0 failing

### 2.3 PostgreSQL Integration Testing

**Environment:** Disposable `prepford_gateb_verification` database
**Connection:** Via `PREFORM_GATEB_TEST_CONNECTION_STRING`
**Isolation:** Fresh database for each test run
**Verification:** Migration chain, schema, data integrity

## 3. P3 Test Strategy

### 3.1 Backend Unit Tests

**Scope:** Test individual components and business logic
**Coverage:** 100% of new P3 code
**Isolation:** Mock external dependencies

**Test Files:**
- `apps/api/Tests/ExaminationManagementServiceTests.cs`
- `apps/api/Tests/ExaminationControllerTests.cs`
- `apps/api/Tests/ExaminationValidationTests.cs`
- `apps/api/Tests/ExaminationAuthorizationTests.cs`
- `apps/api/Tests/ExaminationLifecycleTests.cs`
- `apps/api/Tests/ExaminationDuplicationTests.cs`
- `apps/api/Tests/ExaminationSearchTests.cs`

**Test Categories:**

#### 3.1.1 Service Tests
**ExaminationManagementService Tests:**
- `CreateExaminationAsync` with valid/invalid data
- `UpdateExaminationAsync` with permission validation
- `ArchiveExaminationAsync` with active attempt checks
- `DuplicateExaminationAsync` with identity management
- `ChangeStatusAsync` with valid transitions
- `SearchExaminationsAsync` with various filters
- `GetExaminationAsync` with authorization checks

**ExaminationAuthorizationService Tests:**
- All permission combinations
- Object-level access rules
- Status-specific authorization
- Archive restriction logic

#### 3.1.2 Validation Tests
**Input Validation:**
- Required field validation
- Format validation (IDs, emails, etc.)
- Range validation (duration, scores, etc.)
- Business rule validation
- Duplicate detection

**Lifecycle Validation:**
- Status transition validation
- Archive permission validation
- Update restriction validation
- Create permission validation

#### 3.1.3 Error Handling Tests
**Error Scenarios:**
- Invalid input data
- Permission violations
- Archive restriction violations
- Status transition conflicts
- Duplicate identifier conflicts
- Database constraint violations
- Concurrency conflicts

### 3.2 Backend Integration Tests

**Scope:** Test HTTP endpoints with real dependencies
**Framework:** WebApplicationFactory
**Authentication:** Real authentication mechanisms

**Test Files:**
- `apps/api/Tests/ExaminationIntegrationTests.cs`
- `apps/api/Tests/ExaminationControllerIntegrationTests.cs`

**Test Categories:**

#### 3.2.1 Endpoint Contract Tests
**HTTP Method/Route Combinations:**
- `GET /api/v1/examinations` with various query parameters
- `GET /api/v1/examinations/{id}` with valid/invalid IDs
- `POST /api/v1/examinations` with valid/invalid payloads
- `PATCH /api/v1/examinations/{id}` with partial updates
- `POST /api/v1/examinations/{id}/duplicate` with various scenarios
- `POST /api/v1/examinations/{id}/status` with different transitions
- `DELETE /api/v1/examinations/{id}` with permission checks

#### 3.2.2 Request/Response Contract Tests
**Content Validation:**
- Request schema validation
- Response format verification
- Error response structure
- Pagination metadata
- Search result formatting

**Authentication/Authorization:**
- Missing authentication
- Invalid authentication
- Insufficient permissions
- Object-level authorization

#### 3.2.3 Database Integration
**Persistence Verification:**
- Create operation persistence
- Update operation persistence
- Archive operation persistence
- Duplicate operation persistence
- Status change persistence

**Data Integrity:**
- Foreign key constraints
- Unique constraint enforcement
- Concurrency handling
- Transaction rollback

### 3.3 PostgreSQL Integration Tests

**Scope:** Test database schema and operations
**Environment:** Fresh PostgreSQL database
**Isolation:** Test database only, no production impact

**Test Categories:**

#### 3.3.1 Schema Tests
**Database Structure:**
- Table existence and structure
- Column definitions and constraints
- Index creation and performance
- Foreign key relationships
- Default values and computed columns

#### 3.3.2 Migration Tests
**Migration Chain:**
- Migration order verification
- Migration idempotency
- Rollback capability
- Migration validation data

#### 3.3.3 Data Integrity Tests
**Data Operations:**
- CRUD operations
- Concurrency control
- Transaction isolation
- Constraint enforcement
- Performance benchmarks

### 3.4 Gate C Regression Tests

**Scope:** Ensure Gate C guarantees are maintained
**Coverage:** All existing Gate C tests continue to pass
**Verification:** New P3 operations don't create paths around Gate C

**Test Categories:**

#### 3.4.1 Security Tests
**Server-Authoritative Grading:**
- Response validation service integration
- Grading result verification
- Ungraded response handling
- Answer key validation

**Attempt Membership:**
- Snapshot integrity verification
- Membership validation
- Legacy attempt compatibility
- Security boundary enforcement

#### 3.4.2 Data Protection Tests
**Candidate DTO Protection:**
- Serialized payload verification
- Answer key disclosure prevention
- Grading metadata protection
- Authentication enforcement

**Historical Integrity:**
- Attempt snapshot verification
- Examination metadata preservation
- Archive protection
- Version control

#### 3.4.3 Integration Tests
**API Compatibility:**
- Existing endpoints continue to work
- Authentication patterns unchanged
- Authorization rules preserved
- Response formats maintained

### 3.5 Frontend Tests

**Scope:** Test user interface and client integration
**Framework:** Vitest with React Testing Library
**Coverage:** All P3 frontend components

**Test Files:**
- `tests/examination-library.test.tsx` (integration)
- `tests/examination-management.test.tsx` (E2E)
- `tests/examination-api-client.test.tsx` (API client)

**Test Categories:**

#### 3.5.1 Component Tests
**React Components:**
- Examination table component
- Search/filter/sort controls
- Create/update forms
- Pagination component
- Status badge components
- Action button components

#### 3.5.2 API Client Tests
**TanStack Query Integration:**
- Query key management
- Request/response serialization
- Error handling
- Caching behavior

#### 3.5.3 E2E Tests
**User Workflows:**
- Examination list navigation
- Examination creation workflow
- Examination editing workflow
- Examination duplication workflow
- Status change workflow
- Archive workflow
- Search and filter usage
- Role-based access testing

## 4. Test Execution Strategy

### 4.1 Test Order

**Recommended Execution Order:**
1. **Backend Unit Tests:** Individual component testing
2. **Backend Integration Tests:** Endpoint contract testing
3. **PostgreSQL Integration Tests:** Database verification
4. **Gate C Regression Tests:** Security verification
5. **Frontend Tests:** UI/integration testing
6. **E2E Tests:** Complete workflow testing

**Rationale:**
- Unit tests provide fast feedback
- Integration tests verify API contracts
- Database tests ensure persistence
- Security tests ensure compliance
- Frontend tests verify user experience

### 4.2 Test Environments

**Development Environment:**
- Full test suite execution
- Local database with Docker
- Fast feedback loop

**CI/CD Environment:**
- Complete test suite execution
- PostgreSQL container
- Code coverage reporting
- Test artifact storage

**Staging Environment:**
- Performance testing
- Load testing (optional)
- Security testing (optional)

### 4.3 Test Coverage Requirements

**Backend Coverage:**
- 100% of P3 code covered
- 100% of existing Gate C code covered
- 100% of existing authorization code covered

**Frontend Coverage:**
- All P3 components covered
- All API integration covered
- All user workflows covered

**Overall Coverage:**
- Minimize uncovered lines
- Document all intentional exclusions
- Provide clear coverage reports

## 5. Test Data Management

### 5.1 Test Data Strategy

**Seed Data:**
- Create examination with various lifecycle states
- Test with different user roles and permissions
- Create examinations with active/completed attempts
- Test with various pathway combinations (RN/PN)

**Data Cleanup:**
- All tests run in disposable databases
- Automatic cleanup after each test suite
- No test data persists between test runs

### 5.2 Test Scenario Definitions

**Test Scenarios:**
1. **Basic CRUD:** Create, read, update, delete operations
2. **Permission Testing:** All role combinations
3. **Lifecycle Testing:** All status transitions
4. **Search Testing:** All filter combinations
5. **Duplication Testing:** Multiple duplication scenarios
6. **Archive Testing:** Archive with/without attempts
7. **Error Testing:** All error conditions
8. **Performance Testing:** Large dataset handling

## 6. Test Automation

### 6.1 CI/CD Integration

**GitHub Actions:**
- Backend test execution
- Frontend test execution
- Code coverage reporting
- Test artifact upload

**Azure DevOps:**
- Test pipeline configuration
- Test environment setup
- Test result reporting
- Release gate validation

### 6.2 Test Reporting

**Test Reports:**
- JUnit XML format for CI
- HTML test reports for manual review
- Code coverage reports
- Performance metrics

**Dashboard Integration:**
- Real-time test results
- Historical test trends
- Flaky test detection
- Performance baselines

## 7. Test Maintenance

### 7.1 Test Updates

**When to Update Tests:**
- API contract changes
- Validation rule changes
- Authorization policy changes
- Database schema changes
- Business logic changes

**Test Update Strategy:**
- Update test data first
- Update test logic second
- Update test expectations last
- Run full test suite

### 7.2 Test Cleanup

**Regular Maintenance:**
- Remove unused test code
- Clean up test data
- Update test documentation
- Remove deprecated test scenarios

## 8. Test Success Criteria

### 8.1 Backend Test Criteria

**P3.1 (Domain Foundation):**
- All examination domain tests passing
- All validation tests passing
- All authorization tests passing
- All Gate C regression tests passing

**P3.2 (CRUD Operations):**
- All create operation tests passing
- All read operation tests passing
- All update operation tests passing
- All archive operation tests passing

**P3.3 (Query and Discovery):**
- All search tests passing
- All filter tests passing
- All sort tests passing
- All pagination tests passing

**P3.4 (Duplication):**
- All duplication tests passing
- All security tests passing
- All integrity tests passing

### 8.2 Frontend Test Criteria

**Component Tests:**
- All P3 components rendering correctly
- All form validations working
- All API integrations functional
- All user interactions working

**Integration Tests:**
- All API client communications working
- All TanStack Query hooks functional
- All error states handled
- All loading states handled

**E2E Tests:**
- All user workflows complete
- All role-based access working
- All navigation paths functional
- All error scenarios handled

### 8.3 Regression Test Criteria

**Gate C Tests:**
- All 208 backend tests passing
- All 381 frontend tests passing
- No regression in existing functionality
- No weakening of security controls

**Authorization Tests:**
- All role-based access working
- All object-level authorization working
- No authorization bypass possible
- No privilege escalation possible

**Performance Tests:**
- All API responses within acceptable limits
- All database operations within acceptable limits
- No performance regressions introduced

## 9. Test Documentation

### 9.1 Test Documentation Requirements

**Test Plans:**
- Each test file with clear purpose
- Each test scenario with expected results
- Each test case with pass/fail criteria

**Test Results:**
- Full test execution reports
- Code coverage reports
- Performance benchmarks
- Security validation reports

### 9.2 Test Strategy Documentation

**Documentation Files:**
- `docs/exam-management-p3-test-strategy.md` (this document)
- Individual test file headers
- API contract documentation
- Test data documentation

**Update Strategy:**
- Update test strategy when test scope changes
- Update individual test files when test logic changes
- Update documentation regularly

## 10. Test Security

### 10.1 Test Data Security

**Sensitive Data Protection:**
- No real user data in tests
- Only test-specific data used
- All test data properly isolated
- No credentials in test code

### 10.2 Test Environment Security

**Environment Isolation:**
- Disposable databases only
- Test credentials only
- No production connections
- Network isolation where possible

### 10.3 Test Code Security

**Code Security:**
- No authentication bypass in tests
- No authorization bypass in tests
- No data exposure in tests
- No security testing shortcuts

## 11. Test Release Criteria

### 11.1 P3.1 Release Criteria

**Requirements:**
- All domain tests passing
- All validation tests passing
- All authorization tests passing
- All Gate C regression tests passing
- Code coverage > 90%
- Test documentation complete

**Acceptance Gates:**
- Backend tests: All passing
- Frontend tests: All passing
- Security tests: All passing
- Performance tests: All passing

### 11.2 P3.2+ Release Criteria

**Progressive Validation:**
- Each phase must pass before next phase
- All tests must pass at each phase
- Documentation must be updated at each phase
- Stakeholder approval required for each phase

### 11.3 Production Release Criteria

**Final Validation:**
- All 568 tests passing (208 backend + 381 frontend + new P3 tests)
- No security vulnerabilities introduced
- All Gate C guarantees maintained
- All authorization working correctly
- All performance requirements met
- All documentation complete

This Test Strategy provides a comprehensive framework for testing the PrepFord Examination Management P3 implementation while maintaining full compatibility with existing Gate C requirements and PrepFord quality standards.