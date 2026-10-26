"use client";

import * as React from "react";
import Link from "next/link";
import { useAnnouncements } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Announcement } from "@/types";

export function AnnouncementBar() {
  const { data: announcements, isLoading } = useAnnouncements();
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());
  const [activeAnnouncement, setActiveAnnouncement] = React.useState<
    Announcement | null
  >(null);

  const now = Date.now();
  const active = React.useMemo(() => {
    if (isLoading || !announcements) return null;
    return announcements.find((a: Announcement) => {
      const from = new Date(a.activeFrom).getTime();
      const to = a.activeTo ? new Date(a.activeTo).getTime() : Infinity;
      return now >= from && now <= to && !dismissedIds.has(a.id);
    });
  }, [announcements, isLoading, dismissedIds, now]);

  if (!active) return null;

  const handleDismiss = () => {
    setDismissedIds((prev) => new Set([...prev, active.id]));
    setActiveAnnouncement(null);
  };

  return (
    <div className="flex items-center justify-center px-4 py-2 text-xs font-medium bg-green text-white">
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
        className="ml-auto flex items-center gap-1 text-white hover:text-green/80"
        aria-label="Dismiss announcement"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
