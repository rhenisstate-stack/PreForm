using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Preform.Api.Data;
using Preform.Api.Models;

namespace Preform.Api.Services;

public class UserEntitlementService : IUserEntitlementService
{
    private readonly AppDbContext _context;
    private readonly ILogger<UserEntitlementService> _logger;

    public UserEntitlementService(AppDbContext context, ILogger<UserEntitlementService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<EntitlementEvaluationResult> EvaluateEntitlementAsync(
        string userId,
        string? requestedPathway,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return new EntitlementEvaluationResult
            {
                IsEntitled = false,
                Status = "UserNotFound",
                ErrorCode = "USER_NOT_FOUND",
                Reason = "User identity is required."
            };
        }

        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            return new EntitlementEvaluationResult
            {
                IsEntitled = false,
                Status = "UserNotFound",
                ErrorCode = "USER_NOT_FOUND",
                Reason = "User record not found."
            };
        }

        if (!user.IsActive)
        {
            return new EntitlementEvaluationResult
            {
                IsEntitled = false,
                Status = "AccountInactive",
                ErrorCode = "ACCOUNT_INACTIVE",
                Reason = "Account is inactive or disabled."
            };
        }

        if (string.Equals(user.AccountStatus, "Suspended", StringComparison.OrdinalIgnoreCase))
        {
            return new EntitlementEvaluationResult
            {
                IsEntitled = false,
                Status = "AccountSuspended",
                ErrorCode = "ACCOUNT_SUSPENDED",
                Reason = $"Account is suspended: {user.SuspensionReason ?? "Administrative suspension"}."
            };
        }

        // Administrative Privilege Bypass Check
        var effectiveRole = RoleHierarchy.GetEffectiveRole(user);
        if (RoleHierarchy.IsAdmin(effectiveRole))
        {
            return new EntitlementEvaluationResult
            {
                IsEntitled = true,
                Status = "Active",
                PlanName = "Administrative Override",
                Reason = "Entitlement check bypassed via administrative role privilege.",
                IsBypassed = true
            };
        }

        // Evaluate Candidate Subscriptions
        var nowUtc = DateTime.UtcNow;
        var allSubs = await _context.UserSubscriptions
            .Include(s => s.Plan)
            .Where(s => s.UserId == userId)
            .ToListAsync(cancellationToken);

        if (allSubs.Count == 0)
        {
            return new EntitlementEvaluationResult
            {
                IsEntitled = false,
                Status = "None",
                ErrorCode = "ENTITLEMENT_REQUIRED",
                Reason = "An active institutional pilot grant or subscription is required to access assessments."
            };
        }

        var activeSubs = allSubs
            .Where(s => s.Status == SubscriptionStatus.Active && s.ExpiresAt > nowUtc)
            .OrderByDescending(s => s.ExpiresAt)
            .ToList();

        if (activeSubs.Count == 0)
        {
            return new EntitlementEvaluationResult
            {
                IsEntitled = false,
                Status = "Expired",
                ErrorCode = "ENTITLEMENT_EXPIRED",
                Reason = "Your institutional pilot entitlement or subscription has expired. Please contact your institution administrator to renew access."
            };
        }

        var normalizedPathway = !string.IsNullOrWhiteSpace(requestedPathway)
            ? (string.Equals(requestedPathway, "pn", StringComparison.OrdinalIgnoreCase) ? "pn" : "rn")
            : (string.Equals(user.Pathway, "pn", StringComparison.OrdinalIgnoreCase) ? "pn" : "rn");

        var matchingSub = activeSubs.FirstOrDefault(s =>
            string.Equals(s.Pathway, "both", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(s.Pathway, normalizedPathway, StringComparison.OrdinalIgnoreCase) ||
            (s.Plan != null && (string.Equals(s.Plan.Pathway, "Both", StringComparison.OrdinalIgnoreCase) ||
                                string.Equals(s.Plan.Pathway, normalizedPathway, StringComparison.OrdinalIgnoreCase))));

        if (matchingSub == null)
        {
            var activePathway = activeSubs.First().Pathway.ToUpperInvariant();
            return new EntitlementEvaluationResult
            {
                IsEntitled = false,
                Status = "PathwayMismatch",
                ErrorCode = "PATHWAY_NOT_ENTITLED",
                Reason = $"Your current entitlement is for the {activePathway} pathway, but {normalizedPathway.ToUpperInvariant()} was requested."
            };
        }

        return new EntitlementEvaluationResult
        {
            IsEntitled = true,
            Status = "Active",
            ExpiryUtc = matchingSub.ExpiresAt,
            PlanName = matchingSub.Plan?.Name ?? "Institutional Pilot Grant",
            Reason = "Active entitlement verified."
        };
    }

