using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class ExaminationDiscoveryTests
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

    private static async Task<Examination> SeedFamilyAsync(
        AppDbContext context,
        string code,
        string title,
        string pathway = "rn",
        string creatorId = "admin_001")
    {
        var family = new Examination
        {
            Id = "fam_" + Guid.NewGuid().ToString("N"),
            Code = code,
            Title = title,
            Pathway = pathway,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = creatorId
        };
        context.Examinations.Add(family);
        await context.SaveChangesAsync();
        return family;
    }

    private static async Task<Exam> SeedRevisionAsync(
        AppDbContext context,
        string familyId,
        int revisionNumber,
        string title,
        ExamLifecycleState state,
        string pathway = "rn",
        int questionCount = 0)
    {
        var rev = new Exam
        {
            Id = "rev_" + Guid.NewGuid().ToString("N"),
            ExaminationId = familyId,
            RevisionNumber = revisionNumber,
            Title = title,
            Description = $"Description for {title}",
            Pathway = pathway,
            LifecycleState = state,
            IsPublished = state == ExamLifecycleState.Published,
            PublishedAt = state == ExamLifecycleState.Published ? DateTime.UtcNow : null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = "author_001"
        };
        context.Exams.Add(rev);

        for (int i = 0; i < questionCount; i++)
        {
            var q = new Question
            {
                Id = $"q_{Guid.NewGuid():N}",
                Pathway = pathway,
                Stem = $"Question stem {i + 1}",
                QuestionTypeKey = "single-choice",
                Difficulty = QuestionDifficulty.Moderate,
                Status = QuestionStatus.Published
            };
            context.Questions.Add(q);
            context.ExamQuestions.Add(new ExamQuestion
            {
                Id = $"eq_{Guid.NewGuid():N}",
                ExamId = rev.Id,
                QuestionId = q.Id,
                DisplayOrder = i + 1
            });
        }

        await context.SaveChangesAsync();
        return rev;
    }

    [Fact]
    public async Task QueryExaminations_PathwayFilter_ReturnsOnlyMatchingPathway()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var admin = CreateUserPrincipal("adm_1", RoleHierarchy.RoleAdmin);

        var rnFam = await SeedFamilyAsync(context, "RN-EX-000001", "RN Comprehensive Exam", "rn");
        await SeedRevisionAsync(context, rnFam.Id, 1, "RN Rev 1", ExamLifecycleState.Published, "rn", 10);

        var pnFam = await SeedFamilyAsync(context, "PN-EX-000001", "PN Practical Exam", "pn");
        await SeedRevisionAsync(context, pnFam.Id, 1, "PN Rev 1", ExamLifecycleState.Published, "pn", 10);

        // Filter RN
        var rnResult = await service.QueryExaminationsAsync(new ExaminationQueryParameters { Pathway = "rn" }, admin);
        Assert.Single(rnResult.Items);
        Assert.Equal("RN-EX-000001", rnResult.Items[0].Code);
        Assert.Equal("rn", rnResult.Items[0].Pathway);

        // Filter PN
        var pnResult = await service.QueryExaminationsAsync(new ExaminationQueryParameters { Pathway = "pn" }, admin);
        Assert.Single(pnResult.Items);
        Assert.Equal("PN-EX-000001", pnResult.Items[0].Code);
        Assert.Equal("pn", pnResult.Items[0].Pathway);

        // Filter All
        var allResult = await service.QueryExaminationsAsync(new ExaminationQueryParameters { Pathway = "all" }, admin);
        Assert.Equal(2, allResult.Items.Count);
    }

    [Fact]
    public async Task QueryExaminations_RevisionStatusFilter_ReturnsFamiliesWithMatchingRevisionState()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var admin = CreateUserPrincipal("adm_1", RoleHierarchy.RoleAdmin);

        // Fam 1 has Published and Draft revisions
        var fam1 = await SeedFamilyAsync(context, "RN-EX-000001", "Family With Draft and Published", "rn");
        await SeedRevisionAsync(context, fam1.Id, 1, "Rev 1", ExamLifecycleState.Published, "rn");
        await SeedRevisionAsync(context, fam1.Id, 2, "Rev 2", ExamLifecycleState.Draft, "rn");

        // Fam 2 has only Retired revision
        var fam2 = await SeedFamilyAsync(context, "RN-EX-000002", "Family With Retired Only", "rn");
        await SeedRevisionAsync(context, fam2.Id, 1, "Rev 1", ExamLifecycleState.Retired, "rn");

        // Filter Draft
        var draftResult = await service.QueryExaminationsAsync(new ExaminationQueryParameters { RevisionStatus = "Draft" }, admin);
        Assert.Single(draftResult.Items);
        Assert.Equal(fam1.Id, draftResult.Items[0].Id);

        // Filter Retired
        var retiredResult = await service.QueryExaminationsAsync(new ExaminationQueryParameters { RevisionStatus = "Retired" }, admin);
        Assert.Single(retiredResult.Items);
        Assert.Equal(fam2.Id, retiredResult.Items[0].Id);
    }

    [Fact]
    public async Task QueryExaminations_TextSearch_MatchesCodeTitleAndRevisionTitle()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var admin = CreateUserPrincipal("adm_1", RoleHierarchy.RoleAdmin);

        var fam1 = await SeedFamilyAsync(context, "RN-EX-000101", "Pediatric Nursing Special Exam", "rn");
        await SeedRevisionAsync(context, fam1.Id, 1, "Pediatric Standard Edition", ExamLifecycleState.Published, "rn");

        var fam2 = await SeedFamilyAsync(context, "RN-EX-000202", "Adult Health Core Exam", "rn");
        await SeedRevisionAsync(context, fam2.Id, 1, "Cardiovascular Focus Revision", ExamLifecycleState.Published, "rn");

        // Search by Code
        var searchCode = await service.QueryExaminationsAsync(new ExaminationQueryParameters { Search = "000101" }, admin);
        Assert.Single(searchCode.Items);
        Assert.Equal("RN-EX-000101", searchCode.Items[0].Code);

        // Search by Family Title
        var searchTitle = await service.QueryExaminationsAsync(new ExaminationQueryParameters { Search = "pediatric" }, admin);
        Assert.Single(searchTitle.Items);
        Assert.Equal(fam1.Id, searchTitle.Items[0].Id);

        // Search by Revision Title
        var searchRev = await service.QueryExaminationsAsync(new ExaminationQueryParameters { Search = "cardiovascular" }, admin);
        Assert.Single(searchRev.Items);
        Assert.Equal(fam2.Id, searchRev.Items[0].Id);
    }

    [Fact]
    public async Task QueryExaminations_PaginationBounds_ComputesMetadataAndClampsBounds()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var admin = CreateUserPrincipal("adm_1", RoleHierarchy.RoleAdmin);

        for (int i = 1; i <= 25; i++)
        {
            var code = $"RN-EX-{i:D6}";
            var fam = await SeedFamilyAsync(context, code, $"Exam Family {i}", "rn");
            await SeedRevisionAsync(context, fam.Id, 1, $"Rev 1", ExamLifecycleState.Published, "rn");
        }

        // Page 1 with pageSize 10
        var page1 = await service.QueryExaminationsAsync(new ExaminationQueryParameters { Page = 1, PageSize = 10, SortBy = "code", SortDirection = "asc" }, admin);
        Assert.Equal(10, page1.Items.Count);
        Assert.Equal(25, page1.Pagination.TotalItems);
        Assert.Equal(3, page1.Pagination.TotalPages);
        Assert.Equal(1, page1.Pagination.Page);
        Assert.Equal("RN-EX-000001", page1.Items[0].Code);

        // Page 3 with pageSize 10
        var page3 = await service.QueryExaminationsAsync(new ExaminationQueryParameters { Page = 3, PageSize = 10, SortBy = "code", SortDirection = "asc" }, admin);
        Assert.Equal(5, page3.Items.Count);
        Assert.Equal(3, page3.Pagination.Page);
        Assert.Equal("RN-EX-000021", page3.Items[0].Code);

        // Negative page clamped to 1
        var negPage = await service.QueryExaminationsAsync(new ExaminationQueryParameters { Page = -5, PageSize = 10 }, admin);
        Assert.Equal(1, negPage.Pagination.Page);

        // Excess pageSize clamped to 100
        var largePage = await service.QueryExaminationsAsync(new ExaminationQueryParameters { Page = 1, PageSize = 500 }, admin);
        Assert.Equal(100, largePage.Pagination.PageSize);
    }

    [Fact]
    public async Task QueryExaminations_DistinguishesPublishedVsLatestRevision()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var admin = CreateUserPrincipal("adm_1", RoleHierarchy.RoleAdmin);

        var fam = await SeedFamilyAsync(context, "RN-EX-000001", "Multi-Revision Family", "rn");
        fam.CurrentRevisionId = "rev_pub_1";
        await context.SaveChangesAsync();

        var rev1 = await SeedRevisionAsync(context, fam.Id, 1, "Rev 1 Published", ExamLifecycleState.Published, "rn", 50);
        var rev2 = await SeedRevisionAsync(context, fam.Id, 2, "Rev 2 In Review", ExamLifecycleState.InReview, "rn", 60);
        var rev3 = await SeedRevisionAsync(context, fam.Id, 3, "Rev 3 Working Draft", ExamLifecycleState.Draft, "rn", 70);

        var result = await service.QueryExaminationsAsync(new ExaminationQueryParameters(), admin);
        var item = Assert.Single(result.Items);

        Assert.Equal(3, item.RevisionCount);
        Assert.NotNull(item.PublishedRevision);
        Assert.Equal(1, item.PublishedRevision!.RevisionNumber);
        Assert.Equal("Published", item.PublishedRevision.LifecycleState);
        Assert.Equal(50, item.PublishedRevision.QuestionCount);

        Assert.NotNull(item.LatestRevision);
        Assert.Equal(3, item.LatestRevision!.RevisionNumber);
        Assert.Equal("Draft", item.LatestRevision.LifecycleState);
        Assert.Equal(70, item.LatestRevision.QuestionCount);
    }

    [Fact]
    public async Task QueryExaminations_RestrictedViewer_OnlyDiscoversFamiliesWithPublishedRevisions()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var candidate = CreateUserPrincipal("cand_1", RoleHierarchy.RoleCandidate);

        // Fam 1 has a published revision
        var fam1 = await SeedFamilyAsync(context, "RN-EX-000001", "Live Examination", "rn");
        await SeedRevisionAsync(context, fam1.Id, 1, "Published Rev", ExamLifecycleState.Published, "rn", 10);
        await SeedRevisionAsync(context, fam1.Id, 2, "Draft Rev", ExamLifecycleState.Draft, "rn", 20);

        // Fam 2 has only draft revision
        var fam2 = await SeedFamilyAsync(context, "RN-EX-000002", "Unpublished Draft Exam", "rn");
        await SeedRevisionAsync(context, fam2.Id, 1, "Draft Only Rev", ExamLifecycleState.Draft, "rn", 15);

        var result = await service.QueryExaminationsAsync(new ExaminationQueryParameters(), candidate);

        Assert.Single(result.Items);
        Assert.Equal(fam1.Id, result.Items[0].Id);
        // Candidate only sees the 1 published revision in the summary count
        Assert.Equal(1, result.Items[0].RevisionCount);
        Assert.Null(result.Items[0].LatestRevision?.Title == "Draft Rev" ? result.Items[0].LatestRevision : null);
    }

    [Fact]
    public async Task GetFamilyRevisions_ReturnsRevisionsInDescendingOrder()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var admin = CreateUserPrincipal("adm_1", RoleHierarchy.RoleAdmin);

        var fam = await SeedFamilyAsync(context, "RN-EX-000001", "Family Lineage Test", "rn");
        await SeedRevisionAsync(context, fam.Id, 1, "Rev 1", ExamLifecycleState.Published, "rn", 5);
        await SeedRevisionAsync(context, fam.Id, 2, "Rev 2", ExamLifecycleState.Approved, "rn", 10);
        await SeedRevisionAsync(context, fam.Id, 3, "Rev 3", ExamLifecycleState.Draft, "rn", 15);

        var result = await service.GetFamilyRevisionsAsync(fam.Id, admin);

        Assert.True(result.Success);
        Assert.Equal(fam.Id, result.ExaminationId);
        Assert.Equal(3, result.Revisions.Count);
        Assert.Equal(3, result.Revisions[0].RevisionNumber);
        Assert.Equal(2, result.Revisions[1].RevisionNumber);
        Assert.Equal(1, result.Revisions[2].RevisionNumber);
    }

    [Fact]
    public async Task GetFamilyRevisions_CrossFamilyBoundary_DoesNotLeakOtherFamilyRevisions()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var admin = CreateUserPrincipal("adm_1", RoleHierarchy.RoleAdmin);

        var famA = await SeedFamilyAsync(context, "RN-EX-000001", "Family A", "rn");
        await SeedRevisionAsync(context, famA.Id, 1, "Family A Rev 1", ExamLifecycleState.Published, "rn");

        var famB = await SeedFamilyAsync(context, "RN-EX-000002", "Family B", "rn");
        await SeedRevisionAsync(context, famB.Id, 1, "Family B Rev 1", ExamLifecycleState.Published, "rn");

        var resultA = await service.GetFamilyRevisionsAsync(famA.Id, admin);
        Assert.Single(resultA.Revisions);
        Assert.Equal("Family A Rev 1", resultA.Revisions[0].Title);

        var resultB = await service.GetFamilyRevisionsAsync(famB.Id, admin);
        Assert.Single(resultB.Revisions);
        Assert.Equal("Family B Rev 1", resultB.Revisions[0].Title);
    }

    [Fact]
    public async Task GetFamilyRevisions_NonExistentFamily_ThrowsKeyNotFoundException()
    {
        var dbName = Guid.NewGuid().ToString();
        using var context = CreateInMemoryContext(dbName);
        var service = new ExamLifecycleService(context);
        var admin = CreateUserPrincipal("adm_1", RoleHierarchy.RoleAdmin);

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            service.GetFamilyRevisionsAsync("non_existent_family_id", admin));
    }
}
