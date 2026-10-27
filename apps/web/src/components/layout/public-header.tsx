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
} from "@/components/ui/navigation-menu";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { NotificationPanel, ProfileMenu, CartButton } from "@/components/layout/notification-panel";

interface PublicHeaderProps {
  user?: { displayName: string; role: string; email: string };
}

type NavLink = { label: string; href: string };

type DesktopNavItem = {
  id: string;
  label: string;
  href?: string;
  items: NavLink[];
};

const desktopNav: DesktopNavItem[] = [
  {
    id: "nclex-rn",
    label: "NCLEX-RN",
    href: "/nclex-rn",
    items: [
      { label: "RN Overview", href: "/nclex-rn" },
      { label: "RN Courses", href: "/courses?programme=RN" },
      { label: "RN Preparation Plans", href: "/subscriptions?programme=RN" },
      { label: "Try RN Questions", href: "/courses?programme=RN&type=practice" },
    ],
  },
  {
    id: "nclex-pn",
    label: "NCLEX-PN",
    href: "/nclex-pn",
    items: [
      { label: "PN Overview", href: "/nclex-pn" },
      { label: "PN Courses", href: "/courses?programme=PN" },
      { label: "PN Preparation Plans", href: "/subscriptions?programme=PN" },
      { label: "Try PN Questions", href: "/courses?programme=PN&type=practice" },
    ],
  },
  {
    id: "courses",
    label: "Courses",
    href: "/courses",
    items: [
      { label: "All Courses", href: "/courses" },
      { label: "Compare Subscription Plans", href: "/subscriptions" },
      { label: "Free Sample Questions", href: "/courses?type=practice" },
    ],
  },
  {
    id: "more",
    label: "More",
    items: [
      { label: "Our Features", href: "/features" },
      { label: "For Educators", href: "/educators" },
      { label: "Testimonials", href: "/testimonials" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
];

const mobileNavLinks: NavLink[] = [
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
        <Link
          href="/"
          className="flex items-center gap-2.5 text-xl font-serif font-semibold text-foreground transition-opacity hover:opacity-90"
          aria-label="PREform NCLEX home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground font-serif font-bold text-lg">
            P
          </span>
          <span className="flex items-baseline gap-1 font-serif">
            <span className="tracking-tight text-foreground">PREform</span>
            <span className="text-xs font-sans font-bold tracking-wider text-secondary uppercase">
              NCLEX
            </span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1" aria-label="Main Navigation">
          <NavigationMenu>
            <NavigationMenuList>
              {desktopNav.map((item) => (
                <NavigationMenuItem key={item.id} className="relative">
                  {item.href ? (
                    <div className="flex items-center">
                      <NavigationMenuLink asChild>
                        <Link
                          href={item.href}
                          className="px-3 py-2 text-sm font-medium text-foreground hover:text-secondary hover:bg-transparent focus:bg-transparent"
                        >
                          {item.label}
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuTrigger
                        aria-label={`Open ${item.label} menu`}
                        className="px-1 py-2"
                      >
                        <ChevronDown className="h-3.5 w-3.5 opacity-70 transition-transform group-data-[state=open]:rotate-180" />
                      </NavigationMenuTrigger>
                    </div>
                  ) : (
                    <NavigationMenuTrigger className="gap-1 px-3 py-2">
                      <span>{item.label}</span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-70 transition-transform group-data-[state=open]:rotate-180" />
                    </NavigationMenuTrigger>
                  )}
                  <NavigationMenuContent>
                    {item.items.map((subItem) => (
                      <NavigationMenuLink key={`${item.id}-${subItem.href}`} asChild>
                        <Link href={subItem.href}>{subItem.label}</Link>
                      </NavigationMenuLink>
                    ))}
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeSwitcher />
          <CartButton itemCount={0} />
          <NotificationPanel announcementsData={{ announcements: null, isLoading: false }} />

          <div className="hidden lg:block h-5 w-px bg-border mx-1" aria-hidden="true" />

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
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Create account
              </Link>
            </div>
          )}

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

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-card px-4 py-5">
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
                  className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
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
