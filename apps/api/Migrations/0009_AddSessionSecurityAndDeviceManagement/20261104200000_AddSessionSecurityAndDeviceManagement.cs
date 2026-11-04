using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Preform.Api.Migrations._0009_AddSessionSecurityAndDeviceManagement
{
    /// <inheritdoc />
    public partial class AddSessionSecurityAndDeviceManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Add SecurityVersion to Users table
            migrationBuilder.AddColumn<int>(
                name: "SecurityVersion",
                schema: "public",
                table: "Users",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            // 2. Add Session Security & Device columns to UserSessions table
            migrationBuilder.AddColumn<string>(
                name: "ClientId",
                schema: "public",
                table: "UserSessions",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "IdleExpiresAt",
                schema: "public",
                table: "UserSessions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 11, 4, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.AddColumn<DateTime>(
                name: "AbsoluteExpiresAt",
                schema: "public",
                table: "UserSessions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 11, 11, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.AddColumn<DateTime>(
                name: "RevokedAt",
                schema: "public",
                table: "UserSessions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RevocationReason",
                schema: "public",
                table: "UserSessions",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastIpAddress",
                schema: "public",
                table: "UserSessions",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserAgent",
                schema: "public",
                table: "UserSessions",
                type: "character varying(512)",
                maxLength: 512,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeviceLabel",
                schema: "public",
                table: "UserSessions",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FingerprintHash",
                schema: "public",
                table: "UserSessions",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SecurityVersion",
                schema: "public",
                table: "UserSessions",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            // 3. Safe Backfill for pre-existing Users and UserSessions
            migrationBuilder.Sql(@"
                UPDATE ""public"".""Users"" 
                SET ""SecurityVersion"" = 1 
                WHERE ""SecurityVersion"" IS NULL OR ""SecurityVersion"" = 0;

                UPDATE ""public"".""UserSessions"" 
                SET ""IdleExpiresAt"" = ""ExpiresAt"",
                    ""AbsoluteExpiresAt"" = ""ExpiresAt"",
                    ""ClientId"" = CASE WHEN ""ClientId"" IS NULL OR ""ClientId"" = '' THEN 'legacy_' || ""Id"" ELSE ""ClientId"" END,
                    ""SecurityVersion"" = 1,
                    ""RevokedAt"" = CASE WHEN ""Revoked"" AND ""RevokedAt"" IS NULL THEN ""LastActiveAt"" ELSE ""RevokedAt"" END,
                    ""RevocationReason"" = CASE WHEN ""Revoked"" AND ""RevocationReason"" IS NULL THEN 'LegacyRevocation' ELSE ""RevocationReason"" END;
            ");

            // 4. Create SessionSecurityPolicies Table
            migrationBuilder.CreateTable(
                name: "SessionSecurityPolicies",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    MaxConcurrentSessions = table.Column<int>(type: "integer", nullable: false, defaultValue: 2),
                    MaxSessionsPerClient = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    IdleTimeoutMinutes = table.Column<int>(type: "integer", nullable: false, defaultValue: 300),
                    AbsoluteTimeoutMinutes = table.Column<int>(type: "integer", nullable: false, defaultValue: 10080),
                    EnforceFingerprint = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    EnforceIpConsistency = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    AllowIpDrift = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    RotateOnLogin = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    RotateOnPrivilegeChange = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    RotateOnPasswordChange = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    PolicyVersion = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true, defaultValue: "system"),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionSecurityPolicies", x => x.Id);
                });

            // 5. Seed default global_policy row
            migrationBuilder.Sql(@"
                INSERT INTO ""public"".""SessionSecurityPolicies"" (
                    ""Id"", ""MaxConcurrentSessions"", ""MaxSessionsPerClient"", 
                    ""IdleTimeoutMinutes"", ""AbsoluteTimeoutMinutes"", 
                    ""EnforceFingerprint"", ""EnforceIpConsistency"", ""AllowIpDrift"", 
                    ""RotateOnLogin"", ""RotateOnPrivilegeChange"", ""RotateOnPasswordChange"", 
                    ""PolicyVersion"", ""UpdatedAt"", ""UpdatedBy"", ""IsActive""
                ) VALUES (
                    'global_policy', 2, 1, 300, 10080, TRUE, FALSE, TRUE, TRUE, TRUE, TRUE, 1, NOW() AT TIME ZONE 'UTC', 'system', TRUE
                ) ON CONFLICT (""Id"") DO NOTHING;
            ");

            // 6. Create Indexes
            migrationBuilder.CreateIndex(
                name: "IX_UserSessions_UserId_Revoked_AbsoluteExpiresAt",
                schema: "public",
                table: "UserSessions",
                columns: new[] { "UserId", "Revoked", "AbsoluteExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_UserSessions_ClientId_Revoked_AbsoluteExpiresAt",
                schema: "public",
                table: "UserSessions",
                columns: new[] { "ClientId", "Revoked", "AbsoluteExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_UserSessions_IdleExpiresAt",
                schema: "public",
                table: "UserSessions",
                column: "IdleExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_UserSessions_AbsoluteExpiresAt",
                schema: "public",
                table: "UserSessions",
                column: "AbsoluteExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_SessionSecurityPolicies_IsActive",
                schema: "public",
                table: "SessionSecurityPolicies",
                column: "IsActive");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SessionSecurityPolicies",
                schema: "public");

            migrationBuilder.DropIndex(
                name: "IX_UserSessions_UserId_Revoked_AbsoluteExpiresAt",
                schema: "public",
                table: "UserSessions");

            migrationBuilder.DropIndex(
                name: "IX_UserSessions_ClientId_Revoked_AbsoluteExpiresAt",
                schema: "public",
                table: "UserSessions");

            migrationBuilder.DropIndex(
                name: "IX_UserSessions_IdleExpiresAt",
                schema: "public",
                table: "UserSessions");

            migrationBuilder.DropIndex(
                name: "IX_UserSessions_AbsoluteExpiresAt",
                schema: "public",
                table: "UserSessions");

            migrationBuilder.DropColumn(
                name: "SecurityVersion",
                schema: "public",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ClientId",
                schema: "public",
                table: "UserSessions");

            migrationBuilder.DropColumn(
                name: "IdleExpiresAt",
                schema: "public",
                table: "UserSessions");

            migrationBuilder.DropColumn(
                name: "AbsoluteExpiresAt",
                schema: "public",
                table: "UserSessions");

            migrationBuilder.DropColumn(
                name: "RevokedAt",
                schema: "public",
                table: "UserSessions");

            migrationBuilder.DropColumn(
                name: "RevocationReason",
                schema: "public",
                table: "UserSessions");

            migrationBuilder.DropColumn(
                name: "LastIpAddress",
                schema: "public",
                table: "UserSessions");

            migrationBuilder.DropColumn(
                name: "UserAgent",
                schema: "public",
                table: "UserSessions");

            migrationBuilder.DropColumn(
                name: "DeviceLabel",
                schema: "public",
                table: "UserSessions");

            migrationBuilder.DropColumn(
                name: "FingerprintHash",
                schema: "public",
                table: "UserSessions");

            migrationBuilder.DropColumn(
                name: "SecurityVersion",
                schema: "public",
                table: "UserSessions");
        }
    }
}
