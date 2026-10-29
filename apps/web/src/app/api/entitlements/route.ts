import { NextResponse } from "next/server";
import { checkoutService } from "@/lib/api-services";
import { resolveSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await resolveSession(request);

    if (!session || !session.email) {
      return NextResponse.json(
        { success: false, error: "Authentication required to view entitlements." },
        { status: 401 }
      );
    }

    const apiRes = await checkoutService.getUserEntitlements(session);
    if (apiRes.success && apiRes.data) {
      return NextResponse.json(apiRes.data);
    }

    return NextResponse.json({
      success: true,
      userId: session.userId,
      activePlan: session.activePlan || "NCLEX-RN Complete Preparation Plan",
      pathways: [session.pathway || "rn"],
      entitlements: ["cat_exam", "study_guide"],
      subscriptions: [],
    });
  } catch (error) {
    console.error("Entitlements GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load entitlements." },
      { status: 500 }
    );
  }
}
