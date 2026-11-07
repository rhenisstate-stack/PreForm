using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

public class TopicQuizService : ITopicQuizService
{
    private readonly AppDbContext _context;
    private readonly ILogger<TopicQuizService> _logger;

    public TopicQuizService(AppDbContext context, ILogger<TopicQuizService> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ── Configurations ──

    public async Task<TopicQuizConfigurationDto> CreateConfigurationAsync(string userId, CreateTopicQuizConfigurationRequest request)
    {
        var config = new TopicQuizConfiguration
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            Title = request.Title.Trim(),
            Programme = request.Programme ?? "rn",
            SubjectDomainId = request.SubjectDomainId,
            TopicSlug = request.TopicSlug,
            TopicTitle = request.TopicTitle,
            ClientNeedId = request.ClientNeedId,
            QuestionCount = Math.Clamp(request.QuestionCount, 3, 50),
            Difficulty = request.Difficulty ?? "all",
            TimeLimitMinutes = Math.Max(0, request.TimeLimitMinutes),
            ImmediateFeedback = request.ImmediateFeedback,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.TopicQuizConfigurations.Add(config);
        await _context.SaveChangesAsync();

        return MapConfiguration(config);
    }

    public async Task<List<TopicQuizConfigurationDto>> GetUserConfigurationsAsync(string userId, string? programme = null)
    {
        var query = _context.TopicQuizConfigurations.AsNoTracking()
            .Where(c => (c.UserId == userId || (c.IsOfficial && c.IsPublished)) && c.IsActive);
        if (!string.IsNullOrWhiteSpace(programme) && programme != "all")
        {
            query = query.Where(c => c.Programme == programme || c.Programme == "both");
        }

        return await query
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => MapConfiguration(c))
            .ToListAsync();
    }

    public async Task<bool> DeleteConfigurationAsync(string userId, string configurationId)
    {
        var config = await _context.TopicQuizConfigurations
            .FirstOrDefaultAsync(c => c.Id == configurationId && c.UserId == userId);

        if (config == null) return false;

        config.IsActive = false;
        await _context.SaveChangesAsync();
        return true;
    }

    // ── Attempts ──

    public async Task<TopicQuizAttemptDto> StartAttemptAsync(string userId, StartTopicQuizAttemptRequest request)
    {
        string title = request.Title ?? "Practice Topic Quiz";
        string programme = request.Programme ?? "rn";
        string? subjectDomainId = request.SubjectDomainId;
        string? topicSlug = request.TopicSlug;
        string? topicTitle = request.TopicTitle;
        string? clientNeedId = request.ClientNeedId;
        int questionCount = Math.Clamp(request.QuestionCount, 3, 50);

        List<Question> matchedQuestions = new();

        if (!string.IsNullOrWhiteSpace(request.ConfigurationId))
        {
            var config = await _context.TopicQuizConfigurations.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == request.ConfigurationId && (c.UserId == userId || (c.IsOfficial && c.IsPublished)));

            if (config != null)
            {
                title = config.Title;
                programme = config.Programme;
                subjectDomainId = config.SubjectDomainId;
                topicSlug = config.TopicSlug;
                topicTitle = config.TopicTitle;
                clientNeedId = config.ClientNeedId;
                questionCount = config.QuestionCount;

                var assignedQuestionIds = ParseStringList(config.QuestionIdsJson);
                if (assignedQuestionIds.Count > 0)
                {
                    var assignedQuestions = await _context.Questions
                        .Include(q => q.Options)
                        .Include(q => q.Topic)
                        .Where(q => assignedQuestionIds.Contains(q.Id) && q.Status != QuestionStatus.Archived)
                        .ToListAsync();

                    if (assignedQuestions.Count > 0)
                    {
                        matchedQuestions = assignedQuestions
                            .OrderBy(q => assignedQuestionIds.IndexOf(q.Id))
                            .ToList();
                    }
                }
            }
        }

