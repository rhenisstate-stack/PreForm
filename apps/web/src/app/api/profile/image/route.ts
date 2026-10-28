import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  MAX_PROFILE_IMAGE_BYTES,
  deleteProfileImageBinary,
  deriveCandidateIdFromEmail,
  getProfileImageBinary,
  saveProfileImageBinary,
} from "@/lib/profile-image-db";

interface SessionPayload {
  sub?: string;
  id?: string;
  email?: string;
  name?: string;
  displayName?: string;
  role?: string;
  pathway?: "rn" | "pn";
  picture?: string;
  provider?: string;
  [key: string]: unknown;
}

async function resolveSession(): Promise<{
  session: SessionPayload;
  userId: string;
  email: string;
} | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("preform_session");
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  try {
    const parsed = JSON.parse(sessionCookie.value) as SessionPayload;
    if (!parsed.email || typeof parsed.email !== "string") {
      return null;
    }
    const email = parsed.email.trim().toLowerCase();
    const userId = parsed.sub || parsed.id || deriveCandidateIdFromEmail(email);
    return { session: parsed, userId, email };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveSession();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Enforce server-side ownership: reject requests attempting to fetch another user's private image
    const requestedUserId = request.nextUrl.searchParams.get("userId");
    const requestedEmail = request.nextUrl.searchParams.get("email");
    if (
      (requestedUserId && requestedUserId !== auth.userId) ||
      (requestedEmail && requestedEmail.trim().toLowerCase() !== auth.email)
    ) {
      return NextResponse.json(
        { success: false, error: "Forbidden: cannot access another user's profile image." },
        { status: 403 }
      );
    }

    const record = getProfileImageBinary(auth.userId, auth.email);
    if (!record || record.imageData.byteLength === 0) {
      return NextResponse.json(
        { success: false, error: "Profile image not found" },
        { status: 404 }
      );
    }

    const etag = `"${record.sha256Hash}"`;
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, max-age=0, must-revalidate",
        },
      });
    }

    return new NextResponse(Buffer.from(record.imageData), {
      status: 200,
      headers: {
        "Content-Type": record.contentType,
        "Content-Length": String(record.sizeBytes),
        ETag: etag,
        "Cache-Control": "private, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[Profile Image GET] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve profile image." },
      { status: 500 }
    );
  }
}

async function handleUpload(request: NextRequest) {
  try {
    const auth = await resolveSession();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to upload a profile picture." },
        { status: 401 }
      );
    }

    // Server-side ownership check: never allow client to specify another user's ID or email
    const targetUserParam =
      request.nextUrl.searchParams.get("userId") ||
      request.headers.get("x-target-user-id");
    const targetEmailParam = request.nextUrl.searchParams.get("email");
    if (
      (targetUserParam && targetUserParam !== auth.userId) ||
      (targetEmailParam && targetEmailParam.trim().toLowerCase() !== auth.email)
    ) {
      return NextResponse.json(
        { success: false, error: "Forbidden: you may only update your own profile image." },
        { status: 403 }
      );
    }

    let imageBytes: Uint8Array | null = null;
    const contentTypeHeader = request.headers.get("content-type") || "";

    if (contentTypeHeader.includes("multipart/form-data")) {
      const formData = await request.formData();
      const formUserId = formData.get("userId");
      if (typeof formUserId === "string" && formUserId && formUserId !== auth.userId) {
        return NextResponse.json(
          { success: false, error: "Forbidden: you may only update your own profile image." },
          { status: 403 }
        );
      }

      const fileEntry = formData.get("file") || formData.get("image");
      if (!fileEntry || typeof fileEntry === "string" || typeof fileEntry.arrayBuffer !== "function") {
        return NextResponse.json(
          { success: false, error: "Please select a valid image file to upload." },
          { status: 400 }
        );
      }

      if (fileEntry.size > MAX_PROFILE_IMAGE_BYTES) {
        return NextResponse.json(
          { success: false, error: "Profile image exceeds the maximum allowed size of 2 MB." },
          { status: 400 }
        );
      }

      const arrayBuffer = await fileEntry.arrayBuffer();
      imageBytes = new Uint8Array(arrayBuffer);
    } else {
      const arrayBuffer = await request.arrayBuffer();
      imageBytes = new Uint8Array(arrayBuffer);
    }

    if (!imageBytes || imageBytes.byteLength === 0) {
      return NextResponse.json(
        { success: false, error: "Image payload cannot be empty." },
        { status: 400 }
      );
    }

    if (imageBytes.byteLength > MAX_PROFILE_IMAGE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Profile image exceeds the maximum allowed size of 2 MB." },
        { status: 400 }
      );
    }

    let savedMeta;
    try {
      savedMeta = saveProfileImageBinary({
        userId: auth.userId,
        userEmail: auth.email,
        displayName: auth.session.displayName || auth.session.name,
        imageBytes,
      });
    } catch (validationErr) {
      return NextResponse.json(
        {
          success: false,
          error:
            validationErr instanceof Error
              ? validationErr.message
              : "Invalid or unsupported image file.",
        },
        { status: 400 }
      );
    }

    // Update session cookie with lightweight versioned media endpoint URL (no base64 bloat in cookie)
    const cookieStore = await cookies();
    const updatedSession: SessionPayload = {
      ...auth.session,
      sub: savedMeta.userId,
      picture: savedMeta.imageUrl,
      updatedAt: savedMeta.updatedAt,
    };

    cookieStore.set("preform_session", JSON.stringify(updatedSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      success: true,
      picture: savedMeta.imageUrl,
      image: {
        contentType: savedMeta.contentType,
        sizeBytes: savedMeta.sizeBytes,
        sha256Hash: savedMeta.sha256Hash,
        updatedAt: savedMeta.updatedAt,
        url: savedMeta.imageUrl,
      },
    });
  } catch (err) {
    console.error("[Profile Image Upload] Error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred while saving your profile image." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handleUpload(request);
}

export async function PUT(request: NextRequest) {
  return handleUpload(request);
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await resolveSession();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const targetUserParam =
      request.nextUrl.searchParams.get("userId") ||
      request.headers.get("x-target-user-id");
    if (targetUserParam && targetUserParam !== auth.userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: you may only delete your own profile image." },
        { status: 403 }
      );
    }

    const deleted = deleteProfileImageBinary(auth.userId, auth.email);

    const cookieStore = await cookies();
    const updatedSession: SessionPayload = {
      ...auth.session,
      picture: undefined,
      updatedAt: new Date().toISOString(),
    };

    cookieStore.set("preform_session", JSON.stringify(updatedSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      success: true,
      deleted,
      picture: null,
    });
  } catch (err) {
    console.error("[Profile Image DELETE] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to remove profile image." },
      { status: 500 }
    );
  }
}
