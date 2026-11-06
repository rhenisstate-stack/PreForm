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

    // ── P3.2 Authoring, Membership & Discard Operations ──
    Task<ExamRevisionDto> UpdateRevisionMetadataAsync(string revisionId, UpdateRevisionMetadataRequest request, ClaimsPrincipal user, CancellationToken ct = default);
    Task<RevisionValidationResultDto> ValidateRevisionAsync(string revisionId, ClaimsPrincipal user, CancellationToken ct = default);
    Task<List<ExamQuestionMembershipDto>> GetRevisionQuestionsAsync(string revisionId, ClaimsPrincipal user, CancellationToken ct = default);
    Task<ExamQuestionMembershipDto> AddQuestionToRevisionAsync(string revisionId, AddExamQuestionRequest request, ClaimsPrincipal user, CancellationToken ct = default);
    Task<bool> RemoveQuestionFromRevisionAsync(string revisionId, string questionId, long concurrencyToken, ClaimsPrincipal user, CancellationToken ct = default);
    Task<List<ExamQuestionMembershipDto>> ReorderQuestionsAsync(string revisionId, ReorderExamQuestionsRequest request, ClaimsPrincipal user, CancellationToken ct = default);
    Task<ExaminationDto> UpdateExaminationFamilyAsync(string examinationId, UpdateExaminationFamilyRequest request, ClaimsPrincipal user, CancellationToken ct = default);
    Task<bool> DeleteExaminationAsync(string examinationId, ClaimsPrincipal user, CancellationToken ct = default);
    Task<bool> DiscardDraftRevisionAsync(string revisionId, long concurrencyToken, ClaimsPrincipal user, CancellationToken ct = default);
    Task<List<ExamQuestionMembershipDto>> GetEligibleQuestionsAsync(
        string? pathway,
        string? search,
        ClaimsPrincipal user,
        CancellationToken ct = default,
        string? clientNeedId = null,
        string? courseId = null,
        string? subjectDomainId = null,
        string? questionType = null,
        string? difficulty = null);

    // ── P3.3 Examination Library Query & Discovery Operations ──
    Task<ExaminationLibraryResponseDto> QueryExaminationsAsync(ExaminationQueryParameters parameters, ClaimsPrincipal user, CancellationToken ct = default);
    Task<FamilyRevisionsResponseDto> GetFamilyRevisionsAsync(string examinationId, ClaimsPrincipal user, CancellationToken ct = default);

    // ── P3.4 Examination Duplication & Revision Lineage ──
    Task<DuplicateExaminationResponseDto> DuplicateExaminationAsync(string examinationId, DuplicateExaminationRequest request, ClaimsPrincipal user, CancellationToken ct = default);

    // ── P4.3 Assessment Composition & Blueprint ──
    Task<ExamCompositionDto> GetCompositionAsync(string revisionId, ClaimsPrincipal user, CancellationToken ct = default);
    Task<ExamCompositionDto> UpdateCompositionAsync(string revisionId, UpdateExamCompositionRequest request, ClaimsPrincipal user, CancellationToken ct = default);
    Task<QuestionPoolPreviewResponse> GetQuestionPoolPreviewAsync(string revisionId, ClaimsPrincipal user, CancellationToken ct = default);

    // ── P4.6 Examination Readiness & Admin Preview ──
    Task<ExamReadinessReportDto> GetReadinessReportAsync(string revisionId, ClaimsPrincipal user, CancellationToken ct = default);
    Task<AdminExamPreviewDto> GetAdminPreviewAsync(string revisionId, ClaimsPrincipal user, CancellationToken ct = default);
}
