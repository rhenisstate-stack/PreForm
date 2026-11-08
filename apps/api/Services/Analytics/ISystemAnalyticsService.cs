using System.Threading;
using System.Threading.Tasks;
using Preform.Api.DTOs;

namespace Preform.Api.Services.Analytics;

public interface ISystemAnalyticsService
{
    // Administrator / Super Admin Ecosystem Analytics
    Task<AdminSystemOverviewDto> GetAdminSystemOverviewAsync(SystemAnalyticsFilterDto filter, CancellationToken ct = default);
    Task<AdminUserAnalyticsDto> GetAdminUserAnalyticsAsync(SystemAnalyticsFilterDto filter, CancellationToken ct = default);
    Task<AdminExaminationAnalyticsDto> GetAdminExaminationAnalyticsAsync(SystemAnalyticsFilterDto filter, CancellationToken ct = default);
    Task<AdminAcademicAnalyticsDto> GetAdminAcademicAnalyticsAsync(SystemAnalyticsFilterDto filter, CancellationToken ct = default);
    Task<AdminMonetizationAnalyticsDto> GetAdminMonetizationAnalyticsAsync(SystemAnalyticsFilterDto filter, CancellationToken ct = default);
    Task<AdminPlatformActivityDto> GetAdminPlatformActivityAsync(SystemAnalyticsFilterDto filter, CancellationToken ct = default);

    // Role-Specific Operational Workspaces
    Task<ExamManagerOverviewDto> GetExamManagerOverviewAsync(SystemAnalyticsFilterDto filter, CancellationToken ct = default);
    Task<ContentManagerOverviewDto> GetContentManagerOverviewAsync(SystemAnalyticsFilterDto filter, CancellationToken ct = default);
    Task<ReviewerOverviewDto> GetReviewerOverviewAsync(SystemAnalyticsFilterDto filter, CancellationToken ct = default);
    Task<InstructorOverviewDto> GetInstructorOverviewAsync(SystemAnalyticsFilterDto filter, string? instructorId = null, CancellationToken ct = default);

    // Pathway-Specific Learner Workspaces
    Task<LearnerDashboardOverviewDto> GetLearnerDashboardOverviewAsync(string userId, string pathway, SystemAnalyticsFilterDto filter, CancellationToken ct = default);
}
