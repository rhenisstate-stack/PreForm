using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Preform.Api.Data;

#nullable disable

namespace Preform.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261028090000_AddUserProfileImages")]
public partial class AddUserProfileImages : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "HasProfileImage",
            schema: "public",
            table: "Users",
            type: "boolean",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<DateTime>(
            name: "ProfileImageUpdatedAt",
            schema: "public",
            table: "Users",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.CreateTable(
            name: "UserProfileImages",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                UserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                UserEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                ImageData = table.Column<byte[]>(type: "bytea", nullable: false),
                ContentType = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                SizeBytes = table.Column<int>(type: "integer", nullable: false),
                Sha256Hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_UserProfileImages", x => x.Id);
                table.ForeignKey(
                    name: "FK_UserProfileImages_Users_UserId",
                    column: x => x.UserId,
                    principalSchema: "public",
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_UserProfileImages_UserId",
            schema: "public",
            table: "UserProfileImages",
            column: "UserId",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_UserProfileImages_UserEmail",
            schema: "public",
            table: "UserProfileImages",
            column: "UserEmail",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "UserProfileImages",
            schema: "public");

        migrationBuilder.DropColumn(
            name: "HasProfileImage",
            schema: "public",
            table: "Users");

        migrationBuilder.DropColumn(
            name: "ProfileImageUpdatedAt",
            schema: "public",
            table: "Users");
    }
}
