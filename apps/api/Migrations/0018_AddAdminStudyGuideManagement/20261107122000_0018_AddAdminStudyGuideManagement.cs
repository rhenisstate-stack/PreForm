using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Preform.Api.Migrations
{
    /// <inheritdoc />
    public partial class _0018_AddAdminStudyGuideManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── 1. StudyNotes publication columns ──
            migrationBuilder.AddColumn<string>(
                name: "Status",
                schema: "public",
                table: "StudyNotes",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Draft");

            migrationBuilder.AddColumn<bool>(
                name: "IsOfficial",
                schema: "public",
                table: "StudyNotes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "StudyGuideId",
                schema: "public",
                table: "StudyNotes",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            // ── 2. FlashcardDecks publishing & official markers ──
            migrationBuilder.AddColumn<bool>(
                name: "IsPublished",
                schema: "public",
                table: "FlashcardDecks",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsOfficial",
                schema: "public",
                table: "FlashcardDecks",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // ── 3. TopicQuizConfigurations administration columns ──
            migrationBuilder.AddColumn<string>(
                name: "Description",
                schema: "public",
                table: "TopicQuizConfigurations",
                type: "character varying(1024)",
                maxLength: 1024,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                schema: "public",
                table: "TopicQuizConfigurations",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Draft");

            migrationBuilder.AddColumn<bool>(
                name: "IsPublished",
                schema: "public",
                table: "TopicQuizConfigurations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsOfficial",
                schema: "public",
                table: "TopicQuizConfigurations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "QuestionIdsJson",
                schema: "public",
                table: "TopicQuizConfigurations",
                type: "text",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "FeedbackMode",
                schema: "public",
                table: "TopicQuizConfigurations",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "immediate");

            migrationBuilder.AddColumn<int>(
                name: "MaxAttempts",
                schema: "public",
                table: "TopicQuizConfigurations",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // ── 4. StudyReviewConfigurations table ──
            migrationBuilder.CreateTable(
                name: "StudyReviewConfigurations",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    MaxCardsPerSession = table.Column<int>(type: "integer", nullable: false, defaultValue: 50),
                    DefaultCardLimit = table.Column<int>(type: "integer", nullable: false, defaultValue: 20),
                    SupportedModesJson = table.Column<string>(type: "text", nullable: false, defaultValue: "[\"all_due\", \"deck\", \"difficult\", \"favourites\", \"random\"]"),
                    EnableRn = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    EnablePn = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    RequireSubscription = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    AllowCustomDrills = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    MinIntervalDays = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    DefaultEaseFactor = table.Column<double>(type: "double precision", nullable: false, defaultValue: 2.5),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<string>(type: "text", nullable: false, defaultValue: "admin")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudyReviewConfigurations", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StudyReviewConfigurations",
                schema: "public");

            migrationBuilder.DropColumn(
                name: "MaxAttempts",
                schema: "public",
                table: "TopicQuizConfigurations");

            migrationBuilder.DropColumn(
                name: "FeedbackMode",
                schema: "public",
                table: "TopicQuizConfigurations");

            migrationBuilder.DropColumn(
                name: "QuestionIdsJson",
                schema: "public",
                table: "TopicQuizConfigurations");

            migrationBuilder.DropColumn(
                name: "IsOfficial",
                schema: "public",
                table: "TopicQuizConfigurations");

            migrationBuilder.DropColumn(
                name: "IsPublished",
                schema: "public",
                table: "TopicQuizConfigurations");

            migrationBuilder.DropColumn(
                name: "Status",
                schema: "public",
                table: "TopicQuizConfigurations");

            migrationBuilder.DropColumn(
                name: "Description",
                schema: "public",
                table: "TopicQuizConfigurations");

            migrationBuilder.DropColumn(
                name: "IsOfficial",
                schema: "public",
                table: "FlashcardDecks");

            migrationBuilder.DropColumn(
                name: "IsPublished",
                schema: "public",
                table: "FlashcardDecks");

            migrationBuilder.DropColumn(
                name: "StudyGuideId",
                schema: "public",
                table: "StudyNotes");

            migrationBuilder.DropColumn(
                name: "IsOfficial",
                schema: "public",
                table: "StudyNotes");

            migrationBuilder.DropColumn(
                name: "Status",
                schema: "public",
                table: "StudyNotes");
        }
    }
}
