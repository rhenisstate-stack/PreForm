"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
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
import { NotificationPanel, ProfileMenu, CartButton } from "@/components/layout/notification-panel";

interface PublicHeaderProps {
  user?: { displayName: string; role: string; email: string };
}

const mobileNavLinks = [
  { label: "NCLEX-RN Pathway", href: "/nclex-rn" },
  { label: "NCLEX-PN Pathway", href: "/nclex-pn" },
  { label: "Courses", href: "/courses" },
  { label: "Features", href: "/features" },
  { label: "Educators", href: "/educators" },
  { label: "Testimonials", href: "/testimonials" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact Us", href: "/contact" },
];

export default function PublicHeader({ user }: PublicHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-xl font-serif font-semibold text-foreground transition-opacity hover:opacity-90"
          aria-label="PREform NCLEX home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-white font-serif font-bold text-lg shadow-sm">
            P
          </span>
          <span className="flex items-baseline gap-1 font-serif">
            <span className="tracking-tight text-foreground">PREform</span>
            <span className="text-xs font-sans font-bold tracking-wider text-secondary uppercase">
              NCLEX
            </span>
          </span>
        </Link>

        {/* Desktop Navigation Menus (Rendered once, visible on lg+) */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main Navigation">
          <NavigationMenu>
            <NavigationMenuList className="flex items-center gap-1">
              {/* NCLEX-RN Dropdown */}
              <NavigationMenuItem className="relative">
                <NavigationMenuTrigger className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:text-secondary focus-visible:ring-2 focus-visible:ring-ring">
                  <span>NCLEX-RN</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
                </NavigationMenuTrigger>
                <NavigationMenuContent className="w-56 p-1.5 bg-popover border border-border shadow-lg">
                  <NavigationMenuLink asChild className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <Link href="/nclex-rn">RN Overview</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <Link href="/courses?programme=RN">RN Courses</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <Link href="/subscriptions?programme=RN">RN Preparation Plans</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <Link href="/courses?programme=RN&type=practice">Try RN Questions</Link>
                  </NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* NCLEX-PN Dropdown */}
              <NavigationMenuItem className="relative">
                <NavigationMenuTrigger className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:text-secondary focus-visible:ring-2 focus-visible:ring-ring">
                  <span>NCLEX-PN</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
                </NavigationMenuTrigger>
                <NavigationMenuContent className="w-56 p-1.5 bg-popover border border-border shadow-lg">
                  <NavigationMenuLink asChild className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <Link href="/nclex-pn">PN Overview</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <Link href="/courses?programme=PN">PN Courses</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <Link href="/subscriptions?programme=PN">PN Preparation Plans</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <Link href="/courses?programme=PN&type=practice">Try PN Questions</Link>
                  </NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Courses Dropdown */}
              <NavigationMenuItem className="relative">
                <NavigationMenuTrigger className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:text-secondary focus-visible:ring-2 focus-visible:ring-ring">
                  <span>Courses</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
                </NavigationMenuTrigger>
                <NavigationMenuContent className="w-60 p-1.5 bg-popover border border-border shadow-lg">
                  <NavigationMenuLink asChild className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <Link href="/courses">All Courses</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <Link href="/subscriptions">Compare Subscription Plans</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <Link href="/courses?type=practice">Free Sample Questions</Link>
                  </NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* More Dropdown */}
              <NavigationMenuItem className="relative">
                <NavigationMenuTrigger className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:text-secondary focus-visible:ring-2 focus-visible:ring-ring">
                  <span>More</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
                </NavigationMenuTrigger>
                <NavigationMenuContent className="w-52 p-1.5 bg-popover border border-border shadow-lg">
                  <NavigationMenuLink asChild className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <Link href="/features">Our Features</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <Link href="/educators">For Educators</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <Link href="/testimonials">Testimonials</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <Link href="/faq">FAQ</Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                    <Link href="/contact">Contact Us</Link>
                  </NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
            <NavigationMenuIndicator className="flex h-[2px] w-full rounded-full bg-secondary" />
          </NavigationMenu>
        </nav>

        {/* Universal Utility Actions Area (Rendered once, shared responsive flow) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme Switcher - Single instance */}
          <ThemeSwitcher />

          {/* Shopping Cart - Single instance */}
          <CartButton itemCount={0} />

          {/* Notifications - Visible across all screens */}
          <NotificationPanel announcementsData={{ announcements: null, isLoading: false }} />

          <div className="hidden lg:block h-5 w-px bg-border mx-1" aria-hidden="true" />

          {/* Desktop Authentication CTAs */}
          {user ? (
            <div className="hidden lg:block">
              <ProfileMenu user={user} />
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-2">
              <Link
                href="/sign-in"
                className="px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-sm"
              >
                Create account
              </Link>
            </div>
          )}

          {/* Mobile Menu Hamburger Toggle */}
          <button
            className="p-2 rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-card px-4 py-5 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            {mobileNavLinks.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-secondary/10 text-secondary font-semibold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-5 pt-5 border-t border-border">
            {user ? (
              <div className="space-y-3">
                <div className="px-3 py-1 text-sm font-medium text-muted-foreground">
                  Signed in as <span className="font-semibold text-foreground">{user.displayName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/courses"
                    onClick={closeMobileMenu}
                    className="block text-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    My Courses
                  </Link>
                  <Link
                    href="/subscriptions"
                    onClick={closeMobileMenu}
                    className="block text-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    My Subscriptions
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/sign-in"
                  onClick={closeMobileMenu}
                  className="flex w-full items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  onClick={closeMobileMenu}
                  className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Create account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
