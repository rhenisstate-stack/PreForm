using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class ExaminationLifecycleTests
{
    private static AppDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        return new AppDbContext(options);
    }

    private static ClaimsPrincipal CreateUserPrincipal(string userId, string role)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Role, role),
            new Claim("role", role)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        return new ClaimsPrincipal(identity);
    }

    private static async Task<Examination> SeedExaminationAsync(AppDbContext context, string creatorId = "mgr_001")
    {
        var examFam = new Examination
        {
            Id = "exam_fam_" + Guid.NewGuid().ToString("N"),
            Pathway = "rn",
            Code = "RN-EX-000001",
            Title = "NCLEX-RN Comprehensive Licensure Examination",
            CreatedAt = DateTime.UtcNow,
            CreatedBy = creatorId
        };
        context.Examinations.Add(examFam);
        await context.SaveChangesAsync();
        return examFam;
    }

    private static async Task<Exam> SeedRevisionWithQuestionAsync(
        AppDbContext context,
        string examinationId,
        int revisionNumber = 1,
        ExamLifecycleState state = ExamLifecycleState.Draft,
        string creatorId = "mgr_001")
    {
        var exam = new Exam
        {
            Id = "rev_" + Guid.NewGuid().ToString("N"),
            ExaminationId = examinationId,
            RevisionNumber = revisionNumber,
            LifecycleState = state,
            ConcurrencyToken = 1,
            Title = $"Revision {revisionNumber}",
            Pathway = "rn",
            ExamType = ExamType.CAT,
            PassingScorePercent = 75m,
            IsPublished = state == ExamLifecycleState.Published,
            CreatedBy = creatorId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Exams.Add(exam);

        // Seed a question
        var question = new Question
        {
            Id = "q_" + Guid.NewGuid().ToString("N"),
            Stem = "Clinical test question",
            QuestionTypeKey = "single-choice",
            Pathway = "rn",
            Status = QuestionStatus.Published
        };
        context.Questions.Add(question);

        context.ExamQuestions.Add(new ExamQuestion
        {
            Id = "eq_" + Guid.NewGuid().ToString("N"),
            ExamId = exam.Id,
            QuestionId = question.Id,
            DisplayOrder = 1
        });

        await context.SaveChangesAsync();
        return exam;
    }

    [Fact]
    public async Task CreateRevision_SetsDraftStateAndIncrementsRevisionNumber()
    {
        using var context = CreateInMemoryContext(nameof(CreateRevision_SetsDraftStateAndIncrementsRevisionNumber));
        var examFam = await SeedExaminationAsync(context);
        var service = new ExamLifecycleService(context);

        var manager = CreateUserPrincipal("mgr_001", RoleHierarchy.RoleExamManager);
        var revision = await service.CreateRevisionAsync(examFam.Id, new CreateRevisionRequest
        {
            Title = "Revision 1",
            Description = "Initial practice draft",
            PassingScorePercent = 75m
        }, manager);

        Assert.Equal(1, revision.RevisionNumber);
        Assert.Equal(ExamLifecycleState.Draft.ToString(), revision.LifecycleState);
        Assert.Equal(1, revision.ConcurrencyToken);
        Assert.False(revision.IsPublished);
    }

    [Fact]
    public async Task CreateRevision_RejectsSecondDraftWhenActiveDraftExists()
    {
        using var context = CreateInMemoryContext(nameof(CreateRevision_RejectsSecondDraftWhenActiveDraftExists));
        var examFam = await SeedExaminationAsync(context);
        await SeedRevisionWithQuestionAsync(context, examFam.Id, 1, ExamLifecycleState.Draft);

        var service = new ExamLifecycleService(context);
        var manager = CreateUserPrincipal("mgr_001", RoleHierarchy.RoleExamManager);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateRevisionAsync(examFam.Id, new CreateRevisionRequest
            {
                Title = "Revision 2 Draft"
            }, manager));

        Assert.Contains("already has an active revision in Draft state", ex.Message);
    }

    [Fact]
    public async Task SubmitForReview_RequiresAtLeastOneQuestion()
    {
        using var context = CreateInMemoryContext(nameof(SubmitForReview_RequiresAtLeastOneQuestion));
        var examFam = await SeedExaminationAsync(context);

        // Revision with 0 questions
        var emptyRev = new Exam
        {
            Id = "rev_empty_01",
            ExaminationId = examFam.Id,
            RevisionNumber = 1,
            LifecycleState = ExamLifecycleState.Draft,
            ConcurrencyToken = 1,
            Title = "Empty Revision",
            Pathway = "rn",
            CreatedBy = "mgr_001",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Exams.Add(emptyRev);
        await context.SaveChangesAsync();

        var service = new ExamLifecycleService(context);
        var manager = CreateUserPrincipal("mgr_001", RoleHierarchy.RoleExamManager);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.SubmitForReviewAsync(emptyRev.Id, 1, manager));

        Assert.Contains("must contain at least one question", ex.Message);
    }

    [Fact]
    public async Task SubmitForReview_TransitionsDraftToInReview()
    {
        using var context = CreateInMemoryContext(nameof(SubmitForReview_TransitionsDraftToInReview));
        var examFam = await SeedExaminationAsync(context);
        var rev = await SeedRevisionWithQuestionAsync(context, examFam.Id, 1, ExamLifecycleState.Draft);

        var service = new ExamLifecycleService(context);
        var manager = CreateUserPrincipal("mgr_001", RoleHierarchy.RoleExamManager);

        var updated = await service.SubmitForReviewAsync(rev.Id, 1, manager);

        Assert.Equal(ExamLifecycleState.InReview.ToString(), updated.LifecycleState);
        Assert.Equal(2, updated.ConcurrencyToken);
        Assert.Equal("mgr_001", updated.SubmittedBy);
        Assert.NotNull(updated.SubmittedAt);
    }

    [Fact]
    public async Task RecommendApproval_AdvisoryEventPreservesInReviewState()
    {
        using var context = CreateInMemoryContext(nameof(RecommendApproval_AdvisoryEventPreservesInReviewState));
        var examFam = await SeedExaminationAsync(context);
        var rev = await SeedRevisionWithQuestionAsync(context, examFam.Id, 1, ExamLifecycleState.InReview);

        var service = new ExamLifecycleService(context);
        var reviewer = CreateUserPrincipal("rev_doc_01", RoleHierarchy.RoleReviewer);

        var updated = await service.RecommendApprovalAsync(rev.Id, 1, "Clinically verified content", reviewer);

        Assert.Equal(ExamLifecycleState.InReview.ToString(), updated.LifecycleState);
        Assert.Equal(2, updated.ConcurrencyToken);
        Assert.Equal("rev_doc_01", updated.ReviewedBy);
        Assert.NotNull(updated.ReviewedAt);

        // Verify audit log
        var log = await context.AuditLogs.FirstOrDefaultAsync(l => l.Action == "ExamRevisionReviewRecommended");
        Assert.NotNull(log);
        Assert.Contains("Clinically verified content", log.Description);
    }

    [Fact]
    public async Task ReturnForChanges_RequiresReasonAndReturnsToDraft()
    {
        using var context = CreateInMemoryContext(nameof(ReturnForChanges_RequiresReasonAndReturnsToDraft));
        var examFam = await SeedExaminationAsync(context);
        var rev = await SeedRevisionWithQuestionAsync(context, examFam.Id, 1, ExamLifecycleState.InReview);

        var service = new ExamLifecycleService(context);
        var reviewer = CreateUserPrincipal("rev_doc_01", RoleHierarchy.RoleReviewer);

        // Empty reason rejected
        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.ReturnForChangesAsync(rev.Id, 1, "", reviewer));

        // Valid reason succeeds
        var updated = await service.ReturnForChangesAsync(rev.Id, 1, "Question 1 contains outdated clinical guidelines", reviewer);

        Assert.Equal(ExamLifecycleState.Draft.ToString(), updated.LifecycleState);
        Assert.Equal(2, updated.ConcurrencyToken);
    }

    [Fact]
    public async Task Approve_SeparationOfDuties_CreatorCannotApproveOwnRevision()
    {
        using var context = CreateInMemoryContext(nameof(Approve_SeparationOfDuties_CreatorCannotApproveOwnRevision));
        var examFam = await SeedExaminationAsync(context);
        // Created by admin_001
        var rev = await SeedRevisionWithQuestionAsync(context, examFam.Id, 1, ExamLifecycleState.InReview, creatorId: "admin_001");

        var service = new ExamLifecycleService(context);
        var sameAdmin = CreateUserPrincipal("admin_001", RoleHierarchy.RoleAdmin);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ApproveAsync(rev.Id, 1, sameAdmin));

        Assert.Contains("Separation of duties violation: The revision creator cannot approve this revision.", ex.Message);
    }

    [Fact]
    public async Task Approve_DifferentAdmin_Succeeds()
    {
        using var context = CreateInMemoryContext(nameof(Approve_DifferentAdmin_Succeeds));
        var examFam = await SeedExaminationAsync(context);
        var rev = await SeedRevisionWithQuestionAsync(context, examFam.Id, 1, ExamLifecycleState.InReview, creatorId: "mgr_001");

        var service = new ExamLifecycleService(context);
        var differentAdmin = CreateUserPrincipal("admin_002", RoleHierarchy.RoleAdmin);

        var updated = await service.ApproveAsync(rev.Id, 1, differentAdmin);

        Assert.Equal(ExamLifecycleState.Approved.ToString(), updated.LifecycleState);
        Assert.Equal(2, updated.ConcurrencyToken);
        Assert.Equal("admin_002", updated.ApprovedBy);
        Assert.NotNull(updated.ApprovedAt);
    }

    [Fact]
    public async Task Publish_AtomicallyArchivesPreviousPublishedRevisionAndRecordsActiveAttempts()
    {
        using var context = CreateInMemoryContext(nameof(Publish_AtomicallyArchivesPreviousPublishedRevisionAndRecordsActiveAttempts));
        var examFam = await SeedExaminationAsync(context);

        // Revision 1 is Published
        var rev1 = await SeedRevisionWithQuestionAsync(context, examFam.Id, 1, ExamLifecycleState.Published);
        examFam.CurrentRevisionId = rev1.Id;

        // Active in-progress candidate attempt on Revision 1
        context.ExamAttempts.Add(new ExamAttempt
        {
            Id = "att_active_01",
            UserId = "cand_001",
            ExamId = rev1.Id,
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        // Revision 2 is Approved
        var rev2 = await SeedRevisionWithQuestionAsync(context, examFam.Id, 2, ExamLifecycleState.Approved);

        var service = new ExamLifecycleService(context);
        var manager = CreateUserPrincipal("mgr_001", RoleHierarchy.RoleExamManager);

        var publishedRev2 = await service.PublishAsync(rev2.Id, 1, manager);

        Assert.Equal(ExamLifecycleState.Published.ToString(), publishedRev2.LifecycleState);
        Assert.True(publishedRev2.IsPublished);

        // Verify Rev 1 was automatically archived
        var refreshedRev1 = await context.Exams.FindAsync(rev1.Id);
        Assert.NotNull(refreshedRev1);
        Assert.Equal(ExamLifecycleState.Archived, refreshedRev1.LifecycleState);
        Assert.False(refreshedRev1.IsPublished);
        Assert.NotNull(refreshedRev1.ArchivedAt);
        Assert.Equal("mgr_001", refreshedRev1.ArchivedBy);

        // Verify archive audit log captured the active attempt count (1)
        var archiveLog = await context.AuditLogs.FirstOrDefaultAsync(l => l.EntityId == rev1.Id && l.Action == "ExamRevisionArchived");
        Assert.NotNull(archiveLog);
        Assert.Contains("\"activeAttemptsCount\":1", archiveLog.Description);
        Assert.Contains(rev2.Id, archiveLog.Description);

        // Verify parent Examination.CurrentRevisionId updated
        var refreshedFam = await context.Examinations.FindAsync(examFam.Id);
        Assert.Equal(rev2.Id, refreshedFam!.CurrentRevisionId);
    }

    [Fact]
    public async Task Archive_RecordsActiveAttemptsCount()
    {
        using var context = CreateInMemoryContext(nameof(Archive_RecordsActiveAttemptsCount));
        var examFam = await SeedExaminationAsync(context);
        var rev = await SeedRevisionWithQuestionAsync(context, examFam.Id, 1, ExamLifecycleState.Published);

        context.ExamAttempts.Add(new ExamAttempt
        {
            Id = "att_p_01",
            UserId = "cand_01",
            ExamId = rev.Id,
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow
        });
        context.ExamAttempts.Add(new ExamAttempt
        {
            Id = "att_p_02",
            UserId = "cand_02",
            ExamId = rev.Id,
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var service = new ExamLifecycleService(context);
        var manager = CreateUserPrincipal("mgr_001", RoleHierarchy.RoleExamManager);

        var archived = await service.ArchiveAsync(rev.Id, 1, "End of clinical term", manager);

        Assert.Equal(ExamLifecycleState.Archived.ToString(), archived.LifecycleState);
        Assert.False(archived.IsPublished);

        var log = await context.AuditLogs.FirstOrDefaultAsync(l => l.EntityId == rev.Id && l.Action == "ExamRevisionArchived");
        Assert.NotNull(log);
        Assert.Contains("\"activeAttemptsCount\":2", log.Description);
        Assert.Contains("End of clinical term", log.Description);
    }

    [Fact]
    public async Task Restore_SuperadminOverride_Enforces30DayWindowAndNoDualPublished()
    {
        using var context = CreateInMemoryContext(nameof(Restore_SuperadminOverride_Enforces30DayWindowAndNoDualPublished));
        var examFam = await SeedExaminationAsync(context);
        var rev1 = await SeedRevisionWithQuestionAsync(context, examFam.Id, 1, ExamLifecycleState.Archived);
        rev1.ArchivedAt = DateTime.UtcNow.AddDays(-10); // Within 30 days
        await context.SaveChangesAsync();

        var service = new ExamLifecycleService(context);
        var superadmin = CreateUserPrincipal("super_001", RoleHierarchy.RoleSuperAdmin);
        var examManager = CreateUserPrincipal("mgr_001", RoleHierarchy.RoleExamManager);

        // Non-superadmin is rejected
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.RestoreAsync(rev1.Id, 1, "Accidental archival", examManager));

        // Restore succeeds within 30 days
        var restored = await service.RestoreAsync(rev1.Id, 1, "Approved curriculum restoration", superadmin);
        Assert.Equal(ExamLifecycleState.Published.ToString(), restored.LifecycleState);
        Assert.True(restored.IsPublished);

        // Now archive rev1, but simulate > 30 calendar days
        restored.ConcurrencyToken++; // token was incremented in service to 2
        await service.ArchiveAsync(rev1.Id, 2, "Re-archived", examManager);
        var archivedRev1 = await context.Exams.FindAsync(rev1.Id);
        archivedRev1!.ArchivedAt = DateTime.UtcNow.AddDays(-31); // > 30 days
        await context.SaveChangesAsync();

        var exExpired = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.RestoreAsync(rev1.Id, 3, "Late restoration", superadmin));
        Assert.Contains("Restoration window expired", exExpired.Message);
    }

    [Fact]
    public async Task Restore_RejectsRestorationIfAnotherRevisionIsCurrentlyPublished()
    {
        using var context = CreateInMemoryContext(nameof(Restore_RejectsRestorationIfAnotherRevisionIsCurrentlyPublished));
        var examFam = await SeedExaminationAsync(context);

        // Rev 1 is Archived
        var rev1 = await SeedRevisionWithQuestionAsync(context, examFam.Id, 1, ExamLifecycleState.Archived);
        rev1.ArchivedAt = DateTime.UtcNow.AddDays(-5);

        // Rev 2 is Published
        var rev2 = await SeedRevisionWithQuestionAsync(context, examFam.Id, 2, ExamLifecycleState.Published);
        await context.SaveChangesAsync();

        var service = new ExamLifecycleService(context);
        var superadmin = CreateUserPrincipal("super_001", RoleHierarchy.RoleSuperAdmin);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.RestoreAsync(rev1.Id, 1, "Attempting dual published", superadmin));

        Assert.Contains("another revision is currently published for this examination", ex.Message);
    }

    [Fact]
    public async Task Retire_ArchivedToRetired_IsTerminal()
    {
        using var context = CreateInMemoryContext(nameof(Retire_ArchivedToRetired_IsTerminal));
        var examFam = await SeedExaminationAsync(context);
        var rev = await SeedRevisionWithQuestionAsync(context, examFam.Id, 1, ExamLifecycleState.Archived);

        var service = new ExamLifecycleService(context);
        var manager = CreateUserPrincipal("mgr_001", RoleHierarchy.RoleExamManager);

        var retired = await service.RetireAsync(rev.Id, 1, "Curriculum replaced by 2027 standard", manager);
        Assert.Equal(ExamLifecycleState.Retired.ToString(), retired.LifecycleState);
        Assert.False(retired.IsPublished);
        Assert.NotNull(retired.RetiredAt);

        // Verify cannot be submitted, published, restored or approved
        var superadmin = CreateUserPrincipal("super_001", RoleHierarchy.RoleSuperAdmin);
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.RestoreAsync(rev.Id, 2, "Try revive retired", superadmin));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.PublishAsync(rev.Id, 2, manager));
    }

    [Fact]
    public async Task EmergencyRetire_SuperadminCanRetirePublishedDirectly()
    {
        using var context = CreateInMemoryContext(nameof(EmergencyRetire_SuperadminCanRetirePublishedDirectly));
        var examFam = await SeedExaminationAsync(context);
        var rev = await SeedRevisionWithQuestionAsync(context, examFam.Id, 1, ExamLifecycleState.Published);

        var service = new ExamLifecycleService(context);
        var superadmin = CreateUserPrincipal("super_001", RoleHierarchy.RoleSuperAdmin);

        var retired = await service.EmergencyRetireAsync(rev.Id, 1, "Immediate withdrawal due to compromised item bank", superadmin);
        Assert.Equal(ExamLifecycleState.Retired.ToString(), retired.LifecycleState);
        Assert.False(retired.IsPublished);

        var log = await context.AuditLogs.FirstOrDefaultAsync(l => l.Action == "ExamLifecycleOverride");
        Assert.NotNull(log);
        Assert.Contains("EmergencyRetire", log.Description);
        Assert.Contains("compromised item bank", log.Description);
    }

    [Fact]
    public async Task ConcurrencyTokenMismatch_ThrowsDbUpdateConcurrencyExceptionAndLogsConflict()
    {
        using var context = CreateInMemoryContext(nameof(ConcurrencyTokenMismatch_ThrowsDbUpdateConcurrencyExceptionAndLogsConflict));
        var examFam = await SeedExaminationAsync(context);
        var rev = await SeedRevisionWithQuestionAsync(context, examFam.Id, 1, ExamLifecycleState.Draft);

        var service = new ExamLifecycleService(context);
        var manager = CreateUserPrincipal("mgr_001", RoleHierarchy.RoleExamManager);

        // Stale token = 999 while current token is 1
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() =>
            service.SubmitForReviewAsync(rev.Id, 999, manager));

        var conflictLog = await context.AuditLogs.FirstOrDefaultAsync(l => l.Outcome == "Conflict");
        Assert.NotNull(conflictLog);
        Assert.Contains("ConcurrencyConflict", conflictLog.Description);
    }

    [Fact]
    public async Task RoleAuthorization_ContentManagerHasNoLifecycleAuthority()
    {
        using var context = CreateInMemoryContext(nameof(RoleAuthorization_ContentManagerHasNoLifecycleAuthority));
        var examFam = await SeedExaminationAsync(context);
        var rev = await SeedRevisionWithQuestionAsync(context, examFam.Id, 1, ExamLifecycleState.Draft);

        var service = new ExamLifecycleService(context);
        var contentManager = CreateUserPrincipal("cm_001", RoleHierarchy.RoleContentManager);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.CreateRevisionAsync(examFam.Id, new CreateRevisionRequest { Title = "T" }, contentManager));

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.SubmitForReviewAsync(rev.Id, 1, contentManager));

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.ApproveAsync(rev.Id, 1, contentManager));

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.PublishAsync(rev.Id, 1, contentManager));
    }

    [Fact]
    public async Task InstructorAccess_CanOnlyViewPublishedExaminationsAndRevisions()
    {
        using var context = CreateInMemoryContext(nameof(InstructorAccess_CanOnlyViewPublishedExaminationsAndRevisions));
        var examFam = await SeedExaminationAsync(context);

        // Rev 1 is Draft
        var revDraft = await SeedRevisionWithQuestionAsync(context, examFam.Id, 1, ExamLifecycleState.Draft);

        var service = new ExamLifecycleService(context);
        var instructor = CreateUserPrincipal("inst_001", RoleHierarchy.RoleInstructor);
        var manager = CreateUserPrincipal("mgr_001", RoleHierarchy.RoleExamManager);

        // Instructor cannot view the draft revision
        var instRevView = await service.GetRevisionAsync(revDraft.Id, instructor);
        Assert.Null(instRevView);

        // Exam Manager can view the draft revision
        var mgrRevView = await service.GetRevisionAsync(revDraft.Id, manager);
        Assert.NotNull(mgrRevView);

        // Examination family has no published revisions, so instructor cannot see family
        var instFamView = await service.GetExaminationAsync(examFam.Id, instructor);
        Assert.Null(instFamView);

        // Publish a revision
        revDraft.LifecycleState = ExamLifecycleState.Published;
        revDraft.IsPublished = true;
        examFam.CurrentRevisionId = revDraft.Id;
        await context.SaveChangesAsync();

        // Now instructor sees the published revision and examination
        var instFamViewPublished = await service.GetExaminationAsync(examFam.Id, instructor);
        Assert.NotNull(instFamViewPublished);
        Assert.Single(instFamViewPublished.Revisions);
        Assert.Equal(ExamLifecycleState.Published.ToString(), instFamViewPublished.Revisions[0].LifecycleState);
    }
}
