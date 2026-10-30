"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import type { Announcement } from "@/types";

interface AnnouncementBarProps {
  announcements: Announcement[] | null;
  isLoading: boolean;
}

export function AnnouncementBar({ announcements, isLoading }: AnnouncementBarProps) {
  const pathname = usePathname();
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());

  const active = React.useMemo(() => {
    if (isLoading || !announcements) return null;
    return announcements.find((a) => !dismissedIds.has(a.id));
  }, [announcements, isLoading, dismissedIds]);

  if (
    !active ||
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/sign-in") ||
    pathname?.startsWith("/sign-up")
  ) {
    return null;
  }

  const handleDismiss = () => {
    setDismissedIds((prev) => new Set([...prev, active.id]));
  };

  return (
    <div className="flex items-center justify-center px-4 py-2 text-xs font-medium bg-secondary text-secondary-foreground">
      <span className="mr-2">{active.title}</span>
      {active.destination ? (
        <Link
          href={active.destination}
          className="underline underline-offset-4 hover:opacity-80"
          onClick={handleDismiss}
        >
          Learn more
        </Link>
      ) : null}
      <button
        onClick={handleDismiss}
        className="ml-auto flex items-center gap-1 text-secondary-foreground hover:text-secondary/80"
        aria-label="Dismiss announcement"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
