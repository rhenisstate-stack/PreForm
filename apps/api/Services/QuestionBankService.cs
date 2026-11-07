using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

public class QuestionBankService : IQuestionBankService
{
    private readonly AppDbContext _context;
    private readonly ILogger<QuestionBankService> _logger;

    public QuestionBankService(AppDbContext context, ILogger<QuestionBankService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<PaginatedResponse<QuestionSummaryDto>> GetQuestionsAsync(QuestionQueryParameters query, CancellationToken ct = default)
    {
        var q = _context.Questions
            .AsNoTracking()
            .Include(x => x.Topic)
                .ThenInclude(t => t!.Subcategory)
                    .ThenInclude(s => s.Category)
                        .ThenInclude(c => c.SubjectDomain)
                            .ThenInclude(d => d.Course)
            .Include(x => x.ClientNeed)
            .Include(x => x.CreatedBy)
            .Include(x => x.ReviewedBy)
            .Include(x => x.Options)
            .AsQueryable();

        // Multi-facet filtering
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            q = q.Where(x => (x.Code != null && x.Code.ToLower().Contains(search)) ||
                             x.Stem.ToLower().Contains(search) ||
                             (x.OverallRationale != null && x.OverallRationale.ToLower().Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(query.Type))
        {
            var type = query.Type.Trim();
            q = q.Where(x => x.QuestionTypeKey == type);
        }

        if (!string.IsNullOrWhiteSpace(query.Pathway))
        {
            var pathway = query.Pathway.Trim().ToLower();
            q = q.Where(x => x.Pathway == pathway || x.Pathway == "both");
        }

        if (!string.IsNullOrWhiteSpace(query.TopicId))
        {
            q = q.Where(x => x.TopicId == query.TopicId);
        }

        if (!string.IsNullOrWhiteSpace(query.SubcategoryId))
        {
            q = q.Where(x => x.Topic != null && x.Topic.SubcategoryId == query.SubcategoryId);
        }

        if (!string.IsNullOrWhiteSpace(query.CategoryId))
        {
            q = q.Where(x => x.Topic != null && x.Topic.Subcategory.CategoryId == query.CategoryId);
        }

        if (!string.IsNullOrWhiteSpace(query.SubjectDomainId))
        {
            q = q.Where(x => x.Topic != null && x.Topic.Subcategory.Category.SubjectDomainId == query.SubjectDomainId);
        }

        if (!string.IsNullOrWhiteSpace(query.CourseId))
        {
            q = q.Where(x => x.Topic != null && x.Topic.Subcategory.Category.SubjectDomain.CourseId == query.CourseId);
        }

        if (!string.IsNullOrWhiteSpace(query.ClientNeedId))
        {
            q = q.Where(x => x.ClientNeedId == query.ClientNeedId);
        }

        if (query.Difficulty.HasValue)
        {
            q = q.Where(x => x.Difficulty == query.Difficulty.Value);
        }

        if (query.Status.HasValue)
        {
            q = q.Where(x => x.Status == query.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.CognitiveLevel))
        {
            q = q.Where(x => x.CognitiveLevel == query.CognitiveLevel);
        }

        if (!string.IsNullOrWhiteSpace(query.ClinicalJudgmentStep))
        {
            q = q.Where(x => x.ClinicalJudgmentStep == query.ClinicalJudgmentStep);
        }

        if (!string.IsNullOrWhiteSpace(query.AuthorId))
        {
            q = q.Where(x => x.CreatedById == query.AuthorId);
        }

        var totalCount = await q.CountAsync(ct);

        // Sorting
        var isAsc = string.Equals(query.SortDirection, "asc", StringComparison.OrdinalIgnoreCase);
        q = (query.SortBy?.ToLowerInvariant()) switch
        {
            "code" => isAsc ? q.OrderBy(x => x.Code) : q.OrderByDescending(x => x.Code),
            "stem" => isAsc ? q.OrderBy(x => x.Stem) : q.OrderByDescending(x => x.Stem),
            "difficulty" => isAsc ? q.OrderBy(x => x.Difficulty) : q.OrderByDescending(x => x.Difficulty),
            "status" => isAsc ? q.OrderBy(x => x.Status) : q.OrderByDescending(x => x.Status),
            "createdat" => isAsc ? q.OrderBy(x => x.CreatedAt) : q.OrderByDescending(x => x.CreatedAt),
            "version" => isAsc ? q.OrderBy(x => x.Version) : q.OrderByDescending(x => x.Version),
            _ => isAsc ? q.OrderBy(x => x.UpdatedAt) : q.OrderByDescending(x => x.UpdatedAt)
        };

        // Pagination
        var page = query.Page > 0 ? query.Page : 1;
        var pageSize = query.PageSize is > 0 and <= 100 ? query.PageSize : 20;

        var items = await q
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new QuestionSummaryDto
            {
                Id = x.Id,
                Code = x.Code,
                Pathway = x.Pathway,
                TopicId = x.TopicId,
                TopicTitle = x.Topic != null ? x.Topic.Title : null,
                SubcategoryName = x.Topic != null ? x.Topic.Subcategory.Name : null,
                CategoryName = x.Topic != null ? x.Topic.Subcategory.Category.Name : null,
                CourseTitle = x.Topic != null ? x.Topic.Subcategory.Category.SubjectDomain.Course.Title : null,
                ClientNeedId = x.ClientNeedId,
                ClientNeedCode = x.ClientNeed != null ? x.ClientNeed.Code : null,
                ClientNeedName = x.ClientNeed != null ? x.ClientNeed.Name : null,
                QuestionTypeKey = x.QuestionTypeKey,
                QuestionTypeName = x.QuestionTypeKey,
                Stem = x.Stem,
                Difficulty = x.Difficulty,
                Status = x.Status,
                Version = x.Version,
                CognitiveLevel = x.CognitiveLevel,
                ClinicalJudgmentStep = x.ClinicalJudgmentStep,
                CreatedById = x.CreatedById,
                AuthorName = x.CreatedBy != null ? x.CreatedBy.DisplayName : null,
                ReviewedById = x.ReviewedById,
                ReviewerName = x.ReviewedBy != null ? x.ReviewedBy.DisplayName : null,
                OptionsCount = x.Options.Count,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt,
                PublishedAt = x.PublishedAt
            })
            .ToListAsync(ct);

        // Populate friendly QuestionType names from registry and dependency counts
        var questionIds = items.Select(i => i.Id).ToList();
        var examRefCounts = questionIds.Count > 0
            ? await _context.ExamQuestions
                .AsNoTracking()
                .Where(eq => questionIds.Contains(eq.QuestionId))
                .GroupBy(eq => eq.QuestionId)
                .Select(g => new { QuestionId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.QuestionId, x => x.Count, ct)
            : new Dictionary<string, int>();

        var attemptRefCounts = questionIds.Count > 0
            ? await _context.AttemptResponses
                .AsNoTracking()
                .Where(ar => questionIds.Contains(ar.QuestionId))
                .GroupBy(ar => ar.QuestionId)
                .Select(g => new { QuestionId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.QuestionId, x => x.Count, ct)
            : new Dictionary<string, int>();

        foreach (var item in items)
        {
            if (QuestionTypeRegistry.Instance.TryGet(item.QuestionTypeKey, out var descriptor))
            {
                item.QuestionTypeName = descriptor.DefaultName;
            }
            item.ReferencedByExamCount = examRefCounts.TryGetValue(item.Id, out var ec) ? ec : 0;
            item.ReferencedByAttemptCount = attemptRefCounts.TryGetValue(item.Id, out var ac) ? ac : 0;
        }

        return new PaginatedResponse<QuestionSummaryDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<QuestionDetailDto?> GetQuestionByIdAsync(string id, CancellationToken ct = default)
    {
        var q = await _context.Questions
            .AsNoTracking()
            .Include(x => x.Topic)
                .ThenInclude(t => t!.Subcategory)
                    .ThenInclude(s => s.Category)
                        .ThenInclude(c => c.SubjectDomain)
                            .ThenInclude(d => d.Course)
            .Include(x => x.ClientNeed)
            .Include(x => x.CreatedBy)
            .Include(x => x.ReviewedBy)
            .Include(x => x.Options)
            .Include(x => x.Versions)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (q == null) return null;

        var typeName = q.QuestionTypeKey;
        if (QuestionTypeRegistry.Instance.TryGet(q.QuestionTypeKey, out var descriptor))
        {
            typeName = descriptor.DefaultName;
        }

        var referencedExams = await _context.ExamQuestions
            .AsNoTracking()
            .Include(eq => eq.Exam)
                .ThenInclude(e => e.Examination)
            .Where(eq => eq.QuestionId == id && eq.Exam != null)
            .Select(eq => new QuestionDependencyExamDto
            {
                RevisionId = eq.ExamId,
                ExaminationId = eq.Exam.ExaminationId ?? string.Empty,
                ExaminationCode = eq.Exam.Examination != null ? eq.Exam.Examination.Code : null,
                Title = eq.Exam.Title,
                LifecycleState = eq.Exam.LifecycleState.ToString()
            })
            .ToListAsync(ct);

        var attemptResponseCount = await _context.AttemptResponses
            .AsNoTracking()
            .CountAsync(ar => ar.QuestionId == id, ct);

        var attemptSnapshotCount = await _context.ExamAttemptQuestions
            .AsNoTracking()
            .CountAsync(eaq => eaq.QuestionId == id, ct);

        return new QuestionDetailDto
        {
            Id = q.Id,
            Code = q.Code,
            Pathway = q.Pathway,
            TopicId = q.TopicId,
            TopicTitle = q.Topic?.Title,
            SubcategoryId = q.Topic?.SubcategoryId,
            SubcategoryName = q.Topic?.Subcategory.Name,
            CategoryId = q.Topic?.Subcategory.CategoryId,
            CategoryName = q.Topic?.Subcategory.Category.Name,
            SubjectDomainId = q.Topic?.Subcategory.Category.SubjectDomainId,
            SubjectDomainTitle = q.Topic?.Subcategory.Category.SubjectDomain.Title,
            CourseId = q.Topic?.Subcategory.Category.SubjectDomain.CourseId,
            CourseTitle = q.Topic?.Subcategory.Category.SubjectDomain.Course.Title,
            ClientNeedId = q.ClientNeedId,
            ClientNeedCode = q.ClientNeed?.Code,
            ClientNeedName = q.ClientNeed?.Name,
            QuestionTypeKey = q.QuestionTypeKey,
            QuestionTypeName = typeName,
            Stem = q.Stem,
            Instructions = q.Instructions,
            Difficulty = q.Difficulty,
            Status = q.Status,
            Version = q.Version,
            ClinicalScenario = q.ClinicalScenario,
            ExhibitsJson = q.ExhibitsJson,
            StructuredContentJson = q.StructuredContentJson,
            OverallRationale = q.OverallRationale,
            CognitiveLevel = q.CognitiveLevel,
            ClinicalJudgmentStep = q.ClinicalJudgmentStep,
            Source = q.Source,
            RejectionReason = q.RejectionReason,
            PublishedAt = q.PublishedAt,
            CreatedById = q.CreatedById,
            AuthorName = q.CreatedBy != null ? q.CreatedBy.DisplayName : null,
            ReviewedById = q.ReviewedById,
            ReviewerName = q.ReviewedBy != null ? q.ReviewedBy.DisplayName : null,
            CreatedAt = q.CreatedAt,
            UpdatedAt = q.UpdatedAt,
            VersionsCount = q.Versions.Count,
            ReferencedByExamCount = referencedExams.Count,
            ReferencedByAttemptCount = Math.Max(attemptResponseCount, attemptSnapshotCount),
            ReferencedExams = referencedExams,
            Options = q.Options
                .OrderBy(o => o.DisplayOrder)
                .ThenBy(o => o.OptionKey)
                .Select(o => new QuestionOptionDto
                {
                    Id = o.Id,
                    OptionKey = o.OptionKey,
                    Content = o.Content,
                    DisplayOrder = o.DisplayOrder,
                    IsCorrect = o.IsCorrect,
                    Rationale = o.Rationale,
                    DistractorRationale = o.DistractorRationale,
                    MediaUrl = o.MediaUrl
                }).ToList()
        };
    }

    public async Task<QuestionDetailDto> CreateQuestionAsync(CreateQuestionRequest request, string authorUserId, CancellationToken ct = default)
    {
        ValidateQuestionContent(request.QuestionTypeKey, request.Stem, request.Options, request.StructuredContentJson);

        if (!string.IsNullOrWhiteSpace(request.TopicId))
        {
            var topicExists = await _context.Topics.AnyAsync(t => t.Id == request.TopicId, ct);
            if (!topicExists)
            {
                throw new ArgumentException($"Topic with ID '{request.TopicId}' does not exist.");
            }
        }

        if (!string.IsNullOrWhiteSpace(request.ClientNeedId))
        {
            var clientNeedExists = await _context.ClientNeeds.AnyAsync(c => c.Id == request.ClientNeedId, ct);
            if (!clientNeedExists)
            {
                throw new ArgumentException($"Client Need with ID '{request.ClientNeedId}' does not exist.");
            }
        }

        var code = request.Code?.Trim();
        if (string.IsNullOrWhiteSpace(code))
        {
            code = await GenerateNextQuestionCodeAsync(ct);
        }
        else
        {
            var codeExists = await _context.Questions.AnyAsync(q => q.Code == code, ct);
            if (codeExists)
            {
                throw new ArgumentException($"A question with code '{code}' already exists.");
            }
        }

        var now = DateTime.UtcNow;
        var question = new Question
        {
            Id = Guid.NewGuid().ToString(),
            Code = code,
            Pathway = (request.Pathway ?? "rn").Trim().ToLowerInvariant(),
            TopicId = string.IsNullOrWhiteSpace(request.TopicId) ? null : request.TopicId,
            ClientNeedId = string.IsNullOrWhiteSpace(request.ClientNeedId) ? null : request.ClientNeedId,
            QuestionTypeKey = request.QuestionTypeKey.Trim(),
            Stem = request.Stem.Trim(),
            Instructions = request.Instructions?.Trim(),
            Difficulty = request.Difficulty,
            Status = QuestionStatus.Draft,
            Version = 1,
            ClinicalScenario = request.ClinicalScenario?.Trim(),
            ExhibitsJson = request.ExhibitsJson?.Trim(),
            StructuredContentJson = request.StructuredContentJson?.Trim(),
            OverallRationale = request.OverallRationale?.Trim(),
            CognitiveLevel = request.CognitiveLevel?.Trim(),
            ClinicalJudgmentStep = request.ClinicalJudgmentStep?.Trim(),
            Source = request.Source?.Trim(),
            CreatedById = authorUserId,
            CreatedAt = now,
            UpdatedAt = now
        };

        var nonEmptyOptions = request.Options
            .Where(o => !string.IsNullOrWhiteSpace(o.Content) || !string.IsNullOrWhiteSpace(o.MediaUrl))
            .ToList();

        if (nonEmptyOptions.Count > 0)
        {
            int order = 0;
            foreach (var opt in nonEmptyOptions)
            {
                question.Options.Add(new QuestionOption
                {
                    Id = Guid.NewGuid().ToString(),
                    QuestionId = question.Id,
                    OptionKey = string.IsNullOrWhiteSpace(opt.OptionKey) ? ((char)('A' + order)).ToString() : opt.OptionKey.Trim(),
                    Content = opt.Content.Trim(),
                    DisplayOrder = opt.DisplayOrder != 0 ? opt.DisplayOrder : order,
                    IsCorrect = opt.IsCorrect,
                    Rationale = opt.Rationale?.Trim(),
                    DistractorRationale = opt.DistractorRationale?.Trim(),
                    MediaUrl = opt.MediaUrl?.Trim()
                });
                order++;
            }
        }

        _context.Questions.Add(question);

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = authorUserId,
            Action = "QuestionCreated",
            EntityType = "Question",
            EntityId = question.Id,
            Description = JsonSerializer.Serialize(new
            {
                code = question.Code,
                type = question.QuestionTypeKey,
                difficulty = question.Difficulty.ToString(),
                pathway = question.Pathway
            }),
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);

        return (await GetQuestionByIdAsync(question.Id, ct))!;
    }

    public async Task<QuestionDetailDto?> UpdateQuestionAsync(string id, UpdateQuestionRequest request, string editorUserId, CancellationToken ct = default)
    {
        var question = await _context.Questions
            .Include(q => q.Options)
            .Include(q => q.Versions)
            .FirstOrDefaultAsync(q => q.Id == id, ct);

        if (question == null) return null;

        ValidateQuestionContent(request.QuestionTypeKey, request.Stem, request.Options, request.StructuredContentJson);

        if (!string.IsNullOrWhiteSpace(request.TopicId))
        {
            var topicExists = await _context.Topics.AnyAsync(t => t.Id == request.TopicId, ct);
            if (!topicExists)
            {
                throw new ArgumentException($"Topic with ID '{request.TopicId}' does not exist.");
            }
        }

        if (!string.IsNullOrWhiteSpace(request.ClientNeedId))
        {
            var clientNeedExists = await _context.ClientNeeds.AnyAsync(c => c.Id == request.ClientNeedId, ct);
            if (!clientNeedExists)
            {
                throw new ArgumentException($"Client Need with ID '{request.ClientNeedId}' does not exist.");
            }
        }

        var now = DateTime.UtcNow;

        // IMMUTABILITY INVARIANT:
        // If question is currently Published, snapshot prior state to QuestionVersions before updating
        if (question.Status == QuestionStatus.Published)
        {
            var snapshotJson = CreateSnapshotJson(question, question.Options.ToList());
            _context.QuestionVersions.Add(new QuestionVersion
            {
                Id = Guid.NewGuid().ToString(),
                QuestionId = question.Id,
                VersionNumber = question.Version,
                SnapshotJson = snapshotJson,
                ChangeSummary = string.IsNullOrWhiteSpace(request.ChangeSummary) ? "Updated while published" : request.ChangeSummary.Trim(),
                Status = question.Status,
                CreatedById = editorUserId,
                CreatedAt = now
            });

            question.Version++;
        }

        // If edited while InReview, reset to Draft so review is re-conducted
        if (question.Status == QuestionStatus.InReview)
        {
            question.Status = QuestionStatus.Draft;
        }

        // Update properties (preserve existing ExhibitsJson and StructuredContentJson when omitted in partial updates)
        question.Pathway = (request.Pathway ?? "rn").Trim().ToLowerInvariant();
        question.TopicId = string.IsNullOrWhiteSpace(request.TopicId) ? null : request.TopicId;
        question.ClientNeedId = string.IsNullOrWhiteSpace(request.ClientNeedId) ? null : request.ClientNeedId;
        question.QuestionTypeKey = request.QuestionTypeKey.Trim();
        question.Stem = request.Stem.Trim();
        question.Instructions = request.Instructions != null ? (string.IsNullOrWhiteSpace(request.Instructions) ? null : request.Instructions.Trim()) : question.Instructions;
        question.Difficulty = request.Difficulty;
        question.ClinicalScenario = request.ClinicalScenario != null ? (string.IsNullOrWhiteSpace(request.ClinicalScenario) ? null : request.ClinicalScenario.Trim()) : question.ClinicalScenario;
        question.ExhibitsJson = request.ExhibitsJson != null ? (string.IsNullOrWhiteSpace(request.ExhibitsJson) ? null : request.ExhibitsJson.Trim()) : question.ExhibitsJson;
        question.StructuredContentJson = request.StructuredContentJson != null ? (string.IsNullOrWhiteSpace(request.StructuredContentJson) ? null : request.StructuredContentJson.Trim()) : question.StructuredContentJson;
        question.OverallRationale = request.OverallRationale != null ? (string.IsNullOrWhiteSpace(request.OverallRationale) ? null : request.OverallRationale.Trim()) : question.OverallRationale;
        question.CognitiveLevel = request.CognitiveLevel != null ? (string.IsNullOrWhiteSpace(request.CognitiveLevel) ? null : request.CognitiveLevel.Trim()) : question.CognitiveLevel;
        question.ClinicalJudgmentStep = request.ClinicalJudgmentStep != null ? (string.IsNullOrWhiteSpace(request.ClinicalJudgmentStep) ? null : request.ClinicalJudgmentStep.Trim()) : question.ClinicalJudgmentStep;
        question.Source = request.Source != null ? (string.IsNullOrWhiteSpace(request.Source) ? null : request.Source.Trim()) : question.Source;
        question.UpdatedAt = now;

        // Update options
        _context.QuestionOptions.RemoveRange(question.Options);
        question.Options.Clear();

        var validOptions = request.Options
            .Where(o => !string.IsNullOrWhiteSpace(o.Content) || !string.IsNullOrWhiteSpace(o.MediaUrl))
            .ToList();

        int order = 0;
        foreach (var opt in validOptions)
        {
            question.Options.Add(new QuestionOption
            {
                Id = Guid.NewGuid().ToString(),
                QuestionId = question.Id,
                OptionKey = string.IsNullOrWhiteSpace(opt.OptionKey) ? ((char)('A' + order)).ToString() : opt.OptionKey.Trim(),
                Content = opt.Content.Trim(),
                DisplayOrder = opt.DisplayOrder != 0 ? opt.DisplayOrder : order,
                IsCorrect = opt.IsCorrect,
                Rationale = opt.Rationale?.Trim(),
                DistractorRationale = opt.DistractorRationale?.Trim(),
                MediaUrl = opt.MediaUrl?.Trim()
            });
            order++;
        }

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = editorUserId,
            Action = "QuestionUpdated",
            EntityType = "Question",
            EntityId = question.Id,
            Description = JsonSerializer.Serialize(new
            {
                code = question.Code,
                version = question.Version,
                changeSummary = request.ChangeSummary
            }),
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);

        return await GetQuestionByIdAsync(id, ct);
    }

    public async Task<QuestionDetailDto?> TransitionStatusAsync(
        string id,
        QuestionStatusTransitionRequest request,
        string actorUserId,
        bool isSuperAdmin,
        CancellationToken ct = default)
    {
        var question = await _context.Questions
            .Include(q => q.Options)
            .Include(q => q.Versions)
            .FirstOrDefaultAsync(q => q.Id == id, ct);

        if (question == null) return null;

        var currentStatus = question.Status;
        var targetStatus = request.TargetStatus;

        if (currentStatus == targetStatus)
        {
            return await GetQuestionByIdAsync(id, ct);
        }

        var now = DateTime.UtcNow;

        switch (targetStatus)
        {
            case QuestionStatus.InReview:
                if (currentStatus != QuestionStatus.Draft && currentStatus != QuestionStatus.Approved)
                {
                    throw new InvalidOperationException($"Cannot transition question from '{currentStatus}' to 'InReview'. Must be in 'Draft' or 'Approved'.");
                }
                question.Status = QuestionStatus.InReview;
                question.RejectionReason = null;
                break;

            case QuestionStatus.Approved:
                if (currentStatus != QuestionStatus.InReview)
                {
                    throw new InvalidOperationException($"Cannot approve question in '{currentStatus}' status. Question must be 'InReview'.");
                }

                // Separation of duties rule: Author cannot approve their own question unless SuperAdmin
                if (!string.IsNullOrWhiteSpace(question.CreatedById) &&
                    string.Equals(question.CreatedById, actorUserId, StringComparison.OrdinalIgnoreCase) &&
                    !isSuperAdmin)
                {
                    throw new InvalidOperationException("Separation of duties violation: The author cannot approve their own question. A distinct reviewer or administrator must conduct approval.");
                }

                question.Status = QuestionStatus.Approved;
                question.ReviewedById = actorUserId;
                question.RejectionReason = null;
                break;

            case QuestionStatus.Draft: // Rejection from review or restoration from archived
                if (currentStatus == QuestionStatus.InReview)
                {
                    if (string.IsNullOrWhiteSpace(request.RejectionReason))
                    {
                        throw new ArgumentException("A rejection reason is required when returning a question to Draft status.");
                    }
                    question.RejectionReason = request.RejectionReason.Trim();
                    question.ReviewedById = actorUserId;
                }
                else if (currentStatus == QuestionStatus.Archived)
                {
                    // Restoring from archived
                    question.RejectionReason = null;
                }
                else
                {
                    throw new InvalidOperationException($"Cannot return question from '{currentStatus}' to 'Draft'.");
                }
                question.Status = QuestionStatus.Draft;
                break;

            case QuestionStatus.Published:
                if (currentStatus != QuestionStatus.Approved)
                {
                    throw new InvalidOperationException($"Cannot publish question in '{currentStatus}' status. Question must be 'Approved' first.");
                }

                // Check publication eligibility against QuestionTypeRegistry
                if (QuestionTypeRegistry.Instance.TryGet(question.QuestionTypeKey, out var descriptor))
                {
                    if (descriptor.ImplementationStatus == QuestionTypeStatus.Catalogued)
                    {
                        throw new InvalidOperationException($"Question type '{descriptor.Key}' has status '{descriptor.ImplementationStatus}' and cannot be published into active examination delivery until grading support is implemented.");
                    }
                }

                question.Status = QuestionStatus.Published;
                question.PublishedAt = now;
                break;

            case QuestionStatus.Archived:
                if (currentStatus != QuestionStatus.Published && currentStatus != QuestionStatus.Approved)
                {
                    throw new InvalidOperationException($"Cannot archive question in '{currentStatus}' status. Only 'Published' or 'Approved' questions can be archived.");
                }

                // Create snapshot before archiving
                var archiveSnapshot = CreateSnapshotJson(question, question.Options.ToList());
                _context.QuestionVersions.Add(new QuestionVersion
                {
                    Id = Guid.NewGuid().ToString(),
                    QuestionId = question.Id,
                    VersionNumber = question.Version,
                    SnapshotJson = archiveSnapshot,
                    ChangeSummary = string.IsNullOrWhiteSpace(request.ChangeSummary) ? "Archived" : request.ChangeSummary.Trim(),
                    Status = question.Status,
                    CreatedById = actorUserId,
                    CreatedAt = now
                });

                question.Status = QuestionStatus.Archived;
                break;

            default:
                throw new InvalidOperationException($"Unsupported target status '{targetStatus}'.");
        }

        question.UpdatedAt = now;

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorUserId,
            Action = $"QuestionStatusChanged:{targetStatus}",
            EntityType = "Question",
            EntityId = question.Id,
            Description = JsonSerializer.Serialize(new
            {
                fromStatus = currentStatus.ToString(),
                toStatus = targetStatus.ToString(),
                rejectionReason = request.RejectionReason,
                changeSummary = request.ChangeSummary
            }),
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);

        return await GetQuestionByIdAsync(id, ct);
    }

    public async Task<List<QuestionVersionDto>> GetQuestionVersionsAsync(string questionId, CancellationToken ct = default)
    {
        var versions = await _context.QuestionVersions
            .AsNoTracking()
            .Where(v => v.QuestionId == questionId)
            .OrderByDescending(v => v.VersionNumber)
            .ToListAsync(ct);

        var userIds = versions.Where(v => v.CreatedById != null).Select(v => v.CreatedById!).Distinct().ToList();
        var userNames = await _context.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.DisplayName, ct);

        return versions.Select(v => new QuestionVersionDto
        {
            Id = v.Id,
            QuestionId = v.QuestionId,
            VersionNumber = v.VersionNumber,
            SnapshotJson = v.SnapshotJson,
            ChangeSummary = v.ChangeSummary,
            Status = v.Status,
            CreatedById = v.CreatedById,
            CreatedByName = v.CreatedById != null && userNames.TryGetValue(v.CreatedById, out var name) ? name : null,
            CreatedAt = v.CreatedAt
        }).ToList();
    }

