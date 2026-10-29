import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { signInSchema } from "@/lib/validation/auth";
import {
  deriveCandidateIdFromEmail,
  getUserProfileMeta,
} from "@/lib/profile-image-db";
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

    const { email, rememberMe } = result.data;

    // Format display name from email (e.g. jane.doe@example.com -> Jane Doe)
    const rawName = email.split("@")[0].replace(/[._-]/g, " ");
    const defaultDisplayName = rawName
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const userId = deriveCandidateIdFromEmail(email);
    const dbMeta = getUserProfileMeta(userId, email);
    const displayName = dbMeta?.displayName || defaultDisplayName;
    const pathway = dbMeta?.pathway || ("rn" as const);
    const picture = dbMeta?.pictureUrl;

    const serverSession = createServerSession({
      userId,
      email,
      role: "candidate",
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
        id: serverSession.session.userId,
        email: serverSession.session.email,
        name: displayName,
        displayName,
        role: serverSession.session.role,
        pathway,
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
