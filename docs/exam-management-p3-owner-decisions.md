# PrepFord Examination Management — P3 Owner Decisions

## 1. Lifecycle Policy Decisions

### 1.1 Examination Lifecycle States

**Decision:** Adopt 6-state lifecycle model
- **Draft** - Can be created, edited, duplicated
- **InReview** - Under review, cannot be edited
- **Approved** - Reviewed, ready for publication
- **Published** - Live, accessible to candidates
- **Archived** - Retired, preserved with history
- **Retired** - Permanently retired, cannot be restored

**Rationale:** Provides clear operational boundaries while maintaining historical integrity.

### 1.2 Examination Creation Default

**Decision:** New examinations always created as Draft
- Creates immediate opportunity for review and approval
- Prevents accidental public exposure
- Allows for thorough validation before publication
- Maintains administrative control over examination availability

### 1.3 Review and Approval Process

**Decision:** Designated roles control review and approval
- **InReview:** Content Manager, Exam Manager can initiate review
- **Approved:** Content Manager, Exam Manager can approve
- **Rejected:** Content Manager, Exam Manager can reject with reason
- **Published:** Exam Manager, Content Manager can publish

**Rationale:** Ensures comprehensive review from both content and examination perspective.

### 1.4 Published Examination Editing

**Decision:** Published examinations require new version for edits
- Original published examination remains immutable
- Editing creates new version (Draft) entering review cycle
- Maintains historical integrity of published content
- Allows continuous improvement of examination content

### 1.5 Archive Policy

**Decision:** Examinations can be archived with restrictions
- Can be archived with active attempts (with warning)
- Can be archived with completed attempts (allowed)
- Archived examinations are read-only for authorized users
- Restorable within 30-day window
- Permanent retirement option after 30 days

### 1.6 Deletion Policy

**Decision:** Examination deletion prohibited when attempts exist
- Soft delete (archive) preferred over hard delete
- Prevents loss of historical data and results
- Maintains audit trail and data integrity
- Administrative override available for critical issues

### 1.7 Duplication Default

**Decision:** Duplication always produces Draft examination
- Prevents accidental publication of copies
- Allows review of duplicated examination
- Maintains audit trail of duplication actions
- Enables iterative examination development

### 1.8 Examination Code Strategy

**Decision:** Examination code unique per pathway (RN/PN)
- Code format: `{PATHWAY}-{TYPE}-{SEQUENTIAL}`
- Example: `RN-PRACT-001`, `PN-PRACT-001`
- Allows pathway-specific examination management
- Maintains backward compatibility with existing systems
- Facilitates pathway-based filtering and reporting

### 1.9 Search and Archive Visibility

**Decision:** Search excludes archived examinations by default
- Focus on active and published examinations
- Separate API endpoint for archived examinations
- Admin controls for archived examination access
- Maintains clean user experience for active management

### 1.10 Question Count Display

**Decision:** Display estimated question counts with clear indicators
- Show counts when question bank integration exists
- Show placeholder counts (e.g., "~50 questions") when integration incomplete
- Clear messaging about availability status
- Prevent user confusion about incomplete features

### 1.11 Examination Metadata Snapshotting

**Decision:** Capture essential examination metadata at attempt start
- Capture: Title, duration, passing score, instructions
- Capture: Pathway, type, level, category
- Store with `ExamAttemptQuestion` snapshot
- Ensure historical integrity of attempt metadata

## 2. Authorization Policy Decisions

### 2.1 Role-Based Access Control

**Decision:** Implement granular examination permissions
- **Read Access:** Superadmin, Admin, Content Manager, Exam Manager
- **Create Access:** Superadmin, Admin, Content Manager
- **Update Access:** Superadmin, Admin, Content Manager (Draft), Exam Manager (Published)
- **Duplicate Access:** Superadmin, Admin, Exam Manager
- **Status Change Access:** Superadmin, Admin, Exam Manager, Content Manager
- **Archive Access:** Superadmin, Admin, Exam Manager

**Rationale:** Provides necessary access while maintaining security boundaries and operational control.

### 2.2 Object-Level Access Rules

**Decision:** Multiple levels of object-level authorization
- **Ownership:** Draft examinations editable by creator
- **Publication Status:** Published examinations read-only for candidates
- **Archive Status:** Archived examinations read-only, restorable
- **Lifecycle State:** InReview/Approved require specific role permissions

### 2.3 Authorization Integration

**Decision:** Extend existing authorization framework
- Build on `RoleHierarchy` and `PrepfordAuthHandler`
- Add examination-specific authorization policies
- Maintain existing authentication patterns
- Integrate with existing audit logging

## 3. Technical Implementation Decisions

### 3.1 Domain Architecture

**Decision:** Minimal, focused domain design
- Examination entity as core domain object
- Examination management service for business logic
- EF Core with additive schema changes only
- Maintain existing Gate C integration
- Keep implementation simple and maintainable

### 3.2 API Contract Design

**Decision:** RESTful API with clear resource hierarchy
- Resource: `/api/v1/examinations`
- Methods: GET, POST, PATCH, DELETE with appropriate semantics
- Request/Response DTOs for all operations
- Comprehensive error responses
- Audit logging for all operations

### 3.3 Validation Strategy

**Decision:** Server-side validation with comprehensive rules
- Required field validation
- Format validation for IDs, codes, etc.
- Range validation (duration, scores, etc.)
- Business rule validation (permissions, transitions)
- Duplicate detection and prevention

