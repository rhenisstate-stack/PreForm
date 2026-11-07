# Phase 8 Initial System Audit

**Project:** PrepFord NCLEX  
**Audit date:** 2026-11-07  
**Branch at audit start:** `feature/dotnet-backend-migration`  
**HEAD at audit start:** `e150f44` (`create the admin-blog-and-feedback web tests files`)  
**Scope:** Authentication, RBAC, routes and APIs, persistence/migrations, current feature modules, and baseline tests.

## 1. Executive summary

PrepFord already has a substantial single-identity foundation: a Next.js App Router application, an ASP.NET Core 8 API, PostgreSQL through EF Core/Npgsql, database-backed sessions, seeded roles and permissions, administrative user/role APIs, and existing learner, examination, question-bank, study, subscription, analytics, and security modules. The existing learner and administrative functionality should be extended rather than replaced.

The Phase 8 requirements are not yet implemented end to end. In particular, invitations are an in-memory frontend mock, role/session state contains a single effective role despite the many-to-many role table, and the staff, assignment, review, and notification workflows do not have the required persistence and API surfaces. Existing administrator endpoints also allow an ordinary `admin` to assign the `superadmin` role; this is a release-blocking privilege-governance gap for the proposed staff-management workflow.

**Readiness determination: AMBER — ready for architecture and staged implementation, not ready for release.** Before enabling staff provisioning, close the role-governance gap and verify changes against an isolated PostgreSQL test database. The deployed PostgreSQL schema was not inspected during this audit.

## 2. Audit method and evidence limits

The audit reviewed the current application source, EF Core model and migration files, current frontend routes, API controllers and authorization setup, relevant tests, and existing architecture/inventory reports. Source code was treated as more current than prior reports where they differed.

No production or shared database was connected to, queried, migrated, or modified. `appsettings.json` has an empty `DATABASE_URL`; the repository's PostgreSQL compose service defaults to database `prepford`. PostgreSQL integration tests require an isolated loopback database named `prepford_gateb_verification`, configured through `PREFORM_GATEB_TEST_CONNECTION_STRING`. That variable was unavailable during the baseline run, so deployed-schema state and migration application status remain unverified.

Existing project inventories and reports are historical references, not proof of current behavior. For example, the November 5 API inventory describes 17 controllers/52 endpoints; the current source has since added API areas and pages. Likewise, prior reports' test totals are historical only.

## 3. Repository baseline

- The initial `git status --short` was clean.
- Current branch at audit start was `feature/dotnet-backend-migration`; HEAD was `e150f44`.
- During the audit, worktree edits changed while commands were running. One status check found five modified files in the Study Guide management area; a later check showed those files no longer modified and `apps/web/src/lib/admin/navigation.tsx` modified instead. None were authored or overwritten by this audit. At the last status check, the observed unrelated edit was:
  - `apps/web/src/lib/admin/navigation.tsx`
- The Study Guide files observed earlier were:
  - `apps/api/Controllers/AdminStudyGuidesController.cs`
  - `apps/api/DTOs/AdminStudyGuideManagementDtos.cs`
  - `apps/api/DTOs/TopicQuizDtos.cs`
  - `apps/api/Services/Study/AdminStudyGuideService.cs`
  - `apps/web/src/app/api/admin/study-guides/[[...path]]/route.ts`
- This report is the only file created by this audit.

## 4. Existing architecture and authentication

### Architecture

- `apps/web` is the Next.js 16.4.3 / React 19 frontend, using the App Router and Next.js route handlers as a BFF.
- `apps/api` is an ASP.NET Core 8 Web API targeting PostgreSQL through EF Core 8 and Npgsql.
- The frontend API client signs BFF-to-API requests with the existing gateway HMAC scheme. Backend authentication uses the custom `PrepfordAuth` handler.
- The API session model stores a hash of the bearer token in PostgreSQL and checks session status, expiration, and a user's security version. The frontend has signed-cookie/session helpers; preserve the current login and logout flow and verify cross-layer revocation behavior when changing it.
- The API startup attempts EF Core migrations and seeding outside the `Testing` environment. Migration exceptions are logged as warnings and startup continues, so deployment readiness must not be inferred from a successful process start alone.

