using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services.AI;

namespace Preform.Api.Services;

public class AdminStudyGuideService : IAdminStudyGuideService
{
    private readonly AppDbContext _db;
    private readonly IAIStudyProvider _aiProvider;
    private readonly ILogger<AdminStudyGuideService> _logger;

    public AdminStudyGuideService(
        AppDbContext db,
        IAIStudyProvider aiProvider,
        ILogger<AdminStudyGuideService> logger)
    {
        _db = db;
        _aiProvider = aiProvider;
        _logger = logger;
    }

    // ==========================================
    // 1. Notes Management
    // ==========================================

    public async Task<PagedResult<AdminStudyNoteDto>> GetNotesAsync(AdminNoteFilterParameters filter)
    {
        var query = _db.StudyNotes
            .Include(n => n.User)
            .Include(n => n.Folder)
            .Where(n => !n.IsDeleted);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(n => n.Title.ToLower().Contains(search) || n.ContentPlainText.ToLower().Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(filter.Programme) && filter.Programme != "all")
        {
            query = query.Where(n => n.Programme == filter.Programme || n.Programme == "both");
        }

        if (!string.IsNullOrWhiteSpace(filter.Status) && filter.Status != "all")
        {
            query = query.Where(n => n.Status == filter.Status);
        }

        if (!string.IsNullOrWhiteSpace(filter.ClientNeedId))
        {
            query = query.Where(n => n.ClientNeedId == filter.ClientNeedId);
        }

        if (!string.IsNullOrWhiteSpace(filter.SubjectDomainId))
        {
            query = query.Where(n => n.SubjectDomainId == filter.SubjectDomainId);
        }

        if (filter.IsOfficial.HasValue)
        {
            query = query.Where(n => n.IsOfficial == filter.IsOfficial.Value);
        }

        var totalCount = await query.CountAsync();

        // Sorting
        query = filter.SortBy?.ToLower() switch
        {
            "title" => filter.SortOrder?.ToLower() == "asc" ? query.OrderBy(n => n.Title) : query.OrderByDescending(n => n.Title),
            "createdat" => filter.SortOrder?.ToLower() == "asc" ? query.OrderBy(n => n.CreatedAt) : query.OrderByDescending(n => n.CreatedAt),
            _ => filter.SortOrder?.ToLower() == "asc" ? query.OrderBy(n => n.UpdatedAt) : query.OrderByDescending(n => n.UpdatedAt),
        };

        var page = Math.Max(1, filter.Page);
        var pageSize = Math.Clamp(filter.PageSize, 1, 100);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => MapNoteToAdminDto(n))
            .ToListAsync();

