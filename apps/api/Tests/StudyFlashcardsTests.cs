using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Preform.Api.Data;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

/// <summary>
/// PrepFord AI Study Studio (Phase 1): personal flashcard decks, SM-2 review
/// scheduling and learner data isolation.
/// </summary>
public class StudyFlashcardsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly WebApplicationFactory<Program> _factory;

    public StudyFlashcardsTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("TestingStudyFlashcardsDb"));
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

    private sealed record DeckDto(
        string Id, string Name, string Programme, int CardCount, int DueCount);

    private sealed record CardDto(
        string Id, string DeckId, string Front, string Back, string Status,
        int RepetitionCount, int IntervalDays, double EaseFactor, DateTime DueAt);

    /// <summary>
    /// Study endpoints follow the API-wide contract of wrapping payloads in a
    /// <c>{ "success": true, "&lt;field&gt;": ... }</c> envelope.
    /// </summary>
    private static async Task<T> ReadEnvelopeAsync<T>(HttpResponseMessage response, string field)
    {
        var envelope = await response.Content.ReadFromJsonAsync<JsonElement>(Json);
        return envelope.GetProperty(field).Deserialize<T>(Json)!;
    }

    // ── API behaviour ─────────────────────────────────────────────────────

    [Fact]
    public async Task StudyEndpoints_Unauthenticated_ReturnUnauthorized401()
    {
        var client = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/study/overview")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/study/flashcards/due")).StatusCode);
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await client.PostAsync("/api/v1/study/flashcards/decks", JsonContent.Create(new { name = "X" }))).StatusCode);
    }

    [Fact]
    public async Task CreateDeckAddCardReview_CompletesLearningLoop()
    {
        var client = _factory.CreateClient();
        AddGatewayHeaders(client, "study-user-1", "learner.one@nursing.edu", "candidate");

        // 1. Create a personal deck
        var createDeck = await client.PostAsync("/api/v1/study/flashcards/decks", JsonContent.Create(new
        {
            name = "Pharmacology Core",
            programme = "rn",
            sourceType = "curated_guide",
            sourceReference = "PrepFord Study Guide — Pharmacology"
        }));
        Assert.Equal(HttpStatusCode.Created, createDeck.StatusCode);
        var deck = await ReadEnvelopeAsync<DeckDto>(createDeck, "deck");
        Assert.NotNull(deck);
        Assert.Equal("rn", deck!.Programme);
        Assert.Equal(0, deck.CardCount);

        // 2. Add a card (server-side, SM-2 state initialized)
        var addCard = await client.PostAsync($"/api/v1/study/flashcards/decks/{deck!.Id}/cards", JsonContent.Create(new
        {
            front = "Hold digoxin when the apical pulse is below…",
            back = "60 bpm in adults.",
            explanation = "Always count the apical pulse for a full minute before digoxin administration.",
            difficulty = "high_yield"
        }));
        Assert.Equal(HttpStatusCode.Created, addCard.StatusCode);
        var card = await ReadEnvelopeAsync<CardDto>(addCard, "card");
        Assert.NotNull(card);
        Assert.Equal("personal_unreviewed", card!.Status);
        Assert.Equal(0, card.RepetitionCount);

        // 3. Due list includes the new card
        var due = await client.GetFromJsonAsync<JsonElement>("/api/v1/study/flashcards/due?programme=rn", Json);
        Assert.Equal(1, due.GetProperty("count").GetInt32());

        // 4. Review: Good → first repetition scheduled 1 day out, status becomes active
        var review = await client.PostAsync($"/api/v1/study/flashcards/cards/{card!.Id}/review", JsonContent.Create(new { recallRating = 2 }));
        review.EnsureSuccessStatusCode();
        var reviewPayload = await ReadEnvelopeAsync<CardDto>(review, "card");
        Assert.NotNull(reviewPayload);
        Assert.Equal("active", reviewPayload!.Status);
        Assert.Equal(1, reviewPayload.RepetitionCount);
        Assert.Equal(1, reviewPayload.IntervalDays);
        Assert.True(reviewPayload.DueAt > DateTime.UtcNow.AddHours(0.5));

        // 5. No longer due
        var dueAfter = await client.GetFromJsonAsync<JsonElement>("/api/v1/study/flashcards/due?programme=rn", Json);
        Assert.Equal(0, dueAfter.GetProperty("count").GetInt32());

        // 6. Review history persisted
        var history = await client.GetAsync($"/api/v1/study/flashcards/cards/{card.Id}/reviews");
        history.EnsureSuccessStatusCode();
        var historyPayload = await history.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal(1, historyPayload.GetProperty("count").GetInt32());
    }

    [Fact]
    public async Task ReviewProgression_SecondGoodStretchesIntervalToSixDays()
    {
        var client = _factory.CreateClient();
        AddGatewayHeaders(client, "study-user-2", "learner.two@nursing.edu", "candidate");

        var createDeck = await client.PostAsync("/api/v1/study/flashcards/decks", JsonContent.Create(new { name = "Fundamentals", programme = "rn" }));
        var deck = await ReadEnvelopeAsync<DeckDto>(createDeck, "deck");
        var addCard = await client.PostAsync($"/api/v1/study/flashcards/decks/{deck!.Id}/cards", JsonContent.Create(new { front = "Q", back = "A" }));
        var card = await ReadEnvelopeAsync<CardDto>(addCard, "card");

        await client.PostAsync($"/api/v1/study/flashcards/cards/{card!.Id}/review", JsonContent.Create(new { recallRating = 2 }));
        var second = await client.PostAsync($"/api/v1/study/flashcards/cards/{card.Id}/review", JsonContent.Create(new { recallRating = 2 }));
        var secondCard = await ReadEnvelopeAsync<CardDto>(second, "card");

        Assert.Equal(2, secondCard!.RepetitionCount);
        Assert.Equal(6, secondCard.IntervalDays);
    }

    [Fact]
    public async Task LearnerData_IsolatedBetweenUsers()
    {
        var clientA = _factory.CreateClient();
        AddGatewayHeaders(clientA, "study-user-3", "learner.three@nursing.edu", "candidate");
        var createDeck = await clientA.PostAsync("/api/v1/study/flashcards/decks", JsonContent.Create(new { name = "Deck of A", programme = "rn" }));
        var deck = await ReadEnvelopeAsync<DeckDto>(createDeck, "deck");

        var clientB = _factory.CreateClient();
        AddGatewayHeaders(clientB, "study-user-4", "learner.four@nursing.edu", "candidate");

        // B cannot read, mutate or review A's materials
        var readOther = await clientB.GetAsync($"/api/v1/study/flashcards/decks/{deck!.Id}");
        Assert.Equal(HttpStatusCode.NotFound, readOther.StatusCode);

        var addOther = await clientB.PostAsync($"/api/v1/study/flashcards/decks/{deck.Id}/cards", JsonContent.Create(new { front = "x", back = "y" }));
        Assert.Equal(HttpStatusCode.NotFound, addOther.StatusCode);

        // B's decks listing never includes A's deck
        var bDecks = await clientB.GetFromJsonAsync<JsonElement>("/api/v1/study/flashcards/decks", Json);
        Assert.Equal(0, bDecks.GetProperty("count").GetInt32());

        // A's overview counts only A's material
        var overviewA = await clientA.GetFromJsonAsync<JsonElement>("/api/v1/study/overview", Json);
        Assert.Equal(1, overviewA.GetProperty("overview").GetProperty("deckCount").GetInt32());
        Assert.Equal(0, overviewA.GetProperty("overview").GetProperty("cardCount").GetInt32());
    }

    [Fact]
    public async Task ProgrammeFilter_SeparatesRnAndPnStudyMaterial()
    {
        var client = _factory.CreateClient();
        AddGatewayHeaders(client, "study-user-5", "learner.five@nursing.edu", "candidate");

        var rnDeck = await client.PostAsync("/api/v1/study/flashcards/decks", JsonContent.Create(new { name = "RN Material", programme = "rn" }));
        var pnDeck = await client.PostAsync("/api/v1/study/flashcards/decks", JsonContent.Create(new { name = "PN Material", programme = "pn" }));
        var rn = await ReadEnvelopeAsync<DeckDto>(rnDeck, "deck");
        var pn = await ReadEnvelopeAsync<DeckDto>(pnDeck, "deck");

        await client.PostAsync($"/api/v1/study/flashcards/decks/{rn!.Id}/cards", JsonContent.Create(new { front = "RN Q", back = "RN A", programme = "rn" }));
        await client.PostAsync($"/api/v1/study/flashcards/decks/{pn!.Id}/cards", JsonContent.Create(new { front = "PN Q", back = "PN A", programme = "pn" }));

        var rnDue = await client.GetFromJsonAsync<JsonElement>("/api/v1/study/flashcards/due?programme=rn", Json);
        var pnDue = await client.GetFromJsonAsync<JsonElement>("/api/v1/study/flashcards/due?programme=pn", Json);

        Assert.Equal(1, rnDue.GetProperty("count").GetInt32());
        Assert.Equal("RN Q", rnDue.GetProperty("cards")[0].GetProperty("front").GetString());
        Assert.Equal(1, pnDue.GetProperty("count").GetInt32());
        Assert.Equal("PN Q", pnDue.GetProperty("cards")[0].GetProperty("front").GetString());
    }

    [Fact]
    public async Task InvalidRecallRating_ReturnsBadRequest400()
    {
        var client = _factory.CreateClient();
        AddGatewayHeaders(client, "study-user-6", "learner.six@nursing.edu", "candidate");
        var createDeck = await client.PostAsync("/api/v1/study/flashcards/decks", JsonContent.Create(new { name = "D", programme = "rn" }));
        var deck = await ReadEnvelopeAsync<DeckDto>(createDeck, "deck");
        var card = await ReadEnvelopeAsync<CardDto>(
            await client.PostAsync($"/api/v1/study/flashcards/decks/{deck!.Id}/cards", JsonContent.Create(new { front = "Q", back = "A" })), "card");

        var bad = await client.PostAsync($"/api/v1/study/flashcards/cards/{card!.Id}/review", JsonContent.Create(new { recallRating = 9 }));
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
    }

    [Fact]
    public async Task EmptyOrOversizedFields_ReturnBadRequest()
    {
        var client = _factory.CreateClient();
        AddGatewayHeaders(client, "study-user-7", "learner.seven@nursing.edu", "candidate");
        var createDeck = await client.PostAsync("/api/v1/study/flashcards/decks", JsonContent.Create(new { name = "  " }));
        Assert.Equal(HttpStatusCode.BadRequest, createDeck.StatusCode);
    }
}

