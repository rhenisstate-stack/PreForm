import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { signInSchema } from "@/lib/validation/auth";
import { authService } from "@/lib/api-services";
import { createServerSession, setSessionCookie } from "@/lib/session";
import { resolveBrowserPictureUrl } from "@/lib/profile-picture";
import { mapAuthHttpStatusToMessage } from "@/lib/error-mapping";

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

    const { email, password, rememberMe } = result.data;

    // Dispatch login request to authoritative ASP.NET Core API
    const apiRes = await authService.login({
      email,
      password,
      rememberMe,
    });

    if (!apiRes.success || !apiRes.data?.success) {
      const status = apiRes.status >= 400 && apiRes.status < 600 ? apiRes.status : 401;
      const userFacingError = mapAuthHttpStatusToMessage(
        status,
        apiRes.data?.error || apiRes.error
      );

      return NextResponse.json(
        {
          success: false,
          error: userFacingError,
        },
        { status }
      );
    }

    const backendUser = apiRes.data.user;
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
    });

    const cookieStore = await cookies();
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
