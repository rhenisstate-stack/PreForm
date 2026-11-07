using Preform.Api.DTOs;

namespace Preform.Api.Services;

public interface INotesService
{
    // Folders
    Task<List<StudyFolderDto>> GetFoldersAsync(string userId, bool includeArchived = false, CancellationToken ct = default);
    Task<StudyFolderDto> CreateFolderAsync(string userId, CreateStudyFolderRequest request, CancellationToken ct = default);
    Task<StudyFolderDto> UpdateFolderAsync(string userId, string folderId, UpdateStudyFolderRequest request, CancellationToken ct = default);
    Task<bool> DeleteFolderAsync(string userId, string folderId, CancellationToken ct = default);

    // Notes
    Task<(List<StudyNoteSummaryDto> Notes, int TotalCount)> GetNotesAsync(
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
        string sortBy = "lastEdited", // "lastEdited" | "created" | "title"
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default);

    Task<StudyNoteDto> GetNoteByIdAsync(string userId, string noteId, CancellationToken ct = default);
    Task<StudyNoteDto> CreateNoteAsync(string userId, CreateStudyNoteRequest request, CancellationToken ct = default);
    Task<StudyNoteDto> UpdateNoteAsync(string userId, string noteId, UpdateStudyNoteRequest request, CancellationToken ct = default);
    Task<StudyNoteDto> DuplicateNoteAsync(string userId, string noteId, CancellationToken ct = default);
    Task<bool> SoftDeleteNoteAsync(string userId, string noteId, CancellationToken ct = default);
    Task<bool> RestoreNoteAsync(string userId, string noteId, CancellationToken ct = default);
    Task<bool> PermanentDeleteNoteAsync(string userId, string noteId, CancellationToken ct = default);

    // Versions
    Task<List<StudyNoteVersionDto>> GetNoteVersionsAsync(string userId, string noteId, CancellationToken ct = default);
}
