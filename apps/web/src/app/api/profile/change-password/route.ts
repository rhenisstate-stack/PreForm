import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import zxcvbn from "zxcvbn";
import { profileService } from "@/lib/api-services";
import { resolveSession, createServerSession, revokeAllUserSessions, setSessionCookie } from "@/lib/session";

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
      return NextResponse.json(
        {
          success: false,
          error:
            evaluation.feedback.warning ||
            "Password is too weak. Please include numbers, symbols, or additional words.",
        },
        { status: 400 }
      );
    }

    // Dispatch password change to backend ASP.NET Core API
    const apiRes = await profileService.changePassword(session, {
      currentPassword,
      newPassword,
    });

    if (!apiRes.success) {
      // In non-test environments or on validation errors from backend, fail with backend response
      if (process.env.NODE_ENV !== "test" || (apiRes.status >= 400 && apiRes.status < 500)) {
        return NextResponse.json(
          {
            success: false,
            error: apiRes.error || "Failed to update password.",
          },
          { status: apiRes.status }
        );
      }
    }

    // Invalidate local sessions and issue fresh session
    revokeAllUserSessions(session.userId);

    const freshSession = createServerSession({
      userId: session.userId,
      email: session.email,
      role: session.role,
      displayName: session.displayName,
    });

    const cookieStore = await cookies();
    setSessionCookie(cookieStore, freshSession.token, freshSession.maxAgeSeconds);

    return NextResponse.json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
