import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get("planId");
    const query = planId ? `?planId=${encodeURIComponent(planId)}` : "";

    const apiRes = await apiClient.get<{ success: boolean; appearance: any }>(
      `/api/v1/subscriptions/appearance${query}`
    );

    if (apiRes.success && apiRes.data?.appearance) {
      return NextResponse.json(
        { success: true, appearance: apiRes.data.appearance },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          },
        }
      );
    }

    return NextResponse.json({ success: true, appearance: null });
  } catch (error) {
    console.error("Public appearance GET error:", error);
    return NextResponse.json({ success: true, appearance: null });
  }
}
