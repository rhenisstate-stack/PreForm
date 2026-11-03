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

    public ExamLifecycleService(AppDbContext context)
    {
        _context = context;
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

        var maxRevision = await _context.Exams
            .Where(e => e.ExaminationId == examinationId)
            .MaxAsync(e => (int?)e.RevisionNumber, ct) ?? 0;

        var nextRevisionNumber = maxRevision + 1;
        var now = DateTime.UtcNow;

        var revision = new Exam
        {
            Id = Guid.NewGuid().ToString(),
            ExaminationId = examinationId,
            RevisionNumber = nextRevisionNumber,
            LifecycleState = ExamLifecycleState.Draft,
            ConcurrencyToken = 1,
            Title = string.IsNullOrWhiteSpace(request.Title) ? examination.Title : request.Title.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            Pathway = examination.Pathway,
            ExamType = request.ExamType,
            TimeLimitMinutes = request.TimeLimitMinutes,
            PassingScorePercent = request.PassingScorePercent,
            IsPublished = false,
            CreatedBy = actorId,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Exams.Add(revision);

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
                lifecycleState = ExamLifecycleState.Draft.ToString(),
                title = revision.Title
            }),
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);
        return MapToRevisionDto(revision, examination.Code, 0);
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

    private static ExaminationDto MapToExaminationDto(Examination examination, List<Exam> revisions)
    {
        var revisionDtos = revisions.Select(r => MapToRevisionDto(r, examination.Code, r.ExamQuestions?.Count ?? 0)).ToList();
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
}
