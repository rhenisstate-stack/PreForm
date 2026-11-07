using System.ComponentModel.DataAnnotations;

namespace Preform.Api.DTOs;

public class StudyFolderDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "teal";
    public string Icon { get; set; } = "Folder";
    public int DisplayOrder { get; set; }
    public bool IsArchived { get; set; }
    public int NoteCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateStudyFolderRequest
{
    [Required, MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(32)]
    public string Color { get; set; } = "teal";

    [MaxLength(64)]
    public string Icon { get; set; } = "Folder";
}

public class UpdateStudyFolderRequest
{
    [Required, MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(32)]
    public string Color { get; set; } = "teal";

    [MaxLength(64)]
    public string Icon { get; set; } = "Folder";

    public bool? IsArchived { get; set; }
}

public class StudyNoteDto
{
    public string Id { get; set; } = string.Empty;
    public string? FolderId { get; set; }
    public string? FolderName { get; set; }
    public string Title { get; set; } = string.Empty;
    public string ContentJson { get; set; } = "{}";
    public string ContentPlainText { get; set; } = string.Empty;
    public string Programme { get; set; } = "rn";
    public string? SubjectDomainId { get; set; }
    public string? TopicSlug { get; set; }
    public string? TopicTitle { get; set; }
    public string? ClientNeedId { get; set; }
    public List<string> Tags { get; set; } = new();
    public bool IsPinned { get; set; }
    public bool IsFavourite { get; set; }
    public bool IsArchived { get; set; }
    public int WordCount { get; set; }
    public int CharacterCount { get; set; }
    public DateTime LastEditedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class StudyNoteSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string? FolderId { get; set; }
    public string? FolderName { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Snippet { get; set; } = string.Empty;
    public string Programme { get; set; } = "rn";
    public string? TopicSlug { get; set; }
    public string? TopicTitle { get; set; }
    public string? ClientNeedId { get; set; }
    public List<string> Tags { get; set; } = new();
    public bool IsPinned { get; set; }
    public bool IsFavourite { get; set; }
    public bool IsArchived { get; set; }
    public int WordCount { get; set; }
    public DateTime LastEditedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateStudyNoteRequest
{
    [MaxLength(128)]
    public string? FolderId { get; set; }

    [Required, MaxLength(256)]
    public string Title { get; set; } = "Untitled Note";

    [Required]
    public string ContentJson { get; set; } = "{}";

    public string? ContentPlainText { get; set; }

    [MaxLength(10)]
    public string Programme { get; set; } = "rn";

    [MaxLength(128)]
    public string? SubjectDomainId { get; set; }

    [MaxLength(128)]
    public string? TopicSlug { get; set; }

    [MaxLength(160)]
    public string? TopicTitle { get; set; }

    [MaxLength(32)]
    public string? ClientNeedId { get; set; }

    public List<string>? Tags { get; set; }
}

public class UpdateStudyNoteRequest
{
    [MaxLength(128)]
    public string? FolderId { get; set; }

    [MaxLength(256)]
    public string? Title { get; set; }

    public string? ContentJson { get; set; }

    public string? ContentPlainText { get; set; }

    [MaxLength(10)]
    public string? Programme { get; set; }

    [MaxLength(128)]
    public string? SubjectDomainId { get; set; }

    [MaxLength(128)]
    public string? TopicSlug { get; set; }

    [MaxLength(160)]
    public string? TopicTitle { get; set; }

    [MaxLength(32)]
    public string? ClientNeedId { get; set; }

    public List<string>? Tags { get; set; }

    public bool? IsPinned { get; set; }
    public bool? IsFavourite { get; set; }
    public bool? IsArchived { get; set; }
}

public class StudyNoteVersionDto
{
    public string Id { get; set; } = string.Empty;
    public string NoteId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string ContentJson { get; set; } = "{}";
    public int WordCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class NoteFilterParameters
{
    public string? FolderId { get; set; }
    public string? Programme { get; set; }
    public string? SubjectDomainId { get; set; }
    public string? TopicSlug { get; set; }
    public string? ClientNeedId { get; set; }
    public string? Search { get; set; }
    public string? Tag { get; set; }
    public bool? IsPinned { get; set; }
    public bool? IsFavourite { get; set; }
    public bool IncludeArchived { get; set; } = false;
    public string SortBy { get; set; } = "lastEdited";
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class CreateNoteRequest : CreateStudyNoteRequest { }
public class UpdateNoteRequest : UpdateStudyNoteRequest { }
public class CreateFolderRequest : CreateStudyFolderRequest { }
public class UpdateFolderRequest : UpdateStudyFolderRequest { }
