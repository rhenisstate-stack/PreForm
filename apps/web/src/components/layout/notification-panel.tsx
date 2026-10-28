"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ShoppingCart, ArrowRight, User, BookOpen, CreditCard, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/lib/notifications-context";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import type { Announcement } from "@/types";

interface AnnouncementsData {
  announcements?: Announcement[] | null;
  isLoading?: boolean;
}

interface NotificationPanelProps {
  announcementsData?: AnnouncementsData;
}

export function NotificationPanel({ announcementsData }: NotificationPanelProps) {
  const router = useRouter();
  const notifContext = useNotifications();

  // If notifications context is available, use it; otherwise fallback to announcementsData
  const notifications = notifContext?.notifications ?? [];
  const unreadCount = notifContext?.unreadCount ?? (announcementsData?.announcements?.filter((a) => !a.dismissed).length ?? 0);
  const markAsRead = notifContext?.markAsRead ?? (() => {});
  const markAllAsRead = notifContext?.markAllAsRead ?? (() => {});

  return (
    <div className="relative inline-block text-foreground">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="relative p-2 rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`Notifications and support${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unreadCount > 0 ? (
              <Badge className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </Badge>
            ) : null}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 bg-popover border border-border shadow-lg p-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <DropdownMenuLabel className="font-semibold text-foreground p-0">
              Notifications
            </DropdownMenuLabel>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="text-xs text-secondary hover:underline focus-visible:outline-none"
              >
                Mark all as read
              </button>
            )}
          </div>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? (
            <div className="px-3 py-6 text-sm text-center text-muted-foreground">
              <p className="font-medium text-foreground">No new notifications</p>
              <p className="text-xs text-muted-foreground mt-1">Platform updates and alerts will appear here.</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-1">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex flex-col gap-1 px-3 py-2 cursor-pointer rounded-md transition-colors ${
                    n.read ? "hover:bg-muted opacity-80" : "bg-secondary/10 hover:bg-secondary/15 border-l-2 border-secondary font-medium"
                  }`}
                  onClick={() => {
                    markAsRead(n.id);
                    if (n.destination) {
                      router.push(n.destination);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && n.destination) {
                      markAsRead(n.id);
                      router.push(n.destination);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-sm font-semibold text-foreground leading-snug">{n.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{n.timestamp}</span>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{n.summary}</div>
                </div>
              ))}
            </div>
          )}
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5">
            <Link
              href="/contact"
              className="flex items-center justify-between text-xs font-medium text-secondary hover:underline"
            >
              <span>Need help? Contact support</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface ProfileMenuProps {
  user: { displayName?: string; role?: string; email?: string; name?: string; picture?: string };
}

export function ProfileMenu({ user }: ProfileMenuProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const displayName = user.displayName || user.name || "Candidate";
  const initial = displayName.charAt(0).toUpperCase();
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [user.picture]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="User profile menu"
        >
          {user.picture && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.picture}
              alt={`${displayName} profile avatar`}
              onError={() => setImgError(true)}
              className="h-7 w-7 rounded-full object-cover ring-2 ring-secondary/30"
            />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-bold">
              {initial}
            </span>
          )}
          <span className="hidden sm:inline font-medium">{displayName}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover border border-border shadow-lg p-1">
        <DropdownMenuLabel className="px-2 py-1.5">
          <p className="text-sm font-semibold text-foreground">{displayName}</p>
          {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            <span>My Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/courses" className="flex items-center gap-2 cursor-pointer">
            <BookOpen className="h-4 w-4" />
            <span>My Courses</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/subscriptions" className="flex items-center gap-2 cursor-pointer">
            <CreditCard className="h-4 w-4" />
            <span>My Subscriptions</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/cart" className="flex items-center gap-2 cursor-pointer">
            <ShoppingCart className="h-4 w-4" />
            <span>Shopping Cart</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-2 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface CartButtonProps {
  itemCount?: number;
}

export function CartButton({ itemCount }: CartButtonProps) {
  const cart = useCart();
  const effectiveCount = itemCount !== undefined ? itemCount : (cart?.itemCount ?? 0);

  return (
    <Link
      href="/cart"
      className="relative p-2 rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`Shopping cart (${effectiveCount} items)`}
    >
      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
      {effectiveCount > 0 && (
        <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-secondary-foreground">
          {effectiveCount}
        </span>
      )}
    </Link>
  );
}
