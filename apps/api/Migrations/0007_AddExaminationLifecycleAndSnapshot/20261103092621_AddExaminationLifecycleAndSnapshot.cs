using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Preform.Api.Migrations._0007_AddExaminationLifecycleAndSnapshot
{
    /// <inheritdoc />
    public partial class AddExaminationLifecycleAndSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                schema: "public",
                table: "Exams",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApprovedBy",
                schema: "public",
                table: "Exams",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ArchivedAt",
                schema: "public",
                table: "Exams",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ArchivedBy",
                schema: "public",
                table: "Exams",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ConcurrencyToken",
                schema: "public",
                table: "Exams",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                schema: "public",
                table: "Exams",
                type: "character varying(128)",
                maxLength: 128,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ExaminationId",
                schema: "public",
                table: "Exams",
                type: "text",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LifecycleState",
                schema: "public",
                table: "Exams",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAt",
                schema: "public",
                table: "Exams",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PublishedBy",
                schema: "public",
                table: "Exams",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RetiredAt",
                schema: "public",
                table: "Exams",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RetiredBy",
                schema: "public",
                table: "Exams",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                schema: "public",
                table: "Exams",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewedBy",
                schema: "public",
                table: "Exams",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RevisionNumber",
                schema: "public",
                table: "Exams",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "SubmittedAt",
                schema: "public",
                table: "Exams",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SubmittedBy",
                schema: "public",
                table: "Exams",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MetadataSnapshot",
                schema: "public",
                table: "ExamAttempts",
                type: "jsonb",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Examinations",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Pathway = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Code = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Title = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    CurrentRevisionId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    SuccessorExaminationId = table.Column<string>(type: "text", maxLength: 128, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Examinations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Examinations_Examinations_SuccessorExaminationId",
                        column: x => x.SuccessorExaminationId,
                        principalSchema: "public",
                        principalTable: "Examinations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Examinations_Exams_CurrentRevisionId",
                        column: x => x.CurrentRevisionId,
                        principalSchema: "public",
                        principalTable: "Exams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Exams_ExaminationId_ActiveDraft",
                schema: "public",
                table: "Exams",
                column: "ExaminationId",
                unique: true,
                filter: "\"LifecycleState\" = 1");

            migrationBuilder.CreateIndex(
                name: "IX_Exams_ExaminationId_RevisionNumber",
                schema: "public",
                table: "Exams",
                columns: new[] { "ExaminationId", "RevisionNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Exams_ExaminationId_SinglePublished",
                schema: "public",
                table: "Exams",
                column: "ExaminationId",
                unique: true,
                filter: "\"LifecycleState\" = 4");

            migrationBuilder.CreateIndex(
                name: "IX_Exams_LifecycleState",
                schema: "public",
                table: "Exams",
                column: "LifecycleState");

            migrationBuilder.CreateIndex(
                name: "IX_Examinations_Code",
                schema: "public",
                table: "Examinations",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Examinations_CurrentRevisionId",
                schema: "public",
                table: "Examinations",
                column: "CurrentRevisionId");

            migrationBuilder.CreateIndex(
                name: "IX_Examinations_Pathway_Code",
                schema: "public",
                table: "Examinations",
                columns: new[] { "Pathway", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Examinations_SuccessorExaminationId",
                schema: "public",
                table: "Examinations",
                column: "SuccessorExaminationId");

            migrationBuilder.AddForeignKey(
                name: "FK_Exams_Examinations_ExaminationId",
                schema: "public",
                table: "Exams",
                column: "ExaminationId",
                principalSchema: "public",
                principalTable: "Examinations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.Sql(@"
CREATE SEQUENCE IF NOT EXISTS exam_code_rn_seq 
    START WITH 1 
    INCREMENT BY 1 
    MINVALUE 1 
    MAXVALUE 999999 
    NO CYCLE;

CREATE SEQUENCE IF NOT EXISTS exam_code_pn_seq 
    START WITH 1 
    INCREMENT BY 1 
    MINVALUE 1 
    MAXVALUE 999999 
    NO CYCLE;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Exams_Examinations_ExaminationId",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropTable(
                name: "Examinations",
                schema: "public");

            migrationBuilder.DropIndex(
                name: "IX_Exams_ExaminationId_ActiveDraft",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropIndex(
                name: "IX_Exams_ExaminationId_RevisionNumber",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropIndex(
                name: "IX_Exams_ExaminationId_SinglePublished",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropIndex(
                name: "IX_Exams_LifecycleState",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "ApprovedBy",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "ArchivedAt",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "ArchivedBy",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "ConcurrencyToken",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "ExaminationId",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "LifecycleState",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "PublishedAt",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "PublishedBy",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "RetiredAt",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "RetiredBy",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "ReviewedBy",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "RevisionNumber",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "SubmittedAt",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "SubmittedBy",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "MetadataSnapshot",
                schema: "public",
                table: "ExamAttempts");

            migrationBuilder.Sql(@"
DROP SEQUENCE IF EXISTS exam_code_rn_seq;
DROP SEQUENCE IF EXISTS exam_code_pn_seq;
");
        }
    }
}
