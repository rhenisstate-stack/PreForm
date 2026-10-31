/**
 * PrepFord profile picture URL resolution.
 *
 * The authoritative ASP.NET Core backend persists profile images as Postgres
 * `UserProfileImages` rows (owned by the authenticated user) and serves them
 * through an authenticated `GET /api/v1/profile/image` endpoint. That endpoint
 * is bearer/gateway protected, so it can never be loaded directly by a plain
 * `<img>` tag. The Next.js BFF route `GET /api/profile/image` is the single
 * browser-facing media endpoint for the signed-in learner's avatar.
 *
 * Every authentication surface (login, registration, session restore, profile)
 * therefore maps the backend metadata (hasProfileImage + profileImageUpdatedAt)
 * to a stable browser-relative URL that is consistently versioned so image
 * replacements are never served stale from browser cache.
 */

const BFF_PICTURE_PREFIX = "/api/profile/image?v=";

export interface ProfilePictureMeta {
  hasProfileImage?: boolean;
  profileImageUpdatedAt?: string | null;
  /** Raw backend or externally provided picture URL (e.g. OAuth profile image). */
  picture?: string | null;
}

/**
 * Resolves the browser-facing profile picture URL for the authenticated user.
 *
 * Rules:
 * 1. Relative `/api/profile/image?v=...` values are already browser-facing —
 *    kept verbatim so replacement cache-busting versions are preserved.
 * 2. Absolute URLs (e.g. OAuth provider images) are kept verbatim.
 * 3. Otherwise, when the user has a persisted profile image, the BFF media
 *    endpoint is returned, versioned by the profile image update timestamp.
 * 4. When the user has no profile image, `undefined` is returned and callers
 *    must render the initials fallback avatar instead.
 */
export function resolveBrowserPictureUrl(meta: ProfilePictureMeta): string | undefined {
  const explicit = typeof meta.picture === "string" ? meta.picture.trim() : "";

  if (explicit && (explicit.startsWith(BFF_PICTURE_PREFIX) || /^https?:\/\//i.test(explicit))) {
    return explicit;
  }

  if (meta.hasProfileImage) {
    const version = meta.profileImageUpdatedAt
      ? encodeURIComponent(meta.profileImageUpdatedAt)
      : "2";
    return `${BFF_PICTURE_PREFIX}${version}`;
  }

  return explicit || undefined;
}
