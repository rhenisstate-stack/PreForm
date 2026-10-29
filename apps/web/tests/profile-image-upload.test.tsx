import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import { NextRequest } from "next/server";

// Deterministic test isolation


import {
  detectVerifiedImageMimeType,
  saveProfileImageBinary,
  getProfileImageBinary,
  deleteProfileImageBinary,
  getUserProfileMeta,
  upsertUserProfileMeta,
  resetProfileDatabaseForTesting,
  MAX_PROFILE_IMAGE_BYTES,
} from "@/lib/profile-image-db";
import { GET, POST, DELETE } from "@/app/api/profile/image/route";

// Valid minimal PNG binary header + IHDR + IEND
const VALID_PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

// Valid minimal JPEG binary header
const VALID_JPEG_BYTES = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
  0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xd9,
]);

// Mock next/headers cookies for API route testing
let mockCookieStore: Record<string, string> = {};
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      mockCookieStore[name] ? { name, value: mockCookieStore[name] } : undefined,
    set: (name: string, value: string) => {
      mockCookieStore[name] = value;
    },
    delete: (name: string) => {
      delete mockCookieStore[name];
    },
  })),
}));

// Mock next/navigation for ProfilePageClient UI tests
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: () => null,
  }),
}));

const mockRefreshSession = vi.fn();
const mockLogout = vi.fn();
const MOCK_AUTH_USER = {
  id: "cand-ui-1",
  email: "nurse.ui@prepford.com",
  name: "Clara Barton",
  displayName: "Clara Barton, RN",
  role: "candidate",
  pathway: "rn" as const,
  picture: undefined,
};

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: MOCK_AUTH_USER,
    isAuthenticated: true,
    isLoading: false,
    logout: mockLogout,
    refreshSession: mockRefreshSession,
  }),
}));

import { ProfilePageClient } from "@/app/profile/page-client";

