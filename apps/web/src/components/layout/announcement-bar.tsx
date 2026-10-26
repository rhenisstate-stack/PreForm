"use client";

import * as React from "react";
import { useAnnouncements } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { X } from "lucide-react";
import type { Announcement } from "@/types";

export function AnnouncementBar() {
  const { data: announcements, isLoading } = useAnnouncements();
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());
  const [activeAnnouncement, setActiveAnnouncement] = React.useState<
    Announcement | null
  >(null);

  React.useEffect(() => {
    if (isLoading || !announcements) return;
    const now = Date.now();
    const active = announcements.find((a) => {
      const from = new Date(a.activeFrom).getTime();
      const to = a.activeTo ? new Date(a.activeTo).getTime() : Infinity;
      return now >= from && now <= to && !dismissedIds.has(a.id);
    });
    setActiveAnnouncement(active ?? null);
  }, [announcements, isLoading, dismissedIds]);

  if (!activeAnnouncement) return null;

  const handleDismiss = () => {
    setDismissedIds((prev) => new Set([...prev, activeAnnouncement.id]));
    setActiveAnnouncement(null);
  };

  return (
    <div
      className="flex items-center justify-center px-4 py-2 text-xs font-medium bg-green text-white"
    >
      <span className="mr-2">{activeAnnouncement.title}</span>
      {activeAnnouncement.destination ? (
        <Link
          href={activeAnnouncement.destination}
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
