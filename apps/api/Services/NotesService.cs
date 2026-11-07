using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

public class NotesService : INotesService
{
    private readonly AppDbContext _context;
    private readonly ILogger<NotesService> _logger;

    public NotesService(AppDbContext context, ILogger<NotesService> logger)
    {
        _context = context;
        _logger = logger;
    }

    private static List<string> ParseTags(string tagsJson)
    {
        try
        {
            return JsonSerializer.Deserialize<List<string>>(tagsJson) ?? new List<string>();
        }
        catch
        {
            return new List<string>();
        }
    }

    private static string SerializeTags(List<string>? tags)
    {
        return JsonSerializer.Serialize(tags ?? new List<string>());
    }

    // ── Folders ──

    public async Task<List<StudyFolderDto>> GetFoldersAsync(string userId, bool includeArchived = false, CancellationToken ct = default)
    {
        var query = _context.StudyFolders
            .AsNoTracking()
            .Where(f => f.UserId == userId);

        if (!includeArchived)
        {
            query = query.Where(f => !f.IsArchived);
        }

        var folders = await query
            .OrderBy(f => f.DisplayOrder)
            .ThenBy(f => f.Name)
            .Select(f => new StudyFolderDto
            {
                Id = f.Id,
                Name = f.Name,
                Color = f.Color,
                Icon = f.Icon,
                DisplayOrder = f.DisplayOrder,
                IsArchived = f.IsArchived,
                NoteCount = f.Notes.Count(n => !n.IsDeleted && !n.IsArchived),
                CreatedAt = f.CreatedAt,
                UpdatedAt = f.UpdatedAt
            })
            .ToListAsync(ct);

        return folders;
    }

    public async Task<StudyFolderDto> CreateFolderAsync(string userId, CreateStudyFolderRequest request, CancellationToken ct = default)
    {
        var folder = new StudyFolder
        {
            UserId = userId,
            Name = request.Name.Trim(),
            Color = string.IsNullOrWhiteSpace(request.Color) ? "teal" : request.Color.Trim(),
            Icon = string.IsNullOrWhiteSpace(request.Icon) ? "Folder" : request.Icon.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.StudyFolders.Add(folder);
        await _context.SaveChangesAsync(ct);

        return new StudyFolderDto
        {
            Id = folder.Id,
            Name = folder.Name,
            Color = folder.Color,
            Icon = folder.Icon,
            DisplayOrder = folder.DisplayOrder,
            IsArchived = folder.IsArchived,
            NoteCount = 0,
            CreatedAt = folder.CreatedAt,
            UpdatedAt = folder.UpdatedAt
        };
    }

    public async Task<StudyFolderDto> UpdateFolderAsync(string userId, string folderId, UpdateStudyFolderRequest request, CancellationToken ct = default)
    {
        var folder = await _context.StudyFolders
            .FirstOrDefaultAsync(f => f.Id == folderId && f.UserId == userId, ct);

        if (folder == null)
        {
            throw new KeyNotFoundException("Folder not found.");
        }

        folder.Name = request.Name.Trim();
        if (!string.IsNullOrWhiteSpace(request.Color)) folder.Color = request.Color.Trim();
        if (!string.IsNullOrWhiteSpace(request.Icon)) folder.Icon = request.Icon.Trim();
        if (request.IsArchived.HasValue) folder.IsArchived = request.IsArchived.Value;
        folder.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);

        var noteCount = await _context.StudyNotes.CountAsync(n => n.FolderId == folder.Id && !n.IsDeleted && !n.IsArchived, ct);

        return new StudyFolderDto
        {
            Id = folder.Id,
            Name = folder.Name,
            Color = folder.Color,
            Icon = folder.Icon,
            DisplayOrder = folder.DisplayOrder,
            IsArchived = folder.IsArchived,
            NoteCount = noteCount,
            CreatedAt = folder.CreatedAt,
            UpdatedAt = folder.UpdatedAt
        };
    }

