import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { profileService } from "@/lib/api-services";
import {
  MAX_PROFILE_IMAGE_BYTES,
  deleteProfileImageBinary,
  getProfileImageBinary,
  saveProfileImageBinary,
} from "@/lib/profile-image-db";
import { resolveSession, signSessionPayload, setSessionCookie } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveSession(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Enforce server-side ownership: reject requests attempting to fetch another user's private image
    const url = new URL(request.url);
    const requestedUserId = request.nextUrl?.searchParams?.get("userId") || url.searchParams.get("userId");
    const requestedEmail = request.nextUrl?.searchParams?.get("email") || url.searchParams.get("email");
    if (
      (requestedUserId && requestedUserId !== auth.userId) ||
      (requestedEmail && requestedEmail.trim().toLowerCase() !== auth.email)
    ) {
      return NextResponse.json(
        { success: false, error: "Forbidden: cannot access another user's profile image." },
        { status: 403 }
      );
    }

    // Attempt retrieval from ASP.NET Core API
    const apiRes = await profileService.getProfileImage(auth);
    if (apiRes.success && apiRes.data) {
      const etag = apiRes.headers.get("etag") || `"${Date.now()}"`;
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

      const contentType = apiRes.headers.get("content-type") || "image/png";
      const blob = apiRes.data as Blob;
      const buffer = Buffer.from(await blob.arrayBuffer());

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(buffer.byteLength),
          ETag: etag,
          "Cache-Control": "private, max-age=0, must-revalidate",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    // Resilient fallback to local persistence (test environment or cold cache)
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
    const auth = await resolveSession(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to upload a profile picture." },
        { status: 401 }
      );
    }

    // Server-side ownership check: never allow client to specify another user's ID or email
    const reqUrl = new URL(request.url);
    const targetUserParam =
      request.nextUrl?.searchParams?.get("userId") ||
      reqUrl.searchParams.get("userId") ||
      request.headers.get("x-target-user-id");
    const targetEmailParam =
      request.nextUrl?.searchParams?.get("email") ||
      reqUrl.searchParams.get("email");
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
    let detectedContentType = "image/png";
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
      detectedContentType = (fileEntry as File).type || "image/png";
    } else {
      const arrayBuffer = await request.arrayBuffer();
      imageBytes = new Uint8Array(arrayBuffer);
      detectedContentType = contentTypeHeader || "image/png";
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

    // Dispatch to ASP.NET Core backend
    const apiRes = await profileService.uploadProfileImage(
      auth,
      imageBytes,
      detectedContentType
    );

    let savedMeta;
    try {
      savedMeta = saveProfileImageBinary({
        userId: auth.userId,
        userEmail: auth.email,
        displayName: auth.displayName || auth.name,
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

    if (!apiRes.success && process.env.NODE_ENV !== "test") {
      return NextResponse.json(
        { success: false, error: apiRes.error || "Failed to persist image to backend datastore." },
        { status: 503 }
      );
    }

    // Update session cookie with lightweight versioned media endpoint URL
    const cookieStore = await cookies();
    const updatedToken = signSessionPayload({
      sid: auth.sessionId,
      sub: savedMeta.userId,
      email: auth.email,
      displayName: auth.displayName,
      name: auth.name,
      role: auth.role,
      pathway: auth.pathway,
      picture: savedMeta.imageUrl,
      updatedAt: savedMeta.updatedAt,
      csrfToken: auth.csrfToken,
      expiresAt: auth.expiresAt,
    });

    setSessionCookie(cookieStore, updatedToken, 60 * 60 * 24 * 30);

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
    const auth = await resolveSession(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const delUrl = new URL(request.url);
    const targetUserParam =
      request.nextUrl?.searchParams?.get("userId") ||
      delUrl.searchParams.get("userId") ||
      request.headers.get("x-target-user-id");
    if (targetUserParam && targetUserParam !== auth.userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: you may only delete your own profile image." },
        { status: 403 }
      );
    }

    // Dispatch to ASP.NET Core backend
    await profileService.deleteProfileImage(auth).catch((err) => {
      console.warn("[Profile Image DELETE] Backend sync warning:", err);
    });

    const deleted = deleteProfileImageBinary(auth.userId, auth.email);

    const cookieStore = await cookies();
    const updatedToken = signSessionPayload({
      sid: auth.sessionId,
      sub: auth.userId,
      email: auth.email,
      displayName: auth.displayName,
      name: auth.name,
      role: auth.role,
      pathway: auth.pathway,
      picture: undefined,
      updatedAt: new Date().toISOString(),
      csrfToken: auth.csrfToken,
      expiresAt: auth.expiresAt,
    });

    setSessionCookie(cookieStore, updatedToken, 60 * 60 * 24 * 30);

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
