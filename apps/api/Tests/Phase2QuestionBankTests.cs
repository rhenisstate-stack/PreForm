using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Common;
using Preform.Api.Controllers;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class Phase2QuestionBankTests
{
    private static AppDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        var context = new AppDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }

    private static (CurriculumService curriculumService, QuestionBankService questionBankService, AppDbContext db) CreateServices(string dbName)
    {
        var db = CreateInMemoryContext(dbName);
        var currLogger = NullLogger<CurriculumService>.Instance;
        var qbLogger = NullLogger<QuestionBankService>.Instance;
        var currService = new CurriculumService(db, currLogger);
        var qbService = new QuestionBankService(db, qbLogger);
        return (currService, qbService, db);
    }

    #region P2.1 Curriculum Taxonomy Tests

    [Fact]
    public async Task CurriculumTaxonomy_FullHierarchyAndTreeTraversal_Succeeds()
    {
        var (currService, _, db) = CreateServices(nameof(CurriculumTaxonomy_FullHierarchyAndTreeTraversal_Succeeds));

        // 1. Create Course
        var course = await currService.CreateCourseAsync(new CreateCourseRequest
        {
            ProgrammeId = "prog-rn",
            Title = "Medical-Surgical Nursing",
            Description = "Adult health nursing care",
            DisplayOrder = 1,
            IsPublished = true,
            IsActive = true
        });
        Assert.NotNull(course.Id);
        Assert.Equal("Medical-Surgical Nursing", course.Title);

        // 2. Create Subject Domain
        var domain = await currService.CreateSubjectDomainAsync(new CreateSubjectDomainRequest
        {
            CourseId = course.Id,
            Title = "Cardiovascular Health",
            Description = "Heart and vascular alterations",
            DisplayOrder = 1,
            IsActive = true
        });
        Assert.NotNull(domain.Id);
        Assert.Equal(course.Id, domain.CourseId);

        // 3. Create Category
        var cat = await currService.CreateCategoryAsync(new CreateCategoryRequest
        {
            SubjectDomainId = domain.Id,
            Name = "Heart Failure",
            Description = "Chronic and acute cardiac insufficiency",
            DisplayOrder = 1,
            IsActive = true
        });
        Assert.NotNull(cat.Id);
        Assert.Equal("heart-failure", cat.Slug);

        // 4. Create Subcategory
        var subcat = await currService.CreateSubcategoryAsync(new CreateSubcategoryRequest
        {
            CategoryId = cat.Id,
            Name = "Left-Sided Heart Failure",
            Description = "Pulmonary congestion and low perfusion",
            DisplayOrder = 1,
            IsActive = true
        });
        Assert.NotNull(subcat.Id);

        // 5. Create Topic
        var topic = await currService.CreateTopicAsync(new CreateTopicRequest
        {
            SubcategoryId = subcat.Id,
            Title = "Pulmonary Edema & Pharmacotherapy",
            Summary = "Emergency diuretic administration",
            Content = "High-dose loop diuretics and oxygen therapy...",
            DisplayOrder = 1,
            IsPublished = true,
            IsActive = true
        });
        Assert.NotNull(topic.Id);

        // 6. Verify Tree Retrieval
        var tree = await currService.GetCurriculumTreeAsync(activeOnly: false);
        Assert.Single(tree);
        var courseNode = tree[0];
        Assert.Equal("Medical-Surgical Nursing", courseNode.Name);
        Assert.Single(courseNode.Children);
        var domainNode = courseNode.Children[0];
        Assert.Equal("Cardiovascular Health", domainNode.Name);
        Assert.Single(domainNode.Children);
        var catNode = domainNode.Children[0];
        Assert.Equal("Heart Failure", catNode.Name);
        Assert.Single(catNode.Children);
        var subcatNode = catNode.Children[0];
        Assert.Equal("Left-Sided Heart Failure", subcatNode.Name);
        Assert.Single(subcatNode.Children);
        var topicNode = subcatNode.Children[0];
        Assert.Equal("Pulmonary Edema & Pharmacotherapy", topicNode.Name);
    }

    [Fact]
    public async Task CurriculumTaxonomy_DeleteProtection_BlocksDeletingNodesWithChildren()
    {
        var (currService, _, db) = CreateServices(nameof(CurriculumTaxonomy_DeleteProtection_BlocksDeletingNodesWithChildren));

        var course = await currService.CreateCourseAsync(new CreateCourseRequest
        {
            ProgrammeId = "prog-rn",
            Title = "Pediatrics",
            IsPublished = true,
            IsActive = true
        });

        var domain = await currService.CreateSubjectDomainAsync(new CreateSubjectDomainRequest
        {
            CourseId = course.Id,
            Title = "Growth and Development",
            IsActive = true
        });

        // Deleting course when domain exists must throw InvalidOperationException
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => currService.DeleteCourseAsync(course.Id));
        Assert.Contains("subject domains", ex.Message, StringComparison.OrdinalIgnoreCase);

        // Deleting domain succeeds once empty
        var domainDeleted = await currService.DeleteSubjectDomainAsync(domain.Id);
        Assert.True(domainDeleted);

        // Now deleting course succeeds
        var courseDeleted = await currService.DeleteCourseAsync(course.Id);
        Assert.True(courseDeleted);
    }

    [Fact]
    public async Task ClientNeeds_UniqueCodeAndQuestionAttachmentProtection()
    {
        var (currService, qbService, db) = CreateServices(nameof(ClientNeeds_UniqueCodeAndQuestionAttachmentProtection));

        // Create Client Need
        var cn = await currService.CreateClientNeedAsync(new CreateClientNeedRequest
        {
            Code = "PHA",
            Name = "Pharmacological and Parenteral Therapies",
            Description = "Administering medications safely",
            DisplayOrder = 1,
            Pathway = "both"
        });
        Assert.Equal("PHA", cn.Code);

        // Duplicate code must throw ArgumentException
        await Assert.ThrowsAsync<ArgumentException>(() => currService.CreateClientNeedAsync(new CreateClientNeedRequest
        {
            Code = "PHA",
            Name = "Duplicate Code",
            Pathway = "rn"
        }));

        // Attach a question to this Client Need
        var question = await qbService.CreateQuestionAsync(new CreateQuestionRequest
        {
            Pathway = "rn",
            QuestionTypeKey = "single-choice",
            Stem = "A client is prescribed furosemide 40 mg IV...",
            ClientNeedId = cn.Id,
            Options = new List<CreateQuestionOptionRequest>
            {
                new() { OptionKey = "A", Content = "Serum potassium", IsCorrect = true },
                new() { OptionKey = "B", Content = "Serum sodium", IsCorrect = false }
            }
        }, "author-1");

        // Deleting client need with attached questions must throw InvalidOperationException
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => currService.DeleteClientNeedAsync(cn.Id));
        Assert.Contains("questions attached", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    #endregion

    #region P2.2 & P2.3 Question Validation & Authoring Tests

    [Fact]
    public async Task QuestionCreation_SingleChoiceValidation_EnforcesExactlyOneCorrectKey()
    {
        var (_, qbService, _) = CreateServices(nameof(QuestionCreation_SingleChoiceValidation_EnforcesExactlyOneCorrectKey));

        // 1. Zero correct options -> throws ArgumentException
        await Assert.ThrowsAsync<ArgumentException>(() => qbService.CreateQuestionAsync(new CreateQuestionRequest
        {
            Pathway = "rn",
            QuestionTypeKey = "single-choice",
            Stem = "Sample clinical stem?",
            Options = new List<CreateQuestionOptionRequest>
            {
                new() { OptionKey = "A", Content = "Option 1", IsCorrect = false },
                new() { OptionKey = "B", Content = "Option 2", IsCorrect = false }
            }
        }, "author-1"));

        // 2. Two correct options in single-choice -> throws ArgumentException
        await Assert.ThrowsAsync<ArgumentException>(() => qbService.CreateQuestionAsync(new CreateQuestionRequest
        {
            Pathway = "rn",
            QuestionTypeKey = "single-choice",
            Stem = "Sample clinical stem?",
            Options = new List<CreateQuestionOptionRequest>
            {
                new() { OptionKey = "A", Content = "Option 1", IsCorrect = true },
                new() { OptionKey = "B", Content = "Option 2", IsCorrect = true }
            }
        }, "author-1"));

        // 3. Exactly 1 correct option -> succeeds and assigns auto Code
        var q = await qbService.CreateQuestionAsync(new CreateQuestionRequest
        {
            Pathway = "rn",
            QuestionTypeKey = "single-choice",
            Stem = "What is the priority nursing intervention for anaphylaxis?",
            Difficulty = QuestionDifficulty.Hard,
            Options = new List<CreateQuestionOptionRequest>
            {
                new() { OptionKey = "A", Content = "Administer intramuscular epinephrine", IsCorrect = true },
                new() { OptionKey = "B", Content = "Administer oral diphenhydramine", IsCorrect = false },
                new() { OptionKey = "C", Content = "Apply warm blanket", IsCorrect = false },
                new() { OptionKey = "D", Content = "Obtain 12-lead ECG", IsCorrect = false }
            }
        }, "author-1");

        Assert.NotNull(q.Id);
        Assert.StartsWith("QN-", q.Code!);
        Assert.Equal(QuestionStatus.Draft, q.Status);
        Assert.Equal(1, q.Version);
        Assert.Equal(4, q.Options.Count);
        Assert.Single(q.Options, o => o.IsCorrect);
    }

    [Fact]
    public async Task QuestionCreation_SATAValidation_RequiresAtLeastOneCorrectKey()
    {
        var (_, qbService, _) = CreateServices(nameof(QuestionCreation_SATAValidation_RequiresAtLeastOneCorrectKey));

        // 0 correct -> fails
        await Assert.ThrowsAsync<ArgumentException>(() => qbService.CreateQuestionAsync(new CreateQuestionRequest
        {
            Pathway = "rn",
            QuestionTypeKey = "sata",
            Stem = "Which findings indicate hypoglycemia? Select all that apply.",
            Options = new List<CreateQuestionOptionRequest>
            {
                new() { OptionKey = "A", Content = "Diaphoresis", IsCorrect = false },
                new() { OptionKey = "B", Content = "Tremors", IsCorrect = false }
            }
        }, "author-1"));

        // Multiple correct -> succeeds
        var q = await qbService.CreateQuestionAsync(new CreateQuestionRequest
        {
            Pathway = "rn",
            QuestionTypeKey = "sata",
            Stem = "Which findings indicate hypoglycemia? Select all that apply.",
            Options = new List<CreateQuestionOptionRequest>
            {
                new() { OptionKey = "A", Content = "Diaphoresis", IsCorrect = true },
                new() { OptionKey = "B", Content = "Tremors", IsCorrect = true },
                new() { OptionKey = "C", Content = "Bradycardia", IsCorrect = false },
                new() { OptionKey = "D", Content = "Tachycardia", IsCorrect = true }
            }
        }, "author-1");

        Assert.Equal(3, q.Options.Count(o => o.IsCorrect));
    }

    [Fact]
    public async Task QuestionCreation_TrueFalseValidation_RequiresExactlyTwoOptions()
    {
        var (_, qbService, _) = CreateServices(nameof(QuestionCreation_TrueFalseValidation_RequiresExactlyTwoOptions));

        // 3 options in true/false -> fails
        await Assert.ThrowsAsync<ArgumentException>(() => qbService.CreateQuestionAsync(new CreateQuestionRequest
        {
            Pathway = "rn",
            QuestionTypeKey = "true-false",
            Stem = "Naloxone is an opioid antagonist.",
            Options = new List<CreateQuestionOptionRequest>
            {
                new() { OptionKey = "A", Content = "True", IsCorrect = true },
                new() { OptionKey = "B", Content = "False", IsCorrect = false },
                new() { OptionKey = "C", Content = "Maybe", IsCorrect = false }
            }
        }, "author-1"));

        // Exactly 2 options -> succeeds
        var q = await qbService.CreateQuestionAsync(new CreateQuestionRequest
        {
            Pathway = "rn",
            QuestionTypeKey = "true-false",
            Stem = "Naloxone is an opioid antagonist.",
            Options = new List<CreateQuestionOptionRequest>
            {
                new() { OptionKey = "A", Content = "True", IsCorrect = true },
                new() { OptionKey = "B", Content = "False", IsCorrect = false }
            }
        }, "author-1");

        Assert.Equal(2, q.Options.Count);
        Assert.Single(q.Options, o => o.IsCorrect);
    }

    [Fact]
    public async Task QuestionCreation_NGNStructuredContent_ValidatesJsonFormat()
    {
        var (_, qbService, _) = CreateServices(nameof(QuestionCreation_NGNStructuredContent_ValidatesJsonFormat));

        // Malformed JSON -> throws ArgumentException
        await Assert.ThrowsAsync<ArgumentException>(() => qbService.CreateQuestionAsync(new CreateQuestionRequest
        {
            Pathway = "rn",
            QuestionTypeKey = "matrix",
            Stem = "Evaluate clinical findings.",
            StructuredContentJson = "{ invalid json without quotes: 123"
        }, "author-1"));

        // Valid JSON -> succeeds
        var validJson = JsonSerializer.Serialize(new
        {
            rows = new[] { "Chest pain", "Dyspnea" },
            columns = new[] { "Consistent with MI", "Consistent with PE" }
        });

        var q = await qbService.CreateQuestionAsync(new CreateQuestionRequest
        {
            Pathway = "rn",
            QuestionTypeKey = "matrix",
            Stem = "Evaluate clinical findings.",
            StructuredContentJson = validJson
        }, "author-1");

        Assert.Equal(validJson, q.StructuredContentJson);
    }

    #endregion

    #region P2.4 Lifecycle & Immutability Invariant Tests

    [Fact]
    public async Task QuestionLifecycle_SeparationOfDuties_PreventsAuthorFromApprovingOwnQuestion()
    {
        var (_, qbService, _) = CreateServices(nameof(QuestionLifecycle_SeparationOfDuties_PreventsAuthorFromApprovingOwnQuestion));

        var q = await qbService.CreateQuestionAsync(new CreateQuestionRequest
        {
            Pathway = "rn",
            QuestionTypeKey = "single-choice",
            Stem = "Identify the normal fasting blood glucose range.",
            Options = new List<CreateQuestionOptionRequest>
            {
                new() { OptionKey = "A", Content = "70 to 99 mg/dL", IsCorrect = true },
                new() { OptionKey = "B", Content = "126 mg/dL or higher", IsCorrect = false }
            }
        }, "author-user-42");

        // Step 1: Author submits for review
        var inReview = await qbService.TransitionStatusAsync(q.Id, new QuestionStatusTransitionRequest
        {
            TargetStatus = QuestionStatus.InReview
        }, "author-user-42", isSuperAdmin: false);

        Assert.Equal(QuestionStatus.InReview, inReview!.Status);

        // Step 2: Author attempts to approve -> Separation of duties violation!
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            qbService.TransitionStatusAsync(q.Id, new QuestionStatusTransitionRequest
            {
                TargetStatus = QuestionStatus.Approved
            }, "author-user-42", isSuperAdmin: false));

        Assert.Contains("Separation of duties violation", ex.Message, StringComparison.OrdinalIgnoreCase);

        // Step 3: Distinct reviewer approves -> Succeeds!
        var approved = await qbService.TransitionStatusAsync(q.Id, new QuestionStatusTransitionRequest
        {
            TargetStatus = QuestionStatus.Approved
        }, "reviewer-user-99", isSuperAdmin: false);

        Assert.Equal(QuestionStatus.Approved, approved!.Status);
        Assert.Equal("reviewer-user-99", approved.ReviewedById);
    }

    [Fact]
    public async Task QuestionLifecycle_NGNTypes_BlockedFromPublicationUntilGradingSupported()
    {
        var (_, qbService, _) = CreateServices(nameof(QuestionLifecycle_NGNTypes_BlockedFromPublicationUntilGradingSupported));

        var validJson = JsonSerializer.Serialize(new { steps = new[] { "Assess", "Intervene" } });

        var q = await qbService.CreateQuestionAsync(new CreateQuestionRequest
        {
            Pathway = "rn",
            QuestionTypeKey = "ordering",
            Stem = "Order the nursing interventions.",
            StructuredContentJson = validJson
        }, "author-1");

        // Transition to InReview then Approved
        await qbService.TransitionStatusAsync(q.Id, new QuestionStatusTransitionRequest { TargetStatus = QuestionStatus.InReview }, "author-1", false);
        await qbService.TransitionStatusAsync(q.Id, new QuestionStatusTransitionRequest { TargetStatus = QuestionStatus.Approved }, "reviewer-1", false);

        // Attempting to publish an NGN Catalogued type must be blocked!
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            qbService.TransitionStatusAsync(q.Id, new QuestionStatusTransitionRequest
            {
                TargetStatus = QuestionStatus.Published
            }, "publisher-1", false));

        Assert.Contains("cannot be published until grading support is implemented", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task QuestionLifecycle_PublishedQuestionUpdate_SnapshotsPriorStateAndIncrementsVersion()
    {
        var (_, qbService, db) = CreateServices(nameof(QuestionLifecycle_PublishedQuestionUpdate_SnapshotsPriorStateAndIncrementsVersion));

        // Create, submit, approve, and publish a traditional question
        var q = await qbService.CreateQuestionAsync(new CreateQuestionRequest
        {
            Pathway = "rn",
            QuestionTypeKey = "single-choice",
            Stem = "Initial Question Stem v1",
            Difficulty = QuestionDifficulty.Moderate,
            Options = new List<CreateQuestionOptionRequest>
            {
                new() { OptionKey = "A", Content = "Correct Choice", IsCorrect = true },
                new() { OptionKey = "B", Content = "Incorrect Choice", IsCorrect = false }
            }
        }, "author-1");

        await qbService.TransitionStatusAsync(q.Id, new QuestionStatusTransitionRequest { TargetStatus = QuestionStatus.InReview }, "author-1", false);
        await qbService.TransitionStatusAsync(q.Id, new QuestionStatusTransitionRequest { TargetStatus = QuestionStatus.Approved }, "reviewer-1", false);
        var published = await qbService.TransitionStatusAsync(q.Id, new QuestionStatusTransitionRequest { TargetStatus = QuestionStatus.Published }, "publisher-1", false);

        Assert.Equal(QuestionStatus.Published, published!.Status);
        Assert.Equal(1, published.Version);

        // Now edit the published question
        var updated = await qbService.UpdateQuestionAsync(q.Id, new UpdateQuestionRequest
        {
            Pathway = "rn",
            QuestionTypeKey = "single-choice",
            Stem = "Revised Question Stem v2 with Updated Clinical Wording",
            Difficulty = QuestionDifficulty.Hard,
            ChangeSummary = "Updated stem wording for clinical clarity",
            Options = new List<CreateQuestionOptionRequest>
            {
                new() { OptionKey = "A", Content = "Updated Correct Choice", IsCorrect = true },
                new() { OptionKey = "B", Content = "Updated Incorrect Choice", IsCorrect = false }
            }
        }, "editor-2");

        Assert.Equal(2, updated!.Version);
        Assert.Equal("Revised Question Stem v2 with Updated Clinical Wording", updated.Stem);

        // Verify version history snapshot was recorded
        var versions = await qbService.GetQuestionVersionsAsync(q.Id);
        Assert.Single(versions);
        var v1 = versions[0];
        Assert.Equal(1, v1.VersionNumber);
        Assert.Equal("Updated stem wording for clinical clarity", v1.ChangeSummary);
        Assert.Contains("Initial Question Stem v1", v1.SnapshotJson);
    }

    [Fact]
    public async Task QuestionSearchAndPagination_MultiFacetFiltering_ReturnsExpectedMatches()
    {
        var (currService, qbService, db) = CreateServices(nameof(QuestionSearchAndPagination_MultiFacetFiltering_ReturnsExpectedMatches));

        // Seed 2 Client Needs
        var cn1 = await currService.CreateClientNeedAsync(new CreateClientNeedRequest { Code = "MOC", Name = "Management of Care", Pathway = "both" });
        var cn2 = await currService.CreateClientNeedAsync(new CreateClientNeedRequest { Code = "PHA", Name = "Pharmacological Therapies", Pathway = "both" });

        // Seed Questions
        await qbService.CreateQuestionAsync(new CreateQuestionRequest
        {
            Pathway = "rn",
            QuestionTypeKey = "single-choice",
            Stem = "Nurse delegating tasks to assistive personnel (UAP).",
            ClientNeedId = cn1.Id,
            Difficulty = QuestionDifficulty.Easy,
            Options = new List<CreateQuestionOptionRequest>
            {
                new() { OptionKey = "A", Content = "Ambulate stable client", IsCorrect = true },
                new() { OptionKey = "B", Content = "Administer IV insulin", IsCorrect = false }
            }
        }, "author-1");

        await qbService.CreateQuestionAsync(new CreateQuestionRequest
        {
            Pathway = "rn",
            QuestionTypeKey = "sata",
            Stem = "Medication administration safety protocols for heparin.",
            ClientNeedId = cn2.Id,
            Difficulty = QuestionDifficulty.Hard,
            Options = new List<CreateQuestionOptionRequest>
            {
                new() { OptionKey = "A", Content = "Verify with second nurse", IsCorrect = true },
                new() { OptionKey = "B", Content = "Check PTT laboratory value", IsCorrect = true },
                new() { OptionKey = "C", Content = "Aspirate prior to injection", IsCorrect = false }
            }
        }, "author-2");

        // Filter by Search
        var searchResult = await qbService.GetQuestionsAsync(new QuestionQueryParameters { Search = "heparin" });
        Assert.Equal(1, searchResult.TotalCount);
        Assert.Contains("heparin", searchResult.Items[0].Stem);

        // Filter by Client Need
        var cnResult = await qbService.GetQuestionsAsync(new QuestionQueryParameters { ClientNeedId = cn1.Id });
        Assert.Equal(1, cnResult.TotalCount);
        Assert.Equal("MOC", cnResult.Items[0].ClientNeedCode);

        // Filter by Question Type
        var typeResult = await qbService.GetQuestionsAsync(new QuestionQueryParameters { Type = "sata" });
        Assert.Equal(1, typeResult.TotalCount);
        Assert.Equal("sata", typeResult.Items[0].QuestionTypeKey);
    }

    #endregion
}
