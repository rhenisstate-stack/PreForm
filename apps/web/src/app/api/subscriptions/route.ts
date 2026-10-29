import { NextResponse } from "next/server";
import { subscriptionService } from "@/lib/api-services";
import { getAllSubscriptionPlans } from "@/lib/subscription-store";

export async function GET() {
  try {
    // 1. Primary Authority: Query ASP.NET Core subscriptions API
    const apiRes = await subscriptionService.getActivePlans();

    if (apiRes.success && apiRes.data?.plans) {
      return NextResponse.json(
        {
          success: true,
          plans: apiRes.data.plans,
          source: "postgresql_api",
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    // 2. Resilient Read-Only Fallback for cold-boot or network isolation
    const plans = getAllSubscriptionPlans(false);
    return NextResponse.json(
      {
        success: true,
        plans,
        source: "fallback_cache",
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Public subscriptions GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load subscription catalogue" },
      { status: 500 }
    );
  }
}
