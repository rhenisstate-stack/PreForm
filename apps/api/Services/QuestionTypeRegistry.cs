using System.Diagnostics.CodeAnalysis;
using Preform.Api.Models;

namespace Preform.Api.Services;

public enum QuestionTypeGradingStrategy
{
    None,
    OptionExactMatch,
}

public sealed record QuestionTypeDescriptor(
    string Key,
    string DefaultId,
    string DefaultName,
    string DefaultDescription,
    string DefaultCategory,
    string LegacyScoringLabel,
    int DefaultDisplayOrder,
    int ContractVersion,
    QuestionTypeCapability Capabilities,
    QuestionTypeStatus ImplementationStatus,
    QuestionTypeGradingStrategy GradingStrategy,
    IReadOnlyList<QuestionScoringMode> SupportedScoringModes)
{
    public bool SupportsAuthoring { get; init; }
    public bool SupportsDelivery =>
        GradingStrategy == QuestionTypeGradingStrategy.OptionExactMatch
        && (Capabilities & QuestionTypeCapability.RequiresSpecializedRenderer) == 0;

    public bool SupportsAutomaticGrading =>
        (Capabilities & QuestionTypeCapability.SupportsAutomaticGrading) != 0;
}

public interface IQuestionTypeRegistry
{
    IReadOnlyList<QuestionTypeDescriptor> All { get; }
    bool TryGet(string? key, [NotNullWhen(true)] out QuestionTypeDescriptor? descriptor);
}

public sealed class QuestionTypeRegistry : IQuestionTypeRegistry
{
    private static readonly IReadOnlyList<QuestionTypeDescriptor> Descriptors =
        Array.AsReadOnly(new[]
        {
            Type("single-choice", "Single Choice", "Standard single-answer multiple-choice question", "Traditional", "ExactMatch", 1,
                QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsAutomaticGrading,
                QuestionTypeStatus.GradingSupported, QuestionTypeGradingStrategy.OptionExactMatch,
                QuestionScoringMode.AutomaticExactMatch),
            Type("multiple-choice", "Multiple Choice", "Multiple-choice item with single or multiple keys", "Traditional", "ExactMatch", 2,
                QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsMultipleSelections |
                QuestionTypeCapability.SupportsMultipleCorrectAnswers | QuestionTypeCapability.SupportsAutomaticGrading,
                QuestionTypeStatus.GradingSupported, QuestionTypeGradingStrategy.OptionExactMatch,
                QuestionScoringMode.AutomaticExactMatch),
            Type("sata", "Select All That Apply (SATA)", "Multi-select clinical prioritization question", "Traditional", "PartialCredit", 3,
                QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsMultipleSelections |
                QuestionTypeCapability.SupportsMultipleCorrectAnswers | QuestionTypeCapability.SupportsAutomaticGrading,
                QuestionTypeStatus.GradingSupported, QuestionTypeGradingStrategy.OptionExactMatch,
                QuestionScoringMode.AutomaticExactMatch),
            Type("checkbox", "Checkbox Response", "Form-based checkbox response interaction", "Traditional", "PartialCredit", 4,
                QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsMultipleSelections |
                QuestionTypeCapability.SupportsAutomaticGrading,
                QuestionTypeStatus.GradingSupported, QuestionTypeGradingStrategy.OptionExactMatch,
                QuestionScoringMode.AutomaticExactMatch),
            Type("image-based", "Image-Based Question", "Clinical scenario with diagnostic radiograph or photo exhibit", "Clinical", "ExactMatch", 5,
                QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsMedia |
                QuestionTypeCapability.SupportsAutomaticGrading | QuestionTypeCapability.RequiresSpecializedRenderer,
                QuestionTypeStatus.GradingSupported, QuestionTypeGradingStrategy.OptionExactMatch,
                QuestionScoringMode.AutomaticExactMatch),
            Type("multiple-image", "Multiple-Image Item", "Comparative visual exhibits for diagnostic identification", "Clinical", "ExactMatch", 6,
                QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsMedia |
                QuestionTypeCapability.SupportsMultipleSelections | QuestionTypeCapability.SupportsAutomaticGrading |
                QuestionTypeCapability.RequiresSpecializedRenderer,
                QuestionTypeStatus.GradingSupported, QuestionTypeGradingStrategy.OptionExactMatch,
                QuestionScoringMode.AutomaticExactMatch),
            Type("drag-drop", "Drag-and-Drop", "Interactive clinical priority classification", "NGN", "ExactMatch", 7,
                QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.RequiresSpecializedRenderer |
                QuestionTypeCapability.RequiresSpecializedInput | QuestionTypeCapability.RequiresSpecializedResponseValidator,
                QuestionTypeStatus.Catalogued, QuestionTypeGradingStrategy.None,
                QuestionScoringMode.NotImplemented),
            Type("ordering", "Ordering / Sequencing", "Step-by-step procedural or nursing intervention order", "NGN", "ExactMatch", 8,
                QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.RequiresSpecializedRenderer |
                QuestionTypeCapability.RequiresSpecializedInput | QuestionTypeCapability.RequiresSpecializedResponseValidator,
                QuestionTypeStatus.Catalogued, QuestionTypeGradingStrategy.None,
                QuestionScoringMode.NotImplemented),
            Type("case-study", "NGN Case Study", "Multi-part clinical unfolding case study with EHR tabs", "NGN", "PartialCredit", 9,
                QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.SupportsClinicalScenario |
                QuestionTypeCapability.SupportsExhibits | QuestionTypeCapability.RequiresSpecializedRenderer |
                QuestionTypeCapability.RequiresSpecializedResponseValidator,
                QuestionTypeStatus.Catalogued, QuestionTypeGradingStrategy.None,
                QuestionScoringMode.NotImplemented),
            Type("essay", "Extended Response / Essay", "Clinical reasoning reflection requiring instructor review", "Traditional", "ManualReview", 10,
                QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.RequiresSpecializedRenderer |
                QuestionTypeCapability.RequiresSpecializedInput | QuestionTypeCapability.RequiresSpecializedResponseValidator,
                QuestionTypeStatus.Catalogued, QuestionTypeGradingStrategy.None,
                QuestionScoringMode.NotImplemented),
            Type("matching", "Matching", "Paired concept-to-intervention clinical matching", "Traditional", "ExactMatch", 11,
                QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.RequiresSpecializedRenderer |
                QuestionTypeCapability.RequiresSpecializedInput | QuestionTypeCapability.RequiresSpecializedResponseValidator,
                QuestionTypeStatus.Catalogued, QuestionTypeGradingStrategy.None,
                QuestionScoringMode.NotImplemented),
            Type("fill-blank", "Fill-in-the-Blank", "Direct textual entry for clinical terms or dosage", "Traditional", "ExactMatch", 12,
                QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.RequiresSpecializedInput |
                QuestionTypeCapability.RequiresSpecializedResponseValidator,
                QuestionTypeStatus.Catalogued, QuestionTypeGradingStrategy.None,
                QuestionScoringMode.NotImplemented),
            Type("matrix", "Matrix / Grid Response", "Tabular multiple-response clinical evaluation matrix", "NGN", "PartialCredit", 13,
                QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.RequiresSpecializedRenderer |
                QuestionTypeCapability.RequiresSpecializedInput | QuestionTypeCapability.RequiresSpecializedResponseValidator,
                QuestionTypeStatus.Catalogued, QuestionTypeGradingStrategy.None,
                QuestionScoringMode.NotImplemented),
            Type("numeric", "Numeric Response", "Dosage calculation and clinical measurement entry", "Traditional", "ExactMatch", 14,
                QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.RequiresSpecializedInput |
                QuestionTypeCapability.RequiresSpecializedResponseValidator,
                QuestionTypeStatus.Catalogued, QuestionTypeGradingStrategy.None,
                QuestionScoringMode.NotImplemented),
            Type("true-false", "True / False", "Binary clinical fact and safety validation", "Traditional", "ExactMatch", 15,
                QuestionTypeCapability.SupportsOptions | QuestionTypeCapability.SupportsAutomaticGrading,
                QuestionTypeStatus.GradingSupported, QuestionTypeGradingStrategy.OptionExactMatch,
                QuestionScoringMode.AutomaticExactMatch),
            Type("tabular", "Tabular Response", "Data table evaluation for clinical interventions", "NGN", "PartialCredit", 16,
                QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.RequiresSpecializedRenderer |
                QuestionTypeCapability.RequiresSpecializedInput | QuestionTypeCapability.RequiresSpecializedResponseValidator,
                QuestionTypeStatus.Catalogued, QuestionTypeGradingStrategy.None,
                QuestionScoringMode.NotImplemented),
            Type("short-answer", "Short-Answer Response", "Concise clinical assessment entry", "Traditional", "ManualReview", 17,
                QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.RequiresSpecializedInput |
                QuestionTypeCapability.RequiresSpecializedResponseValidator,
                QuestionTypeStatus.Catalogued, QuestionTypeGradingStrategy.None,
                QuestionScoringMode.NotImplemented),
            Type("dynamic-lab", "Dynamic Lab Value Response", "Interactive laboratory value and trend analysis", "NGN", "ExactMatch", 18,
                QuestionTypeCapability.SupportsStructuredResponse | QuestionTypeCapability.RequiresSpecializedRenderer |
                QuestionTypeCapability.RequiresSpecializedResponseValidator,
                QuestionTypeStatus.Catalogued, QuestionTypeGradingStrategy.None,
                QuestionScoringMode.NotImplemented),
        });

