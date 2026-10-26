"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme as useNextThemes } from "next-themes";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { NotificationPanel } from "@/components/layout/notification-panel";
import { ProfileMenu } from "@/components/layout/notification-panel";
import { CartButton } from "@/components/layout/notification-panel";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "NCLEX-RN", href: "/nclex-rn" },
  { label: "NCLEX-PN", href: "/nclex-pn" },
  { label: "Courses", href: "/courses" },
  { label: "Features", href: "/features" },
  { label: "Testimonials", href: "/testimonials" },
];

export function PublicHeader({ user }: { user?: { displayName: string; role: string; email: string } }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { mounted } = useNextThemes();

  if (!mounted) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3 lg:px-8 lg:py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-serif font-semibold text-ink"
          aria-label="PREform NCLEX home"
        >
          <span className="rounded bg-green p-1 text-white font-serif font-bold text-lg">P</span>
          <span className="hidden sm:inline">PREform</span>
          <span className="text-xs font-semibold tracking-wider text-muted">NCLEX</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-ink hover:text-green transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <div className="relative">
            <ThemeSwitcher />
          </div>
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <CartButton itemCount={0} />
          <NotificationPanel />
          {user ? (
            <ProfileMenu user={user} />
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link href="/sign-up">Create account</Link>
              </Button>
            </div>
          )}
        </div>

        <button
          className="lg:hidden p-1.5 rounded-md text-ink transition-colors hover:bg-accent"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Open mobile menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-line bg-white p-4 space-y-3">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-2 py-2 rounded-md text-sm font-medium text-ink hover:bg-accent"
            >
              {item.label}
            </Link>
          ))}
          <ThemeSwitcher />
          <div className="flex items-center gap-2 pt-3 border-t border-line">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button variant="default" size="sm" asChild>
              <Link href="/sign-up">Create account</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
