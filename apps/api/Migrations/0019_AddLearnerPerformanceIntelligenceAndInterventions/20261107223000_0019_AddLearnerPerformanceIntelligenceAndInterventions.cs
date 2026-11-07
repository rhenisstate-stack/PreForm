using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Preform.Api.Migrations
{
    /// <inheritdoc />
    public partial class _0019_AddLearnerPerformanceIntelligenceAndInterventions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LearnerPerformanceRecommendations",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    Pathway = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Priority = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    Evidence = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    SuggestedAction = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    ActionHref = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    TargetClientNeedCode = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    TargetQuestionTypeKey = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DismissedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LearnerPerformanceRecommendations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LearnerPerformanceRecommendations_Users_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LearnerInterventions",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    RecommendationId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Pathway = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    TargetClientNeedCode = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    TargetQuestionTypeKey = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    BaselineAccuracyPercent = table.Column<decimal>(type: "numeric", nullable: false),
                    BaselineQuestionsAnswered = table.Column<int>(type: "integer", nullable: false),
                    PostInterventionAccuracyPercent = table.Column<decimal>(type: "numeric", nullable: false),
                    PostInterventionQuestionsAnswered = table.Column<int>(type: "integer", nullable: false),
                    ActivityCount = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastEvaluatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LearnerInterventions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LearnerInterventions_LearnerPerformanceRecommendations_RecommendationId",
                        column: x => x.RecommendationId,
                        principalSchema: "public",
                        principalTable: "LearnerPerformanceRecommendations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_LearnerInterventions_Users_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LearnerPerformanceRecommendations_UserId",
                schema: "public",
                table: "LearnerPerformanceRecommendations",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_LearnerPerformanceRecommendations_UserId_Pathway",
                schema: "public",
                table: "LearnerPerformanceRecommendations",
                columns: new[] { "UserId", "Pathway" });

            migrationBuilder.CreateIndex(
                name: "IX_LearnerPerformanceRecommendations_UserId_Status",
                schema: "public",
                table: "LearnerPerformanceRecommendations",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_LearnerInterventions_RecommendationId",
                schema: "public",
                table: "LearnerInterventions",
                column: "RecommendationId");

            migrationBuilder.CreateIndex(
                name: "IX_LearnerInterventions_UserId",
                schema: "public",
                table: "LearnerInterventions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_LearnerInterventions_UserId_Pathway",
                schema: "public",
                table: "LearnerInterventions",
                columns: new[] { "UserId", "Pathway" });

            migrationBuilder.CreateIndex(
                name: "IX_LearnerInterventions_UserId_Status",
                schema: "public",
                table: "LearnerInterventions",
                columns: new[] { "UserId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LearnerInterventions",
                schema: "public");

            migrationBuilder.DropTable(
                name: "LearnerPerformanceRecommendations",
                schema: "public");
        }
    }
}
