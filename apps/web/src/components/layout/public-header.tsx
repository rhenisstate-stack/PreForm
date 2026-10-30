"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  ChevronDown,
  UserRound,
  ShoppingCart,
  BookOpen,
  CreditCard,
  LogOut,
  Newspaper,
  GraduationCap,
  Mail,
  Layers,
  HelpCircle,
  Stethoscope,
  Library,
  HeartPulse,
  Brain,
  ShieldCheck,
  FileCheck,
  ClipboardCheck,
  ChartNoAxesCombined,
  Info,
  LogIn,
  UserRoundPlus,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
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
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { BRAND } from "@/lib/brand";

interface PublicHeaderProps {
  user?: { displayName: string; role: string; email: string };
}

type NavLink = {
  label: string;
  href: string;
  description?: string;
  badge?: string;
  icon?: LucideIcon;
};

type DesktopNavItem = {
  id: string;
  label: string;
  href?: string;
  icon?: LucideIcon;
  activePrefixes: string[];
  items?: NavLink[];
};

const desktopNav: DesktopNavItem[] = [
  {
    id: "nursing",
    label: "Nursing",
    icon: GraduationCap,
    activePrefixes: ["/nclex-rn", "/nclex-pn"],
    items: [
      {
        label: "NCLEX-RN",
        href: "/nclex-rn",
        badge: "RN Pathway",
        description: "Registered Nurse exam preparation, NGN case studies, and adaptive practice.",
        icon: GraduationCap,
      },
      {
        label: "NCLEX-PN",
        href: "/nclex-pn",
        badge: "PN Pathway",
        description: "Practical & Vocational Nurse exam preparation, rationales, and study tools.",
        icon: Stethoscope,
      },
      {
        label: "All Nursing Courses",
        href: "/courses",
        description: "Browse RN and PN question banks, readiness assessments, and study modules.",
        icon: BookOpen,
      },
    ],
  },
  {
    id: "study-guide",
    label: "Study Guide",
    href: "/study-guide",
    icon: Library,
    activePrefixes: ["/study-guide"],
    items: [
      { label: "All Study Guides", href: "/study-guide", icon: Library },
      { label: "Medical-Surgical Nursing", href: "/study-guide/medical-surgical", icon: HeartPulse },
      { label: "Pharmacology & Medication Safety", href: "/study-guide/pharmacology", icon: FileCheck },
      { label: "Maternal & Newborn Nursing", href: "/study-guide/maternal-newborn", icon: HeartPulse },
      { label: "Pediatric Nursing", href: "/study-guide/pediatrics", icon: UserRound },
      { label: "Mental Health Nursing", href: "/study-guide/mental-health", icon: Brain },
      { label: "Fundamentals of Nursing", href: "/study-guide/fundamentals", icon: BookOpen },
      { label: "Leadership & Delegation", href: "/study-guide/leadership-delegation", icon: ShieldCheck },
    ],
  },
  {
    id: "products",
    label: "Products & Pricing",
    href: "/subscriptions",
    icon: CreditCard,
    activePrefixes: ["/subscriptions", "/courses"],
    items: [
      { label: "Compare Subscription Plans", href: "/subscriptions", icon: CreditCard },
      { label: "All Courses & Question Banks", href: "/courses", icon: BookOpen },
      { label: "Free Sample Questions", href: "/courses?type=practice", icon: ClipboardCheck },
      { label: "Platform Features", href: "/features", icon: ChartNoAxesCombined },
    ],
  },
  {
    id: "more",
    label: "More",
    icon: Layers,
    activePrefixes: ["/testimonials", "/blog", "/about", "/contact", "/faq"],
    items: [
      {
        label: "Testimonials",
        href: "/testimonials",
        description: "Student experiences, feedback, and success stories.",
        icon: MessageCircle,
      },
      {
        label: "Blog",
        href: "/blog",
        description: "NCLEX preparation articles, study strategies, and educational resources.",
        icon: Newspaper,
      },
      {
        label: "Study Guides",
        href: "/study-guide",
        description: "Explore 7 core nursing domains, clinical cheat sheets, and high-yield notes.",
        icon: BookOpen,
      },
      {
        label: "Help & FAQ",
        href: "/faq",
        description: "Clear answers to exam prep, subscription, and platform questions.",
        icon: HelpCircle,
      },
      {
        label: "About PrepFord",
        href: "/about",
        description: "Our nurse educator team, clinical pedagogy, and platform mission.",
        icon: Info,
      },
      {
        label: "Contact",
        href: "/contact",
        description: "Get in touch with our team for questions, guidance, or support.",
        icon: Mail,
      },
    ],
  },
];

const mobileNursingLinks: NavLink[] = [
  {
    label: "NCLEX-RN",
    href: "/nclex-rn",
    description: "Registered Nurse Exam Preparation",
    icon: GraduationCap,
  },
  {
    label: "NCLEX-PN",
    href: "/nclex-pn",
    description: "Practical / Vocational Nurse Preparation",
    icon: Stethoscope,
  },
];

