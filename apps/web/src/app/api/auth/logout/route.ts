import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.set("preform_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("[Logout API] Error:", err);
    return NextResponse.json({ success: false, error: "Logout failed" }, { status: 500 });
  }
}
