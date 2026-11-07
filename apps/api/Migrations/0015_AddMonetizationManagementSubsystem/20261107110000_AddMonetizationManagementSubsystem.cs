using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Preform.Api.Data;

#nullable disable

namespace Preform.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261107110000_AddMonetizationManagementSubsystem")]
public partial class AddMonetizationManagementSubsystem : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // 1. SubscriptionPlans extensions
        migrationBuilder.AddColumn<int>(
            name: "PublicationStatus",
            schema: "public",
            table: "SubscriptionPlans",
            type: "integer",
            nullable: false,
            defaultValue: 2);

        migrationBuilder.AddColumn<int>(
            name: "Version",
            schema: "public",
            table: "SubscriptionPlans",
            type: "integer",
            nullable: false,
            defaultValue: 1);

        // 2. UserSubscriptions extensions
        migrationBuilder.AddColumn<DateTime>(
            name: "SuspendedAt",
            schema: "public",
            table: "UserSubscriptions",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "SuspensionReason",
            schema: "public",
            table: "UserSubscriptions",
            type: "character varying(512)",
            maxLength: 512,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "CancelledBy",
            schema: "public",
            table: "UserSubscriptions",
            type: "character varying(128)",
            maxLength: 128,
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "ExtendedAt",
            schema: "public",
            table: "UserSubscriptions",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "ExtendedBy",
            schema: "public",
            table: "UserSubscriptions",
            type: "character varying(128)",
            maxLength: 128,
            nullable: true);

        migrationBuilder.AddColumn<bool>(
            name: "IsManual",
            schema: "public",
            table: "UserSubscriptions",
            type: "boolean",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<string>(
            name: "ManualAuthorizationId",
            schema: "public",
            table: "UserSubscriptions",
            type: "character varying(128)",
            maxLength: 128,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "Notes",
            schema: "public",
            table: "UserSubscriptions",
            type: "character varying(1024)",
            maxLength: 1024,
            nullable: true);

        // 3. Orders extensions
        migrationBuilder.AddColumn<int>(
            name: "PaymentMethod",
            schema: "public",
            table: "Orders",
            type: "integer",
            nullable: false,
            defaultValue: 1);

        migrationBuilder.AddColumn<string>(
            name: "ReceiptNumber",
            schema: "public",
            table: "Orders",
            type: "character varying(128)",
            maxLength: 128,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "TransactionReference",
            schema: "public",
            table: "Orders",
            type: "character varying(128)",
            maxLength: 128,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "Notes",
            schema: "public",
            table: "Orders",
            type: "character varying(2048)",
            maxLength: 2048,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "PaymentEvidenceUrl",
            schema: "public",
            table: "Orders",
            type: "character varying(1024)",
            maxLength: 1024,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "VerifiedBy",
            schema: "public",
            table: "Orders",
            type: "character varying(128)",
            maxLength: 128,
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "VerifiedAt",
            schema: "public",
            table: "Orders",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "ManualAuthorizationId",
            schema: "public",
            table: "Orders",
            type: "character varying(128)",
            maxLength: 128,
            nullable: true);

        // 4. ManualSubscriptionAuthorizations table
        migrationBuilder.CreateTable(
            name: "ManualSubscriptionAuthorizations",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                UserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                PlanId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                Pathway = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                PaymentMethod = table.Column<int>(type: "integer", nullable: false),
                AmountCents = table.Column<int>(type: "integer", nullable: false),
                Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                TransactionReference = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                ReceiptNumber = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                PaymentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                EvidenceUrl = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                Notes = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                Status = table.Column<int>(type: "integer", nullable: false),
                RequestedByAdminId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                VerifiedByAdminId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                RejectionReason = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                SubscriptionId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                OrderId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                VerifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ManualSubscriptionAuthorizations", x => x.Id);
                table.ForeignKey(
                    name: "FK_ManualSubscriptionAuthorizations_Users_UserId",
                    column: x => x.UserId,
                    principalSchema: "public",
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "FK_ManualSubscriptionAuthorizations_SubscriptionPlans_PlanId",
                    column: x => x.PlanId,
                    principalSchema: "public",
                    principalTable: "SubscriptionPlans",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "FK_ManualSubscriptionAuthorizations_UserSubscriptions_SubscriptionId",
                    column: x => x.SubscriptionId,
                    principalSchema: "public",
                    principalTable: "UserSubscriptions",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "FK_ManualSubscriptionAuthorizations_Orders_OrderId",
                    column: x => x.OrderId,
                    principalSchema: "public",
                    principalTable: "Orders",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
            });

        // 5. SubscriptionPlanAppearances table
        migrationBuilder.CreateTable(
            name: "SubscriptionPlanAppearances",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                PlanId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                Version = table.Column<int>(type: "integer", nullable: false),
                IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                TypographyJson = table.Column<string>(type: "text", nullable: false, defaultValue: "{}"),
                ColorsJson = table.Column<string>(type: "text", nullable: false, defaultValue: "{}"),
                CardStylingJson = table.Column<string>(type: "text", nullable: false, defaultValue: "{}"),
                ButtonStylingJson = table.Column<string>(type: "text", nullable: false, defaultValue: "{}"),
                LayoutJson = table.Column<string>(type: "text", nullable: false, defaultValue: "{}"),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                CreatedBy = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                PublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                PublishedBy = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_SubscriptionPlanAppearances", x => x.Id);
                table.ForeignKey(
                    name: "FK_SubscriptionPlanAppearances_SubscriptionPlans_PlanId",
                    column: x => x.PlanId,
                    principalSchema: "public",
                    principalTable: "SubscriptionPlans",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        // 6. EntitlementDefinitions table
        migrationBuilder.CreateTable(
            name: "EntitlementDefinitions",
            schema: "public",
            columns: table => new
            {
                Code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                Name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                Category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                Description = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                CoursePathway = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_EntitlementDefinitions", x => x.Code);
            });

        // 7. SubscriptionPlanEntitlements table
        migrationBuilder.CreateTable(
            name: "SubscriptionPlanEntitlements",
            schema: "public",
            columns: table => new
            {
                Id = table.Column<string>(type: "text", nullable: false),
                PlanId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                EntitlementCode = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                UsageLimit = table.Column<int>(type: "integer", nullable: true),
                MetadataJson = table.Column<string>(type: "text", nullable: false, defaultValue: "{}"),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_SubscriptionPlanEntitlements", x => x.Id);
                table.ForeignKey(
                    name: "FK_SubscriptionPlanEntitlements_SubscriptionPlans_PlanId",
                    column: x => x.PlanId,
                    principalSchema: "public",
                    principalTable: "SubscriptionPlans",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_SubscriptionPlanEntitlements_EntitlementDefinitions_EntitlementCode",
                    column: x => x.EntitlementCode,
                    principalSchema: "public",
                    principalTable: "EntitlementDefinitions",
                    principalColumn: "Code",
                    onDelete: ReferentialAction.Cascade);
            });

        // 8. Indexes
        migrationBuilder.CreateIndex(
            name: "idx_manual_auth_tx_ref_unique",
            schema: "public",
            table: "ManualSubscriptionAuthorizations",
            column: "TransactionReference",
            unique: true,
            filter: "\"TransactionReference\" IS NOT NULL");

        migrationBuilder.CreateIndex(
            name: "IX_ManualSubscriptionAuthorizations_UserId",
            schema: "public",
            table: "ManualSubscriptionAuthorizations",
            column: "UserId");

        migrationBuilder.CreateIndex(
            name: "IX_ManualSubscriptionAuthorizations_Status",
            schema: "public",
            table: "ManualSubscriptionAuthorizations",
            column: "Status");

        migrationBuilder.CreateIndex(
            name: "IX_ManualSubscriptionAuthorizations_PaymentMethod",
            schema: "public",
            table: "ManualSubscriptionAuthorizations",
            column: "PaymentMethod");

        migrationBuilder.CreateIndex(
            name: "IX_ManualSubscriptionAuthorizations_RequestedByAdminId",
            schema: "public",
            table: "ManualSubscriptionAuthorizations",
            column: "RequestedByAdminId");

        migrationBuilder.CreateIndex(
            name: "idx_sub_plan_appearances_version",
            schema: "public",
            table: "SubscriptionPlanAppearances",
            columns: new[] { "PlanId", "Version", "IsPublished" });

        migrationBuilder.CreateIndex(
            name: "IX_EntitlementDefinitions_CoursePathway",
            schema: "public",
            table: "EntitlementDefinitions",
            column: "CoursePathway");

        migrationBuilder.CreateIndex(
            name: "IX_EntitlementDefinitions_IsActive",
            schema: "public",
            table: "EntitlementDefinitions",
            column: "IsActive");

        migrationBuilder.CreateIndex(
            name: "idx_sub_plan_entitlements_unique",
            schema: "public",
            table: "SubscriptionPlanEntitlements",
            columns: new[] { "PlanId", "EntitlementCode" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "SubscriptionPlanEntitlements", schema: "public");
        migrationBuilder.DropTable(name: "EntitlementDefinitions", schema: "public");
        migrationBuilder.DropTable(name: "SubscriptionPlanAppearances", schema: "public");
        migrationBuilder.DropTable(name: "ManualSubscriptionAuthorizations", schema: "public");

        migrationBuilder.DropColumn(name: "ManualAuthorizationId", schema: "public", table: "Orders");
        migrationBuilder.DropColumn(name: "VerifiedAt", schema: "public", table: "Orders");
        migrationBuilder.DropColumn(name: "VerifiedBy", schema: "public", table: "Orders");
        migrationBuilder.DropColumn(name: "PaymentEvidenceUrl", schema: "public", table: "Orders");
        migrationBuilder.DropColumn(name: "Notes", schema: "public", table: "Orders");
        migrationBuilder.DropColumn(name: "TransactionReference", schema: "public", table: "Orders");
        migrationBuilder.DropColumn(name: "ReceiptNumber", schema: "public", table: "Orders");
        migrationBuilder.DropColumn(name: "PaymentMethod", schema: "public", table: "Orders");

        migrationBuilder.DropColumn(name: "Notes", schema: "public", table: "UserSubscriptions");
        migrationBuilder.DropColumn(name: "ManualAuthorizationId", schema: "public", table: "UserSubscriptions");
        migrationBuilder.DropColumn(name: "IsManual", schema: "public", table: "UserSubscriptions");
        migrationBuilder.DropColumn(name: "ExtendedBy", schema: "public", table: "UserSubscriptions");
        migrationBuilder.DropColumn(name: "ExtendedAt", schema: "public", table: "UserSubscriptions");
        migrationBuilder.DropColumn(name: "CancelledBy", schema: "public", table: "UserSubscriptions");
        migrationBuilder.DropColumn(name: "SuspensionReason", schema: "public", table: "UserSubscriptions");
        migrationBuilder.DropColumn(name: "SuspendedAt", schema: "public", table: "UserSubscriptions");

        migrationBuilder.DropColumn(name: "Version", schema: "public", table: "SubscriptionPlans");
        migrationBuilder.DropColumn(name: "PublicationStatus", schema: "public", table: "SubscriptionPlans");
    }
}
