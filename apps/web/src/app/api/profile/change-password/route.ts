import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import zxcvbn from "zxcvbn";
import { resolveSession, createServerSession, revokeAllUserSessions } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const session = await resolveSession(request);

    if (!session || !session.email) {
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

    // Security Best Practice: On password change, invalidate previous sessions and issue a fresh session
    revokeAllUserSessions(session.userId);

    const freshSession = createServerSession({
      userId: session.userId,
      email: session.email,
      role: session.role,
      displayName: session.displayName,
    });

    const cookieStore = await cookies();
    cookieStore.set("preform_session", freshSession.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: freshSession.maxAgeSeconds,
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
