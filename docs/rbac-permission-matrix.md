# PrepFord Role-Based Access Control (RBAC) Permission Matrix

**Document Version:** 1.0  
**Date:** 2026-10-29  
**Branch:** `feature/dotnet-backend-migration`  
**System:** ASP.NET Core 8 Web API (`apps/api`) & PostgreSQL

---

## 1. Role Definitions

| Role Key | Display Name | Category | Description |
| :--- | :--- | :--- | :--- |
| `superadmin` | Super Administrator | System / Executive | Unrestricted system-wide access, security audits, role assignment, and critical configuration. |
| `admin` | Administrator | Operations | Operational management of users, subscriptions, billing catalog, and system health. |
| `content_manager`| Content Manager | Editorial / Education | Creation, organization, and lifecycle management of curriculum, domains, topics, and study guides. |
| `exam_manager` | Examination Manager | Editorial / Psychometrics | Creation, publishing, and threshold configuration of NCLEX-RN and NCLEX-PN mock assessments and CAT exams. |
| `reviewer` | Clinical Reviewer | Clinical QA | Independent peer-review, medical accuracy verification, and rationale approval for questions. |
| `instructor` | Faculty / Instructor | Education | Monitoring cohort student analytics, performance tiers, and diagnostic feedback. |
| `candidate` | Nursing Candidate | Student / Learner | Public learner account: study materials, assessment taking, personal profile, image upload, and subscription purchasing. |

---

## 2. Granular Permission Keys

| Permission Key | Description | Category |
| :--- | :--- | :--- |
| `auth.session.view` | View and validate active session state | Identity |
| `profile.view.own` | View own user profile and preferences | Identity |
| `profile.update.own` | Update own allowed profile preferences | Identity |
| `profile.image.manage` | Upload, replace, and delete own profile image | Identity |
| `password.change.own` | Change own account password | Identity |
| `subscriptions.catalog.read` | View public subscription plans catalog | Subscriptions |
| `subscriptions.admin.read` | View full subscription catalog including archived plans | Subscriptions |
| `subscriptions.admin.create` | Create new subscription plans | Subscriptions |
| `subscriptions.admin.update` | Update existing subscription plan parameters | Subscriptions |
| `subscriptions.admin.archive`| Soft-delete / archive subscription plans | Subscriptions |
| `checkout.initiate` | Create checkout session for active plan | Checkout |
| `entitlements.view.own`| View own active subscriptions and pathway entitlements | Entitlements |
| `audit.logs.view` | View system audit logs | Governance |
| `users.manage.roles` | Assign and revoke administrative roles | Governance |
| `questions.manage` | Create and edit clinical questions | Question Bank |
| `questions.review` | Approve or reject question drafts | Question Bank |
| `exams.publish` | Configure and publish mock exams and CAT algorithms | Assessments |
| `exams.attempt` | Take examinations and record responses | Assessments |

---

## 3. Role-to-Permission Mapping Matrix

| Permission Key | Super Admin | Admin | Content Manager | Exam Manager | Reviewer | Instructor | Candidate |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `auth.session.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `profile.view.own` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `profile.update.own` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `profile.image.manage` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `password.change.own` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `subscriptions.catalog.read`| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `subscriptions.admin.read` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `subscriptions.admin.create`| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `subscriptions.admin.update`| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `subscriptions.admin.archive`| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `checkout.initiate` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `entitlements.view.own` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `audit.logs.view` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `users.manage.roles` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `questions.manage` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `questions.review` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `exams.publish` | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `exams.attempt` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 4. Endpoint Authorization Policies in ASP.NET Core

The API enforces authorization via explicit ASP.NET Core policies:

```csharp
builder.Services.AddAuthorization(options =>
{
    // Deny anonymous by default on protected endpoints
    options.FallbackPolicy = null;

    // Candidate / Authenticated Learner Policy
    options.AddPolicy("RequireAuthenticatedUser", policy =>
        policy.RequireAuthenticatedUser());

    // Administrative Policies
    options.AddPolicy("RequireAdmin", policy =>
        policy.RequireRole("admin", "superadmin", "administrator"));

    options.AddPolicy("RequireSuperAdmin", policy =>
        policy.RequireRole("superadmin"));

    // Content Management
    options.AddPolicy("RequireContentManager", policy =>
        policy.RequireRole("content_manager", "admin", "superadmin"));

    // Exam Management
    options.AddPolicy("RequireExamManager", policy =>
        policy.RequireRole("exam_manager", "superadmin"));
});
```

---

## 5. Security & Ownership Rules

1. **Deny by Default:** Endpoints without an explicit `[AllowAnonymous]` attribute require authentication.
2. **Explicit 401 vs 403:**
   - Missing, expired, revoked, or invalid token -> `401 Unauthorized`.
   - Authenticated candidate attempting administrative action -> `403 Forbidden`.
3. **Resource Ownership Enforcement:**
   - Profile images, personal profiles, exam attempts, and entitlement lookups strictly compare the route/query target ID with `ClaimsPrincipal.FindFirst(ClaimTypes.NameIdentifier)`. Any discrepancy returns `403 Forbidden`.
4. **Privilege Escalation Prevention:**
   - `PUT /api/v1/profile` strictly allows only `DisplayName`, `TargetExamDate`, `EmailNotifications`, and `StudyReminders`.
   - Modifying `Role`, `IsActive`, `Pathway`, or `ActivePlan` via profile update returns `403 Forbidden`.