### Identity and account lifecycle

- `User` is the canonical identity and is related to sessions, roles, profile images, and audit records. No second identity system is needed.
- Passwords are hashed with ASP.NET Core's password hasher. Login creates a server session. Password reset infrastructure exists.
- There is no `EmailConfirmed`/email-verification state on the current `User` model.
- The administrator account-creation request accepts a password and a list of role names. Existing email addresses are rejected rather than being linked to or extended as existing learner identities.
- The only registered email sender found is `DevelopmentEmailSender`; it logs password-reset links and does not provide production delivery. No staff invitation email can be considered operational.

## 5. Roles, permissions, and enforcement

### Existing role inventory

The idempotent catalog seeder creates these canonical roles:

| Role | Current intended responsibility |
|---|---|
| `superadmin` | System authority |
| `admin` | Operational administration |
| `content_manager` | Curriculum and question-bank management |
| `exam_manager` | Examination management |
| `reviewer` | Content review |
| `instructor` | Faculty/content authoring |
| `support` | Learner support |
| `candidate` | Learner |

`RoleHierarchy` also recognizes `administrator` as an alias for `admin`. The roles proposed in the Phase 8 prompt (for example billing manager, question author, analyst, and content editor) are not seeded as distinct roles; some responsibilities may be represented by permissions after reconciliation.

### Existing permission infrastructure

`Roles`, `Permissions`, `RolePermissions`, and `UserRoles` are persisted. The current permission catalog includes user, role, audit, security, examination, content/question, question-type, subscription, and system permissions. `PermissionAuthorizationHandler` evaluates role-permission joins from the database, and policies are registered for catalog permissions.

This is a useful base, but it does not yet implement the requested complete authorization model:

- `UserRoles` supports multiple assigned roles, but `UserSession.Role` and the authenticated role claim carry one effective/primary role. Role-based policies use that claim; permission evaluation queries all database role assignments. Therefore role-policy and permission-policy behavior can differ for multi-role users.
- There is no direct-user-permission model, role expiry, scope model, staff assignment, resource assignment, or assignment-based authorization handler.
- The BFF's `ALLOWED_ADMIN_ROLES` and frontend capability checks do not exactly match the backend role/policy catalog. They must be reconciled before exposing additional workspaces.
- No current-user workspace/permission/assignment APIs or server-enforced workspace-switching lifecycle were found.

### Confirmed privilege-governance risk

`AdminUsersController` applies `RequireAdmin` to user creation and role assignment. Its create request accepts arbitrary role names, and the role-assignment endpoint resolves any existing role without requiring the actor to be a Superadmin or applying a role-assignment ceiling. Consequently, an ordinary `admin` can assign `superadmin`. `AdminRolesController` also uses `RequireAdmin` for custom role and permission administration. These rules do not satisfy the prompt's prohibitions on unauthorized Superadmin assignment, self-promotion, and privilege escalation.

Other useful existing controls include last-active-Superadmin protection for suspension/removal, session revocation and security-version increments on account/role changes, and audit records for role changes.

## 6. API and frontend route inventory

### Existing API areas

The API currently has controllers for authentication, profile and security sessions, admin users and roles/permissions, audit logs, IP rules, monitoring and reports, subscriptions/monetization, question types/questions/media, curriculum, examinations/attempts, study guides, AI study functions, checkout/payment webhooks, entitlements, and public catalog data.

Many endpoints use `[Authorize]`, named role policies, or `Permission:*` policies. The authorization model is mixed rather than uniformly resource- and assignment-based. There is no ASP.NET invitation controller or invitation-acceptance API in the current source.

### Existing frontend routes

