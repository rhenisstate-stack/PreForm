using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Preform.Api.Data;

#nullable disable

namespace Preform.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261107120000_AddQuestionTypeRegistryGovernance")]
public partial class AddQuestionTypeRegistryGovernance : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "IsSystemDefined",
            schema: "public",
            table: "QuestionTypeDefinitions",
            type: "boolean",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<bool>(
            name: "IsArchived",
            schema: "public",
            table: "QuestionTypeDefinitions",
            type: "boolean",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<string>(
            name: "SupportedPathways",
            schema: "public",
            table: "QuestionTypeDefinitions",
            type: "character varying(32)",
            maxLength: 32,
            nullable: false,
            defaultValue: "both");

        migrationBuilder.AddColumn<string>(
            name: "AdminInstructions",
            schema: "public",
            table: "QuestionTypeDefinitions",
            type: "text",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "CandidateInstructions",
            schema: "public",
            table: "QuestionTypeDefinitions",
            type: "text",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "CreatedAt",
            schema: "public",
            table: "QuestionTypeDefinitions",
            type: "timestamp with time zone",
            nullable: false,
            defaultValueSql: "CURRENT_TIMESTAMP");

        migrationBuilder.AddColumn<DateTime>(
            name: "UpdatedAt",
            schema: "public",
            table: "QuestionTypeDefinitions",
            type: "timestamp with time zone",
            nullable: false,
            defaultValueSql: "CURRENT_TIMESTAMP");

        // Canonical 18 types are marked as system-defined
        migrationBuilder.Sql(@"
            UPDATE public.""QuestionTypeDefinitions""
            SET ""IsSystemDefined"" = true, ""SupportedPathways"" = 'both'
            WHERE ""Key"" IN (
                'single-choice', 'multiple-choice', 'sata', 'checkbox', 'image-based',
                'multiple-image', 'drag-drop', 'ordering', 'case-study', 'essay',
                'matching', 'fill-blank', 'matrix', 'numeric', 'true-false',
                'tabular', 'short-answer', 'dynamic-lab'
            );
        ");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "IsSystemDefined",
            schema: "public",
            table: "QuestionTypeDefinitions");

        migrationBuilder.DropColumn(
            name: "IsArchived",
            schema: "public",
            table: "QuestionTypeDefinitions");

        migrationBuilder.DropColumn(
            name: "SupportedPathways",
            schema: "public",
            table: "QuestionTypeDefinitions");

        migrationBuilder.DropColumn(
            name: "AdminInstructions",
            schema: "public",
            table: "QuestionTypeDefinitions");

        migrationBuilder.DropColumn(
            name: "CandidateInstructions",
            schema: "public",
            table: "QuestionTypeDefinitions");

        migrationBuilder.DropColumn(
            name: "CreatedAt",
            schema: "public",
            table: "QuestionTypeDefinitions");

        migrationBuilder.DropColumn(
            name: "UpdatedAt",
            schema: "public",
            table: "QuestionTypeDefinitions");
    }
}
