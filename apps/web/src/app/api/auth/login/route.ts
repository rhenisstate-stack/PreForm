import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { signInSchema } from "@/lib/validation/auth";
import { authService } from "@/lib/api-services";
import { createServerSession, setSessionCookie } from "@/lib/session";
import { resolveBrowserPictureUrl } from "@/lib/profile-picture";
import { mapAuthHttpStatusToMessage } from "@/lib/error-mapping";
import { ensureClientId } from "@/lib/client-id";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = signInSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Please review the information you entered.",
          fieldErrors: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password, rememberMe, recoverSessions } = result.data;
    const cookieStore = await cookies();
    const { clientId } = ensureClientId(cookieStore, request);

    // Dispatch login request to authoritative ASP.NET Core API with client ID
    let apiRes = await authService.login({
      email,
      password,
      rememberMe,
      clientId,
    });

    // Opt-in credential-verified recovery: when the backend enforces the concurrent-session
    // limit and the caller explicitly requested recovery, attempt narrowly-scoped recovery
    // (sweeps sessions that can no longer authenticate) and retry the login exactly once.
    // Recovery itself requires valid credentials and is rate limited by the backend.
    if (
      recoverSessions === true &&
      apiRes.status === 409 &&
      apiRes.data?.errorCode === "CONCURRENT_SESSION_LIMIT_EXCEEDED" &&
      (!apiRes.success || !apiRes.data.success)
    ) {
      const recoveryRes = await authService.recoverSessions({
        email,
        password,
        clearRemainingSessions: false,
      });

      if (recoveryRes.success && recoveryRes.data?.success) {
        apiRes = await authService.login({
          email,
          password,
          rememberMe,
          clientId,
        });
      } else {
        const recoveryStatus =
          recoveryRes.status >= 400 && recoveryRes.status < 600 ? recoveryRes.status : 401;
        const recoveryError =
          recoveryStatus === 429
            ? "Too many recovery attempts. Please wait a few minutes and try again."
            : mapAuthHttpStatusToMessage(
                recoveryStatus,
                recoveryRes.data?.error || recoveryRes.error
              );

        return NextResponse.json(
          {
            success: false,
            error: recoveryError,
            errorCode: recoveryRes.data?.errorCode,
          },
          { status: recoveryStatus }
        );
      }
    }

    if (!apiRes.success || !apiRes.data?.success) {
      const status = apiRes.status >= 400 && apiRes.status < 600 ? apiRes.status : 401;
      const errorCode = apiRes.data?.errorCode;
      const userFacingError = mapAuthHttpStatusToMessage(
        status,
        apiRes.data?.error || apiRes.error
      );

      return NextResponse.json(
        {
          success: false,
          error: userFacingError,
          errorCode,
        },
        { status }
      );
    }

    const backendUser = apiRes.data.user;
    const backendSessionId = apiRes.data.sessionId;
    const rawName = email.split("@")[0].replace(/[._-]/g, " ");
    const defaultDisplayName = rawName
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const displayName = backendUser?.displayName || backendUser?.name || defaultDisplayName;
    const userId = backendUser?.id || `cand_${Date.now()}`;
    const role = backendUser?.role || "candidate";

    const serverSession = createServerSession({
      userId,
      email,
      role,
      displayName,
      rememberMe,
      sessionId: backendSessionId,
      clientId,
    });

    setSessionCookie(cookieStore, serverSession.token, serverSession.maxAgeSeconds);

    // Profile picture reference is restored immediately from authoritative
    // backend metadata so the avatar loads on the dashboard right after login.
    const picture = resolveBrowserPictureUrl({
      hasProfileImage: backendUser?.hasProfileImage ?? Boolean(backendUser?.picture),
      profileImageUpdatedAt: backendUser?.profileImageUpdatedAt,
      picture: backendUser?.picture,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: email.toLowerCase().trim(),
        name: displayName,
        displayName,
        role,
        pathway: backendUser?.pathway || "rn",
        picture,
      },
    });
  } catch (err) {
    console.error("[Login API] Error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during sign-in." },
      { status: 500 }
    );
  }
}
