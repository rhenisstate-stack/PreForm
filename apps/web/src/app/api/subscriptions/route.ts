import { NextResponse } from "next/server";
import { getAllSubscriptionPlans } from "@/lib/subscription-store";


export async function GET() {
  try {
    const plans = getAllSubscriptionPlans(false);
    return NextResponse.json(
      {
        success: true,
        plans,
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
