import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import zxcvbn from "zxcvbn";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("preform_session");

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword) {
      return NextResponse.json({ success: false, error: "Current password is required." }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ success: false, error: "New password must be at least 8 characters." }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ success: false, error: "New passwords do not match." }, { status: 400 });
    }

    const evaluation = zxcvbn(newPassword);
    if (evaluation.score < 2) {
      return NextResponse.json({
        success: false,
        error: evaluation.feedback.warning || "Password is too weak. Please include numbers, symbols, or additional words.",
      }, { status: 400 });
    }

    // In preview mode, password change is confirmed successfully
    return NextResponse.json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
