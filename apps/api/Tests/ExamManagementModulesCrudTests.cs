using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class ExamManagementModulesCrudTests
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

    [Fact]
    public async Task CourseAndSubjectDomain_FullCrud_DependencyProtection_AndAuditLogs()
    {
        using var db = CreateInMemoryContext(nameof(CourseAndSubjectDomain_FullCrud_DependencyProtection_AndAuditLogs));
        var service = new CurriculumService(db, NullLogger<CurriculumService>.Instance);

        // 1. Create Course with Code and Pathway
        var course = await service.CreateCourseAsync(new CreateCourseRequest
        {
            Code = "MED-SURG-RN",
            Pathway = "rn",
            Title = "Adult Medical-Surgical Nursing",
            Description = "Comprehensive acute and chronic adult care",
            DisplayOrder = 1,
            IsPublished = true,
            IsActive = true
        });

        Assert.NotNull(course);
        Assert.Equal("MED-SURG-RN", course.Code);
        Assert.Equal("rn", course.Pathway);
        Assert.Equal("Adult Medical-Surgical Nursing", course.Title);
        Assert.True(await db.AuditLogs.AnyAsync(a => a.Action == "CourseCreated" && a.EntityId == course.Id));

        // 2. Reject duplicate Course code
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateCourseAsync(new CreateCourseRequest
        {
            Code = "med-surg-rn",
            Pathway = "rn",
            Title = "Duplicate Course"
        }));

        // 3. Update Course
        var updatedCourse = await service.UpdateCourseAsync(course.Id, new UpdateCourseRequest
        {
            Code = "MED-SURG-BOTH",
            Pathway = "both",
            Title = "Adult Medical-Surgical Nursing (RN & PN)",
            Description = "Updated description",
            DisplayOrder = 2,
            IsPublished = true,
            IsActive = true
        });

        Assert.NotNull(updatedCourse);
        Assert.Equal("MED-SURG-BOTH", updatedCourse!.Code);
        Assert.Equal("both", updatedCourse.Pathway);
        Assert.True(await db.AuditLogs.AnyAsync(a => a.Action == "CourseUpdated" && a.EntityId == course.Id));

        // 4. Create SubjectDomain under the Course
        var subject = await service.CreateSubjectDomainAsync(new CreateSubjectDomainRequest
        {
            CourseId = course.Id,
            Code = "CARDIO-01",
            Pathway = "both",
            Title = "Cardiovascular & Hemodynamic Disorders",
            Description = "Heart failure, arrhythmias, and perfusion",
            DisplayOrder = 1,
            IsActive = true
        });

        Assert.NotNull(subject);
        Assert.Equal("CARDIO-01", subject.Code);
        Assert.Equal(course.Id, subject.CourseId);
        Assert.True(await db.AuditLogs.AnyAsync(a => a.Action == "SubjectDomainCreated" && a.EntityId == subject.Id));

        // 5. Block Course deletion while SubjectDomain exists
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.DeleteCourseAsync(course.Id));

        // 6. Delete SubjectDomain first, then verify Course deletion succeeds
        var subjectDeleted = await service.DeleteSubjectDomainAsync(subject.Id);
        Assert.True(subjectDeleted);
        Assert.True(await db.AuditLogs.AnyAsync(a => a.Action == "SubjectDomainDeleted" && a.EntityId == subject.Id));

        var courseDeleted = await service.DeleteCourseAsync(course.Id);
        Assert.True(courseDeleted);
        Assert.True(await db.AuditLogs.AnyAsync(a => a.Action == "CourseDeleted" && a.EntityId == course.Id));
    }

    [Fact]
    public async Task ClientNeeds_FullCrud_DependencyProtection_ForQuestionsAndExams_AndAuditLogs()
    {
        using var db = CreateInMemoryContext(nameof(ClientNeeds_FullCrud_DependencyProtection_ForQuestionsAndExams_AndAuditLogs));
        var service = new CurriculumService(db, NullLogger<CurriculumService>.Instance);

        // 1. Create Client Need
        var cn = await service.CreateClientNeedAsync(new CreateClientNeedRequest
        {
            Code = "PHARM-THERAPIES",
            Name = "Pharmacological and Parenteral Therapies",
            Description = "Medication administration, dosage calculations, IV therapies",
            DisplayOrder = 1,
            IsActive = true,
            Pathway = "both"
        });

        Assert.Equal("PHARM-THERAPIES", cn.Code);
        Assert.True(await db.AuditLogs.AnyAsync(a => a.Action == "ClientNeedCreated" && a.EntityId == cn.Id));

        // 2. Reject duplicate code
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateClientNeedAsync(new CreateClientNeedRequest
        {
            Code = "pharm-therapies",
            Name = "Duplicate Category"
        }));

        // 3. Reference ClientNeed inside an Exam revision's CompositionRulesJson and verify deletion is blocked
        var examFam = new Examination
        {
            Id = "fam_1",
            Pathway = "rn",
            Code = "RN-EX-000101",
            Title = "Test Exam",
            CreatedBy = "admin_1"
        };
        db.Examinations.Add(examFam);
        var rev = new Exam
        {
            Id = "rev_1",
            ExaminationId = examFam.Id,
            RevisionNumber = 1,
            LifecycleState = ExamLifecycleState.Draft,
            Title = "Rev 1",
            Pathway = "rn",
            CompositionRulesJson = $"{{\"clientNeedQuotas\":[{{\"clientNeedCode\":\"{cn.Code}\",\"targetCount\":5}}]}}"
        };
        db.Exams.Add(rev);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.DeleteClientNeedAsync(cn.Id));

        // 4. Clear exam reference, then delete ClientNeed
        db.Exams.Remove(rev);
        db.Examinations.Remove(examFam);
        await db.SaveChangesAsync();

        var deleted = await service.DeleteClientNeedAsync(cn.Id);
        Assert.True(deleted);
        Assert.True(await db.AuditLogs.AnyAsync(a => a.Action == "ClientNeedDeleted" && a.EntityId == cn.Id));
    }

    [Fact]
    public async Task StandaloneCustomTest_CreateQueryAndDelete_WithDependencyProtection()
    {
        using var db = CreateInMemoryContext(nameof(StandaloneCustomTest_CreateQueryAndDelete_WithDependencyProtection));
        var codeService = new ExaminationCodeService(db, NullLogger<ExaminationCodeService>.Instance);
        var lifecycleService = new ExamLifecycleService(db, codeService, NullLogger<ExamLifecycleService>.Instance);
        var adminUser = CreateUserPrincipal("exam_mgr_01", "exam_manager");

        // Seed an eligible published question
        var q1 = new Question
        {
            Id = "q_standalone_1",
            Code = "RN-Q-1001",
            Pathway = "rn",
            QuestionTypeKey = "single_best_answer",
            Stem = "Which finding requires immediate intervention in a client receiving IV heparin?",
            Difficulty = QuestionDifficulty.Moderate,
            Status = QuestionStatus.Published,
            IsActive = true
        };
        db.Questions.Add(q1);
        await db.SaveChangesAsync();

        // Create Standalone Custom Test (ExamType.Standalone = 5)
        var exam = await codeService.CreateExaminationAsync(
            pathway: "rn",
            title: "Pharmacology & Safety Custom Standalone Test",
            createdBy: "exam_mgr_01",
            initialRevisionTitle: "Pharmacology & Safety Custom Standalone Test - v1",
            description: "Focused custom test for RN pharmacology",
            examType: (int)ExamType.Standalone,
            timeLimitMinutes: 45,
            passingScorePercent: 75m,
            targetQuestionCount: 1,
            selectionStrategy: "Preset",
            compositionRulesJson: "{\"courseIds\":[\"course_1\"],\"randomizeQuestions\":true,\"difficultyDistribution\":{\"easyPercent\":20,\"moderatePercent\":50,\"hardPercent\":30}}",
            questionIds: new List<string> { q1.Id },
            isAvailable: true,
            maxAttemptsAllowed: 3,
            reviewPolicy: "FullReviewWithRationales",
            showRationales: true,
            showScoreImmediately: true);

        // Query by module = "standalone"
        var standaloneQuery = await lifecycleService.QueryExaminationsAsync(new ExaminationQueryParameters
        {
            Module = "standalone"
        });

        Assert.Single(standaloneQuery.Items);
        Assert.Equal(exam.Id, standaloneQuery.Items[0].Id);
        Assert.Equal((int)ExamType.Standalone, standaloneQuery.Items[0].LatestRevision!.ExamType);
        Assert.Equal(1, standaloneQuery.Items[0].LatestRevision!.QuestionCount);

        // Query by module = "practice" should not include the standalone test
        var practiceQuery = await lifecycleService.QueryExaminationsAsync(new ExaminationQueryParameters
        {
            Module = "practice"
        });
        Assert.Empty(practiceQuery.Items);

        // Delete unused Draft Standalone test succeeds
        var deleted = await lifecycleService.DeleteExaminationAsync(exam.Id, adminUser);
        Assert.True(deleted);
        Assert.True(await db.AuditLogs.AnyAsync(a => a.Action == "ExaminationDeleted" && a.EntityId == exam.Id));
    }

    [Fact]
    public async Task RatsModule_ReadinessThresholdsValidation_AndModuleQuery()
    {
        using var db = CreateInMemoryContext(nameof(RatsModule_ReadinessThresholdsValidation_AndModuleQuery));
        var codeService = new ExaminationCodeService(db, NullLogger<ExaminationCodeService>.Instance);
        var lifecycleService = new ExamLifecycleService(db, codeService, NullLogger<ExamLifecycleService>.Instance);
        var adminUser = CreateUserPrincipal("exam_mgr_01", "exam_manager");

        var ratExam = await codeService.CreateExaminationAsync(
            pathway: "rn",
            title: "NCLEX-RN Comprehensive Readiness Assessment Test #1",
            createdBy: "exam_mgr_01",
            initialRevisionTitle: "NCLEX-RN RAT #1",
            description: "Readiness assessment test",
            examType: (int)ExamType.DiagnosticReadiness,
            timeLimitMinutes: 120,
            passingScorePercent: 72m);

        var rev = await db.Exams.FirstAsync(r => r.ExaminationId == ratExam.Id);

        // Valid non-overlapping thresholds
        var comp = await lifecycleService.UpdateCompositionAsync(
            rev.Id,
            new UpdateExamCompositionRequest
            {
                TargetQuestionCount = 75,
                SelectionStrategy = "DynamicBalanced",
                AllowedQuestionTypes = new List<string> { "single_best_answer", "multiple_response" },
                AssessmentObjectives = new List<string> { "Evaluate baseline clinical judgment readiness", "Identify weak Client Needs domains" },
                ReadinessThresholds = new ReadinessThresholdsDto
                {
                    LowMinPercent = 0,
                    LowMaxPercent = 54.99m,
                    BorderlineMinPercent = 55m,
                    BorderlineMaxPercent = 69.99m,
                    HighMinPercent = 70m,
                    HighMaxPercent = 84.99m,
                    VeryHighMinPercent = 85m,
                    VeryHighMaxPercent = 100m
                },
                ConcurrencyToken = rev.ConcurrencyToken
            },
            adminUser);

        Assert.NotNull(comp.ReadinessThresholds);
        Assert.Equal(70m, comp.ReadinessThresholds!.HighMinPercent);
        Assert.Equal(2, comp.AssessmentObjectives.Count);

        // Overlapping thresholds must throw ArgumentException
        await Assert.ThrowsAsync<ArgumentException>(() => lifecycleService.UpdateCompositionAsync(
            rev.Id,
            new UpdateExamCompositionRequest
            {
                TargetQuestionCount = 75,
                SelectionStrategy = "DynamicBalanced",
                ReadinessThresholds = new ReadinessThresholdsDto
                {
                    LowMinPercent = 0,
                    LowMaxPercent = 60m,
                    BorderlineMinPercent = 55m, // Overlaps with LowMaxPercent (60)
                    BorderlineMaxPercent = 70m,
                    HighMinPercent = 71m,
                    HighMaxPercent = 85m,
                    VeryHighMinPercent = 86m,
                    VeryHighMaxPercent = 100m
                },
                ConcurrencyToken = comp.ConcurrencyToken
            },
            adminUser));

        // Verify querying by Module = "rats"
        var ratsQuery = await lifecycleService.QueryExaminationsAsync(new ExaminationQueryParameters
        {
            Module = "rats"
        });
        Assert.Single(ratsQuery.Items);
        Assert.Equal(ratExam.Id, ratsQuery.Items[0].Id);
    }
}
