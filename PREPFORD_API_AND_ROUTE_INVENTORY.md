# PREPFORD NCLEX — FEATURE EXPANSION PROGRAMME
## API AND ROUTE INVENTORY

**Deliverable 4 of 7: API & Route Inventory**  
**Document File:** `PREPFORD_API_AND_ROUTE_INVENTORY.md`  
**Repository Working Directory:** `C:\Users\gitau\Documents\PREform`  
**Branch:** `feature/dotnet-backend-migration`  
**Authority:** Product Owner  
**Date:** November 5, 2026  

---

## 1. Overview & Communication Architecture

PrepFord's communication model follows a 3-tier topology:
1. **Frontend Client Pages & Components:** React 19 client components running in the candidate or administrator browser.
2. **Next.js Route Handlers (BFF Tier):** Server-side TypeScript handlers running in Node.js 24 under `/api/*`. They manage the signed session cookie (`prepford_session`), strip sensitive tokens from client view, and construct HMAC-SHA256 signed gateway requests.
3. **ASP.NET Core Web API:** Enterprise REST API controllers running on Kestrel (.NET 8.0), protected by `PrepfordAuthHandler`, role policies, and PostgreSQL transactions.

---

## 2. ASP.NET Core Backend API Controller Inventory

The backend exposes **17 API controllers** containing **52 distinct endpoints**:

| Controller | Route Prefix | HTTP Verb | Endpoint Path | Method / Action | Auth Policy | Description / Contract |
|---|---|:---:|---|---|---|---|
| **HealthController** | `/api/v1/health` | `GET` | `/live` | `GetLive()` | Anonymous | Liveness probe (200 OK) |
| | | `GET` | `/ready` | `GetReady()` | Anonymous | Database connectivity probe (`PostgresHealthCheck`) |
| **ProgrammesController** | `/api/v1/programmes` | `GET` | `/` | `GetProgrammes()` | Anonymous | List active programmes (`RN`, `PN`) |
| | | `GET` | `/{id}` | `GetProgrammeById(id)` | Anonymous | Retrieve programme by GUID |
| | | `GET` | `/code/{code}` | `GetProgrammeByCode(code)` | Anonymous | Retrieve programme by code (`RN`, `PN`) |
| | | `POST` | `/` | `CreateProgramme(dto)` | `RequireContentManager` | Create new programme |
| **AuthController** | `/api/v1/auth` | `POST` | `/register` | `Register(dto)` | Anonymous | Candidate registration (defaults to `candidate` role) |
| | | `POST` | `/login` | `Login(dto)` | Anonymous | Credential authentication with session creation |
| | | `POST` | `/logout` | `Logout()` | Anonymous | Revokes current session token |
| | | `POST` | `/recover-sessions` | `RecoverSessions(dto)` | Anonymous (Rate-limited) | Decommissions stale sessions for locked-out user |
| | | `POST` | `/revoke-session` | `RevokeSession(dto)` | `[Authorize]` | Revoke targeted session |
| | | `POST` | `/validate-session` | `ValidateSession(dto)` | `[Authorize]` | Validate token freshness & security version |
| | | `GET` | `/session` | `GetCurrentSession()` | `[Authorize]` | Retrieve authenticated user profile & effective role |
| **SecurityController** | `/api/v1/security` | `GET` | `/sessions` | `GetLearnerSessions()` | `[Authorize]` | List active device sessions for authenticated user |
| | | `DELETE` | `/sessions/{sessionId}` | `RevokeLearnerSession(id)` | `[Authorize]` | Revoke specific session belonging to caller |
| | | `POST` | `/sessions/revoke-others` | `RevokeOtherSessions()` | `[Authorize]` | Revoke all sessions except caller's current device |
| | | `POST` | `/sessions/revoke-all` | `RevokeAllSessions()` | `[Authorize]` | Revoke all sessions including current device |
| | | `GET` | `/events` | `GetSecurityEvents()` | `[Authorize]` | Candidate-scoped security activity audit log |
| **AdminSecurityController** | `/api/v1/admin/security` | `GET` | `/metrics` | `GetSecurityMetrics()` | `RequireSuperAdmin` | Global session counts, device stats, active policies |
| | | `GET` | `/session-policy` | `GetSessionPolicy()` | `RequireSuperAdmin` | Retrieve active global session policy |
| | | `PUT` | `/session-policy` | `UpdateSessionPolicy(dto)` | `RequireSuperAdmin` | Update concurrent limits, idle/absolute timeouts |
| | | `POST` | `/session-policy/reset` | `ResetSessionPolicy()` | `RequireSuperAdmin` | Reset session policy to secure defaults |
| | | `GET` | `/sessions` | `GetAllActiveSessions()` | `RequireSuperAdmin` | Query all active system sessions across users |
| | | `POST` | `/sessions/{sessionId}/revoke` | `AdminRevokeSession(id)` | `RequireSuperAdmin` | Administratively terminate session with reason |
| | | `POST` | `/users/{userId}/revoke-sessions` | `AdminRevokeUserSessions(id)` | `RequireSuperAdmin` | Administratively terminate all sessions for a user |
| | | `GET` | `/events` | `GetSystemSecurityEvents()` | `RequireSuperAdmin` | Global administrative security audit trail |
| **ProfileController** | `/api/v1/profile` | `GET` | `/` | `GetProfile()` | `[Authorize]` | Retrieve candidate profile details |
| | | `PUT` | `/` | `UpdateProfile(dto)` | `[Authorize]` | Update display name, target exam date, reminders |
| | | `POST` | `/change-password` | `ChangePassword(dto)` | `[Authorize]` | Update password, increment SecurityVersion, rotate sessions |
| **ProfileImageController** | `/api/v1/profile/image` | `GET` | `/` | `GetProfileImage()` | `[Authorize]` | Stream user avatar binary (`bytea`) |
| | | `PUT` / `POST` | `/` | `UploadProfileImage(file)` | `[Authorize]` | Upload avatar PNG/JPEG (max 2MB, validates magic bytes) |
| | | `DELETE` | `/` | `DeleteProfileImage()` | `[Authorize]` | Remove avatar, reset to default SVG placeholder |
| **SubscriptionsController** | `/api/v1/subscriptions` | `GET` | `/` | `GetActivePlans()` | Anonymous | Retrieve active canonical subscription plans |
| | | `GET` | `/{idOrSlug}` | `GetPlanById(idOrSlug)` | Anonymous | Retrieve specific plan details |
| **AdminSubscriptionsController** | `/api/v1/admin/subscriptions` | `GET` | `/` | `GetAllPlans()` | `RequireAdmin` | List all subscription plans (active + archived) |
| | | `POST` | `/` | `CreatePlan(dto)` | `RequireAdmin` | Create new subscription plan |
| | | `PUT` | `/{idOrSlug}` | `UpdatePlan(id, dto)` | `RequireAdmin` | Update pricing, features, appearance colors |
| | | `DELETE` | `/{idOrSlug}` | `ArchivePlan(idOrSlug)` | `RequireAdmin` | Soft-delete / archive subscription plan |
| **CheckoutController** | `/api/v1/checkout` | `POST` | `/` | `CreateCheckoutSession(req)` | `[Authorize]` | Initiate checkout session (simulated sandbox or gateway) |
| | | `POST` | `/validate-promo` | `ValidatePromoCode(req)` | Anonymous | Validate discount code (`FUTURENURSE`, `NURSE10`, etc.) |
| **PaymentWebhookController** | `/api/v1/webhooks/payments` | `POST` | `/` | `HandleWebhook(req)` | Anonymous (Signature) | Process payment provider webhook with HMAC check |
| **EntitlementsController** | `/api/v1/entitlements` | `GET` | `/` | `GetEntitlements()` | `[Authorize]` | Compute candidate's active pathway entitlements |
| **QuestionTypesController** | `/api/v1/question-types` | `GET` | `/` | `GetQuestionTypes()` | Anonymous | List 18 cataloged question types and capability flags |
| | | `GET` | `/{key}` | `GetQuestionType(key)` | Anonymous | Retrieve question type descriptor by key |
| | | `POST` | `/validate` | `ValidateContract(dto)` | Anonymous | Validate question payload against type schema contract |
| **ExaminationsController** | `/api/v1/examinations` | `GET` | `/` | `GetExaminations(params)` | `[Authorize]` | Query examination families with status/pathway filters |
| | | `GET` | `/eligible-questions` | `GetEligibleQuestions()` | `[Authorize]` | Query question bank items eligible for revision inclusion |
| | | `GET` | `/{id}` | `GetExamination(id)` | `[Authorize]` | Get examination family by ID |
| | | `PATCH` | `/{id}` | `UpdateExaminationFamily(id)` | `[Authorize]` | Update family metadata |
| | | `POST` | `/` | `CreateExamination(req)` | `RequireExamManager` | Create sequential examination family (`RN-EX-*`) |
| | | `GET` | `/revisions/{revisionId}` | `GetRevision(id)` | `[Authorize]` | Get specific revision details and assigned questions |
| | | `PUT` | `/revisions/{revisionId}` | `UpdateRevision(id, req)` | `RequireExamManager` | Update revision settings (timed, passing score) |
| | | `GET` | `/revisions/{revisionId}/validate` | `ValidateRevision(id)` | `[Authorize]` | Validate readiness for submission/publication |
| | | `DELETE` | `/revisions/{revisionId}` | `DeleteDraftRevision(id)` | `RequireExamManager` | Delete draft revision |
| | | `GET` | `/revisions/{revisionId}/questions` | `GetRevisionQuestions(id)` | `[Authorize]` | List questions assigned to revision |
| | | `POST` | `/revisions/{revisionId}/questions` | `AddQuestionToRevision(id)` | `RequireExamManager` | Assign question to exam revision |
| | | `DELETE` | `/revisions/{revId}/questions/{qId}` | `RemoveQuestion(revId, qId)` | `RequireExamManager` | Remove question from revision |
| | | `PUT` | `/revisions/{revId}/questions/order` | `ReorderQuestions(revId)` | `RequireExamManager` | Update question display order array |
| | | `GET` | `/{id}/revisions` | `GetRevisions(id)` | `[Authorize]` | List revision history for examination family |
| | | `POST` | `/{id}/duplicate` | `DuplicateExamination(id)` | `RequireExamManager` | Deep copy examination family and questions |
| | | `POST` | `/{id}/revisions` | `CreateRevision(id)` | `RequireExamManager` | Allocate next sequential revision (`RevisionNumber + 1`) |
| | | `POST` | `/revisions/{revId}/submit` | `SubmitForReview(revId)` | `RequireExamManager` | Transition `Draft` $\rightarrow$ `InReview` |
| | | `POST` | `/revisions/{revId}/recommend` | `RecommendForApproval(revId)`| `RequireContentManager` | Transition `InReview` $\rightarrow$ Recommendation |
| | | `POST` | `/revisions/{revId}/return` | `ReturnToDraft(revId)` | `RequireContentManager` | Return revision from review back to `Draft` |
| | | `POST` | `/revisions/{revId}/approve` | `ApproveRevision(revId)` | `RequireAdmin` | Transition `InReview` $\rightarrow$ `Approved` |
| | | `POST` | `/revisions/{revId}/publish` | `PublishRevision(revId)` | `RequireAdmin` | Transition `Approved` $\rightarrow$ `Published` |
| | | `POST` | `/revisions/{revId}/archive` | `ArchiveRevision(revId)` | `RequireAdmin` | Transition `Published` $\rightarrow$ `Archived` |
| | | `POST` | `/revisions/{revId}/restore` | `RestoreRevision(revId)` | `RequireAdmin` | Restore `Archived` back to `Published` |
| | | `POST` | `/revisions/{revId}/retire` | `RetireRevision(revId)` | `RequireAdmin` | Transition to terminal `Retired` state |
| | | `POST` | `/revisions/{revId}/emergency-retire` | `EmergencyRetire(revId)` | `RequireSuperAdmin` | Immediate override retirement bypassing workflow |
| **ExamAttemptsController** | `/api/v1/attempts` & `/api/v1/exam-attempts` | `GET` | `/` | `GetAttempts()` | `[Authorize]` | List completed attempt summaries for caller |
| | | `GET` | `/{id}` | `GetAttemptDetail(id)` | `[Authorize]` | Retrieve attempt review (rationales hidden if in-progress) |
| | | `POST` | `/{id}/reauthenticate` | `ReauthenticateAttempt(id)` | `[Authorize]` (Rate-limited) | Reauth mid-exam on token expiration |
| | | `POST` | `/` | `StartAttempt(req)` | `[Authorize]` | Initialize attempt, snapshot metadata, freeze question set |
| | | `POST` | `/{id}/responses` | `SubmitAnswer(id, req)` | `[Authorize]` | Submit individual question response |
| | | `POST` | `/{id}/submit` | `FinalizeAttempt(id)` | `[Authorize]` | Finalize attempt, calculate score, assign performance tier |
| | | `POST` | `/sync` | `SyncAssessmentAttempt(req)` | `[Authorize]` | Synchronize completed client assessment to database |
| **StudyController** | `/api/v1/study` | `GET` | `/overview` | `GetStudyOverview()` | `[Authorize]` | Cards due, retention rate, mastery statistics |
| | | `GET` | `/flashcards/decks` | `GetDecks(includeArchived)` | `[Authorize]` | List personal study decks for authenticated user |
| | | `POST` | `/flashcards/decks` | `CreateDeck(req)` | `[Authorize]` | Create personal flashcard deck |
| | | `GET` | `/flashcards/decks/{deckId}` | `GetDeck(deckId)` | `[Authorize]` | Get deck metadata by ID |
| | | `GET` | `/flashcards/decks/{deckId}/cards` | `GetDeckCards(deckId)` | `[Authorize]` | List flashcards belonging to deck |
| | | `POST` | `/flashcards/decks/{deckId}/cards` | `AddCardToDeck(deckId, req)` | `[Authorize]` | Add custom card to deck |
| | | `POST` | `/flashcards/decks/{deckId}/archive` | `ArchiveDeck(deckId)` | `[Authorize]` | Soft-delete / archive personal deck |
| | | `GET` | `/flashcards/due` | `GetDueCards(programme)` | `[Authorize]` | Single-table indexed scan for cards due for SM-2 review |
| | | `DELETE` | `/flashcards/cards/{cardId}` | `DeleteCard(cardId)` | `[Authorize]` | Delete flashcard |
| | | `POST` | `/flashcards/cards/{cardId}/review` | `SubmitCardReview(cardId, req)`| `[Authorize]` | Submit SM-2 recall rating (0-3), calculate next DueAt |
| | | `GET` | `/flashcards/cards/{cardId}/reviews` | `GetCardReviews(cardId)` | `[Authorize]` | Review history audit for card |
| **TestimonialsController** | `/api/v1/testimonials` | `GET` | `/` | `GetApprovedTestimonials()` | Anonymous | List approved testimonials for public display |
| | | `POST` | `/` | `SubmitTestimonial(req)` | Anonymous / Auth | Submit testimonial for moderation |
| | | `PATCH` | `/admin/testimonials/{id}/status` | `ModerateTestimonial(id, req)` | `RequireAdmin` | Approve or reject submitted testimonial |

