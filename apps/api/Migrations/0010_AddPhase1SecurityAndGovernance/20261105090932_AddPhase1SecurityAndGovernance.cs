using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Preform.Api.Migrations._0010_AddPhase1SecurityAndGovernance
{
    /// <inheritdoc />
    public partial class AddPhase1SecurityAndGovernance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccountStatus",
                schema: "public",
                table: "Users",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Active");

            migrationBuilder.AddColumn<DateTime>(
                name: "SuspendedAt",
                schema: "public",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SuspensionReason",
                schema: "public",
                table: "Users",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AfterValueJson",
                schema: "public",
                table: "AuditLogs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BeforeValueJson",
                schema: "public",
                table: "AuditLogs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CorrelationId",
                schema: "public",
                table: "AuditLogs",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Severity",
                schema: "public",
                table: "AuditLogs",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Information");

            migrationBuilder.AddColumn<string>(
                name: "UserAgent",
                schema: "public",
                table: "AuditLogs",
                type: "character varying(512)",
                maxLength: 512,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "IpAccessRules",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    IpAddressOrCidr = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    RuleType = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Description = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IpAccessRules", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PasswordResetTokens",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PasswordResetTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PasswordResetTokens_Users_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RateLimitBuckets",
                schema: "public",
                columns: table => new
                {
                    Key = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    AttemptCount = table.Column<int>(type: "integer", nullable: false),
                    WindowStartUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LockoutUntilUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastAttemptUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RateLimitBuckets", x => x.Key);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_AccountStatus",
                schema: "public",
                table: "Users",
                column: "AccountStatus");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_CorrelationId",
                schema: "public",
                table: "AuditLogs",
                column: "CorrelationId");

            migrationBuilder.CreateIndex(
                name: "IX_IpAccessRules_IpAddressOrCidr",
                schema: "public",
                table: "IpAccessRules",
                column: "IpAddressOrCidr");

            migrationBuilder.CreateIndex(
                name: "IX_IpAccessRules_RuleType_IsActive",
                schema: "public",
                table: "IpAccessRules",
                columns: new[] { "RuleType", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_TokenHash",
                schema: "public",
                table: "PasswordResetTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_UserId_ExpiresAt_UsedAt",
                schema: "public",
                table: "PasswordResetTokens",
                columns: new[] { "UserId", "ExpiresAt", "UsedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_RateLimitBuckets_ExpiresAtUtc",
                schema: "public",
                table: "RateLimitBuckets",
                column: "ExpiresAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_RateLimitBuckets_LockoutUntilUtc",
                schema: "public",
                table: "RateLimitBuckets",
                column: "LockoutUntilUtc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IpAccessRules",
                schema: "public");

            migrationBuilder.DropTable(
                name: "PasswordResetTokens",
                schema: "public");

            migrationBuilder.DropTable(
                name: "RateLimitBuckets",
                schema: "public");

            migrationBuilder.DropIndex(
                name: "IX_Users_AccountStatus",
                schema: "public",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_CorrelationId",
                schema: "public",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "AccountStatus",
                schema: "public",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SuspendedAt",
                schema: "public",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SuspensionReason",
                schema: "public",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AfterValueJson",
                schema: "public",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "BeforeValueJson",
                schema: "public",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "CorrelationId",
                schema: "public",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "Severity",
                schema: "public",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "UserAgent",
                schema: "public",
                table: "AuditLogs");
        }
    }
}
