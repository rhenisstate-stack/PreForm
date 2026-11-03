using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class ExaminationCodeTests
{
    private static AppDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task AllocateCode_GeneratesFormattedCodeForRNAndPN()
    {
        using var context = CreateInMemoryContext(nameof(AllocateCode_GeneratesFormattedCodeForRNAndPN));
        var service = new ExaminationCodeService(context);

        var rnCode1 = await service.AllocateCodeAsync("rn");
        var pnCode1 = await service.AllocateCodeAsync("pn");

        Assert.StartsWith("RN-EX-", rnCode1);
        Assert.StartsWith("PN-EX-", pnCode1);
        Assert.Matches(@"^RN-EX-\d{6}$", rnCode1);
        Assert.Matches(@"^PN-EX-\d{6}$", pnCode1);
    }

    [Fact]
    public async Task AllocateCode_CaseInsensitivePathwayHandling()
    {
        using var context = CreateInMemoryContext(nameof(AllocateCode_CaseInsensitivePathwayHandling));
        var service = new ExaminationCodeService(context);

        var rnUpper = await service.AllocateCodeAsync("RN");
        var pnUpper = await service.AllocateCodeAsync("PN");

        Assert.StartsWith("RN-EX-", rnUpper);
        Assert.StartsWith("PN-EX-", pnUpper);
    }

    [Fact]
    public async Task AllocateCode_RejectsInvalidPathway()
    {
        using var context = CreateInMemoryContext(nameof(AllocateCode_RejectsInvalidPathway));
        var service = new ExaminationCodeService(context);

        await Assert.ThrowsAsync<ArgumentException>(() => service.AllocateCodeAsync("invalid"));
        await Assert.ThrowsAsync<ArgumentException>(() => service.AllocateCodeAsync(""));
        await Assert.ThrowsAsync<ArgumentException>(() => service.AllocateCodeAsync("both"));
    }

    [Fact]
    public async Task CreateExamination_CreatesStableFamilyAndAuditRecord()
    {
        using var context = CreateInMemoryContext(nameof(CreateExamination_CreatesStableFamilyAndAuditRecord));
        var service = new ExaminationCodeService(context);

        var request = new CreateExaminationRequest
        {
            Pathway = "rn",
            Title = "Registered Nurse Licensure Mock Exam",
            InitialRevisionTitle = "2026 Core Mock",
            Description = "Initial practice revision",
            PassingScorePercent = 75.0m
        };

        var exam = await service.CreateExaminationAsync(request, "actor_admin_01");

        Assert.NotNull(exam.Id);
        Assert.Equal("rn", exam.Pathway);
        Assert.StartsWith("RN-EX-", exam.Code);
        Assert.Equal("Registered Nurse Licensure Mock Exam", exam.Title);
        Assert.Equal("actor_admin_01", exam.CreatedBy);

        // Verify initial revision in Draft was created
        Assert.Single(exam.Revisions);
        var rev = exam.Revisions.First();
        Assert.Equal(1, rev.RevisionNumber);
        Assert.Equal(ExamLifecycleState.Draft, rev.LifecycleState);
        Assert.Equal("2026 Core Mock", rev.Title);

        // Verify audit log
        var log = await context.AuditLogs.FirstOrDefaultAsync(l => l.EntityId == exam.Id && l.Action == "ExamCreated");
        Assert.NotNull(log);
        Assert.Contains("Registered Nurse Licensure Mock Exam", log.Description);
    }
}
