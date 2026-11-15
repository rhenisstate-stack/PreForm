using System.Globalization;
using System.Text.Json;

namespace Preform.Api.Services.Grading;

/// <summary>
/// Server-authoritative graders for all 11 structured and NGN question types.
/// Matches the canonical schemas in QuestionTypeRegistry and frontend question-types.ts.
/// </summary>
public sealed class StructuredQuestionGrader : IQuestionGrader
{
    public string QuestionTypeKey { get; }
    public bool SupportsAutomaticGrading => true;

    public StructuredQuestionGrader(string questionTypeKey)
    {
        QuestionTypeKey = questionTypeKey;
    }

    public Task<GradingResult> GradeAsync(
        QuestionGradingContext context,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(context.StructuredContentJson))
        {
            return Task.FromResult(GradingResult.UngradedResult(
                $"No authoritative structured answer key is defined for '{QuestionTypeKey}'."));
        }

        if (string.IsNullOrWhiteSpace(context.ResponsePayload))
        {
            return Task.FromResult(GradingResult.Unsupported(
                $"Response payload is required for structured question type '{QuestionTypeKey}'."));
        }

        JsonDocument keyDoc;
        try
        {
            keyDoc = JsonDocument.Parse(context.StructuredContentJson);
        }
        catch (JsonException)
        {
            return Task.FromResult(GradingResult.UngradedResult(
                "Authoritative structured content JSON is malformed."));
        }

        JsonDocument respDoc;
        try
        {
            respDoc = JsonDocument.Parse(context.ResponsePayload);
        }
        catch (JsonException)
        {
            keyDoc.Dispose();
            return Task.FromResult(GradingResult.Unsupported(
                "Candidate structured response payload is malformed JSON."));
        }

