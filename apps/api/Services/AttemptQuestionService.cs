using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.Models;

namespace Preform.Api.Services;

/// <summary>
/// Failure categories for attempt-question membership validation.
/// </summary>
public enum AttemptQuestionMembershipFailure
{
    None,
    QuestionNotFound,
    NotAssignedToExam,
    NotAssignedToAttempt,
}

/// <summary>
/// Result of exact attempt-question membership validation.
/// </summary>
public class AttemptQuestionMembershipResult
{
    public AttemptQuestionMembershipFailure Failure { get; init; } = AttemptQuestionMembershipFailure.None;
    public string? Error { get; init; }

    public bool IsMember => Failure == AttemptQuestionMembershipFailure.None;
}

public interface IAttemptQuestionService
{
    /// <summary>
    /// Validates that a question may be answered as part of an attempt.
    /// Level 1: the question must be associated with the attempt's exam
    /// (ExamAttempt → Exam → ExamQuestion → Question).
    /// Level 2: the question must belong to the attempt's persisted question set
    /// (ExamAttemptQuestions). An exam-level question that was never assigned to
    /// the attempt is rejected.
    /// Compatibility: attempts persisted before the ExamAttemptQuestions snapshot
    /// existed (no snapshot rows) fall back to Level 1; the first verified
    /// submission is then recorded into the snapshot, which locks the set.
    /// </summary>
    Task<AttemptQuestionMembershipResult> ValidateMembershipAsync(
        ExamAttempt attempt,
        string questionId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Records the exact question set for an attempt (idempotent per question).
    /// Used at attempt creation and after a membership-verified response.
    /// </summary>
    Task RecordQuestionMembershipAsync(
        string attemptId,
        IReadOnlyCollection<string> questionIds,
        DateTime assignedAt,
        CancellationToken cancellationToken = default);
}

public class AttemptQuestionService : IAttemptQuestionService
{
    private readonly AppDbContext _context;

    public AttemptQuestionService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<AttemptQuestionMembershipResult> ValidateMembershipAsync(
        ExamAttempt attempt,
        string questionId,
        CancellationToken cancellationToken = default)
    {
        if (attempt == null)
        {
            return new AttemptQuestionMembershipResult
            {
                Failure = AttemptQuestionMembershipFailure.NotAssignedToAttempt,
                Error = "Attempt not found.",
            };
        }

        if (string.IsNullOrWhiteSpace(questionId))
        {
            return new AttemptQuestionMembershipResult
            {
                Failure = AttemptQuestionMembershipFailure.QuestionNotFound,
                Error = "Question ID is required.",
            };
        }

        var questionExists = await _context.Questions
            .AnyAsync(q => q.Id == questionId, cancellationToken);

        if (!questionExists)
        {
            return new AttemptQuestionMembershipResult
            {
                Failure = AttemptQuestionMembershipFailure.QuestionNotFound,
                Error = "Question not found.",
            };
        }

        // Level 1: exam membership (ExamAttempt → Exam → ExamQuestion → Question).
        var examMember = await _context.ExamQuestions
            .AnyAsync(eq => eq.ExamId == attempt.ExamId && eq.QuestionId == questionId, cancellationToken);

        if (!examMember)
        {
            return new AttemptQuestionMembershipResult
            {
                Failure = AttemptQuestionMembershipFailure.NotAssignedToExam,
                Error = "The submitted question is not part of this attempt's exam.",
            };
        }

        // Level 2: exact attempt membership. Attempts created before the snapshot
        // existed have an empty set; those fall back to exam-level membership and
        // are locked into the snapshot after their first verified submission.
        var snapshotExists = await _context.ExamAttemptQuestions
            .AnyAsync(eaq => eaq.ExamAttemptId == attempt.Id, cancellationToken);

        if (snapshotExists)
        {
            var attemptMember = await _context.ExamAttemptQuestions
                .AnyAsync(eaq => eaq.ExamAttemptId == attempt.Id && eaq.QuestionId == questionId, cancellationToken);

            if (!attemptMember)
            {
                return new AttemptQuestionMembershipResult
                {
                    Failure = AttemptQuestionMembershipFailure.NotAssignedToAttempt,
                    Error = "The submitted question was not assigned to this attempt.",
                };
            }
        }

        return new AttemptQuestionMembershipResult();
    }

    public async Task RecordQuestionMembershipAsync(
        string attemptId,
        IReadOnlyCollection<string> questionIds,
        DateTime assignedAt,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(attemptId) || questionIds.Count == 0)
        {
            return;
        }

        var questionIdsToRecord = questionIds
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct(StringComparer.Ordinal)
            .ToList();

        var existingIds = await _context.ExamAttemptQuestions
            .Where(eaq => eaq.ExamAttemptId == attemptId && questionIdsToRecord.Contains(eaq.QuestionId))
            .Select(eaq => eaq.QuestionId)
            .ToListAsync(cancellationToken);

        var order = 0;
        foreach (var questionId in questionIdsToRecord)
        {
            if (existingIds.Contains(questionId))
            {
                continue;
            }

            _context.ExamAttemptQuestions.Add(new ExamAttemptQuestion
            {
                Id = "eaq_" + Guid.NewGuid().ToString("N"),
                ExamAttemptId = attemptId,
                QuestionId = questionId,
                DisplayOrder = order++,
                AssignedAt = assignedAt,
            });
        }

        if (_context.ChangeTracker.HasChanges())
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