    public async Task<EntitlementEvaluationResult> EvaluateExamAccessAsync(
        string userId,
        string? requestedPathway,
        string? examId,
        string? ipAddress = null,
        string? correlationId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await EvaluateEntitlementAsync(userId, requestedPathway, cancellationToken);

        if (result.IsBypassed)
        {
            _logger.LogWarning("Assessment entitlement check bypassed for user {UserId} (Exam: {ExamId}) via administrative role.", userId, examId);
            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = userId,
                Action = "EntitlementBypass",
                EntityType = "ExamAttempt",
                EntityId = examId,
                Description = $"User {userId} bypassed assessment entitlement check via administrative role privilege.",
                Outcome = "Success",
                Severity = "Warning",
                IpAddress = ipAddress,
                CorrelationId = correlationId,
                Timestamp = DateTime.UtcNow
            });
            await _context.SaveChangesAsync(cancellationToken);
        }
        else if (!result.IsEntitled)
        {
            _logger.LogWarning("Assessment attempt blocked for user {UserId} (Exam: {ExamId}): {ErrorCode} - {Reason}", userId, examId, result.ErrorCode, result.Reason);
            _context.AuditLogs.Add(new AuditLog
            {
                ActorId = userId,
                Action = "ExamAttemptBlockedEntitlement",
                EntityType = "ExamAttempt",
                EntityId = examId,
                Description = $"Assessment access blocked for user {userId}: {result.ErrorCode} - {result.Reason}",
                Outcome = "Forbidden",
                Severity = "Warning",
                IpAddress = ipAddress,
                CorrelationId = correlationId,
                Timestamp = DateTime.UtcNow
            });
            await _context.SaveChangesAsync(cancellationToken);
        }

        return result;
    }

    public async Task<EntitlementEvaluationResult> EvaluateFeatureAccessAsync(
        string userId,
        string featureCode,
        string? requestedPathway = null,
        CancellationToken cancellationToken = default)
    {
        var baseResult = await EvaluateEntitlementAsync(userId, requestedPathway, cancellationToken);
        if (!baseResult.IsEntitled || baseResult.IsBypassed)
        {
            return baseResult;
        }

        var normalizedCode = featureCode.Trim().ToLowerInvariant();
        var userEntitlements = await GetUserActiveFeatureEntitlementsAsync(userId, cancellationToken);

        if (!userEntitlements.Contains(normalizedCode))
        {
            return new EntitlementEvaluationResult
            {
                IsEntitled = false,
                Status = "FeatureNotEntitled",
                ErrorCode = "FEATURE_NOT_INCLUDED",
                ExpiryUtc = baseResult.ExpiryUtc,
                PlanName = baseResult.PlanName,
                Reason = $"Your current subscription ({baseResult.PlanName}) does not include access to {featureCode}. Please upgrade your subscription to unlock this feature."
            };
        }

        return baseResult;
    }

    public async Task<List<string>> GetUserActiveFeatureEntitlementsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var activeSubs = await _context.UserSubscriptions
            .Include(s => s.Plan)
            .Where(s => s.UserId == userId && s.Status == SubscriptionStatus.Active && s.ExpiresAt > now)
            .ToListAsync(cancellationToken);

        if (activeSubs.Count == 0)
        {
            return new List<string>();
        }

        var entitlements = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var sub in activeSubs)
        {
            if (sub.Plan == null) continue;

            // 1. Check configured database-backed SubscriptionPlanEntitlements
            var planEntitlements = await _context.SubscriptionPlanEntitlements
                .Where(spe => spe.PlanId == sub.PlanId)
                .Select(spe => spe.EntitlementCode)
                .ToListAsync(cancellationToken);

            if (planEntitlements.Count > 0)
            {
                foreach (var pe in planEntitlements)
                {
                    entitlements.Add(pe.ToLowerInvariant());
                }
            }
            else
            {
                // 2. Default feature mapping based on PlanType & canonical specification
                var planType = sub.Plan.PlanType.ToLowerInvariant();
                switch (planType)
                {
                    case "starter":
                        entitlements.Add("practice_exams");
                        entitlements.Add("quizzes");
                        entitlements.Add("flashcards");
                        break;
                    case "pro":
                    case "premium":
                        entitlements.Add("practice_exams");
                        entitlements.Add("custom_tests");
                        entitlements.Add("rats");
                        entitlements.Add("study_guide");
                        entitlements.Add("flashcards");
                        entitlements.Add("spaced_repetition");
                        entitlements.Add("quizzes");
                        entitlements.Add("performance_reports");
                        break;
                    case "readiness":
                        entitlements.Add("rats");
                        break;
                    default:
                        entitlements.Add("practice_exams");
                        break;
                }
            }
        }

        return entitlements.ToList();
    }
}
