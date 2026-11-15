using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Preform.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAttemptResponseStructuredJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StructuredResponseJson",
                schema: "public",
                table: "AttemptResponses",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StructuredResponseJson",
                schema: "public",
                table: "AttemptResponses");
        }
    }
}
