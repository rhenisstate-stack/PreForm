using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Preform.Api.DTOs;
using Preform.Api.Services;

namespace Preform.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/study")]
public class StudyNotesController : ControllerBase
{
    private readonly INotesService _notesService;
    private readonly ILogger<StudyNotesController> _logger;

    public StudyNotesController(INotesService notesService, ILogger<StudyNotesController> logger)
    {
        _notesService = notesService;
        _logger = logger;
    }

    private string? GetAuthenticatedUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value?.Trim();
    }

    private IActionResult RequireAuth(out string userId)
    {
        var uid = GetAuthenticatedUserId();
        if (string.IsNullOrWhiteSpace(uid))
        {
            userId = string.Empty;
            return Unauthorized(new { success = false, error = "Authentication required." });
        }
        userId = uid;
        return null!;
    }

    // ── Notes ──

    [HttpGet("notes")]
    public async Task<IActionResult> GetNotes([FromQuery] NoteFilterParameters parameters)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        var result = await _notesService.GetNotesAsync(userId, parameters);
        return Ok(new { success = true, result });
    }

    [HttpGet("notes/{noteId}")]
    public async Task<IActionResult> GetNote(string noteId)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        var note = await _notesService.GetNoteByIdAsync(userId, noteId);
        if (note == null) return NotFound(new { success = false, error = "Note not found." });

        return Ok(new { success = true, note });
    }

    [HttpPost("notes")]
    public async Task<IActionResult> CreateNote([FromBody] CreateNoteRequest request)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        try
        {
            var note = await _notesService.CreateNoteAsync(userId, request);
            return CreatedAtAction(nameof(GetNote), new { noteId = note.Id }, new { success = true, note });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, error = ex.Message });
        }
    }

    [HttpPut("notes/{noteId}")]
    public async Task<IActionResult> UpdateNote(string noteId, [FromBody] UpdateNoteRequest request)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        try
        {
            var note = await _notesService.UpdateNoteAsync(userId, noteId, request);
            return Ok(new { success = true, note });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { success = false, error = "Note not found." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, error = ex.Message });
        }
    }

    [HttpDelete("notes/{noteId}")]
    public async Task<IActionResult> DeleteNote(string noteId)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        var deleted = await _notesService.DeleteNoteAsync(userId, noteId);
        if (!deleted) return NotFound(new { success = false, error = "Note not found." });

        return Ok(new { success = true, message = "Note deleted." });
    }

    [HttpPost("notes/{noteId}/restore")]
    public async Task<IActionResult> RestoreNote(string noteId)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        var restored = await _notesService.RestoreNoteAsync(userId, noteId);
        if (!restored) return NotFound(new { success = false, error = "Note not found in trash." });

        return Ok(new { success = true, message = "Note restored." });
    }

    [HttpPost("notes/{noteId}/duplicate")]
    public async Task<IActionResult> DuplicateNote(string noteId)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        try
        {
            var note = await _notesService.DuplicateNoteAsync(userId, noteId);
            return Ok(new { success = true, note });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { success = false, error = "Note not found." });
        }
    }

    [HttpPost("notes/{noteId}/toggle-pin")]
    public async Task<IActionResult> TogglePin(string noteId)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        try
        {
            var note = await _notesService.TogglePinAsync(userId, noteId);
            return Ok(new { success = true, note });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { success = false, error = "Note not found." });
        }
    }

    [HttpPost("notes/{noteId}/toggle-favourite")]
    public async Task<IActionResult> ToggleFavourite(string noteId)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        try
        {
            var note = await _notesService.ToggleFavouriteAsync(userId, noteId);
            return Ok(new { success = true, note });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { success = false, error = "Note not found." });
        }
    }

    [HttpPost("notes/{noteId}/archive")]
    public async Task<IActionResult> ArchiveNote(string noteId)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        var archived = await _notesService.ArchiveNoteAsync(userId, noteId);
        if (!archived) return NotFound(new { success = false, error = "Note not found." });

        return Ok(new { success = true, message = "Note archived." });
    }

    [HttpGet("notes/{noteId}/versions")]
    public async Task<IActionResult> GetNoteVersions(string noteId)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        try
        {
            var versions = await _notesService.GetNoteVersionsAsync(userId, noteId);
            return Ok(new { success = true, versions });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { success = false, error = "Note not found." });
        }
    }

    // ── Folders ──

    [HttpGet("folders")]
    public async Task<IActionResult> GetFolders([FromQuery] string? programme = null)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        var folders = await _notesService.GetFoldersAsync(userId, programme);
        return Ok(new { success = true, count = folders.Count, folders });
    }

    [HttpPost("folders")]
    public async Task<IActionResult> CreateFolder([FromBody] CreateFolderRequest request)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        try
        {
            var folder = await _notesService.CreateFolderAsync(userId, request);
            return CreatedAtAction(nameof(GetFolders), null, new { success = true, folder });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, error = ex.Message });
        }
    }

    [HttpPut("folders/{folderId}")]
    public async Task<IActionResult> UpdateFolder(string folderId, [FromBody] UpdateFolderRequest request)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        try
        {
            var folder = await _notesService.UpdateFolderAsync(userId, folderId, request);
            return Ok(new { success = true, folder });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { success = false, error = "Folder not found." });
        }
    }

    [HttpDelete("folders/{folderId}")]
    public async Task<IActionResult> DeleteFolder(string folderId)
    {
        var auth = RequireAuth(out var userId);
        if (auth != null) return auth;

        var deleted = await _notesService.DeleteFolderAsync(userId, folderId);
        if (!deleted) return NotFound(new { success = false, error = "Folder not found." });

        return Ok(new { success = true, message = "Folder deleted." });
    }
}
