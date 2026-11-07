using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Xunit;

namespace Preform.Api.Tests;

public class StudyStudioPhase2Tests : IClassFixture<WebApplicationFactory<Program>>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private readonly WebApplicationFactory<Program> _factory;

    public StudyStudioPhase2Tests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("TestingStudyPhase2Db"));
            });
        });
    }

    private static void AddGatewayHeaders(HttpClient client, string userId, string email, string role, string name = "Test Learner")
    {
        var secret = "prepford-default-internal-gateway-secret-32-chars!";
        var payload = $"{userId}|{email}|{role}";
        var sig = Convert.ToHexString(
            System.Security.Cryptography.HMACSHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(secret),
                System.Text.Encoding.UTF8.GetBytes(payload))
        ).ToLowerInvariant();

        client.DefaultRequestHeaders.Remove("X-Gateway-Signature");
        client.DefaultRequestHeaders.Remove("X-Authenticated-User-Id");
        client.DefaultRequestHeaders.Remove("X-Authenticated-User-Email");
        client.DefaultRequestHeaders.Remove("X-Authenticated-User-Role");
        client.DefaultRequestHeaders.Remove("X-Authenticated-User-Name");

        client.DefaultRequestHeaders.Add("X-Gateway-Signature", sig);
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Id", userId);
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Email", email);
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Role", role);
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Name", name);
    }

    [Fact]
    public async Task NotesManagement_CreateRetrieveUpdateSoftDelete_WorksCleanly()
    {
        var client = _factory.CreateClient();
        var userId = "user-notes-test-1";
        AddGatewayHeaders(client, userId, "learner1@prepford.test", "learner");

        // 1. Create Folder
        var folderRes = await client.PostAsJsonAsync("/api/v1/study/folders", new
        {
            name = "Pharmacology High Yield",
            color = "teal",
            icon = "Folder"
        });
        Assert.Equal(HttpStatusCode.Created, folderRes.StatusCode);

        // 2. Create Note
        var noteRes = await client.PostAsJsonAsync("/api/v1/study/notes", new
        {
            title = "Digoxin & Cardiac Glycosides",
            contentJson = "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Hold if apical pulse < 60 bpm.\"}]}]}",
            contentPlainText = "Hold if apical pulse < 60 bpm. Therapeutic range 0.8-2.0 ng/mL.",
            programme = "rn",
            tags = new[] { "cardiology", "pharmacology" }
        });
        Assert.Equal(HttpStatusCode.Created, noteRes.StatusCode);
        var noteDoc = await noteRes.Content.ReadFromJsonAsync<JsonElement>(Json);
        var noteId = noteDoc.GetProperty("note").GetProperty("id").GetString()!;

        // 3. Retrieve Note
        var getRes = await client.GetAsync($"/api/v1/study/notes/{noteId}");
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);

        // 4. Update Note
        var updateRes = await client.PutAsJsonAsync($"/api/v1/study/notes/{noteId}", new
        {
            title = "Digoxin Clinical Protocol (Updated)",
            isFavourite = true
        });
        Assert.Equal(HttpStatusCode.OK, updateRes.StatusCode);

        // 5. Soft Delete Note
        var deleteRes = await client.DeleteAsync($"/api/v1/study/notes/{noteId}");
        Assert.Equal(HttpStatusCode.OK, deleteRes.StatusCode);
    }

    [Fact]
    public async Task ReviewSession_StartAndSubmitRating_UpdatesSpacedRepetition()
    {
        var client = _factory.CreateClient();
        var userId = "user-session-test-2";
        AddGatewayHeaders(client, userId, "learner2@prepford.test", "learner");

        // Create a deck and card first
        var deckRes = await client.PostAsJsonAsync("/api/v1/study/flashcards/decks", new
        {
            name = "Cardiology Drills",
            programme = "rn"
        });
        var deckDoc = await deckRes.Content.ReadFromJsonAsync<JsonElement>(Json);
        var deckId = deckDoc.GetProperty("deck").GetProperty("id").GetString()!;

        var cardRes = await client.PostAsJsonAsync($"/api/v1/study/flashcards/decks/{deckId}/cards", new
        {
            front = "What is the antidote for heparin overdose?",
            back = "Protamine Sulfate",
            explanation = "1 mg of protamine neutralizes approximately 100 units of heparin.",
            difficulty = "high_yield"
        });
        var cardDoc = await cardRes.Content.ReadFromJsonAsync<JsonElement>(Json);
        var cardId = cardDoc.GetProperty("card").GetProperty("id").GetString()!;

        // Start Review Session
        var sessionRes = await client.PostAsJsonAsync("/api/v1/study/reviews/sessions", new
        {
            deckId = deckId,
            mode = "deck",
            programme = "rn",
            cardLimit = 10
        });
        Assert.Equal(HttpStatusCode.Created, sessionRes.StatusCode);
        var sessionDoc = await sessionRes.Content.ReadFromJsonAsync<JsonElement>(Json);
        var sessionId = sessionDoc.GetProperty("session").GetProperty("id").GetString()!;

        // Submit Rating: Good (2)
        var ratingRes = await client.PostAsJsonAsync($"/api/v1/study/reviews/sessions/{sessionId}/rating", new
        {
            flashcardId = cardId,
            recallRating = 2,
            responseTimeMs = 1200
        });
        Assert.Equal(HttpStatusCode.OK, ratingRes.StatusCode);

        // Summary report
        var summaryRes = await client.GetAsync($"/api/v1/study/reviews/sessions/{sessionId}/summary");
        Assert.Equal(HttpStatusCode.OK, summaryRes.StatusCode);
        var summaryDoc = await summaryRes.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.True(summaryDoc.GetProperty("report").GetProperty("session").GetProperty("cardsReviewed").GetInt32() >= 1);
    }

    [Fact]
    public async Task AIStudyStudio_SummarizeNoteAndGenerateFlashcards_GracefulFallback()
    {
        var client = _factory.CreateClient();
        var userId = "user-ai-test-3";
        AddGatewayHeaders(client, userId, "learner3@prepford.test", "learner");

        // AI Status
        var statusRes = await client.GetAsync("/api/v1/ai/study/status");
        Assert.Equal(HttpStatusCode.OK, statusRes.StatusCode);

        // Summarize note
        var summarizeRes = await client.PostAsJsonAsync("/api/v1/ai/study/summarize-note", new
        {
            noteText = "Client with acute coronary syndrome requires immediate aspirin 325 mg chewed, nitroglycerin sublingual, and continuous 12-lead ECG monitoring.",
            mode = "summarize"
        });
        Assert.Equal(HttpStatusCode.OK, summarizeRes.StatusCode);
        var sumDoc = await summarizeRes.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.True(sumDoc.GetProperty("result").GetProperty("keyTakeaways").GetArrayLength() > 0);

        // Generate Flashcards
        var fcRes = await client.PostAsJsonAsync("/api/v1/ai/study/generate-flashcards", new
        {
            topic = "Acute Coronary Syndromes",
            programme = "rn",
            count = 3
        });
        Assert.Equal(HttpStatusCode.OK, fcRes.StatusCode);
        var fcDoc = await fcRes.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal(3, fcDoc.GetProperty("count").GetInt32());
    }

    [Fact]
    public async Task RN_and_PN_Notes_RemainIsolated()
    {
        var client = _factory.CreateClient();
        var userId = "user-isolation-test-4";
        AddGatewayHeaders(client, userId, "learner4@prepford.test", "learner");

        // Create an RN note
        await client.PostAsJsonAsync("/api/v1/study/notes", new
        {
            title = "RN Complex Triage Protocol",
            contentJson = "{}",
            programme = "rn"
        });

        // Create a PN note
        await client.PostAsJsonAsync("/api/v1/study/notes", new
        {
            title = "PN Focused Care Plan",
            contentJson = "{}",
            programme = "pn"
        });

        // Query RN only
        var rnRes = await client.GetAsync("/api/v1/study/notes?programme=rn");
        var rnDoc = await rnRes.Content.ReadFromJsonAsync<JsonElement>(Json);
        var rnItems = rnDoc.GetProperty("result").GetProperty("items").EnumerateArray();
        Assert.All(rnItems, item => Assert.True(item.GetProperty("programme").GetString() == "rn" || item.GetProperty("programme").GetString() == "both"));

        // Query PN only
        var pnRes = await client.GetAsync("/api/v1/study/notes?programme=pn");
        var pnDoc = await pnRes.Content.ReadFromJsonAsync<JsonElement>(Json);
        var pnItems = pnDoc.GetProperty("result").GetProperty("items").EnumerateArray();
        Assert.All(pnItems, item => Assert.True(item.GetProperty("programme").GetString() == "pn" || item.GetProperty("programme").GetString() == "both"));
    }

    [Fact]
    public async Task AdminTopicQuizzes_RBAC_ContentManagerAndAdminAllowed_LearnerForbidden()
    {
        var client = _factory.CreateClient();

        // 1. Unauthenticated -> 401
        var unauthRes = await client.GetAsync("/api/v1/admin/study-guides/topic-quizzes");
        Assert.Equal(HttpStatusCode.Unauthorized, unauthRes.StatusCode);

        // 2. Learner role -> 403
        AddGatewayHeaders(client, "usr_learner_rbac", "learner@prepford.test", "candidate");
        var learnerRes = await client.GetAsync("/api/v1/admin/study-guides/topic-quizzes");
        Assert.Equal(HttpStatusCode.Forbidden, learnerRes.StatusCode);

        // 3. Content Manager role -> 200 OK
        AddGatewayHeaders(client, "usr_cm_rbac", "content_manager@prepford.test", "content_manager");
        var cmRes = await client.GetAsync("/api/v1/admin/study-guides/topic-quizzes");
        Assert.Equal(HttpStatusCode.OK, cmRes.StatusCode);

        // 4. Content Manager role -> Analytics 200 OK
        var cmAnalyticsRes = await client.GetAsync("/api/v1/admin/study-guides/topic-quizzes/analytics");
        Assert.Equal(HttpStatusCode.OK, cmAnalyticsRes.StatusCode);

        // 5. Admin role -> 200 OK
        AddGatewayHeaders(client, "usr_admin_rbac", "admin@prepford.test", "admin");
        var adminRes = await client.GetAsync("/api/v1/admin/study-guides/topic-quizzes");
        Assert.Equal(HttpStatusCode.OK, adminRes.StatusCode);
    }

    [Fact]
    public async Task OfficialTopicQuiz_DiscoveryAndAttemptExecution_PreservesOrderingAndIsolatesLearners()
    {
        var client = _factory.CreateClient();

        // Seed questions in test in-memory DB
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            if (!await db.Questions.AnyAsync(q => q.Id == "q-official-1"))
            {
                db.Questions.AddRange(
                    new Question
                    {
                        Id = "q-official-1",
                        Stem = "First official assigned question on cardiac arrest.",
                        Pathway = "rn",
                        Status = QuestionStatus.Published,
                        QuestionTypeKey = "single-choice",
                        ClientNeedId = "PHYS_PHARM",
                        CreatedById = "usr_admin"
                    },
                    new Question
                    {
                        Id = "q-official-2",
                        Stem = "Second official assigned question on emergency drugs.",
                        Pathway = "rn",
                        Status = QuestionStatus.Published,
                        QuestionTypeKey = "single-choice",
                        ClientNeedId = "PHYS_PHARM",
                        CreatedById = "usr_admin"
                    }
                );
                await db.SaveChangesAsync();
            }
        }

        // 1. Admin creates official published quiz
        AddGatewayHeaders(client, "usr_admin_official", "admin@prepford.test", "admin");
        var createRes = await client.PostAsJsonAsync("/api/v1/admin/study-guides/topic-quizzes", new
        {
            title = "Official Cardiac Protocol Quiz",
            description = "Authoritative emergency cardiac procedures",
            programme = "rn",
            questionCount = 2,
            targetScore = 80,
            status = "Published",
            isPublished = true,
            isOfficial = true,
            questionIds = new[] { "q-official-2", "q-official-1" } // Note reverse ordering!
        });
        Assert.Equal(HttpStatusCode.OK, createRes.StatusCode);
        var createDoc = await createRes.Content.ReadFromJsonAsync<JsonElement>(Json);
        var quizId = createDoc.GetProperty("quiz").GetProperty("id").GetString()!;

        // 2. Learner A creates a private quiz
        AddGatewayHeaders(client, "usr_learner_a", "learner_a@prepford.test", "candidate");
        var privateRes = await client.PostAsJsonAsync("/api/v1/study/topic-quizzes/configurations", new
        {
            title = "Learner A Private Drill",
            programme = "rn",
            questionCount = 5
        });
        Assert.Equal(HttpStatusCode.Created, privateRes.StatusCode);

        // 3. Learner B queries configurations
        AddGatewayHeaders(client, "usr_learner_b", "learner_b@prepford.test", "candidate");
        var listRes = await client.GetAsync("/api/v1/study/topic-quizzes/configurations");
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
        var listDoc = await listRes.Content.ReadFromJsonAsync<JsonElement>(Json);
        var configs = listDoc.GetProperty("configs").EnumerateArray().ToList();

        // Learner B sees official published quiz
        Assert.Contains(configs, c => c.GetProperty("id").GetString() == quizId);
        // Learner B does NOT see Learner A's private quiz
        Assert.DoesNotContain(configs, c => c.GetProperty("title").GetString() == "Learner A Private Drill");

        // 4. Learner B starts attempt on the official quiz
        var attemptRes = await client.PostAsJsonAsync("/api/v1/study/topic-quizzes/attempts", new
        {
            configurationId = quizId,
            programme = "rn"
        });
        Assert.Equal(HttpStatusCode.Created, attemptRes.StatusCode);
        var attemptDoc = await attemptRes.Content.ReadFromJsonAsync<JsonElement>(Json);
        var attempt = attemptDoc.GetProperty("attempt");
        var questions = attempt.GetProperty("questions").EnumerateArray().ToList();

        Assert.Equal(2, questions.Count);
        // Verify administrator's exact question order is preserved: q-official-2 first, then q-official-1
        Assert.Equal("q-official-2", questions[0].GetProperty("id").GetString());
        Assert.Equal("q-official-1", questions[1].GetProperty("id").GetString());
    }
}