/// <summary>
/// Unit tests for the SM-2 scheduling engine itself (server-authoritative).
/// </summary>
public class SpacedRepetitionServiceTests
{
    private readonly SpacedRepetitionService _svc = new();
    private static readonly DateTime Now = new(2026, 10, 31, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void FirstGood_Intervals_1Day_Then_6Days()
    {
        var first = _svc.Schedule(RecallRating.Good, 0, 2.5, 0, Now);
        Assert.Equal(1, first.IntervalDays);
        Assert.Equal(1, first.RepetitionCount);

        var second = _svc.Schedule(RecallRating.Good, first.IntervalDays, first.EaseFactor, first.RepetitionCount, Now);
        Assert.Equal(6, second.IntervalDays);
    }

    [Fact]
    public void Again_ResetsRepetitionAndIsDueTomorrow()
    {
        var result = _svc.Schedule(RecallRating.Again, 10, 2.5, 4, Now);
        Assert.Equal(0, result.RepetitionCount);
        Assert.Equal(1, result.IntervalDays);
        Assert.Equal(2.3, result.EaseFactor, 6);
        Assert.Equal(Now.AddDays(1), result.NextDueAt);
    }

    [Fact]
    public void EaseFactor_IsClampedTo1_30Floor()
    {
        var result = _svc.Schedule(RecallRating.Again, 1, 1.35, 0, Now);
        Assert.Equal(1.30, result.EaseFactor, 6);
    }

    [Theory]
    [InlineData(1, 3)]   // first Easy
    [InlineData(6, 8)]   // after second Good (prev 6, ease ~2.5 → base 6*2.5=15? no: rep1=6 base uses formula)
    public void EasyVisits_AreAccelerated(int prevInterval, int expectedMin)
    {
        var result = _svc.Schedule(RecallRating.Easy, prevInterval, 2.5, prevInterval <= 1 ? 0 : 1, Now);
        Assert.True(result.IntervalDays >= expectedMin);
        Assert.True(result.IntervalDays > prevInterval - 1);
    }

    [Fact]
    public void AllNextDueDates_UseServerTime()
    {
        var result = _svc.Schedule(RecallRating.Good, 0, 2.5, 0, Now);
        Assert.Equal(Now.AddDays(1), result.NextDueAt);
    }
}
