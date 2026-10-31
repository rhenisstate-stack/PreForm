using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Preform.Api.Data;

#nullable disable

namespace Preform.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261031100000_AddStudyStudioFlashcards")]
public partial class AddStudyStudioFlashcards : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "FlashcardDecks",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                UserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                UserEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                Description = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                Programme = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                SourceType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                SourceReference = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                TopicSlug = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                TopicTitle = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                IsArchived = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_FlashcardDecks", x => x.Id);
                table.ForeignKey(
                    name: "FK_FlashcardDecks_Users_UserId",
                    column: x => x.UserId,
                    principalSchema: "public",
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "Flashcards",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                DeckId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                UserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                Front = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                Back = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                Explanation = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                Difficulty = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false, defaultValue: "medium"),
                Programme = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "rn"),
                Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false, defaultValue: "active"),
                SourceType = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                SourceReference = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                RepetitionCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                EaseFactor = table.Column<double>(type: "double precision", nullable: false, defaultValue: 2.5),
                IntervalDays = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                DueAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                LastReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Flashcards", x => x.Id);
                table.ForeignKey(
                    name: "FK_Flashcards_FlashcardDecks_DeckId",
                    column: x => x.DeckId,
                    principalSchema: "public",
                    principalTable: "FlashcardDecks",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "FlashcardReviews",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                FlashcardId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                UserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                RecallRating = table.Column<int>(type: "integer", nullable: false),
                IntervalDays = table.Column<int>(type: "integer", nullable: false),
                EaseFactor = table.Column<double>(type: "double precision", nullable: false),
                RepetitionCount = table.Column<int>(type: "integer", nullable: false),
                ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_FlashcardReviews", x => x.Id);
                table.ForeignKey(
                    name: "FK_FlashcardReviews_Flashcards_FlashcardId",
                    column: x => x.FlashcardId,
                    principalSchema: "public",
                    principalTable: "Flashcards",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_FlashcardDecks_UserId",
            schema: "public",
            table: "FlashcardDecks",
            column: "UserId");

        migrationBuilder.CreateIndex(
            name: "IX_FlashcardDecks_UserId_IsArchived",
            schema: "public",
            table: "FlashcardDecks",
            columns: new[] { "UserId", "IsArchived" });

        migrationBuilder.CreateIndex(
            name: "IX_FlashcardDecks_UserId_Programme",
            schema: "public",
            table: "FlashcardDecks",
            columns: new[] { "UserId", "Programme" });

        migrationBuilder.CreateIndex(
            name: "IX_Flashcards_DeckId",
            schema: "public",
            table: "Flashcards",
            column: "DeckId");

        migrationBuilder.CreateIndex(
            name: "IX_Flashcards_UserId_DueAt",
            schema: "public",
            table: "Flashcards",
            columns: new[] { "UserId", "DueAt" });

        migrationBuilder.CreateIndex(
            name: "IX_Flashcards_UserId_Status",
            schema: "public",
            table: "Flashcards",
            columns: new[] { "UserId", "Status" });

        migrationBuilder.CreateIndex(
            name: "IX_FlashcardReviews_FlashcardId",
            schema: "public",
            table: "FlashcardReviews",
            column: "FlashcardId");

        migrationBuilder.CreateIndex(
            name: "IX_FlashcardReviews_UserId_ReviewedAt",
            schema: "public",
            table: "FlashcardReviews",
            columns: new[] { "UserId", "ReviewedAt" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "FlashcardReviews",
            schema: "public");

        migrationBuilder.DropTable(
            name: "Flashcards",
            schema: "public");

        migrationBuilder.DropTable(
            name: "FlashcardDecks",
            schema: "public");
    }
}
