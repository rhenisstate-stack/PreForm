using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Preform.Api.Migrations._0008_AddExamQuestionMembershipUniqueIndex
{
    /// <inheritdoc />
    public partial class AddExamQuestionMembershipUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_ExamQuestions_ExamId_QuestionId",
                schema: "public",
                table: "ExamQuestions",
                columns: new[] { "ExamId", "QuestionId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ExamQuestions_ExamId_QuestionId",
                schema: "public",
                table: "ExamQuestions");
        }
    }
}
