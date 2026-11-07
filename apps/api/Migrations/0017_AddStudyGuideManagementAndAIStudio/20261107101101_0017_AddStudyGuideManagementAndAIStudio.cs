using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Preform.Api.Migrations
{
    /// <inheritdoc />
    public partial class _0017_AddStudyGuideManagementAndAIStudio : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── 1. Flashcards and FlashcardDecks Enhancements ──
            migrationBuilder.AddColumn<string>(
                name: "CardStyle",
                schema: "public",
                table: "Flashcards",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "qa");

            migrationBuilder.AddColumn<string>(
                name: "ClientNeedId",
                schema: "public",
                table: "Flashcards",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DiagramUrl",
                schema: "public",
                table: "Flashcards",
                type: "character varying(512)",
                maxLength: 512,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DisplayOrder",
                schema: "public",
                table: "Flashcards",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                schema: "public",
                table: "Flashcards",
                type: "character varying(512)",
                maxLength: 512,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDifficult",
                schema: "public",
                table: "Flashcards",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsFavourite",
                schema: "public",
                table: "Flashcards",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "SubjectDomainId",
                schema: "public",
                table: "Flashcards",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TagsJson",
                schema: "public",
                table: "Flashcards",
                type: "text",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "TopicSlug",
                schema: "public",
                table: "Flashcards",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TopicTitle",
                schema: "public",
                table: "Flashcards",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClientNeedId",
                schema: "public",
                table: "FlashcardDecks",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsFavourite",
                schema: "public",
                table: "FlashcardDecks",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TagsJson",
                schema: "public",
                table: "FlashcardDecks",
                type: "text",
                nullable: false,
                defaultValue: "[]");

            // ── 2. AI Content Reviews ──
            migrationBuilder.CreateTable(
                name: "AIContentReviews",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    SourceRequestId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    ContentType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    DraftPayloadJson = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    ReviewerUserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    ReviewNotes = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIContentReviews", x => x.Id);
                });

            // ── 3. AI Provider Configurations ──
            migrationBuilder.CreateTable(
                name: "AIProviderConfigurations",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ProviderName = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ModelId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    Temperature = table.Column<double>(type: "double precision", nullable: false),
                    MaxOutputTokens = table.Column<int>(type: "integer", nullable: false),
                    TimeoutSeconds = table.Column<int>(type: "integer", nullable: false),
                    FeatureTogglesJson = table.Column<string>(type: "text", nullable: false),
                    DailyPerUserQuota = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIProviderConfigurations", x => x.Id);
                });

            // ── 4. AI Requests ──
            migrationBuilder.CreateTable(
                name: "AIRequests",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Feature = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Provider = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Model = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    InputTokens = table.Column<int>(type: "integer", nullable: false),
                    OutputTokens = table.Column<int>(type: "integer", nullable: false),
                    LatencyMs = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    ErrorMessage = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AIRequests_Users_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ── 5. AI Study Plans ──
            migrationBuilder.CreateTable(
                name: "AIStudyPlans",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    TargetExamDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    WeeklyAvailableHours = table.Column<int>(type: "integer", nullable: false),
                    Programme = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    PlanJson = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIStudyPlans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AIStudyPlans_Users_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ── 6. AI Tutor Conversations ──
            migrationBuilder.CreateTable(
                name: "AITutorConversations",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    TopicSlug = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Programme = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    MessagesJson = table.Column<string>(type: "text", nullable: false),
                    LastMessageAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AITutorConversations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AITutorConversations_Users_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ── 7. AI Usage Records ──
            migrationBuilder.CreateTable(
                name: "AIUsageRecords",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    DateUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RequestCount = table.Column<int>(type: "integer", nullable: false),
                    TotalInputTokens = table.Column<int>(type: "integer", nullable: false),
                    TotalOutputTokens = table.Column<int>(type: "integer", nullable: false),
                    EstimatedCostUsd = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIUsageRecords", x => x.Id);
                });

            // ── 8. Study Folders ──
            migrationBuilder.CreateTable(
                name: "StudyFolders",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Color = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Icon = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsArchived = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudyFolders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudyFolders_Users_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ── 9. Study Guide Categories ──
            migrationBuilder.CreateTable(
                name: "StudyGuideCategories",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Slug = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    ShortTitle = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Description = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    Badge = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    IconName = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ColorTheme = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudyGuideCategories", x => x.Id);
                });

            // ── 10. Study Notes ──
            migrationBuilder.CreateTable(
                name: "StudyNotes",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    FolderId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    ContentJson = table.Column<string>(type: "text", nullable: false),
                    ContentPlainText = table.Column<string>(type: "text", nullable: false),
                    Programme = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    SubjectDomainId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    TopicSlug = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    TopicTitle = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    ClientNeedId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    TagsJson = table.Column<string>(type: "text", nullable: false),
                    IsPinned = table.Column<bool>(type: "boolean", nullable: false),
                    IsFavourite = table.Column<bool>(type: "boolean", nullable: false),
                    IsArchived = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    WordCount = table.Column<int>(type: "integer", nullable: false),
                    CharacterCount = table.Column<int>(type: "integer", nullable: false),
                    LastEditedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudyNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudyNotes_StudyFolders_FolderId",
                        column: x => x.FolderId,
                        principalSchema: "public",
                        principalTable: "StudyFolders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_StudyNotes_Users_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ── 11. Study Note Versions ──
            migrationBuilder.CreateTable(
                name: "StudyNoteVersions",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    NoteId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    ContentJson = table.Column<string>(type: "text", nullable: false),
                    WordCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudyNoteVersions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudyNoteVersions_StudyNotes_NoteId",
                        column: x => x.NoteId,
                        principalSchema: "public",
                        principalTable: "StudyNotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ── 12. Study Review Sessions ──
            migrationBuilder.CreateTable(
                name: "StudyReviewSessions",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    DeckId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Mode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Programme = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    TopicSlug = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    TopicTitle = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    FilterCriteriaJson = table.Column<string>(type: "text", nullable: false),
                    TotalCards = table.Column<int>(type: "integer", nullable: false),
                    CardsReviewed = table.Column<int>(type: "integer", nullable: false),
                    CardsCorrect = table.Column<int>(type: "integer", nullable: false),
                    CardsDifficult = table.Column<int>(type: "integer", nullable: false),
                    CardsMissed = table.Column<int>(type: "integer", nullable: false),
                    AccuracyPercentage = table.Column<double>(type: "double precision", nullable: false),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudyReviewSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudyReviewSessions_FlashcardDecks_DeckId",
                        column: x => x.DeckId,
                        principalSchema: "public",
                        principalTable: "FlashcardDecks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_StudyReviewSessions_Users_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ── 13. Study Review Session Items ──
            migrationBuilder.CreateTable(
                name: "StudyReviewSessionItems",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    SessionId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    FlashcardId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    RecallRating = table.Column<int>(type: "integer", nullable: false),
                    ResponseTimeMs = table.Column<int>(type: "integer", nullable: false),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudyReviewSessionItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudyReviewSessionItems_Flashcards_FlashcardId",
                        column: x => x.FlashcardId,
                        principalSchema: "public",
                        principalTable: "Flashcards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StudyReviewSessionItems_StudyReviewSessions_SessionId",
                        column: x => x.SessionId,
                        principalSchema: "public",
                        principalTable: "StudyReviewSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ── 14. Topic Quiz Configurations ──
            migrationBuilder.CreateTable(
                name: "TopicQuizConfigurations",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Programme = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    SubjectDomainId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    TopicSlug = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    TopicTitle = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    ClientNeedId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    QuestionCount = table.Column<int>(type: "integer", nullable: false),
                    Difficulty = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    TimeLimitMinutes = table.Column<int>(type: "integer", nullable: false),
                    ImmediateFeedback = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TopicQuizConfigurations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TopicQuizConfigurations_Users_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ── 15. Topic Quiz Attempts ──
            migrationBuilder.CreateTable(
                name: "TopicQuizAttempts",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ConfigurationId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Programme = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    TopicSlug = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    TopicTitle = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    ClientNeedId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    TotalQuestions = table.Column<int>(type: "integer", nullable: false),
                    CorrectCount = table.Column<int>(type: "integer", nullable: false),
                    IncorrectCount = table.Column<int>(type: "integer", nullable: false),
                    ScorePercentage = table.Column<double>(type: "double precision", nullable: false),
                    TimeSpentSeconds = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TopicQuizAttempts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TopicQuizAttempts_TopicQuizConfigurations_ConfigurationId",
                        column: x => x.ConfigurationId,
                        principalSchema: "public",
                        principalTable: "TopicQuizConfigurations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_TopicQuizAttempts_Users_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ── 16. Topic Quiz Responses ──
            migrationBuilder.CreateTable(
                name: "TopicQuizResponses",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    AttemptId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    QuestionId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    SelectedOptionIndicesJson = table.Column<string>(type: "text", nullable: false),
                    IsCorrect = table.Column<bool>(type: "boolean", nullable: false),
                    TimeSpentSeconds = table.Column<int>(type: "integer", nullable: false),
                    FlaggedForReview = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TopicQuizResponses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TopicQuizResponses_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalSchema: "public",
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TopicQuizResponses_TopicQuizAttempts_AttemptId",
                        column: x => x.AttemptId,
                        principalSchema: "public",
                        principalTable: "TopicQuizAttempts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ── 17. Curated Study Guides ──
            migrationBuilder.CreateTable(
                name: "CuratedStudyGuides",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    CategoryId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Slug = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Summary = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    ReadTime = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Difficulty = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Programme = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    ClientNeedId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    ClinicalKeyTakeawaysJson = table.Column<string>(type: "text", nullable: false),
                    ContentJson = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ScheduledPublishAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CuratedStudyGuides", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CuratedStudyGuides_StudyGuideCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalSchema: "public",
                        principalTable: "StudyGuideCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            // ── 18. Curated Guide Versions ──
            migrationBuilder.CreateTable(
                name: "CuratedGuideVersions",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    GuideId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    VersionNumber = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    ContentJson = table.Column<string>(type: "text", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ChangeSummary = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CuratedGuideVersions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CuratedGuideVersions_CuratedStudyGuides_GuideId",
                        column: x => x.GuideId,
                        principalSchema: "public",
                        principalTable: "CuratedStudyGuides",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ── 19. Indexes ──
            migrationBuilder.CreateIndex(
                name: "IX_AIContentReviews_ContentType",
                schema: "public",
                table: "AIContentReviews",
                column: "ContentType");

            migrationBuilder.CreateIndex(
                name: "IX_AIContentReviews_Status",
                schema: "public",
                table: "AIContentReviews",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_AIRequests_Feature",
                schema: "public",
                table: "AIRequests",
                column: "Feature");

            migrationBuilder.CreateIndex(
                name: "IX_AIRequests_UserId",
                schema: "public",
                table: "AIRequests",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AIRequests_UserId_CreatedAt",
                schema: "public",
                table: "AIRequests",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AIStudyPlans_UserId",
                schema: "public",
                table: "AIStudyPlans",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AIStudyPlans_UserId_IsActive",
                schema: "public",
                table: "AIStudyPlans",
                columns: new[] { "UserId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_AITutorConversations_UserId",
                schema: "public",
                table: "AITutorConversations",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AITutorConversations_UserId_TopicSlug",
                schema: "public",
                table: "AITutorConversations",
                columns: new[] { "UserId", "TopicSlug" });

            migrationBuilder.CreateIndex(
                name: "IX_AIUsageRecords_UserId_DateUtc",
                schema: "public",
                table: "AIUsageRecords",
                columns: new[] { "UserId", "DateUtc" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CuratedGuideVersions_GuideId",
                schema: "public",
                table: "CuratedGuideVersions",
                column: "GuideId");

            migrationBuilder.CreateIndex(
                name: "IX_CuratedStudyGuides_CategoryId",
                schema: "public",
                table: "CuratedStudyGuides",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_CuratedStudyGuides_ClientNeedId",
                schema: "public",
                table: "CuratedStudyGuides",
                column: "ClientNeedId");

            migrationBuilder.CreateIndex(
                name: "IX_CuratedStudyGuides_Programme_Status",
                schema: "public",
                table: "CuratedStudyGuides",
                columns: new[] { "Programme", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_CuratedStudyGuides_Slug",
                schema: "public",
                table: "CuratedStudyGuides",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StudyFolders_UserId",
                schema: "public",
                table: "StudyFolders",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_StudyFolders_UserId_IsArchived",
                schema: "public",
                table: "StudyFolders",
                columns: new[] { "UserId", "IsArchived" });

            migrationBuilder.CreateIndex(
                name: "IX_StudyGuideCategories_IsActive",
                schema: "public",
                table: "StudyGuideCategories",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_StudyGuideCategories_Slug",
                schema: "public",
                table: "StudyGuideCategories",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StudyNotes_ClientNeedId",
                schema: "public",
                table: "StudyNotes",
                column: "ClientNeedId");

            migrationBuilder.CreateIndex(
                name: "IX_StudyNotes_TopicSlug",
                schema: "public",
                table: "StudyNotes",
                column: "TopicSlug");

            migrationBuilder.CreateIndex(
                name: "IX_StudyNotes_UserId",
                schema: "public",
                table: "StudyNotes",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_StudyNotes_UserId_FolderId",
                schema: "public",
                table: "StudyNotes",
                columns: new[] { "UserId", "FolderId" });

            migrationBuilder.CreateIndex(
                name: "IX_StudyNotes_UserId_IsDeleted_IsArchived",
                schema: "public",
                table: "StudyNotes",
                columns: new[] { "UserId", "IsDeleted", "IsArchived" });

            migrationBuilder.CreateIndex(
                name: "IX_StudyNotes_UserId_Programme",
                schema: "public",
                table: "StudyNotes",
                columns: new[] { "UserId", "Programme" });

            migrationBuilder.CreateIndex(
                name: "IX_StudyNoteVersions_NoteId",
                schema: "public",
                table: "StudyNoteVersions",
                column: "NoteId");

            migrationBuilder.CreateIndex(
                name: "IX_StudyReviewSessionItems_FlashcardId",
                schema: "public",
                table: "StudyReviewSessionItems",
                column: "FlashcardId");

            migrationBuilder.CreateIndex(
                name: "IX_StudyReviewSessionItems_SessionId",
                schema: "public",
                table: "StudyReviewSessionItems",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_StudyReviewSessions_DeckId",
                schema: "public",
                table: "StudyReviewSessions",
                column: "DeckId");

            migrationBuilder.CreateIndex(
                name: "IX_StudyReviewSessions_UserId",
                schema: "public",
                table: "StudyReviewSessions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_StudyReviewSessions_UserId_Programme",
                schema: "public",
                table: "StudyReviewSessions",
                columns: new[] { "UserId", "Programme" });

            migrationBuilder.CreateIndex(
                name: "IX_StudyReviewSessions_UserId_Status",
                schema: "public",
                table: "StudyReviewSessions",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_TopicQuizAttempts_ClientNeedId",
                schema: "public",
                table: "TopicQuizAttempts",
                column: "ClientNeedId");

            migrationBuilder.CreateIndex(
                name: "IX_TopicQuizAttempts_ConfigurationId",
                schema: "public",
                table: "TopicQuizAttempts",
                column: "ConfigurationId");

            migrationBuilder.CreateIndex(
                name: "IX_TopicQuizAttempts_TopicSlug",
                schema: "public",
                table: "TopicQuizAttempts",
                column: "TopicSlug");

            migrationBuilder.CreateIndex(
                name: "IX_TopicQuizAttempts_UserId",
                schema: "public",
                table: "TopicQuizAttempts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TopicQuizAttempts_UserId_Programme",
                schema: "public",
                table: "TopicQuizAttempts",
                columns: new[] { "UserId", "Programme" });

            migrationBuilder.CreateIndex(
                name: "IX_TopicQuizAttempts_UserId_Status",
                schema: "public",
                table: "TopicQuizAttempts",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_TopicQuizConfigurations_Programme_TopicSlug",
                schema: "public",
                table: "TopicQuizConfigurations",
                columns: new[] { "Programme", "TopicSlug" });

            migrationBuilder.CreateIndex(
                name: "IX_TopicQuizConfigurations_UserId",
                schema: "public",
                table: "TopicQuizConfigurations",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TopicQuizResponses_AttemptId",
                schema: "public",
                table: "TopicQuizResponses",
                column: "AttemptId");

            migrationBuilder.CreateIndex(
                name: "IX_TopicQuizResponses_QuestionId",
                schema: "public",
                table: "TopicQuizResponses",
                column: "QuestionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AIContentReviews",
                schema: "public");

            migrationBuilder.DropTable(
                name: "AIProviderConfigurations",
                schema: "public");

            migrationBuilder.DropTable(
                name: "AIRequests",
                schema: "public");

            migrationBuilder.DropTable(
                name: "AIStudyPlans",
                schema: "public");

            migrationBuilder.DropTable(
                name: "AITutorConversations",
                schema: "public");

            migrationBuilder.DropTable(
                name: "AIUsageRecords",
                schema: "public");

            migrationBuilder.DropTable(
                name: "CuratedGuideVersions",
                schema: "public");

            migrationBuilder.DropTable(
                name: "CuratedStudyGuides",
                schema: "public");

            migrationBuilder.DropTable(
                name: "StudyGuideCategories",
                schema: "public");

            migrationBuilder.DropTable(
                name: "StudyNoteVersions",
                schema: "public");

            migrationBuilder.DropTable(
                name: "StudyNotes",
                schema: "public");

            migrationBuilder.DropTable(
                name: "StudyFolders",
                schema: "public");

            migrationBuilder.DropTable(
                name: "StudyReviewSessionItems",
                schema: "public");

            migrationBuilder.DropTable(
                name: "StudyReviewSessions",
                schema: "public");

            migrationBuilder.DropTable(
                name: "TopicQuizResponses",
                schema: "public");

            migrationBuilder.DropTable(
                name: "TopicQuizAttempts",
                schema: "public");

            migrationBuilder.DropTable(
                name: "TopicQuizConfigurations",
                schema: "public");

            migrationBuilder.DropColumn(
                name: "CardStyle",
                schema: "public",
                table: "Flashcards");

            migrationBuilder.DropColumn(
                name: "ClientNeedId",
                schema: "public",
                table: "Flashcards");

            migrationBuilder.DropColumn(
                name: "DiagramUrl",
                schema: "public",
                table: "Flashcards");

            migrationBuilder.DropColumn(
                name: "DisplayOrder",
                schema: "public",
                table: "Flashcards");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                schema: "public",
                table: "Flashcards");

            migrationBuilder.DropColumn(
                name: "IsDifficult",
                schema: "public",
                table: "Flashcards");

            migrationBuilder.DropColumn(
                name: "IsFavourite",
                schema: "public",
                table: "Flashcards");

            migrationBuilder.DropColumn(
                name: "SubjectDomainId",
                schema: "public",
                table: "Flashcards");

            migrationBuilder.DropColumn(
                name: "TagsJson",
                schema: "public",
                table: "Flashcards");

            migrationBuilder.DropColumn(
                name: "TopicSlug",
                schema: "public",
                table: "Flashcards");

            migrationBuilder.DropColumn(
                name: "TopicTitle",
                schema: "public",
                table: "Flashcards");

            migrationBuilder.DropColumn(
                name: "ClientNeedId",
                schema: "public",
                table: "FlashcardDecks");

            migrationBuilder.DropColumn(
                name: "IsFavourite",
                schema: "public",
                table: "FlashcardDecks");

            migrationBuilder.DropColumn(
                name: "TagsJson",
                schema: "public",
                table: "FlashcardDecks");
        }
    }
}
