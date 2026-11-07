using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

/// <summary>
/// Personal AI Study Studio flashcard management. Every operation is scoped to
/// the authenticated learner — learners can never read or mutate another
/// user's decks, cards or review history.
/// </summary>
public interface IFlashcardService
{
    // Decks
    Task<FlashcardDeckDto> CreateDeckAsync(
        string userId, string email, CreateFlashcardDeckRequest request, CancellationToken ct);

    Task<List<FlashcardDeckDto>> GetDecksAsync(string userId, bool includeArchived, CancellationToken ct);

    Task<FlashcardDeckDto> GetDeckAsync(string userId, string deckId, CancellationToken ct);

    Task<FlashcardDeckDto> UpdateDeckAsync(
        string userId, string deckId, UpdateFlashcardDeckRequest request, CancellationToken ct);

    Task<FlashcardDeckDto> DuplicateDeckAsync(string userId, string deckId, CancellationToken ct);

    Task<bool> ArchiveDeckAsync(string userId, string deckId, CancellationToken ct);

    Task<bool> DeleteDeckAsync(string userId, string deckId, CancellationToken ct);

    // Cards
    Task<List<FlashcardDto>> GetDeckCardsAsync(string userId, string deckId, CancellationToken ct);

    Task<FlashcardDto> GetCardAsync(string userId, string cardId, CancellationToken ct);

    Task<FlashcardDto> AddCardAsync(
        string userId, string deckId, CreateFlashcardRequest request, CancellationToken ct);

    Task<FlashcardDto> UpdateCardAsync(
        string userId, string cardId, UpdateFlashcardRequest request, CancellationToken ct);

    Task<FlashcardDto> MoveCardAsync(
        string userId, string cardId, MoveFlashcardRequest request, CancellationToken ct);

    Task<bool> DeleteCardAsync(string userId, string cardId, CancellationToken ct);

    Task<FlashcardDto> DuplicateCardAsync(string userId, string cardId, CancellationToken ct);

    Task<bool> ReorderCardsAsync(string userId, string deckId, List<string> cardIdsInOrder, CancellationToken ct);

    Task<bool> ToggleCardFavouriteAsync(string userId, string cardId, CancellationToken ct);

    Task<bool> ToggleCardDifficultAsync(string userId, string cardId, CancellationToken ct);

    // Spaced repetition & Review
    Task<List<FlashcardDto>> GetDueCardsAsync(string userId, string? programme, int limit, CancellationToken ct);

    Task<ReviewFlashcardResponse> ReviewCardAsync(
        string userId, string cardId, RecallRating rating, CancellationToken ct);

    Task<List<FlashcardReviewDto>> GetCardReviewsAsync(string userId, string cardId, CancellationToken ct);

    Task<StudyFlashcardsOverviewDto> GetOverviewAsync(string userId, CancellationToken ct);
}
