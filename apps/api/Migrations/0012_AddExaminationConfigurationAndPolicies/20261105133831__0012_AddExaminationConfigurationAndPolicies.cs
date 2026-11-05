using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Preform.Api.Migrations._0012_AddExaminationConfigurationAndPolicies
{
    /// <inheritdoc />
    public partial class _0012_AddExaminationConfigurationAndPolicies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AllowInterruptedResume",
                schema: "public",
                table: "Exams",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "AvailableFrom",
                schema: "public",
                table: "Exams",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "AvailableTo",
                schema: "public",
                table: "Exams",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompositionRulesJson",
                schema: "public",
                table: "Exams",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ConfigurationSnapshotJson",
                schema: "public",
                table: "Exams",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAvailable",
                schema: "public",
                table: "Exams",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "MaxAttemptsAllowed",
                schema: "public",
                table: "Exams",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RetakeCooldownHours",
                schema: "public",
                table: "Exams",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ReviewPolicy",
                schema: "public",
                table: "Exams",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SelectionStrategy",
                schema: "public",
                table: "Exams",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "ShowRationales",
                schema: "public",
                table: "Exams",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShowScoreImmediately",
                schema: "public",
                table: "Exams",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "TargetQuestionCount",
                schema: "public",
                table: "Exams",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Exams_IsAvailable",
                schema: "public",
                table: "Exams",
                column: "IsAvailable");

            migrationBuilder.CreateIndex(
                name: "IX_Exams_IsAvailable_AvailableFrom_AvailableTo",
                schema: "public",
                table: "Exams",
                columns: new[] { "IsAvailable", "AvailableFrom", "AvailableTo" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Exams_IsAvailable",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropIndex(
                name: "IX_Exams_IsAvailable_AvailableFrom_AvailableTo",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "AllowInterruptedResume",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "AvailableFrom",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "AvailableTo",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "CompositionRulesJson",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "ConfigurationSnapshotJson",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "IsAvailable",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "MaxAttemptsAllowed",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "RetakeCooldownHours",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "ReviewPolicy",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "SelectionStrategy",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "ShowRationales",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "ShowScoreImmediately",
                schema: "public",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "TargetQuestionCount",
                schema: "public",
                table: "Exams");
        }
    }
}