    public async Task<bool> DeleteFolderAsync(string userId, string folderId, CancellationToken ct = default)
    {
        var folder = await _context.StudyFolders
            .FirstOrDefaultAsync(f => f.Id == folderId && f.UserId == userId, ct);

        if (folder == null) return false;

        // Cascade/SetNull on notes
        var notesInFolder = await _context.StudyNotes.Where(n => n.FolderId == folderId).ToListAsync(ct);
        foreach (var note in notesInFolder)
        {
            note.FolderId = null;
        }

        _context.StudyFolders.Remove(folder);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    // ── Notes ──

    public async Task<(List<StudyNoteSummaryDto> Notes, int TotalCount)> GetNotesAsync(
        string userId,
        string? folderId = null,
        string? programme = null,
        string? topicSlug = null,
        string? clientNeedId = null,
        string? search = null,
        string? tag = null,
        bool? isPinned = null,
        bool? isFavourite = null,
        bool includeArchived = false,
        string sortBy = "lastEdited",
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default)
    {
        var query = _context.StudyNotes
            .AsNoTracking()
            .Where(n => n.UserId == userId && !n.IsDeleted);

        if (!includeArchived)
        {
            query = query.Where(n => !n.IsArchived);
        }

        if (!string.IsNullOrWhiteSpace(folderId))
        {
            query = query.Where(n => n.FolderId == folderId);
        }

        if (!string.IsNullOrWhiteSpace(programme))
        {
            var p = programme.Trim().ToLowerInvariant();
            query = query.Where(n => n.Programme == p || n.Programme == "both");
        }

        if (!string.IsNullOrWhiteSpace(topicSlug))
        {
            query = query.Where(n => n.TopicSlug == topicSlug);
        }

        if (!string.IsNullOrWhiteSpace(clientNeedId))
        {
            query = query.Where(n => n.ClientNeedId == clientNeedId);
        }

        if (isPinned.HasValue)
        {
            query = query.Where(n => n.IsPinned == isPinned.Value);
        }

        if (isFavourite.HasValue)
        {
            query = query.Where(n => n.IsFavourite == isFavourite.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(n =>
                EF.Functions.ILike(n.Title, $"%{term}%") ||
                EF.Functions.ILike(n.ContentPlainText, $"%{term}%") ||
                EF.Functions.ILike(n.TagsJson, $"%{term}%"));
        }

        if (!string.IsNullOrWhiteSpace(tag))
        {
            var tagFilter = tag.Trim();
            query = query.Where(n => EF.Functions.ILike(n.TagsJson, $"%{tagFilter}%"));
        }

        var totalCount = await query.CountAsync(ct);

        IOrderedQueryable<StudyNote> orderedQuery = sortBy switch
        {
            "created" => query.OrderByDescending(n => n.IsPinned).ThenByDescending(n => n.CreatedAt),
            "title" => query.OrderByDescending(n => n.IsPinned).ThenBy(n => n.Title),
            _ => query.OrderByDescending(n => n.IsPinned).ThenByDescending(n => n.LastEditedAt)
        };

        var notes = await orderedQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new StudyNoteSummaryDto
            {
                Id = n.Id,
                FolderId = n.FolderId,
                FolderName = n.Folder != null ? n.Folder.Name : null,
                Title = n.Title,
                Snippet = n.ContentPlainText.Length > 150 ? n.ContentPlainText.Substring(0, 150) + "..." : n.ContentPlainText,
                Programme = n.Programme,
                TopicSlug = n.TopicSlug,
                TopicTitle = n.TopicTitle,
                ClientNeedId = n.ClientNeedId,
                Tags = ParseTags(n.TagsJson),
                IsPinned = n.IsPinned,
                IsFavourite = n.IsFavourite,
                IsArchived = n.IsArchived,
                WordCount = n.WordCount,
                LastEditedAt = n.LastEditedAt,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync(ct);

        return (notes, totalCount);
    }

    public async Task<StudyNoteDto> GetNoteByIdAsync(string userId, string noteId, CancellationToken ct = default)
    {
        var note = await _context.StudyNotes
            .AsNoTracking()
            .Include(n => n.Folder)
            .FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId && !n.IsDeleted, ct);

        if (note == null)
        {
            throw new KeyNotFoundException("Note not found.");
        }

        return MapNote(note);
    }

    public async Task<StudyNoteDto> CreateNoteAsync(string userId, CreateStudyNoteRequest request, CancellationToken ct = default)
    {
        var plainText = request.ContentPlainText ?? string.Empty;
        var words = string.IsNullOrWhiteSpace(plainText) ? 0 : plainText.Split(new[] { ' ', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries).Length;

        var note = new StudyNote
        {
            UserId = userId,
            FolderId = request.FolderId,
            Title = string.IsNullOrWhiteSpace(request.Title) ? "Untitled Note" : request.Title.Trim(),
            ContentJson = string.IsNullOrWhiteSpace(request.ContentJson) ? "{}" : request.ContentJson,
            ContentPlainText = plainText,
            Programme = string.IsNullOrWhiteSpace(request.Programme) ? "rn" : request.Programme.Trim().ToLowerInvariant(),
            SubjectDomainId = request.SubjectDomainId,
            TopicSlug = request.TopicSlug,
            TopicTitle = request.TopicTitle,
            ClientNeedId = request.ClientNeedId,
            TagsJson = SerializeTags(request.Tags),
            WordCount = words,
            CharacterCount = plainText.Length,
            LastEditedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.StudyNotes.Add(note);

        // Initial version snapshot
        var initialVersion = new StudyNoteVersion
        {
            NoteId = note.Id,
            Title = note.Title,
            ContentJson = note.ContentJson,
            WordCount = note.WordCount,
            CreatedAt = DateTime.UtcNow
        };
        _context.StudyNoteVersions.Add(initialVersion);

        await _context.SaveChangesAsync(ct);

        return MapNote(note);
    }

    public async Task<StudyNoteDto> UpdateNoteAsync(string userId, string noteId, UpdateStudyNoteRequest request, CancellationToken ct = default)
    {
        var note = await _context.StudyNotes
            .Include(n => n.Folder)
            .FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId && !n.IsDeleted, ct);

        if (note == null)
        {
            throw new KeyNotFoundException("Note not found.");
        }

        bool contentChanged = false;

        if (request.Title != null)
        {
            note.Title = string.IsNullOrWhiteSpace(request.Title) ? "Untitled Note" : request.Title.Trim();
            contentChanged = true;
        }

        if (request.ContentJson != null)
        {
            note.ContentJson = request.ContentJson;
            contentChanged = true;
        }

        if (request.ContentPlainText != null)
        {
            note.ContentPlainText = request.ContentPlainText;
            note.CharacterCount = request.ContentPlainText.Length;
            note.WordCount = request.ContentPlainText.Split(new[] { ' ', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries).Length;
            contentChanged = true;
        }

        if (request.FolderId != null) note.FolderId = string.IsNullOrWhiteSpace(request.FolderId) ? null : request.FolderId;
        if (request.Programme != null) note.Programme = request.Programme.Trim().ToLowerInvariant();
        if (request.SubjectDomainId != null) note.SubjectDomainId = request.SubjectDomainId;
        if (request.TopicSlug != null) note.TopicSlug = request.TopicSlug;
        if (request.TopicTitle != null) note.TopicTitle = request.TopicTitle;
        if (request.ClientNeedId != null) note.ClientNeedId = request.ClientNeedId;
        if (request.Tags != null) note.TagsJson = SerializeTags(request.Tags);
        if (request.IsPinned.HasValue) note.IsPinned = request.IsPinned.Value;
        if (request.IsFavourite.HasValue) note.IsFavourite = request.IsFavourite.Value;
        if (request.IsArchived.HasValue) note.IsArchived = request.IsArchived.Value;

        note.LastEditedAt = DateTime.UtcNow;
        note.UpdatedAt = DateTime.UtcNow;

        if (contentChanged)
        {
            var version = new StudyNoteVersion
            {
                NoteId = note.Id,
                Title = note.Title,
                ContentJson = note.ContentJson,
                WordCount = note.WordCount,
                CreatedAt = DateTime.UtcNow
            };
            _context.StudyNoteVersions.Add(version);
        }

        await _context.SaveChangesAsync(ct);
        return MapNote(note);
    }

    public async Task<StudyNoteDto> DuplicateNoteAsync(string userId, string noteId, CancellationToken ct = default)
    {
        var original = await _context.StudyNotes
            .AsNoTracking()
            .FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId && !n.IsDeleted, ct);

        if (original == null)
        {
            throw new KeyNotFoundException("Original note not found.");
        }

        var duplicate = new StudyNote
        {
            UserId = userId,
            FolderId = original.FolderId,
            Title = $"{original.Title} (Copy)",
            ContentJson = original.ContentJson,
            ContentPlainText = original.ContentPlainText,
            Programme = original.Programme,
            SubjectDomainId = original.SubjectDomainId,
            TopicSlug = original.TopicSlug,
            TopicTitle = original.TopicTitle,
            ClientNeedId = original.ClientNeedId,
            TagsJson = original.TagsJson,
            WordCount = original.WordCount,
            CharacterCount = original.CharacterCount,
            IsPinned = false,
            IsFavourite = false,
            IsArchived = false,
            IsDeleted = false,
            LastEditedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.StudyNotes.Add(duplicate);
        await _context.SaveChangesAsync(ct);

        return MapNote(duplicate);
    }

    public async Task<bool> SoftDeleteNoteAsync(string userId, string noteId, CancellationToken ct = default)
    {
        var note = await _context.StudyNotes
            .FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId && !n.IsDeleted, ct);

        if (note == null) return false;

        note.IsDeleted = true;
        note.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> RestoreNoteAsync(string userId, string noteId, CancellationToken ct = default)
    {
        var note = await _context.StudyNotes
            .FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId && n.IsDeleted, ct);

        if (note == null) return false;

        note.IsDeleted = false;
        note.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> PermanentDeleteNoteAsync(string userId, string noteId, CancellationToken ct = default)
    {
        var note = await _context.StudyNotes
            .FirstOrDefaultAsync(n => n.Id == noteId && n.UserId == userId, ct);

        if (note == null) return false;

        _context.StudyNotes.Remove(note);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<List<StudyNoteVersionDto>> GetNoteVersionsAsync(string userId, string noteId, CancellationToken ct = default)
    {
        // verify ownership
        var exists = await _context.StudyNotes.AnyAsync(n => n.Id == noteId && n.UserId == userId, ct);
        if (!exists) throw new KeyNotFoundException("Note not found.");

        return await _context.StudyNoteVersions
            .AsNoTracking()
            .Where(v => v.NoteId == noteId)
            .OrderByDescending(v => v.CreatedAt)
            .Take(20)
            .Select(v => new StudyNoteVersionDto
            {
                Id = v.Id,
                NoteId = v.NoteId,
                Title = v.Title,
                ContentJson = v.ContentJson,
                WordCount = v.WordCount,
                CreatedAt = v.CreatedAt
            })
            .ToListAsync(ct);
    }

    private static StudyNoteDto MapNote(StudyNote note) => new()
    {
        Id = note.Id,
        FolderId = note.FolderId,
        FolderName = note.Folder != null ? note.Folder.Name : null,
        Title = note.Title,
        ContentJson = note.ContentJson,
        ContentPlainText = note.ContentPlainText,
        Programme = note.Programme,
        SubjectDomainId = note.SubjectDomainId,
        TopicSlug = note.TopicSlug,
        TopicTitle = note.TopicTitle,
        ClientNeedId = note.ClientNeedId,
        Tags = ParseTags(note.TagsJson),
        IsPinned = note.IsPinned,
        IsFavourite = note.IsFavourite,
        IsArchived = note.IsArchived,
        WordCount = note.WordCount,
        CharacterCount = note.CharacterCount,
        LastEditedAt = note.LastEditedAt,
        CreatedAt = note.CreatedAt,
        UpdatedAt = note.UpdatedAt
    };
}
