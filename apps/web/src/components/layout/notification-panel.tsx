"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ShoppingCart, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import type { Announcement } from "@/types";

interface AnnouncementsData {
  announcements: Announcement[] | null;
  isLoading: boolean;
}

interface NotificationPanelProps {
  announcementsData: AnnouncementsData;
}

export function NotificationPanel({ announcementsData }: NotificationPanelProps) {
  const router = useRouter();
  const { announcements, isLoading } = announcementsData;
  const visibleAnnouncements = React.useMemo(
    () => announcements ?? [],
    [announcements]
  );
  const unreadCount = visibleAnnouncements.filter((a) => !a.dismissed).length;

  return (
    <div className="relative inline-block text-foreground">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="relative p-2 rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Notifications and support"
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
          <DropdownMenuLabel className="font-semibold text-foreground px-2 py-1.5">
            Notifications
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isLoading ? (
            <div className="px-3 py-6 text-sm text-center text-muted-foreground">Loading announcements…</div>
          ) : visibleAnnouncements.length === 0 ? (
            <div className="px-3 py-6 text-sm text-center text-muted-foreground">
              <p className="font-medium text-foreground">No new announcements</p>
              <p className="text-xs text-muted-foreground mt-1">Platform updates and alerts will appear here.</p>
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {visibleAnnouncements.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col gap-1 px-3 py-2 cursor-pointer rounded-md hover:bg-accent transition-colors"
                  onClick={() => {
                    if (a.destination) {
                      router.push(a.destination);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && a.destination) {
                      router.push(a.destination);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="text-sm font-medium text-foreground">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.summary}</div>
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
  user: { displayName: string; role: string; email: string };
}

export function ProfileMenu({ user }: ProfileMenuProps) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="User profile menu"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-white text-xs font-bold">
            {user.displayName.charAt(0).toUpperCase()}
          </span>
          <span className="hidden sm:inline font-medium">{user.displayName}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover border border-border shadow-lg p-1">
        <DropdownMenuLabel className="px-2 py-1.5">
          <p className="text-sm font-semibold text-foreground">{user.displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/courses" className="cursor-pointer">My Courses</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/subscriptions" className="cursor-pointer">My Subscriptions</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            router.push("/sign-in");
          }}
          className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface CartButtonProps {
  itemCount?: number;
}

export function CartButton({ itemCount = 0 }: CartButtonProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="relative p-2 rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`Shopping cart (${itemCount} items)`}
        >
          <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          {itemCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-white">
              {itemCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md bg-card border-l border-border p-6 flex flex-col justify-between">
        <div>
          <SheetHeader className="px-0 pt-0 text-left">
            <SheetTitle className="text-2xl font-serif text-foreground">Your Cart</SheetTitle>
            <SheetDescription className="text-muted-foreground">
              PREform NCLEX preparation plans and study subscriptions.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-8 flex flex-col items-center justify-center text-center py-12 px-4 rounded-xl border border-dashed border-border bg-muted/50">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background border border-border text-muted-foreground mb-4">
              <ShoppingCart className="h-8 w-8 text-secondary" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Your cart is empty</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              Explore our NCLEX-RN and NCLEX-PN pathways to choose a preparation plan tailored to your exam.
            </p>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-border space-y-3">
          <SheetClose asChild>
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium" asChild>
              <Link href="/subscriptions">
                Browse Preparation Plans
              </Link>
            </Button>
          </SheetClose>
          <SheetClose asChild>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/courses">
                View All Courses
              </Link>
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