---

## 3. Next.js App Router BFF Route Handlers

The Next.js BFF layer exposes **26 route handlers** located in `apps/web/src/app/api/`:

| BFF Route Path | HTTP Methods | Upstream .NET API Endpoint | Description |
|---|:---:|---|---|
| `/api/auth/login` | `POST` | `/api/v1/auth/login` | Validates credentials, sets `prepford_session` cookie |
| `/api/auth/register` | `POST` | `/api/v1/auth/register` | Registers candidate, auto-issues session cookie |
| `/api/auth/logout` | `POST` | `/api/v1/auth/logout` | Clears `prepford_session` cookie and revokes session |
| `/api/auth/session` | `GET` | `/api/v1/auth/session` | Resolves caller identity from session cookie |
| `/api/auth/google` | `GET` | N/A (Google OAuth) | Redirects candidate to Google OpenID Connect |
| `/api/auth/google/callback` | `GET` | `/api/v1/auth/login` | Exchanges OAuth code, issues platform session |
| `/api/security/sessions` | `GET` | `/api/v1/security/sessions` | Retrieves learner's active sessions |
| `/api/security/sessions/[sessionId]` | `DELETE` | `/api/v1/security/sessions/{id}` | Revokes specified learner session |
| `/api/security/sessions/revoke-others` | `POST` | `/api/v1/security/sessions/revoke-others` | Terminates all other device sessions |
| `/api/security/sessions/revoke-all` | `POST` | `/api/v1/security/sessions/revoke-all` | Terminates all sessions across devices |
| `/api/security/events` | `GET` | `/api/v1/security/events` | Retrieves candidate security activity history |
| `/api/profile` | `GET`, `PUT` | `/api/v1/profile` | Fetches and updates learner profile details |
| `/api/profile/image` | `GET`, `POST`, `DELETE` | `/api/v1/profile/image` | Streams or uploads avatar binary |
| `/api/profile/change-password` | `POST` | `/api/v1/profile/change-password` | Updates candidate password |
| `/api/subscriptions` | `GET` | `/api/v1/subscriptions` | Proxies canonical subscription catalog |
| `/api/checkout` | `POST` | `/api/v1/checkout` | Initiates checkout session |
| `/api/entitlements` | `GET` | `/api/v1/entitlements` | Proxies user entitlement status |
| `/api/study/[[...path]]` | `GET`, `POST`, `DELETE` | `/api/v1/study/*` | Catch-all proxy forwarding to StudyController |
| `/api/attempts/[id]/reauthenticate` | `POST` | `/api/v1/attempts/{id}/reauthenticate` | In-exam session reauth proxy |
| `/api/questions/[id]/flag` | `POST` | In-memory / TanStack Query | Candidate question flagging for clinical review |
| `/api/testimonials` | `GET`, `POST` | `/api/v1/testimonials` | Proxies testimonial submission and listing |
| `/api/admin/subscriptions` | `GET`, `POST` | `/api/v1/admin/subscriptions` | Admin plan listing and creation |
| `/api/admin/subscriptions/[id]` | `PUT`, `DELETE` | `/api/v1/admin/subscriptions/{id}` | Admin plan update and archival |
| `/api/admin/security/metrics` | `GET` | `/api/v1/admin/security/metrics` | Admin security overview metrics |
| `/api/admin/security/session-policy` | `GET`, `PUT` | `/api/v1/admin/security/session-policy` | Admin session security policy tuning |
| `/api/admin/security/session-policy/reset` | `POST` | `/api/v1/admin/security/session-policy/reset`| Admin policy reset to defaults |
| `/api/admin/security/sessions` | `GET` | `/api/v1/admin/security/sessions` | Query all active system sessions |
| `/api/admin/security/sessions/[sessionId]/revoke` | `POST` | `/api/v1/admin/security/sessions/{id}/revoke`| Revoke user session administratively |
| `/api/admin/security/users/[userId]/revoke-sessions`| `POST` | `/api/v1/admin/security/users/{id}/revoke-sessions`| Terminate all sessions for a user |
| `/api/admin/security/events` | `GET` | `/api/v1/admin/security/events` | Global admin security events stream |
| `/api/admin/examinations` | `GET`, `POST` | `/api/v1/examinations` | List and create examination families |
| `/api/admin/examinations/[id]` | `GET`, `PATCH` | `/api/v1/examinations/{id}` | Get and update examination family |
| `/api/admin/examinations/[id]/duplicate` | `POST` | `/api/v1/examinations/{id}/duplicate` | Duplicate examination family |
| `/api/admin/examinations/[id]/revisions` | `GET`, `POST` | `/api/v1/examinations/{id}/revisions` | Revision management |
| `/api/admin/examinations/eligible-questions` | `GET` | `/api/v1/examinations/eligible-questions` | Question picker data source |
| `/api/admin/examinations/revisions/[revisionId]` | `GET`, `PUT`, `DELETE` | `/api/v1/examinations/revisions/{id}` | Revision editor endpoints |
| `/api/admin/examinations/revisions/[revisionId]/questions` | `GET`, `POST` | `/api/v1/examinations/revisions/{id}/questions`| Assign questions to revision |
| `/api/admin/examinations/revisions/[revisionId]/questions/order` | `PUT` | `/api/v1/examinations/revisions/{id}/questions/order`| Question reordering |
| `/api/admin/examinations/revisions/[revisionId]/questions/[questionId]`| `DELETE` | `/api/v1/examinations/revisions/{rev}/questions/{q}`| Remove question from revision |
| `/api/admin/examinations/revisions/[revisionId]/validate` | `GET` | `/api/v1/examinations/revisions/{id}/validate` | Pre-submission validation |
| `/api/admin/examinations/revisions/[revisionId]/[action]` | `POST` | `/api/v1/examinations/revisions/{id}/{action}` | Lifecycle transition proxy (`submit`, `approve`, `publish`, etc.) |

