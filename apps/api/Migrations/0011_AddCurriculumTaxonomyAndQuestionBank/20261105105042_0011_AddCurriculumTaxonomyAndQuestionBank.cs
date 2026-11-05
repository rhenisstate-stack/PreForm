using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Preform.Api.Migrations._0011_AddCurriculumTaxonomyAndQuestionBank
{
    /// <inheritdoc />
    public partial class _0011_AddCurriculumTaxonomyAndQuestionBank : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                schema: "public",
                table: "Topics",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ChangeSummary",
                schema: "public",
                table: "QuestionVersions",
                type: "character varying(512)",
                maxLength: 512,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                schema: "public",
                table: "QuestionVersions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ClientNeedId",
                schema: "public",
                table: "Questions",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClinicalJudgmentStep",
                schema: "public",
                table: "Questions",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Code",
                schema: "public",
                table: "Questions",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CognitiveLevel",
                schema: "public",
                table: "Questions",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAt",
                schema: "public",
                table: "Questions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                schema: "public",
                table: "Questions",
                type: "character varying(512)",
                maxLength: 512,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Source",
                schema: "public",
                table: "Questions",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StructuredContentJson",
                schema: "public",
                table: "Questions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MediaUrl",
                schema: "public",
                table: "QuestionOptions",
                type: "character varying(512)",
                maxLength: 512,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                schema: "public",
                table: "Courses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "ClientNeeds",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Pathway = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClientNeeds", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Topics_IsPublished",
                schema: "public",
                table: "Topics",
                column: "IsPublished");

            migrationBuilder.CreateIndex(
                name: "IX_SubjectDomains_IsActive",
                schema: "public",
                table: "SubjectDomains",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Subcategories_IsActive",
                schema: "public",
                table: "Subcategories",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Questions_ClientNeedId",
                schema: "public",
                table: "Questions",
                column: "ClientNeedId");

            migrationBuilder.CreateIndex(
                name: "IX_Questions_Code",
                schema: "public",
                table: "Questions",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Courses_IsActive",
                schema: "public",
                table: "Courses",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_IsActive",
                schema: "public",
                table: "Categories",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ClientNeeds_Code",
                schema: "public",
                table: "ClientNeeds",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClientNeeds_IsActive",
                schema: "public",
                table: "ClientNeeds",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ClientNeeds_Pathway",
                schema: "public",
                table: "ClientNeeds",
                column: "Pathway");

            migrationBuilder.AddForeignKey(
                name: "FK_Questions_ClientNeeds_ClientNeedId",
                schema: "public",
                table: "Questions",
                column: "ClientNeedId",
                principalSchema: "public",
                principalTable: "ClientNeeds",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Questions_ClientNeeds_ClientNeedId",
                schema: "public",
                table: "Questions");

            migrationBuilder.DropTable(
                name: "ClientNeeds",
                schema: "public");

            migrationBuilder.DropIndex(
                name: "IX_Topics_IsPublished",
                schema: "public",
                table: "Topics");

            migrationBuilder.DropIndex(
                name: "IX_SubjectDomains_IsActive",
                schema: "public",
                table: "SubjectDomains");

            migrationBuilder.DropIndex(
                name: "IX_Subcategories_IsActive",
                schema: "public",
                table: "Subcategories");

            migrationBuilder.DropIndex(
                name: "IX_Questions_ClientNeedId",
                schema: "public",
                table: "Questions");

            migrationBuilder.DropIndex(
                name: "IX_Questions_Code",
                schema: "public",
                table: "Questions");

            migrationBuilder.DropIndex(
                name: "IX_Courses_IsActive",
                schema: "public",
                table: "Courses");

            migrationBuilder.DropIndex(
                name: "IX_Categories_IsActive",
                schema: "public",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "IsActive",
                schema: "public",
                table: "Topics");

            migrationBuilder.DropColumn(
                name: "ChangeSummary",
                schema: "public",
                table: "QuestionVersions");

            migrationBuilder.DropColumn(
                name: "Status",
                schema: "public",
                table: "QuestionVersions");

            migrationBuilder.DropColumn(
                name: "ClientNeedId",
                schema: "public",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "ClinicalJudgmentStep",
                schema: "public",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "Code",
                schema: "public",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "CognitiveLevel",
                schema: "public",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "PublishedAt",
                schema: "public",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                schema: "public",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "Source",
                schema: "public",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "StructuredContentJson",
                schema: "public",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "MediaUrl",
                schema: "public",
                table: "QuestionOptions");

            migrationBuilder.DropColumn(
                name: "IsActive",
                schema: "public",
                table: "Courses");
        }
    }
}
