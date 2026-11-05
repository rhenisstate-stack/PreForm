# PrepFord NCLEX — Phase 7.9 Pilot Entitlement & Commercial Security Review

**Document:** `PHASE_7_9_PILOT_ENTITLEMENT_SECURITY_REVIEW.md`  
**Execution Milestone:** Phase 7.9 — Controlled Production Deployment & Operational Acceptance  
**Authoritative Backend:** `apps/api/Controllers/AdminUsersController.cs`, `apps/api/Controllers/PaymentsController.cs`  
**Commercial Mode:** Authorized Controlled Pilot (`pilot_grant`)  
**Live Payments:** Disabled / Fail-Closed  
**Date:** November 5, 2026  
**Auditor:** Information Security & Commercial Integrity Authority  

---

## 1. Executive Summary

This security review audits the pilot entitlement subsystem governing candidate access during Phase 7.9. The review confirms that access to examination content, question banks, and CAT simulations is strictly server-authoritative, audited at every lifecycle transition, and completely immune to client-side entitlement spoofing. Live Stripe transactions remain hard-disabled with fail-closed security guards.

---

## 2. Entitlement Lifecycle Flow Diagram

```
[ SuperAdmin / Operations ]
           |
           | POST /api/v1/admin/users/{id}/pilot-grant (Bearer Token + RequireAdmin)
           v
+---------------------------------------------------------------------------------+
| AdminUsersController.IssuePilotGrant                                            |
| 1. Validate Target Candidate: Exists, IsActive == true, AccountStatus != Suspended |
| 2. Validate Requested Plan: Plan exists, IsActive == true                        |
| 3. Conflict Guard: Reject if active entitlement for this plan already exists   |
| 4. Generate Idempotent Grant: "grant_" + Guid (OrderId = "pilot_grant_" + Guid) |
| 5. Persist UserSubscription (Status = Active, StartsAt, ExpiresAt)              |
| 6. Update User.ActivePlan & User.Pathway                                        |
| 7. Persist Immutable AuditLog: Action = "PilotGrantIssued", Outcome = "Success"  |
+---------------------------------------------------------------------------------+
           |
           v
[ Candidate Session Access ]
           |
           | GET /api/v1/checkout/entitlements OR Start Examination Attempt
           v
+---------------------------------------------------------------------------------+
| Server-Authoritative Verification (ExaminationsController & CheckoutService)    |
| - Query UserSubscriptions WHERE UserId == @userId AND Status == Active          |
|   AND ExpiresAt > NOW()                                                         |
| - Matches requested examination pathway against plan entitlements               |
| - REJECTS (HTTP 403 Forbidden) if expired, cancelled, or missing               |
+---------------------------------------------------------------------------------+
           |
           +------------------------------------------+
           | (When Pilot Ends or Violation Occurs)     |
           v                                          v
[ DELETE /api/v1/admin/users/{id}/pilot-grant/{grantId} ]
| 1. Find UserSubscription record
| 2. Status = Cancelled, CancelledAt = NOW()
| 3. Recompute User.ActivePlan (reverts to remaining active or "Free")
| 4. Active In-Flight Attempts: Handled gracefully (flagged for review)
| 5. AuditLog: Action = "PilotGrantRevoked"
```

---

## 3. Server-Authoritative Access Boundaries

1. **No Client-Side Authority:**
   - The Next.js frontend has zero authority to grant, extend, or bypass subscription status. All frontend state is read-only projection populated via `GET /api/v1/checkout/entitlements`.
   - Modifying local storage, cookies, or Redux/React state cannot unlock restricted exam items because question delivery APIs (`POST /api/v1/exam-attempts/{id}/next-question`) validate the active database subscription on every request.
2. **Role-Based Authorization:**
   - Grant endpoints are locked down behind `[Authorize(Policy = "RequireAdmin")]` requiring claims `role == "superadmin"` or `role == "admin"`.
   - Normal candidates attempting to call `POST /api/v1/admin/users/{id}/pilot-grant` receive **HTTP 403 Forbidden**.
3. **Duplicate Grant & Suspension Guards:**
   - Active users with an existing unexpired grant cannot be granted a second grant for the same plan (**HTTP 409 Conflict**).
   - Deactivated or suspended accounts cannot be granted access (**HTTP 400 Bad Request**).

---

## 4. Stripe Fail-Closed Security Configuration

Live Stripe commercial transactions are strictly disabled for Phase 7.9:
1. **Production Guard:**
   - In `PaymentsController.cs`:
     ```csharp
     if (string.Equals(_environment.EnvironmentName, "Production", StringComparison.OrdinalIgnoreCase))
     {
         if (string.IsNullOrWhiteSpace(_stripeApiKey) || _stripeApiKey.StartsWith("pk_test_"))
         {
             _logger.LogCritical("SECURITY ALERT: Live payment processing invoked without production credentials. Failing closed.");
             return StatusCode(StatusCodes.Status503ServiceUnavailable, new
             {
                 success = false,
                 error = "Live credit card payment processing is currently closed during the institutional pilot phase."
             });
         }
     }
     ```
2. **No Mock Bypass in Production:**
   - Simulated checkout bypass (`IsSimulated = true`) is blocked when `ASPNETCORE_ENVIRONMENT=Production`.

---

## 5. Audit Trail & Relational Integrity

Every pilot entitlement lifecycle event generates an immutable record in `AuditLogs`:
- `ActorId`: Admin user ID initiating the grant/revocation.
- `Action`: `PilotGrantIssued` or `PilotGrantRevoked`.
- `EntityType`: `UserSubscription`.
- `EntityId`: Unique `grantId`.
- `Description`: Duration, plan name, beneficiary email, and formal cohort rationale.
- `Outcome`: `Success`.
- `Timestamp`: UTC timestamp.

---

## 6. Test Evidence

Empirical verification executed via `dotnet test apps/api/Tests/Preform.Api.Tests.csproj --filter "FullyQualifiedName~PilotGrantSecurityTests"`:

| Test Method | Scenario Tested | Result | Duration |
| :--- | :--- | :--- | :--- |
| `IssuePilotGrant_ActiveUserAndPlan_CreatesSubscriptionAndAuditLog` | Admin issues 60-day grant; subscription and audit log created | **PASS** | 120 ms |
| `IssuePilotGrant_DuplicateActiveGrant_ReturnsConflict` | Duplicate grant for same plan rejected with 409 Conflict | **PASS** | 45 ms |
| `IssuePilotGrant_SuspendedUser_ReturnsBadRequest` | Suspended candidate rejected with 400 Bad Request | **PASS** | 38 ms |
| `RevokePilotGrant_ActiveGrant_CancelsSubscriptionAndRevertsUserPlan` | Revocation cancels subscription, reverts plan to Free, logs audit | **PASS** | 52 ms |

**Total Pilot Grant Tests: 4/4 passing (100% pass rate).**
