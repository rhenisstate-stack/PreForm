using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.Models;

namespace Preform.Api.Services;

public class AssessmentSelectionService : IAssessmentSelectionService
{
    private readonly AppDbContext _context;
    private readonly IQuestionTypeRegistry _questionTypeRegistry;

    public AssessmentSelectionService(AppDbContext context, IQuestionTypeRegistry questionTypeRegistry)
    {
        _context = context;
        _questionTypeRegistry = questionTypeRegistry;
    }

    public async Task<AssessmentSelectionResult> SelectQuestionsAsync(AssessmentSelectionRequest request, CancellationToken cancellationToken = default)
    {
        if (request == null)
        {
            return new AssessmentSelectionResult
            {
                Success = false,
                ErrorCode = "INVALID_REQUEST",
                ErrorMessage = "Assessment selection request cannot be null."
            };
        }

        var normalizedPathway = string.Equals(request.Pathway, "pn", StringComparison.OrdinalIgnoreCase) ? "pn" : "rn";
        var requestedCount = Math.Max(1, request.QuestionCount);

        // Authoritative filter: Only question types with verified grading implementation
        var gradableTypeKeys = _questionTypeRegistry.All
            .Where(t => t.ImplementationStatus == QuestionTypeStatus.GradingSupported)
            .Select(t => t.Key)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var query = _context.Questions
            .Include(q => q.Options)
            .Include(q => q.ClientNeed)
            .Include(q => q.Topic)
            .Where(q => q.Status == QuestionStatus.Published)
            .Where(q => gradableTypeKeys.Contains(q.QuestionTypeKey));

        // Pathway matching
        if (normalizedPathway == "pn")
        {
            query = query.Where(q => q.Pathway == "pn" || q.Pathway == "both");
        }
        else
        {
            query = query.Where(q => q.Pathway == "rn" || q.Pathway == "both");
        }

        // Optional taxonomy filters
        if (!string.IsNullOrWhiteSpace(request.ClientNeedId))
        {
            query = query.Where(q => q.ClientNeedId == request.ClientNeedId);
        }

        if (!string.IsNullOrWhiteSpace(request.TopicId))
        {
            query = query.Where(q => q.TopicId == request.TopicId);
        }

        var eligibleQuestions = await query.ToListAsync(cancellationToken);

        // Exclude specific question IDs if requested
        if (request.ExcludeQuestionIds != null && request.ExcludeQuestionIds.Count > 0)
        {
            var excludeSet = new HashSet<string>(request.ExcludeQuestionIds, StringComparer.Ordinal);
            eligibleQuestions = eligibleQuestions.Where(q => !excludeSet.Contains(q.Id)).ToList();
        }

        // Insufficient published question pool safety check (Gate C)
        if (eligibleQuestions.Count < requestedCount)
        {
            return new AssessmentSelectionResult
            {
                Success = false,
                ErrorCode = "INSUFFICIENT_QUESTIONS",
                ErrorMessage = $"Insufficient published questions available to create this assessment. Found {eligibleQuestions.Count} eligible question(s) for pathway '{normalizedPathway}', but {requestedCount} question(s) were required."
            };
        }

        List<Question> chosen;

        if (request.ExamType == ExamType.DiagnosticReadiness)
        {
            // Balanced selection across NCSBN Client Needs categories for Readiness Assessment Tests (RAT)
            var groups = eligibleQuestions
                .GroupBy(q => q.ClientNeedId ?? "uncategorized")
                .Select(g => g.ToList())
                .ToList();

            chosen = new List<Question>();
            var rnd = new Random();

            // Shuffle each group
            foreach (var group in groups)
            {
                Shuffle(group, rnd);
            }

            // Distribute round-robin across Client Need groups until requested count is reached
            var groupIndex = 0;
            var poolExhausted = false;

            while (chosen.Count < requestedCount && !poolExhausted)
            {
                var addedAnyInCycle = false;
                for (var i = 0; i < groups.Count && chosen.Count < requestedCount; i++)
                {
                    var currentGroup = groups[(groupIndex + i) % groups.Count];
                    if (currentGroup.Count > 0)
                    {
                        var pick = currentGroup[0];
                        currentGroup.RemoveAt(0);
                        chosen.Add(pick);
                        addedAnyInCycle = true;
                    }
                }
                groupIndex = (groupIndex + 1) % Math.Max(1, groups.Count);
                if (!addedAnyInCycle)
                {
                    poolExhausted = true;
                }
            }

            // If still short due to group depletion, fill from remaining questions
            if (chosen.Count < requestedCount)
            {
                var chosenIds = chosen.Select(q => q.Id).ToHashSet();
                var remaining = eligibleQuestions.Where(q => !chosenIds.Contains(q.Id)).ToList();
                Shuffle(remaining, rnd);
                chosen.AddRange(remaining.Take(requestedCount - chosen.Count));
            }
        }
        else
        {
            // Standard randomized practice selection
            var rnd = new Random();
            Shuffle(eligibleQuestions, rnd);
            chosen = eligibleQuestions.Take(requestedCount).ToList();
        }

        // Final shuffle of selected questions so order is randomized across domains
        var finalRnd = new Random();
        Shuffle(chosen, finalRnd);

        var selectedItems = chosen.Select((q, index) => new SelectedQuestionItem
        {
            Question = q,
            DisplayOrder = index,
            Options = q.Options.OrderBy(o => o.DisplayOrder).ToList()
        }).ToList();

        return new AssessmentSelectionResult
        {
            Success = true,
            SelectedQuestions = selectedItems
        };
    }

    private static void Shuffle<T>(IList<T> list, Random rnd)
    {
        for (var i = list.Count - 1; i > 0; i--)
        {
            var k = rnd.Next(i + 1);
            (list[i], list[k]) = (list[k], list[i]);
        }
    }
}
