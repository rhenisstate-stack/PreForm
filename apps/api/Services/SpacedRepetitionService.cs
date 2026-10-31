namespace Preform.Api.Services;

/// <summary>
/// Learner recall ratings for the PrepFord flashcard review flow.
/// These are spaced-repetition scheduling signals only — they are entirely
/// separate from the CAT question-selection engine and from formal
/// examination scoring.
/// </summary>
public enum RecallRating
{
    /// <summary>I could not recall it.</summary>
    Again = 0,

    /// <summary>I recalled it with difficulty.</summary>
    Hard = 1,

    /// <summary>I recalled it correctly.</summary>
    Good = 2,

    /// <summary>I knew it confidently.</summary>
    Easy = 3
}

public record SpacedRepetitionUpdate(
    int IntervalDays,
    double EaseFactor,
    int RepetitionCount,
    DateTime NextDueAt);

/// <summary>
/// Server-authoritative spaced-repetition scheduling.
/// </summary>
public interface ISpacedRepetitionService
{
    /// <summary>
    /// Computes the next review schedule for a flashcard given the learner's recall rating.
    /// Calculations live on the backend so client clock/skew or replayed payloads can never
    /// produce inconsistent schedules.
    /// </summary>
    SpacedRepetitionUpdate Schedule(
        RecallRating rating,
        int previousIntervalDays,
        double previousEaseFactor,
        int previousRepetitionCount,
        DateTime reviewTimeUtc);
}

/// <summary>
/// PrepFord SM-2 implementation (documented variant of Piotr Wozniak's SM-2).
///
/// <list type="bullet">
/// <item>Again: the card is re-learned. Repetition count resets to 0, ease factor drops
/// by 0.20 (floored at 1.30) and the card is due again tomorrow.</item>
/// <item>Hard: ease factor drops by 0.15; interval grows by a conservative 1.2x factor
/// (minimum 1 day); repetition count is preserved.</item>
/// <item>Good: classic SM-2 growth — first repetition is due in 1 day, second in 6 days,
/// subsequent intervals use round(previous interval x ease factor).</item>
/// <item>Easy: like Good plus a 0.15 ease bonus and a 1.3x interval multiplier;
/// a first Easy recall is still due no sooner than 3 days out.</item>
/// </list>
/// Ease factor is clamped to [1.30, 3.00]. All intervals are whole days and the
/// next due timestamp always uses server time.
/// </summary>
public class SpacedRepetitionService : ISpacedRepetitionService
{
    private const double MinEaseFactor = 1.30;
    private const double MaxEaseFactor = 3.00;

    public SpacedRepetitionUpdate Schedule(
        RecallRating rating,
        int previousIntervalDays,
        double previousEaseFactor,
        int previousRepetitionCount,
        DateTime reviewTimeUtc)
    {
        var ease = Math.Clamp(previousEaseFactor, MinEaseFactor, MaxEaseFactor);
        var interval = Math.Max(0, previousIntervalDays);
        var repetition = Math.Max(0, previousRepetitionCount);

        switch (rating)
        {
            case RecallRating.Again:
                repetition = 0;
                ease = Math.Max(MinEaseFactor, ease - 0.20);
                interval = 1;
                break;

            case RecallRating.Hard:
                ease = Math.Max(MinEaseFactor, ease - 0.15);
                repetition = Math.Max(1, repetition);
                interval = Math.Max(1, (int)Math.Round(Math.Max(interval, 1) * 1.2));
                break;

            case RecallRating.Good:
                repetition += 1;
                if (repetition == 1)
                {
                    interval = 1;
                }
                else if (repetition == 2)
                {
                    interval = 6;
                }
                else
                {
                    interval = Math.Max(interval + 1, (int)Math.Round(interval * ease));
                }
                break;

            case RecallRating.Easy:
                repetition += 1;
                ease = Math.Min(MaxEaseFactor, ease + 0.15);
                var baseInterval = repetition == 1 ? 3
                    : repetition == 2 ? 6
                    : Math.Max(interval + 1, (int)Math.Round(interval * ease));
                interval = Math.Max(2, (int)Math.Round(baseInterval * 1.3));
                break;

            default:
                throw new ArgumentOutOfRangeException(nameof(rating), rating, "Unknown recall rating.");
        }

        interval = Math.Clamp(interval, 1, 365 * 2);
        var nextDueAt = reviewTimeUtc.AddDays(interval);

        return new SpacedRepetitionUpdate(interval, ease, repetition, nextDueAt);
    }
}
