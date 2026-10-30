"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface TestimonialAvatarProps {
  src?: string | null;
  displayName: string;
  isAnonymous?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
}

const DEFAULT_AVATAR = "/images/avatars/avatar-default.png";

const SIZES = {
  sm: { px: 32, className: "h-8 w-8" },
  md: { px: 40, className: "h-10 w-10" },
  lg: { px: 48, className: "h-12 w-12" },
};

/**
 * Deterministically maps a candidate name to a professional generic avatar
 * when no real approved candidate photograph is supplied.
 */
export function getDeterministicGenericAvatar(name: string): string {
  if (!name) return DEFAULT_AVATAR;
  const list = [
    "/images/avatars/avatar-female-1.png",
    "/images/avatars/avatar-male-1.png",
    "/images/avatars/avatar-female-2.png",
    "/images/avatars/avatar-male-2.png",
    "/images/avatars/avatar-neutral.png",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % list.length;
  return list[index];
}

export function TestimonialAvatar({
  src,
  displayName,
  isAnonymous = false,
  size = "sm",
  className,
  priority = false,
}: TestimonialAvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const sizeConfig = SIZES[size] || SIZES.sm;

  // Determine avatar source: provided image -> deterministic generic avatar -> default fallback
  const resolvedSrc = React.useMemo(() => {
    if (imageError) return DEFAULT_AVATAR;
    if (src && src.trim().length > 0) return src.trim();
    if (isAnonymous) return DEFAULT_AVATAR;
    return getDeterministicGenericAvatar(displayName);
  }, [src, isAnonymous, displayName, imageError]);

  const altText = isAnonymous
    ? "Anonymous candidate avatar"
    : `${displayName} profile avatar`;

  return (
    <div
      data-testid="testimonial-avatar"
      className={cn(
        "relative rounded-full overflow-hidden border border-border/80 bg-muted/60 shadow-xs shrink-0 select-none",
        sizeConfig.className,
        className
      )}
    >
      <Image
        src={resolvedSrc}
        alt={altText}
        width={sizeConfig.px}
        height={sizeConfig.px}
        priority={priority}
        className="h-full w-full object-cover object-center transition-opacity duration-200"
        onError={() => {
          if (!imageError) setImageError(true);
        }}
      />
    </div>
  );
}
