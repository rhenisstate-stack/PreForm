using System.Collections.Concurrent;
using System.Data.Common;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

public class ExaminationCodeService : IExaminationCodeService
{
    private readonly AppDbContext _context;
    private static readonly ConcurrentDictionary<string, long> _inMemoryCounters = new(StringComparer.OrdinalIgnoreCase);

    public const long SequenceCeiling = 999999;

    public ExaminationCodeService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<string> AllocateCodeAsync(string pathway, CancellationToken ct = default)
    {
        var normalizedPathway = pathway?.Trim().ToLowerInvariant();
        if (normalizedPathway != "rn" && normalizedPathway != "pn")
        {
            throw new ArgumentException("Invalid examination pathway. Must be 'rn' or 'pn'.", nameof(pathway));
        }

        long nextVal;
        if (_context.Database.IsNpgsql())
        {
            var seqName = normalizedPathway == "rn" ? "exam_code_rn_seq" : "exam_code_pn_seq";
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync(ct);
            }

            await using var cmd = connection.CreateCommand();
            cmd.CommandText = $"SELECT nextval('{seqName}')";

            var currentTx = _context.Database.CurrentTransaction;
            if (currentTx != null)
            {
                cmd.Transaction = currentTx.GetDbTransaction();
            }

            var scalarResult = await cmd.ExecuteScalarAsync(ct);
            if (scalarResult == null || !long.TryParse(scalarResult.ToString(), out nextVal))
            {
                throw new InvalidOperationException($"Failed to allocate examination code from sequence '{seqName}'.");
            }
        }
        else
        {
            nextVal = _inMemoryCounters.AddOrUpdate(
                normalizedPathway,
                1,
                (k, v) => v + 1);
        }

        if (nextVal > SequenceCeiling)
        {
            throw new InvalidOperationException($"Sequence for pathway '{normalizedPathway.ToUpperInvariant()}' has reached its ceiling ({SequenceCeiling}).");
        }

        var prefix = normalizedPathway == "rn" ? "RN-EX" : "PN-EX";
        return $"{prefix}-{nextVal:D6}";
    }

    public async Task<Examination> CreateExaminationAsync(CreateExaminationRequest request, string actorId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Pathway))
        {
            throw new ArgumentException("Pathway is required.", nameof(request));
        }

        var normalizedPathway = request.Pathway.Trim().ToLowerInvariant();
        if (normalizedPathway != "rn" && normalizedPathway != "pn")
        {
            throw new ArgumentException("Pathway must be 'rn' or 'pn'.", nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.Title))
        {
            throw new ArgumentException("Title is required.", nameof(request));
        }

        var code = await AllocateCodeAsync(normalizedPathway, ct);
        var now = DateTime.UtcNow;

        var examination = new Examination
        {
            Id = Guid.NewGuid().ToString(),
            Pathway = normalizedPathway,
            Code = code,
            Title = request.Title.Trim(),
            CreatedAt = now,
            CreatedBy = actorId
        };

        _context.Examinations.Add(examination);

        // If an initial revision title is requested, create revision 1 in Draft
        if (!string.IsNullOrWhiteSpace(request.InitialRevisionTitle))
        {
            var initialRevision = new Exam
            {
                Id = Guid.NewGuid().ToString(),
                ExaminationId = examination.Id,
                RevisionNumber = 1,
                LifecycleState = ExamLifecycleState.Draft,
                ConcurrencyToken = 1,
                Title = request.InitialRevisionTitle.Trim(),
                Description = request.Description?.Trim() ?? string.Empty,
                Pathway = normalizedPathway,
                ExamType = request.ExamType,
                TimeLimitMinutes = request.TimeLimitMinutes,
                PassingScorePercent = request.PassingScorePercent,
                IsPublished = false,
                CreatedBy = actorId,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Exams.Add(initialRevision);

            _context.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid().ToString(),
                ActorId = actorId,
                Action = "ExamRevisionCreated",
                EntityType = "Exam",
                EntityId = initialRevision.Id,
                Description = JsonSerializer.Serialize(new
                {
                    examinationId = examination.Id,
                    examinationCode = examination.Code,
                    revisionNumber = 1,
                    lifecycleState = ExamLifecycleState.Draft.ToString(),
                    title = initialRevision.Title
                }),
                Outcome = "Success",
                Timestamp = now
            });
        }

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            ActorId = actorId,
            Action = "ExamCreated",
            EntityType = "Examination",
            EntityId = examination.Id,
            Description = JsonSerializer.Serialize(new
            {
                code = examination.Code,
                pathway = examination.Pathway,
                title = examination.Title
            }),
            Outcome = "Success",
            Timestamp = now
        });

        await _context.SaveChangesAsync(ct);
        return examination;
    }
}
