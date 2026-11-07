using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Route("api/v1/admin/monetization")]
[Authorize(Policy = "RequireAdmin")]
public class AdminMonetizationController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<AdminMonetizationController> _logger;

    public AdminMonetizationController(
        AppDbContext context,
        ILogger<AdminMonetizationController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ────────────────────────────────────────────────────────────────────────
    // 1. LEARNER SEARCH (Section 7.1)
    // ────────────────────────────────────────────────────────────────────────

    [HttpGet("learners/search")]
    public async Task<IActionResult> SearchLearners([FromQuery] string? query, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 2)
        {
            return BadRequest(new { success = false, error = "Search query must contain at least 2 characters." });
        }

        var cleanQuery = query.Trim().ToLowerInvariant();
        var learners = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Where(u => u.Email.ToLower().Contains(cleanQuery)
                     || u.DisplayName.ToLower().Contains(cleanQuery)
                     || u.Id.ToLower() == cleanQuery)
            .Take(20)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.DisplayName,
                Role = u.UserRoles.Select(ur => ur.Role.Name).FirstOrDefault() ?? "candidate",
                u.Pathway,
                u.ActivePlan,
                u.AccountStatus,
                u.IsActive
            })
            .ToListAsync(cancellationToken);

        return Ok(new { success = true, learners });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. MANUAL SUBSCRIPTION AUTHORIZATION & OFFLINE PAYMENT (Section 7)
    // ────────────────────────────────────────────────────────────────────────

    [HttpGet("manual-authorizations")]
    public async Task<IActionResult> GetManualAuthorizations(
        [FromQuery] string? status,
        [FromQuery] string? paymentMethod,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = _context.ManualSubscriptionAuthorizations
            .Include(m => m.User)
            .Include(m => m.Plan)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<PaymentVerificationStatus>(status, true, out var filterStatus))
        {
            query = query.Where(m => m.Status == filterStatus);
        }

        if (!string.IsNullOrWhiteSpace(paymentMethod) && Enum.TryParse<PaymentMethod>(paymentMethod, true, out var filterMethod))
        {
            query = query.Where(m => m.PaymentMethod == filterMethod);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var cleanSearch = search.Trim().ToLowerInvariant();
            query = query.Where(m => m.User.Email.ToLower().Contains(cleanSearch)
                                  || m.User.DisplayName.ToLower().Contains(cleanSearch)
                                  || (m.TransactionReference != null && m.TransactionReference.ToLower().Contains(cleanSearch))
                                  || (m.ReceiptNumber != null && m.ReceiptNumber.ToLower().Contains(cleanSearch)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(m => m.CreatedAt)
            .Skip((Math.Max(1, page) - 1) * Math.Clamp(pageSize, 1, 100))
            .Take(Math.Clamp(pageSize, 1, 100))
            .ToListAsync(cancellationToken);

        var dtos = items.Select(m => new ManualAuthorizationResponseDto
        {
            Id = m.Id,
            UserId = m.UserId,
            UserName = m.User?.DisplayName ?? "Learner",
            UserEmail = m.User?.Email ?? string.Empty,
            PlanId = m.PlanId,
            PlanName = m.Plan?.Name ?? "Subscription Plan",
            Pathway = m.Pathway,
            PaymentMethod = m.PaymentMethod.ToString(),
            Amount = m.AmountCents / 100m,
            AmountCents = m.AmountCents,
            Currency = m.Currency,
            TransactionReference = m.TransactionReference,
            ReceiptNumber = m.ReceiptNumber,
            PaymentDate = m.PaymentDate,
            EvidenceUrl = m.EvidenceUrl,
            Notes = m.Notes,
            Status = m.Status.ToString(),
            RequestedByAdminId = m.RequestedByAdminId,
            VerifiedByAdminId = m.VerifiedByAdminId,
            RejectionReason = m.RejectionReason,
            SubscriptionId = m.SubscriptionId,
            OrderId = m.OrderId,
            CreatedAt = m.CreatedAt,
            VerifiedAt = m.VerifiedAt
        }).ToList();

        return Ok(new
        {
            success = true,
            totalCount,
            page,
            pageSize,
            authorizations = dtos
        });
    }

    [HttpPost("manual-authorizations")]
    public async Task<IActionResult> RecordManualPayment(
        [FromBody] RecordManualPaymentDto dto,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, error = "Validation failed for manual authorization parameters." });
        }

        var user = await _context.Users.FindAsync(new object[] { dto.UserId }, cancellationToken);
        if (user == null)
        {
            return NotFound(new { success = false, error = "Learner account not found." });
        }

        if (!user.IsActive || string.Equals(user.AccountStatus, "Suspended", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { success = false, error = "Cannot authorize subscription for an inactive or suspended learner account." });
        }

        var normalizedPlanId = dto.PlanId.Trim().ToLowerInvariant();
        var plan = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id.ToLower() == normalizedPlanId || p.Slug.ToLower() == normalizedPlanId, cancellationToken);

        if (plan == null || !plan.IsActive)
        {
            return BadRequest(new { success = false, error = "Selected subscription plan is invalid or inactive." });
        }

        // Duplicate Reference Protection
        if (!string.IsNullOrWhiteSpace(dto.TransactionReference))
        {
            var cleanRef = dto.TransactionReference.Trim();
            var isDuplicate = await _context.ManualSubscriptionAuthorizations
                .AnyAsync(m => m.TransactionReference == cleanRef, cancellationToken);

            if (isDuplicate)
            {
                return Conflict(new { success = false, error = $"Duplicate payment reference detected: '{cleanRef}' has already been submitted." });
            }
        }

        if (!Enum.TryParse<PaymentMethod>(dto.PaymentMethod, true, out var paymentMethod))
        {
            paymentMethod = PaymentMethod.Cash;
        }

        var actorAdminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "admin";
        var amountCents = (int)Math.Round(dto.Amount * 100m);
        var now = DateTime.UtcNow;

        var authRecord = new ManualSubscriptionAuthorization
        {
            Id = "man_auth_" + Guid.NewGuid().ToString("N"),
            UserId = user.Id,
            PlanId = plan.Id,
            Pathway = plan.Pathway.ToLowerInvariant(),
            PaymentMethod = paymentMethod,
            AmountCents = amountCents,
            Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "USD" : dto.Currency.ToUpperInvariant(),
            TransactionReference = dto.TransactionReference?.Trim(),
            ReceiptNumber = dto.ReceiptNumber?.Trim(),
            PaymentDate = dto.PaymentDate ?? now,
            EvidenceUrl = dto.EvidenceUrl?.Trim(),
            Notes = dto.Notes?.Trim(),
            Status = PaymentVerificationStatus.PendingVerification,
            RequestedByAdminId = actorAdminId,
            CreatedAt = now
        };

        // If auto-verify is requested and caller is SuperAdmin, process activation atomically
        var isSuperAdmin = User.IsInRole("superadmin");
        if (dto.AutoVerifyAndActivate && isSuperAdmin)
        {
            await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                await ActivateSubscriptionInternalAsync(authRecord, user, plan, actorAdminId, now, cancellationToken);
                _context.ManualSubscriptionAuthorizations.Add(authRecord);

                await _context.SaveChangesAsync(cancellationToken);
                await tx.CommitAsync(cancellationToken);

                return Ok(new
                {
                    success = true,
                    authorizationId = authRecord.Id,
                    status = authRecord.Status.ToString(),
                    subscriptionId = authRecord.SubscriptionId,
                    message = "Offline payment recorded and subscription activated successfully."
                });
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync(cancellationToken);
                _logger.LogError(ex, "Failed to auto-verify and activate manual subscription.");
                return StatusCode(500, new { success = false, error = "Failed to process atomic subscription activation." });
            }
        }

        _context.ManualSubscriptionAuthorizations.Add(authRecord);
        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = actorAdminId,
            Action = "ManualPaymentRecorded",
            EntityType = "ManualSubscriptionAuthorization",
            EntityId = authRecord.Id,
            Description = $"Recorded offline payment of {dto.Amount:F2} {authRecord.Currency} ({paymentMethod}) for learner {user.Email} - Pending Verification",
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            authorizationId = authRecord.Id,
            status = authRecord.Status.ToString(),
            message = "Offline payment submitted successfully. Awaiting administrative verification."
        });
    }

    [HttpPost("manual-authorizations/{id}/verify")]
    public async Task<IActionResult> VerifyManualPayment(
        string id,
        [FromBody] VerifyManualPaymentDto dto,
        CancellationToken cancellationToken)
    {
        var authRecord = await _context.ManualSubscriptionAuthorizations
            .Include(m => m.User)
            .Include(m => m.Plan)
            .FirstOrDefaultAsync(m => m.Id == id, cancellationToken);

        if (authRecord == null)
        {
            return NotFound(new { success = false, error = "Manual subscription authorization record not found." });
        }

        if (authRecord.Status != PaymentVerificationStatus.PendingVerification)
        {
            return BadRequest(new { success = false, error = $"Authorization is already finalized with status: {authRecord.Status}." });
        }

        var actorAdminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "admin";
        var now = DateTime.UtcNow;

        if (!dto.Approved)
        {
            authRecord.Status = PaymentVerificationStatus.Rejected;
            authRecord.VerifiedByAdminId = actorAdminId;
            authRecord.RejectionReason = dto.RejectionReason?.Trim() ?? "Administrative rejection";
            authRecord.VerifiedAt = now;

            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = actorAdminId,
                Action = "ManualPaymentRejected",
                EntityType = "ManualSubscriptionAuthorization",
                EntityId = authRecord.Id,
                Description = $"Rejected manual authorization for learner {authRecord.User?.Email}: {authRecord.RejectionReason}",
                Outcome = "Success",
                Timestamp = now
            });

            await _context.SaveChangesAsync(cancellationToken);
            return Ok(new { success = true, status = "Rejected", message = "Manual payment authorization rejected." });
        }

        // Approved: Execute atomic activation
        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            await ActivateSubscriptionInternalAsync(authRecord, authRecord.User, authRecord.Plan, actorAdminId, now, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            return Ok(new
            {
                success = true,
                status = "Verified",
                subscriptionId = authRecord.SubscriptionId,
                message = "Offline payment verified and learner subscription activated successfully."
            });
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            _logger.LogError(ex, "Failed to verify and activate manual payment authorization {Id}", id);
            return StatusCode(500, new { success = false, error = "An error occurred during subscription activation." });
        }
    }

    private async Task ActivateSubscriptionInternalAsync(
        ManualSubscriptionAuthorization authRecord,
        User user,
        SubscriptionPlan plan,
        string verifiedByAdminId,
        DateTime now,
        CancellationToken cancellationToken)
    {
        // 1. Create financial Order record
        var order = new Order
        {
            Id = "ord_man_" + Guid.NewGuid().ToString("N"),
            UserId = user.Id,
            PlanId = plan.Id,
            AmountCents = authRecord.AmountCents,
            Currency = authRecord.Currency,
            Status = OrderStatus.Completed,
            Provider = authRecord.PaymentMethod.ToString().ToLowerInvariant(),
            PaymentMethod = authRecord.PaymentMethod,
            ReceiptNumber = authRecord.ReceiptNumber,
            TransactionReference = authRecord.TransactionReference,
            PaymentEvidenceUrl = authRecord.EvidenceUrl,
            Notes = authRecord.Notes,
            VerifiedBy = verifiedByAdminId,
            VerifiedAt = now,
            ManualAuthorizationId = authRecord.Id,
            CreatedAt = now,
            UpdatedAt = now
        };
        _context.Orders.Add(order);

        // 2. Calculate duration
        var durationDays = plan.Interval switch
        {
            SubscriptionInterval.Quarterly => 90,
            SubscriptionInterval.Annual => 365,
            SubscriptionInterval.OneTime => 365,
            _ => 30
        };

        // If learner already has an active subscription for this plan, extend from the current expiry
        var existingActiveSub = await _context.UserSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == user.Id
                                   && s.PlanId == plan.Id
                                   && s.Status == SubscriptionStatus.Active
                                   && s.ExpiresAt > now, cancellationToken);

        DateTime startsAt = now;
        DateTime expiresAt = existingActiveSub != null ? existingActiveSub.ExpiresAt.AddDays(durationDays) : now.AddDays(durationDays);

        // 3. Create or extend UserSubscription
        var userSub = new UserSubscription
        {
            Id = "sub_man_" + Guid.NewGuid().ToString("N"),
            UserId = user.Id,
            PlanId = plan.Id,
            OrderId = order.Id,
            Pathway = plan.Pathway.ToLowerInvariant(),
            Status = SubscriptionStatus.Active,
            StartsAt = startsAt,
            ExpiresAt = expiresAt,
            IsManual = true,
            ManualAuthorizationId = authRecord.Id,
            Notes = $"Authorized by {verifiedByAdminId}. Receipt: {authRecord.ReceiptNumber ?? "N/A"}"
        };
        _context.UserSubscriptions.Add(userSub);

        // 4. Update authoritative User record
        user.ActivePlan = plan.Name;
        if (!string.Equals(plan.Pathway, "both", StringComparison.OrdinalIgnoreCase))
        {
            user.Pathway = plan.Pathway.ToLowerInvariant();
        }
        user.UpdatedAt = now;

        // 5. Update ManualAuthorization record
        authRecord.Status = PaymentVerificationStatus.Verified;
        authRecord.VerifiedByAdminId = verifiedByAdminId;
        authRecord.VerifiedAt = now;
        authRecord.OrderId = order.Id;
        authRecord.SubscriptionId = userSub.Id;

        // 6. Create PaymentTransaction audit entry
        _context.PaymentTransactions.Add(new PaymentTransaction
        {
            Id = Guid.NewGuid().ToString(),
            OrderId = order.Id,
            ProviderEventId = authRecord.TransactionReference ?? ("man_tx_" + Guid.NewGuid().ToString("N")),
            EventType = "manual.payment.verified",
            AmountCents = authRecord.AmountCents,
            Status = "verified",
            PayloadJson = $"{{\"authorizedBy\":\"{verifiedByAdminId}\",\"method\":\"{authRecord.PaymentMethod}\",\"receipt\":\"{authRecord.ReceiptNumber}\"}}",
            CreatedAt = now
        });

        // 7. System Audit Log
        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = verifiedByAdminId,
            Action = "ManualSubscriptionActivated",
            EntityType = "UserSubscription",
            EntityId = userSub.Id,
            Description = $"Activated subscription for {user.Email}: '{plan.Name}' (${authRecord.AmountCents / 100.0:F2} via {authRecord.PaymentMethod}) valid until {expiresAt:yyyy-MM-dd}",
            Outcome = "Success",
            Timestamp = now
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. LEARNER SUBSCRIPTIONS ADMINISTRATION (Section 9)
    // ────────────────────────────────────────────────────────────────────────

    [HttpGet("learner-subscriptions")]
    public async Task<IActionResult> GetLearnerSubscriptions(
        [FromQuery] string? status,
        [FromQuery] string? pathway,
        [FromQuery] string? planId,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = _context.UserSubscriptions
            .Include(s => s.User)
            .Include(s => s.Plan)
            .Include(s => s.Order)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<SubscriptionStatus>(status, true, out var sStatus))
        {
            query = query.Where(s => s.Status == sStatus);
        }

        if (!string.IsNullOrWhiteSpace(pathway))
        {
            var cleanPathway = pathway.Trim().ToLowerInvariant();
            query = query.Where(s => s.Pathway.ToLower() == cleanPathway);
        }

        if (!string.IsNullOrWhiteSpace(planId))
        {
            query = query.Where(s => s.PlanId == planId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var cleanSearch = search.Trim().ToLowerInvariant();
            query = query.Where(s => s.User.Email.ToLower().Contains(cleanSearch)
                                  || s.User.DisplayName.ToLower().Contains(cleanSearch)
                                  || s.Plan.Name.ToLower().Contains(cleanSearch));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var now = DateTime.UtcNow;

        var items = await query
            .OrderByDescending(s => s.StartsAt)
            .Skip((Math.Max(1, page) - 1) * Math.Clamp(pageSize, 1, 100))
            .Take(Math.Clamp(pageSize, 1, 100))
            .ToListAsync(cancellationToken);

        var dtos = items.Select(s => new AdminLearnerSubscriptionDto
        {
            Id = s.Id,
            UserId = s.UserId,
            UserName = s.User?.DisplayName ?? "Learner",
            UserEmail = s.User?.Email ?? string.Empty,
            PlanId = s.PlanId,
            PlanName = s.Plan?.Name ?? "Plan",
            Pathway = s.Pathway,
            Status = s.Status.ToString(),
            StartsAt = s.StartsAt,
            ExpiresAt = s.ExpiresAt,
            RemainingDays = Math.Max(0, (int)Math.Ceiling((s.ExpiresAt - now).TotalDays)),
            IsManual = s.IsManual,
            OrderId = s.OrderId,
            PaymentMethod = s.Order != null ? s.Order.PaymentMethod.ToString() : (s.IsManual ? "Manual" : "Online"),
            AmountPaid = s.Order != null ? s.Order.AmountCents / 100m : null,
            SuspendedAt = s.SuspendedAt,
            SuspensionReason = s.SuspensionReason,
            ExtendedAt = s.ExtendedAt,
            ExtendedBy = s.ExtendedBy,
            CancelledAt = s.CancelledAt,
            CancelledBy = s.CancelledBy,
            Notes = s.Notes
        }).ToList();

        return Ok(new
        {
            success = true,
            totalCount,
            page,
            pageSize,
            subscriptions = dtos
        });
    }

    [HttpPost("learner-subscriptions/{id}/extend")]
    public async Task<IActionResult> ExtendSubscription(
        string id,
        [FromBody] ExtendSubscriptionDto dto,
        CancellationToken cancellationToken)
    {
        var sub = await _context.UserSubscriptions
            .Include(s => s.User)
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (sub == null)
        {
            return NotFound(new { success = false, error = "Learner subscription not found." });
        }

        var actorAdminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "admin";
        var now = DateTime.UtcNow;

        var daysToAdd = Math.Clamp(dto.AdditionalDays, 1, 365);
        var baseDate = sub.ExpiresAt > now ? sub.ExpiresAt : now;
        sub.ExpiresAt = baseDate.AddDays(daysToAdd);
        sub.Status = SubscriptionStatus.Active; // Reactivate if was expired
        sub.ExtendedAt = now;
        sub.ExtendedBy = actorAdminId;
        if (!string.IsNullOrWhiteSpace(dto.Notes))
        {
            sub.Notes = string.IsNullOrWhiteSpace(sub.Notes) ? dto.Notes : $"{sub.Notes} | Extension note: {dto.Notes}";
        }

        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = actorAdminId,
            Action = "SubscriptionExtended",
            EntityType = "UserSubscription",
            EntityId = sub.Id,
            Description = $"Extended subscription for {sub.User?.Email} by {daysToAdd} days to {sub.ExpiresAt:yyyy-MM-dd}. Reason: {dto.Notes ?? "Administrative extension"}",
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            expiresAt = sub.ExpiresAt,
            remainingDays = (int)Math.Ceiling((sub.ExpiresAt - now).TotalDays),
            message = $"Subscription successfully extended by {daysToAdd} days."
        });
    }

    [HttpPost("learner-subscriptions/{id}/suspend")]
    public async Task<IActionResult> SuspendSubscription(
        string id,
        [FromBody] SuspendSubscriptionDto dto,
        CancellationToken cancellationToken)
    {
        var sub = await _context.UserSubscriptions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (sub == null)
        {
            return NotFound(new { success = false, error = "Learner subscription not found." });
        }

        var actorAdminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "admin";
        var now = DateTime.UtcNow;

        sub.Status = SubscriptionStatus.Suspended;
        sub.SuspendedAt = now;
        sub.SuspensionReason = dto.Reason.Trim();

        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = actorAdminId,
            Action = "SubscriptionSuspended",
            EntityType = "UserSubscription",
            EntityId = sub.Id,
            Description = $"Suspended subscription for {sub.User?.Email}: {sub.SuspensionReason}",
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, status = "Suspended", message = "Subscription suspended successfully." });
    }

    [HttpPost("learner-subscriptions/{id}/reinstate")]
    public async Task<IActionResult> ReinstateSubscription(
        string id,
        CancellationToken cancellationToken)
    {
        var sub = await _context.UserSubscriptions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (sub == null)
        {
            return NotFound(new { success = false, error = "Learner subscription not found." });
        }

        if (sub.Status != SubscriptionStatus.Suspended)
        {
            return BadRequest(new { success = false, error = "Only suspended subscriptions can be reinstated." });
        }

        var actorAdminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "admin";
        var now = DateTime.UtcNow;

        sub.Status = sub.ExpiresAt > now ? SubscriptionStatus.Active : SubscriptionStatus.Expired;
        sub.SuspendedAt = null;
        sub.SuspensionReason = null;

        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = actorAdminId,
            Action = "SubscriptionReinstated",
            EntityType = "UserSubscription",
            EntityId = sub.Id,
            Description = $"Reinstated subscription for {sub.User?.Email}",
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, status = sub.Status.ToString(), message = "Subscription successfully reinstated." });
    }

    [HttpPost("learner-subscriptions/{id}/cancel")]
    public async Task<IActionResult> CancelSubscription(
        string id,
        [FromBody] CancelSubscriptionDto dto,
        CancellationToken cancellationToken)
    {
        var sub = await _context.UserSubscriptions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (sub == null)
        {
            return NotFound(new { success = false, error = "Learner subscription not found." });
        }

        var actorAdminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "admin";
        var now = DateTime.UtcNow;

        sub.Status = SubscriptionStatus.Cancelled;
        sub.CancelledAt = now;
        sub.CancelledBy = actorAdminId;

        _context.AuditLogs.Add(new AuditLog
        {
            ActorId = actorAdminId,
            Action = "SubscriptionCancelled",
            EntityType = "UserSubscription",
            EntityId = sub.Id,
            Description = $"Cancelled subscription for {sub.User?.Email}. Reason: {dto.Reason ?? "Administrative cancellation"}",
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, status = "Cancelled", message = "Subscription cancelled successfully." });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 4. FINANCIAL & REVENUE ANALYTICS (Section 11)
    // ────────────────────────────────────────────────────────────────────────

    [HttpGet("analytics/summary")]
    public async Task<IActionResult> GetAnalyticsSummary(
        [FromQuery] string? courseFilter,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var startOfPrevMonth = startOfMonth.AddMonths(-1);

        var ordersQuery = _context.Orders
            .Include(o => o.Plan)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(courseFilter) && courseFilter.ToLower() != "all")
        {
            var cleanFilter = courseFilter.Trim().ToLowerInvariant();
            ordersQuery = ordersQuery.Where(o => o.Plan.Pathway.ToLower() == cleanFilter || o.Plan.Pathway.ToLower() == "both");
        }

        var completedOrders = await ordersQuery
            .Where(o => o.Status == OrderStatus.Completed)
            .ToListAsync(cancellationToken);

        var grossCollected = completedOrders.Sum(o => o.AmountCents) / 100m;
        var refundedOrders = await ordersQuery
            .Where(o => o.Status == OrderStatus.Refunded)
            .ToListAsync(cancellationToken);
        var totalRefunds = refundedOrders.Sum(o => o.AmountCents) / 100m;
        var netRevenue = grossCollected - totalRefunds;

        var currentMonthOrders = completedOrders.Where(o => o.CreatedAt >= startOfMonth).ToList();
        var currentMonthRevenue = currentMonthOrders.Sum(o => o.AmountCents) / 100m;

        var prevMonthOrders = completedOrders.Where(o => o.CreatedAt >= startOfPrevMonth && o.CreatedAt < startOfMonth).ToList();
        var prevMonthRevenue = prevMonthOrders.Sum(o => o.AmountCents) / 100m;

        var pendingOfflineQuery = _context.ManualSubscriptionAuthorizations
            .Where(m => m.Status == PaymentVerificationStatus.PendingVerification);

        if (!string.IsNullOrWhiteSpace(courseFilter) && courseFilter.ToLower() != "all")
        {
            var cleanFilter = courseFilter.Trim().ToLowerInvariant();
            pendingOfflineQuery = pendingOfflineQuery.Where(m => m.Pathway == cleanFilter || m.Pathway == "both");
        }

        var pendingOfflineSum = await pendingOfflineQuery.SumAsync(m => m.AmountCents, cancellationToken) / 100m;
        var pendingAuthorizationsCount = await pendingOfflineQuery.CountAsync(cancellationToken);

        var subsQuery = _context.UserSubscriptions
            .Include(s => s.Plan)
            .Include(s => s.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(courseFilter) && courseFilter.ToLower() != "all")
        {
            var cleanFilter = courseFilter.Trim().ToLowerInvariant();
            subsQuery = subsQuery.Where(s => s.Pathway == cleanFilter || s.Pathway == "both");
        }

        var allSubs = await subsQuery.ToListAsync(cancellationToken);

        var activeSubsCount = allSubs.Count(s => s.Status == SubscriptionStatus.Active && s.ExpiresAt > now);
        var expiredSubsCount = allSubs.Count(s => s.Status == SubscriptionStatus.Expired || (s.Status == SubscriptionStatus.Active && s.ExpiresAt <= now));
        var cancelledSubsCount = allSubs.Count(s => s.Status == SubscriptionStatus.Cancelled);
        var suspendedSubsCount = allSubs.Count(s => s.Status == SubscriptionStatus.Suspended);
        var manualSubsCount = allSubs.Count(s => s.IsManual);
        var onlineSubsCount = allSubs.Count(s => !s.IsManual);

        // Group revenue by course
        var revenueByCourse = new Dictionary<string, decimal>
        {
            ["RN"] = completedOrders.Where(o => o.Plan?.Pathway.Equals("RN", StringComparison.OrdinalIgnoreCase) == true).Sum(o => o.AmountCents) / 100m,
            ["PN"] = completedOrders.Where(o => o.Plan?.Pathway.Equals("PN", StringComparison.OrdinalIgnoreCase) == true).Sum(o => o.AmountCents) / 100m,
            ["Both"] = completedOrders.Where(o => o.Plan?.Pathway.Equals("Both", StringComparison.OrdinalIgnoreCase) == true).Sum(o => o.AmountCents) / 100m
        };

        // Group revenue by payment method
        var revenueByMethod = completedOrders
            .GroupBy(o => o.PaymentMethod.ToString())
            .ToDictionary(g => g.Key, g => g.Sum(o => o.AmountCents) / 100m);

        // Group revenue by plan
        var revenueByPlan = completedOrders
            .GroupBy(o => o.Plan?.Name ?? "Plan")
            .ToDictionary(g => g.Key, g => g.Sum(o => o.AmountCents) / 100m);

        // Recent activations
        var recentActivations = allSubs
            .OrderByDescending(s => s.StartsAt)
            .Take(5)
            .Select(s => new AdminLearnerSubscriptionDto
            {
                Id = s.Id,
                UserId = s.UserId,
                UserName = s.User?.DisplayName ?? "Learner",
                UserEmail = s.User?.Email ?? string.Empty,
                PlanId = s.PlanId,
                PlanName = s.Plan?.Name ?? "Plan",
                Pathway = s.Pathway,
                Status = s.Status.ToString(),
                StartsAt = s.StartsAt,
                ExpiresAt = s.ExpiresAt,
                RemainingDays = Math.Max(0, (int)Math.Ceiling((s.ExpiresAt - now).TotalDays)),
                IsManual = s.IsManual
            }).ToList();

        return Ok(new MonetizationAnalyticsSummaryDto
        {
            TotalRevenue = netRevenue,
            CurrentMonthRevenue = currentMonthRevenue,
            PreviousMonthRevenue = prevMonthRevenue,
            GrossCollected = grossCollected,
            TotalRefunds = totalRefunds,
            NetRevenue = netRevenue,
            PendingOfflineAmount = pendingOfflineSum,
            ActiveSubscriptionsCount = activeSubsCount,
            PendingAuthorizationsCount = pendingAuthorizationsCount,
            ExpiredSubscriptionsCount = expiredSubsCount,
            CancelledSubscriptionsCount = cancelledSubsCount,
            SuspendedSubscriptionsCount = suspendedSubsCount,
            OnlineSubscriptionsCount = onlineSubsCount,
            ManualSubscriptionsCount = manualSubsCount,
            RevenueByCourse = revenueByCourse,
            RevenueByPlan = revenueByPlan,
            RevenueByPaymentMethod = revenueByMethod,
            RecentActivations = recentActivations
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 5. TRANSACTIONS & FINANCIAL LEDGER
    // ────────────────────────────────────────────────────────────────────────

    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Orders
            .Include(o => o.User)
            .Include(o => o.Plan)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var clean = search.Trim().ToLowerInvariant();
            query = query.Where(o => o.User.Email.ToLower().Contains(clean)
                                  || o.User.DisplayName.ToLower().Contains(clean)
                                  || (o.TransactionReference != null && o.TransactionReference.ToLower().Contains(clean))
                                  || (o.ReceiptNumber != null && o.ReceiptNumber.ToLower().Contains(clean)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((Math.Max(1, page) - 1) * Math.Clamp(pageSize, 1, 100))
            .Take(Math.Clamp(pageSize, 1, 100))
            .ToListAsync(cancellationToken);

        var dtos = orders.Select(o => new AdminPaymentTransactionDto
        {
            Id = o.Id,
            OrderId = o.Id,
            UserId = o.UserId,
            UserName = o.User?.DisplayName ?? "Learner",
            UserEmail = o.User?.Email ?? string.Empty,
            PlanName = o.Plan?.Name ?? "Plan",
            ProviderEventId = o.TransactionReference ?? o.ProviderPaymentId ?? o.Id,
            EventType = $"order.{o.Status.ToString().ToLowerInvariant()}",
            Amount = o.AmountCents / 100m,
            AmountCents = o.AmountCents,
            Currency = o.Currency,
            Status = o.Status.ToString(),
            PaymentMethod = o.PaymentMethod.ToString(),
            TransactionReference = o.TransactionReference ?? o.ReceiptNumber,
            CreatedAt = o.CreatedAt
        }).ToList();

        return Ok(new
        {
            success = true,
            totalCount,
            page,
            pageSize,
            transactions = dtos
        });
    }
}