    private static readonly IReadOnlyDictionary<string, QuestionTypeDescriptor> DescriptorsByKey =
        CreateLookup(Descriptors);

    public static QuestionTypeRegistry Instance { get; } = new();

    public IReadOnlyList<QuestionTypeDescriptor> All => Descriptors;

    public bool TryGet(string? key, [NotNullWhen(true)] out QuestionTypeDescriptor? descriptor)
    {
        descriptor = null;
        return !string.IsNullOrWhiteSpace(key)
            && DescriptorsByKey.TryGetValue(key.Trim(), out descriptor);
    }

    private static QuestionTypeDescriptor Type(
        string key,
        string name,
        string description,
        string category,
        string legacyScoringLabel,
        int displayOrder,
        QuestionTypeCapability capabilities,
        QuestionTypeStatus status,
        QuestionTypeGradingStrategy gradingStrategy,
        QuestionScoringMode scoringMode)
    {
        return new QuestionTypeDescriptor(
            key,
            $"qt-{displayOrder}",
            name,
            description,
            category,
            legacyScoringLabel,
            displayOrder,
            1,
            capabilities,
            status,
            gradingStrategy,
            Array.AsReadOnly(new[] { scoringMode }));
    }

    private static IReadOnlyDictionary<string, QuestionTypeDescriptor> CreateLookup(
        IReadOnlyList<QuestionTypeDescriptor> descriptors)
    {
        var lookup = new Dictionary<string, QuestionTypeDescriptor>(StringComparer.Ordinal);
        foreach (var descriptor in descriptors)
        {
            if (!lookup.TryAdd(descriptor.Key, descriptor))
            {
                throw new InvalidOperationException($"Duplicate question-type registry key '{descriptor.Key}'.");
            }
        }

        return lookup;
    }
}