const mobileNavLinks: NavLink[] = [
  { label: "Study Guide & Notes", href: "/study-guide", icon: Library },
  { label: "Products & Pricing", href: "/subscriptions", icon: CreditCard },
  { label: "All Courses", href: "/courses", icon: BookOpen },
  { label: "Testimonials", href: "/testimonials", icon: MessageCircle },
  { label: "Blog", href: "/blog", icon: Newspaper },
  { label: "Platform Features", href: "/features", icon: ChartNoAxesCombined },
  { label: "About PrepFord", href: "/about", icon: Info },
  { label: "FAQ", href: "/faq", icon: HelpCircle },
  { label: "Contact Us", href: "/contact", icon: Mail },
];

export default function PublicHeader({ user: propUser }: PublicHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [openMenu, setOpenMenu] = React.useState<string>("");
  const navRef = React.useRef<HTMLElement>(null);

  const authContext = useAuth();
  const cartContext = useCart();

  const authUser = authContext?.user;
  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const logout = authContext?.logout ?? (async () => {});
  const cartItemCount = cartContext?.itemCount ?? 0;

  const currentUser = propUser || (isAuthenticated ? authUser : null);
  const isAuthed = Boolean(propUser || isAuthenticated);

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const closeDesktopMenu = () => setOpenMenu("");

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu("");
        setMobileMenuOpen(false);
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenMenu("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const isItemActive = (prefixes: string[]) => {
    if (!pathname) return false;
    return prefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
  };

  const handleMobileLogout = async () => {
    closeMobileMenu();
    await logout();
    router.push("/");
    router.refresh();
  };

  // The learner dashboard workspace uses its own dedicated application shell
  if (pathname?.startsWith("/dashboard")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 text-xl font-serif font-semibold text-foreground transition-opacity hover:opacity-90"
          aria-label={`${BRAND.fullName} home`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND.logo.assetPath}
            alt={BRAND.logo.alt}
            data-testid="brand-logo-mark"
            className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl object-contain shrink-0"
            width={48}
            height={48}
          />
          <span
            data-testid="brand-wordmark-stacked"
            className="flex flex-col font-serif tracking-tight font-bold leading-none text-left -space-y-0.5 sm:-space-y-1 justify-center"
          >
            <span className="text-base sm:text-lg leading-none text-secondary">Prep</span>
            <span className="text-base sm:text-lg leading-none text-foreground">Ford</span>
          </span>
        </Link>

        <nav
          ref={navRef}
          className="hidden lg:flex items-center gap-1"
          aria-label="Main Navigation"
        >
          <NavigationMenu value={openMenu} onValueChange={setOpenMenu}>
            <NavigationMenuList>
              {desktopNav.map((item) => {
                const active = isItemActive(item.activePrefixes);
                const ItemIcon = item.icon;

                if (!item.items || item.items.length === 0) {
                  return (
                    <NavigationMenuItem key={item.id} value={item.id} className="relative">
                      <NavigationMenuLink asChild>
                        <Link
                          href={item.href ?? "/"}
                          onClick={closeDesktopMenu}
                          data-active={active ? "true" : undefined}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors hover:text-secondary hover:bg-muted/60 focus:bg-muted/60 ${
                            active ? "text-secondary font-semibold bg-secondary/10" : "text-foreground"
                          }`}
                        >
                          {ItemIcon && <ItemIcon className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />}
                          <span>{item.label}</span>
                        </Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  );
                }

                return (
                  <NavigationMenuItem key={item.id} value={item.id} className="relative">
                    {item.href ? (
                      <div className="flex items-center">
                        <NavigationMenuLink asChild>
                          <Link
                            href={item.href}
                            onClick={closeDesktopMenu}
                            data-active={active ? "true" : undefined}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-l-lg text-sm font-medium transition-colors hover:text-secondary hover:bg-transparent focus:bg-transparent ${
                              active ? "text-secondary font-semibold" : "text-foreground"
                            }`}
                          >
                            {ItemIcon && <ItemIcon className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />}
                            <span>{item.label}</span>
                          </Link>
                        </NavigationMenuLink>
                        <NavigationMenuTrigger
                          aria-label={`Open ${item.label} menu`}
                          data-active={active ? "true" : undefined}
                          className={`px-1.5 py-2 ${active ? "text-secondary font-semibold" : ""}`}
                        >
                          <ChevronDown className="h-3.5 w-3.5 opacity-70 transition-transform group-data-[state=open]:rotate-180" />
                        </NavigationMenuTrigger>
                      </div>
                    ) : (
                      <NavigationMenuTrigger
                        data-testid={`nav-dropdown-${item.id}`}
                        data-active={active ? "true" : undefined}
                        className={`gap-1.5 px-3.5 py-2 rounded-lg ${
                          active ? "text-secondary font-semibold bg-secondary/10" : ""
                        }`}
                      >
                        {ItemIcon && <ItemIcon className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />}
                        <span>{item.label}</span>
                        <ChevronDown className="h-3.5 w-3.5 opacity-70 transition-transform group-data-[state=open]:rotate-180" />
                      </NavigationMenuTrigger>
                    )}
                    <NavigationMenuContent
                      className={
                        item.id === "nursing"
                          ? "w-80 min-w-[20rem] p-2.5"
                          : item.id === "more"
                          ? "w-80 min-w-[20rem] p-2.5 right-0 left-auto"
                          : "w-72 min-w-[18rem] p-2"
                      }
                    >
                      <div className="space-y-1">
                        {item.items.map((subItem) => {
                          const subActive = pathname === subItem.href;
                          const SubIcon = subItem.icon;
                          return (
                            <NavigationMenuLink key={`${item.id}-${subItem.href}`} asChild>
                              <Link
                                href={subItem.href}
                                onClick={closeDesktopMenu}
                                data-active={subActive ? "true" : undefined}
                                className={`block rounded-xl px-3.5 py-2.5 transition-colors ${
                                  subActive
                                    ? "bg-secondary/12 text-secondary font-semibold"
                                    : "text-popover-foreground hover:bg-muted/80 hover:text-foreground"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  {SubIcon && (
                                    <SubIcon className="h-4 w-4 shrink-0 text-secondary mt-0.5" aria-hidden="true" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-sm font-semibold">{subItem.label}</span>
                                      {subItem.badge && (
                                        <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary">
                                          {subItem.badge}
                                        </span>
                                      )}
                                    </div>
                                    {subItem.description && (
                                      <p className="mt-1 text-xs text-muted-foreground leading-snug font-normal">
                                        {subItem.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            </NavigationMenuLink>
                          );
                        })}
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeSwitcher />

          {/* Authenticated Icons: Shopping Cart, Notifications, Profile Avatar */}
          {isAuthed && currentUser ? (
            <>
              <CartButton />
              <NotificationPanel />

              <div className="hidden lg:block ml-1">
                <ProfileMenu user={currentUser} />
              </div>
            </>
          ) : (
            /* Unauthenticated Visitor Actions: Sign In & Create Account */
            <div className="hidden lg:flex items-center gap-2">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
              >
                <LogIn className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
                <span>Sign in</span>
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-sm"
              >
                <UserRoundPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Create account</span>
              </Link>
            </div>
          )}

          <button
            className="p-2 rounded-lg text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          data-testid="mobile-navigation-drawer"
          className="lg:hidden bg-card px-4 py-5 shadow-lg"
        >
          {/* Nursing Group in Mobile Menu */}
          <div className="mb-4">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-secondary mb-1.5">
              Nursing Exam Prep
            </p>
            <div className="space-y-1">
              {mobileNursingLinks.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`block px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      isActive
                        ? "bg-secondary/12 text-secondary font-semibold"
                        : "bg-muted/40 text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {Icon && <Icon className="h-4 w-4 text-secondary shrink-0 mt-0.5" aria-hidden="true" />}
                      <div className="flex-1 min-w-0">
                        <span className="block font-semibold">{item.label}</span>
                        {item.description && (
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            {mobileNavLinks.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-secondary/10 text-secondary font-semibold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {Icon && <Icon className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />}
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-5 pt-4">
            {isAuthed && currentUser ? (
              <div className="space-y-3">
                <div className="px-3 py-1 text-sm font-medium text-muted-foreground">
                  Signed in as{" "}
                  <span className="font-semibold text-foreground">
                    {currentUser.displayName || (currentUser as { name?: string }).name || "Candidate"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/profile"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-muted/60 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <UserRound className="h-4 w-4 text-secondary" aria-hidden="true" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    href="/cart"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-muted/60 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <ShoppingCart className="h-4 w-4 text-secondary" aria-hidden="true" />
                    <span>Cart {cartItemCount > 0 ? `(${cartItemCount})` : ""}</span>
                  </Link>
                  <Link
                    href="/courses"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-muted/60 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <BookOpen className="h-4 w-4 text-secondary" aria-hidden="true" />
                    <span>My Courses</span>
                  </Link>
                  <Link
                    href="/subscriptions"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-muted/60 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <CreditCard className="h-4 w-4 text-secondary" aria-hidden="true" />
                    <span>Subscriptions</span>
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={handleMobileLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/sign-in"
                  onClick={closeMobileMenu}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-muted/70 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <LogIn className="h-4 w-4 text-secondary" aria-hidden="true" />
                  <span>Sign in</span>
                </Link>
                <Link
                  href="/sign-up"
                  onClick={closeMobileMenu}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
                  <span>Create account</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
