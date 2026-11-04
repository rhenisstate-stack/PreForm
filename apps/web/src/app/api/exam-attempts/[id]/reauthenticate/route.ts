import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { attemptsService } from "@/lib/api-services";
import { createServerSession, setSessionCookie, resolveSession } from "@/lib/session";
import { ensureClientId } from "@/lib/client-id";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: attemptId } = await params;
    const body = await request.json().catch(() => ({}));
    const { password, email } = body || {};

    if (!password || typeof password !== "string" || !password.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Password is required for reauthentication.",
          errorCode: "INVALID_REQUEST",
        },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const existingSession = await resolveSession(request);
    const { clientId } = ensureClientId(cookieStore, request);

    const userEmail = email || existingSession?.email;

    const apiRes = await attemptsService.reauthenticateAttempt(attemptId, {
      password: password.trim(),
      email: userEmail,
      clientId,
    });

    if (!apiRes.success || !apiRes.data?.success) {
      const status = apiRes.status >= 400 && apiRes.status < 600 ? apiRes.status : 401;
      return NextResponse.json(
        {
          success: false,
          error: apiRes.data?.error || apiRes.error || "Reauthentication failed.",
          errorCode: apiRes.data?.errorCode || "REAUTHENTICATION_FAILED",
        },
        { status }
      );
    }

    const { sessionId, user, attempt } = apiRes.data;

    if (!user || !sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Incomplete authentication response from server.",
          errorCode: "SESSION_CREATION_FAILED",
        },
        { status: 500 }
      );
    }

    const serverSession = createServerSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName || user.name,
      rememberMe: false,
      sessionId,
      clientId,
    });

    setSessionCookie(cookieStore, serverSession.token, serverSession.maxAgeSeconds);

    return NextResponse.json({
      success: true,
      sessionId,
      user,
      attempt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Reauthentication internal error.";
    return NextResponse.json(
      { success: false, error: message, errorCode: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
