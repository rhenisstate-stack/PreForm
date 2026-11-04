using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class ExaminationDuplicationTests
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

    private static async Task<Examination> SeedFamilyAsync(AppDbContext context, string code, string title, string pathway = "rn", string creatorId = "adm_1")
    {
        var fam = new Examination
        {
            Id = "fam_" + Guid.NewGuid().ToString("N"),
            Code = code,
            Title = title,
            Pathway = pathway,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = creatorId
        };
        context.Examinations.Add(fam);
        await context.SaveChangesAsync();
        return fam;
    }

    private static async Task<Exam> SeedRevisionAsync(
        AppDbContext context,
        string examinationId,
        int revisionNumber,
        string title,
        ExamLifecycleState state,
        string pathway = "rn",
        int questionCount = 0,
        string creatorId = "adm_1")
    {
        var rev = new Exam
        {
            Id = "rev_" + Guid.NewGuid().ToString("N"),
            ExaminationId = examinationId,
            RevisionNumber = revisionNumber,
            LifecycleState = state,
            ConcurrencyToken = 1,
            Title = title,
            Description = $"Description for {title}",
            Pathway = pathway,
            ExamType = ExamType.Practice,
            TimeLimitMinutes = 90,
            PassingScorePercent = 75.0m,
            IsPublished = state == ExamLifecycleState.Published,
            CreatedBy = creatorId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Exams.Add(rev);

        for (int i = 1; i <= questionCount; i++)
        {
            var q = new Question
            {
                Id = $"q_{rev.Id}_{i}",
                Stem = $"Stem {i} for {rev.Id}",
                Pathway = pathway,
                Status = QuestionStatus.Published,
                QuestionTypeKey = "single-choice"
            };
            context.Questions.Add(q);

            var eq = new ExamQuestion
            {
                Id = $"eq_{rev.Id}_{i}",
                ExamId = rev.Id,
                QuestionId = q.Id,
                DisplayOrder = i
            };
            context.ExamQuestions.Add(eq);
        }

        await context.SaveChangesAsync();
        return rev;
    }

    // ── OPERATION A: DUPLICATE AS A NEW EXAMINATION FAMILY ──

    [Fact]
    public async Task DuplicateExamination_CreatesNewFamilyWithAllocatedCode_InitialDraftRevision_AndCopiedQuestions()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var admin = CreateUserPrincipal("adm_1", RoleHierarchy.RoleAdmin);

        var sourceFam = await SeedFamilyAsync(context, "RN-EX-000001", "Source Cardiovascular Exam", "rn");
        var sourceRev = await SeedRevisionAsync(context, sourceFam.Id, 1, "Source Rev 1", ExamLifecycleState.Published, "rn", 5);

        // Seed an attempt on source revision to verify attempts are NOT copied
        var attempt = new ExamAttempt
        {
            Id = "att_001",
            ExamId = sourceRev.Id,
            UserId = "user_cand_1",
            ScorePercent = 80.0m
        };
        context.ExamAttempts.Add(attempt);
        await context.SaveChangesAsync();

        var request = new DuplicateExaminationRequest
        {
            Title = "Cloned Cardiovascular Exam",
            SourceRevisionId = sourceRev.Id
        };

        var response = await service.DuplicateExaminationAsync(sourceFam.Id, request, admin);

        Assert.NotNull(response);
        Assert.True(response.Success);
        Assert.NotEqual(sourceFam.Id, response.ExaminationId);
        Assert.NotEqual(sourceFam.Code, response.ExaminationCode);
        Assert.StartsWith("RN-EX-", response.ExaminationCode);
        Assert.Equal("Cloned Cardiovascular Exam", response.ExaminationTitle);
        Assert.Equal("rn", response.Pathway);

        // Verify initial revision
        Assert.NotEqual(sourceRev.Id, response.RevisionId);
        Assert.Equal(1, response.RevisionNumber);
        Assert.Equal("Draft", response.LifecycleState);
        Assert.Equal(5, response.QuestionCount);

        // Verify database state for the new family
        var newFamily = await context.Examinations
            .Include(e => e.Revisions)
                .ThenInclude(r => r.ExamQuestions)
            .FirstOrDefaultAsync(e => e.Id == response.ExaminationId);

        Assert.NotNull(newFamily);
        Assert.Single(newFamily.Revisions);
        var initialRev = newFamily.Revisions.First();
        Assert.Equal(1, initialRev.RevisionNumber);
        Assert.Equal(ExamLifecycleState.Draft, initialRev.LifecycleState);
        Assert.False(initialRev.IsPublished);
        Assert.Equal(5, initialRev.ExamQuestions.Count);

        // Verify question memberships are distinct entities with preserved QuestionIds and DisplayOrders
        var copiedQuestions = initialRev.ExamQuestions.OrderBy(eq => eq.DisplayOrder).ToList();
        for (int i = 0; i < 5; i++)
        {
            Assert.Equal($"q_{sourceRev.Id}_{i + 1}", copiedQuestions[i].QuestionId);
            Assert.Equal(i + 1, copiedQuestions[i].DisplayOrder);
            Assert.Equal(initialRev.Id, copiedQuestions[i].ExamId);
        }

        // Verify source family and revision were NOT mutated
        var refreshedSourceRev = await context.Exams
            .Include(e => e.Attempts)
            .Include(e => e.ExamQuestions)
            .FirstAsync(e => e.Id == sourceRev.Id);
        Assert.Equal(ExamLifecycleState.Published, refreshedSourceRev.LifecycleState);
        Assert.True(refreshedSourceRev.IsPublished);
        Assert.Equal(5, refreshedSourceRev.ExamQuestions.Count);
        Assert.Single(refreshedSourceRev.Attempts); // Attempt remains on source

        // Verify NO attempts exist on the new revision
        var newRevAttempts = await context.ExamAttempts.Where(ea => ea.ExamId == initialRev.Id).ToListAsync();
        Assert.Empty(newRevAttempts);

        // Verify audit logs
        var auditLogs = await context.AuditLogs.Where(a => a.EntityId == newFamily.Id || a.EntityId == initialRev.Id).ToListAsync();
        Assert.Contains(auditLogs, a => a.Action == "ExamDuplicated" && a.EntityType == "Examination");
        Assert.Contains(auditLogs, a => a.Action == "ExamRevisionCreated" && a.EntityType == "Exam");
    }

    [Fact]
    public async Task DuplicateExamination_OmittingSourceRevisionId_DefaultsToPublishedRevision()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var admin = CreateUserPrincipal("adm_1", RoleHierarchy.RoleAdmin);

        var sourceFam = await SeedFamilyAsync(context, "PN-EX-000001", "PN Assessment", "pn");
        await SeedRevisionAsync(context, sourceFam.Id, 1, "PN Rev 1 Archived", ExamLifecycleState.Archived, "pn", 2);
        var pubRev = await SeedRevisionAsync(context, sourceFam.Id, 2, "PN Rev 2 Published", ExamLifecycleState.Published, "pn", 8);

        var request = new DuplicateExaminationRequest
        {
            // Title and SourceRevisionId omitted
        };

        var response = await service.DuplicateExaminationAsync(sourceFam.Id, request, admin);

        Assert.True(response.Success);
        Assert.Equal("PN Assessment (Copy)", response.ExaminationTitle);
        Assert.Equal("pn", response.Pathway);
        Assert.Equal(8, response.QuestionCount); // Picked Published rev with 8 questions
    }

    [Theory]
    [InlineData(ExamLifecycleState.Draft)]
    [InlineData(ExamLifecycleState.InReview)]
    [InlineData(ExamLifecycleState.Retired)]
    public async Task DuplicateExamination_IneligibleSourceRevisionState_ThrowsInvalidOperationException(ExamLifecycleState state)
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var admin = CreateUserPrincipal("adm_1", RoleHierarchy.RoleAdmin);

        var sourceFam = await SeedFamilyAsync(context, "RN-EX-000002", "Source State Test", "rn");
        var sourceRev = await SeedRevisionAsync(context, sourceFam.Id, 1, "Rev Ineligible", state, "rn", 3);

        var request = new DuplicateExaminationRequest { SourceRevisionId = sourceRev.Id };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.DuplicateExaminationAsync(sourceFam.Id, request, admin));
        Assert.Contains("Cannot duplicate", ex.Message);
    }

    [Fact]
    public async Task DuplicateExamination_SourceRevisionFromDifferentFamily_ThrowsInvalidOperationException()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var admin = CreateUserPrincipal("adm_1", RoleHierarchy.RoleAdmin);

        var famA = await SeedFamilyAsync(context, "RN-EX-000010", "Family A", "rn");
        var famB = await SeedFamilyAsync(context, "RN-EX-000020", "Family B", "rn");
        var revB = await SeedRevisionAsync(context, famB.Id, 1, "Rev B1", ExamLifecycleState.Published, "rn", 2);

        // Attempt to duplicate Family A using a revision from Family B
        var request = new DuplicateExaminationRequest { SourceRevisionId = revB.Id };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.DuplicateExaminationAsync(famA.Id, request, admin));
        Assert.Contains("does not belong to examination family", ex.Message);
    }

    // ── OPERATION B: CREATE A NEW REVISION WITHIN THE SAME FAMILY ──

    [Fact]
    public async Task CreateRevision_WithinSameFamily_AllocatesNextRevisionNumber_CopiesQuestionsAndPreservesFamilyIdentity()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var manager = CreateUserPrincipal("mgr_001", RoleHierarchy.RoleExamManager);

        var fam = await SeedFamilyAsync(context, "RN-EX-000100", "Critical Care Family", "rn");
        var rev1 = await SeedRevisionAsync(context, fam.Id, 1, "Rev 1 Published", ExamLifecycleState.Published, "rn", 4);

        // Seed attempt on rev 1
        context.ExamAttempts.Add(new ExamAttempt { Id = "att_rev1", ExamId = rev1.Id, UserId = "u1", ScorePercent = 90.0m });
        await context.SaveChangesAsync();

        var request = new CreateRevisionRequest
        {
            Title = "Critical Care Revision 2",
            Description = "Updated with 2026 guidelines",
            SourceRevisionId = rev1.Id,
            CopyQuestions = true
        };

        var result = await service.CreateRevisionAsync(fam.Id, request, manager);

        Assert.NotNull(result);
        Assert.Equal(fam.Id, result.ExaminationId);
        Assert.Equal(fam.Code, result.ExaminationCode);
        Assert.NotEqual(rev1.Id, result.Id);
        Assert.Equal(2, result.RevisionNumber);
        Assert.Equal("Draft", result.LifecycleState);
        Assert.Equal(4, result.QuestionCount);
        Assert.Equal("Critical Care Revision 2", result.Title);

        // Confirm Rev 1 remains intact
        var dbRev1 = await context.Exams.Include(e => e.Attempts).Include(e => e.ExamQuestions).FirstAsync(e => e.Id == rev1.Id);
        Assert.Equal(ExamLifecycleState.Published, dbRev1.LifecycleState);
        Assert.Equal(1, dbRev1.RevisionNumber);
        Assert.Single(dbRev1.Attempts);
        Assert.Equal(4, dbRev1.ExamQuestions.Count);

        // Confirm new Rev 2 has NO attempts
        var dbRev2 = await context.Exams.Include(e => e.Attempts).Include(e => e.ExamQuestions).FirstAsync(e => e.Id == result.Id);
        Assert.Empty(dbRev2.Attempts);
        Assert.Equal(4, dbRev2.ExamQuestions.Count);

        // Verify question DisplayOrder is preserved
        var rev2Questions = dbRev2.ExamQuestions.OrderBy(eq => eq.DisplayOrder).ToList();
        for (int i = 0; i < 4; i++)
        {
            Assert.Equal($"q_{rev1.Id}_{i + 1}", rev2Questions[i].QuestionId);
            Assert.Equal(i + 1, rev2Questions[i].DisplayOrder);
        }
    }

    [Fact]
    public async Task CreateRevision_WhenActiveDraftAlreadyExists_ThrowsInvalidOperationException()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var admin = CreateUserPrincipal("adm_1", RoleHierarchy.RoleAdmin);

        var fam = await SeedFamilyAsync(context, "RN-EX-000200", "Family With Draft", "rn");
        await SeedRevisionAsync(context, fam.Id, 1, "Rev 1 Published", ExamLifecycleState.Published, "rn", 3);
        await SeedRevisionAsync(context, fam.Id, 2, "Rev 2 Draft", ExamLifecycleState.Draft, "rn", 0);

        var request = new CreateRevisionRequest
        {
            Title = "Attempted Rev 3",
            SourceRevisionId = null
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateRevisionAsync(fam.Id, request, admin));
        Assert.Contains("already has an active revision in Draft state", ex.Message);
    }

    [Theory]
    [InlineData(ExamLifecycleState.Draft)]
    [InlineData(ExamLifecycleState.InReview)]
    [InlineData(ExamLifecycleState.Retired)]
    public async Task CreateRevision_IneligibleSourceRevisionState_ThrowsInvalidOperationException(ExamLifecycleState state)
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var admin = CreateUserPrincipal("adm_1", RoleHierarchy.RoleAdmin);

        var fam = await SeedFamilyAsync(context, "RN-EX-000300", "State Test Family", "rn");
        var sourceRev = await SeedRevisionAsync(context, fam.Id, 1, "Rev Ineligible", state, "rn", 3);

        var request = new CreateRevisionRequest
        {
            Title = "New Rev",
            SourceRevisionId = sourceRev.Id
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateRevisionAsync(fam.Id, request, admin));
        Assert.Contains("Cannot branch a new revision", ex.Message);
    }

    [Fact]
    public async Task CreateRevision_SourceRevisionFromDifferentFamily_ThrowsInvalidOperationException()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var admin = CreateUserPrincipal("adm_1", RoleHierarchy.RoleAdmin);

        var fam1 = await SeedFamilyAsync(context, "RN-EX-000401", "Target Family", "rn");
        var fam2 = await SeedFamilyAsync(context, "RN-EX-000402", "Other Family", "rn");
        var revFromOther = await SeedRevisionAsync(context, fam2.Id, 1, "Other Rev", ExamLifecycleState.Published, "rn", 3);

        var request = new CreateRevisionRequest
        {
            Title = "Rev with foreign source",
            SourceRevisionId = revFromOther.Id
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateRevisionAsync(fam1.Id, request, admin));
        Assert.Contains("does not belong to examination family", ex.Message);
    }

    // ── SECURITY & AUTHORIZATION TESTS ──

    [Theory]
    [InlineData(RoleHierarchy.RoleCandidate)]
    [InlineData(RoleHierarchy.RoleInstructor)]
    [InlineData(RoleHierarchy.RoleReviewer)]
    public async Task DuplicateExamination_UnauthorizedRoles_ThrowsUnauthorizedAccessException(string unauthorizedRole)
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var user = CreateUserPrincipal("user_unauth", unauthorizedRole);

        var fam = await SeedFamilyAsync(context, "RN-EX-000500", "Auth Test Family", "rn");
        var rev = await SeedRevisionAsync(context, fam.Id, 1, "Rev 1 Published", ExamLifecycleState.Published, "rn", 2);

        var request = new DuplicateExaminationRequest { SourceRevisionId = rev.Id };

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.DuplicateExaminationAsync(fam.Id, request, user));
    }

    [Theory]
    [InlineData(RoleHierarchy.RoleCandidate)]
    [InlineData(RoleHierarchy.RoleInstructor)]
    [InlineData(RoleHierarchy.RoleReviewer)]
    public async Task CreateRevision_UnauthorizedRoles_ThrowsUnauthorizedAccessException(string unauthorizedRole)
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var user = CreateUserPrincipal("user_unauth", unauthorizedRole);

        var fam = await SeedFamilyAsync(context, "RN-EX-000501", "Auth Test Family 2", "rn");
        var rev = await SeedRevisionAsync(context, fam.Id, 1, "Rev 1 Published", ExamLifecycleState.Published, "rn", 2);

        var request = new CreateRevisionRequest { Title = "Unauthorized Rev", SourceRevisionId = rev.Id };

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.CreateRevisionAsync(fam.Id, request, user));
    }

    [Fact]
    public async Task DuplicateExamination_UnapprovedQuestionInSource_ThrowsInvalidOperationException()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var admin = CreateUserPrincipal("adm_1", RoleHierarchy.RoleAdmin);

        var fam = await SeedFamilyAsync(context, "RN-EX-000600", "Question Eligibility Family", "rn");
        var rev = await SeedRevisionAsync(context, fam.Id, 1, "Rev 1 Published", ExamLifecycleState.Published, "rn", 1);

        // Decommission the question (mark it Draft / not Approved)
        var question = await context.Questions.FirstAsync(q => q.Id == $"q_{rev.Id}_1");
        question.Status = QuestionStatus.Draft;
        await context.SaveChangesAsync();

        var request = new DuplicateExaminationRequest { SourceRevisionId = rev.Id };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.DuplicateExaminationAsync(fam.Id, request, admin));
        Assert.Contains("is not eligible to be copied", ex.Message);
    }
}
