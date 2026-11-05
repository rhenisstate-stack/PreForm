import { NextResponse } from "next/server";
import { authService } from "@/lib/api-services";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = body?.token?.trim();

    if (!token) {
      return NextResponse.json({ valid: false, error: "Reset token is required." }, { status: 400 });
    }

    const correlationId = request.headers.get("x-correlation-id") || undefined;
    const res = await authService.validateResetToken(token, correlationId);

    return NextResponse.json(
      res.data || { valid: res.success },
      { status: res.status }
    );
  } catch (error) {
    console.error("Validate reset token route error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate reset token." },
      { status: 500 }
    );
  }
}