---

## 4. Frontend Route & Page Inventory

PrepFord includes **31 public, learner, and administrative pages**:

```
apps/web/src/app/
├── Public & Marketing Routes (18 pages)
│   ├── / (page.tsx + home-client.tsx)
│   ├── /about
│   ├── /blog
│   ├── /blog/[slug]
│   ├── /cart
│   ├── /contact
│   ├── /courses
│   ├── /educators
│   ├── /faq
│   ├── /features
│   ├── /nclex-rn
│   ├── /nclex-pn
│   ├── /privacy-policy
│   ├── /programmes/[programme] (RN/PN dynamic route)
│   ├── /subscriptions
│   ├── /terms-and-conditions
│   └── /testimonials
├── Authentication Routes (2 pages)
│   ├── /sign-in
│   └── /sign-up
├── Learner Workspace Routes (6 pages)
│   ├── /profile
│   ├── /dashboard (page.tsx + page-client.tsx)
│   ├── /dashboard/settings/security (Security Center)
│   ├── /dashboard/study (Study Studio Overview)
│   ├── /dashboard/study/flashcards (Flashcard Decks Manager)
│   ├── /dashboard/study/review (SM-2 Spaced Repetition Player)
│   └── /dashboard/study/quizzes (Quick Topic Drills)
└── Administrative Studio Routes (5 pages)
    ├── /admin (Overview dashboard)
    ├── /admin/examinations (Examination Family discovery)
    ├── /admin/examinations/[id] (Family overview & revisions)
    ├── /admin/examinations/[id]/revisions/[revisionId] (Revision editor)
    ├── /admin/question-types (Question type capability browser)
    ├── /admin/security/sessions (Security Center & Session Management)
    └── /admin/subscriptions (Subscription Plan catalog manager)
```