        // Query questions dynamically from canonical Questions repository if no assigned questions
        if (matchedQuestions.Count == 0)
        {
            var qQuery = _context.Questions
                .Include(q => q.Options)
                .Include(q => q.Topic)
                .Where(q => q.Status == QuestionStatus.Published || q.Status == QuestionStatus.InReview);

            if (!string.IsNullOrWhiteSpace(programme) && programme != "all")
            {
                qQuery = qQuery.Where(q => q.Pathway == programme || q.Pathway == "both");
            }

            if (!string.IsNullOrWhiteSpace(clientNeedId))
            {
                qQuery = qQuery.Where(q => q.ClientNeedId == clientNeedId);
            }

            if (!string.IsNullOrWhiteSpace(topicSlug))
            {
                qQuery = qQuery.Where(q => q.Topic != null && (q.Topic.Title.ToLower() == topicSlug.ToLower() || q.Topic.Id == topicSlug));
            }

            matchedQuestions = await qQuery
                .OrderBy(q => EF.Functions.Random())
                .Take(questionCount)
                .ToListAsync();

            // If not enough questions with strict filters, backfill with pathway questions
            if (matchedQuestions.Count < questionCount)
            {
                var matchedIds = matchedQuestions.Select(q => q.Id).ToHashSet();
                var needed = questionCount - matchedQuestions.Count;

                var backfill = await _context.Questions
                    .Include(q => q.Options)
                    .Include(q => q.Topic)
                    .Where(q => !matchedIds.Contains(q.Id) &&
                                (q.Pathway == programme || q.Pathway == "both") &&
                                (q.Status == QuestionStatus.Published || q.Status == QuestionStatus.InReview))
                    .OrderBy(q => EF.Functions.Random())
                    .Take(needed)
                    .ToListAsync();

                matchedQuestions.AddRange(backfill);
            }
        }

