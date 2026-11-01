"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BookOpen, LogOut, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { NavItem } from "@/lib/admin/navigation";
import { useAuth } from "@/lib/auth-context";

interface AdminCommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navItems: NavItem[];
}

/**
 * Global admin navigation palette (Cmd/Ctrl+K). Lists only navigation the
 * signed-in administrator is authorized to see, mirroring the sidebar.
 */
export function AdminCommandMenu({ open, onOpenChange, navItems }: AdminCommandMenuProps) {
  const router = useRouter();
  const { logout } = useAuth();

  const runItem = React.useCallback(
    (action: () => void) => {
      onOpenChange(false);
      action();
    },
    [onOpenChange]
  );

  const handleSignOut = React.useCallback(async () => {
    onOpenChange(false);
    await logout();
    router.push("/");
    router.refresh();
  }, [logout, onOpenChange, router]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      aria-label="Admin navigation search"
    >
      <CommandInput placeholder="Search admin pages…" />
      <CommandList>
        <CommandEmpty>No matching admin pages.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.id}
                value={`${item.title} ${item.description ?? ""}`}
                onSelect={() => runItem(() => router.push(item.href))}
              >
                <Icon aria-hidden="true" className="text-muted-foreground" />
                <span className="flex flex-col">
                  <span className="font-medium text-foreground">{item.title}</span>
                  {item.description ? (
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  ) : null}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Workspace">
          <CommandItem
            value="student workspace learner dashboard"
            onSelect={() => runItem(() => router.push("/dashboard"))}
          >
            <BookOpen aria-hidden="true" className="text-muted-foreground" />
            <span>Switch to Student Workspace</span>
          </CommandItem>
          <CommandItem
            value="log out sign out session"
            onSelect={() => void handleSignOut()}
          >
            <LogOut aria-hidden="true" className="text-muted-foreground" />
            <span>Sign out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/** Search trigger button shown in the admin header. */
export function AdminSearchTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label="Open admin navigation search"
    >
      <Search aria-hidden="true" className="h-3.5 w-3.5" />
      <span className="hidden sm:inline text-foreground/80">Search</span>
      <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground">
        ⌘K
      </kbd>
    </button>
  );
}
