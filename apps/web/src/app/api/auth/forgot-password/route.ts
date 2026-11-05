import { NextResponse } from "next/server";
import { authService } from "@/lib/api-services";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body?.email?.trim();

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required." }, { status: 400 });
    }

    const correlationId = request.headers.get("x-correlation-id") || undefined;
    const res = await authService.forgotPassword(email, correlationId);

    return NextResponse.json(
      res.data || { success: res.success, message: "Instructions sent if account exists." },
      { status: res.status }
    );
  } catch (error) {
    console.error("Forgot password route error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process forgot password request." },
      { status: 500 }
    );
  }
}
