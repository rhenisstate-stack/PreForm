using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Preform.Api.Data;
using Preform.Api.Models;
using Xunit;

namespace Preform.Api.Tests;

/// <summary>
/// C4 candidate-data-contract tests: the serialized HTTP contract of
/// GET /api/v1/attempts/{id} must never leak grading internals. While an
/// attempt is in progress the payload must omit isCorrect, scoreAwarded and
/// every finalization-only field entirely (not serialize them as null), no
/// answer keys / correct option identifiers / rationales may ever appear, and
/// raw EF entities must never be serialized onto the wire.
/// </summary>
public class CandidateDataContractTests : IClassFixture<CandidateDataContractTests.Factory>
{
    public sealed class Factory : Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("TestingCandidateDataContractDb"));
            });
        }
    }

    private readonly Factory _factory;

    public CandidateDataContractTests(Factory factory)
    {
        _factory = factory;
    }

    private static async Task<(string attemptId, string userId)> SeedAttemptAsync(
        Factory factory,
        string attemptId,
        bool completed)
    {
        var userId = $"usr_c4_{attemptId}";
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            db.Users.Add(new User
            {
                Id = userId,
                Email = $"{attemptId}@prepford.com",
                DisplayName = "Contract Candidate",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });

            if (!db.SubscriptionPlans.Any(p => p.Id == "plan_pilot_rn"))
            {
                db.SubscriptionPlans.Add(new SubscriptionPlan
                {
                    Id = "plan_pilot_rn",
                    Name = "Pilot RN Plan",
                    Slug = "pilot-rn",
                    Pathway = "RN",
                    PlanType = "pilot_grant",
                    PriceCents = 0,
                    IsActive = true
                });
            }

            db.UserSubscriptions.Add(new UserSubscription
            {
                Id = $"sub_c4_{attemptId}",
                UserId = userId,
                PlanId = "plan_pilot_rn",
                OrderId = "pilot_grant_test",
                Pathway = "rn",
                Status = SubscriptionStatus.Active,
                StartsAt = DateTime.UtcNow.AddDays(-1),
                ExpiresAt = DateTime.UtcNow.AddDays(30)
            });

            var exam = new Exam
            {
                Id = $"exam_c4_{attemptId}",
                Title = "Contract Verification Exam",
                Pathway = "rn",
                PassingScorePercent = 75m,
            };
            db.Exams.Add(exam);

            var attempt = new ExamAttempt
            {
                Id = attemptId,
                UserId = userId,
                ExamId = exam.Id,
                Exam = exam,
                Status = completed ? AttemptStatus.Completed : AttemptStatus.InProgress,
                StartedAt = DateTime.UtcNow.AddHours(-1),
                CompletedAt = completed ? DateTime.UtcNow.AddMinutes(-1) : null,
                ScorePercent = completed ? 100.0m : 0m,
                Passed = completed,
            };
            db.ExamAttempts.Add(attempt);

            db.AttemptResponses.AddRange(
                new AttemptResponse
                {
                    Id = $"{attemptId}_resp_1",
                    ExamAttemptId = attempt.Id,
                    QuestionId = "q_c4_one",
                    SelectedOptionsJson = "[2]",
                    IsCorrect = true,
                    ScoreAwarded = 1m,
                    GradingState = ResponseGradingState.Graded,
                    TimeSpentSeconds = 42,
                    AnsweredAt = DateTime.UtcNow.AddMinutes(-50),
                },
                new AttemptResponse
                {
                    Id = $"{attemptId}_resp_2",
                    ExamAttemptId = attempt.Id,
                    QuestionId = "q_c4_two",
                    SelectedOptionsJson = "[0]",
                    IsCorrect = false,
                    ScoreAwarded = 0m,
                    GradingState = ResponseGradingState.Graded,
                    TimeSpentSeconds = 12,
                    AnsweredAt = DateTime.UtcNow.AddMinutes(-40),
                });

            await db.SaveChangesAsync();
        }

        return (attemptId, userId);
    }

    private HttpClient CreateAuthenticatedClient(string method, string path, string userId, string email)
    {
        var client = _factory.CreateClient();
        GatewayHmacAndReplaySecurityTests.AddCanonicalHeaders(client, method, path, userId, email, "candidate");
        return client;
    }

    [Fact]
    public async Task InProgressAttempt_PayloadOmitsAllGradingAndFinalizationFields()
    {
        var (attemptId, userId) = await SeedAttemptAsync(_factory, "att_c4_inprogress", completed: false);
        var path = $"/api/v1/attempts/{attemptId}";
        var client = CreateAuthenticatedClient("GET", path, userId, $"{attemptId}@prepford.com");

        var response = await client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var raw = await response.Content.ReadAsStringAsync();

        // Grading data must be structurally absent, not merely null.
        Assert.DoesNotContain("isCorrect", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("scoreAwarded", raw, StringComparison.OrdinalIgnoreCase);
        // Finalization-only aggregate fields must be absent while in progress.
        Assert.DoesNotContain("scorePercent", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("passed", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("correctCount", raw, StringComparison.OrdinalIgnoreCase);
        // In-progress attempt is declared incomplete.
        Assert.Contains("gradingIncomplete", raw, StringComparison.OrdinalIgnoreCase);

        // The candidate's own answers are still visible for recovery.
        Assert.Contains("q_c4_one", raw);
        Assert.Contains("[2]", raw);
    }

    [Fact]
    public async Task InProgressAttempt_PayloadNeverContainsServerInternalShapes()
    {
        var (attemptId, userId) = await SeedAttemptAsync(_factory, "att_c4_internals", completed: false);
        var path = $"/api/v1/attempts/{attemptId}";
        var client = CreateAuthenticatedClient("GET", path, userId, $"{attemptId}@prepford.com");

        var response = await client.GetAsync(path);
        var raw = await response.Content.ReadAsStringAsync();

        // EF entity internals must not be serialized: GradingState enum names,
        // navigation properties or runtime EF metadata on the wire.
        Assert.DoesNotContain("Graded", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Ungraded", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("gradingState", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("examattempt", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("$id", raw);
        Assert.DoesNotContain("$type", raw);
    }

    [Fact]
    public async Task AnyAttempt_PayloadNeverContainsAnswerKeysOrRationales()
    {
        var (inProgressId, inProgressUser) = await SeedAttemptAsync(_factory, "att_c4_keys_ip", completed: false);
        var (completedId, completedUser) = await SeedAttemptAsync(_factory, "att_c4_keys_done", completed: true);

        foreach (var (attemptId, userId) in new[] { (inProgressId, inProgressUser), (completedId, completedUser) })
        {
            var path = $"/api/v1/attempts/{attemptId}";
            var client = CreateAuthenticatedClient("GET", path, userId, $"{attemptId}@prepford.com");

            var response = await client.GetAsync(path);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var raw = await response.Content.ReadAsStringAsync();
            Assert.DoesNotContain("correctanswerindex", raw, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("correctanswerindices", raw, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("rationale", raw, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("iscorrectoption", raw, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public async Task CompletedAttempt_PayloadDisclosesAuthoritativeGradingOnly()
    {
        var (attemptId, userId) = await SeedAttemptAsync(_factory, "att_c4_completed", completed: true);
        var path = $"/api/v1/attempts/{attemptId}";
        var client = CreateAuthenticatedClient("GET", path, userId, $"{attemptId}@prepford.com");

        var response = await client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var attempt = doc.RootElement.GetProperty("attempt");
        var responses = attempt.GetProperty("responses");

        // After authoritative finalization the grading fields are disclosed —
        // with the server-computed values, not client-asserted fiction.
        Assert.Equal(JsonValueKind.Number, attempt.GetProperty("scorePercent").ValueKind);
        Assert.Equal(100.0m, attempt.GetProperty("scorePercent").GetDecimal());
        Assert.True(attempt.GetProperty("passed").GetBoolean());
        Assert.Equal(1, attempt.GetProperty("correctCount").GetInt32());

        var first = responses.EnumerateArray().First(r => r.GetProperty("questionId").GetString() == "q_c4_one");
        Assert.True(first.GetProperty("isCorrect").GetBoolean());
        Assert.Equal(1m, first.GetProperty("scoreAwarded").GetDecimal());

        var second = responses.EnumerateArray().First(r => r.GetProperty("questionId").GetString() == "q_c4_two");
        Assert.False(second.GetProperty("isCorrect").GetBoolean());
        Assert.Equal(0m, second.GetProperty("scoreAwarded").GetDecimal());
    }
}
