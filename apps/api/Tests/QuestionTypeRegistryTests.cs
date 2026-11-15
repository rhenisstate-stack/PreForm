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
    public void Registry_AdvertisesAll18ImplementedGraders()
    {
        var registeredGraders = QuestionTypeRegistry.Instance.All
            .Where(descriptor => descriptor.GradingStrategy != QuestionTypeGradingStrategy.None)
            .Select(descriptor => descriptor.Key)
            .ToArray();

        Assert.Equal(18, registeredGraders.Length);
        Assert.Equal(CanonicalKeys, registeredGraders);

        Assert.All(
            QuestionTypeRegistry.Instance.All,
            descriptor =>
            {
                Assert.Equal(QuestionTypeStatus.GradingSupported, descriptor.ImplementationStatus);
                Assert.True(descriptor.SupportsAuthoring);
                Assert.True(descriptor.SupportsDelivery);
                if (descriptor.Key == "essay")
                {
                    Assert.False(descriptor.SupportsAutomaticGrading);
                    Assert.NotEqual(0, (int)(descriptor.Capabilities & QuestionTypeCapability.SupportsManualGrading));
                }
                else
                {
                    Assert.True(descriptor.SupportsAutomaticGrading);
                }
            });
    }

    [Fact]
    public void Registry_UsesVersionedContractsForAll18Types()
    {
        var optionTypes = QuestionTypeRegistry.Instance.All
            .Where(descriptor => descriptor.GradingStrategy == QuestionTypeGradingStrategy.OptionExactMatch)
            .ToArray();
        Assert.Equal(7, optionTypes.Length);
        Assert.All(optionTypes, descriptor =>
        {
            Assert.Equal(1, descriptor.ContractVersion);
            Assert.Equal(new[] { QuestionScoringMode.AutomaticExactMatch }, descriptor.SupportedScoringModes);
        });

        var structuredTypes = QuestionTypeRegistry.Instance.All
            .Where(descriptor => descriptor.GradingStrategy == QuestionTypeGradingStrategy.Structured)
            .ToArray();
        Assert.Equal(11, structuredTypes.Length);
        Assert.All(structuredTypes, descriptor => Assert.Equal(1, descriptor.ContractVersion));
    }
}