- Public marketing, registration/sign-in, profile, and learner routes exist.
- The learner workspace is under `/dashboard`, including study guides, notes, flashcards, review, quizzes, and videos.
- The administrative workspace has a broad `/admin/*` route tree, including users, roles, audit logs, examinations, questions/question repository, study-guide management, subscriptions, reports, monitoring, media, feedback, blog, videos, security, and AI.
- No dedicated `/instructor`, `/reviewer`, `/content-editor`, `/question-author`, `/question-reviewer`, `/examination-manager`, `/billing`, `/support`, or `/analytics` workspace route tree was found.
- Navigation/client capability filtering exists, but it is not a substitute for backend authorization.

### Invitation flow evidence

`apps/web/src/lib/invitation-service.ts` holds invitation records in process memory and initializes sample records. Its BFF routes call that service; listing may fall back to the same local store. The implementation has no database persistence, cryptographic single-use token, token hash, acceptance endpoint, role-assignment transaction, or email delivery. There is no invitation acceptance page/API in the current route tree. This feature is a mock workflow, not an operational invitation system.

## 7. Existing module integration matrix

| Module | Current evidence and status | Phase 8 implication |
|---|---|---|
| Examination management | Existing examination/revision models, lifecycle services, APIs, admin routes, validation, and tests. | Extend existing governance; do not bypass review/publication validation. |
| Question bank | Existing question/type/media models, permission-protected API, question authoring routes, and media handling. | Add workflow/assignment integration to this canonical bank; do not create a duplicate bank. |
| Study guide management | Existing curated-guide and version models, admin APIs/routes, plus learner study APIs. | Reuse current content and version structures; distinguish curated instructional content from personal notes. |
| Notes | Existing learner-owned notes/versioning and learner routes. | Does not establish staff-authored notes, review assignment, or publication workflow. |
| Flashcards | Existing learner flashcard/deck/review APIs and spaced-repetition service. | Existing learner capability is to be preserved; no staff review workflow was found. |
| Review sessions | Existing learner review-session models/services/routes. | This is learner revision, not the requested reviewer quality-assurance workflow. |
| Topic quizzes | Existing learner quiz configuration/attempt/response models and routes. | No staff authoring/review assignment lifecycle found. |
| Subscription management | Existing plan, transaction, entitlement, manual authorization models and admin APIs/UI. | Reuse; retain backend authorization and audit around manual authorizations. |
| Learner management | Existing paginated admin users list/detail, status changes, role assignments, session revocation, and UI. | Provisioning must extend existing identities and not create duplicate learners. |
| Analytics/reporting | Existing learner analytics, admin reporting, CSV exports, and admin reports UI. | Role/scope-aware aggregate access and export auditing remain to be implemented. |
| Notifications | UI notification/toast components exist, but no persisted staff notification entity/service was found in the API model. | Add to existing notification infrastructure only if further inspection establishes one; do not rely on toasts as workflow notifications. |
| Profile images | Existing user profile image model/API and upload validation. | Reuse for optional staff images. |
| Audit logs | Existing `AuditLog` model, admin read APIs/UI, and multiple security/administrative write sites. | Extend for invitation, assignment, review, publication, and sensitive exports; preserve read-only ordinary CRUD. |
| System settings/security | Existing session policy, session monitoring, and IP rules APIs/UI. | This is not a general system-configuration workspace; do not conflate the two. |
| AI Study Studio | Existing AI governance/provider, study plan/tutor models and learner study functions. | Preserve released behavior and distinguish it from planned capabilities. |

No staff profile/department, invitation, review assignment/decision, content workflow, or notification tables were found in `AppDbContext`.

## 8. Database and migration findings