---

## 5. End-to-End Route Mapping Matrix

This matrix traces the complete end-to-end path from user UI interaction down to backend database tables:

| User Feature / Route | Frontend Client Component | BFF Handler | Backend API Endpoint | Controller & Service | Authoritative DB Entity |
|---|---|---|---|---|---|
| **View Catalog** (`/subscriptions`) | `subscriptions/page-client.tsx` | `/api/subscriptions` | `GET /api/v1/subscriptions` | `SubscriptionsController` $\rightarrow$ `SubscriptionService` | `SubscriptionPlans` |
| **Simulated Checkout** (`/cart`) | `cart/page-client.tsx` | `/api/checkout` | `POST /api/v1/checkout` | `CheckoutController` $\rightarrow$ `CheckoutService` | `Orders`, `UserSubscriptions` |
| **Check Entitlements** (`/dashboard`) | `DashboardClient.tsx` | `/api/entitlements` | `GET /api/v1/entitlements` | `EntitlementsController` $\rightarrow$ `CheckoutService` | `UserSubscriptions`, `Users` |
| **Candidate Sign In** (`/sign-in`) | `sign-in/page-client.tsx` | `/api/auth/login` | `POST /api/v1/auth/login` | `AuthController` $\rightarrow$ `SessionSecurityService` | `Users`, `UserSessions` |
| **Learner Security** (`/dashboard/settings/security`) | `LearnerDashboardShell.tsx` | `/api/security/sessions` | `GET /api/v1/security/sessions` | `SecurityController` $\rightarrow$ `SessionSecurityService` | `UserSessions` |
| **Flashcards Review** (`/dashboard/study/review`) | `StudyReviewClient.tsx` | `/api/study/flashcards/due` | `GET /api/v1/study/flashcards/due` | `StudyController` $\rightarrow$ `FlashcardService` | `Flashcards` |
| **Submit SM-2 Rating** (`/dashboard/study/review`) | `StudyReviewClient.tsx` | `/api/study/flashcards/cards/{id}/review` | `POST /api/v1/study/flashcards/cards/{id}/review` | `StudyController` $\rightarrow$ `SpacedRepetitionService` | `Flashcards`, `FlashcardReviews` |
| **Create Exam Family** (`/admin/examinations`) | `admin/examinations/page-client.tsx` | `/api/admin/examinations` | `POST /api/v1/examinations` | `ExaminationsController` $\rightarrow$ `ExaminationCodeService` | `Examinations`, `Exams` |
| **Publish Revision** (`/admin/examinations/[id]/...`)| `admin/.../page-client.tsx` | `/api/admin/examinations/revisions/{id}/publish` | `POST /api/v1/examinations/revisions/{id}/publish` | `ExaminationsController` $\rightarrow$ `ExamLifecycleService` | `Exams` |
| **Sync Client Test** (`/dashboard`) | `DashboardClient.tsx` | `/api/attempts/sync` | `POST /api/v1/attempts/sync` | `ExamAttemptsController` $\rightarrow$ `AppDbContext` | `ExamAttempts`, `AttemptResponses` |

