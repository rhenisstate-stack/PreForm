using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

public class ExamLifecycleService : IExamLifecycleService
{
    private readonly AppDbContext _context;
    private readonly IExaminationCodeService _codeService;

    public ExamLifecycleService(AppDbContext context, IExaminationCodeService? codeService = null)
    {
        _context = context;
        _codeService = codeService ?? new ExaminationCodeService(context);
    }

    private static (string actorId, string role) ResolveActor(ClaimsPrincipal user)
    {
        var actorId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? user.FindFirst("sub")?.Value
            ?? throw new UnauthorizedAccessException("Authentication required.");

        var role = RoleHierarchy.GetEffectiveRole(user);
        return (actorId, role);
    }

    private static void EnforceRole(string currentRole, string[] allowedRoles, string actionName)
    {
        if (!allowedRoles.Contains(currentRole, StringComparer.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException($"Role '{currentRole}' is not authorized to perform action '{actionName}'.");
        }
    }

    private async Task EnforceConcurrencyAsync(Exam revision, long expectedToken, string actionName, string actorId, CancellationToken ct)
    {
        if (revision.ConcurrencyToken != expectedToken)
        {
            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid().ToString(),
                ActorId = actorId,
                Action = actionName,
                EntityType = "Exam",
                EntityId = revision.Id,
                Description = JsonSerializer.Serialize(new
                {
                    error = "ConcurrencyConflict",
                    expectedToken,
                    actualToken = revision.ConcurrencyToken,
                    revisionNumber = revision.RevisionNumber
                }),
                Outcome = "Conflict",
                Timestamp = DateTime.UtcNow
            });
            await _context.SaveChangesAsync(ct);

            throw new DbUpdateConcurrencyException($"Concurrency conflict on revision '{revision.Id}'. Expected token {expectedToken}, current token {revision.ConcurrencyToken}.");
        }
    }

    public async Task<ExamRevisionDto> CreateRevisionAsync(string examinationId, CreateRevisionRequest request, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var (actorId, role) = ResolveActor(user);
        EnforceRole(role, new[] { RoleHierarchy.RoleExamManager, RoleHierarchy.RoleAdmin, RoleHierarchy.RoleSuperAdmin }, "CreateRevision");

        var isRelational = _context.Database.IsRelational();
        await using var transaction = isRelational ? await _context.Database.BeginTransactionAsync(ct) : null;

        if (_context.Database.IsNpgsql())
        {
            // Row-level lock on the Examination record to serialize revision number allocation and prevent concurrency race conditions
            await _context.Examinations
                .FromSqlInterpolated($"SELECT * FROM public.\"Examinations\" WHERE \"Id\" = {examinationId} FOR UPDATE")
                .FirstOrDefaultAsync(ct);
        }

        var examination = await _context.Examinations
            .Include(e => e.Revisions)
            .FirstOrDefaultAsync(e => e.Id == examinationId, ct);

        if (examination == null)
        {
            throw new KeyNotFoundException($"Examination '{examinationId}' not found.");
        }

        // Invariant: At most one revision may be actively in Draft per Examination family
        var hasActiveDraft = await _context.Exams
            .AnyAsync(e => e.ExaminationId == examinationId && e.LifecycleState == ExamLifecycleState.Draft, ct);

        if (hasActiveDraft)
        {
            throw new InvalidOperationException($"Examination '{examination.Code}' already has an active revision in Draft state. Only one draft revision is permitted at a time.");
        }

        Exam? sourceRevision = null;
        if (!string.IsNullOrWhiteSpace(request.SourceRevisionId))
        {
            sourceRevision = await _context.Exams
                .Include(e => e.ExamQuestions)
                .FirstOrDefaultAsync(e => e.Id == request.SourceRevisionId, ct);

            if (sourceRevision == null)
            {
                throw new KeyNotFoundException($"Source revision '{request.SourceRevisionId}' not found.");
            }

            if (sourceRevision.ExaminationId != examinationId)
            {
                throw new InvalidOperationException($"Source revision '{request.SourceRevisionId}' does not belong to examination family '{examinationId}'.");
            }

            if (sourceRevision.LifecycleState == ExamLifecycleState.Draft)
            {
                throw new InvalidOperationException($"Cannot branch a new revision from a revision in Draft state. The active draft must first be progressed or discarded.");
            }
            if (sourceRevision.LifecycleState == ExamLifecycleState.InReview)
            {
                throw new InvalidOperationException($"Cannot branch a new revision from revision '{sourceRevision.Id}' while it is InReview.");
            }
            if (sourceRevision.LifecycleState == ExamLifecycleState.Retired)
            {
                throw new InvalidOperationException($"Cannot branch a new revision from revision '{sourceRevision.Id}' because it is in terminal Retired state.");
            }
            if (sourceRevision.LifecycleState != ExamLifecycleState.Published &&
                sourceRevision.LifecycleState != ExamLifecycleState.Approved &&
                sourceRevision.LifecycleState != ExamLifecycleState.Archived)
            {
                throw new InvalidOperationException($"Cannot branch a new revision from revision in '{sourceRevision.LifecycleState}' state. Only Published, Approved, or Archived revisions are eligible.");
            }
        }

        var maxRevision = await _context.Exams
            .Where(e => e.ExaminationId == examinationId)
            .MaxAsync(e => (int?)e.RevisionNumber, ct) ?? 0;

        var nextRevisionNumber = maxRevision + 1;
        var now = DateTime.UtcNow;

        var title = !string.IsNullOrWhiteSpace(request.Title)
            ? request.Title.Trim()
            : (sourceRevision != null ? sourceRevision.Title : examination.Title);

        var description = !string.IsNullOrWhiteSpace(request.Description)
            ? request.Description.Trim()
            : (sourceRevision != null ? sourceRevision.Description : string.Empty);

        var examType = request.ExamType;
        var timeLimit = request.TimeLimitMinutes > 0 ? request.TimeLimitMinutes : (sourceRevision?.TimeLimitMinutes ?? 0);
        var passingScore = request.PassingScorePercent > 0 ? request.PassingScorePercent : (sourceRevision?.PassingScorePercent ?? 75.0m);

        var revision = new Exam
        {
            Id = Guid.NewGuid().ToString(),
            ExaminationId = examinationId,
            RevisionNumber = nextRevisionNumber,
            LifecycleState = ExamLifecycleState.Draft,
            ConcurrencyToken = 1,
            Title = title,
            Description = description,
            Pathway = examination.Pathway,
            ExamType = examType,
            TimeLimitMinutes = timeLimit,
            PassingScorePercent = passingScore,
            IsPublished = false,
            CreatedBy = actorId,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Exams.Add(revision);

        var copiedCount = 0;
        if (sourceRevision != null && request.CopyQuestions && sourceRevision.ExamQuestions.Any())
        {
            var sourceQuestions = sourceRevision.ExamQuestions.OrderBy(eq => eq.DisplayOrder).ToList();
            var questionIds = sourceQuestions.Select(eq => eq.QuestionId).Distinct().ToList();

            var activeQuestions = await _context.Questions
                .Where(q => questionIds.Contains(q.Id))
                .ToDictionaryAsync(q => q.Id, ct);

            foreach (var sq in sourceQuestions)
            {
                if (!activeQuestions.TryGetValue(sq.QuestionId, out var question))
                {
                    throw new InvalidOperationException($"Question '{sq.QuestionId}' was not found in question bank and cannot be copied.");
                }

                if (!string.Equals(question.Pathway, examination.Pathway, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException($"Question '{question.Id}' pathway '{question.Pathway}' does not match examination pathway '{examination.Pathway}'.");
                }

                if (question.Status != QuestionStatus.Approved && question.Status != QuestionStatus.Published)
                {
                    throw new InvalidOperationException($"Question '{question.Id}' is in '{question.Status}' state and is not eligible to be copied.");
                }

                var newEq = new ExamQuestion
                {
                    Id = Guid.NewGuid().ToString(),
                    ExamId = revision.Id,
                    QuestionId = sq.QuestionId,
                    DisplayOrder = sq.DisplayOrder
                };
                _context.ExamQuestions.Add(newEq);
                copiedCount++;
            }
        }

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorId,
            Action = "ExamRevisionCreated",
            EntityType = "Exam",
            EntityId = revision.Id,
            Description = JsonSerializer.Serialize(new
            {
                examinationId = examination.Id,
                examinationCode = examination.Code,
                revisionNumber = nextRevisionNumber,
                sourceRevisionId = sourceRevision?.Id,
                sourceRevisionNumber = sourceRevision?.RevisionNumber,
                lifecycleState = ExamLifecycleState.Draft.ToString(),
                questionCount = copiedCount,
                title = revision.Title
            }),
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);
        if (transaction != null)
        {
            await transaction.CommitAsync(ct);
        }

        return MapToRevisionDto(revision, examination.Code, copiedCount);
    }

    public async Task<DuplicateExaminationResponseDto> DuplicateExaminationAsync(
        string examinationId,
        DuplicateExaminationRequest request,
        ClaimsPrincipal user,
        CancellationToken ct = default)
    {
        var (actorId, role) = ResolveActor(user);
        EnforceRole(role, new[] { RoleHierarchy.RoleExamManager, RoleHierarchy.RoleAdmin, RoleHierarchy.RoleSuperAdmin }, "DuplicateExamination");

        var isRelational = _context.Database.IsRelational();
        await using var transaction = isRelational ? await _context.Database.BeginTransactionAsync(ct) : null;

        var sourceFamily = await _context.Examinations
            .Include(e => e.Revisions)
            .FirstOrDefaultAsync(e => e.Id == examinationId, ct);

        if (sourceFamily == null)
        {
            throw new KeyNotFoundException($"Source examination '{examinationId}' not found.");
        }

        Exam? sourceRevision = null;
        if (!string.IsNullOrWhiteSpace(request.SourceRevisionId))
        {
            sourceRevision = await _context.Exams
                .Include(e => e.ExamQuestions)
                .FirstOrDefaultAsync(e => e.Id == request.SourceRevisionId, ct);

            if (sourceRevision == null)
            {
                throw new KeyNotFoundException($"Source revision '{request.SourceRevisionId}' not found.");
            }

            if (sourceRevision.ExaminationId != examinationId)
            {
                throw new InvalidOperationException($"Source revision '{request.SourceRevisionId}' does not belong to examination family '{examinationId}'.");
            }
        }
        else
        {
            sourceRevision = await _context.Exams
                .Include(e => e.ExamQuestions)
                .Where(e => e.ExaminationId == examinationId &&
                            (e.LifecycleState == ExamLifecycleState.Published ||
                             e.LifecycleState == ExamLifecycleState.Approved ||
                             e.LifecycleState == ExamLifecycleState.Archived))
                .OrderByDescending(e => e.LifecycleState == ExamLifecycleState.Published ? 1 : 0)
                .ThenByDescending(e => e.RevisionNumber)
                .FirstOrDefaultAsync(ct);

            if (sourceRevision == null)
            {
                throw new InvalidOperationException($"Examination '{sourceFamily.Code}' has no eligible published, approved, or archived revision to duplicate.");
            }
        }

        if (sourceRevision.LifecycleState == ExamLifecycleState.Draft)
        {
            throw new InvalidOperationException($"Cannot duplicate from revision in Draft state. Only Approved, Published, or Archived revisions can be duplicated.");
        }
        if (sourceRevision.LifecycleState == ExamLifecycleState.InReview)
        {
            throw new InvalidOperationException($"Cannot duplicate from revision '{sourceRevision.Id}' while it is InReview.");
        }
        if (sourceRevision.LifecycleState == ExamLifecycleState.Retired)
        {
            throw new InvalidOperationException($"Cannot duplicate from revision '{sourceRevision.Id}' because it is in terminal Retired state.");
        }
        if (sourceRevision.LifecycleState != ExamLifecycleState.Published &&
            sourceRevision.LifecycleState != ExamLifecycleState.Approved &&
            sourceRevision.LifecycleState != ExamLifecycleState.Archived)
        {
            throw new InvalidOperationException($"Cannot duplicate from revision in '{sourceRevision.LifecycleState}' state. Only Published, Approved, or Archived revisions are eligible.");
        }

        var newCode = await _codeService.AllocateCodeAsync(sourceFamily.Pathway, ct);
        var now = DateTime.UtcNow;

        var newTitle = !string.IsNullOrWhiteSpace(request.Title)
            ? request.Title.Trim()
            : $"{sourceFamily.Title} (Copy)";

        var newFamily = new Examination
        {
            Id = Guid.NewGuid().ToString(),
            Pathway = sourceFamily.Pathway,
            Code = newCode,
            Title = newTitle,
            CreatedAt = now,
            CreatedBy = actorId
        };
        _context.Examinations.Add(newFamily);

        var newDescription = !string.IsNullOrWhiteSpace(request.Description)
            ? request.Description.Trim()
            : sourceRevision.Description;

        var timeLimit = request.TimeLimitMinutes.HasValue && request.TimeLimitMinutes.Value >= 0
            ? request.TimeLimitMinutes.Value
            : sourceRevision.TimeLimitMinutes;

        var passingScore = request.PassingScorePercent.HasValue && request.PassingScorePercent.Value > 0
            ? request.PassingScorePercent.Value
            : sourceRevision.PassingScorePercent;

        var newRevision = new Exam
        {
            Id = Guid.NewGuid().ToString(),
            ExaminationId = newFamily.Id,
            RevisionNumber = 1,
            LifecycleState = ExamLifecycleState.Draft,
            ConcurrencyToken = 1,
            Title = newTitle,
            Description = newDescription,
            Pathway = newFamily.Pathway,
            ExamType = sourceRevision.ExamType,
            TimeLimitMinutes = timeLimit,
            PassingScorePercent = passingScore,
            IsPublished = false,
            CreatedBy = actorId,
            CreatedAt = now,
            UpdatedAt = now
        };
        _context.Exams.Add(newRevision);

        var copiedCount = 0;
        if (sourceRevision.ExamQuestions.Any())
        {
            var sourceQuestions = sourceRevision.ExamQuestions.OrderBy(eq => eq.DisplayOrder).ToList();
            var questionIds = sourceQuestions.Select(eq => eq.QuestionId).Distinct().ToList();

            var activeQuestions = await _context.Questions
                .Where(q => questionIds.Contains(q.Id))
                .ToDictionaryAsync(q => q.Id, ct);

            foreach (var sq in sourceQuestions)
            {
                if (!activeQuestions.TryGetValue(sq.QuestionId, out var question))
                {
                    throw new InvalidOperationException($"Question '{sq.QuestionId}' was not found in question bank and cannot be copied.");
                }

                if (!string.Equals(question.Pathway, newFamily.Pathway, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException($"Question '{question.Id}' pathway '{question.Pathway}' does not match examination pathway '{newFamily.Pathway}'.");
                }

                if (question.Status != QuestionStatus.Approved && question.Status != QuestionStatus.Published)
                {
                    throw new InvalidOperationException($"Question '{question.Id}' is in '{question.Status}' state and is not eligible to be copied.");
                }

                var newEq = new ExamQuestion
                {
                    Id = Guid.NewGuid().ToString(),
                    ExamId = newRevision.Id,
                    QuestionId = sq.QuestionId,
                    DisplayOrder = sq.DisplayOrder
                };
                _context.ExamQuestions.Add(newEq);
                copiedCount++;
            }
        }

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorId,
            Action = "ExamDuplicated",
            EntityType = "Examination",
            EntityId = newFamily.Id,
            Description = JsonSerializer.Serialize(new
            {
                sourceExaminationId = sourceFamily.Id,
                sourceExaminationCode = sourceFamily.Code,
                sourceRevisionId = sourceRevision.Id,
                sourceRevisionNumber = sourceRevision.RevisionNumber,
                newExaminationId = newFamily.Id,
                newExaminationCode = newFamily.Code,
                newRevisionId = newRevision.Id,
                newRevisionNumber = 1,
                questionCount = copiedCount,
                pathway = newFamily.Pathway,
                title = newFamily.Title
            }),
            Outcome = "Success",
            Timestamp = now
        });

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorId,
            Action = "ExamRevisionCreated",
            EntityType = "Exam",
            EntityId = newRevision.Id,
            Description = JsonSerializer.Serialize(new
            {
                examinationId = newFamily.Id,
                examinationCode = newFamily.Code,
                revisionNumber = 1,
                sourceRevisionId = sourceRevision.Id,
                sourceRevisionNumber = sourceRevision.RevisionNumber,
                lifecycleState = ExamLifecycleState.Draft.ToString(),
                questionCount = copiedCount,
                title = newRevision.Title
            }),
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);
        if (transaction != null)
        {
            await transaction.CommitAsync(ct);
        }

        var familyDto = MapToExaminationDto(newFamily, new List<Exam> { newRevision }, new Dictionary<string, int> { [newRevision.Id] = copiedCount });

        return new DuplicateExaminationResponseDto
        {
            Success = true,
            ExaminationId = newFamily.Id,
            ExaminationCode = newFamily.Code,
            ExaminationTitle = newFamily.Title,
            Pathway = newFamily.Pathway,
            RevisionId = newRevision.Id,
            RevisionNumber = 1,
            LifecycleState = ExamLifecycleState.Draft.ToString(),
            QuestionCount = copiedCount,
            Examination = familyDto
        };
    }

    public async Task<ExamRevisionDto> SubmitForReviewAsync(string revisionId, long concurrencyToken, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var (actorId, role) = ResolveActor(user);
        EnforceRole(role, new[] { RoleHierarchy.RoleExamManager, RoleHierarchy.RoleAdmin, RoleHierarchy.RoleSuperAdmin }, "SubmitForReview");

        var revision = await _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.ExamQuestions)
            .FirstOrDefaultAsync(e => e.Id == revisionId, ct);

        if (revision == null)
            throw new KeyNotFoundException($"Exam revision '{revisionId}' not found.");

        await EnforceConcurrencyAsync(revision, concurrencyToken, "ExamRevisionSubmitted", actorId, ct);

        if (revision.LifecycleState != ExamLifecycleState.Draft)
        {
            throw new InvalidOperationException($"Cannot submit revision in '{revision.LifecycleState}' state. Only Draft revisions can be submitted for review.");
        }

        // Invariant: Must contain at least one question
        if (revision.ExamQuestions.Count == 0)
        {
            throw new InvalidOperationException("Revision must contain at least one question before submission for review.");
        }

        var now = DateTime.UtcNow;
        revision.LifecycleState = ExamLifecycleState.InReview;
        revision.SubmittedBy = actorId;
        revision.SubmittedAt = now;
        revision.ConcurrencyToken++;
        revision.UpdatedAt = now;

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorId,
            Action = "ExamRevisionSubmitted",
            EntityType = "Exam",
            EntityId = revision.Id,
            Description = JsonSerializer.Serialize(new
            {
                examinationId = revision.ExaminationId,
                examinationCode = revision.Examination?.Code,
                revisionNumber = revision.RevisionNumber,
                previousState = ExamLifecycleState.Draft.ToString(),
                newState = ExamLifecycleState.InReview.ToString(),
                questionCount = revision.ExamQuestions.Count
            }),
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);
        return MapToRevisionDto(revision, revision.Examination?.Code, revision.ExamQuestions.Count);
    }

    public async Task<ExamRevisionDto> RecommendApprovalAsync(string revisionId, long concurrencyToken, string? notes, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var (actorId, role) = ResolveActor(user);
        EnforceRole(role, new[] { RoleHierarchy.RoleReviewer, RoleHierarchy.RoleAdmin, RoleHierarchy.RoleSuperAdmin }, "RecommendApproval");

        var revision = await _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.ExamQuestions)
            .FirstOrDefaultAsync(e => e.Id == revisionId, ct);

        if (revision == null)
            throw new KeyNotFoundException($"Exam revision '{revisionId}' not found.");

        await EnforceConcurrencyAsync(revision, concurrencyToken, "ExamRevisionReviewRecommended", actorId, ct);

        if (revision.LifecycleState != ExamLifecycleState.InReview)
        {
            throw new InvalidOperationException($"Cannot recommend approval for revision in '{revision.LifecycleState}' state. Revision must be InReview.");
        }

        var now = DateTime.UtcNow;
        revision.ReviewedBy = actorId;
        revision.ReviewedAt = now;
        revision.ConcurrencyToken++;
        revision.UpdatedAt = now;

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorId,
            Action = "ExamRevisionReviewRecommended",
            EntityType = "Exam",
            EntityId = revision.Id,
            Description = JsonSerializer.Serialize(new
            {
                examinationId = revision.ExaminationId,
                examinationCode = revision.Examination?.Code,
                revisionNumber = revision.RevisionNumber,
                currentState = ExamLifecycleState.InReview.ToString(),
                notes = notes ?? string.Empty
            }),
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);
        return MapToRevisionDto(revision, revision.Examination?.Code, revision.ExamQuestions.Count);
    }

    public async Task<ExamRevisionDto> ReturnForChangesAsync(string revisionId, long concurrencyToken, string reason, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var (actorId, role) = ResolveActor(user);
        EnforceRole(role, new[] { RoleHierarchy.RoleReviewer, RoleHierarchy.RoleAdmin, RoleHierarchy.RoleSuperAdmin }, "ReturnForChanges");

        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new ArgumentException("A mandatory reason must be provided when returning a revision for changes.", nameof(reason));
        }

        var revision = await _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.ExamQuestions)
            .FirstOrDefaultAsync(e => e.Id == revisionId, ct);

        if (revision == null)
            throw new KeyNotFoundException($"Exam revision '{revisionId}' not found.");

        await EnforceConcurrencyAsync(revision, concurrencyToken, "ExamRevisionReturnedForChanges", actorId, ct);

        if (revision.LifecycleState != ExamLifecycleState.InReview)
        {
            throw new InvalidOperationException($"Cannot return revision in '{revision.LifecycleState}' state. Only InReview revisions can be returned for changes.");
        }

        var now = DateTime.UtcNow;
        revision.LifecycleState = ExamLifecycleState.Draft;
        revision.ConcurrencyToken++;
        revision.UpdatedAt = now;

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorId,
            Action = "ExamRevisionReturnedForChanges",
            EntityType = "Exam",
            EntityId = revision.Id,
            Description = JsonSerializer.Serialize(new
            {
                examinationId = revision.ExaminationId,
                examinationCode = revision.Examination?.Code,
                revisionNumber = revision.RevisionNumber,
                previousState = ExamLifecycleState.InReview.ToString(),
                newState = ExamLifecycleState.Draft.ToString(),
                reason = reason.Trim()
            }),
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);
        return MapToRevisionDto(revision, revision.Examination?.Code, revision.ExamQuestions.Count);
    }

    public async Task<ExamRevisionDto> ApproveAsync(string revisionId, long concurrencyToken, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var (actorId, role) = ResolveActor(user);
        // Only Admin or Superadmin can approve
        EnforceRole(role, new[] { RoleHierarchy.RoleAdmin, RoleHierarchy.RoleSuperAdmin }, "Approve");

        var revision = await _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.ExamQuestions)
            .FirstOrDefaultAsync(e => e.Id == revisionId, ct);

        if (revision == null)
            throw new KeyNotFoundException($"Exam revision '{revisionId}' not found.");

        await EnforceConcurrencyAsync(revision, concurrencyToken, "ExamRevisionApproved", actorId, ct);

        if (revision.LifecycleState != ExamLifecycleState.InReview)
        {
            throw new InvalidOperationException($"Cannot approve revision in '{revision.LifecycleState}' state. Revision must be InReview.");
        }

        // Decision 4 / Mandatory Invariant: Separation of duties (creator cannot approve)
        if (string.Equals(revision.CreatedBy, actorId, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Separation of duties violation: The revision creator cannot approve this revision.");
        }

        var now = DateTime.UtcNow;
        revision.LifecycleState = ExamLifecycleState.Approved;
        revision.ApprovedBy = actorId;
        revision.ApprovedAt = now;
        revision.ConcurrencyToken++;
        revision.UpdatedAt = now;

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorId,
            Action = "ExamRevisionApproved",
            EntityType = "Exam",
            EntityId = revision.Id,
            Description = JsonSerializer.Serialize(new
            {
                examinationId = revision.ExaminationId,
                examinationCode = revision.Examination?.Code,
                revisionNumber = revision.RevisionNumber,
                previousState = ExamLifecycleState.InReview.ToString(),
                newState = ExamLifecycleState.Approved.ToString(),
                createdBy = revision.CreatedBy,
                approvedBy = actorId
            }),
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);
        return MapToRevisionDto(revision, revision.Examination?.Code, revision.ExamQuestions.Count);
    }

    public async Task<ExamRevisionDto> PublishAsync(string revisionId, long concurrencyToken, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var (actorId, role) = ResolveActor(user);
        EnforceRole(role, new[] { RoleHierarchy.RoleExamManager, RoleHierarchy.RoleAdmin, RoleHierarchy.RoleSuperAdmin }, "Publish");

        var revision = await _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.ExamQuestions)
            .FirstOrDefaultAsync(e => e.Id == revisionId, ct);

        if (revision == null)
            throw new KeyNotFoundException($"Exam revision '{revisionId}' not found.");

        await EnforceConcurrencyAsync(revision, concurrencyToken, "ExamRevisionPublished", actorId, ct);

        if (revision.LifecycleState != ExamLifecycleState.Approved)
        {
            throw new InvalidOperationException($"Cannot publish revision in '{revision.LifecycleState}' state. Only Approved revisions can be published.");
        }

        var now = DateTime.UtcNow;

        // Invariant: At most one revision may be Published per Examination family.
        // Find existing published revision and atomically archive it.
        var existingPublished = await _context.Exams
            .FirstOrDefaultAsync(e => e.ExaminationId == revision.ExaminationId
                                   && e.LifecycleState == ExamLifecycleState.Published, ct);

        if (existingPublished != null && existingPublished.Id != revision.Id)
        {
            var activeAttempts = await _context.ExamAttempts
                .CountAsync(a => a.ExamId == existingPublished.Id && a.Status == AttemptStatus.InProgress, ct);

            existingPublished.LifecycleState = ExamLifecycleState.Archived;
            existingPublished.IsPublished = false;
            existingPublished.ArchivedAt = now;
            existingPublished.ArchivedBy = actorId;
            existingPublished.ConcurrencyToken++;
            existingPublished.UpdatedAt = now;

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid().ToString(),
                ActorId = actorId,
                Action = "ExamRevisionArchived",
                EntityType = "Exam",
                EntityId = existingPublished.Id,
                Description = JsonSerializer.Serialize(new
                {
                    reason = "Superseded by new revision publication",
                    activeAttemptsCount = activeAttempts,
                    supersededByRevisionId = revision.Id,
                    examinationId = revision.ExaminationId
                }),
                Outcome = "Success",
                Timestamp = now
            });
        }

        revision.LifecycleState = ExamLifecycleState.Published;
        revision.IsPublished = true;
        revision.PublishedBy = actorId;
        revision.PublishedAt = now;
        revision.ConcurrencyToken++;
        revision.UpdatedAt = now;

        if (revision.Examination != null)
        {
            revision.Examination.CurrentRevisionId = revision.Id;
        }
        else if (!string.IsNullOrWhiteSpace(revision.ExaminationId))
        {
            var examParent = await _context.Examinations.FindAsync(new object[] { revision.ExaminationId }, ct);
            if (examParent != null)
            {
                examParent.CurrentRevisionId = revision.Id;
            }
        }

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorId,
            Action = "ExamRevisionPublished",
            EntityType = "Exam",
            EntityId = revision.Id,
            Description = JsonSerializer.Serialize(new
            {
                examinationId = revision.ExaminationId,
                examinationCode = revision.Examination?.Code,
                revisionNumber = revision.RevisionNumber,
                previousState = ExamLifecycleState.Approved.ToString(),
                newState = ExamLifecycleState.Published.ToString(),
                publishedBy = actorId
            }),
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);
        return MapToRevisionDto(revision, revision.Examination?.Code, revision.ExamQuestions.Count);
    }

    public async Task<ExamRevisionDto> ArchiveAsync(string revisionId, long concurrencyToken, string? reason, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var (actorId, role) = ResolveActor(user);
        EnforceRole(role, new[] { RoleHierarchy.RoleExamManager, RoleHierarchy.RoleAdmin, RoleHierarchy.RoleSuperAdmin }, "Archive");

        var revision = await _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.ExamQuestions)
            .FirstOrDefaultAsync(e => e.Id == revisionId, ct);

        if (revision == null)
            throw new KeyNotFoundException($"Exam revision '{revisionId}' not found.");

        await EnforceConcurrencyAsync(revision, concurrencyToken, "ExamRevisionArchived", actorId, ct);

        if (revision.LifecycleState != ExamLifecycleState.Published)
        {
            throw new InvalidOperationException($"Cannot archive revision in '{revision.LifecycleState}' state. Only Published revisions can be archived.");
        }

        var now = DateTime.UtcNow;
        var activeAttempts = await _context.ExamAttempts
            .CountAsync(a => a.ExamId == revision.Id && a.Status == AttemptStatus.InProgress, ct);

        revision.LifecycleState = ExamLifecycleState.Archived;
        revision.IsPublished = false;
        revision.ArchivedBy = actorId;
        revision.ArchivedAt = now;
        revision.ConcurrencyToken++;
        revision.UpdatedAt = now;

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorId,
            Action = "ExamRevisionArchived",
            EntityType = "Exam",
            EntityId = revision.Id,
            Description = JsonSerializer.Serialize(new
            {
                examinationId = revision.ExaminationId,
                examinationCode = revision.Examination?.Code,
                revisionNumber = revision.RevisionNumber,
                previousState = ExamLifecycleState.Published.ToString(),
                newState = ExamLifecycleState.Archived.ToString(),
                activeAttemptsCount = activeAttempts,
                reason = reason ?? "Manual archival by administrator"
            }),
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);
        return MapToRevisionDto(revision, revision.Examination?.Code, revision.ExamQuestions.Count);
    }

    public async Task<ExamRevisionDto> RestoreAsync(string revisionId, long concurrencyToken, string reason, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var (actorId, role) = ResolveActor(user);
        // Decision 11 & Decision 13: Superadmin emergency override only
        EnforceRole(role, new[] { RoleHierarchy.RoleSuperAdmin }, "Restore");

        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new ArgumentException("A mandatory reason must be provided for restoration override.", nameof(reason));
        }

        var revision = await _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.ExamQuestions)
            .FirstOrDefaultAsync(e => e.Id == revisionId, ct);

        if (revision == null)
            throw new KeyNotFoundException($"Exam revision '{revisionId}' not found.");

        await EnforceConcurrencyAsync(revision, concurrencyToken, "ExamRevisionRestored", actorId, ct);

        if (revision.LifecycleState != ExamLifecycleState.Archived)
        {
            throw new InvalidOperationException($"Cannot restore revision in '{revision.LifecycleState}' state. Only Archived revisions can be restored.");
        }

        var now = DateTime.UtcNow;

        // Invariant: 30-calendar-day restoration window
        if (!revision.ArchivedAt.HasValue || now > revision.ArchivedAt.Value.AddDays(30))
        {
            throw new InvalidOperationException("Restoration window expired: revisions can only be restored within 30 calendar days of archival.");
        }

        // Invariant: No other revision is currently Published under this examination
        var hasPublished = await _context.Exams
            .AnyAsync(e => e.ExaminationId == revision.ExaminationId
                        && e.LifecycleState == ExamLifecycleState.Published, ct);

        if (hasPublished)
        {
            throw new InvalidOperationException("Cannot restore revision: another revision is currently published for this examination. Archive the current published revision first.");
        }

        revision.LifecycleState = ExamLifecycleState.Published;
        revision.IsPublished = true;
        revision.PublishedBy = actorId;
        revision.PublishedAt = now;
        revision.ConcurrencyToken++;
        revision.UpdatedAt = now;

        if (revision.Examination != null)
        {
            revision.Examination.CurrentRevisionId = revision.Id;
        }

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorId,
            Action = "ExamRevisionRestored",
            EntityType = "Exam",
            EntityId = revision.Id,
            Description = JsonSerializer.Serialize(new
            {
                examinationId = revision.ExaminationId,
                examinationCode = revision.Examination?.Code,
                revisionNumber = revision.RevisionNumber,
                previousState = ExamLifecycleState.Archived.ToString(),
                newState = ExamLifecycleState.Published.ToString(),
                reason = reason.Trim(),
                archivedAt = revision.ArchivedAt,
                restoredAt = now
            }),
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);
        return MapToRevisionDto(revision, revision.Examination?.Code, revision.ExamQuestions.Count);
    }

    public async Task<ExamRevisionDto> RetireAsync(string revisionId, long concurrencyToken, string? reason, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var (actorId, role) = ResolveActor(user);
        EnforceRole(role, new[] { RoleHierarchy.RoleExamManager, RoleHierarchy.RoleAdmin, RoleHierarchy.RoleSuperAdmin }, "Retire");

        var revision = await _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.ExamQuestions)
            .FirstOrDefaultAsync(e => e.Id == revisionId, ct);

        if (revision == null)
            throw new KeyNotFoundException($"Exam revision '{revisionId}' not found.");

        await EnforceConcurrencyAsync(revision, concurrencyToken, "ExamRevisionRetired", actorId, ct);

        // Terminal state: from Archived
        if (revision.LifecycleState != ExamLifecycleState.Archived)
        {
            throw new InvalidOperationException($"Cannot retire revision in '{revision.LifecycleState}' state. Only Archived revisions can be retired through standard workflow. (Published revisions require Superadmin emergency retirement override).");
        }

        var now = DateTime.UtcNow;
        revision.LifecycleState = ExamLifecycleState.Retired;
        revision.IsPublished = false;
        revision.RetiredBy = actorId;
        revision.RetiredAt = now;
        revision.ConcurrencyToken++;
        revision.UpdatedAt = now;

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorId,
            Action = "ExamRevisionRetired",
            EntityType = "Exam",
            EntityId = revision.Id,
            Description = JsonSerializer.Serialize(new
            {
                examinationId = revision.ExaminationId,
                examinationCode = revision.Examination?.Code,
                revisionNumber = revision.RevisionNumber,
                previousState = ExamLifecycleState.Archived.ToString(),
                newState = ExamLifecycleState.Retired.ToString(),
                reason = reason ?? "Retirement following archival"
            }),
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);
        return MapToRevisionDto(revision, revision.Examination?.Code, revision.ExamQuestions.Count);
    }

    public async Task<ExamRevisionDto> EmergencyRetireAsync(string revisionId, long concurrencyToken, string reason, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var (actorId, role) = ResolveActor(user);
        EnforceRole(role, new[] { RoleHierarchy.RoleSuperAdmin }, "EmergencyRetire");

        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new ArgumentException("A mandatory reason must be provided for emergency retirement override.", nameof(reason));
        }

        var revision = await _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.ExamQuestions)
            .FirstOrDefaultAsync(e => e.Id == revisionId, ct);

        if (revision == null)
            throw new KeyNotFoundException($"Exam revision '{revisionId}' not found.");

        await EnforceConcurrencyAsync(revision, concurrencyToken, "ExamLifecycleOverride", actorId, ct);

        if (revision.LifecycleState == ExamLifecycleState.Retired)
        {
            throw new InvalidOperationException("Revision is already in terminal Retired state.");
        }

        var now = DateTime.UtcNow;
        var previousState = revision.LifecycleState;
        var activeAttempts = 0;

        if (previousState == ExamLifecycleState.Published)
        {
            activeAttempts = await _context.ExamAttempts
                .CountAsync(a => a.ExamId == revision.Id && a.Status == AttemptStatus.InProgress, ct);
        }

        revision.LifecycleState = ExamLifecycleState.Retired;
        revision.IsPublished = false;
        revision.RetiredBy = actorId;
        revision.RetiredAt = now;
        revision.ConcurrencyToken++;
        revision.UpdatedAt = now;

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorId,
            Action = "ExamLifecycleOverride",
            EntityType = "Exam",
            EntityId = revision.Id,
            Description = JsonSerializer.Serialize(new
            {
                overrideAction = "EmergencyRetire",
                examinationId = revision.ExaminationId,
                examinationCode = revision.Examination?.Code,
                revisionNumber = revision.RevisionNumber,
                previousState = previousState.ToString(),
                newState = ExamLifecycleState.Retired.ToString(),
                activeAttemptsCount = activeAttempts,
                reason = reason.Trim()
            }),
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);
        return MapToRevisionDto(revision, revision.Examination?.Code, revision.ExamQuestions.Count);
    }

    public async Task<ExaminationDto?> GetExaminationAsync(string id, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var role = RoleHierarchy.GetEffectiveRole(user);
        var isRestrictedViewer = string.Equals(role, RoleHierarchy.RoleInstructor, StringComparison.OrdinalIgnoreCase)
                              || string.Equals(role, RoleHierarchy.RoleCandidate, StringComparison.OrdinalIgnoreCase);

        var query = _context.Examinations
            .Include(e => e.Revisions.OrderByDescending(r => r.RevisionNumber))
            .ThenInclude(r => r.ExamQuestions)
            .AsNoTracking();

        var examFamily = await query.FirstOrDefaultAsync(e => e.Id == id, ct);
        if (examFamily == null) return null;

        if (isRestrictedViewer)
        {
            // Instructors and Candidates only view Published revisions
            var publishedRevisions = examFamily.Revisions
                .Where(r => r.LifecycleState == ExamLifecycleState.Published)
                .ToList();

            if (publishedRevisions.Count == 0)
            {
                return null;
            }

            return MapToExaminationDto(examFamily, publishedRevisions);
        }

        return MapToExaminationDto(examFamily, examFamily.Revisions.ToList());
    }

    public async Task<List<ExaminationDto>> GetExaminationsAsync(string? pathway, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var role = RoleHierarchy.GetEffectiveRole(user);
        var isRestrictedViewer = string.Equals(role, RoleHierarchy.RoleInstructor, StringComparison.OrdinalIgnoreCase)
                              || string.Equals(role, RoleHierarchy.RoleCandidate, StringComparison.OrdinalIgnoreCase);

        var query = _context.Examinations
            .Include(e => e.Revisions.OrderByDescending(r => r.RevisionNumber))
            .ThenInclude(r => r.ExamQuestions)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(pathway))
        {
            var normalizedPathway = pathway.Trim().ToLowerInvariant();
            query = query.Where(e => e.Pathway == normalizedPathway);
        }

        var examinations = await query.OrderBy(e => e.Pathway).ThenBy(e => e.Code).ToListAsync(ct);

        var result = new List<ExaminationDto>();
        foreach (var examFamily in examinations)
        {
            if (isRestrictedViewer)
            {
                var publishedRevisions = examFamily.Revisions
                    .Where(r => r.LifecycleState == ExamLifecycleState.Published)
                    .ToList();

                if (publishedRevisions.Count > 0)
                {
                    result.Add(MapToExaminationDto(examFamily, publishedRevisions));
                }
            }
            else
            {
                result.Add(MapToExaminationDto(examFamily, examFamily.Revisions.ToList()));
            }
        }

        return result;
    }

    public async Task<ExaminationLibraryResponseDto> QueryExaminationsAsync(ExaminationQueryParameters parameters, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var role = RoleHierarchy.GetEffectiveRole(user);
        var isRestrictedViewer = string.Equals(role, RoleHierarchy.RoleInstructor, StringComparison.OrdinalIgnoreCase)
                              || string.Equals(role, RoleHierarchy.RoleCandidate, StringComparison.OrdinalIgnoreCase);

        var query = _context.Examinations
            .AsNoTracking()
            .AsQueryable();

        // 1. Pathway filter
        if (!string.IsNullOrWhiteSpace(parameters.Pathway) && !string.Equals(parameters.Pathway.Trim(), "all", StringComparison.OrdinalIgnoreCase))
        {
            var normalizedPathway = parameters.Pathway.Trim().ToLowerInvariant();
            query = query.Where(e => e.Pathway == normalizedPathway);
        }

        // 2. Restricted viewers only see families with published revisions
        if (isRestrictedViewer)
        {
            query = query.Where(e => e.Revisions.Any(r => r.LifecycleState == ExamLifecycleState.Published));
        }

        // 3. Revision Lifecycle Status filter
        if (!string.IsNullOrWhiteSpace(parameters.RevisionStatus) && !string.Equals(parameters.RevisionStatus.Trim(), "all", StringComparison.OrdinalIgnoreCase))
        {
            if (Enum.TryParse<ExamLifecycleState>(parameters.RevisionStatus.Trim(), true, out var targetLifecycle))
            {
                query = query.Where(e => e.Revisions.Any(r => r.LifecycleState == targetLifecycle));
            }
        }

        // 4. Text Search
        if (!string.IsNullOrWhiteSpace(parameters.Search))
        {
            var term = parameters.Search.Trim().ToLower();
            query = query.Where(e =>
                e.Title.ToLower().Contains(term) ||
                e.Code.ToLower().Contains(term) ||
                e.Pathway.ToLower().Contains(term) ||
                e.Revisions.Any(r => r.Title.ToLower().Contains(term) || r.Description.ToLower().Contains(term)));
        }

        // 5. Total count before pagination
        var totalItems = await query.CountAsync(ct);

        // 6. Pagination Bounds
        var page = Math.Max(1, parameters.Page);
        var pageSize = Math.Clamp(parameters.PageSize, 1, 100);
        var totalPages = totalItems == 0 ? 0 : (int)Math.Ceiling((double)totalItems / pageSize);

        // 7. Deterministic Sorting with secondary tie-breaker
        var sortBy = (parameters.SortBy ?? "code").Trim().ToLowerInvariant();
        var isDesc = string.Equals(parameters.SortDirection?.Trim(), "desc", StringComparison.OrdinalIgnoreCase);

        IOrderedQueryable<Examination> orderedQuery = sortBy switch
        {
            "title" => isDesc
                ? query.OrderByDescending(e => e.Title).ThenBy(e => e.Code).ThenBy(e => e.Id)
                : query.OrderBy(e => e.Title).ThenBy(e => e.Code).ThenBy(e => e.Id),
            "pathway" => isDesc
                ? query.OrderByDescending(e => e.Pathway).ThenBy(e => e.Code).ThenBy(e => e.Id)
                : query.OrderBy(e => e.Pathway).ThenBy(e => e.Code).ThenBy(e => e.Id),
            "createdat" => isDesc
                ? query.OrderByDescending(e => e.CreatedAt).ThenBy(e => e.Id)
                : query.OrderBy(e => e.CreatedAt).ThenBy(e => e.Id),
            "revisions" => isDesc
                ? query.OrderByDescending(e => e.Revisions.Count).ThenBy(e => e.Code).ThenBy(e => e.Id)
                : query.OrderBy(e => e.Revisions.Count).ThenBy(e => e.Code).ThenBy(e => e.Id),
            "latestrevisionnumber" => isDesc
                ? query.OrderByDescending(e => e.Revisions.Max(r => (int?)r.RevisionNumber) ?? 0).ThenBy(e => e.Id)
                : query.OrderBy(e => e.Revisions.Max(r => (int?)r.RevisionNumber) ?? 0).ThenBy(e => e.Id),
            "updatedat" => isDesc
                ? query.OrderByDescending(e => e.Revisions.Max(r => (DateTime?)r.UpdatedAt) ?? e.CreatedAt).ThenBy(e => e.Id)
                : query.OrderBy(e => e.Revisions.Max(r => (DateTime?)r.UpdatedAt) ?? e.CreatedAt).ThenBy(e => e.Id),
            _ => isDesc // default is "code"
                ? query.OrderByDescending(e => e.Code).ThenBy(e => e.Id)
                : query.OrderBy(e => e.Code).ThenBy(e => e.Id)
        };

        // 8. Paged Slice Execution
        var pagedExaminations = await orderedQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(e => e.Revisions.OrderByDescending(r => r.RevisionNumber))
            .ToListAsync(ct);

        var revisionIds = pagedExaminations
            .SelectMany(e => e.Revisions)
            .Select(r => r.Id)
            .Distinct()
            .ToList();

        var questionCounts = revisionIds.Count == 0
            ? new Dictionary<string, int>()
            : await _context.ExamQuestions
                .AsNoTracking()
                .Where(eq => revisionIds.Contains(eq.ExamId))
                .GroupBy(eq => eq.ExamId)
                .Select(g => new
                {
                    ExamId = g.Key,
                    Count = g.Count()
                })
                .ToDictionaryAsync(
                    x => x.ExamId,
                    x => x.Count,
                    ct);

        var items = new List<ExaminationLibraryItemDto>();
        var legacyList = new List<ExaminationDto>();

        foreach (var examFamily in pagedExaminations)
        {
            var visibleRevisions = isRestrictedViewer
                ? examFamily.Revisions.Where(r => r.LifecycleState == ExamLifecycleState.Published).ToList()
                : examFamily.Revisions.ToList();

            var summaryDtos = visibleRevisions.Select(r =>
            {
                questionCounts.TryGetValue(r.Id, out var questionCount);
                return MapToRevisionSummaryDto(r, examFamily.Code, questionCount);
            }).ToList();
            var publishedSummary = summaryDtos.FirstOrDefault(r => r.LifecycleState == ExamLifecycleState.Published.ToString());
            var latestSummary = summaryDtos.OrderByDescending(r => r.RevisionNumber).FirstOrDefault();
            var currentSummary = summaryDtos.FirstOrDefault(r => r.Id == examFamily.CurrentRevisionId)
                                 ?? publishedSummary
                                 ?? latestSummary;

            items.Add(new ExaminationLibraryItemDto
            {
                Id = examFamily.Id,
                Code = examFamily.Code,
                Title = examFamily.Title,
                Pathway = examFamily.Pathway,
                CreatedAt = examFamily.CreatedAt,
                CreatedBy = examFamily.CreatedBy,
                CurrentRevisionId = examFamily.CurrentRevisionId,
                SuccessorExaminationId = examFamily.SuccessorExaminationId,
                RevisionCount = summaryDtos.Count,
                PublishedRevision = publishedSummary,
                LatestRevision = latestSummary,
                CurrentRevision = currentSummary
            });

            legacyList.Add(MapToExaminationDto(examFamily, visibleRevisions, questionCounts));
        }

        return new ExaminationLibraryResponseDto
        {
            Success = true,
            Items = items,
            Pagination = new PaginationMetadata
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = totalPages
            },
            Examinations = legacyList
        };
    }

    public async Task<FamilyRevisionsResponseDto> GetFamilyRevisionsAsync(string examinationId, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var role = RoleHierarchy.GetEffectiveRole(user);
        var isRestrictedViewer = string.Equals(role, RoleHierarchy.RoleInstructor, StringComparison.OrdinalIgnoreCase)
                              || string.Equals(role, RoleHierarchy.RoleCandidate, StringComparison.OrdinalIgnoreCase);

        var family = await _context.Examinations
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == examinationId, ct);

        if (family == null)
        {
            throw new KeyNotFoundException($"Examination family '{examinationId}' not found.");
        }

        var revisionsQuery = _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.ExamQuestions)
            .AsNoTracking()
            .Where(e => e.ExaminationId == examinationId);

        if (isRestrictedViewer)
        {
            revisionsQuery = revisionsQuery.Where(e => e.LifecycleState == ExamLifecycleState.Published);
        }

        var revisions = await revisionsQuery
            .OrderByDescending(r => r.RevisionNumber)
            .ToListAsync(ct);

        var revisionDtos = revisions.Select(r => MapToRevisionDto(r, family.Code, r.ExamQuestions.Count)).ToList();

        return new FamilyRevisionsResponseDto
        {
            Success = true,
            ExaminationId = family.Id,
            ExaminationCode = family.Code,
            ExaminationTitle = family.Title,
            Pathway = family.Pathway,
            Revisions = revisionDtos
        };
    }

    public async Task<ExamRevisionDto?> GetRevisionAsync(string revisionId, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var role = RoleHierarchy.GetEffectiveRole(user);
        var isRestrictedViewer = string.Equals(role, RoleHierarchy.RoleInstructor, StringComparison.OrdinalIgnoreCase)
                              || string.Equals(role, RoleHierarchy.RoleCandidate, StringComparison.OrdinalIgnoreCase);

        var revision = await _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.ExamQuestions)
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == revisionId, ct);

        if (revision == null) return null;

        if (isRestrictedViewer && revision.LifecycleState != ExamLifecycleState.Published)
        {
            return null; // Restricted viewers cannot access non-published revisions
        }

        return MapToRevisionDto(revision, revision.Examination?.Code, revision.ExamQuestions.Count);
    }

    // ── P3.2 Examination Authoring & Membership Implementation ─────────────────

    public async Task<ExamRevisionDto> UpdateRevisionMetadataAsync(string revisionId, UpdateRevisionMetadataRequest request, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var (actorId, role) = ResolveActor(user);
        EnforceRole(role, new[] { RoleHierarchy.RoleExamManager, RoleHierarchy.RoleAdmin, RoleHierarchy.RoleSuperAdmin }, "UpdateRevisionMetadata");

        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ArgumentException("Title cannot be empty.", nameof(request.Title));

        if (request.TimeLimitMinutes < 0 || request.TimeLimitMinutes > 720)
            throw new ArgumentException("Time limit must be between 0 (untimed) and 720 minutes.", nameof(request.TimeLimitMinutes));

        if (request.PassingScorePercent < 0.0m || request.PassingScorePercent > 100.0m)
            throw new ArgumentException("Passing score percent must be between 0.0 and 100.0.", nameof(request.PassingScorePercent));

        var revision = await _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.ExamQuestions)
            .FirstOrDefaultAsync(e => e.Id == revisionId, ct);

        if (revision == null)
            throw new KeyNotFoundException($"Exam revision '{revisionId}' not found.");

        await EnforceConcurrencyAsync(revision, request.ConcurrencyToken, "ExamRevisionMetadataUpdated", actorId, ct);

        if (revision.LifecycleState != ExamLifecycleState.Draft)
        {
            throw new InvalidOperationException($"Cannot edit metadata for revision in '{revision.LifecycleState}' state. Only Draft revisions can be edited.");
        }

        var now = DateTime.UtcNow;
        var oldValues = new
        {
            title = revision.Title,
            description = revision.Description,
            examType = revision.ExamType.ToString(),
            timeLimitMinutes = revision.TimeLimitMinutes,
            passingScorePercent = revision.PassingScorePercent
        };

        revision.Title = request.Title.Trim();
        revision.Description = request.Description?.Trim() ?? string.Empty;
        revision.ExamType = request.ExamType;
        revision.TimeLimitMinutes = request.TimeLimitMinutes;
        revision.PassingScorePercent = request.PassingScorePercent;
        revision.ConcurrencyToken++;
        revision.UpdatedAt = now;

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorId,
            Action = "ExamRevisionMetadataUpdated",
            EntityType = "Exam",
            EntityId = revision.Id,
            Description = JsonSerializer.Serialize(new
            {
                examinationId = revision.ExaminationId,
                examinationCode = revision.Examination?.Code,
                revisionNumber = revision.RevisionNumber,
                oldValues,
                newValues = new
                {
                    title = revision.Title,
                    description = revision.Description,
                    examType = revision.ExamType.ToString(),
                    timeLimitMinutes = revision.TimeLimitMinutes,
                    passingScorePercent = revision.PassingScorePercent
                }
            }),
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);
        return MapToRevisionDto(revision, revision.Examination?.Code, revision.ExamQuestions.Count);
    }

    public async Task<RevisionValidationResultDto> ValidateRevisionAsync(string revisionId, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var revision = await _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.ExamQuestions)
                .ThenInclude(eq => eq.Question)
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == revisionId, ct);

        if (revision == null)
            throw new KeyNotFoundException($"Exam revision '{revisionId}' not found.");

        var issues = new List<string>();

        if (string.IsNullOrWhiteSpace(revision.Title))
            issues.Add("Title cannot be empty.");

        if (revision.ExamQuestions.Count == 0)
            issues.Add("Revision must contain at least one question before submission for review.");

        if (revision.TimeLimitMinutes < 0 || revision.TimeLimitMinutes > 720)
            issues.Add("Time limit must be between 0 (untimed) and 720 minutes.");

        if (revision.PassingScorePercent < 0.0m || revision.PassingScorePercent > 100.0m)
            issues.Add("Passing score percent must be between 0.0 and 100.0.");

        foreach (var eq in revision.ExamQuestions)
        {
            if (eq.Question == null) continue;

            if (!string.Equals(eq.Question.Pathway, revision.Pathway, StringComparison.OrdinalIgnoreCase))
            {
                issues.Add($"Question '{eq.QuestionId}' pathway '{eq.Question.Pathway}' does not match revision pathway '{revision.Pathway}'.");
            }

            if (eq.Question.Status != QuestionStatus.Approved && eq.Question.Status != QuestionStatus.Published)
            {
                issues.Add($"Question '{eq.QuestionId}' is in '{eq.Question.Status}' status. Only Approved or Published questions are eligible.");
            }
        }

        return new RevisionValidationResultDto
        {
            RevisionId = revision.Id,
            IsValid = issues.Count == 0,
            QuestionCount = revision.ExamQuestions.Count,
            ConcurrencyToken = revision.ConcurrencyToken,
            LifecycleState = revision.LifecycleState.ToString(),
            Issues = issues
        };
    }

    public async Task<List<ExamQuestionMembershipDto>> GetRevisionQuestionsAsync(string revisionId, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var (_, role) = ResolveActor(user);
        var isRestricted = string.Equals(role, RoleHierarchy.RoleCandidate, StringComparison.OrdinalIgnoreCase) ||
                           string.Equals(role, RoleHierarchy.RoleInstructor, StringComparison.OrdinalIgnoreCase);

        var revision = await _context.Exams
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == revisionId, ct);

        if (revision == null)
            throw new KeyNotFoundException($"Exam revision '{revisionId}' not found.");

        if (isRestricted && revision.LifecycleState != ExamLifecycleState.Published)
        {
            throw new UnauthorizedAccessException("Forbidden: non-published revision questions cannot be accessed.");
        }

        var questions = await _context.ExamQuestions
            .Where(eq => eq.ExamId == revisionId)
            .Include(eq => eq.Question)
                .ThenInclude(q => q.Options)
            .OrderBy(eq => eq.DisplayOrder)
            .AsNoTracking()
            .ToListAsync(ct);

        return questions.Select(eq => new ExamQuestionMembershipDto
        {
            Id = eq.Id,
            ExamId = eq.ExamId,
            QuestionId = eq.QuestionId,
            DisplayOrder = eq.DisplayOrder,
            Stem = eq.Question?.Stem ?? string.Empty,
            QuestionTypeKey = eq.Question?.QuestionTypeKey ?? "single-choice",
            Pathway = eq.Question?.Pathway ?? string.Empty,
            Difficulty = eq.Question?.Difficulty.ToString() ?? "Moderate",
            Status = eq.Question?.Status.ToString() ?? "Draft",
            OptionCount = eq.Question?.Options.Count ?? 0
        }).ToList();
    }

    public async Task<ExamQuestionMembershipDto> AddQuestionToRevisionAsync(string revisionId, AddExamQuestionRequest request, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var (actorId, role) = ResolveActor(user);
        EnforceRole(role, new[] { RoleHierarchy.RoleExamManager, RoleHierarchy.RoleAdmin, RoleHierarchy.RoleSuperAdmin }, "AddQuestionToRevision");

        var revision = await _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.ExamQuestions)
            .FirstOrDefaultAsync(e => e.Id == revisionId, ct);

        if (revision == null)
            throw new KeyNotFoundException($"Exam revision '{revisionId}' not found.");

        await EnforceConcurrencyAsync(revision, request.ConcurrencyToken, "ExamQuestionAdded", actorId, ct);

        if (revision.LifecycleState != ExamLifecycleState.Draft)
        {
            throw new InvalidOperationException($"Cannot add questions to revision in '{revision.LifecycleState}' state. Only Draft revisions can be modified.");
        }

        var question = await _context.Questions
            .Include(q => q.Options)
            .FirstOrDefaultAsync(q => q.Id == request.QuestionId, ct);

        if (question == null)
            throw new KeyNotFoundException($"Question '{request.QuestionId}' not found.");

        // Pathway compatibility
        if (!string.Equals(question.Pathway, revision.Pathway, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Pathway mismatch: Question '{question.Id}' has pathway '{question.Pathway}', but revision requires '{revision.Pathway}'.");
        }

        // Question eligibility (Approved or Published only)
        if (question.Status != QuestionStatus.Approved && question.Status != QuestionStatus.Published)
        {
            throw new InvalidOperationException($"Question '{question.Id}' is in '{question.Status}' status and cannot be added. Only Approved or Published questions can be added to an examination revision.");
        }

        // Duplicate membership guard
        if (revision.ExamQuestions.Any(eq => eq.QuestionId == request.QuestionId))
        {
            throw new InvalidOperationException($"Question '{request.QuestionId}' is already associated with this revision.");
        }

        var nextOrder = request.DisplayOrder.HasValue && request.DisplayOrder.Value > 0
            ? request.DisplayOrder.Value
            : (revision.ExamQuestions.Any() ? revision.ExamQuestions.Max(eq => eq.DisplayOrder) + 1 : 1);

        var examQuestion = new ExamQuestion
        {
            Id = Guid.NewGuid().ToString(),
            ExamId = revision.Id,
            QuestionId = question.Id,
            DisplayOrder = nextOrder
        };

        _context.ExamQuestions.Add(examQuestion);

        var now = DateTime.UtcNow;
        revision.ConcurrencyToken++;
        revision.UpdatedAt = now;

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorId,
            Action = "ExamQuestionAdded",
            EntityType = "Exam",
            EntityId = revision.Id,
            Description = JsonSerializer.Serialize(new
            {
                examinationId = revision.ExaminationId,
                examinationCode = revision.Examination?.Code,
                revisionNumber = revision.RevisionNumber,
                questionId = question.Id,
                displayOrder = nextOrder
            }),
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);

        return new ExamQuestionMembershipDto
        {
            Id = examQuestion.Id,
            ExamId = examQuestion.ExamId,
            QuestionId = question.Id,
            DisplayOrder = examQuestion.DisplayOrder,
            Stem = question.Stem,
            QuestionTypeKey = question.QuestionTypeKey,
            Pathway = question.Pathway,
            Difficulty = question.Difficulty.ToString(),
            Status = question.Status.ToString(),
            OptionCount = question.Options.Count
        };
    }

    public async Task<bool> RemoveQuestionFromRevisionAsync(string revisionId, string questionId, long concurrencyToken, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var (actorId, role) = ResolveActor(user);
        EnforceRole(role, new[] { RoleHierarchy.RoleExamManager, RoleHierarchy.RoleAdmin, RoleHierarchy.RoleSuperAdmin }, "RemoveQuestionFromRevision");

        var revision = await _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.ExamQuestions)
            .FirstOrDefaultAsync(e => e.Id == revisionId, ct);

        if (revision == null)
            throw new KeyNotFoundException($"Exam revision '{revisionId}' not found.");

        await EnforceConcurrencyAsync(revision, concurrencyToken, "ExamQuestionRemoved", actorId, ct);

        if (revision.LifecycleState != ExamLifecycleState.Draft)
        {
            throw new InvalidOperationException($"Cannot remove questions from revision in '{revision.LifecycleState}' state. Only Draft revisions can be modified.");
        }

        var membership = revision.ExamQuestions.FirstOrDefault(eq => eq.QuestionId == questionId);
        if (membership == null)
        {
            throw new KeyNotFoundException($"Question '{questionId}' is not associated with revision '{revisionId}'.");
        }

        _context.ExamQuestions.Remove(membership);

        // Normalize display orders for remaining items
        var remaining = revision.ExamQuestions.Where(eq => eq.QuestionId != questionId).OrderBy(eq => eq.DisplayOrder).ToList();
        for (var i = 0; i < remaining.Count; i++)
        {
            remaining[i].DisplayOrder = i + 1;
        }

        var now = DateTime.UtcNow;
        revision.ConcurrencyToken++;
        revision.UpdatedAt = now;

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorId,
            Action = "ExamQuestionRemoved",
            EntityType = "Exam",
            EntityId = revision.Id,
            Description = JsonSerializer.Serialize(new
            {
                examinationId = revision.ExaminationId,
                examinationCode = revision.Examination?.Code,
                revisionNumber = revision.RevisionNumber,
                questionId,
                removedDisplayOrder = membership.DisplayOrder
            }),
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<List<ExamQuestionMembershipDto>> ReorderQuestionsAsync(string revisionId, ReorderExamQuestionsRequest request, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var (actorId, role) = ResolveActor(user);
        EnforceRole(role, new[] { RoleHierarchy.RoleExamManager, RoleHierarchy.RoleAdmin, RoleHierarchy.RoleSuperAdmin }, "ReorderQuestions");

        var revision = await _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.ExamQuestions)
                .ThenInclude(eq => eq.Question)
                    .ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(e => e.Id == revisionId, ct);

        if (revision == null)
            throw new KeyNotFoundException($"Exam revision '{revisionId}' not found.");

        await EnforceConcurrencyAsync(revision, request.ConcurrencyToken, "ExamQuestionsReordered", actorId, ct);

        if (revision.LifecycleState != ExamLifecycleState.Draft)
        {
            throw new InvalidOperationException($"Cannot reorder questions for revision in '{revision.LifecycleState}' state. Only Draft revisions can be modified.");
        }

        // Validate complete, non-duplicate representation
        if (request.Items.Count != revision.ExamQuestions.Count)
        {
            throw new ArgumentException($"Reorder request must represent all {revision.ExamQuestions.Count} questions in the revision exactly once (received {request.Items.Count}).");
        }

        var requestedIds = request.Items.Select(i => i.QuestionId).ToHashSet();
        if (requestedIds.Count != request.Items.Count)
        {
            throw new ArgumentException("Duplicate question IDs found in reorder request.");
        }

        var currentIds = revision.ExamQuestions.Select(eq => eq.QuestionId).ToHashSet();
        if (!requestedIds.SetEquals(currentIds))
        {
            throw new ArgumentException("The submitted question IDs do not match the current membership of this revision.");
        }

        // Update display orders
        var orderMap = request.Items.ToDictionary(i => i.QuestionId, i => i.DisplayOrder);
        foreach (var eq in revision.ExamQuestions)
        {
            eq.DisplayOrder = orderMap[eq.QuestionId];
        }

        var now = DateTime.UtcNow;
        revision.ConcurrencyToken++;
        revision.UpdatedAt = now;

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorId,
            Action = "ExamQuestionsReordered",
            EntityType = "Exam",
            EntityId = revision.Id,
            Description = JsonSerializer.Serialize(new
            {
                examinationId = revision.ExaminationId,
                examinationCode = revision.Examination?.Code,
                revisionNumber = revision.RevisionNumber,
                order = request.Items.OrderBy(i => i.DisplayOrder).Select(i => new { i.QuestionId, i.DisplayOrder })
            }),
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);

        return revision.ExamQuestions.OrderBy(eq => eq.DisplayOrder).Select(eq => new ExamQuestionMembershipDto
        {
            Id = eq.Id,
            ExamId = eq.ExamId,
            QuestionId = eq.QuestionId,
            DisplayOrder = eq.DisplayOrder,
            Stem = eq.Question?.Stem ?? string.Empty,
            QuestionTypeKey = eq.Question?.QuestionTypeKey ?? "single-choice",
            Pathway = eq.Question?.Pathway ?? string.Empty,
            Difficulty = eq.Question?.Difficulty.ToString() ?? "Moderate",
            Status = eq.Question?.Status.ToString() ?? "Draft",
            OptionCount = eq.Question?.Options.Count ?? 0
        }).ToList();
    }

    public async Task<ExaminationDto> UpdateExaminationFamilyAsync(string examinationId, UpdateExaminationFamilyRequest request, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var (actorId, role) = ResolveActor(user);
        EnforceRole(role, new[] { RoleHierarchy.RoleExamManager, RoleHierarchy.RoleAdmin, RoleHierarchy.RoleSuperAdmin }, "UpdateExaminationFamily");

        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ArgumentException("Title cannot be empty.", nameof(request.Title));

        var examination = await _context.Examinations
            .Include(e => e.Revisions)
                .ThenInclude(r => r.ExamQuestions)
            .FirstOrDefaultAsync(e => e.Id == examinationId, ct);

        if (examination == null)
            throw new KeyNotFoundException($"Examination family '{examinationId}' not found.");

        var oldTitle = examination.Title;
        examination.Title = request.Title.Trim();

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorId,
            Action = "ExaminationFamilyUpdated",
            EntityType = "Examination",
            EntityId = examination.Id,
            Description = JsonSerializer.Serialize(new
            {
                code = examination.Code,
                pathway = examination.Pathway,
                oldTitle,
                newTitle = examination.Title
            }),
            Outcome = "Success",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(ct);
        return MapToExaminationDto(examination, examination.Revisions.ToList());
    }

    public async Task<bool> DiscardDraftRevisionAsync(string revisionId, long concurrencyToken, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var (actorId, role) = ResolveActor(user);
        EnforceRole(role, new[] { RoleHierarchy.RoleExamManager, RoleHierarchy.RoleAdmin, RoleHierarchy.RoleSuperAdmin }, "DiscardDraftRevision");

        var revision = await _context.Exams
            .Include(e => e.Examination)
            .Include(e => e.Attempts)
            .Include(e => e.ExamQuestions)
            .FirstOrDefaultAsync(e => e.Id == revisionId, ct);

        if (revision == null)
            throw new KeyNotFoundException($"Exam revision '{revisionId}' not found.");

        await EnforceConcurrencyAsync(revision, concurrencyToken, "ExamRevisionDiscarded", actorId, ct);

        if (revision.LifecycleState != ExamLifecycleState.Draft)
        {
            throw new InvalidOperationException($"Cannot discard revision in '{revision.LifecycleState}' state. Only Draft revisions can be discarded.");
        }

        if (revision.Attempts.Any())
        {
            throw new InvalidOperationException("Cannot discard revision that has associated attempts.");
        }

        if (revision.SubmittedAt != null || revision.ApprovedAt != null || revision.PublishedAt != null)
        {
            throw new InvalidOperationException("Cannot discard revision that has lifecycle review or publication history.");
        }

        if (revision.Examination?.CurrentRevisionId == revision.Id)
        {
            throw new InvalidOperationException("Cannot discard the current revision of an examination family.");
        }

        var totalRevisions = await _context.Exams.CountAsync(e => e.ExaminationId == revision.ExaminationId, ct);
        if (totalRevisions <= 1)
        {
            throw new InvalidOperationException("Cannot discard Revision 1 when it is the sole revision of the examination family.");
        }

        var examinationId = revision.ExaminationId;
        var examinationCode = revision.Examination?.Code;
        var revisionNumber = revision.RevisionNumber;

        // Cascade delete attached question relationships
        if (revision.ExamQuestions.Any())
        {
            _context.ExamQuestions.RemoveRange(revision.ExamQuestions);
        }

        _context.Exams.Remove(revision);

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorId,
            Action = "ExamRevisionDiscarded",
            EntityType = "Exam",
            EntityId = revisionId,
            Description = JsonSerializer.Serialize(new
            {
                examinationId,
                examinationCode,
                revisionNumber,
                discardedBy = actorId
            }),
            Outcome = "Success",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<List<ExamQuestionMembershipDto>> GetEligibleQuestionsAsync(string? pathway, string? search, ClaimsPrincipal user, CancellationToken ct = default)
    {
        var (_, role) = ResolveActor(user);
        EnforceRole(role, new[] { RoleHierarchy.RoleExamManager, RoleHierarchy.RoleAdmin, RoleHierarchy.RoleSuperAdmin, RoleHierarchy.RoleReviewer }, "GetEligibleQuestions");

        var query = _context.Questions
            .Include(q => q.Options)
            .Where(q => q.Status == QuestionStatus.Approved || q.Status == QuestionStatus.Published)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(pathway))
        {
            var normalizedPathway = pathway.Trim().ToLowerInvariant();
            query = query.Where(q => q.Pathway.ToLower() == normalizedPathway);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(q => q.Stem.ToLower().Contains(term) || q.QuestionTypeKey.ToLower().Contains(term));
        }

        var questions = await query
            .OrderByDescending(q => q.UpdatedAt)
            .Take(50)
            .ToListAsync(ct);

        return questions.Select(q => new ExamQuestionMembershipDto
        {
            Id = q.Id,
            ExamId = string.Empty,
            QuestionId = q.Id,
            DisplayOrder = 0,
            Stem = q.Stem,
            QuestionTypeKey = q.QuestionTypeKey,
            Pathway = q.Pathway,
            Difficulty = q.Difficulty.ToString(),
            Status = q.Status.ToString(),
            OptionCount = q.Options.Count
        }).ToList();
    }

    private static ExaminationDto MapToExaminationDto(Examination examination, List<Exam> revisions, IReadOnlyDictionary<string, int>? questionCounts = null)
    {
        var revisionDtos = revisions.Select(r =>
        {
            var count = questionCounts != null && questionCounts.TryGetValue(r.Id, out var qc)
                ? qc
                : (r.ExamQuestions?.Count ?? 0);
            return MapToRevisionDto(r, examination.Code, count);
        }).ToList();
        var currentRev = revisionDtos.FirstOrDefault(r => r.Id == examination.CurrentRevisionId)
                      ?? revisionDtos.FirstOrDefault(r => r.LifecycleState == ExamLifecycleState.Published.ToString())
                      ?? revisionDtos.FirstOrDefault();

        return new ExaminationDto
        {
            Id = examination.Id,
            Pathway = examination.Pathway,
            Code = examination.Code,
            Title = examination.Title,
            CreatedAt = examination.CreatedAt,
            CreatedBy = examination.CreatedBy,
            CurrentRevisionId = examination.CurrentRevisionId,
            SuccessorExaminationId = examination.SuccessorExaminationId,
            CurrentRevision = currentRev,
            Revisions = revisionDtos
        };
    }

    private static ExamRevisionDto MapToRevisionDto(Exam r, string? examinationCode, int questionCount)
    {
        return new ExamRevisionDto
        {
            Id = r.Id,
            ExaminationId = r.ExaminationId ?? string.Empty,
            ExaminationCode = examinationCode,
            RevisionNumber = r.RevisionNumber,
            LifecycleState = r.LifecycleState.ToString(),
            ConcurrencyToken = r.ConcurrencyToken,
            Title = r.Title,
            Description = r.Description,
            Pathway = r.Pathway,
            ExamType = r.ExamType,
            TimeLimitMinutes = r.TimeLimitMinutes,
            PassingScorePercent = r.PassingScorePercent,
            IsPublished = r.IsPublished,
            QuestionCount = questionCount,
            CreatedAt = r.CreatedAt,
            CreatedBy = r.CreatedBy,
            SubmittedBy = r.SubmittedBy,
            SubmittedAt = r.SubmittedAt,
            ReviewedBy = r.ReviewedBy,
            ReviewedAt = r.ReviewedAt,
            ApprovedBy = r.ApprovedBy,
            ApprovedAt = r.ApprovedAt,
            PublishedBy = r.PublishedBy,
            PublishedAt = r.PublishedAt,
            ArchivedBy = r.ArchivedBy,
            ArchivedAt = r.ArchivedAt,
            RetiredBy = r.RetiredBy,
            RetiredAt = r.RetiredAt
        };
    }

    private static ExamRevisionSummaryDto MapToRevisionSummaryDto(Exam r, string? examinationCode, int questionCount)
    {
        return new ExamRevisionSummaryDto
        {
            Id = r.Id,
            ExaminationId = r.ExaminationId ?? string.Empty,
            ExaminationCode = examinationCode,
            RevisionNumber = r.RevisionNumber,
            LifecycleState = r.LifecycleState.ToString(),
            Title = r.Title,
            Description = r.Description,
            Pathway = r.Pathway,
            ExamType = r.ExamType,
            TimeLimitMinutes = r.TimeLimitMinutes,
            PassingScorePercent = r.PassingScorePercent,
            IsPublished = r.IsPublished,
            QuestionCount = questionCount,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt,
            PublishedAt = r.PublishedAt
        };
    }
}
