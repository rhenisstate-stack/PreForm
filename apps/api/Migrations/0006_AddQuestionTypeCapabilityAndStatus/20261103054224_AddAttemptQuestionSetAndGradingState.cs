using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Preform.Api.Migrations._0006_AddQuestionTypeCapabilityAndStatus
{
    /// <inheritdoc />
    /// <remarks>
    /// Additive Gate C migration:
    /// 1. AttemptResponses.GradingState — explicit grading state so a response
    ///    without authoritative grading data is never silently recorded as an
    ///    incorrect (zero-scored) answer. Default 1 = ResponseGradingState.Graded,
    ///    preserving the historical meaning of all existing rows.
    /// 2. ExamAttemptQuestions — persisted per-attempt question set, the authority
    ///    used to enforce exact question membership for every response.
    /// This migration must never recreate tables owned by 0001/0002/0005; doing so
    /// breaks sequential application to a fresh database.
    /// </remarks>
    public partial class AddAttemptQuestionSetAndGradingState : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "GradingState",
                schema: "public",
                table: "AttemptResponses",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "ExamAttemptQuestions",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ExamAttemptId = table.Column<string>(type: "text", nullable: false),
                    QuestionId = table.Column<string>(type: "text", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExamAttemptQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExamAttemptQuestions_ExamAttempts_ExamAttemptId",
                        column: x => x.ExamAttemptId,
                        principalSchema: "public",
                        principalTable: "ExamAttempts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExamAttemptQuestions_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalSchema: "public",
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExamAttemptQuestions_ExamAttemptId",
                schema: "public",
                table: "ExamAttemptQuestions",
                column: "ExamAttemptId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamAttemptQuestions_ExamAttemptId_QuestionId",
                schema: "public",
                table: "ExamAttemptQuestions",
                columns: new[] { "ExamAttemptId", "QuestionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExamAttemptQuestions_QuestionId",
                schema: "public",
                table: "ExamAttemptQuestions",
                column: "QuestionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExamAttemptQuestions",
                schema: "public");

            migrationBuilder.DropColumn(
                name: "GradingState",
                schema: "public",
                table: "AttemptResponses");
        }
    }
}