- PostgreSQL remains the configured database engine; the compose file's default database name is `prepford`.
- EF Core models and migration source are under `apps/api/Data/AppDbContext.cs` and `apps/api/Migrations/`. The source contains migrations numbered through `0018`, including identity/RBAC, sessions/security, questions/media, examinations, monetization, and study-guide changes.
- The test fixture explicitly restricts PostgreSQL integration tests to the isolated loopback `prepford_gateb_verification` database.
- The deployed database's actual schema, applied migration table, connection target, and pending migration state were not inspected. No production migration should be generated or applied based on this code-only audit.
- The baseline test run did not have the required isolated PostgreSQL test connection. Use a disposable/isolated PostgreSQL database to verify migrations and relational constraints before adding Phase 8 schema.

## 9. Baseline test results

Historical reports and the Phase 8 prompt cite earlier passing totals. Those totals were not treated as the current baseline.

### Backend

Command: `dotnet test apps/api/Tests/Preform.Api.Tests.csproj --no-restore`

- Build completed.
- **468 passed, 32 failed, 0 skipped; 500 total.**
- **30 failures** were PostgreSQL integration tests blocked because `PREFORM_GATEB_TEST_CONNECTION_STRING` was not configured for the required isolated database.
- Two non-PostgreSQL failures were reported:
  - `QuestionTypesControllerTests.GetQuestionTypes_ExposesSafeVersionedMetadataWithoutDatabaseIds`
  - `Phase3AssessmentTests.ExamAttemptsController_GetAttempts_WithMissingExam_ReturnsSuccessful200Without500`

### Frontend

Command: `npm test`

The full Vitest command was stopped after more than ten minutes because the worktree was changing concurrently; no final suite total or exit status is claimed. At least five failing test files had been reported at that point: `admin-examinations-workflow-consolidation.test.tsx`, `authentication-upgrade.test.tsx`, `learner-dashboard-security-center.test.tsx`, `dashboard.test.tsx`, and `study-studio.test.tsx`; the latter included a test timeout. These observations are not a completed frontend baseline. Capture a final Vitest summary against a stable worktree before implementation sign-off.

## 10. Key gaps and implementation gates

1. **Close privileged role-assignment escalation.** Require Superadmin-level authorization and enforce an explicit assignable-role policy for create/assign/remove operations; prevent self-promotion and protect the final active Superadmin in concurrent operations.
2. **Replace invitation mock with a persisted lifecycle.** Add hashed, single-use, expiring tokens; transactional acceptance; revocation/replay protections; audit events; and a configured email provider. Do not treat generated links or mock data as delivery.
3. **Define the multi-role contract.** Preserve all role assignments in the effective authorization model and expose workspaces/permissions server-side; do not rely on one effective role or frontend state for workspace switching.
4. **Add resource/scope assignment enforcement.** Instructors and reviewers need server-enforced RN/PN/resource/assignment boundaries before their workspaces can be operational.
5. **Add review and content governance.** Persist assignments, decisions, comments, revision history, conflict-of-interest/self-approval protections, and publication state; reuse existing question and guide content.
6. **Verify the live PostgreSQL migration baseline.** Provision the isolated test database and compare deployed schema/migration history before introducing additive migrations. Do not reset or target production during this work.
7. **Reconcile API/BFF/frontend role rules.** Current policy and guard sets differ, and generic admin authorization is broader than individual actions should be.
8. **Complete and record a reproducible test baseline.** The current backend suite is red and the frontend suite did not finish during this audit; resolve/triage those results before using them as regression gates.

## 11. Existing functionality to preserve

Keep the current authentication and account model; the `/dashboard` learner experience and RN/PN separation; subscriptions and entitlements; exam lifecycle and learner attempt security; question-type registry and media validation; curated study guides, personal notes, flashcards, review sessions, quizzes, and AI Study Studio; profile images; analytics/reports; audit and session security; and existing administrator/Superadmin functionality.

## 12. Final audit determination

The architecture is suitable for additive Phase 8 work, but the staff/invitation/workspace requirements are not presently an integrated feature. The audit is complete; implementation may proceed in controlled, independently testable slices after the role-assignment defect is addressed and isolated PostgreSQL verification is available. This report does not certify production database state, email delivery, or release readiness.
