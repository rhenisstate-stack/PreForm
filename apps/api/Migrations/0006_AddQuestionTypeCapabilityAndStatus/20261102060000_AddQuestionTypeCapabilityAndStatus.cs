using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Preform.Api.Migrations._0006_AddQuestionTypeCapabilityAndStatus
{
    /// <inheritdoc />
    public partial class AddQuestionTypeCapabilityAndStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CapabilityFlags",
                schema: "public",
                table: "QuestionTypeDefinitions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ImplementationStatus",
                schema: "public",
                table: "QuestionTypeDefinitions",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Catalogued");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImplementationStatus",
                schema: "public",
                table: "QuestionTypeDefinitions");

            migrationBuilder.DropColumn(
                name: "CapabilityFlags",
                schema: "public",
                table: "QuestionTypeDefinitions");
        }
    }
}
