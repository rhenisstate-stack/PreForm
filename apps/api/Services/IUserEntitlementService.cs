using System;
using System.Threading;
using System.Threading.Tasks;

namespace Preform.Api.Services;

public class EntitlementEvaluationResult
{
    public bool IsEntitled { get; set; }
    public string Status { get; set; } = "None"; // Active, Expired, PathwayMismatch, None, AccountInactive, AccountSuspended, UserNotFound
    public string? ErrorCode { get; set; }
    public string? Reason { get; set; }
    public DateTime? ExpiryUtc { get; set; }
    public string? PlanName { get; set; }
    public bool IsBypassed { get; set; }
}

public interface IUserEntitlementService
{
    /// <summary>
    /// Evaluates candidate access to a specific examination attempt or lifecycle boundary.
    /// Emits structured audit log entries for bypasses and blocked access attempts.
    /// </summary>
    Task<EntitlementEvaluationResult> EvaluateExamAccessAsync(
        string userId,
        string? requestedPathway,
        string? examId,
        string? ipAddress = null,
        string? correlationId = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Evaluates whether a user has an active, valid pilot grant or subscription for the requested pathway.
    /// Superadmin and admin roles bypass entitlement checks.
    /// </summary>
    Task<EntitlementEvaluationResult> EvaluateEntitlementAsync(
        string userId,
        string? requestedPathway,
        CancellationToken cancellationToken = default);
}
