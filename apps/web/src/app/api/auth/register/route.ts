import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { signUpSchema } from "@/lib/validation/auth";
import {
  deriveCandidateIdFromEmail,
  upsertUserProfileMeta,
} from "@/lib/profile-image-db";
import { createServerSession } from "@/lib/session";

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

    const userId = deriveCandidateIdFromEmail(email);
    const savedRecord = upsertUserProfileMeta({
      userId,
      email,
      displayName: fullName,
      pathway,
    });

    const serverSession = createServerSession({
      userId,
      email,
      role: "candidate",
      displayName: fullName,
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
        name: savedRecord.displayName,
        displayName: savedRecord.displayName,
        role: serverSession.session.role,
        pathway: savedRecord.pathway,
        picture: savedRecord.pictureUrl,
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