        return new PagedResult<AdminStudyNoteDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        };
    }

    public async Task<AdminStudyNoteDto?> GetNoteByIdAsync(string id)
    {
        var note = await _db.StudyNotes
            .Include(n => n.User)
            .Include(n => n.Folder)
            .FirstOrDefaultAsync(n => n.Id == id && !n.IsDeleted);

        return note == null ? null : MapNoteToAdminDto(note);
    }

    public async Task<AdminStudyNoteDto> CreateNoteAsync(AdminCreateNoteRequest request, string adminUserId)
    {
        var wordCount = string.IsNullOrWhiteSpace(request.ContentPlainText)
            ? 0
            : request.ContentPlainText.Split(new[] { ' ', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries).Length;

        var note = new StudyNote
        {
            UserId = adminUserId,
            FolderId = request.FolderId,
            Title = request.Title.Trim(),
            ContentJson = request.ContentJson,
            ContentPlainText = request.ContentPlainText,
            Programme = request.Programme,
            SubjectDomainId = request.SubjectDomainId,
            TopicSlug = request.TopicSlug,
            TopicTitle = request.TopicTitle,
            ClientNeedId = request.ClientNeedId,
            TagsJson = JsonSerializer.Serialize(request.Tags ?? new List<string>()),
            Status = string.IsNullOrWhiteSpace(request.Status) ? "Draft" : request.Status,
            IsOfficial = request.IsOfficial,
            StudyGuideId = request.StudyGuideId,
            WordCount = wordCount,
            CharacterCount = request.ContentPlainText?.Length ?? 0,
            LastEditedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.StudyNotes.Add(note);

        // Initial version snapshot
        _db.StudyNoteVersions.Add(new StudyNoteVersion
        {
            NoteId = note.Id,
            Title = note.Title,
            ContentJson = note.ContentJson,
            WordCount = wordCount,
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        _logger.LogInformation("Admin {AdminId} created administrative note {NoteId} ({Title})", adminUserId, note.Id, note.Title);
        return MapNoteToAdminDto(note);
    }

    public async Task<AdminStudyNoteDto> UpdateNoteAsync(string id, AdminUpdateNoteRequest request, string adminUserId)
    {
        var note = await _db.StudyNotes.FirstOrDefaultAsync(n => n.Id == id && !n.IsDeleted);
        if (note == null) throw new KeyNotFoundException($"Study note '{id}' not found.");

        var wordCount = string.IsNullOrWhiteSpace(request.ContentPlainText)
            ? 0
            : request.ContentPlainText.Split(new[] { ' ', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries).Length;

        note.Title = request.Title.Trim();
        note.ContentJson = request.ContentJson;
        note.ContentPlainText = request.ContentPlainText;
        note.Programme = request.Programme;
        note.FolderId = request.FolderId;
        note.SubjectDomainId = request.SubjectDomainId;
        note.TopicSlug = request.TopicSlug;
        note.TopicTitle = request.TopicTitle;
        note.ClientNeedId = request.ClientNeedId;
        note.TagsJson = JsonSerializer.Serialize(request.Tags ?? new List<string>());
        note.Status = request.Status;
        note.IsOfficial = request.IsOfficial;
        note.StudyGuideId = request.StudyGuideId;
        note.WordCount = wordCount;
        note.CharacterCount = request.ContentPlainText?.Length ?? 0;
        note.LastEditedAt = DateTime.UtcNow;
        note.UpdatedAt = DateTime.UtcNow;

        _db.StudyNoteVersions.Add(new StudyNoteVersion
        {
            NoteId = note.Id,
            Title = note.Title,
            ContentJson = note.ContentJson,
            WordCount = wordCount,
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return MapNoteToAdminDto(note);
    }

    public async Task<bool> DeleteNoteAsync(string id)
    {
        var note = await _db.StudyNotes.FirstOrDefaultAsync(n => n.Id == id);
        if (note == null) return false;

        note.IsDeleted = true;
        note.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<AdminStudyNoteDto> DuplicateNoteAsync(string id, string adminUserId)
    {
        var note = await _db.StudyNotes.FirstOrDefaultAsync(n => n.Id == id && !n.IsDeleted);
        if (note == null) throw new KeyNotFoundException($"Study note '{id}' not found.");

        var copy = new StudyNote
        {
            UserId = adminUserId,
            FolderId = note.FolderId,
            Title = $"{note.Title} (Copy)",
            ContentJson = note.ContentJson,
            ContentPlainText = note.ContentPlainText,
            Programme = note.Programme,
            SubjectDomainId = note.SubjectDomainId,
            TopicSlug = note.TopicSlug,
            TopicTitle = note.TopicTitle,
            ClientNeedId = note.ClientNeedId,
            TagsJson = note.TagsJson,
            Status = "Draft",
            IsOfficial = note.IsOfficial,
            StudyGuideId = note.StudyGuideId,
            WordCount = note.WordCount,
            CharacterCount = note.CharacterCount,
            LastEditedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.StudyNotes.Add(copy);
        await _db.SaveChangesAsync();
        return MapNoteToAdminDto(copy);
    }

    public async Task<AdminStudyNoteDto> ArchiveNoteAsync(string id, bool isArchived)
    {
        var note = await _db.StudyNotes.FirstOrDefaultAsync(n => n.Id == id && !n.IsDeleted);
        if (note == null) throw new KeyNotFoundException($"Study note '{id}' not found.");

        note.IsArchived = isArchived;
        if (isArchived && note.Status == "Published")
        {
            note.Status = "Archived";
        }
        else if (!isArchived && note.Status == "Archived")
        {
            note.Status = "Draft";
        }
        note.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return MapNoteToAdminDto(note);
    }

    public async Task<AdminStudyNoteDto> PublishNoteAsync(string id)
    {
        var note = await _db.StudyNotes.FirstOrDefaultAsync(n => n.Id == id && !n.IsDeleted);
        if (note == null) throw new KeyNotFoundException($"Study note '{id}' not found.");

        note.Status = "Published";
        note.IsArchived = false;
        note.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return MapNoteToAdminDto(note);
    }

    public async Task<AdminStudyNoteDto> SetNoteStatusAsync(string id, string status)
    {
        var note = await _db.StudyNotes.FirstOrDefaultAsync(n => n.Id == id && !n.IsDeleted);
        if (note == null) throw new KeyNotFoundException($"Study note '{id}' not found.");

        note.Status = status;
        if (status == "Archived") note.IsArchived = true;
        if (status == "Published") note.IsArchived = false;
        note.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return MapNoteToAdminDto(note);
    }

    // ==========================================
    // 2. Flashcards Management
    // ==========================================

    public async Task<List<AdminFlashcardDeckDto>> GetDecksAsync(string? programme, string? search, bool? isOfficial)
    {
        var query = _db.FlashcardDecks
            .Include(d => d.Flashcards)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(programme) && programme != "all")
        {
            query = query.Where(d => d.Programme == programme || d.Programme == "both");
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(d => d.Name.ToLower().Contains(s) || d.Description.ToLower().Contains(s));
        }

        if (isOfficial.HasValue)
        {
            query = query.Where(d => d.IsOfficial == isOfficial.Value);
        }

        var decks = await query
            .OrderByDescending(d => d.UpdatedAt)
            .ToListAsync();

        return decks.Select(d => new AdminFlashcardDeckDto
        {
            Id = d.Id,
            UserId = d.UserId,
            UserEmail = d.UserEmail,
            Name = d.Name,
            Description = d.Description,
            Programme = d.Programme,
            SourceType = d.SourceType,
            SourceReference = d.SourceReference,
            TopicSlug = d.TopicSlug,
            TopicTitle = d.TopicTitle,
            ClientNeedId = d.ClientNeedId,
            Tags = SafeDeserializeTags(d.TagsJson),
            IsArchived = d.IsArchived,
            IsPublished = d.IsPublished,
            IsOfficial = d.IsOfficial,
            CardCount = d.Flashcards.Count,
            DueCount = d.Flashcards.Count(c => c.DueAt <= DateTime.UtcNow),
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt
        }).ToList();
    }

    public async Task<AdminFlashcardDeckDto?> GetDeckByIdAsync(string id)
    {
        var d = await _db.FlashcardDecks
            .Include(x => x.Flashcards)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (d == null) return null;

        return new AdminFlashcardDeckDto
        {
            Id = d.Id,
            UserId = d.UserId,
            UserEmail = d.UserEmail,
            Name = d.Name,
            Description = d.Description,
            Programme = d.Programme,
            SourceType = d.SourceType,
            SourceReference = d.SourceReference,
            TopicSlug = d.TopicSlug,
            TopicTitle = d.TopicTitle,
            ClientNeedId = d.ClientNeedId,
            Tags = SafeDeserializeTags(d.TagsJson),
            IsArchived = d.IsArchived,
            IsPublished = d.IsPublished,
            IsOfficial = d.IsOfficial,
            CardCount = d.Flashcards.Count,
            DueCount = d.Flashcards.Count(c => c.DueAt <= DateTime.UtcNow),
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt
        };
    }

    public async Task<AdminFlashcardDeckDto> CreateDeckAsync(AdminCreateDeckRequest request, string adminUserId, string adminEmail)
    {
        var deck = new FlashcardDeck
        {
            UserId = adminUserId,
            UserEmail = adminEmail,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            Programme = request.Programme,
            SourceType = string.IsNullOrWhiteSpace(request.SourceType) ? "official" : request.SourceType,
            SourceReference = request.SourceReference?.Trim() ?? string.Empty,
            TopicSlug = request.TopicSlug?.Trim() ?? string.Empty,
            TopicTitle = request.TopicTitle?.Trim() ?? string.Empty,
            ClientNeedId = request.ClientNeedId,
            TagsJson = JsonSerializer.Serialize(request.Tags ?? new List<string>()),
            IsPublished = request.IsPublished,
            IsOfficial = request.IsOfficial,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.FlashcardDecks.Add(deck);
        await _db.SaveChangesAsync();

        return (await GetDeckByIdAsync(deck.Id))!;
    }

    public async Task<AdminFlashcardDeckDto> UpdateDeckAsync(string id, AdminUpdateDeckRequest request)
    {
        var deck = await _db.FlashcardDecks.FirstOrDefaultAsync(d => d.Id == id);
        if (deck == null) throw new KeyNotFoundException($"Deck '{id}' not found.");

        deck.Name = request.Name.Trim();
        deck.Description = request.Description?.Trim() ?? string.Empty;
        deck.Programme = request.Programme;
        deck.SourceType = request.SourceType;
        deck.SourceReference = request.SourceReference ?? string.Empty;
        deck.TopicSlug = request.TopicSlug ?? string.Empty;
        deck.TopicTitle = request.TopicTitle ?? string.Empty;
        deck.ClientNeedId = request.ClientNeedId;
        deck.TagsJson = JsonSerializer.Serialize(request.Tags ?? new List<string>());
        deck.IsPublished = request.IsPublished;
        deck.IsOfficial = request.IsOfficial;
        deck.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return (await GetDeckByIdAsync(deck.Id))!;
    }

    public async Task<bool> DeleteDeckAsync(string id)
    {
        var deck = await _db.FlashcardDecks
            .Include(d => d.Flashcards)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (deck == null) return false;

        _db.Flashcards.RemoveRange(deck.Flashcards);
        _db.FlashcardDecks.Remove(deck);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<AdminFlashcardDeckDto> DuplicateDeckAsync(string id, string adminUserId, string adminEmail)
    {
        var deck = await _db.FlashcardDecks
            .Include(d => d.Flashcards)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (deck == null) throw new KeyNotFoundException($"Deck '{id}' not found.");

        var copy = new FlashcardDeck
        {
            UserId = adminUserId,
            UserEmail = adminEmail,
            Name = $"{deck.Name} (Copy)",
            Description = deck.Description,
            Programme = deck.Programme,
            SourceType = deck.SourceType,
            SourceReference = deck.SourceReference,
            TopicSlug = deck.TopicSlug,
            TopicTitle = deck.TopicTitle,
            ClientNeedId = deck.ClientNeedId,
            TagsJson = deck.TagsJson,
            IsPublished = false,
            IsOfficial = deck.IsOfficial,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.FlashcardDecks.Add(copy);
        await _db.SaveChangesAsync();

        foreach (var c in deck.Flashcards)
        {
            _db.Flashcards.Add(new Flashcard
            {
                DeckId = copy.Id,
                UserId = adminUserId,
                Front = c.Front,
                Back = c.Back,
                Explanation = c.Explanation,
                ImageUrl = c.ImageUrl,
                DiagramUrl = c.DiagramUrl,
                CardStyle = c.CardStyle,
                Difficulty = c.Difficulty,
                Programme = c.Programme,
                Status = "active",
                TopicSlug = c.TopicSlug,
                TopicTitle = c.TopicTitle,
                ClientNeedId = c.ClientNeedId,
                TagsJson = c.TagsJson,
                DisplayOrder = c.DisplayOrder,
                SourceType = c.SourceType,
                SourceReference = c.SourceReference,
                RepetitionCount = 0,
                EaseFactor = 2.5,
                IntervalDays = 0,
                DueAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        return (await GetDeckByIdAsync(copy.Id))!;
    }

    public async Task<AdminFlashcardDeckDto> PublishDeckAsync(string id, bool isPublished)
    {
        var deck = await _db.FlashcardDecks.FirstOrDefaultAsync(d => d.Id == id);
        if (deck == null) throw new KeyNotFoundException($"Deck '{id}' not found.");

        deck.IsPublished = isPublished;
        deck.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return (await GetDeckByIdAsync(deck.Id))!;
    }

    public async Task<AdminFlashcardDeckDto> ArchiveDeckAsync(string id, bool isArchived)
    {
        var deck = await _db.FlashcardDecks.FirstOrDefaultAsync(d => d.Id == id);
        if (deck == null) throw new KeyNotFoundException($"Deck '{id}' not found.");

        deck.IsArchived = isArchived;
        deck.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return (await GetDeckByIdAsync(deck.Id))!;
    }

    public async Task<List<AdminFlashcardDto>> GetDeckCardsAsync(string deckId)
    {
        var cards = await _db.Flashcards
            .Include(c => c.Deck)
            .Where(c => c.DeckId == deckId)
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.CreatedAt)
            .ToListAsync();

        return cards.Select(c => MapCardToAdminDto(c)).ToList();
    }

    public async Task<AdminFlashcardDto> CreateCardAsync(string deckId, AdminCreateCardRequest request, string adminUserId)
    {
        var deck = await _db.FlashcardDecks.FirstOrDefaultAsync(d => d.Id == deckId);
        if (deck == null) throw new KeyNotFoundException($"Deck '{deckId}' not found.");

        var highestOrder = await _db.Flashcards
            .Where(c => c.DeckId == deckId)
            .Select(c => (int?)c.DisplayOrder)
            .MaxAsync() ?? 0;

        var card = new Flashcard
        {
            DeckId = deckId,
            UserId = adminUserId,
            Front = request.Front.Trim(),
            Back = request.Back.Trim(),
            Explanation = request.Explanation?.Trim() ?? string.Empty,
            ImageUrl = request.ImageUrl,
            DiagramUrl = request.DiagramUrl,
            CardStyle = request.CardStyle ?? "qa",
            Difficulty = request.Difficulty ?? "medium",
            Programme = request.Programme ?? deck.Programme,
            Status = "active",
            TopicSlug = deck.TopicSlug,
            TopicTitle = deck.TopicTitle,
            ClientNeedId = deck.ClientNeedId,
            TagsJson = JsonSerializer.Serialize(request.Tags ?? new List<string>()),
            DisplayOrder = highestOrder + 1,
            SourceType = deck.SourceType,
            SourceReference = request.SourceReference ?? deck.SourceReference,
            RepetitionCount = 0,
            EaseFactor = 2.5,
            IntervalDays = 0,
            DueAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Flashcards.Add(card);
        await _db.SaveChangesAsync();

        card.Deck = deck;
        return MapCardToAdminDto(card);
    }

    public async Task<AdminFlashcardDto> UpdateCardAsync(string cardId, AdminUpdateCardRequest request)
    {
        var card = await _db.Flashcards.Include(c => c.Deck).FirstOrDefaultAsync(c => c.Id == cardId);
        if (card == null) throw new KeyNotFoundException($"Flashcard '{cardId}' not found.");

        card.Front = request.Front.Trim();
        card.Back = request.Back.Trim();
        card.Explanation = request.Explanation?.Trim() ?? string.Empty;
        card.ImageUrl = request.ImageUrl;
        card.DiagramUrl = request.DiagramUrl;
        card.CardStyle = request.CardStyle ?? card.CardStyle;
        card.Difficulty = request.Difficulty ?? card.Difficulty;
        card.Programme = request.Programme ?? card.Programme;
        card.TagsJson = JsonSerializer.Serialize(request.Tags ?? new List<string>());
        card.SourceReference = request.SourceReference ?? card.SourceReference;
        card.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return MapCardToAdminDto(card);
    }

    public async Task<bool> DeleteCardAsync(string cardId)
    {
        var card = await _db.Flashcards.FirstOrDefaultAsync(c => c.Id == cardId);
        if (card == null) return false;

        _db.Flashcards.Remove(card);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<AdminFlashcardDto> DuplicateCardAsync(string cardId)
    {
        var card = await _db.Flashcards.Include(c => c.Deck).FirstOrDefaultAsync(c => c.Id == cardId);
        if (card == null) throw new KeyNotFoundException($"Flashcard '{cardId}' not found.");

        var copy = new Flashcard
        {
            DeckId = card.DeckId,
            UserId = card.UserId,
            Front = $"{card.Front} (Copy)",
            Back = card.Back,
            Explanation = card.Explanation,
            ImageUrl = card.ImageUrl,
            DiagramUrl = card.DiagramUrl,
            CardStyle = card.CardStyle,
            Difficulty = card.Difficulty,
            Programme = card.Programme,
            Status = "active",
            TopicSlug = card.TopicSlug,
            TopicTitle = card.TopicTitle,
            ClientNeedId = card.ClientNeedId,
            TagsJson = card.TagsJson,
            DisplayOrder = card.DisplayOrder + 1,
            SourceType = card.SourceType,
            SourceReference = card.SourceReference,
            RepetitionCount = 0,
            EaseFactor = 2.5,
            IntervalDays = 0,
            DueAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Flashcards.Add(copy);
        await _db.SaveChangesAsync();

        copy.Deck = card.Deck;
        return MapCardToAdminDto(copy);
    }

    public async Task<AdminFlashcardDto> MoveCardAsync(string cardId, string targetDeckId)
    {
        var card = await _db.Flashcards.FirstOrDefaultAsync(c => c.Id == cardId);
        if (card == null) throw new KeyNotFoundException($"Flashcard '{cardId}' not found.");

        var targetDeck = await _db.FlashcardDecks.FirstOrDefaultAsync(d => d.Id == targetDeckId);
        if (targetDeck == null) throw new KeyNotFoundException($"Target deck '{targetDeckId}' not found.");

        card.DeckId = targetDeckId;
        card.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        card.Deck = targetDeck;
        return MapCardToAdminDto(card);
    }

    public async Task<bool> ReorderCardsAsync(string deckId, List<string> cardIds)
    {
        var cards = await _db.Flashcards.Where(c => c.DeckId == deckId).ToListAsync();
        var cardDict = cards.ToDictionary(c => c.Id);

        for (int i = 0; i < cardIds.Count; i++)
        {
            if (cardDict.TryGetValue(cardIds[i], out var card))
            {
                card.DisplayOrder = i + 1;
                card.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync();
        return true;
    }

    // ==========================================
    // 3. Review Sessions Management
    // ==========================================

    public async Task<StudyReviewConfigurationDto> GetReviewConfigurationAsync()
    {
        var config = await _db.StudyReviewConfigurations.FirstOrDefaultAsync(c => c.Id == "global_config");
        if (config == null)
        {
            config = new StudyReviewConfiguration
            {
                Id = "global_config",
                MaxCardsPerSession = 50,
                DefaultCardLimit = 20,
                SupportedModesJson = JsonSerializer.Serialize(new[] { "all_due", "deck", "difficult", "favourites", "random" }),
                EnableRn = true,
                EnablePn = true,
                RequireSubscription = false,
                AllowCustomDrills = true,
                MinIntervalDays = 1,
                DefaultEaseFactor = 2.5,
                UpdatedAt = DateTime.UtcNow,
                UpdatedBy = "system"
            };
            _db.StudyReviewConfigurations.Add(config);
            await _db.SaveChangesAsync();
        }

        return MapReviewConfigToDto(config);
    }

    public async Task<StudyReviewConfigurationDto> UpdateReviewConfigurationAsync(UpdateReviewConfigurationRequest request, string adminUserId)
    {
        var config = await _db.StudyReviewConfigurations.FirstOrDefaultAsync(c => c.Id == "global_config");
        if (config == null)
        {
            config = new StudyReviewConfiguration { Id = "global_config" };
            _db.StudyReviewConfigurations.Add(config);
        }

        config.MaxCardsPerSession = Math.Clamp(request.MaxCardsPerSession, 5, 200);
        config.DefaultCardLimit = Math.Clamp(request.DefaultCardLimit, 5, config.MaxCardsPerSession);
        config.SupportedModesJson = JsonSerializer.Serialize(request.SupportedModes ?? new List<string>());
        config.EnableRn = request.EnableRn;
        config.EnablePn = request.EnablePn;
        config.RequireSubscription = request.RequireSubscription;
        config.AllowCustomDrills = request.AllowCustomDrills;
        config.MinIntervalDays = Math.Max(1, request.MinIntervalDays);
        config.DefaultEaseFactor = Math.Clamp(request.DefaultEaseFactor, 1.3, 3.0);
        config.UpdatedAt = DateTime.UtcNow;
        config.UpdatedBy = adminUserId;

        await _db.SaveChangesAsync();
        return MapReviewConfigToDto(config);
    }

    public async Task<AdminReviewAnalyticsDto> GetReviewAnalyticsAsync(DateTime? from, DateTime? to, string? programme, string? subject)
    {
        var query = _db.StudyReviewSessions.AsQueryable();

        if (from.HasValue) query = query.Where(s => s.StartedAt >= from.Value);
        if (to.HasValue) query = query.Where(s => s.StartedAt <= to.Value);
        if (!string.IsNullOrWhiteSpace(programme) && programme != "all")
        {
            query = query.Where(s => s.Programme == programme);
        }

        var sessions = await query.ToListAsync();
        var totalSessions = sessions.Count;
        var completed = sessions.Count(s => s.Status == "completed");
        var abandoned = sessions.Count(s => s.Status == "abandoned" || s.Status == "interrupted");
        var totalCards = sessions.Sum(s => s.CardsReviewed);
        var avgAccuracy = sessions.Any() ? sessions.Average(s => s.AccuracyPercentage) : 0;
        var avgDuration = sessions.Any() ? sessions.Average(s => s.DurationSeconds) : 0;

        // Subject Breakdown
        var subjectGroups = sessions
            .GroupBy(s => string.IsNullOrWhiteSpace(s.TopicTitle) ? "General Practice" : s.TopicTitle)
            .Select(g => new ReviewSubjectMetricDto
            {
                Subject = g.Key,
                SessionCount = g.Count(),
                AccuracyPercentage = Math.Round(g.Average(s => s.AccuracyPercentage), 1)
            })
            .OrderByDescending(s => s.SessionCount)
            .Take(8)
            .ToList();

        // Programme Breakdown
        var programmeGroups = sessions
            .GroupBy(s => s.Programme.ToUpper())
            .Select(g => new ReviewProgrammeMetricDto
            {
                Programme = g.Key,
                SessionCount = g.Count(),
                CardsReviewed = g.Sum(s => s.CardsReviewed),
                AccuracyPercentage = Math.Round(g.Average(s => s.AccuracyPercentage), 1)
            })
            .ToList();

        // Frequently Difficult Cards (reviews with rating 0 or 1)
        var difficultItems = await _db.StudyReviewSessionItems
            .Include(i => i.Flashcard)
                .ThenInclude(f => f.Deck)
            .Where(i => i.RecallRating <= 1)
            .GroupBy(i => new { i.FlashcardId, i.Flashcard.Front, DeckName = i.Flashcard.Deck.Name, i.Flashcard.Programme })
            .Select(g => new DifficultFlashcardSummaryDto
            {
                FlashcardId = g.Key.FlashcardId,
                Front = g.Key.Front.Length > 80 ? g.Key.Front.Substring(0, 77) + "..." : g.Key.Front,
                DeckName = g.Key.DeckName,
                Programme = g.Key.Programme,
                AgainCount = g.Count(x => x.RecallRating == 0),
                HardCount = g.Count(x => x.RecallRating == 1),
                TotalReviews = g.Count(),
                FailureRate = 100.0 // Since all items in query are ratings <= 1
            })
            .OrderByDescending(x => x.TotalReviews)
            .Take(5)
            .ToListAsync();

        // Scheduling stats
        var totalActiveCards = await _db.Flashcards.CountAsync(c => c.Status == "active");
        var dueToday = await _db.Flashcards.CountAsync(c => c.Status == "active" && c.DueAt <= DateTime.UtcNow);
        var dueThisWeek = await _db.Flashcards.CountAsync(c => c.Status == "active" && c.DueAt <= DateTime.UtcNow.AddDays(7));
        var avgEase = await _db.Flashcards.AnyAsync() ? await _db.Flashcards.AverageAsync(c => c.EaseFactor) : 2.5;

        return new AdminReviewAnalyticsDto
        {
            TotalSessions = totalSessions,
            CompletedSessions = completed,
            AbandonedSessions = abandoned,
            CompletionRate = totalSessions > 0 ? Math.Round((completed * 100.0) / totalSessions, 1) : 0,
            TotalCardsReviewed = totalCards,
            OverallAccuracyPercentage = Math.Round(avgAccuracy, 1),
            AverageDurationSeconds = Math.Round(avgDuration, 0),
            SubjectBreakdown = subjectGroups,
            ProgrammeBreakdown = programmeGroups,
            FrequentlyDifficultCards = difficultItems,
            SchedulingStats = new ReviewSchedulingStatsDto
            {
                TotalActiveCards = totalActiveCards,
                CardsDueToday = dueToday,
                CardsDueThisWeek = dueThisWeek,
                AverageEaseFactor = Math.Round(avgEase, 2)
            }
        };
    }

    public async Task<PagedResult<AdminReviewSessionRecordDto>> GetReviewSessionsAsync(string? programme, string? status, string? search, int page, int pageSize)
    {
        var query = _db.StudyReviewSessions
            .Include(s => s.User)
            .Include(s => s.Deck)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(programme) && programme != "all")
        {
            query = query.Where(s => s.Programme == programme);
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            query = query.Where(s => s.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(x => x.User.Email.ToLower().Contains(s) || x.User.DisplayName.ToLower().Contains(s) || (x.Deck != null && x.Deck.Name.ToLower().Contains(s)));
        }

        var totalCount = await query.CountAsync();
        var p = Math.Max(1, page);
        var ps = Math.Clamp(pageSize, 1, 100);

        var items = await query
            .OrderByDescending(s => s.StartedAt)
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(s => new AdminReviewSessionRecordDto
            {
                Id = s.Id,
                UserId = s.UserId,
                UserEmail = s.User.Email,
                UserName = s.User.DisplayName,
                DeckId = s.DeckId,
                DeckName = s.Deck != null ? s.Deck.Name : "All Decks",
                Mode = s.Mode,
                Programme = s.Programme,
                TopicTitle = s.TopicTitle,
                TotalCards = s.TotalCards,
                CardsReviewed = s.CardsReviewed,
                CardsCorrect = s.CardsCorrect,
                CardsDifficult = s.CardsDifficult,
                CardsMissed = s.CardsMissed,
                AccuracyPercentage = s.AccuracyPercentage,
                DurationSeconds = s.DurationSeconds,
                Status = s.Status,
                StartedAt = s.StartedAt,
                CompletedAt = s.CompletedAt
            })
            .ToListAsync();

        return new PagedResult<AdminReviewSessionRecordDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = p,
            PageSize = ps,
            TotalPages = (int)Math.Ceiling(totalCount / (double)ps)
        };
    }

    public async Task<AdminReviewSessionDetailDto?> GetReviewSessionByIdAsync(string sessionId)
    {
        var s = await _db.StudyReviewSessions
            .Include(x => x.User)
            .Include(x => x.Deck)
            .Include(x => x.Items)
                .ThenInclude(i => i.Flashcard)
            .FirstOrDefaultAsync(x => x.Id == sessionId);

        if (s == null) return null;

        return new AdminReviewSessionDetailDto
        {
            Id = s.Id,
            UserId = s.UserId,
            UserEmail = s.User.Email,
            UserName = s.User.DisplayName,
            DeckId = s.DeckId,
            DeckName = s.Deck != null ? s.Deck.Name : "All Decks",
            Mode = s.Mode,
            Programme = s.Programme,
            TopicTitle = s.TopicTitle,
            TotalCards = s.TotalCards,
            CardsReviewed = s.CardsReviewed,
            CardsCorrect = s.CardsCorrect,
            CardsDifficult = s.CardsDifficult,
            CardsMissed = s.CardsMissed,
            AccuracyPercentage = s.AccuracyPercentage,
            DurationSeconds = s.DurationSeconds,
            Status = s.Status,
            StartedAt = s.StartedAt,
            CompletedAt = s.CompletedAt,
            Items = s.Items.Select(i => new AdminReviewSessionItemDto
            {
                Id = i.Id,
                FlashcardId = i.FlashcardId,
                Front = i.Flashcard != null ? i.Flashcard.Front : string.Empty,
                Back = i.Flashcard != null ? i.Flashcard.Back : string.Empty,
                RecallRating = i.RecallRating,
                ResponseTimeMs = i.ResponseTimeMs,
                ReviewedAt = i.ReviewedAt
            }).ToList()
        };
    }

    // ==========================================
    // 4. Topic Quizzes Management
    // ==========================================

    public async Task<List<AdminTopicQuizDto>> GetQuizzesAsync(string? programme, string? status, string? search)
    {
        var query = _db.TopicQuizConfigurations
            .Include(q => q.Attempts)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(programme) && programme != "all")
        {
            query = query.Where(q => q.Programme == programme || q.Programme == "both");
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            query = query.Where(q => q.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(q => q.Title.ToLower().Contains(s) || q.Description.ToLower().Contains(s));
        }

        var quizzes = await query.OrderByDescending(q => q.CreatedAt).ToListAsync();

        return quizzes.Select(q => new AdminTopicQuizDto
        {
            Id = q.Id,
            UserId = q.UserId,
            Title = q.Title,
            Description = q.Description,
            Programme = q.Programme,
            SubjectDomainId = q.SubjectDomainId,
            TopicSlug = q.TopicSlug,
            TopicTitle = q.TopicTitle,
            ClientNeedId = q.ClientNeedId,
            QuestionCount = q.QuestionCount,
            Difficulty = q.Difficulty,
            TimeLimitMinutes = q.TimeLimitMinutes,
            ImmediateFeedback = q.ImmediateFeedback,
            FeedbackMode = q.FeedbackMode,
            MaxAttempts = q.MaxAttempts,
            Status = q.Status,
            IsPublished = q.IsPublished,
            IsOfficial = q.IsOfficial,
            QuestionIds = SafeDeserializeTags(q.QuestionIdsJson),
            AttemptCount = q.Attempts.Count,
            AverageScore = q.Attempts.Any() ? Math.Round(q.Attempts.Average(a => a.ScorePercentage), 1) : 0,
            CreatedAt = q.CreatedAt
        }).ToList();
    }

    public async Task<AdminTopicQuizDto?> GetQuizByIdAsync(string id)
    {
        var q = await _db.TopicQuizConfigurations
            .Include(x => x.Attempts)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (q == null) return null;

        return new AdminTopicQuizDto
        {
            Id = q.Id,
            UserId = q.UserId,
            Title = q.Title,
            Description = q.Description,
            Programme = q.Programme,
            SubjectDomainId = q.SubjectDomainId,
            TopicSlug = q.TopicSlug,
            TopicTitle = q.TopicTitle,
            ClientNeedId = q.ClientNeedId,
            QuestionCount = q.QuestionCount,
            Difficulty = q.Difficulty,
            TimeLimitMinutes = q.TimeLimitMinutes,
            ImmediateFeedback = q.ImmediateFeedback,
            FeedbackMode = q.FeedbackMode,
            MaxAttempts = q.MaxAttempts,
            Status = q.Status,
            IsPublished = q.IsPublished,
            IsOfficial = q.IsOfficial,
            QuestionIds = SafeDeserializeTags(q.QuestionIdsJson),
            AttemptCount = q.Attempts.Count,
            AverageScore = q.Attempts.Any() ? Math.Round(q.Attempts.Average(a => a.ScorePercentage), 1) : 0,
            CreatedAt = q.CreatedAt
        };
    }

    public async Task<AdminTopicQuizDto> CreateQuizAsync(AdminCreateTopicQuizRequest request, string adminUserId)
    {
        var quiz = new TopicQuizConfiguration
        {
            UserId = adminUserId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            Programme = request.Programme,
            SubjectDomainId = request.SubjectDomainId,
            TopicSlug = request.TopicSlug,
            TopicTitle = request.TopicTitle,
            ClientNeedId = request.ClientNeedId,
            QuestionCount = Math.Max(1, request.QuestionCount),
            Difficulty = request.Difficulty ?? "all",
            TimeLimitMinutes = Math.Max(0, request.TimeLimitMinutes),
            ImmediateFeedback = request.ImmediateFeedback,
            FeedbackMode = request.FeedbackMode ?? "immediate",
            MaxAttempts = Math.Max(0, request.MaxAttempts),
            Status = string.IsNullOrWhiteSpace(request.Status) ? "Draft" : request.Status,
            IsPublished = request.IsPublished,
            IsOfficial = request.IsOfficial,
            QuestionIdsJson = JsonSerializer.Serialize(request.QuestionIds ?? new List<string>()),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.TopicQuizConfigurations.Add(quiz);
        await _db.SaveChangesAsync();

        return (await GetQuizByIdAsync(quiz.Id))!;
    }

    public async Task<AdminTopicQuizDto> UpdateQuizAsync(string id, AdminUpdateTopicQuizRequest request)
    {
        var quiz = await _db.TopicQuizConfigurations.FirstOrDefaultAsync(q => q.Id == id);
        if (quiz == null) throw new KeyNotFoundException($"Topic quiz '{id}' not found.");

        quiz.Title = request.Title.Trim();
        quiz.Description = request.Description?.Trim() ?? string.Empty;
        quiz.Programme = request.Programme;
        quiz.SubjectDomainId = request.SubjectDomainId;
        quiz.TopicSlug = request.TopicSlug;
        quiz.TopicTitle = request.TopicTitle;
        quiz.ClientNeedId = request.ClientNeedId;
        quiz.QuestionCount = Math.Max(1, request.QuestionCount);
        quiz.Difficulty = request.Difficulty ?? "all";
        quiz.TimeLimitMinutes = Math.Max(0, request.TimeLimitMinutes);
        quiz.ImmediateFeedback = request.ImmediateFeedback;
        quiz.FeedbackMode = request.FeedbackMode ?? "immediate";
        quiz.MaxAttempts = Math.Max(0, request.MaxAttempts);
        quiz.Status = request.Status;
        quiz.IsPublished = request.IsPublished;
        quiz.IsOfficial = request.IsOfficial;
        if (request.QuestionIds != null)
        {
            quiz.QuestionIdsJson = JsonSerializer.Serialize(request.QuestionIds);
        }

        await _db.SaveChangesAsync();
        return (await GetQuizByIdAsync(quiz.Id))!;
    }

    public async Task<bool> DeleteQuizAsync(string id)
    {
        var quiz = await _db.TopicQuizConfigurations.FirstOrDefaultAsync(q => q.Id == id);
        if (quiz == null) return false;

        _db.TopicQuizConfigurations.Remove(quiz);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<AdminTopicQuizDto> DuplicateQuizAsync(string id, string adminUserId)
    {
        var quiz = await _db.TopicQuizConfigurations.FirstOrDefaultAsync(q => q.Id == id);
        if (quiz == null) throw new KeyNotFoundException($"Topic quiz '{id}' not found.");

        var copy = new TopicQuizConfiguration
        {
            UserId = adminUserId,
            Title = $"{quiz.Title} (Copy)",
            Description = quiz.Description,
            Programme = quiz.Programme,
            SubjectDomainId = quiz.SubjectDomainId,
            TopicSlug = quiz.TopicSlug,
            TopicTitle = quiz.TopicTitle,
            ClientNeedId = quiz.ClientNeedId,
            QuestionCount = quiz.QuestionCount,
            Difficulty = quiz.Difficulty,
            TimeLimitMinutes = quiz.TimeLimitMinutes,
            ImmediateFeedback = quiz.ImmediateFeedback,
            FeedbackMode = quiz.FeedbackMode,
            MaxAttempts = quiz.MaxAttempts,
            Status = "Draft",
            IsPublished = false,
            IsOfficial = quiz.IsOfficial,
            QuestionIdsJson = quiz.QuestionIdsJson,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.TopicQuizConfigurations.Add(copy);
        await _db.SaveChangesAsync();

        return (await GetQuizByIdAsync(copy.Id))!;
    }

    public async Task<AdminTopicQuizDto> PublishQuizAsync(string id, bool isPublished)
    {
        var quiz = await _db.TopicQuizConfigurations.FirstOrDefaultAsync(q => q.Id == id);
        if (quiz == null) throw new KeyNotFoundException($"Topic quiz '{id}' not found.");

        quiz.IsPublished = isPublished;
        quiz.Status = isPublished ? "Published" : "Draft";
        await _db.SaveChangesAsync();

        return (await GetQuizByIdAsync(quiz.Id))!;
    }

    public async Task<AdminTopicQuizDto> ArchiveQuizAsync(string id, bool isArchived)
    {
        var quiz = await _db.TopicQuizConfigurations.FirstOrDefaultAsync(q => q.Id == id);
        if (quiz == null) throw new KeyNotFoundException($"Topic quiz '{id}' not found.");

        quiz.Status = isArchived ? "Archived" : "Draft";
        quiz.IsPublished = !isArchived && quiz.IsPublished;
        await _db.SaveChangesAsync();

        return (await GetQuizByIdAsync(quiz.Id))!;
    }

    public async Task<List<AdminQuizQuestionDto>> SearchQuestionsAsync(string? search, string? pathway, string? difficulty, string? typeKey, string? topicId, int limit)
    {
        var query = _db.Questions.AsQueryable();

        if (!string.IsNullOrWhiteSpace(pathway) && pathway != "all")
        {
            query = query.Where(q => q.Pathway == pathway || q.Pathway == "both");
        }

        if (!string.IsNullOrWhiteSpace(typeKey) && typeKey != "all")
        {
            query = query.Where(q => q.QuestionTypeKey == typeKey);
        }

        if (!string.IsNullOrWhiteSpace(topicId))
        {
            query = query.Where(q => q.TopicId == topicId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(q => q.Stem.ToLower().Contains(s) || (q.Code != null && q.Code.ToLower().Contains(s)));
        }

        var lim = Math.Clamp(limit, 1, 100);
        var questions = await query
            .OrderByDescending(q => q.PublishedAt)
            .Take(lim)
            .ToListAsync();

        return questions.Select(q => new AdminQuizQuestionDto
        {
            Id = q.Id,
            Code = q.Code,
            Pathway = q.Pathway,
            QuestionTypeKey = q.QuestionTypeKey,
            Stem = q.Stem,
            Instructions = q.Instructions,
            Difficulty = q.Difficulty.ToString(),
            Status = q.Status.ToString(),
            OverallRationale = q.OverallRationale,
            CognitiveLevel = q.CognitiveLevel,
            ClinicalJudgmentStep = q.ClinicalJudgmentStep,
            ClientNeedId = q.ClientNeedId
        }).ToList();
    }

    public async Task<AdminTopicQuizDto> AssignQuestionsAsync(string quizId, List<string> questionIds)
    {
        var quiz = await _db.TopicQuizConfigurations.FirstOrDefaultAsync(q => q.Id == quizId);
        if (quiz == null) throw new KeyNotFoundException($"Topic quiz '{quizId}' not found.");

        quiz.QuestionIdsJson = JsonSerializer.Serialize(questionIds ?? new List<string>());
        quiz.QuestionCount = questionIds?.Count ?? 0;
        await _db.SaveChangesAsync();

        return (await GetQuizByIdAsync(quiz.Id))!;
    }

    public async Task<AdminQuizAnalyticsDto> GetQuizAnalyticsAsync(DateTime? from, DateTime? to, string? programme)
    {
        var attemptsQuery = _db.TopicQuizAttempts.AsQueryable();

        if (from.HasValue) attemptsQuery = attemptsQuery.Where(a => a.StartedAt >= from.Value);
        if (to.HasValue) attemptsQuery = attemptsQuery.Where(a => a.StartedAt <= to.Value);
        if (!string.IsNullOrWhiteSpace(programme) && programme != "all")
        {
            attemptsQuery = attemptsQuery.Where(a => a.Programme == programme);
        }

        var attempts = await attemptsQuery.ToListAsync();
        var totalAttempts = attempts.Count;
        var completed = attempts.Count(a => a.Status == "completed");
        var avgScore = attempts.Any() ? attempts.Average(a => a.ScorePercentage) : 0;
        var avgDuration = attempts.Any() ? attempts.Average(a => a.TimeSpentSeconds) : 0;

        // Topic performance
        var topicMetrics = attempts
            .GroupBy(a => string.IsNullOrWhiteSpace(a.TopicTitle) ? "General Practice" : a.TopicTitle)
            .Select(g => new QuizTopicMetricDto
            {
                Topic = g.Key,
                Attempts = g.Count(),
                AverageScore = Math.Round(g.Average(a => a.ScorePercentage), 1)
            })
            .OrderByDescending(t => t.Attempts)
            .Take(8)
            .ToList();

        // Programme performance
        var programmeMetrics = attempts
            .GroupBy(a => a.Programme.ToUpper())
            .Select(g => new QuizProgrammeMetricDto
            {
                Programme = g.Key,
                Attempts = g.Count(),
                AverageScore = Math.Round(g.Average(a => a.ScorePercentage), 1)
            })
            .ToList();

        // Frequently missed questions from responses
        var missed = await _db.TopicQuizResponses
            .Include(r => r.Question)
            .GroupBy(r => new { r.QuestionId, r.Question.Stem, r.Question.Difficulty })
            .Select(g => new FrequentlyMissedQuestionDto
            {
                QuestionId = g.Key.QuestionId,
                Stem = g.Key.Stem.Length > 80 ? g.Key.Stem.Substring(0, 77) + "..." : g.Key.Stem,
                Difficulty = g.Key.Difficulty.ToString(),
                TotalResponses = g.Count(),
                IncorrectResponses = g.Count(x => !x.IsCorrect),
                MissRatePercentage = g.Any() ? Math.Round((g.Count(x => !x.IsCorrect) * 100.0) / g.Count(), 1) : 0
            })
            .Where(x => x.TotalResponses >= 1)
            .OrderByDescending(x => x.MissRatePercentage)
            .ThenByDescending(x => x.TotalResponses)
            .Take(5)
            .ToListAsync();

        return new AdminQuizAnalyticsDto
        {
            TotalAttempts = totalAttempts,
            CompletedAttempts = completed,
            CompletionRate = totalAttempts > 0 ? Math.Round((completed * 100.0) / totalAttempts, 1) : 0,
            AverageScore = Math.Round(avgScore, 1),
            AverageDurationSeconds = Math.Round(avgDuration, 0),
            TopicPerformance = topicMetrics,
            ProgrammePerformance = programmeMetrics,
            FrequentlyMissedQuestions = missed
        };
    }

    public async Task<List<AIDraftQuestionDto>> GenerateDraftQuestionsAsync(AIGenerateQuizQuestionsRequest request)
    {
        try
        {
            var aiRequest = new AIGenerateQuizRequest
            {
                Topic = request.Topic,
                Programme = request.Programme,
                ClientNeedId = request.ClientNeedId,
                Count = Math.Clamp(request.QuestionCount, 1, 10)
            };

            var generated = await _aiProvider.GenerateQuizAsync(aiRequest);

            return generated.Select(q => new AIDraftQuestionDto
            {
                Stem = q.Stem,
                Options = q.Options,
                CorrectOptionIndex = q.CorrectAnswerIndices.FirstOrDefault(),
                Rationale = q.Rationale,
                Difficulty = q.Difficulty.ToLowerInvariant(),
                QuestionTypeKey = q.QuestionTypeKey,
                IsAiGenerated = true
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI draft question generation encountered an error; falling back to mock generator");
            return new List<AIDraftQuestionDto>
            {
                new AIDraftQuestionDto
                {
                    Stem = $"A client with acute {request.Topic} is admitted to the medical-surgical unit. Which priority nursing intervention should the nurse implement first?",
                    Options = new List<string>
                    {
                        "Administer intravenous fluids as prescribed.",
                        "Perform an immediate focused cardiovascular and airway assessment.",
                        "Obtain baseline diagnostic laboratory specimens.",
                        "Provide client education regarding prescribed pharmacological regimen."
                    },
                    CorrectOptionIndex = 1,
                    Rationale = "Assessment is the foundational step of the nursing process. Immediate physiological stabilization takes priority before interventions.",
                    Difficulty = request.Difficulty ?? "moderate",
                    QuestionTypeKey = "single-choice",
                    IsAiGenerated = true
                }
            };
        }
    }

    // ── Mapping Helpers ──

    private static AdminStudyNoteDto MapNoteToAdminDto(StudyNote n)
    {
        return new AdminStudyNoteDto
        {
            Id = n.Id,
            UserId = n.UserId,
            AuthorEmail = n.User?.Email ?? string.Empty,
            AuthorName = n.User?.DisplayName ?? string.Empty,
            FolderId = n.FolderId,
            FolderName = n.Folder?.Name,
            Title = n.Title,
            ContentJson = n.ContentJson,
            ContentPlainText = n.ContentPlainText,
            Programme = n.Programme,
            SubjectDomainId = n.SubjectDomainId,
            TopicSlug = n.TopicSlug,
            TopicTitle = n.TopicTitle,
            ClientNeedId = n.ClientNeedId,
            Tags = SafeDeserializeTags(n.TagsJson),
            IsPinned = n.IsPinned,
            IsFavourite = n.IsFavourite,
            IsArchived = n.IsArchived,
            Status = n.Status,
            IsOfficial = n.IsOfficial,
            StudyGuideId = n.StudyGuideId,
            WordCount = n.WordCount,
            CharacterCount = n.CharacterCount,
            LastEditedAt = n.LastEditedAt,
            CreatedAt = n.CreatedAt,
            UpdatedAt = n.UpdatedAt
        };
    }

    private static AdminFlashcardDto MapCardToAdminDto(Flashcard c)
    {
        return new AdminFlashcardDto
        {
            Id = c.Id,
            DeckId = c.DeckId,
            DeckName = c.Deck?.Name ?? string.Empty,
            Front = c.Front,
            Back = c.Back,
            Explanation = c.Explanation,
            ImageUrl = c.ImageUrl,
            DiagramUrl = c.DiagramUrl,
            CardStyle = c.CardStyle,
            Difficulty = c.Difficulty,
            Programme = c.Programme,
            Status = c.Status,
            TopicTitle = c.TopicTitle,
            ClientNeedId = c.ClientNeedId,
            Tags = SafeDeserializeTags(c.TagsJson),
            DisplayOrder = c.DisplayOrder,
            RepetitionCount = c.RepetitionCount,
            EaseFactor = c.EaseFactor,
            IntervalDays = c.IntervalDays,
            DueAt = c.DueAt,
            LastReviewedAt = c.LastReviewedAt,
            CreatedAt = c.CreatedAt
        };
    }

    private static StudyReviewConfigurationDto MapReviewConfigToDto(StudyReviewConfiguration c)
    {
        return new StudyReviewConfigurationDto
        {
            Id = c.Id,
            MaxCardsPerSession = c.MaxCardsPerSession,
            DefaultCardLimit = c.DefaultCardLimit,
            SupportedModes = SafeDeserializeTags(c.SupportedModesJson),
            EnableRn = c.EnableRn,
            EnablePn = c.EnablePn,
            RequireSubscription = c.RequireSubscription,
            AllowCustomDrills = c.AllowCustomDrills,
            MinIntervalDays = c.MinIntervalDays,
            DefaultEaseFactor = c.DefaultEaseFactor,
            UpdatedAt = c.UpdatedAt,
            UpdatedBy = c.UpdatedBy
        };
    }

    private static List<string> SafeDeserializeTags(string? json)
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
}
