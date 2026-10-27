import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { signUpSchema } from "@/lib/validation/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = signUpSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Registration validation failed. Please check your inputs.",
          fieldErrors: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { fullName, email, pathway } = result.data;

    const sessionPayload = {
      sub: `prf_usr_${Date.now().toString(36)}`,
      email,
      name: fullName,
      displayName: fullName,
      role: "candidate",
      pathway,
      provider: "credentials",
      createdAt: new Date().toISOString(),
    };

    const cookieStore = await cookies();
    cookieStore.set("preform_session", JSON.stringify(sessionPayload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
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
    console.error("[Register API] Error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}
