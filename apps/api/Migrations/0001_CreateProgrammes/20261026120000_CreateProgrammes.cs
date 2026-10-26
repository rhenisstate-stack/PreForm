using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Preform.Api.Migrations;

public partial class CreateProgrammes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.EnsureSchema(
            name: "public");

        migrationBuilder.CreateTable(
            name: "Programme",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                Code = table.Column<string>(type: "text", nullable: false),
                DisplayName = table.Column<string>(type: "text", nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Programme", x => x.Id);
            });

        migrationBuilder.CreateIndex(
            name: "IX_Programme_Code",
            table: "Programme",
            column: "Code",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Programme_IsActive",
            table: "Programme",
            column: "IsActive");

        migrationBuilder.InsertData(
            table: "Programme",
            columns: new[] { "Id", "Code", "DisplayName", "IsActive", "CreatedAt", "UpdatedAt" },
            values: new object[,]
            {
                { "programme_rn", "RN", "NCLEX-RN", true, new DateTime(2026, 10, 26, 12, 0, 0, DateTimeKind.Utc), new DateTime(2026, 10, 26, 12, 0, 0, DateTimeKind.Utc) },
                { "programme_pn", "PN", "NCLEX-PN", true, new DateTime(2026, 10, 26, 12, 0, 0, DateTimeKind.Utc), new DateTime(2026, 10, 26, 12, 0, 0, DateTimeKind.Utc) }
            });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DeleteData(
            table: "Programme",
            keyColumn: "Id",
            keyValues: new object[] { "programme_rn", "programme_pn" });

        migrationBuilder.DropIndex(
            name: "IX_Programme_Code",
            table: "Programme");

        migrationBuilder.DropIndex(
            name: "IX_Programme_IsActive",
            table: "Programme");

        migrationBuilder.DropTable(
            name: "Programme");
    }
}
