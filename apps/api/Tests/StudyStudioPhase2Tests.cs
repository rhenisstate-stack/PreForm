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
}