### 3.4 Concurrency Handling

**Decision:** Row-version concurrency for examination updates
- Add `RowVersion` property to `Exam` entity
- Optimistic concurrency for update operations
- Prevent lost updates in concurrent scenarios
- Simple to implement and maintain

### 3.5 Audit Event Design

**Decision:** Comprehensive audit logging for all operations
- Examination created, updated, archived, duplicated
- Status changes with reason tracking
- Permission-based access logging
- Full actor identity and context preservation

## 4. Performance and Scalability Decisions

### 4.1 Query Optimization

**Decision:** Indexed search and filtering
- Composite indexes for common query patterns
- Full-text search for examination content
- Pagination with efficient keyset or offset
- Query result projection for performance

### 4.2 Caching Strategy

**Decision:** Multi-level caching approach
- Examination list cache by role/filter combination
- Examination detail cache for 5 minutes
- Invalidation on write operations
- Memory-efficient caching for large datasets

### 4.3 Database Schema

**Decision:** Additive schema changes only
- No breaking changes to existing schema
- New fields nullable with sensible defaults
- New indexes for performance
- Maintained all foreign key relationships

## 5. Testing and Quality Decisions

### 5.1 Testing Strategy

**Decision:** Comprehensive test coverage with progressive validation
- Unit tests for all new components
- Integration tests for all API endpoints
- PostgreSQL integration tests for database operations
- Gate C regression tests for security verification
- Frontend tests for all P3 components
- E2E tests for user workflows

### 5.2 Test Automation

**Decision:** Full CI/CD integration
- Automated test execution in CI/CD pipeline
- Code coverage reporting
- Performance benchmarking
- Security testing integration

### 5.3 Quality Gates

**Decision:** Phase-based acceptance criteria
- P3.1: Domain foundation ready
- P3.2: CRUD operations working
- P3.3: Query and discovery functional
- P3.4: Duplication safe and working
- P3.5: Frontend integration complete
- P3.6: Full regression testing

## 6. Migration and Deployment Decisions

### 6.1 Migration Strategy

**Decision:** Zero-downtime deployment with backward compatibility
- Additive database schema changes
- New API endpoints only
- Existing functionality preserved
- Rollback capability for each phase

### 6.2 Deployment Sequencing

**Decision:** Phased rollout with feature flags
- P3.1: Deploy domain foundation
- P3.2: Deploy CRUD operations
- P3.3: Deploy search and filtering
- P3.4: Deploy duplication functionality
- P3.5: Deploy frontend integration
- P3.6: Full production release

### 6.3 Monitoring and Alerting

**Decision:** Comprehensive monitoring and alerting
- API performance monitoring
- Error rate alerting
- Audit log monitoring
- Security event detection

## 7. Risk Management Decisions

### 7.1 Risk Assessment

**Decision:** Document and mitigate all identified risks
- High risk: Examination editing during active attempts
- Medium risk: Search performance with large datasets
- Low risk: Database schema changes

### 7.2 Risk Mitigation

**Decision:** Proactive risk management approach
- Prevent risky operations through validation
- Maintain historical integrity through snapshots
- Implement comprehensive error handling
- Provide clear error messages and recovery paths

## 8. Documentation and Training Decisions

### 8.1 Documentation Requirements

**Decision:** Comprehensive documentation for all phases
- API contract documentation
- Implementation guides
- Testing strategies
- Deployment procedures
- Training materials

### 8.2 Training Requirements

**Decision:** Role-specific training materials
- Administrator training for examination management
- Content manager training for examination review
- Exam manager training for lifecycle management
- Candidate training for examination taking

## 9. Future Extensibility Decisions

### 9.1 Architecture Extensibility

**Decision:** Maintain extensibility for future enhancements
- Modular design for easy extension
- Plugin architecture for future features
- Configurable validation rules
- Extensible authorization framework

### 9.2 Technology Stack Decisions

**Decision:** Maintain current technology stack
- .NET 8 for backend
- PostgreSQL for database
- Next.js for frontend
- TanStack Query for state management
- Tailwind CSS for styling

## 10. Success Metrics and KPIs

### 10.1 Business Metrics

**Decision:** Track key performance indicators
- Examination creation rate
- Examination update frequency
- Candidate examination completion rate
- Administrative efficiency metrics
- System uptime and availability

### 10.2 Technical Metrics

**Decision:** Monitor technical performance indicators
- API response times
- Database query performance
- Memory usage
- Error rates
- Code coverage

## 11. Ongoing Maintenance Decisions

### 11.1 Support Model

**Decision:** Comprehensive support model
- 24/7 monitoring and alerting
- Rapid incident response
- Regular security updates
- Continuous improvement

### 11.2 Continuous Improvement

**Decision:** Regular enhancement and optimization
- User feedback integration
- Performance optimization
- Feature enhancement
- Bug fix prioritization

## 12. Stakeholder Communication

### 12.1 Reporting Requirements

**Decision:** Regular status reporting
- Weekly progress reports
- Monthly stakeholder meetings
- Quarterly business reviews
- Annual technology assessments

### 12.2 Change Management

**Decision:** Structured change management process
- Impact assessment for all changes
- Rollout planning and testing
- User communication and training
- Change documentation and approval

This Owner Decisions document provides the complete decision framework for the PrepFord Examination Management P3 implementation, ensuring consistent, quality-driven development while maintaining full compatibility with existing Gate C requirements and PrepFord operational standards.