---

## 6. Orphaned Routes & Interface Gaps

The inventory reveals key architectural gaps where endpoints or routes exist without corresponding UI, or where links exist pointing to nonexistent pages:

1. **Dead Links in Admin Overview Navigation:**
   - In `apps/web/src/app/admin/page-client.tsx`, navigation items link to:
     - `/admin/programmes` $\rightarrow$ **404 Not Found** (No frontend page exists).
     - `/admin/questions` $\rightarrow$ **404 Not Found** (No frontend page exists; no backend `QuestionsController` exists).
     - `/admin/users` $\rightarrow$ **404 Not Found** (No frontend user management page exists).
     - `/admin/audit-logs` $\rightarrow$ **404 Not Found** (No frontend audit log viewer exists).
2. **Missing Questions CRUD Endpoints:**
   - While `GET /api/v1/examinations/eligible-questions` allows reading questions for exam inclusion, there are NO endpoints for:
     - `POST /api/v1/questions` (Create question).
     - `PUT /api/v1/questions/{id}` (Update question stem, exhibits, options, rationales).
     - `DELETE /api/v1/questions/{id}` (Archive question).
3. **Missing Curriculum Hierarchy Management:**
   - No endpoints exist to create or manage `Courses`, `SubjectDomains`, `Categories`, `Subcategories`, or `Topics`.
4. **Missing Password Reset Endpoints:**
   - No `POST /api/v1/auth/forgot-password` or `POST /api/v1/auth/reset-password` endpoints exist.