    private static void ValidateQuestionContent(
        string questionTypeKey,
        string stem,
        List<CreateQuestionOptionRequest> options,
        string? structuredContentJson)
    {
        if (string.IsNullOrWhiteSpace(stem))
        {
            throw new ArgumentException("Question stem is required and cannot be empty.");
        }

        if (!QuestionTypeRegistry.Instance.TryGet(questionTypeKey, out var descriptor))
        {
            throw new ArgumentException($"Question type '{questionTypeKey}' is not recognized in the question type registry.");
        }

        // Validate traditional options
        switch (questionTypeKey)
        {
            case "single-choice":
            case "image-based":
                if (options.Count < 2)
                {
                    throw new ArgumentException($"Question type '{questionTypeKey}' requires at least 2 options.");
                }
                var correctCount = options.Count(o => o.IsCorrect);
                if (correctCount != 1)
                {
                    throw new ArgumentException($"Question type '{questionTypeKey}' requires exactly 1 correct option, but found {correctCount}.");
                }
                break;

            case "multiple-choice":
            case "sata":
            case "checkbox":
            case "multiple-image":
                if (options.Count < 2)
                {
                    throw new ArgumentException($"Question type '{questionTypeKey}' requires at least 2 options.");
                }
                var multiCorrect = options.Count(o => o.IsCorrect);
                if (multiCorrect < 1)
                {
                    throw new ArgumentException($"Question type '{questionTypeKey}' requires at least 1 correct option.");
                }
                break;

            case "true-false":
                if (options.Count != 2)
                {
                    throw new ArgumentException("Question type 'true-false' must have exactly 2 options ('True' and 'False').");
                }
                var tfCorrect = options.Count(o => o.IsCorrect);
                if (tfCorrect != 1)
                {
                    throw new ArgumentException("Question type 'true-false' requires exactly 1 correct option.");
                }
                break;

            default:
                // For NGN and structured types: if structured JSON is provided, ensure valid JSON
                if (!string.IsNullOrWhiteSpace(structuredContentJson))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(structuredContentJson);
                    }
                    catch (JsonException ex)
                    {
                        throw new ArgumentException($"Invalid StructuredContentJson: {ex.Message}");
                    }
                }
                break;
        }
    }

    private static string CreateSnapshotJson(Question question, List<QuestionOption> options)
    {
        return JsonSerializer.Serialize(new
        {
            question.Id,
            question.Code,
            question.Pathway,
            question.TopicId,
            question.ClientNeedId,
            question.QuestionTypeKey,
            question.Stem,
            question.Instructions,
            Difficulty = question.Difficulty.ToString(),
            Status = question.Status.ToString(),
            question.Version,
            question.ClinicalScenario,
            question.ExhibitsJson,
            question.StructuredContentJson,
            question.OverallRationale,
            question.CognitiveLevel,
            question.ClinicalJudgmentStep,
            question.Source,
            Options = options.Select(o => new
            {
                o.Id,
                o.OptionKey,
                o.Content,
                o.DisplayOrder,
                o.IsCorrect,
                o.Rationale,
                o.DistractorRationale,
                o.MediaUrl
            })
        });
    }

    private async Task<string> GenerateNextQuestionCodeAsync(CancellationToken ct)
    {
        var count = await _context.Questions.CountAsync(ct) + 1;
        var code = $"QN-{count:D6}";

        while (await _context.Questions.AnyAsync(q => q.Code == code, ct))
        {
            count++;
            code = $"QN-{count:D6}";
        }

        return code;
    }
}