describe("Profile Image Database Persistence & Security Validation", () => {
  beforeEach(() => {
    mockCookieStore = {};
    mockRefreshSession.mockClear();
    resetProfileDatabaseForTesting();
  });

  it("verifies binary magic bytes and rejects disguised non-image files", () => {
    expect(detectVerifiedImageMimeType(VALID_PNG_BYTES)).toBe("image/png");
    expect(detectVerifiedImageMimeType(VALID_JPEG_BYTES)).toBe("image/jpeg");

    const fakeSvgAsPng = Buffer.from("<svg><script>alert(1)</script></svg>", "utf-8");
    expect(detectVerifiedImageMimeType(fakeSvgAsPng)).toBeNull();
  });

  it("persists, replaces, and deletes binary image data in the database while keeping profile metadata lightweight", () => {
    const userId = "usr-florence-1";
    const email = "persist.nurse@prepford.com";
    upsertUserProfileMeta({
      userId,
      email,
      displayName: "Florence Nightingale",
      pathway: "rn",
    });

    // Initially no image
    const initialMeta = getUserProfileMeta(userId, email);
    expect(initialMeta?.hasProfileImage).toBe(false);
    expect(initialMeta?.pictureUrl).toBeUndefined();

    // Save PNG binary
    const savedPng = saveProfileImageBinary({
      userId,
      userEmail: email,
      displayName: "Florence Nightingale",
      imageBytes: new Uint8Array(VALID_PNG_BYTES),
    });
    expect(savedPng.contentType).toBe("image/png");
    expect(savedPng.sizeBytes).toBe(VALID_PNG_BYTES.byteLength);
    expect(savedPng.imageUrl).toContain("/api/profile/image?");

    // Metadata query reflects image presence without loading raw bytes
    const metaAfterUpload = getUserProfileMeta(userId, email);
    expect(metaAfterUpload?.hasProfileImage).toBe(true);
    expect(metaAfterUpload?.pictureUrl).toBe(savedPng.imageUrl);

    // Retrieve binary image from DB
    const storedRecord = getProfileImageBinary(userId, email);
    expect(storedRecord).not.toBeNull();
    expect(storedRecord?.contentType).toBe("image/png");
    expect(Buffer.compare(Buffer.from(storedRecord!.imageData), VALID_PNG_BYTES)).toBe(0);

    // Replace existing image with JPEG
    const savedJpeg = saveProfileImageBinary({
      userId,
      userEmail: email,
      imageBytes: new Uint8Array(VALID_JPEG_BYTES),
    });
    expect(savedJpeg.contentType).toBe("image/jpeg");
    const replacedRecord = getProfileImageBinary(userId, email);
    expect(replacedRecord?.contentType).toBe("image/jpeg");
    expect(Buffer.compare(Buffer.from(replacedRecord!.imageData), VALID_JPEG_BYTES)).toBe(0);

    // Delete image
    const deleted = deleteProfileImageBinary(userId, email);
    expect(deleted).toBe(true);
    expect(getProfileImageBinary(userId, email)).toBeNull();
    expect(getUserProfileMeta(userId, email)?.hasProfileImage).toBe(false);
  });

  it("rejects oversized images exceeding the 2 MB limit", () => {
    const oversizedBuffer = Buffer.alloc(MAX_PROFILE_IMAGE_BYTES + 1024);
    VALID_PNG_BYTES.copy(oversizedBuffer, 0);

    expect(() =>
      saveProfileImageBinary({
        userId: "usr-oversize",
        userEmail: "oversize@prepford.com",
        imageBytes: new Uint8Array(oversizedBuffer),
      })
    ).toThrow(/exceeds the maximum allowed size/i);
  });

  it("enforces authentication (401) and server-side ownership (403) on /api/profile/image", async () => {
    // Unauthenticated POST -> 401
    const unauthReq = new NextRequest("http://localhost:3000/api/profile/image", {
      method: "POST",
      body: new Uint8Array(VALID_PNG_BYTES),
      headers: { "content-type": "image/png" },
    });
    const unauthRes = await POST(unauthReq);
    expect(unauthRes.status).toBe(401);

    // Authenticated as Alice via preform_session cookie
    mockCookieStore["preform_session"] = JSON.stringify({
      sub: "alice-id",
      email: "alice@prepford.com",
      name: "Alice RN",
      displayName: "Alice RN",
      role: "candidate",
      pathway: "rn",
    });

    // Alice attempts to upload on behalf of Bob -> 403 Forbidden
    const crossUserPostReq = new NextRequest(
      "http://localhost:3000/api/profile/image?email=bob@prepford.com",
      {
        method: "POST",
        body: new Uint8Array(VALID_PNG_BYTES),
        headers: { "content-type": "image/png" },
      }
    );
    const crossPostRes = await POST(crossUserPostReq);
    expect(crossPostRes.status).toBe(403);

    // Alice uploads her own image -> 200 OK
    const alicePostReq = new NextRequest("http://localhost:3000/api/profile/image", {
      method: "POST",
      body: new Uint8Array(VALID_PNG_BYTES),
      headers: { "content-type": "image/png" },
    });
    const alicePostRes = await POST(alicePostReq);
    expect(alicePostRes.status).toBe(200);
    const body = await alicePostRes.json();
    expect(body.success).toBe(true);
    expect(body.picture).toContain("/api/profile/image?");

    // Alice fetches her own binary image -> 200 OK with image/png
    const aliceGetReq = new NextRequest("http://localhost:3000/api/profile/image", {
      method: "GET",
    });
    const aliceGetRes = await GET(aliceGetReq);
    expect(aliceGetRes.status).toBe(200);
    expect(aliceGetRes.headers.get("Content-Type")).toBe("image/png");

    // Alice attempts to fetch Bob's image -> 403 Forbidden
    const crossGetReq = new NextRequest(
      "http://localhost:3000/api/profile/image?email=bob@prepford.com",
      { method: "GET" }
    );
    const crossGetRes = await GET(crossGetReq);
    expect(crossGetRes.status).toBe(403);

    // Alice deletes her own image -> 200 OK
    const aliceDeleteReq = new NextRequest("http://localhost:3000/api/profile/image", {
      method: "DELETE",
    });
    const aliceDeleteRes = await DELETE(aliceDeleteReq);
    expect(aliceDeleteRes.status).toBe(200);
  });

  it("supports selecting, previewing, uploading, and removing a profile image in ProfilePageClient", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/profile" && (!init || !init.method || init.method === "GET")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            profile: {
              id: "cand-ui-1",
              email: "nurse.ui@prepford.com",
              name: "Clara Barton",
              displayName: "Clara Barton, RN",
              pathway: "rn",
              picture: null,
            },
          }),
        };
      }
      if (url === "/api/profile/image" && (init?.method === "PUT" || init?.method === "POST")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            picture: "/api/profile/image?v=12345",
          }),
        };
      }
      if (url === "/api/profile/image" && init?.method === "DELETE") {
        return {
          ok: true,
          json: async () => ({
            success: true,
            picture: null,
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProfilePageClient />);

    // Fallback initial is displayed when no image is set
    expect(await screen.findByTestId("profile-avatar-initial")).toHaveTextContent("C");

    // Select a valid PNG file
    const fileInput = screen.getByTestId("profile-image-input") as HTMLInputElement;
    const file = new File([new Uint8Array(VALID_PNG_BYTES)], "clara-avatar.png", {
      type: "image/png",
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Preview notice and Upload & Save button appear
    expect(await screen.findByTestId("profile-image-preview-notice")).toHaveTextContent(
      /clara-avatar\.png/i
    );
    const previewImg = await screen.findByTestId("profile-avatar-image");
    expect(previewImg.getAttribute("src")).toContain("data:image/png;base64,");

    // Click Upload & Save Photo
    const uploadBtn = screen.getByTestId("upload-profile-image-btn");
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(screen.getByTestId("profile-image-status")).toHaveTextContent(
        /saved to your account/i
      );
    });

    // Persisted database URL is now rendered and Remove Photo button is available
    expect(screen.getByTestId("profile-avatar-image")).toHaveAttribute(
      "src",
      "/api/profile/image?v=12345"
    );

    const removeBtn = screen.getByTestId("remove-profile-image-btn");
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.getByTestId("profile-avatar-initial")).toBeInTheDocument();
    });

    vi.unstubAllGlobals();
  });
});