        using (keyDoc)
        using (respDoc)
        {
            if (keyDoc.RootElement.ValueKind != JsonValueKind.Object)
            {
                return Task.FromResult(GradingResult.UngradedResult(
                    "Authoritative structured content must be a JSON object."));
            }

            if (respDoc.RootElement.ValueKind != JsonValueKind.Object)
            {
                return Task.FromResult(GradingResult.Unsupported(
                    "Candidate structured response must be a JSON object."));
            }

            var result = QuestionTypeKey.ToLowerInvariant() switch
            {
                "drag-drop" => GradeDragDrop(keyDoc.RootElement, respDoc.RootElement, context.MaxScore),
                "ordering" => GradeOrdering(keyDoc.RootElement, respDoc.RootElement, context.MaxScore),
                "case-study" => GradeCaseStudy(keyDoc.RootElement, respDoc.RootElement, context.MaxScore),
                "essay" => GradeEssay(keyDoc.RootElement, respDoc.RootElement, context.MaxScore),
                "matching" => GradeMatching(keyDoc.RootElement, respDoc.RootElement, context.MaxScore),
                "fill-blank" => GradeFillBlank(keyDoc.RootElement, respDoc.RootElement, context.MaxScore),
                "matrix" => GradeMatrix(keyDoc.RootElement, respDoc.RootElement, context.MaxScore),
                "numeric" => GradeNumeric(keyDoc.RootElement, respDoc.RootElement, context.MaxScore),
                "tabular" => GradeTabular(keyDoc.RootElement, respDoc.RootElement, context.MaxScore),
                "short-answer" => GradeShortAnswer(keyDoc.RootElement, respDoc.RootElement, context.MaxScore),
                "dynamic-lab" => GradeDynamicLab(keyDoc.RootElement, respDoc.RootElement, context.MaxScore),
                _ => GradingResult.Unsupported($"Unsupported structured question type '{QuestionTypeKey}'."),
            };

            return Task.FromResult(result);
        }
    }

    private static GradingResult GradeDragDrop(JsonElement key, JsonElement resp, decimal maxScore)
    {
        if (!key.TryGetProperty("items", out var itemsEl) || itemsEl.ValueKind != JsonValueKind.Array || itemsEl.GetArrayLength() == 0)
        {
            return GradingResult.UngradedResult("Drag-and-drop question has no items configured.");
        }

        if (!resp.TryGetProperty("assignments", out var assignEl) || assignEl.ValueKind != JsonValueKind.Object)
        {
            return GradingResult.Unsupported("Drag-and-drop response requires an 'assignments' object.");
        }

        int total = 0;
        int matched = 0;
        foreach (var item in itemsEl.EnumerateArray())
        {
            var id = item.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
            var target = item.TryGetProperty("targetCategory", out var tcEl) ? tcEl.GetString() : null;
            if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(target)) continue;

            total++;
            if (assignEl.TryGetProperty(id, out var chosenEl) &&
                string.Equals(chosenEl.GetString()?.Trim(), target.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                matched++;
            }
        }

        if (total == 0) return GradingResult.UngradedResult("Drag-and-drop question has no valid target categories.");

        bool isCorrect = matched == total;
        decimal score = Math.Round(maxScore * matched / total, 2);
        return isCorrect
            ? GradingResult.Correct(maxScore, maxScore, $"All {total} drag-and-drop items placed in the correct categories.")
            : GradingResult.Incorrect(score, maxScore, $"Placed {matched} of {total} items in the correct categories.");
    }

    private static GradingResult GradeOrdering(JsonElement key, JsonElement resp, decimal maxScore)
    {
        if (!key.TryGetProperty("correctOrder", out var correctEl) || correctEl.ValueKind != JsonValueKind.Array || correctEl.GetArrayLength() == 0)
        {
            return GradingResult.UngradedResult("Ordering question has no 'correctOrder' key.");
        }

        var expected = new List<int>();
        foreach (var el in correctEl.EnumerateArray())
        {
            if (el.TryGetInt32(out var idx)) expected.Add(idx);
        }

        var actual = new List<int>();
        if (resp.TryGetProperty("order", out var orderEl) && orderEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var el in orderEl.EnumerateArray())
            {
                if (el.TryGetInt32(out var idx)) actual.Add(idx);
            }
        }
        else if (resp.TryGetProperty("orderedSteps", out var stepsRespEl) && stepsRespEl.ValueKind == JsonValueKind.Array
                 && key.TryGetProperty("steps", out var stepsKeyEl) && stepsKeyEl.ValueKind == JsonValueKind.Array)
        {
            var keySteps = stepsKeyEl.EnumerateArray().Select(s => s.GetString() ?? string.Empty).ToList();
            foreach (var s in stepsRespEl.EnumerateArray())
            {
                var idx = keySteps.IndexOf(s.GetString() ?? string.Empty);
                if (idx >= 0) actual.Add(idx);
            }
        }
        else
        {
            return GradingResult.Unsupported("Ordering response requires an 'order' or 'orderedSteps' array.");
        }

        if (actual.Count != expected.Count || actual.Distinct().Count() != expected.Count)
        {
            return GradingResult.Unsupported("Ordering response must contain each step index exactly once.");
        }

        bool isCorrect = expected.SequenceEqual(actual);
        return isCorrect
            ? GradingResult.Correct(maxScore, maxScore, "Sequence matches the authoritative priority order.")
            : GradingResult.Incorrect(0m, maxScore, "Sequence does not match the authoritative priority order.");
    }

    private static GradingResult GradeCaseStudy(JsonElement key, JsonElement resp, decimal maxScore)
    {
        if (!key.TryGetProperty("cjmmItems", out var itemsEl) || itemsEl.ValueKind != JsonValueKind.Array || itemsEl.GetArrayLength() == 0)
        {
            return GradingResult.UngradedResult("Case study has no CJMM items configured.");
        }

        if (!resp.TryGetProperty("answers", out var answersEl) || answersEl.ValueKind != JsonValueKind.Object)
        {
            return GradingResult.Unsupported("Case study response requires an 'answers' object.");
        }

        int total = 0;
        int correctItems = 0;
        foreach (var item in itemsEl.EnumerateArray())
        {
            var itemNum = item.TryGetProperty("itemNumber", out var numEl) && numEl.TryGetInt32(out var n)
                ? n.ToString(CultureInfo.InvariantCulture)
                : (total + 1).ToString(CultureInfo.InvariantCulture);

            if (!item.TryGetProperty("correctAnswers", out var caEl) || caEl.ValueKind != JsonValueKind.Array) continue;
            var expectedSet = caEl.EnumerateArray()
                .Select(e => e.GetString()?.Trim())
                .Where(s => !string.IsNullOrEmpty(s))
                .ToHashSet(StringComparer.OrdinalIgnoreCase)!;

            if (expectedSet.Count == 0) continue;
            total++;

            if (answersEl.TryGetProperty(itemNum, out var selectedEl) && selectedEl.ValueKind == JsonValueKind.Array)
            {
                var actualSet = selectedEl.EnumerateArray()
                    .Select(e => e.GetString()?.Trim())
                    .Where(s => !string.IsNullOrEmpty(s))
                    .ToHashSet(StringComparer.OrdinalIgnoreCase)!;

                if (expectedSet.SetEquals(actualSet))
                {
                    correctItems++;
                }
            }
        }

        if (total == 0) return GradingResult.UngradedResult("Case study has no gradable CJMM items.");

        bool isCorrect = correctItems == total;
        decimal score = Math.Round(maxScore * correctItems / total, 2);
        return isCorrect
            ? GradingResult.Correct(maxScore, maxScore, $"All {total} CJMM clinical judgment steps answered correctly.")
            : GradingResult.Incorrect(score, maxScore, $"Answered {correctItems} of {total} CJMM steps correctly.");
    }

    private static GradingResult GradeEssay(JsonElement key, JsonElement resp, decimal maxScore)
    {
        JsonElement textEl;
        if (!resp.TryGetProperty("text", out textEl) && !resp.TryGetProperty("essayText", out textEl))
        {
            return GradingResult.Unsupported("Essay response requires a 'text' or 'essayText' string.");
        }
        if (textEl.ValueKind != JsonValueKind.String)
        {
            return GradingResult.Unsupported("Essay response text must be a string.");
        }

        var text = (textEl.GetString() ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(text))
        {
            return GradingResult.Unsupported("Essay response cannot be empty.");
        }

        var wordCount = text.Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries).Length;
        int minWords = key.TryGetProperty("minWords", out var minEl) && minEl.TryGetInt32(out var minVal) ? minVal : 1;
        int maxWords = key.TryGetProperty("maxWords", out var maxEl) && maxEl.TryGetInt32(out var maxVal) ? maxVal : 5000;

        if (wordCount > maxWords)
        {
            return GradingResult.Unsupported($"Essay response has {wordCount} word(s); maximum allowed is {maxWords}.");
        }

        var lengthNote = wordCount < minWords
            ? $" (below recommended minimum of {minWords} words)"
            : string.Empty;

        return GradingResult.PendingManualReviewResult(
            maxScore,
            $"Clinical essay submitted ({wordCount} words{lengthNote}) and queued for manual rubric review.");
    }

    private static GradingResult GradeMatching(JsonElement key, JsonElement resp, decimal maxScore)
    {
        if (!key.TryGetProperty("pairs", out var pairsEl) || pairsEl.ValueKind != JsonValueKind.Array || pairsEl.GetArrayLength() == 0)
        {
            return GradingResult.UngradedResult("Matching question has no pairs configured.");
        }

        if (!resp.TryGetProperty("matches", out var matchesEl) || matchesEl.ValueKind != JsonValueKind.Object)
        {
            return GradingResult.Unsupported("Matching response requires a 'matches' object.");
        }

        int total = 0;
        int matched = 0;
        foreach (var pair in pairsEl.EnumerateArray())
        {
            var id = pair.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
            var def = pair.TryGetProperty("definition", out var defEl) ? defEl.GetString() : null;
            if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(def)) continue;

            total++;
            if (matchesEl.TryGetProperty(id, out var chosenEl) &&
                string.Equals(chosenEl.GetString()?.Trim(), def.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                matched++;
            }
        }

        if (total == 0) return GradingResult.UngradedResult("Matching question has no valid pairs.");

        bool isCorrect = matched == total;
        decimal score = Math.Round(maxScore * matched / total, 2);
        return isCorrect
            ? GradingResult.Correct(maxScore, maxScore, $"All {total} clinical pairs matched correctly.")
            : GradingResult.Incorrect(score, maxScore, $"Matched {matched} of {total} clinical pairs.");
    }

    private static GradingResult GradeFillBlank(JsonElement key, JsonElement resp, decimal maxScore)
    {
        if (!key.TryGetProperty("blanks", out var blanksEl) || blanksEl.ValueKind != JsonValueKind.Array || blanksEl.GetArrayLength() == 0)
        {
            return GradingResult.UngradedResult("Fill-in-the-blank question has no blanks configured.");
        }

        JsonElement respBlanksEl = default;
        bool hasNestedBlanks = resp.TryGetProperty("blanks", out respBlanksEl) && respBlanksEl.ValueKind == JsonValueKind.Object;

        bool caseSensitive = key.TryGetProperty("caseSensitive", out var csEl) && csEl.ValueKind == JsonValueKind.True;
        var comparison = caseSensitive ? StringComparison.Ordinal : StringComparison.OrdinalIgnoreCase;

        int total = 0;
        int matched = 0;
        foreach (var blank in blanksEl.EnumerateArray())
        {
            var id = blank.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
            if (string.IsNullOrWhiteSpace(id)) continue;
            if (!blank.TryGetProperty("acceptedAnswers", out var accEl) || accEl.ValueKind != JsonValueKind.Array) continue;

            var accepted = accEl.EnumerateArray()
                .Select(a => a.GetString()?.Trim())
                .Where(s => !string.IsNullOrEmpty(s))
                .ToList();
            if (accepted.Count == 0) continue;

            total++;
            string? entered = null;
            if (hasNestedBlanks && respBlanksEl.TryGetProperty(id, out var nestedVal))
            {
                entered = nestedVal.GetString()?.Trim();
            }
            else if (resp.TryGetProperty(id, out var rootVal))
            {
                entered = rootVal.GetString()?.Trim();
            }
            if (!string.IsNullOrEmpty(entered) && accepted.Any(a => string.Equals(a, entered, comparison)))
            {
                matched++;
            }
        }

        if (total == 0) return GradingResult.UngradedResult("Fill-in-the-blank question has no accepted answers.");

        bool isCorrect = matched == total;
        decimal score = Math.Round(maxScore * matched / total, 2);
        return isCorrect
            ? GradingResult.Correct(maxScore, maxScore, $"All {total} blank(s) answered correctly.")
            : GradingResult.Incorrect(score, maxScore, $"Answered {matched} of {total} blank(s) correctly.");
    }

    private static GradingResult GradeMatrix(JsonElement key, JsonElement resp, decimal maxScore)
    {
        if (!key.TryGetProperty("correctCells", out var ccEl) || ccEl.ValueKind != JsonValueKind.Array || ccEl.GetArrayLength() == 0)
        {
            return GradingResult.UngradedResult("Matrix question has no 'correctCells' configured.");
        }

        if (!resp.TryGetProperty("selectedCells", out var scEl) || scEl.ValueKind != JsonValueKind.Array)
        {
            return GradingResult.Unsupported("Matrix response requires a 'selectedCells' array.");
        }

        var expected = ccEl.EnumerateArray()
            .Select(e => e.GetString()?.Trim())
            .Where(s => !string.IsNullOrEmpty(s))
            .ToHashSet(StringComparer.OrdinalIgnoreCase)!;

        var actual = scEl.EnumerateArray()
            .Select(e => e.GetString()?.Trim())
            .Where(s => !string.IsNullOrEmpty(s))
            .ToHashSet(StringComparer.OrdinalIgnoreCase)!;

        if (expected.Count == 0) return GradingResult.UngradedResult("Matrix question has no valid correct cells.");

        bool isCorrect = expected.SetEquals(actual);
        int hits = actual.Count(c => expected.Contains(c));
        int falsePositives = actual.Count(c => !expected.Contains(c));
        int netHits = Math.Max(0, hits - falsePositives);
        decimal score = isCorrect ? maxScore : Math.Round(maxScore * netHits / expected.Count, 2);

        return isCorrect
            ? GradingResult.Correct(maxScore, maxScore, "Matrix selection matches all expected cells.")
            : GradingResult.Incorrect(score, maxScore, $"Matched {hits} of {expected.Count} matrix cells ({falsePositives} extra).");
    }

    private static GradingResult GradeNumeric(JsonElement key, JsonElement resp, decimal maxScore)
    {
        if (!key.TryGetProperty("correctValue", out var cvEl) || !cvEl.TryGetDecimal(out var correctVal))
        {
            return GradingResult.UngradedResult("Numeric question has no 'correctValue' configured.");
        }

        decimal tolerance = key.TryGetProperty("tolerance", out var tolEl) && tolEl.TryGetDecimal(out var tolVal)
            ? Math.Abs(tolVal)
            : 0m;

        if (!resp.TryGetProperty("value", out var valEl) && !resp.TryGetProperty("numericValue", out valEl))
        {
            return GradingResult.Unsupported("Numeric response requires a 'value' or 'numericValue' field.");
        }

        decimal entered;
        if (valEl.ValueKind == JsonValueKind.Number && valEl.TryGetDecimal(out var numVal))
        {
            entered = numVal;
        }
        else if (valEl.ValueKind == JsonValueKind.String &&
                 decimal.TryParse(valEl.GetString()?.Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out var parsedVal))
        {
            entered = parsedVal;
        }
        else
        {
            return GradingResult.Unsupported("Numeric response value must be a valid number.");
        }

        bool isCorrect = Math.Abs(entered - correctVal) <= tolerance;
        return isCorrect
            ? GradingResult.Correct(maxScore, maxScore, $"Numeric entry {entered} is within tolerance of {correctVal}.")
            : GradingResult.Incorrect(0m, maxScore, $"Numeric entry {entered} does not match expected {correctVal} (±{tolerance}).");
    }

    private static GradingResult GradeTabular(JsonElement key, JsonElement resp, decimal maxScore)
    {
        if (!key.TryGetProperty("findings", out var findingsEl) || findingsEl.ValueKind != JsonValueKind.Array || findingsEl.GetArrayLength() == 0)
        {
            return GradingResult.UngradedResult("Tabular question has no findings configured.");
        }

        JsonElement classEl = default;
        bool hasClassObj = resp.TryGetProperty("classifications", out classEl) && classEl.ValueKind == JsonValueKind.Object;

        int total = 0;
        int matched = 0;
        int idx = 0;
        foreach (var f in findingsEl.EnumerateArray())
        {
            var expectedClass = f.TryGetProperty("classification", out var cEl) ? cEl.GetString()?.Trim() : null;
            var findingText = f.TryGetProperty("finding", out var fEl) ? fEl.GetString() : null;
            if (string.IsNullOrEmpty(expectedClass)) { idx++; continue; }

            total++;
            var idxKey = idx.ToString(CultureInfo.InvariantCulture);
            string? chosen = null;
            if (hasClassObj && classEl.TryGetProperty(idxKey, out var byIdx))
            {
                chosen = byIdx.GetString()?.Trim();
            }
            else if (hasClassObj && !string.IsNullOrEmpty(findingText) && classEl.TryGetProperty(findingText, out var byName))
            {
                chosen = byName.GetString()?.Trim();
            }
            else if (resp.TryGetProperty($"tab_{idx}", out var byTab))
            {
                chosen = byTab.GetString()?.Trim();
            }

            if (string.Equals(chosen, expectedClass, StringComparison.OrdinalIgnoreCase))
            {
                matched++;
            }
            idx++;
        }

        if (total == 0) return GradingResult.UngradedResult("Tabular question has no valid finding classifications.");

        bool isCorrect = matched == total;
        decimal score = Math.Round(maxScore * matched / total, 2);
        return isCorrect
            ? GradingResult.Correct(maxScore, maxScore, $"All {total} tabular findings classified correctly.")
            : GradingResult.Incorrect(score, maxScore, $"Classified {matched} of {total} tabular findings correctly.");
    }

    private static GradingResult GradeShortAnswer(JsonElement key, JsonElement resp, decimal maxScore)
    {
        if ((!resp.TryGetProperty("text", out var textEl) && !resp.TryGetProperty("shortAnswerText", out textEl)) || textEl.ValueKind != JsonValueKind.String)
        {
            return GradingResult.Unsupported("Short-answer response requires a 'text' or 'shortAnswerText' string.");
        }

        var text = (textEl.GetString() ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(text))
        {
            return GradingResult.Incorrect(0m, maxScore, "Short-answer response cannot be empty.");
        }

        if (key.TryGetProperty("maxCharacters", out var maxCharEl) && maxCharEl.TryGetInt32(out var maxChars) && text.Length > maxChars)
        {
            return GradingResult.Unsupported($"Short-answer response exceeds maximum length of {maxChars} characters.");
        }

        if (!key.TryGetProperty("acceptedKeywords", out var kwEl) || kwEl.ValueKind != JsonValueKind.Array || kwEl.GetArrayLength() == 0)
        {
            return GradingResult.UngradedResult("Short-answer question has no 'acceptedKeywords' configured.");
        }

        var keywords = kwEl.EnumerateArray()
            .Select(k => k.GetString()?.Trim())
            .Where(k => !string.IsNullOrEmpty(k))
            .ToList();
        if (keywords.Count == 0) return GradingResult.UngradedResult("Short-answer question has no valid keywords.");

        int matched = keywords.Count(k => text.Contains(k!, StringComparison.OrdinalIgnoreCase));
        int requiredThreshold = (int)Math.Ceiling(keywords.Count / 2.0);
        bool isCorrect = matched >= requiredThreshold;
        decimal score = Math.Round(maxScore * matched / keywords.Count, 2);

        return isCorrect
            ? GradingResult.Correct(score == 0 ? maxScore : score, maxScore, $"Matched {matched} of {keywords.Count} key clinical concepts.")
            : GradingResult.Incorrect(score, maxScore, $"Matched {matched} of {keywords.Count} key clinical concepts (needed at least {requiredThreshold}).");
    }

    private static GradingResult GradeDynamicLab(JsonElement key, JsonElement resp, decimal maxScore)
    {
        var correctCondition = key.TryGetProperty("correctCondition", out var ccEl) ? ccEl.GetString()?.Trim() : null;
        var correctActions = key.TryGetProperty("correctActions", out var caEl) && caEl.ValueKind == JsonValueKind.Array
            ? caEl.EnumerateArray().Select(e => e.GetString()?.Trim()).Where(s => !string.IsNullOrEmpty(s)).ToHashSet(StringComparer.OrdinalIgnoreCase)!
            : new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var correctParams = key.TryGetProperty("correctParameters", out var cpEl) && cpEl.ValueKind == JsonValueKind.Array
            ? cpEl.EnumerateArray().Select(e => e.GetString()?.Trim()).Where(s => !string.IsNullOrEmpty(s)).ToHashSet(StringComparer.OrdinalIgnoreCase)!
            : new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (string.IsNullOrEmpty(correctCondition) && correctActions.Count == 0 && correctParams.Count == 0)
        {
            return GradingResult.UngradedResult("Dynamic lab / bowtie question has no answer key configured.");
        }

        int totalPoints = (string.IsNullOrEmpty(correctCondition) ? 0 : 1) + correctActions.Count + correctParams.Count;
        int earnedPoints = 0;

        var chosenCondition = resp.TryGetProperty("condition", out var condEl) ? condEl.GetString()?.Trim() : null;
        if (!string.IsNullOrEmpty(correctCondition) && string.Equals(chosenCondition, correctCondition, StringComparison.OrdinalIgnoreCase))
        {
            earnedPoints++;
        }

        if (resp.TryGetProperty("actions", out var actEl) && actEl.ValueKind == JsonValueKind.Array)
        {
            var chosenActions = actEl.EnumerateArray().Select(e => e.GetString()?.Trim()).Where(s => !string.IsNullOrEmpty(s)).ToHashSet(StringComparer.OrdinalIgnoreCase)!;
            earnedPoints += chosenActions.Count(a => correctActions.Contains(a));
        }

        if (resp.TryGetProperty("parameters", out var paramEl) && paramEl.ValueKind == JsonValueKind.Array)
        {
            var chosenParams = paramEl.EnumerateArray().Select(e => e.GetString()?.Trim()).Where(s => !string.IsNullOrEmpty(s)).ToHashSet(StringComparer.OrdinalIgnoreCase)!;
            earnedPoints += chosenParams.Count(p => correctParams.Contains(p));
        }

        bool isCorrect = earnedPoints == totalPoints;
        decimal score = Math.Round(maxScore * earnedPoints / totalPoints, 2);
        return isCorrect
            ? GradingResult.Correct(maxScore, maxScore, $"All {totalPoints} bowtie/dynamic lab targets answered correctly.")
            : GradingResult.Incorrect(score, maxScore, $"Earned {earnedPoints} of {totalPoints} bowtie/dynamic lab points.");
    }
}
