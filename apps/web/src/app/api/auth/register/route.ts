import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { signUpSchema } from "@/lib/validation/auth";
import { authService } from "@/lib/api-services";
import { createServerSession, setSessionCookie } from "@/lib/session";
import { resolveBrowserPictureUrl } from "@/lib/profile-picture";
import { mapAuthHttpStatusToMessage } from "@/lib/error-mapping";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = signUpSchema.safeParse(body);

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

    const { fullName, email, pathway, password } = result.data;

    // Dispatch registration to authoritative ASP.NET Core API
    const apiRes = await authService.register({
      fullName,
      email,
      password,
      pathway,
    });

    if (!apiRes.success || !apiRes.data?.success) {
      const status = apiRes.status >= 400 && apiRes.status < 600 ? apiRes.status : 503;
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
    const userId = backendUser?.id || `cand_${Date.now()}`;

    // Establish cryptographically signed session cookie
    const serverSession = createServerSession({
      userId,
      email,
      role: backendUser?.role || "candidate",
      displayName: backendUser?.displayName || fullName,
    });

    const cookieStore = await cookies();
    setSessionCookie(cookieStore, serverSession.token, serverSession.maxAgeSeconds);

    // Newly registered learners have no profile picture yet; map anyway for
    // OAuth-backed or resumed registrations that may reference one.
    const picture = resolveBrowserPictureUrl({
      hasProfileImage: backendUser?.hasProfileImage ?? false,
      profileImageUpdatedAt: backendUser?.profileImageUpdatedAt,
      picture: backendUser?.picture,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: email.toLowerCase().trim(),
        name: backendUser?.displayName || fullName,
        displayName: backendUser?.displayName || fullName,
        role: backendUser?.role || "candidate",
        pathway: backendUser?.pathway || pathway || "rn",
        picture,
      },
    });
  } catch (err) {
    console.error("[Register API] Error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}
