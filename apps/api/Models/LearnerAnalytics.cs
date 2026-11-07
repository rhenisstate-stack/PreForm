using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Preform.Api.Models;

public static class RecommendationCategoryNames
{
    public const string TargetedPractice = "TargetedPractice";
    public const string ConceptReview = "ConceptReview";
    public const string QuestionFormat = "QuestionFormat";
    public const string ReadinessSimulation = "ReadinessSimulation";
    public const string Maintenance = "Maintenance";
}

public static class RecommendationPriorityNames
{
    public const string High = "High";
    public const string Medium = "Medium";
    public const string Low = "Low";
}

public static class RecommendationStatusNames
{
    public const string New = "New";
    public const string InProgress = "InProgress";
    public const string Completed = "Completed";
    public const string Dismissed = "Dismissed";
}

public static class InterventionStatusNames
{
    public const string Active = "Active";
    public const string Evaluated = "Evaluated";
    public const string Archived = "Archived";
}

[Table("LearnerPerformanceRecommendations", Schema = "public")]
public class LearnerPerformanceRecommendation
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    [Required]
    [MaxLength(10)]
    public string Pathway { get; set; } = "both"; // "rn", "pn", "both"

    [Required]
    [MaxLength(64)]
    public string Category { get; set; } = RecommendationCategoryNames.TargetedPractice;

    [Required]
    [MaxLength(32)]
    public string Priority { get; set; } = RecommendationPriorityNames.Medium;

    [Required]
    [MaxLength(256)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(2048)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(2048)]
    public string Evidence { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string SuggestedAction { get; set; } = string.Empty;

    [MaxLength(512)]
    public string ActionHref { get; set; } = "/dashboard";

    [MaxLength(64)]
    public string? TargetClientNeedCode { get; set; }

    [MaxLength(64)]
    public string? TargetQuestionTypeKey { get; set; }

    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = RecommendationStatusNames.New;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public DateTime? DismissedAt { get; set; }

    public ICollection<LearnerIntervention> Interventions { get; set; } = new List<LearnerIntervention>();
}

[Table("LearnerInterventions", Schema = "public")]
public class LearnerIntervention
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    [MaxLength(128)]
    public string? RecommendationId { get; set; }
    public LearnerPerformanceRecommendation? Recommendation { get; set; }

    [Required]
    [MaxLength(10)]
    public string Pathway { get; set; } = "both";

    [Required]
    [MaxLength(256)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string Category { get; set; } = RecommendationCategoryNames.TargetedPractice;

    [MaxLength(64)]
    public string? TargetClientNeedCode { get; set; }

    [MaxLength(64)]
    public string? TargetQuestionTypeKey { get; set; }

    public decimal BaselineAccuracyPercent { get; set; } = 0.0m;
    public int BaselineQuestionsAnswered { get; set; } = 0;

    public decimal PostInterventionAccuracyPercent { get; set; } = 0.0m;
    public int PostInterventionQuestionsAnswered { get; set; } = 0;

    public int ActivityCount { get; set; } = 0;

    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = InterventionStatusNames.Active;

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastEvaluatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
