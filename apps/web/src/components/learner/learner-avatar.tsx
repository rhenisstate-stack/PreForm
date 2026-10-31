"use client";

import * as React from "react";

/**
 * PrepFord learner avatar.
 *
 * Renders the authenticated learner's persisted profile picture when present,
 * and always falls back to a polished initials badge when:
 * - no profile picture exists yet, or
 * - the image fails to load (broken <img> icons are never shown).
 *
 * Used consistently across the dashboard header, learner sidebar, header
 * profile menu and the profile page so the learner's identity always renders
 * from a single, consistent data source (`user.picture` from the auth session).
 */

export interface LearnerAvatarProps {
  /** Browser-facing profile picture URL (e.g. `/api/profile/image?v=...`). */
  picture?: string;
  /** Learner name used to derive initials for the fallback badge. */
  name?: string;
  /** Tailwind size classes for both image and fallback, e.g. "h-8 w-8". */
  sizeClassName?: string;
  /** Tailwind classes for the fallback initials badge. */
  fallbackClassName?: string;
  className?: string;
  /** Accessible name when used purely as a decorative trigger. */
  alt?: string;
  /** Optional prefix for test IDs (e.g. "profile" → profile-avatar-image). */
  testIdPrefix?: string;
}

function deriveInitials(name?: string): string {
  if (!name) return "PF";
  const parts = name
    .replace(/,.*$/, "")
    .split(/\s+/)
    .filter((w) => w.length > 0 && w !== "&");
  if (parts.length === 0) return "PF";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function LearnerAvatar({
  picture,
  name,
  sizeClassName = "h-8 w-8",
  fallbackClassName = "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30",
  className = "",
  alt,
  testIdPrefix,
}: LearnerAvatarProps) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const initials = deriveInitials(name);
  const imageTestId = testIdPrefix ? `${testIdPrefix}-avatar-image` : "learner-avatar-image";
  const fallbackTestId = testIdPrefix ? `${testIdPrefix}-avatar-initial` : "learner-avatar-fallback";

  const showImage = Boolean(picture && !imageFailed);

  if (!showImage) {
    return (
      <span
        aria-hidden={alt ? undefined : true}
        role={alt ? "img" : undefined}
        aria-label={alt}
        data-testid={fallbackTestId}
        className={`inline-flex select-none items-center justify-center rounded-full font-bold text-xs border shrink-0 ${sizeClassName} ${fallbackClassName} ${className}`}
      >
        {initials}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={picture}
      alt={alt || `${name || "Learner"} profile picture`}
      data-testid={imageTestId}
      onError={() => setImageFailed(true)}
      className={`rounded-full object-cover shrink-0 ${sizeClassName} ${className}`}
    />
  );
}
