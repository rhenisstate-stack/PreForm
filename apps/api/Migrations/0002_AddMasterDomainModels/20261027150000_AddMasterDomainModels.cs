using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Preform.Api.Migrations;

public partial class AddMasterDomainModels : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // 1. Users
        migrationBuilder.CreateTable(
            name: "Users",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                PasswordHash = table.Column<string>(type: "text", nullable: false),
                DisplayName = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                Pathway = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Users", x => x.Id);
            });

        migrationBuilder.CreateIndex(name: "IX_Users_Email", schema: "public", table: "Users", column: "Email", unique: true);
        migrationBuilder.CreateIndex(name: "IX_Users_IsActive", schema: "public", table: "Users", column: "IsActive");

        // 2. Roles
        migrationBuilder.CreateTable(
            name: "Roles",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                Name = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                Description = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                IsSystem = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Roles", x => x.Id);
            });

        migrationBuilder.CreateIndex(name: "IX_Roles_Name", schema: "public", table: "Roles", column: "Name", unique: true);

        // 3. Permissions
        migrationBuilder.CreateTable(
            name: "Permissions",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                Key = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                Name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                Category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Permissions", x => x.Id);
            });

        migrationBuilder.CreateIndex(name: "IX_Permissions_Key", schema: "public", table: "Permissions", column: "Key", unique: true);

        // 4. RolePermissions
        migrationBuilder.CreateTable(
            name: "RolePermissions",
            schema: "public",
            columns: table => new
            {
                RoleId = table.Column<string>(type: "text", nullable: false),
                PermissionId = table.Column<string>(type: "text", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_RolePermissions", x => new { x.RoleId, x.PermissionId });
                table.ForeignKey(name: "FK_RolePermissions_Roles_RoleId", column: x => x.RoleId, principalTable: "Roles", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey(name: "FK_RolePermissions_Permissions_PermissionId", column: x => x.PermissionId, principalTable: "Permissions", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            });

        // 5. UserRoles
        migrationBuilder.CreateTable(
            name: "UserRoles",
            schema: "public",
            columns: table => new
            {
                UserId = table.Column<string>(type: "text", nullable: false),
                RoleId = table.Column<string>(type: "text", nullable: false),
                AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_UserRoles", x => new { x.UserId, x.RoleId });
                table.ForeignKey(name: "FK_UserRoles_Users_UserId", column: x => x.UserId, principalTable: "Users", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey(name: "FK_UserRoles_Roles_RoleId", column: x => x.RoleId, principalTable: "Roles", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            });

        // 6. AuditLogs
        migrationBuilder.CreateTable(
            name: "AuditLogs",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                ActorId = table.Column<string>(type: "text", nullable: true),
                Action = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                EntityType = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                EntityId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                Description = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                Outcome = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                IpAddress = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_AuditLogs", x => x.Id);
                table.ForeignKey(name: "FK_AuditLogs_Users_ActorId", column: x => x.ActorId, principalTable: "Users", principalColumn: "Id", onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateIndex(name: "IX_AuditLogs_ActorId", schema: "public", table: "AuditLogs", column: "ActorId");
        migrationBuilder.CreateIndex(name: "IX_AuditLogs_Action", schema: "public", table: "AuditLogs", column: "Action");
        migrationBuilder.CreateIndex(name: "IX_AuditLogs_Timestamp", schema: "public", table: "AuditLogs", column: "Timestamp");

        // 7. Courses
        migrationBuilder.CreateTable(
            name: "Courses",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                ProgrammeId = table.Column<string>(type: "text", nullable: false),
                Title = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                Description = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Courses", x => x.Id);
                table.ForeignKey(name: "FK_Courses_Programme_ProgrammeId", column: x => x.ProgrammeId, principalSchema: "public", principalTable: "Programme", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            });

        // 8. SubjectDomains
        migrationBuilder.CreateTable(
            name: "SubjectDomains",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                CourseId = table.Column<string>(type: "text", nullable: false),
                Title = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                Description = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_SubjectDomains", x => x.Id);
                table.ForeignKey(name: "FK_SubjectDomains_Courses_CourseId", column: x => x.CourseId, principalTable: "Courses", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            });

        // 9. Categories
        migrationBuilder.CreateTable(
            name: "Categories",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                SubjectDomainId = table.Column<string>(type: "text", nullable: false),
                Name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                Slug = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                Description = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Categories", x => x.Id);
                table.ForeignKey(name: "FK_Categories_SubjectDomains_SubjectDomainId", column: x => x.SubjectDomainId, principalTable: "SubjectDomains", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            });

        // 10. Subcategories
        migrationBuilder.CreateTable(
            name: "Subcategories",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                CategoryId = table.Column<string>(type: "text", nullable: false),
                Name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                Slug = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                Description = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Subcategories", x => x.Id);
                table.ForeignKey(name: "FK_Subcategories_Categories_CategoryId", column: x => x.CategoryId, principalTable: "Categories", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            });

        // 11. Topics
        migrationBuilder.CreateTable(
            name: "Topics",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                SubcategoryId = table.Column<string>(type: "text", nullable: false),
                Title = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                Summary = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                Content = table.Column<string>(type: "text", nullable: false),
                DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Topics", x => x.Id);
                table.ForeignKey(name: "FK_Topics_Subcategories_SubcategoryId", column: x => x.SubcategoryId, principalTable: "Subcategories", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            });

        // 12. QuestionTypeDefinitions (18 formats)
        migrationBuilder.CreateTable(
            name: "QuestionTypeDefinitions",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                Key = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                Name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                Description = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                Category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                SupportedScoring = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                DisplayOrder = table.Column<int>(type: "integer", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_QuestionTypeDefinitions", x => x.Id);
            });

        migrationBuilder.CreateIndex(name: "IX_QuestionTypeDefinitions_Key", schema: "public", table: "QuestionTypeDefinitions", column: "Key", unique: true);

        // 13. Questions
        migrationBuilder.CreateTable(
            name: "Questions",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                Pathway = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                TopicId = table.Column<string>(type: "text", nullable: true),
                QuestionTypeKey = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                Stem = table.Column<string>(type: "text", nullable: false),
                Instructions = table.Column<string>(type: "text", nullable: true),
                Difficulty = table.Column<int>(type: "integer", nullable: false),
                Status = table.Column<int>(type: "integer", nullable: false),
                Version = table.Column<int>(type: "integer", nullable: false),
                ClinicalScenario = table.Column<string>(type: "text", nullable: true),
                ExhibitsJson = table.Column<string>(type: "text", nullable: true),
                OverallRationale = table.Column<string>(type: "text", nullable: true),
                CreatedById = table.Column<string>(type: "text", nullable: true),
                ReviewedById = table.Column<string>(type: "text", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Questions", x => x.Id);
                table.ForeignKey(name: "FK_Questions_Topics_TopicId", column: x => x.TopicId, principalTable: "Topics", principalColumn: "Id", onDelete: ReferentialAction.SetNull);
                table.ForeignKey(name: "FK_Questions_Users_CreatedById", column: x => x.CreatedById, principalTable: "Users", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey(name: "FK_Questions_Users_ReviewedById", column: x => x.ReviewedById, principalTable: "Users", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            });

        // 14. QuestionOptions
        migrationBuilder.CreateTable(
            name: "QuestionOptions",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                QuestionId = table.Column<string>(type: "text", nullable: false),
                OptionKey = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                Content = table.Column<string>(type: "text", nullable: false),
                DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                IsCorrect = table.Column<bool>(type: "boolean", nullable: false),
                Rationale = table.Column<string>(type: "text", nullable: true),
                DistractorRationale = table.Column<string>(type: "text", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_QuestionOptions", x => x.Id);
                table.ForeignKey(name: "FK_QuestionOptions_Questions_QuestionId", column: x => x.QuestionId, principalTable: "Questions", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            });

        // 15. QuestionVersions
        migrationBuilder.CreateTable(
            name: "QuestionVersions",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                QuestionId = table.Column<string>(type: "text", nullable: false),
                VersionNumber = table.Column<int>(type: "integer", nullable: false),
                SnapshotJson = table.Column<string>(type: "text", nullable: false),
                CreatedById = table.Column<string>(type: "text", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_QuestionVersions", x => x.Id);
                table.ForeignKey(name: "FK_QuestionVersions_Questions_QuestionId", column: x => x.QuestionId, principalTable: "Questions", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            });

        // 16. Exams
        migrationBuilder.CreateTable(
            name: "Exams",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                Title = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                Description = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                Pathway = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                ExamType = table.Column<int>(type: "integer", nullable: false),
                TimeLimitMinutes = table.Column<int>(type: "integer", nullable: false),
                PassingScorePercent = table.Column<decimal>(type: "numeric", nullable: false),
                IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Exams", x => x.Id);
            });

        // 17. ExamQuestions
        migrationBuilder.CreateTable(
            name: "ExamQuestions",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                ExamId = table.Column<string>(type: "text", nullable: false),
                QuestionId = table.Column<string>(type: "text", nullable: false),
                DisplayOrder = table.Column<int>(type: "integer", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ExamQuestions", x => x.Id);
                table.ForeignKey(name: "FK_ExamQuestions_Exams_ExamId", column: x => x.ExamId, principalTable: "Exams", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey(name: "FK_ExamQuestions_Questions_QuestionId", column: x => x.QuestionId, principalTable: "Questions", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            });

        // 18. ExamAttempts
        migrationBuilder.CreateTable(
            name: "ExamAttempts",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                UserId = table.Column<string>(type: "text", nullable: false),
                ExamId = table.Column<string>(type: "text", nullable: false),
                Status = table.Column<int>(type: "integer", nullable: false),
                ScorePercent = table.Column<decimal>(type: "numeric", nullable: false),
                Passed = table.Column<bool>(type: "boolean", nullable: false),
                StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ExamAttempts", x => x.Id);
                table.ForeignKey(name: "FK_ExamAttempts_Users_UserId", column: x => x.UserId, principalTable: "Users", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey(name: "FK_ExamAttempts_Exams_ExamId", column: x => x.ExamId, principalTable: "Exams", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            });

        // 19. AttemptResponses
        migrationBuilder.CreateTable(
            name: "AttemptResponses",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                ExamAttemptId = table.Column<string>(type: "text", nullable: false),
                QuestionId = table.Column<string>(type: "text", nullable: false),
                SelectedOptionsJson = table.Column<string>(type: "text", nullable: false),
                IsCorrect = table.Column<bool>(type: "boolean", nullable: false),
                ScoreAwarded = table.Column<decimal>(type: "numeric", nullable: false),
                TimeSpentSeconds = table.Column<int>(type: "integer", nullable: false),
                AnsweredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_AttemptResponses", x => x.Id);
                table.ForeignKey(name: "FK_AttemptResponses_ExamAttempts_ExamAttemptId", column: x => x.ExamAttemptId, principalTable: "ExamAttempts", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey(name: "FK_AttemptResponses_Questions_QuestionId", column: x => x.QuestionId, principalTable: "Questions", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
            });

        // 20. SubscriptionPlans
        migrationBuilder.CreateTable(
            name: "SubscriptionPlans",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                Name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                Code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                PriceCents = table.Column<int>(type: "integer", nullable: false),
                Interval = table.Column<int>(type: "integer", nullable: false),
                FeaturesJson = table.Column<string>(type: "text", nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_SubscriptionPlans", x => x.Id);
            });

        // 21. UserSubscriptions
        migrationBuilder.CreateTable(
            name: "UserSubscriptions",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                UserId = table.Column<string>(type: "text", nullable: false),
                PlanId = table.Column<string>(type: "text", nullable: false),
                Status = table.Column<int>(type: "integer", nullable: false),
                StartsAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_UserSubscriptions", x => x.Id);
                table.ForeignKey(name: "FK_UserSubscriptions_Users_UserId", column: x => x.UserId, principalTable: "Users", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey(name: "FK_UserSubscriptions_SubscriptionPlans_PlanId", column: x => x.PlanId, principalTable: "SubscriptionPlans", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            });

        // Seed 18 Question Types
        migrationBuilder.InsertData(
            schema: "public",
            table: "QuestionTypeDefinitions",
            columns: new[] { "Id", "Key", "Name", "Description", "Category", "SupportedScoring", "IsActive", "DisplayOrder" },
            columnTypes: new[] { "text", "character varying(64)", "character varying(128)", "character varying(512)", "character varying(64)", "character varying(64)", "boolean", "integer" },
            values: new object[,]
            {
                { "qt-1", "single-choice", "Single Choice", "Standard single-answer multiple-choice question", "Traditional", "ExactMatch", true, 1 },
                { "qt-2", "multiple-choice", "Multiple Choice", "Multiple-choice item with single or multiple keys", "Traditional", "ExactMatch", true, 2 },
                { "qt-3", "sata", "Select All That Apply (SATA)", "Multi-select clinical prioritization question", "Traditional", "PartialCredit", true, 3 },
                { "qt-4", "checkbox", "Checkbox Response", "Form-based checkbox response interaction", "Traditional", "PartialCredit", true, 4 },
                { "qt-5", "image-based", "Image-Based Question", "Clinical scenario with diagnostic radiograph or photo exhibit", "Clinical", "ExactMatch", true, 5 },
                { "qt-6", "multiple-image", "Multiple-Image Item", "Comparative visual exhibits for diagnostic identification", "Clinical", "ExactMatch", true, 6 },
                { "qt-7", "drag-drop", "Drag-and-Drop", "Interactive clinical priority classification", "NGN", "ExactMatch", true, 7 },
                { "qt-8", "ordering", "Ordering / Sequencing", "Step-by-step procedural or nursing intervention order", "NGN", "ExactMatch", true, 8 },
                { "qt-9", "case-study", "NGN Case Study", "Multi-part clinical unfolding case study with EHR tabs", "NGN", "PartialCredit", true, 9 },
                { "qt-10", "essay", "Extended Response / Essay", "Clinical reasoning reflection requiring instructor review", "Traditional", "ManualReview", true, 10 },
                { "qt-11", "matching", "Matching", "Paired concept-to-intervention clinical matching", "Traditional", "ExactMatch", true, 11 },
                { "qt-12", "fill-blank", "Fill-in-the-Blank", "Direct textual entry for clinical terms or dosage", "Traditional", "ExactMatch", true, 12 },
                { "qt-13", "matrix", "Matrix / Grid Response", "Tabular multiple-response clinical evaluation matrix", "NGN", "PartialCredit", true, 13 },
                { "qt-14", "numeric", "Numeric Response", "Dosage calculation and clinical measurement entry", "Traditional", "ExactMatch", true, 14 },
                { "qt-15", "true-false", "True / False", "Binary clinical fact and safety validation", "Traditional", "ExactMatch", true, 15 },
                { "qt-16", "tabular", "Tabular Response", "Data table evaluation for clinical interventions", "NGN", "PartialCredit", true, 16 },
                { "qt-17", "short-answer", "Short-Answer Response", "Concise clinical assessment entry", "Traditional", "ManualReview", true, 17 },
                { "qt-18", "dynamic-lab", "Dynamic Lab Value Response", "Interactive laboratory value and trend analysis", "NGN", "ExactMatch", true, 18 }
            });

        // Seed System Roles
        migrationBuilder.InsertData(
            schema: "public",
            table: "Roles",
            columns: new[] { "Id", "Name", "Description", "IsSystem", "CreatedAt" },
            columnTypes: new[] { "text", "character varying(64)", "character varying(256)", "boolean", "timestamp with time zone" },
            values: new object[,]
            {
                { "role-superadmin", "Super Admin", "System-wide administration, security policies, and audit logs", true, DateTime.UtcNow },
                { "role-admin", "Administrator", "General system administration and operational oversight", true, DateTime.UtcNow },
                { "role-content-mgr", "Content Manager", "Curriculum structure, topics, and question authoring", true, DateTime.UtcNow },
                { "role-exam-mgr", "Exam Manager", "Assessment configurations, mock exams, and publication rules", true, DateTime.UtcNow },
                { "role-reviewer", "Question Reviewer", "Clinical accuracy review, feedback, and question approvals", true, DateTime.UtcNow },
                { "role-instructor", "Instructor", "Curriculum guidance and student performance monitoring", true, DateTime.UtcNow },
                { "role-student", "Student", "Personal learning, practice sessions, and CAT readiness exams", true, DateTime.UtcNow }
            });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "UserSubscriptions", schema: "public");
        migrationBuilder.DropTable(name: "SubscriptionPlans", schema: "public");
        migrationBuilder.DropTable(name: "AttemptResponses", schema: "public");
        migrationBuilder.DropTable(name: "ExamAttempts", schema: "public");
        migrationBuilder.DropTable(name: "ExamQuestions", schema: "public");
        migrationBuilder.DropTable(name: "Exams", schema: "public");
        migrationBuilder.DropTable(name: "QuestionVersions", schema: "public");
        migrationBuilder.DropTable(name: "QuestionOptions", schema: "public");
        migrationBuilder.DropTable(name: "Questions", schema: "public");
        migrationBuilder.DropTable(name: "QuestionTypeDefinitions", schema: "public");
        migrationBuilder.DropTable(name: "Topics", schema: "public");
        migrationBuilder.DropTable(name: "Subcategories", schema: "public");
        migrationBuilder.DropTable(name: "Categories", schema: "public");
        migrationBuilder.DropTable(name: "SubjectDomains", schema: "public");
        migrationBuilder.DropTable(name: "Courses", schema: "public");
        migrationBuilder.DropTable(name: "AuditLogs", schema: "public");
        migrationBuilder.DropTable(name: "UserRoles", schema: "public");
        migrationBuilder.DropTable(name: "RolePermissions", schema: "public");
        migrationBuilder.DropTable(name: "Permissions", schema: "public");
        migrationBuilder.DropTable(name: "Roles", schema: "public");
        migrationBuilder.DropTable(name: "Users", schema: "public");
    }
}
