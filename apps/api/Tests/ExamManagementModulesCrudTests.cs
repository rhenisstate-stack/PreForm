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
            .UseInMemoryDatabase($"{dbName}_{Guid.NewGuid():N}")
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
        Assert.Equal("Comprehensive acute and chronic adult care", course.Description);
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
        Assert.Equal("Updated description", updatedCourse.Description);
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
        Assert.Equal("both", subject.Pathway);
        Assert.Equal(course.Id, subject.CourseId);
        Assert.True(await db.AuditLogs.AnyAsync(a => a.Action == "SubjectDomainCreated" && a.EntityId == subject.Id));

        // 5. Block Course deletion while SubjectDomain exists
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.DeleteCourseAsync(course.Id));

        // 6. Block SubjectDomain deletion when referenced in an Examination blueprint
        var examRef = new Exam
        {
            Id = "rev_dep_check",
            ExaminationId = "fam_dep_check",
            RevisionNumber = 1,
            LifecycleState = ExamLifecycleState.Draft,
            Title = "Blueprint Ref Exam",
            Pathway = "rn",
            CompositionRulesJson = $"{{\"subjectIds\":[\"{subject.Id}\"]}}"
        };
        db.Exams.Add(examRef);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.DeleteSubjectDomainAsync(subject.Id));

        db.Exams.Remove(examRef);
        await db.SaveChangesAsync();

        // 7. Delete SubjectDomain first, then verify Course deletion succeeds
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
    public async Task StandaloneCustomTest_CreateQueryEligibleQuestionsAndDelete_WithDependencyProtection()
    {
        using var db = CreateInMemoryContext(nameof(StandaloneCustomTest_CreateQueryEligibleQuestionsAndDelete_WithDependencyProtection));
        var codeService = new ExaminationCodeService(db);
        var lifecycleService = new ExamLifecycleService(db, codeService);
        var adminUser = CreateUserPrincipal("exam_mgr_01", "exam_manager");

        // Seed an eligible published question
        var q1 = new Question
        {
            Id = "q_standalone_1",
            Code = "RN-Q-1001",
            Pathway = "rn",
            QuestionTypeKey = "single-choice",
            Stem = "Which finding requires immediate intervention in a client receiving IV heparin?",
            Difficulty = QuestionDifficulty.Moderate,
            Status = QuestionStatus.Published,
            ClientNeedId = "PHA"
        };
        db.Questions.Add(q1);
        await db.SaveChangesAsync();

        // Query eligible questions by pathway and difficulty
        var eligible = await lifecycleService.GetEligibleQuestionsAsync(
            pathway: "rn",
            search: "heparin",
            user: adminUser,
            clientNeedId: "PHA",
            difficulty: "Moderate");
        Assert.Single(eligible);
        Assert.Equal(q1.Id, eligible[0].QuestionId);

        // Create Standalone Custom Test (ExamType.Standalone = 5)
        var exam = await codeService.CreateExaminationAsync(
            new CreateExaminationRequest
            {
                Pathway = "rn",
                Title = "Pharmacology & Safety Custom Standalone Test",
                InitialRevisionTitle = "Pharmacology & Safety Custom Standalone Test - v1",
                Description = "Focused custom test for RN pharmacology",
                ExamType = ExamType.Standalone,
                TimeLimitMinutes = 45,
                PassingScorePercent = 75m,
                TargetQuestionCount = 1,
                SelectionStrategy = "Preset",
                CompositionRulesJson = "{\"courseIds\":[\"course_1\"],\"randomizeQuestions\":true,\"difficultyDistribution\":{\"easyPercent\":20,\"moderatePercent\":50,\"hardPercent\":30}}",
                QuestionIds = new List<string> { q1.Id },
                IsAvailable = true,
                MaxAttemptsAllowed = 3,
                ReviewPolicy = "AfterExamSubmission",
                ShowRationales = true,
                ShowScoreImmediately = true
            },
            actorId: "exam_mgr_01");

        // Query by module = "standalone"
        var standaloneQuery = await lifecycleService.QueryExaminationsAsync(
            new ExaminationQueryParameters { Module = "standalone" },
            adminUser);

        Assert.Single(standaloneQuery.Items);
        Assert.Equal(exam.Id, standaloneQuery.Items[0].Id);
        Assert.Equal(ExamType.Standalone, standaloneQuery.Items[0].LatestRevision!.ExamType);
        Assert.Equal(1, standaloneQuery.Items[0].LatestRevision!.QuestionCount);

        // Query by module = "practice" should not include the standalone test
        var practiceQuery = await lifecycleService.QueryExaminationsAsync(
            new ExaminationQueryParameters { Module = "practice" },
            adminUser);
        Assert.Empty(practiceQuery.Items);

        // Block deletion if learner attempt exists
        var initialRev = exam.Revisions.First();
        var attempt = new ExamAttempt
        {
            Id = "att_1",
            ExamId = initialRev.Id,
            UserId = "student_1",
            Status = AttemptStatus.Completed
        };
        db.ExamAttempts.Add(attempt);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            lifecycleService.DeleteExaminationAsync(exam.Id, adminUser));

        // Remove attempt and verify deletion of unused Draft Standalone test succeeds
        db.ExamAttempts.Remove(attempt);
        await db.SaveChangesAsync();

        var deleted = await lifecycleService.DeleteExaminationAsync(exam.Id, adminUser);
        Assert.True(deleted);
        Assert.True(await db.AuditLogs.AnyAsync(a => a.Action == "ExamDeleted" && a.EntityId == exam.Id));
    }

    [Fact]
    public async Task RatsModule_ReadinessThresholdsValidation_AndModuleQuery()
    {
        using var db = CreateInMemoryContext(nameof(RatsModule_ReadinessThresholdsValidation_AndModuleQuery));
        var codeService = new ExaminationCodeService(db);
        var lifecycleService = new ExamLifecycleService(db, codeService);
        var adminUser = CreateUserPrincipal("exam_mgr_01", "exam_manager");

        var ratExam = await codeService.CreateExaminationAsync(
            new CreateExaminationRequest
            {
                Pathway = "rn",
                Title = "NCLEX-RN Comprehensive Readiness Assessment Test #1",
                InitialRevisionTitle = "NCLEX-RN RAT #1",
                Description = "Readiness assessment test",
                ExamType = ExamType.DiagnosticReadiness,
                TimeLimitMinutes = 120,
                PassingScorePercent = 72m
            },
            actorId: "exam_mgr_01");

        var rev = await db.Exams.FirstAsync(r => r.ExaminationId == ratExam.Id);

        // Valid non-overlapping thresholds
        var comp = await lifecycleService.UpdateCompositionAsync(
            rev.Id,
            new UpdateExamCompositionRequest
            {
                TargetQuestionCount = 75,
                SelectionStrategy = "DynamicBalanced",
                AllowedQuestionTypes = new List<string> { "single-choice", "multiple-choice", "sata" },
                AssessmentObjectives = "Evaluate baseline clinical judgment readiness\nIdentify weak Client Needs domains",
                ReadinessThresholds = new ReadinessThresholdsDto
                {
                    LowMinPercent = 0m,
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
        Assert.Contains("Evaluate baseline clinical judgment readiness", comp.AssessmentObjectives);

        // Overlapping thresholds must throw ArgumentException
        await Assert.ThrowsAsync<ArgumentException>(() => lifecycleService.UpdateCompositionAsync(
            rev.Id,
            new UpdateExamCompositionRequest
            {
                TargetQuestionCount = 75,
                SelectionStrategy = "DynamicBalanced",
                ReadinessThresholds = new ReadinessThresholdsDto
                {
                    LowMinPercent = 0m,
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
        var ratsQuery = await lifecycleService.QueryExaminationsAsync(
            new ExaminationQueryParameters { Module = "rats" },
            adminUser);
        Assert.Single(ratsQuery.Items);
        Assert.Equal(ratExam.Id, ratsQuery.Items[0].Id);
    }

    [Fact]
    public async Task PracticeExamsModule_RnAndPnPathways_LifecycleDuplication_AndRbacEnforcement()
    {
        using var db = CreateInMemoryContext(nameof(PracticeExamsModule_RnAndPnPathways_LifecycleDuplication_AndRbacEnforcement));
        var codeService = new ExaminationCodeService(db);
        var lifecycleService = new ExamLifecycleService(db, codeService);
        var adminUser = CreateUserPrincipal("admin_01", "admin");
        var reviewerUser = CreateUserPrincipal("rev_01", "reviewer");
        var candidateUser = CreateUserPrincipal("cand_01", "candidate");

        var rnQuestion = new Question
        {
            Id = "q_prac_rn_1",
            Code = "RN-Q-2001",
            Pathway = "rn",
            QuestionTypeKey = "single-choice",
            Stem = "An RN is caring for a client in septic shock. Which action is the highest priority?",
            Difficulty = QuestionDifficulty.Hard,
            Status = QuestionStatus.Published,
            ClientNeedId = "PHA",
            Options = new List<QuestionOption>
            {
                new QuestionOption { Id = "opt_rn_1", Content = "Administer broad-spectrum antibiotics", IsCorrect = true, DisplayOrder = 1 },
                new QuestionOption { Id = "opt_rn_2", Content = "Document hourly urine output", IsCorrect = false, DisplayOrder = 2 }
            }
        };
        var pnQuestion = new Question
        {
            Id = "q_prac_pn_1",
            Code = "PN-Q-2001",
            Pathway = "pn",
            QuestionTypeKey = "single-choice",
            Stem = "An LPN/LVN is reinforcing teaching about Warfarin. Which statement indicates understanding?",
            Difficulty = QuestionDifficulty.Moderate,
            Status = QuestionStatus.Published,
            ClientNeedId = "PHA",
            Options = new List<QuestionOption>
            {
                new QuestionOption { Id = "opt_pn_1", Content = "I will use a soft-bristled toothbrush", IsCorrect = true, DisplayOrder = 1 },
                new QuestionOption { Id = "opt_pn_2", Content = "I will double my dose if I miss one", IsCorrect = false, DisplayOrder = 2 }
            }
        };
        db.Questions.AddRange(rnQuestion, pnQuestion);
        await db.SaveChangesAsync();

        // Create NCLEX-RN and NCLEX-PN Practice Exams
        var rnPractice = await codeService.CreateExaminationAsync(
            new CreateExaminationRequest
            {
                Pathway = "rn",
                Title = "NCLEX-RN Full Practice Exam A",
                ExamType = ExamType.Practice,
                TimeLimitMinutes = 180,
                PassingScorePercent = 75m,
                TargetQuestionCount = 1,
                SelectionStrategy = "Preset",
                QuestionIds = new List<string> { rnQuestion.Id }
            },
            actorId: "admin_01");

        var pnPractice = await codeService.CreateExaminationAsync(
            new CreateExaminationRequest
            {
                Pathway = "pn",
                Title = "NCLEX-PN Full Practice Exam A",
                ExamType = ExamType.Practice,
                TimeLimitMinutes = 150,
                PassingScorePercent = 72m,
                TargetQuestionCount = 1,
                SelectionStrategy = "Preset",
                QuestionIds = new List<string> { pnQuestion.Id }
            },
            actorId: "admin_01");

        // Verify Practice module query filters RN and PN independently
        var allPractice = await lifecycleService.QueryExaminationsAsync(
            new ExaminationQueryParameters { Module = "practice" },
            adminUser);
        Assert.Equal(2, allPractice.Pagination.TotalItems);

        var rnOnlyPractice = await lifecycleService.QueryExaminationsAsync(
            new ExaminationQueryParameters { Module = "practice", Pathway = "rn" },
            adminUser);
        Assert.Single(rnOnlyPractice.Items);
        Assert.Equal("rn", rnOnlyPractice.Items[0].Pathway);

        // RBAC check: Candidate cannot delete or update composition
        var rnRev = rnPractice.Revisions.First();
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            lifecycleService.DeleteExaminationAsync(rnPractice.Id, candidateUser));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            lifecycleService.DeleteExaminationAsync(rnPractice.Id, reviewerUser));

        // Transition RN Practice Exam through Draft -> InReview -> Approved -> Published, then Duplicate
        var approverAdmin = CreateUserPrincipal("admin_02", "admin");
        var inReview = await lifecycleService.SubmitForReviewAsync(rnRev.Id, rnRev.ConcurrencyToken, adminUser);
        var approved = await lifecycleService.ApproveAsync(rnRev.Id, inReview.ConcurrencyToken, approverAdmin);
        var published = await lifecycleService.PublishAsync(rnRev.Id, approved.ConcurrencyToken, approverAdmin);
        Assert.Equal("Published", published.LifecycleState);

        // Published exam cannot be hard-deleted; must be archived
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            lifecycleService.DeleteExaminationAsync(rnPractice.Id, adminUser));

        // Duplicate Published Practice Exam into a new examination family
        var duplicated = await lifecycleService.DuplicateExaminationAsync(
            rnPractice.Id,
            new DuplicateExaminationRequest
            {
                Title = "NCLEX-RN Full Practice Exam B (Cloned)"
            },
            adminUser);

        Assert.True(duplicated.Success);
        Assert.NotEqual(rnPractice.Id, duplicated.ExaminationId);
        Assert.Equal("Draft", duplicated.LifecycleState);
        Assert.Equal(1, duplicated.QuestionCount);
    }
}
