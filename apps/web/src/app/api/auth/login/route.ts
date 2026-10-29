import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { signInSchema } from "@/lib/validation/auth";
import { authService } from "@/lib/api-services";
import { createServerSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = signInSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid login credentials. Please verify your email and password.",
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
      return NextResponse.json(
        {
          success: false,
          error: apiRes.error || apiRes.data?.error || "Invalid login credentials.",
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
    cookieStore.set("preform_session", serverSession.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: serverSession.maxAgeSeconds,
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
        picture: backendUser?.picture,
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
