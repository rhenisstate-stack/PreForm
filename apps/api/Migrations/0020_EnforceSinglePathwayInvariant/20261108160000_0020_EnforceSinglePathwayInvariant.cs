using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Preform.Api.Migrations
{
    /// <inheritdoc />
    public partial class _0020_EnforceSinglePathwayInvariant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Audit and reconcile existing users:
            // Normalize case for valid rn / pn entries
            migrationBuilder.Sql(@"
                UPDATE ""public"".""Users""
                SET ""Pathway"" = LOWER(TRIM(""Pathway""))
                WHERE LOWER(TRIM(""Pathway"")) IN ('rn', 'pn');
            ");

            // Reconcile students with 'both', empty, or null pathway who have historical attempts exclusively in RN or PN
            migrationBuilder.Sql(@"
                -- Reconcile to 'rn' if user has completed RN attempts and zero PN attempts
                UPDATE ""public"".""Users"" u
                SET ""Pathway"" = 'rn'
                WHERE (u.""Pathway"" IS NULL OR LOWER(TRIM(u.""Pathway"")) NOT IN ('rn', 'pn'))
                  AND EXISTS (
                      SELECT 1 FROM ""public"".""ExamAttempts"" ea
                      JOIN ""public"".""Exams"" e ON ea.""ExamId"" = e.""Id""
                      WHERE ea.""UserId"" = u.""Id"" AND LOWER(e.""Pathway"") = 'rn'
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM ""public"".""ExamAttempts"" ea
                      JOIN ""public"".""Exams"" e ON ea.""ExamId"" = e.""Id""
                      WHERE ea.""UserId"" = u.""Id"" AND LOWER(e.""Pathway"") = 'pn'
                  );

                -- Reconcile to 'pn' if user has completed PN attempts and zero RN attempts
                UPDATE ""public"".""Users"" u
                SET ""Pathway"" = 'pn'
                WHERE (u.""Pathway"" IS NULL OR LOWER(TRIM(u.""Pathway"")) NOT IN ('rn', 'pn'))
                  AND EXISTS (
                      SELECT 1 FROM ""public"".""ExamAttempts"" ea
                      JOIN ""public"".""Exams"" e ON ea.""ExamId"" = e.""Id""
                      WHERE ea.""UserId"" = u.""Id"" AND LOWER(e.""Pathway"") = 'pn'
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM ""public"".""ExamAttempts"" ea
                      JOIN ""public"".""Exams"" e ON ea.""ExamId"" = e.""Id""
                      WHERE ea.""UserId"" = u.""Id"" AND LOWER(e.""Pathway"") = 'rn'
                  );

                -- For ambiguous or test accounts still set to 'both' or invalid, mark as 'unassigned'
                -- so they are prompted to select their single pathway upon next sign-in (never silently defaulting)
                UPDATE ""public"".""Users""
                SET ""Pathway"" = 'unassigned'
                WHERE ""Pathway"" IS NULL OR LOWER(TRIM(""Pathway"")) NOT IN ('rn', 'pn');
            ");

            // 2. Add Index on Users(Pathway)
            migrationBuilder.CreateIndex(
                name: "IX_Users_Pathway",
                schema: "public",
                table: "Users",
                column: "Pathway");

            // 3. Add Check Constraint on Users: Pathway must be 'rn', 'pn', or 'unassigned'
            migrationBuilder.Sql(@"
                ALTER TABLE ""public"".""Users""
                ADD CONSTRAINT ""CK_Users_Single_Pathway""
                CHECK (""Pathway"" IN ('rn', 'pn', 'unassigned'));
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""public"".""Users""
                DROP CONSTRAINT IF EXISTS ""CK_Users_Single_Pathway"";
            ");

            migrationBuilder.DropIndex(
                name: "IX_Users_Pathway",
                schema: "public",
                table: "Users");
        }
    }
}
