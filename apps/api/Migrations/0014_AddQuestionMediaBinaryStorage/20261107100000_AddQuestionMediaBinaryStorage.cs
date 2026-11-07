using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Preform.Api.Data;

#nullable disable

namespace Preform.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261107100000_AddQuestionMediaBinaryStorage")]
public partial class AddQuestionMediaBinaryStorage : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "QuestionMedia",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                QuestionId = table.Column<string>(type: "text", nullable: true),
                FieldKey = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false, defaultValue: ""),
                FileName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                ContentType = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                Sha256Hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                ImageData = table.Column<byte[]>(type: "bytea", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                CreatedById = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_QuestionMedia", x => x.Id);
                table.ForeignKey(
                    name: "FK_QuestionMedia_Questions_QuestionId",
                    column: x => x.QuestionId,
                    principalSchema: "public",
                    principalTable: "Questions",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_QuestionMedia_Users_CreatedById",
                    column: x => x.CreatedById,
                    principalSchema: "public",
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateIndex(
            name: "IX_QuestionMedia_QuestionId",
            schema: "public",
            table: "QuestionMedia",
            column: "QuestionId");

        migrationBuilder.CreateIndex(
            name: "IX_QuestionMedia_Sha256Hash",
            schema: "public",
            table: "QuestionMedia",
            column: "Sha256Hash");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "QuestionMedia",
            schema: "public");
    }
}