        // Create attempt record
        var attempt = new TopicQuizAttempt
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            ConfigurationId = request.ConfigurationId,
            Title = title,
            Programme = programme,
            TopicSlug = topicSlug,
            TopicTitle = topicTitle,
            ClientNeedId = clientNeedId,
            TotalQuestions = matchedQuestions.Count,
            CorrectCount = 0,
            IncorrectCount = 0,
            ScorePercentage = 0.0,
            TimeSpentSeconds = 0,
            Status = "in_progress",
            StartedAt = DateTime.UtcNow
        };

        _context.TopicQuizAttempts.Add(attempt);

        // Pre-create initial responses for questions in order
        foreach (var q in matchedQuestions)
        {
            attempt.Responses.Add(new TopicQuizResponse
            {
                Id = Guid.NewGuid().ToString(),
                AttemptId = attempt.Id,
                QuestionId = q.Id,
                SelectedOptionIndicesJson = "[]",
                IsCorrect = false,
                TimeSpentSeconds = 0,
                FlaggedForReview = false,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();

        var questionsDto = matchedQuestions.Select(q => MapQuestionToDto(q, false)).ToList();

        return new TopicQuizAttemptDto
        {
            Id = attempt.Id,
            Title = attempt.Title,
            Programme = attempt.Programme,
            TopicSlug = attempt.TopicSlug,
            TopicTitle = attempt.TopicTitle,
            ClientNeedId = attempt.ClientNeedId,
            TotalQuestions = attempt.TotalQuestions,
            CorrectCount = 0,
            IncorrectCount = 0,
            ScorePercentage = 0.0,
            TimeSpentSeconds = 0,
            Status = attempt.Status,
            StartedAt = attempt.StartedAt,
            Questions = questionsDto,
            Responses = new List<TopicQuizResponseDto>()
        };
    }

    public async Task<TopicQuizAttemptDto?> GetAttemptAsync(string userId, string attemptId)
    {
        var attempt = await _context.TopicQuizAttempts
            .Include(a => a.Responses)
            .FirstOrDefaultAsync(a => a.Id == attemptId && a.UserId == userId);

        if (attempt == null) return null;

        var questionIds = attempt.Responses.Select(r => r.QuestionId).ToList();
        var questions = await _context.Questions
            .Include(q => q.Options)
            .Include(q => q.Topic)
            .Where(q => questionIds.Contains(q.Id))
            .ToListAsync();

        var isCompleted = attempt.Status == "completed";

        var questionDtos = questions
            .OrderBy(q => questionIds.IndexOf(q.Id))
            .Select(q => MapQuestionToDto(q, isCompleted))
            .ToList();

        var responseDtos = attempt.Responses.Select(r =>
        {
            var q = questions.FirstOrDefault(x => x.Id == r.QuestionId);
            var correctIndices = q?.Options
                .OrderBy(o => o.DisplayOrder)
                .Select((o, idx) => new { o.IsCorrect, idx })
                .Where(x => x.IsCorrect)
                .Select(x => x.idx)
                .ToList();

            return new TopicQuizResponseDto
            {
                QuestionId = r.QuestionId,
                SelectedOptionIndices = ParseIndices(r.SelectedOptionIndicesJson),
                IsCorrect = r.IsCorrect,
                TimeSpentSeconds = r.TimeSpentSeconds,
                FlaggedForReview = r.FlaggedForReview,
                CorrectAnswerIndices = isCompleted ? correctIndices : null,
                Rationale = isCompleted ? q?.OverallRationale : null
            };
        }).ToList();

        return new TopicQuizAttemptDto
        {
            Id = attempt.Id,
            Title = attempt.Title,
            Programme = attempt.Programme,
            TopicSlug = attempt.TopicSlug,
            TopicTitle = attempt.TopicTitle,
            ClientNeedId = attempt.ClientNeedId,
            TotalQuestions = attempt.TotalQuestions,
            CorrectCount = attempt.CorrectCount,
            IncorrectCount = attempt.IncorrectCount,
            ScorePercentage = attempt.ScorePercentage,
            TimeSpentSeconds = attempt.TimeSpentSeconds,
            Status = attempt.Status,
            StartedAt = attempt.StartedAt,
            CompletedAt = attempt.CompletedAt,
            Questions = questionDtos,
            Responses = responseDtos
        };
    }

    public async Task<TopicQuizResponseDto> SubmitResponseAsync(string userId, string attemptId, SubmitTopicQuizResponseRequest request)
    {
        var attempt = await _context.TopicQuizAttempts
            .Include(a => a.Responses)
            .FirstOrDefaultAsync(a => a.Id == attemptId && a.UserId == userId);

        if (attempt == null)
        {
            throw new KeyNotFoundException($"Quiz attempt '{attemptId}' not found.");
        }

        var response = attempt.Responses.FirstOrDefault(r => r.QuestionId == request.QuestionId);
        if (response == null)
        {
            response = new TopicQuizResponse
            {
                Id = Guid.NewGuid().ToString(),
                AttemptId = attempt.Id,
                QuestionId = request.QuestionId,
                CreatedAt = DateTime.UtcNow
            };
            attempt.Responses.Add(response);
        }

        var question = await _context.Questions
            .Include(q => q.Options)
            .FirstOrDefaultAsync(q => q.Id == request.QuestionId);

        if (question == null)
        {
            throw new KeyNotFoundException($"Question '{request.QuestionId}' not found.");
        }

        var orderedOptions = question.Options.OrderBy(o => o.DisplayOrder).ToList();
        var correctIndices = orderedOptions
            .Select((o, idx) => new { o.IsCorrect, idx })
            .Where(x => x.IsCorrect)
            .Select(x => x.idx)
            .ToHashSet();

        var selected = request.SelectedOptionIndices.ToHashSet();
        bool isCorrect = selected.SetEquals(correctIndices);

        response.SelectedOptionIndicesJson = JsonSerializer.Serialize(request.SelectedOptionIndices);
        response.IsCorrect = isCorrect;
        response.TimeSpentSeconds = request.TimeSpentSeconds;
        response.FlaggedForReview = request.FlaggedForReview;

        // Recalculate attempt score
        attempt.CorrectCount = attempt.Responses.Count(r => r.IsCorrect);
        attempt.IncorrectCount = attempt.Responses.Count(r => !r.IsCorrect && ParseIndices(r.SelectedOptionIndicesJson).Count > 0);
        int answeredCount = attempt.Responses.Count(r => ParseIndices(r.SelectedOptionIndicesJson).Count > 0);
        attempt.ScorePercentage = answeredCount > 0
            ? Math.Round((double)attempt.CorrectCount / attempt.TotalQuestions * 100.0, 1)
            : 0.0;

        attempt.TimeSpentSeconds += Math.Max(0, request.TimeSpentSeconds);

        await _context.SaveChangesAsync();

        return new TopicQuizResponseDto
        {
            QuestionId = response.QuestionId,
            SelectedOptionIndices = request.SelectedOptionIndices,
            IsCorrect = isCorrect,
            TimeSpentSeconds = response.TimeSpentSeconds,
            FlaggedForReview = response.FlaggedForReview,
            CorrectAnswerIndices = correctIndices.ToList(),
            Rationale = question.OverallRationale
        };
    }

    public async Task<TopicQuizResultsDto> CompleteAttemptAsync(string userId, string attemptId)
    {
        var attempt = await _context.TopicQuizAttempts
            .Include(a => a.Responses)
            .FirstOrDefaultAsync(a => a.Id == attemptId && a.UserId == userId);

        if (attempt == null)
        {
            throw new KeyNotFoundException($"Quiz attempt '{attemptId}' not found.");
        }

        var now = DateTime.UtcNow;
        attempt.Status = "completed";
        attempt.CompletedAt = now;

        await _context.SaveChangesAsync();

        return await GetAttemptResultsAsync(userId, attemptId);
    }

    public async Task<TopicQuizResultsDto> GetAttemptResultsAsync(string userId, string attemptId)
    {
        var attemptDto = await GetAttemptAsync(userId, attemptId);
        if (attemptDto == null)
        {
            throw new KeyNotFoundException($"Quiz attempt '{attemptId}' not found.");
        }

        var questionIds = attemptDto.Questions.Select(q => q.Id).ToList();
        var questions = await _context.Questions
            .Include(q => q.Topic)
            .Include(q => q.Options)
            .Where(q => questionIds.Contains(q.Id))
            .ToListAsync();

        var responses = attemptDto.Responses;
        var perfByClientNeed = new Dictionary<string, double>();
        var missedQuestions = new List<TopicQuizQuestionDto>();
        var recommendedTopics = new HashSet<string>();

        foreach (var q in questions)
        {
            var resp = responses.FirstOrDefault(r => r.QuestionId == q.Id);
            bool isCorrect = resp?.IsCorrect ?? false;

            if (!string.IsNullOrWhiteSpace(q.ClientNeedId))
            {
                if (!perfByClientNeed.ContainsKey(q.ClientNeedId))
                {
                    var cnQuestions = questions.Where(x => x.ClientNeedId == q.ClientNeedId).ToList();
                    var cnCorrect = cnQuestions.Count(x => responses.FirstOrDefault(r => r.QuestionId == x.Id)?.IsCorrect ?? false);
                    perfByClientNeed[q.ClientNeedId] = Math.Round((double)cnCorrect / cnQuestions.Count * 100.0, 1);
                }
            }

            if (!isCorrect)
            {
                missedQuestions.Add(MapQuestionToDto(q, true));
                if (q.Topic != null)
                {
                    recommendedTopics.Add(q.Topic.Title);
                }
            }
        }

        return new TopicQuizResultsDto
        {
            Attempt = attemptDto,
            PerformanceByClientNeed = perfByClientNeed,
            RecommendedStudyTopics = recommendedTopics.ToList(),
            MissedQuestions = missedQuestions
        };
    }

    public async Task<List<TopicQuizAttemptDto>> GetUserAttemptsAsync(string userId, string? programme = null, int limit = 20)
    {
        var query = _context.TopicQuizAttempts.AsNoTracking().Where(a => a.UserId == userId);
        if (!string.IsNullOrWhiteSpace(programme) && programme != "all")
        {
            query = query.Where(a => a.Programme == programme || a.Programme == "both");
        }

        return await query
            .OrderByDescending(a => a.StartedAt)
            .Take(Math.Clamp(limit, 1, 100))
            .Select(a => new TopicQuizAttemptDto
            {
                Id = a.Id,
                Title = a.Title,
                Programme = a.Programme,
                TopicSlug = a.TopicSlug,
                TopicTitle = a.TopicTitle,
                ClientNeedId = a.ClientNeedId,
                TotalQuestions = a.TotalQuestions,
                CorrectCount = a.CorrectCount,
                IncorrectCount = a.IncorrectCount,
                ScorePercentage = a.ScorePercentage,
                TimeSpentSeconds = a.TimeSpentSeconds,
                Status = a.Status,
                StartedAt = a.StartedAt,
                CompletedAt = a.CompletedAt
            })
            .ToListAsync();
    }

    // ── Helpers ──

    private static TopicQuizConfigurationDto MapConfiguration(TopicQuizConfiguration c) => new()
    {
        Id = c.Id,
        Title = c.Title,
        Description = c.Description,
        Programme = c.Programme,
        SubjectDomainId = c.SubjectDomainId,
        TopicSlug = c.TopicSlug,
        TopicTitle = c.TopicTitle,
        ClientNeedId = c.ClientNeedId,
        QuestionCount = c.QuestionCount,
        Difficulty = c.Difficulty,
        TimeLimitMinutes = c.TimeLimitMinutes,
        ImmediateFeedback = c.ImmediateFeedback,
        Status = c.Status,
        IsPublished = c.IsPublished,
        IsOfficial = c.IsOfficial,
        IsActive = c.IsActive,
        CreatedAt = c.CreatedAt
    };

    private static List<string> ParseStringList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<string>();
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
        }
        catch
        {
            return new List<string>();
        }
    }

    private static TopicQuizQuestionDto MapQuestionToDto(Question q, bool revealAnswer)
    {
        var options = q.Options
            .OrderBy(o => o.DisplayOrder)
            .Select((o, idx) => new TopicQuizOptionDto
            {
                Index = idx,
                Text = o.Content,
                MediaUrl = o.MediaUrl
            })
            .ToList();

        var correctIndices = revealAnswer
            ? q.Options
                .OrderBy(o => o.DisplayOrder)
                .Select((o, idx) => new { o.IsCorrect, idx })
                .Where(x => x.IsCorrect)
                .Select(x => x.idx)
                .ToList()
            : null;

        return new TopicQuizQuestionDto
        {
            Id = q.Id,
            Stem = q.Stem,
            QuestionTypeKey = q.QuestionTypeKey,
            Difficulty = q.Difficulty.ToString(),
            ClientNeedId = q.ClientNeedId,
            ClinicalScenario = q.ClinicalScenario,
            Options = options,
            CorrectAnswerIndices = correctIndices,
            Rationale = revealAnswer ? q.OverallRationale : null
        };
    }

    private static List<int> ParseIndices(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<int>>(json) ?? new List<int>();
        }
        catch
        {
            return new List<int>();
        }
    }
}
