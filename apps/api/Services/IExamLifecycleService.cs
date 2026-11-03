using System.Security.Claims;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

public interface IExamLifecycleService
{
    Task<ExamRevisionDto> CreateRevisionAsync(string examinationId, CreateRevisionRequest request, ClaimsPrincipal user, CancellationToken ct = default);
    Task<ExamRevisionDto> SubmitForReviewAsync(string revisionId, long concurrencyToken, ClaimsPrincipal user, CancellationToken ct = default);
    Task<ExamRevisionDto> RecommendApprovalAsync(string revisionId, long concurrencyToken, string? notes, ClaimsPrincipal user, CancellationToken ct = default);
    Task<ExamRevisionDto> ReturnForChangesAsync(string revisionId, long concurrencyToken, string reason, ClaimsPrincipal user, CancellationToken ct = default);
    Task<ExamRevisionDto> ApproveAsync(string revisionId, long concurrencyToken, ClaimsPrincipal user, CancellationToken ct = default);
    Task<ExamRevisionDto> PublishAsync(string revisionId, long concurrencyToken, ClaimsPrincipal user, CancellationToken ct = default);
    Task<ExamRevisionDto> ArchiveAsync(string revisionId, long concurrencyToken, string? reason, ClaimsPrincipal user, CancellationToken ct = default);
    Task<ExamRevisionDto> RestoreAsync(string revisionId, long concurrencyToken, string reason, ClaimsPrincipal user, CancellationToken ct = default);
    Task<ExamRevisionDto> RetireAsync(string revisionId, long concurrencyToken, string? reason, ClaimsPrincipal user, CancellationToken ct = default);
    Task<ExamRevisionDto> EmergencyRetireAsync(string revisionId, long concurrencyToken, string reason, ClaimsPrincipal user, CancellationToken ct = default);

    Task<ExaminationDto?> GetExaminationAsync(string id, ClaimsPrincipal user, CancellationToken ct = default);
    Task<List<ExaminationDto>> GetExaminationsAsync(string? pathway, ClaimsPrincipal user, CancellationToken ct = default);
    Task<ExamRevisionDto?> GetRevisionAsync(string revisionId, ClaimsPrincipal user, CancellationToken ct = default);
}
