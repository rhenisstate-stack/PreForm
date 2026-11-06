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
            migrationBuilder.Sql("ALTER INDEX IF EXISTS public.\"IX_PaymentTransactions_ProviderEventId\" RENAME TO idx_payment_transactions_provider_event_id;");
            migrationBuilder.Sql("CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_active_unique ON public.\"UserSubscriptions\" (\"UserId\", \"PlanId\") WHERE \"Status\" = 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS public.idx_user_subscriptions_active_unique;");
            migrationBuilder.Sql("ALTER INDEX IF EXISTS public.idx_payment_transactions_provider_event_id RENAME TO \"IX_PaymentTransactions_ProviderEventId\";");
        }
    }
}
