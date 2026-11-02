using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class QuestionTypeRegistryTests
{
    private static readonly string[] CanonicalKeys =
    {
        "single-choice", "multiple-choice", "sata", "checkbox", "image-based",
        "multiple-image", "drag-drop", "ordering", "case-study", "essay",
        "matching", "fill-blank", "matrix", "numeric", "true-false",
        "tabular", "short-answer", "dynamic-lab",
    };

    [Fact]
    public void Registry_ContainsExactlyTheCanonicalKeys()
    {
        var registry = QuestionTypeRegistry.Instance;

        Assert.Equal(18, registry.All.Count);
        Assert.Equal(CanonicalKeys, registry.All.Select(descriptor => descriptor.Key));
        Assert.Equal(18, registry.All.Select(descriptor => descriptor.Key).Distinct().Count());

        foreach (var key in CanonicalKeys)
        {
            Assert.True(registry.TryGet(key, out var descriptor));
            Assert.Equal(key, descriptor.Key);
        }
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("unknown-type")]
    [InlineData("SATA")]
    public void Registry_RejectsUnknownOrNonCanonicalKeys(string? key)
    {
        Assert.False(QuestionTypeRegistry.Instance.TryGet(key, out _));
    }

    [Fact]
    public void Registry_OnlyAdvertisesImplementedOptionExactMatchGraders()
    {
        var registeredGraders = QuestionTypeRegistry.Instance.All
            .Where(descriptor => descriptor.GradingStrategy != QuestionTypeGradingStrategy.None)
            .Select(descriptor => descriptor.Key)
            .ToArray();

        Assert.Equal(new[]
        {
            "single-choice", "multiple-choice", "sata", "checkbox",
            "image-based", "multiple-image", "true-false",
        }, registeredGraders);

        Assert.All(
            QuestionTypeRegistry.Instance.All.Where(
                descriptor => descriptor.GradingStrategy == QuestionTypeGradingStrategy.None),
            descriptor =>
            {
                Assert.Equal(QuestionTypeStatus.Catalogued, descriptor.ImplementationStatus);
                Assert.Equal(new[] { QuestionScoringMode.NotImplemented }, descriptor.SupportedScoringModes);
                Assert.False(descriptor.SupportsAuthoring);
                Assert.False(descriptor.SupportsDelivery);
                Assert.False(descriptor.SupportsAutomaticGrading);
            });
    }

    [Fact]
    public void Registry_UsesExactMatchForCurrentGradersAndVersionedContracts()
    {
        var gradedTypes = QuestionTypeRegistry.Instance.All
            .Where(descriptor => descriptor.GradingStrategy != QuestionTypeGradingStrategy.None);

        Assert.All(gradedTypes, descriptor =>
        {
            Assert.Equal(QuestionTypeStatus.GradingSupported, descriptor.ImplementationStatus);
            Assert.Equal(1, descriptor.ContractVersion);
            Assert.Equal(new[] { QuestionScoringMode.AutomaticExactMatch }, descriptor.SupportedScoringModes);
            Assert.False(descriptor.SupportsAuthoring);
        });

        Assert.All(
            gradedTypes.Where(descriptor =>
                (descriptor.Capabilities & QuestionTypeCapability.RequiresSpecializedRenderer) == 0),
            descriptor => Assert.True(descriptor.SupportsDelivery));
        Assert.All(
            gradedTypes.Where(descriptor =>
                (descriptor.Capabilities & QuestionTypeCapability.RequiresSpecializedRenderer) != 0),
            descriptor => Assert.False(descriptor.SupportsDelivery));

        var sata = QuestionTypeRegistry.Instance.All.Single(descriptor => descriptor.Key == "sata");
        Assert.False((sata.Capabilities & QuestionTypeCapability.SupportsPartialCredit) != 0);
    }
}
