import { NextResponse } from "next/server";
import { authService } from "@/lib/api-services";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, newPassword, confirmPassword } = body || {};

    if (!token) {
      return NextResponse.json({ success: false, error: "Reset token is required." }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Passwords do not match." },
        { status: 400 }
      );
    }

    const correlationId = request.headers.get("x-correlation-id") || undefined;
    const res = await authService.resetPassword({ token, newPassword, confirmPassword }, correlationId);

    return NextResponse.json(
      res.data || { success: res.success },
      { status: res.status }
    );
  } catch (error) {
    console.error("Reset password route error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset password." },
      { status: 500 }
    );
  }
}
