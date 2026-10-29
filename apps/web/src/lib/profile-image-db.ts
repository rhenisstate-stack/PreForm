import { createHash, randomUUID } from "node:crypto";

export const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MIN_PROFILE_IMAGE_BYTES = 16;

export type SupportedImageMimeType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

export interface StoredProfileImageMeta {
  id: string;
  userId: string;
  userEmail: string;
  contentType: SupportedImageMimeType;
  sizeBytes: number;
  sha256Hash: string;
  updatedAt: string;
  imageUrl: string;
}

export interface StoredProfileImageBinary {
  imageData: Uint8Array;
  contentType: SupportedImageMimeType;
  sizeBytes: number;
  sha256Hash: string;
  updatedAt: string;
}

export interface StoredUserProfileRecord {
  userId: string;
  email: string;
  displayName: string;
  pathway: "rn" | "pn" | "both";
  targetExamDate: string;
  activePlan: string;
  emailNotifications: boolean;
  studyReminders: boolean;
  hasProfileImage: boolean;
  profileImageUpdatedAt: string | null;
  pictureUrl: string | undefined;
}

/**
 * Deterministically derives a candidate ID from a normalized email.
 */
export function deriveCandidateIdFromEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const digest = createHash("sha256").update(normalized).digest("hex").slice(0, 20);
  return `prf_usr_${digest}`;
}

/**
 * Inspects binary magic bytes to verify genuine raster image content.
 * Never trusts file extensions or client-supplied Content-Type headers alone.
 */
export function detectVerifiedImageMimeType(bytes: Uint8Array): SupportedImageMimeType | null {
  if (!bytes || bytes.byteLength < MIN_PROFILE_IMAGE_BYTES) {
    return null;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // GIF: GIF87a or GIF89a
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }

  // WebP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export function buildProfileImageUrl(updatedAtOrHash?: string | null): string {
  const version = updatedAtOrHash ? encodeURIComponent(updatedAtOrHash) : "1";
  return `/api/profile/image?v=${version}`;
}

// ── In-Memory Isolated Compatibility Store (Zero SQLite Runtime Dependency) ──
const memoryProfileMeta = new Map<string, StoredUserProfileRecord>();
const memoryProfileImage = new Map<string, StoredProfileImageBinary>();
const resetCallbacks: Array<() => void> = [];

export function registerResetCallback(fn: () => void): void {
  resetCallbacks.push(fn);
}

export function resetProfileDatabaseForTesting(): void {
  memoryProfileMeta.clear();
  memoryProfileImage.clear();
  for (const cb of resetCallbacks) {
    try {
      cb();
    } catch {
      // ignore
    }
  }
}

/**
 * In-memory fallback for profile metadata during isolated unit testing.
 */
export function getUserProfileMeta(userId: string, email: string): StoredUserProfileRecord | null {
  const key = `${userId.toLowerCase()}::${email.trim().toLowerCase()}`;
  return memoryProfileMeta.get(key) || null;
}

export function upsertUserProfileMeta(input: {
  userId: string;
  email: string;
  displayName?: string;
  pathway?: "rn" | "pn" | "both";
  targetExamDate?: string;
  activePlan?: string;
  emailNotifications?: boolean;
  studyReminders?: boolean;
  hasProfileImage?: boolean;
  profileImageUpdatedAt?: string | null;
}): StoredUserProfileRecord {
  const key = `${input.userId.toLowerCase()}::${input.email.trim().toLowerCase()}`;
  const existing = memoryProfileMeta.get(key);

  const updated: StoredUserProfileRecord = {
    userId: input.userId,
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName ?? existing?.displayName ?? "Nursing Candidate",
    pathway: input.pathway ?? existing?.pathway ?? "rn",
    targetExamDate: input.targetExamDate ?? existing?.targetExamDate ?? "2026-11-30",
    activePlan: input.activePlan ?? existing?.activePlan ?? "NCLEX-RN Complete Preparation Plan",
    emailNotifications: input.emailNotifications ?? existing?.emailNotifications ?? true,
    studyReminders: input.studyReminders ?? existing?.studyReminders ?? true,
    hasProfileImage: input.hasProfileImage ?? existing?.hasProfileImage ?? false,
    profileImageUpdatedAt: input.profileImageUpdatedAt !== undefined ? input.profileImageUpdatedAt : (existing?.profileImageUpdatedAt ?? null),
    pictureUrl: input.hasProfileImage || existing?.hasProfileImage ? buildProfileImageUrl(input.profileImageUpdatedAt ?? existing?.profileImageUpdatedAt) : undefined,
  };

  memoryProfileMeta.set(key, updated);
  return updated;
}

export function saveProfileImageBinary(input: {
  userId: string;
  userEmail: string;
  displayName?: string;
  imageBytes: Uint8Array;
}): StoredProfileImageMeta {
  const detectedType = detectVerifiedImageMimeType(input.imageBytes);
  if (!detectedType) {
    throw new Error("Invalid image format. Supported formats are PNG, JPEG, WebP, and GIF.");
  }

  if (input.imageBytes.byteLength > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error("Profile image exceeds the maximum allowed size of 2 MB.");
  }

  const sha256Hash = createHash("sha256").update(input.imageBytes).digest("hex");
  const now = new Date().toISOString();
  const key = `${input.userId.toLowerCase()}::${input.userEmail.trim().toLowerCase()}`;

  memoryProfileImage.set(key, {
    imageData: input.imageBytes,
    contentType: detectedType,
    sizeBytes: input.imageBytes.byteLength,
    sha256Hash,
    updatedAt: now,
  });

  upsertUserProfileMeta({
    userId: input.userId,
    email: input.userEmail,
    displayName: input.displayName,
    hasProfileImage: true,
    profileImageUpdatedAt: now,
  });

  return {
    id: `img_${randomUUID().slice(0, 12)}`,
    userId: input.userId,
    userEmail: input.userEmail,
    contentType: detectedType,
    sizeBytes: input.imageBytes.byteLength,
    sha256Hash,
    updatedAt: now,
    imageUrl: buildProfileImageUrl(now),
  };
}

export function getProfileImageBinary(
  userId: string,
  userEmail: string
): StoredProfileImageBinary | null {
  const key = `${userId.toLowerCase()}::${userEmail.trim().toLowerCase()}`;
  return memoryProfileImage.get(key) || null;
}

export function deleteProfileImageBinary(userId: string, userEmail: string): boolean {
  const key = `${userId.toLowerCase()}::${userEmail.trim().toLowerCase()}`;
  const hadImage = memoryProfileImage.delete(key);

  const existingMeta = memoryProfileMeta.get(key);
  if (existingMeta) {
    existingMeta.hasProfileImage = false;
    existingMeta.profileImageUpdatedAt = null;
    existingMeta.pictureUrl = undefined;
  }

  return hadImage;
}
