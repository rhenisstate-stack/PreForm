import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { signUpSchema } from "@/lib/validation/auth";
import {
  deriveCandidateIdFromEmail,
  upsertUserProfileMeta,
} from "@/lib/profile-image-db";

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

    const sessionPayload = {
      sub: savedRecord.userId,
      email,
      name: savedRecord.displayName,
      displayName: savedRecord.displayName,
      role: "candidate",
      pathway: savedRecord.pathway,
      picture: savedRecord.pictureUrl,
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
        name: sessionPayload.displayName,
        displayName: sessionPayload.displayName,
        role: sessionPayload.role,
        pathway: sessionPayload.pathway,
        picture: sessionPayload.picture,
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
