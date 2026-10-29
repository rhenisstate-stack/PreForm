using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Preform.Api.Data;

#nullable disable

namespace Preform.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261029100000_HarmonizeBackendSchema")]
public partial class HarmonizeBackendSchema : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // 1. Update Users Table with Profile Fields
        migrationBuilder.AddColumn<string>(
            name: "TargetExamDate",
            schema: "public",
            table: "Users",
            type: "character varying(32)",
            maxLength: 32,
            nullable: false,
            defaultValue: "2026-11-30");

        migrationBuilder.AddColumn<string>(
            name: "ActivePlan",
            schema: "public",
            table: "Users",
            type: "character varying(128)",
            maxLength: 128,
            nullable: false,
            defaultValue: "NCLEX-RN Complete Preparation Plan");

        migrationBuilder.AddColumn<bool>(
            name: "EmailNotifications",
            schema: "public",
            table: "Users",
            type: "boolean",
            nullable: false,
            defaultValue: true);

        migrationBuilder.AddColumn<bool>(
            name: "StudyReminders",
            schema: "public",
            table: "Users",
            type: "boolean",
            nullable: false,
            defaultValue: true);

        // 2. Create UserSessions Table
        migrationBuilder.CreateTable(
            name: "UserSessions",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                UserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                Role = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                DisplayName = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                CsrfToken = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                LastActiveAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                Revoked = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_UserSessions", x => x.Id);
                table.ForeignKey(
                    name: "FK_UserSessions_Users_UserId",
                    column: x => x.UserId,
                    principalSchema: "public",
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_UserSessions_TokenHash",
            schema: "public",
            table: "UserSessions",
            column: "TokenHash",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_UserSessions_UserId_Revoked",
            schema: "public",
            table: "UserSessions",
            columns: new[] { "UserId", "Revoked" });

        migrationBuilder.CreateIndex(
            name: "IX_UserSessions_Email_Revoked",
            schema: "public",
            table: "UserSessions",
            columns: new[] { "Email", "Revoked" });

        // 3. Update SubscriptionPlans Table with Full Frontend Attributes
        migrationBuilder.AddColumn<string>(
            name: "Slug",
            schema: "public",
            table: "SubscriptionPlans",
            type: "character varying(128)",
            maxLength: 128,
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<string>(
            name: "Description",
            schema: "public",
            table: "SubscriptionPlans",
            type: "character varying(1024)",
            maxLength: 1024,
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<string>(
            name: "Audience",
            schema: "public",
            table: "SubscriptionPlans",
            type: "character varying(256)",
            maxLength: 256,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "Pathway",
            schema: "public",
            table: "SubscriptionPlans",
            type: "character varying(32)",
            maxLength: 32,
            nullable: false,
            defaultValue: "RN");

        migrationBuilder.AddColumn<string>(
            name: "PlanType",
            schema: "public",
            table: "SubscriptionPlans",
            type: "character varying(64)",
            maxLength: 64,
            nullable: false,
            defaultValue: "pro");

        migrationBuilder.AddColumn<int>(
            name: "OriginalPriceCents",
            schema: "public",
            table: "SubscriptionPlans",
            type: "integer",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "Currency",
            schema: "public",
            table: "SubscriptionPlans",
            type: "character varying(10)",
            maxLength: 10,
            nullable: false,
            defaultValue: "USD");

        migrationBuilder.AddColumn<string>(
            name: "BillingInterval",
            schema: "public",
            table: "SubscriptionPlans",
            type: "character varying(32)",
            maxLength: 32,
            nullable: false,
            defaultValue: "month");

        migrationBuilder.AddColumn<string>(
            name: "DurationLabel",
            schema: "public",
            table: "SubscriptionPlans",
            type: "character varying(64)",
            maxLength: 64,
            nullable: true);

        migrationBuilder.AddColumn<bool>(
            name: "Popular",
            schema: "public",
            table: "SubscriptionPlans",
            type: "boolean",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<string>(
            name: "BgColour",
            schema: "public",
            table: "SubscriptionPlans",
            type: "character varying(32)",
            maxLength: 32,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "AccentColour",
            schema: "public",
            table: "SubscriptionPlans",
            type: "character varying(32)",
            maxLength: 32,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "TextColour",
            schema: "public",
            table: "SubscriptionPlans",
            type: "character varying(32)",
            maxLength: 32,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "BadgeText",
            schema: "public",
            table: "SubscriptionPlans",
            type: "character varying(64)",
            maxLength: 64,
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "DisplayOrder",
            schema: "public",
            table: "SubscriptionPlans",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<string>(
            name: "EntitlementsJson",
            schema: "public",
            table: "SubscriptionPlans",
            type: "text",
            nullable: false,
            defaultValue: "[\"rn\"]");

        migrationBuilder.AddColumn<DateTime>(
            name: "UpdatedAt",
            schema: "public",
            table: "SubscriptionPlans",
            type: "timestamp with time zone",
            nullable: false,
            defaultValueSql: "CURRENT_TIMESTAMP");

        migrationBuilder.CreateIndex(
            name: "IX_SubscriptionPlans_Slug",
            schema: "public",
            table: "SubscriptionPlans",
            column: "Slug",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_SubscriptionPlans_Pathway_IsActive",
            schema: "public",
            table: "SubscriptionPlans",
            columns: new[] { "Pathway", "IsActive" });

        migrationBuilder.CreateIndex(
            name: "IX_SubscriptionPlans_DisplayOrder",
            schema: "public",
            table: "SubscriptionPlans",
            column: "DisplayOrder");

        // 4. Create Orders Table
        migrationBuilder.CreateTable(
            name: "Orders",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                UserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                PlanId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                AmountCents = table.Column<int>(type: "integer", nullable: false),
                Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "USD"),
                Status = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                Provider = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false, defaultValue: "simulated"),
                ProviderSessionId = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                ProviderPaymentId = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Orders", x => x.Id);
                table.ForeignKey(
                    name: "FK_Orders_Users_UserId",
                    column: x => x.UserId,
                    principalSchema: "public",
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "FK_Orders_SubscriptionPlans_PlanId",
                    column: x => x.PlanId,
                    principalSchema: "public",
                    principalTable: "SubscriptionPlans",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "IX_Orders_UserId",
            schema: "public",
            table: "Orders",
            column: "UserId");

        migrationBuilder.CreateIndex(
            name: "IX_Orders_ProviderSessionId",
            schema: "public",
            table: "Orders",
            column: "ProviderSessionId");

        // 5. Create PaymentTransactions Table
        migrationBuilder.CreateTable(
            name: "PaymentTransactions",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                OrderId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                ProviderEventId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                EventType = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                AmountCents = table.Column<int>(type: "integer", nullable: false),
                Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false, defaultValue: "processed"),
                PayloadJson = table.Column<string>(type: "text", nullable: false, defaultValue: "{}"),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_PaymentTransactions", x => x.Id);
                table.ForeignKey(
                    name: "FK_PaymentTransactions_Orders_OrderId",
                    column: x => x.OrderId,
                    principalSchema: "public",
                    principalTable: "Orders",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateIndex(
            name: "IX_PaymentTransactions_ProviderEventId",
            schema: "public",
            table: "PaymentTransactions",
            column: "ProviderEventId",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_PaymentTransactions_OrderId",
            schema: "public",
            table: "PaymentTransactions",
            column: "OrderId");

        // 6. Update UserSubscriptions Table with Order and Pathway
        migrationBuilder.AddColumn<string>(
            name: "OrderId",
            schema: "public",
            table: "UserSubscriptions",
            type: "character varying(128)",
            maxLength: 128,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "Pathway",
            schema: "public",
            table: "UserSubscriptions",
            type: "character varying(32)",
            maxLength: 32,
            nullable: false,
            defaultValue: "rn");

        migrationBuilder.CreateIndex(
            name: "IX_UserSubscriptions_UserId",
            schema: "public",
            table: "UserSubscriptions",
            column: "UserId");

        migrationBuilder.CreateIndex(
            name: "IX_UserSubscriptions_Status",
            schema: "public",
            table: "UserSubscriptions",
            column: "Status");

        migrationBuilder.AddForeignKey(
            name: "FK_UserSubscriptions_Orders_OrderId",
            schema: "public",
            table: "UserSubscriptions",
            column: "OrderId",
            principalSchema: "public",
            principalTable: "Orders",
            principalColumn: "Id",
            onDelete: ReferentialAction.SetNull);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(name: "FK_UserSubscriptions_Orders_OrderId", schema: "public", table: "UserSubscriptions");
        migrationBuilder.DropIndex(name: "IX_UserSubscriptions_UserId", schema: "public", table: "UserSubscriptions");
        migrationBuilder.DropIndex(name: "IX_UserSubscriptions_Status", schema: "public", table: "UserSubscriptions");
        migrationBuilder.DropColumn(name: "OrderId", schema: "public", table: "UserSubscriptions");
        migrationBuilder.DropColumn(name: "Pathway", schema: "public", table: "UserSubscriptions");

        migrationBuilder.DropTable(name: "PaymentTransactions", schema: "public");
        migrationBuilder.DropTable(name: "Orders", schema: "public");

        migrationBuilder.DropIndex(name: "IX_SubscriptionPlans_Slug", schema: "public", table: "SubscriptionPlans");
        migrationBuilder.DropIndex(name: "IX_SubscriptionPlans_Pathway_IsActive", schema: "public", table: "SubscriptionPlans");
        migrationBuilder.DropIndex(name: "IX_SubscriptionPlans_DisplayOrder", schema: "public", table: "SubscriptionPlans");

        migrationBuilder.DropColumn(name: "Slug", schema: "public", table: "SubscriptionPlans");
        migrationBuilder.DropColumn(name: "Description", schema: "public", table: "SubscriptionPlans");
        migrationBuilder.DropColumn(name: "Audience", schema: "public", table: "SubscriptionPlans");
        migrationBuilder.DropColumn(name: "Pathway", schema: "public", table: "SubscriptionPlans");
        migrationBuilder.DropColumn(name: "PlanType", schema: "public", table: "SubscriptionPlans");
        migrationBuilder.DropColumn(name: "OriginalPriceCents", schema: "public", table: "SubscriptionPlans");
        migrationBuilder.DropColumn(name: "Currency", schema: "public", table: "SubscriptionPlans");
        migrationBuilder.DropColumn(name: "BillingInterval", schema: "public", table: "SubscriptionPlans");
        migrationBuilder.DropColumn(name: "DurationLabel", schema: "public", table: "SubscriptionPlans");
        migrationBuilder.DropColumn(name: "Popular", schema: "public", table: "SubscriptionPlans");
        migrationBuilder.DropColumn(name: "BgColour", schema: "public", table: "SubscriptionPlans");
        migrationBuilder.DropColumn(name: "AccentColour", schema: "public", table: "SubscriptionPlans");
        migrationBuilder.DropColumn(name: "TextColour", schema: "public", table: "SubscriptionPlans");
        migrationBuilder.DropColumn(name: "BadgeText", schema: "public", table: "SubscriptionPlans");
        migrationBuilder.DropColumn(name: "DisplayOrder", schema: "public", table: "SubscriptionPlans");
        migrationBuilder.DropColumn(name: "EntitlementsJson", schema: "public", table: "SubscriptionPlans");
        migrationBuilder.DropColumn(name: "UpdatedAt", schema: "public", table: "SubscriptionPlans");

        migrationBuilder.DropTable(name: "UserSessions", schema: "public");

        migrationBuilder.DropColumn(name: "TargetExamDate", schema: "public", table: "Users");
        migrationBuilder.DropColumn(name: "ActivePlan", schema: "public", table: "Users");
        migrationBuilder.DropColumn(name: "EmailNotifications", schema: "public", table: "Users");
        migrationBuilder.DropColumn(name: "StudyReminders", schema: "public", table: "Users");
    }
}
