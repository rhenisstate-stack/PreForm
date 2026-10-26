"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  NavigationMenuIndicator,
} from "@/components/ui/navigation-menu";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { NotificationPanel } from "@/components/layout/notification-panel";
import { ProfileMenu } from "@/components/layout/notification-panel";
import { CartButton } from "@/components/layout/notification-panel";
import { useTheme } from "@/hooks/use-theme";

const navItems = [
  { label: "NCLEX-RN", href: "/nclex-rn" },
  { label: "NCLEX-PN", href: "/nclex-pn" },
  { label: "Courses", href: "/courses" },
  { label: "Features", href: "/features" },
  { label: "Testimonials", href: "/testimonials" },
];

export default function PublicHeader({ user }: { user?: { displayName: string; role: string; email: string } }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { mounted } = useTheme() as { mounted?: boolean };

  if (!mounted) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3 lg:px-8 lg:py-4">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-serif font-semibold text-ink"
          aria-label="PREform NCLEX home"
        >
          <span className="rounded bg-green p-1 text-white font-serif font-bold text-lg">P</span>
          <span className="hidden sm:inline">PREform</span>
          <span className="text-xs font-semibold tracking-wider text-muted">NCLEX</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          <NavigationMenu>
            <NavigationMenuList className="flex items-center gap-1 px-1">
              <NavigationMenuItem className="relative group">
                <NavigationMenuTrigger className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-ink transition-colors hover:text-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  NCLEX-RN
                  <ChevronDownIcon className="ml-1 h-3 w-3 opacity-50 group-data-[state=open]:opacity-100" />
                </NavigationMenuTrigger>
                <NavigationMenuContent className="w-56 align-start">
                  <NavigationMenuLink asChild className="text-sm">
                    <Link href="/nclex-rn">RN Overview</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="text-sm">
                    <Link href="/courses?programme=RN">RN Courses</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="text-sm">
                    <Link href="/subscriptions?programme=RN">RN Preparation Plans</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="text-sm">
                    <Link href="/courses?programme=RN&type=practice">Try RN Questions</Link>
                  </NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem className="relative group">
                <NavigationMenuTrigger className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-ink transition-colors hover:text-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  NCLEX-PN
                  <ChevronDownIcon className="ml-1 h-3 w-3 opacity-50 group-data-[state=open]:opacity-100" />
                </NavigationMenuTrigger>
                <NavigationMenuContent className="w-56 align-start">
                  <NavigationMenuLink asChild className="text-sm">
                    <Link href="/nclex-pn">PN Overview</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="text-sm">
                    <Link href="/courses?programme=PN">PN Courses</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="text-sm">
                    <Link href="/subscriptions?programme=PN">PN Preparation Plans</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="text-sm">
                    <Link href="/courses?programme=PN&type=practice">Try PN Questions</Link>
                  </NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem className="relative group">
                <NavigationMenuTrigger className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-ink transition-colors hover:text-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  Courses
                  <ChevronDownIcon className="ml-1 h-3 w-3 opacity-50 group-data-[state=open]:opacity-100" />
                </NavigationMenuTrigger>
                <NavigationMenuContent className="w-56 align-start">
                  <NavigationMenuLink asChild className="text-sm">
                    <Link href="/courses">All Courses</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="text-sm">
                    <Link href="/courses?programme=RN">NCLEX-RN Courses</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="text-sm">
                    <Link href="/courses?programme=PN">NCLEX-PN Courses</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="text-sm">
                    <Link href="/subscriptions">Compare Subscription Plans</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="text-sm">
                    <Link href="/courses?type=practice">Free Sample Questions</Link>
                  </NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem className="relative group">
                <NavigationMenuTrigger className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-ink transition-colors hover:text-green focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  More
                  <ChevronDownIcon className="ml-1 h-3 w-3 opacity-50 group-data-[state=open]:opacity-100" />
                </NavigationMenuTrigger>
                <NavigationMenuContent className="w-52 align-start">
                  <NavigationMenuLink asChild className="text-sm">
                    <Link href="/features">Our Features</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="text-sm">
                    <Link href="/educators">For Educators</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="text-sm">
                    <Link href="/testimonials">Testimonials</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="text-sm">
                    <Link href="/contact">Contact Us</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="text-sm">
                    <Link href="/faq">FAQ</Link>
                  </NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
            <NavigationMenuIndicator className="flex h-[3px] w-full rounded-full bg-green" />
          </NavigationMenu>
          <div className="flex items-center gap-2 px-3 py-2">
            <ThemeSwitcher />
          </div>
        </nav>

        {/* Desktop utility controls + CTAs */}
        <div className="hidden lg:flex items-center gap-3">
          <CartButton itemCount={0} />
          <NotificationPanel announcementsData={{ announcements: null, isLoading: false }} />
          {user ? (
            <ProfileMenu user={user} />
          ) : (
            <div className="flex items-center gap-2">
              <a href="/sign-in" className="px-3 py-1.5 text-sm font-medium text-ink hover:text-green transition-colors">
                Sign in
              </a>
              <a href="/sign-up" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
                Create account
              </a>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/sign-up">Try Now</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/subscriptions">Buy Now</Link>
            </Button>
          </div>
        </div>

        {/* Mobile menu trigger */}
        <button
          className="lg:hidden p-1.5 rounded-md text-ink transition-colors hover:bg-accent"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Open mobile menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile navigation drawer */}
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
            <a href="/sign-in" className="px-3 py-1.5 text-sm font-medium text-ink hover:text-green transition-colors">
              Sign in
            </a>
            <a href="/sign-up" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
              Create account
            </a>
          </div>
          <div className="flex items-center gap-2 pt-3">
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href="/sign-up">Try Now</Link>
            </Button>
            <Button size="sm" asChild className="w-full">
              <Link href="/subscriptions">Buy Now</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
