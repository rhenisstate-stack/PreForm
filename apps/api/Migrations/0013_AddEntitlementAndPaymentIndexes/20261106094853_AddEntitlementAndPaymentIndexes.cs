using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Preform.Api.Migrations._0013_AddEntitlementAndPaymentIndexes
{
    /// <inheritdoc />
    public partial class AddEntitlementAndPaymentIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameIndex(
                name: "IX_PaymentTransactions_ProviderEventId",
                schema: "public",
                table: "PaymentTransactions",
                newName: "idx_payment_transactions_provider_event_id");

            migrationBuilder.CreateIndex(
                name: "idx_user_subscriptions_active_unique",
                schema: "public",
                table: "UserSubscriptions",
                columns: new[] { "UserId", "PlanId" },
                unique: true,
                filter: "\"Status\" = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_user_subscriptions_active_unique",
                schema: "public",
                table: "UserSubscriptions");

            migrationBuilder.RenameIndex(
                name: "idx_payment_transactions_provider_event_id",
                schema: "public",
                table: "PaymentTransactions",
                newName: "IX_PaymentTransactions_ProviderEventId");
        }
    }
}
