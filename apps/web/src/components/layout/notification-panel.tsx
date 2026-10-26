"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, ChevronRight, LogOut, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Announcement } from "@/types";
import { useAnnouncements } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

interface NotificationPanelProps {
  user?: { displayName: string; role: string; email: string };
}

export function NotificationPanel({ user }: NotificationPanelProps) {
  const { data: announcements, isLoading } = useAnnouncements();
  const activeAnnouncements = React.useMemo(
    () =>
      (announcements ?? []).filter((a) => {
        const now = Date.now();
        const from = new Date(a.activeFrom).getTime();
        const to = a.activeTo ? new Date(a.activeTo).getTime() : Infinity;
        return now >= from && now <= to && !a.dismissed;
      }),
    [announcements]
  );
  const unreadCount = activeAnnouncements.filter((a) => !a.dismissed).length;

  return (
    <div className="relative inline-block text-ink">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="relative p-1.5 rounded-md text-ink transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Notifications and support"
            aria-haspopup="true"
            aria-expanded={false}
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unreadCount > 0 ? (
              <Badge className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-destructive px-1.5 text-xs font-bold text-white -rotate-90">
                {unreadCount}
              </Badge>
            ) : null}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {isLoading ? (
            <div className="px-2 py-4 text-sm text-muted">Loading…</div>
          ) : activeAnnouncements.length === 0 ? (
            <div className="px-2 py-4 text-sm text-muted">No announcements.</div>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              {activeAnnouncements.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col gap-1 px-2 py-2 cursor-pointer rounded-md hover:bg-accent transition-colors"
                  onClick={() => {
                    if (a.destination) {
                      window.location.href = a.destination;
                    }
                  }}
                >
                  <div className="text-sm font-medium text-ink">{a.title}</div>
                  <div className="text-xs text-muted">{a.summary}</div>
                  <div className="text-xs text-muted">
                    {new Date(a.activeFrom).toLocaleDateString()}
                  </div>
                </div>
              ))}
              <div className="border-t border-line px-2 py-2">
                <a
                  href="/contact"
                  className="block text-sm text-primary hover:underline"
                >
                  Contact support
                </a>
              </div>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface ProfileMenuProps {
  user: { displayName: string; role: string; email: string };
}

export function ProfileMenu({ user }: ProfileMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="User profile menu"
          aria-haspopup="true"
          aria-expanded={false}
        >
          <User className="h-4 w-4" aria-hidden="true" />
          <span>{user.displayName}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-sm font-medium text-ink">
          {user.displayName}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User className="mr-2 h-4 w-4 text-muted" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4 text-muted" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <button
            onClick={() => {
              // Sign out handled by auth hook (not yet implemented)
              window.location.href = "/sign-in";
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
          >
            <LogOut className="mr-2 h-4 w-4 text-destructive" /> Sign out
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface CartButtonProps {
  itemCount?: number;
}

export function CartButton({ itemCount = 0 }: CartButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={`Shopping cart (${itemCount} items)`}
      className="relative"
    >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M3 3h1l.5 2h11.5l.5 2H17l.5 2H3z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 7v1a1 1 0 01-1 1H4a1 1 0 01-1-1V7zM16 7v1a1 1 0 01-1 1h-3a1 1 0 01-1-1V7z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {itemCount > 0 && (
          <Badge className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-primary px-1.5 text-xs font-bold text-primary-foreground">
            {itemCount}
          </Badge>
        )}
    </Button>
  );
}
