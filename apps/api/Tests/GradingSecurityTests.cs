using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Preform.Api.Data;
using Preform.Api.Models;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Xunit;

namespace Preform.Api.Tests;

public class GradingSecurityTests : IClassFixture<WebApplicationFactory<Program>>
{
    private const string GatewaySecret = "prepford-default-internal-gateway-secret-32-chars!";
    private readonly WebApplicationFactory<Program> _factory;

    public GradingSecurityTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("TestingGradingSecurityDb"));
            });
        });
    }

    private static void AddGatewayHeaders(HttpClient client, string method, string path, string userId, string email, string role, object? body = null)
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var nonce = Guid.NewGuid().ToString("N");
        var bodyHash = body == null
            ? "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
            : ComputeBodySha256(body);

        var canonicalPayload = $"{timestamp}\n{method.ToUpperInvariant()}\n{path}\n{nonce}\n{bodyHash}\n{userId.Trim()}\n{email.Trim().ToLowerInvariant()}\n{role.Trim().ToLowerInvariant()}";
        var signature = Convert.ToHexString(
            HMACSHA256.HashData(Encoding.UTF8.GetBytes(GatewaySecret), Encoding.UTF8.GetBytes(canonicalPayload)))
            .ToLowerInvariant();

        client.DefaultRequestHeaders.Remove("X-Gateway-Signature");
        client.DefaultRequestHeaders.Remove("X-Gateway-Timestamp");
        client.DefaultRequestHeaders.Remove("X-Gateway-Nonce");
        client.DefaultRequestHeaders.Remove("X-Gateway-Content-SHA256");
        client.DefaultRequestHeaders.Remove("X-Gateway-Signature-Version");
        client.DefaultRequestHeaders.Remove("X-Authenticated-User-Id");
        client.DefaultRequestHeaders.Remove("X-Authenticated-User-Email");
        client.DefaultRequestHeaders.Remove("X-Authenticated-User-Role");

        client.DefaultRequestHeaders.Add("X-Gateway-Signature", signature);
        client.DefaultRequestHeaders.Add("X-Gateway-Timestamp", timestamp);
        client.DefaultRequestHeaders.Add("X-Gateway-Nonce", nonce);
        client.DefaultRequestHeaders.Add("X-Gateway-Content-SHA256", bodyHash);
        client.DefaultRequestHeaders.Add("X-Gateway-Signature-Version", "1");
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Id", userId);
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Email", email);
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Role", role);
    }

    private static string ComputeBodySha256(object body)
    {
        var json = JsonSerializer.Serialize(body);
        var bytes = Encoding.UTF8.GetBytes(json);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static async Task SeedAttemptAndQuestion(AppDbContext context, string attemptId, string userId, string questionId, int correctOptionIndex)
    {
        var options = new List<QuestionOption>();
        for (int i = 0; i < 4; i++)
        {
            options.Add(new QuestionOption
            {
                Id = $"opt_{questionId}_{i}",
                QuestionId = questionId,
                OptionKey = ((char)('A' + i)).ToString(),
                Content = $"Option {((char)('A' + i))}",
                IsCorrect = i == correctOptionIndex,
                DisplayOrder = i,
            });
        }

        context.Questions.Add(new Question
        {
            Id = questionId,
            Stem = "Security test question",
            QuestionTypeKey = "single-choice",
            Pathway = "rn",
            Status = QuestionStatus.Published,
            Options = options,
        });

        context.ExamAttempts.Add(new ExamAttempt
        {
            Id = attemptId,
            UserId = userId,
            ExamId = "exam-sec-1",
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow,
        });

        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task ClientSuppliedIsCorrectTrue_CannotForceCorrectResult_WhenAnswerIsWrong()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var attemptId = "att_sec_correct_true";
        var questionId = "q_sec_correct_true";
        await SeedAttemptAndQuestion(context, attemptId, "user_sec_ct", questionId, correctOptionIndex: 2);

        var client = _factory.CreateClient();
        AddGatewayHeaders(client, "POST", $"/api/v1/attempts/{attemptId}/responses", "user_sec_ct", "ct@prepford.com", "candidate",
            new { QuestionId = questionId, SelectedOptionIndices = new List<int> { 0 }, IsCorrect = true, ScoreAwarded = 100, TimeSpentSeconds = 30 });

        var response = await client.PostAsJsonAsync($"/api/v1/attempts/{attemptId}/responses", new
        {
            QuestionId = questionId,
            SelectedOptionIndices = new List<int> { 0 }, // Wrong answer (index 0, correct is index 2)
            IsCorrect = true, // Client lies
            ScoreAwarded = 100, // Client lies
            TimeSpentSeconds = 30,
        });

        response.EnsureSuccessStatusCode();

        var attempt = await context.ExamAttempts
            .Include(ea => ea.Responses)
            .FirstAsync(ea => ea.Id == attemptId);

        var responseRecord = attempt.Responses.First(r => r.QuestionId == questionId);
        Assert.False(responseRecord.IsCorrect, "Server must not trust client-supplied IsCorrect=true for a wrong answer.");
        Assert.Equal(0, responseRecord.ScoreAwarded, "Server must not trust client-supplied ScoreAwarded.");
    }

    [Fact]
    public async Task ClientSuppliedIsCorrectFalse_CannotForceIncorrectResult_WhenAnswerIsRight()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var attemptId = "att_sec_correct_false";
        var questionId = "q_sec_correct_false";
        await SeedAttemptAndQuestion(context, attemptId, "user_sec_cf", questionId, correctOptionIndex: 0);

        var client = _factory.CreateClient();
        AddGatewayHeaders(client, "POST", $"/api/v1/attempts/{attemptId}/responses", "user_sec_cf", "cf@prepford.com", "candidate",
            new { QuestionId = questionId, SelectedOptionIndices = new List<int> { 0 }, IsCorrect = false, ScoreAwarded = 0, TimeSpentSeconds = 30 });

        var response = await client.PostAsJsonAsync($"/api/v1/attempts/{attemptId}/responses", new
        {
            QuestionId = questionId,
            SelectedOptionIndices = new List<int> { 0 }, // Right answer
            IsCorrect = false, // Client lies
            ScoreAwarded = 0, // Client lies
            TimeSpentSeconds = 30,
        });

        response.EnsureSuccessStatusCode();

        var attempt = await context.ExamAttempts
            .Include(ea => ea.Responses)
            .FirstAsync(ea => ea.Id == attemptId);

        var responseRecord = attempt.Responses.First(r => r.QuestionId == questionId);
        Assert.True(responseRecord.IsCorrect, "Server must compute IsCorrect=true for the right answer regardless of client claim.");
        Assert.Equal(1, responseRecord.ScoreAwarded, "Server must award full marks for correct answer.");
    }

    [Fact]
    public async Task UnsupportedQuestionType_ReturnsBadRequest()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var attemptId = "att_sec_unsupported";
        var questionId = "q_sec_unsupported";

        context.Questions.Add(new Question
        {
            Id = questionId,
            Stem = "Essay question",
            QuestionTypeKey = "essay",
            Pathway = "rn",
            Status = QuestionStatus.Published,
        });

        context.ExamAttempts.Add(new ExamAttempt
        {
            Id = attemptId,
            UserId = "user_sec_unsupp",
            ExamId = "exam-sec-1",
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow,
        });

        await context.SaveChangesAsync();

        var client = _factory.CreateClient();
        AddGatewayHeaders(client, "POST", $"/api/v1/attempts/{attemptId}/responses", "user_sec_unsupp", "unsupp@prepford.com", "candidate",
            new { QuestionId = questionId, SelectedOptionIndices = new List<int> { 0 }, IsCorrect = false, ScoreAwarded = 0, TimeSpentSeconds = 30 });

        var response = await client.PostAsJsonAsync($"/api/v1/attempts/{attemptId}/responses", new
        {
            QuestionId = questionId,
            SelectedOptionIndices = new List<int> { 0 },
            IsCorrect = false,
            ScoreAwarded = 0,
            TimeSpentSeconds = 30,
        });

        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UnknownQuestion_ReturnsNotFound()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var attemptId = "att_sec_unknown_q";

        context.ExamAttempts.Add(new ExamAttempt
        {
            Id = attemptId,
            UserId = "user_sec_unknown",
            ExamId = "exam-sec-1",
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow,
        });

        await context.SaveChangesAsync();

        var client = _factory.CreateClient();
        AddGatewayHeaders(client, "POST", $"/api/v1/attempts/{attemptId}/responses", "user_sec_unknown", "unknown@prepford.com", "candidate",
            new { QuestionId = "nonexistent-question-id", SelectedOptionIndices = new List<int> { 0 }, IsCorrect = false, ScoreAwarded = 0, TimeSpentSeconds = 30 });

        var response = await client.PostAsJsonAsync($"/api/v1/attempts/{attemptId}/responses", new
        {
            QuestionId = "nonexistent-question-id",
            SelectedOptionIndices = new List<int> { 0 },
            IsCorrect = false,
            ScoreAwarded = 0,
            TimeSpentSeconds = 30,
        });

        Assert.Equal(System.Net.HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CompletedAttempt_CannotSubmitResponses()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var attemptId = "att_sec_completed";
        var questionId = "q_sec_completed";

        await SeedAttemptAndQuestion(context, attemptId, "user_sec_completed", questionId, correctOptionIndex: 0);

        context.ExamAttempts.First(ea => ea.Id == attemptId).Status = AttemptStatus.Completed;
        await context.SaveChangesAsync();

        var client = _factory.CreateClient();
        AddGatewayHeaders(client, "POST", $"/api/v1/attempts/{attemptId}/responses", "user_sec_completed", "completed@prepford.com", "candidate",
            new { QuestionId = questionId, SelectedOptionIndices = new List<int> { 0 }, IsCorrect = false, ScoreAwarded = 0, TimeSpentSeconds = 30 });

        var response = await client.PostAsJsonAsync($"/api/v1/attempts/{attemptId}/responses", new
        {
            QuestionId = questionId,
            SelectedOptionIndices = new List<int> { 0 },
            IsCorrect = false,
            ScoreAwarded = 0,
            TimeSpentSeconds = 30,
        });

        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
    }
}
