import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { signInSchema } from "@/lib/validation/auth";

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

    const { email, rememberMe } = result.data;

    // Format display name from email (e.g. jane.doe@example.com -> Jane Doe)
    const rawName = email.split("@")[0].replace(/[._-]/g, " ");
    const displayName = rawName
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const sessionPayload = {
      sub: `prf_usr_${Date.now().toString(36)}`,
      email,
      name: displayName,
      displayName,
      role: "candidate",
      pathway: "rn" as const,
      provider: "credentials",
      createdAt: new Date().toISOString(),
    };

    const cookieStore = await cookies();
    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7; // 30 days if rememberMe, else 7 days

    cookieStore.set("preform_session", JSON.stringify(sessionPayload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: sessionPayload.sub,
        email: sessionPayload.email,
        displayName: sessionPayload.displayName,
        role: sessionPayload.role,
        pathway: sessionPayload.pathway,
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
