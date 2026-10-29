"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronDown,
  Search,
  BookOpen,
  Compass,
  HelpCircle,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { getProductById } from "@/lib/products";
import { STUDY_GUIDE_CATEGORIES } from "@/lib/study-guide-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface OverallFaqItem {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
}

export interface OverallFaqCategory {
  id: string;
  label: string;
  description: string;
}

export const FAQ_CATEGORIES: OverallFaqCategory[] = [
  {
    id: "getting-started",
    label: "1. Getting Started & Creating an Account",
    description: "How PrepFord works, choosing your licensure track, and registering an account.",
  },
  {
    id: "auth-access",
    label: "2. Signing In, Google Auth & Account Access",
    description: "Email/password login, Google OAuth, post-login routing, and session security.",
  },
  {
    id: "rn-pn-prep",
    label: "3. NCLEX-RN & NCLEX-PN Preparation",
    description: "Differences between the RN and PN pathways, scope of practice, and NGN alignment.",
  },
  {
    id: "study-guides",
    label: "4. Study Guides, Subjects & Domains",
    description: "Navigating the 7 nursing domains, clinical subject guides, and reference tables.",
  },
  {
    id: "practice-assessments",
    label: "5. Practice Questions, Rationales & Assessments",
    description: "How clinical scenario questions, distractor rationales, and readiness packs work.",
  },
  {
    id: "progress-dashboard",
    label: "6. Study Progress, Dashboard & Saved Activity",
    description: "Using the Learner Dashboard (/dashboard), resuming recent study, and telemetry status.",
  },
  {
    id: "plans-pricing",
    label: "7. Study-Plan Selection, Durations & Pricing",
    description: "Comparing Starter, Complete Preparation, All-Access, and 30-day vs. 90-day durations.",
  },
  {
    id: "cart-checkout",
    label: "8. Cart, Checkout & Payment Status",
    description: "How cart selection, promo codes, and Phase 4 sandbox entitlement activation work.",
  },
  {
    id: "profile-privacy",
    label: "9. Account Profile, Privacy & Supported Features",
    description: "Managing your display name, pathway, profile photo, and exam date.",
  },
  {
    id: "troubleshooting-support",
    label: "10. Troubleshooting & Contacting Support",
    description: "Resolving sign-in or cart issues, exam disclaimers, and reaching the support team.",
  },
];

export function buildOverallFaqItems(): OverallFaqItem[] {
  const rnStarter30 = getProductById("rn-starter");
  const rnStarter90 = getProductById("rn-starter-90");
  const rnPro30 = getProductById("rn-pro");
  const rnPro90 = getProductById("rn-pro-90");
  const pnStarter30 = getProductById("pn-starter");
  const pnStarter90 = getProductById("pn-starter-90");
  const pnPro30 = getProductById("pn-pro");
  const pnPro90 = getProductById("pn-pro-90");
  const premium30 = getProductById("prep-premium");
  const premium90 = getProductById("prep-premium-90");
  const rnReadiness = getProductById("rn-readiness");
  const pnReadiness = getProductById("pn-readiness");

  const starter30Price = rnStarter30?.price ?? 29;
  const starter90Price = rnStarter90?.price ?? 75;
  const starter90Original = rnStarter90?.originalPrice ?? 87;
  const starterSavings = starter90Original - starter90Price;

  const pro30Price = rnPro30?.price ?? 59;
  const pro90Price = rnPro90?.price ?? 149;
  const pro90Original = rnPro90?.originalPrice ?? 177;
  const proSavings = pro90Original - pro90Price;

  const pnStarter30Price = pnStarter30?.price ?? 29;
  const pnStarter90Price = pnStarter90?.price ?? 75;
  const pnPro30Price = pnPro30?.price ?? 59;
  const pnPro90Price = pnPro90?.price ?? 149;

  const premium30Price = premium30?.price ?? 89;
  const premium90Price = premium90?.price ?? 229;
  const premium90Original = premium90?.originalPrice ?? 267;
  const premiumSavings = premium90Original - premium90Price;

  const readinessPrice = rnReadiness?.price ?? pnReadiness?.price ?? 39;

  const domainCount = STUDY_GUIDE_CATEGORIES.length;
  const totalSubjectCount = STUDY_GUIDE_CATEGORIES.reduce(
    (sum, cat) => sum + cat.subjects.length,
    0
  );
  const domainList = STUDY_GUIDE_CATEGORIES.map((cat) => cat.title).join(", ");

  return [
    // 1. Getting Started & Creating an Account
    {
      id: "faq-overall-what-is-prepford",
      categoryId: "getting-started",
      question: "What is PrepFord and who is it designed for?",
      answer: `PrepFord is an independent nursing licensure preparation platform built for candidates preparing for the NCLEX-RN (Registered Nurse) and NCLEX-PN (Practical/Vocational Nurse) examinations. It combines a ${domainCount}-domain Nursing Study Guide (${totalSubjectCount} clinical subject guides), interactive clinical scenario questions with option-by-option rationales, and structured study plans.`,
    },
    {
      id: "faq-overall-create-account",
      categoryId: "getting-started",
      question: "How do I create a PrepFord learner account?",
      answer:
        "Visit /sign-up, enter your full name and email address, choose your primary examination pathway (NCLEX-RN or NCLEX-PN), create a strong password that meets the security strength check, and accept the Terms and Conditions. After registration succeeds, you are directed to /courses (or your requested return page) with an active learner session.",
    },
    {
      id: "faq-overall-free-preview",
      categoryId: "getting-started",
      question: "Can I explore PrepFord before purchasing a study plan?",
      answer: `Yes. Visitors and registered learners can browse the ${domainCount}-domain Nursing Study Guide at /study-guide, try the interactive NCLEX-RN and NCLEX-PN sample clinical scenario questions on /nclex-rn, /nclex-pn, and /courses, and use the 4-question Course Recommendation Quiz before selecting a paid plan.`,
    },

    // 2. Signing In, Google Authentication & Account Access
    {
      id: "faq-overall-post-login-destination",
      categoryId: "auth-access",
      question: "Where do I land after signing in to PrepFord?",
      answer:
        "By default, signing in at /sign-in takes you directly to your authenticated Learner Dashboard (/dashboard). If you initiated sign-in from a specific internal workflow—such as clicking 'Proceed to Checkout' from /cart (/sign-in?from=/cart)—PrepFord validates that internal return path and returns you there after authentication.",
    },
    {
      id: "faq-overall-google-oauth",
      categoryId: "auth-access",
      question: "How does 'Continue with Google' authentication work?",
      answer:
        "The 'Continue with Google' button on /sign-in and /sign-up initiates an OAuth 2.0 Authorization Code flow with PKCE and CSRF state verification via /api/auth/google. In local or staging environments where GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not configured on the server, the page displays a clear configuration notice and you can sign in using email and password.",
    },
    {
      id: "faq-overall-redirect-security",
      categoryId: "auth-access",
      question: "How does PrepFord protect my account session and post-login redirects?",
      answer:
        "Sessions are stored in an HTTP-only cookie (preform_session) verified on server routes. All return URLs (?from= or ?returnUrl=) are sanitized to allow only single-slash internal paths and block external domains, protocol-relative URLs (//), backslash bypasses (/\\), encoded-path tricks, and authentication loops.",
    },

    // 3. NCLEX-RN & NCLEX-PN Preparation
    {
      id: "faq-overall-rn-vs-pn-focus",
      categoryId: "rn-pn-prep",
      question: "How do the NCLEX-RN and NCLEX-PN preparation pathways differ on PrepFord?",
      answer:
        "The NCLEX-RN pathway (/nclex-rn) focuses on registered nurse clinical judgment, acute care prioritization, unstable client assessment, IV titration, and nursing delegation. The NCLEX-PN pathway (/nclex-pn) focuses on practical/vocational nursing scope of practice, coordinated care for stable clients with predictable outcomes, data collection, and LPN/LVN medication administration.",
    },
    {
      id: "faq-overall-switch-pathway",
      categoryId: "rn-pn-prep",
      question: "Can I switch between NCLEX-RN and NCLEX-PN pathways after creating my account?",
      answer:
        "Yes. You can toggle between the NCLEX-RN and NCLEX-PN views anytime on your Learner Dashboard (/dashboard) or update your default examination pathway in your Account Profile (/profile).",
    },
    {
      id: "faq-overall-ngn-alignment",
      categoryId: "rn-pn-prep",
      question: "How does PrepFord align with Next Generation NCLEX (NGN) clinical judgment?",
      answer:
        "PrepFord organizes its clinical scenario questions and Study Guide notes around the six cognitive steps of the NCSBN Clinical Judgment Measurement Model: recognizing cues, analyzing cues, prioritizing hypotheses, generating solutions, taking priority nursing action, and evaluating client outcomes.",
    },

    // 4. Study Guides, Subjects, Domains & Learning Materials
    {
      id: "faq-overall-study-guide-domains",
      categoryId: "study-guides",
      question: "Which nursing domains and subjects are included in the Study Guide?",
      answer: `The PrepFord Nursing Study Guide (/study-guide) includes ${totalSubjectCount} clinical subject guides organized across ${domainCount} core nursing domains: ${domainList}. Each domain hub shows exam weightings and links directly to structured subject notes.`,
    },
    {
      id: "faq-overall-study-guide-content",
      categoryId: "study-guides",
      question: "What learning materials are inside each Study Guide subject page?",
      answer:
        "Each subject guide provides a clinical overview, key learning objectives, structured concept sections, physiological and pharmacological comparison tables, clinical memory aids (such as VEAL CHOP for fetal heart rate interpretation), high-alert safety alerts, and an interactive quick-check practice question with rationale.",
    },
    {
      id: "faq-overall-study-guide-search",
      categoryId: "study-guides",
      question: "How can I search or filter topics in the Study Guide?",
      answer:
        "On the main Study Guide directory (/study-guide), use the search bar to filter across domain titles, subject names, clinical concepts, and key nursing terms in real time.",
    },

    // 5. Practice Questions, Rationales & Available Assessment Modes
    {
      id: "faq-overall-practice-rationales",
      categoryId: "practice-assessments",
      question: "How do the interactive practice questions and answer rationales work?",
      answer:
        "Each clinical scenario presents client background, vital signs, and bedside cues. After you select an option and click 'Check Answer', PrepFord reveals whether your choice is correct and displays option-by-option rationales explaining both the priority intervention and why each distractor is unsafe or lower priority.",
    },
    {
      id: "faq-overall-readiness-packs",
      categoryId: "practice-assessments",
      question: "What are the NCLEX-RN and NCLEX-PN Readiness Assessment Packs?",
      answer: `PrepFord offers standalone one-time Readiness Assessment Packs for both pathways—${rnReadiness?.name ?? "NCLEX-RN Readiness Assessment Pack"} ($${readinessPrice}) and ${pnReadiness?.name ?? "NCLEX-PN Readiness Assessment Pack"} ($${readinessPrice})—which include 3 timed, full-length practice assessments, Client Needs category scoring reports, and complete post-exam rationale review.`,
    },
    {
      id: "faq-overall-cat-and-telemetry-status",
      categoryId: "practice-assessments",
      question: "Which question bank and adaptive testing features are currently live versus in development?",
      answer:
        "Interactive clinical scenario questions with option-by-option rationales, Study Guide quick-checks, and the Course Recommendation Quiz are live in the web application today. Full server-scored Computer Adaptive Testing (CAT) sessions and persistent backend attempt history are in active Phase 4 backend integration.",
    },

    // 6. Study Progress, Dashboard Metrics & Saved Activity
    {
      id: "faq-overall-dashboard-overview",
      categoryId: "progress-dashboard",
      question: "What is shown on the PrepFord Learner Dashboard (/dashboard)?",
      answer:
        "Your Learner Dashboard (/dashboard) provides a welcome header with a one-click 'Continue studying' button when you have recent study activity, a 4-card Study Launchpad (NCLEX-RN, NCLEX-PN, Study Guides, and Practice & Courses), a 3-step Recommended Next Step guide, your real account and plan status, and direct links to all 7 Study Guide domains.",
    },
    {
      id: "faq-overall-recent-activity-persistence",
      categoryId: "progress-dashboard",
      question: "How does 'Continue studying' and recent activity tracking work?",
      answer:
        "When you open a Study Guide domain, subject note, or practice scenario from your dashboard, PrepFord records that module in your browser's local storage (prepford_recent_study_activity) so you can resume where you left off. You can clear this browser-saved activity anytime from the dashboard.",
    },
    {
      id: "faq-overall-why-no-fake-scores",
      categoryId: "progress-dashboard",
      question: "Does the Learner Dashboard display personal accuracy percentages or pass predictions?",
      answer:
        "No. Because live server-synced question bank telemetry and scored readiness assessment history are still being connected to the backend, the Learner Dashboard does not display fabricated personal accuracy percentages, peer rankings, or pass predictions. Illustrative domain previews on marketing pages (/nclex-rn and /nclex-pn) are explicitly labeled as sample previews.",
    },

    // 7. Study-Plan Selection, Access Duration & Catalogue Pricing
    {
      id: "faq-overall-catalogue-plans",
      categoryId: "plans-pricing",
      question: "What study plans and prices are available in the PrepFord catalogue?",
      answer: `For NCLEX-RN: Starter Review is $${starter30Price}/30 days or $${starter90Price}/90 days, and Complete Preparation (Pro) is $${pro30Price}/30 days or $${pro90Price}/90 days. For NCLEX-PN: Starter Review is $${pnStarter30Price}/30 days or $${pnStarter90Price}/90 days, and Complete Preparation (Pro) is $${pnPro30Price}/30 days or $${pnPro90Price}/90 days. For dual-pathway access: NCLEX-RN & PN All-Access is $${premium30Price}/30 days or $${premium90Price}/90 days. Standalone RN and PN Readiness Assessment Packs are $${readinessPrice} one-time each.`,
    },
    {
      id: "faq-overall-quarterly-savings-math",
      categoryId: "plans-pricing",
      question: "How are the 90-day quarterly savings calculated?",
      answer: `Quarterly savings compare the 90-day plan price against three consecutive 30-day terms in the canonical catalogue: Starter Review (90-Day) is $${starter90Price} vs. $${starter90Original} (saving $${starterSavings}), Complete Preparation (90-Day) is $${pro90Price} vs. $${pro90Original} (saving $${proSavings}), and NCLEX-RN & PN All-Access (90-Day) is $${premium90Price} vs. $${premium90Original} (saving $${premiumSavings}).`,
    },
    {
      id: "faq-overall-duration-switching",
      categoryId: "plans-pricing",
      question: "How do I choose between 30-day monthly and 90-day quarterly access?",
      answer:
        "On /nclex-rn, /nclex-pn, or /subscriptions, use the 'Select Access Duration' segmented control to toggle between '30-Day Monthly Access' and '90-Day Quarterly Access'. Every plan card and checkout button updates immediately to pass the exact selected product ID (such as rn-pro or rn-pro-90) into your cart.",
    },

    // 8. Cart, Checkout & Payment Status
    {
      id: "faq-overall-cart-conflict-rules",
      categoryId: "cart-checkout",
      question: "How does the PrepFord Cart handle switching plans or combining Readiness Packs?",
      answer:
        "To prevent accidental duplicate subscriptions, selecting a new recurring study plan automatically replaces any existing subscription tier in your cart. Standalone one-time Readiness Assessment Packs (rn-readiness and pn-readiness) can be purchased on their own or alongside a single-pathway Starter or Pro plan, and are automatically removed if you switch to the all-inclusive All-Access bundle.",
    },
    {
      id: "faq-overall-sandbox-checkout",
      categoryId: "cart-checkout",
      question: "Does checkout charge a real credit card right now?",
      answer:
        "No. Checkout on /cart currently operates in Phase 4 developer sandbox entitlement mode. When a signed-in learner confirms checkout, the selected plan summary and pathway are saved to their account profile (/api/profile) for testing and workspace preview without processing a live financial transaction.",
    },
    {
      id: "faq-overall-promo-codes",
      categoryId: "cart-checkout",
      question: "Are promotional discount codes supported in the cart?",
      answer:
        "Yes. On /cart, you can apply supported promotional codes such as FUTURENURSE, NURSE10, or PREPFORD10 (10% discount) or CLINICAL20 (20% discount) to preview discounted subtotal calculations before confirming your order.",
    },

    // 9. Account Profile, Privacy & Supported Features
    {
      id: "faq-overall-profile-management",
      categoryId: "profile-privacy",
      question: "What account settings can I update on my Profile page (/profile)?",
      answer:
        "On /profile, signed-in learners can update their display name, primary examination pathway (NCLEX-RN or NCLEX-PN), target exam date, notification preferences, and account password, as well as view their active study plan.",
    },
    {
      id: "faq-overall-profile-photo-upload",
      categoryId: "profile-privacy",
      question: "How does profile image upload and storage work?",
      answer:
        "You can upload a PNG, JPEG, WebP, or GIF image (up to 2 MB) on /profile. The server validates the binary magic-byte signature and SHA-256 hash and persists the image securely in PrepFord's profile datastore so your avatar displays across your profile and header navigation.",
    },
    {
      id: "faq-overall-privacy-terms",
      categoryId: "profile-privacy",
      question: "Where can I review PrepFord's Privacy Policy and Terms and Conditions?",
      answer:
        "You can read our full data handling practices at /privacy-policy and our platform usage terms at /terms-and-conditions, linked in the footer of every page.",
    },

    // 10. Troubleshooting & Contacting Support
    {
      id: "faq-overall-troubleshooting-login-cart",
      categoryId: "troubleshooting-support",
      question: "What should I do if sign-in, my cart selection, or plan activation is not working?",
      answer:
        "Ensure cookies and localStorage are enabled in your browser, verify that you are signed in with the email address used during registration, and refresh /dashboard or /profile after completing sandbox checkout on /cart. If an issue persists, contact our support team at /contact.",
    },
    {
      id: "faq-overall-exam-pass-disclaimer",
      categoryId: "troubleshooting-support",
      question: "Does PrepFord guarantee that I will pass the NCLEX or predict my official score?",
      answer:
        "No. PrepFord is an independent educational study resource and is not affiliated with, endorsed by, or sponsored by the National Council of State Boards of Nursing (NCSBN). PrepFord does not offer pass guarantees, pass-rate promises, or official exam score predictions.",
    },
    {
      id: "faq-overall-contact-support",
      categoryId: "troubleshooting-support",
      question: "How can I contact PrepFord support for academic or technical help?",
      answer:
        "Visit our Contact Support page at /contact to submit a message with your name, email, subject category, and question. Our team reviews inquiries regarding study plans, nursing content rationales, and technical account access.",
    },
  ];
}

export const OVERALL_FAQ_ITEMS = buildOverallFaqItems();

export function FAQPageClient() {
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [openIds, setOpenIds] = React.useState<Record<string, boolean>>(() => ({
    [OVERALL_FAQ_ITEMS[0].id]: true,
  }));

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredItems = React.useMemo(() => {
    return OVERALL_FAQ_ITEMS.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.categoryId === selectedCategory;
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;
      return (
        item.question.toLowerCase().includes(normalizedQuery) ||
        item.answer.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [selectedCategory, normalizedQuery]);

  const visibleCategories = React.useMemo(() => {
    return FAQ_CATEGORIES.map((category) => ({
      ...category,
      items: filteredItems.filter((item) => item.categoryId === category.id),
    })).filter((category) => category.items.length > 0);
  }, [filteredItems]);

  const toggleItem = React.useCallback((id: string) => {
    setOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const expandAllVisible = React.useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const item of filteredItems) {
      next[item.id] = true;
    }
    setOpenIds(next);
  }, [filteredItems]);

  const collapseAllVisible = React.useCallback(() => {
    setOpenIds({});
  }, []);

  return (
    <div
      data-testid="overall-faq-page"
      className="min-h-screen bg-background text-foreground pb-24"
    >
      {/* Hero Header */}
      <section className="bg-gradient-to-b from-slate-100/90 via-teal-50/35 to-background dark:from-slate-950 dark:via-slate-900/80 dark:to-background pt-14 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/15 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-secondary">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Learner Support &amp; Platform Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight text-foreground">
            Frequently Asked Questions
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-muted-foreground leading-relaxed">
            Clear, accurate answers about PrepFord&apos;s NCLEX-RN and NCLEX-PN preparation pathways,
            7-domain Nursing Study Guide, catalogue pricing, Learner Dashboard, and account access.
          </p>

          {/* Search Input */}
          <div className="pt-3 max-w-xl mx-auto">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions (e.g., quarterly savings, dashboard, study guide, Google sign-in)..."
                aria-label="Search frequently asked questions"
                data-testid="faq-search-input"
                className="w-full rounded-2xl bg-card pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground shadow-xs ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-10 mt-4">
        {/* Category Filter Bar */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Browse by Topic ({OVERALL_FAQ_ITEMS.length} Questions Across {FAQ_CATEGORIES.length} Categories)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="faq-expand-all"
                onClick={expandAllVisible}
                className="text-xs font-semibold text-secondary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded px-1.5 py-0.5"
              >
                Expand All
              </button>
              <span className="text-muted-foreground text-xs">•</span>
              <button
                type="button"
                data-testid="faq-collapse-all"
                onClick={collapseAllVisible}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded px-1.5 py-0.5"
              >
                Collapse All
              </button>
            </div>
          </div>

          <div
            role="group"
            aria-label="Filter FAQ categories"
            className="flex flex-wrap gap-2"
          >
            <button
              type="button"
              data-testid="faq-category-tab-all"
              aria-pressed={selectedCategory === "all"}
              onClick={() => setSelectedCategory("all")}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card text-foreground ring-1 ring-border hover:bg-muted/70"
              }`}
            >
              All Categories ({OVERALL_FAQ_ITEMS.length})
            </button>

            {FAQ_CATEGORIES.map((category) => {
              const count = OVERALL_FAQ_ITEMS.filter(
                (i) => i.categoryId === category.id
              ).length;
              const isSelected = selectedCategory === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  data-testid={`faq-category-tab-${category.id}`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-card text-foreground ring-1 ring-border hover:bg-muted/70"
                  }`}
                >
                  {category.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Categorized Accordion Sections */}
        {visibleCategories.length === 0 ? (
          <div className="rounded-2xl bg-card p-10 text-center space-y-3 ring-1 ring-border/70">
            <p className="text-base font-serif font-semibold text-foreground">
              No matching questions found for &ldquo;{searchQuery}&rdquo;
            </p>
            <p className="text-xs text-muted-foreground">
              Try clearing your search filter or selecting &ldquo;All Categories&rdquo; above.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            {visibleCategories.map((category) => (
              <section
                key={category.id}
                data-testid={`faq-category-section-${category.id}`}
                aria-labelledby={`faq-cat-heading-${category.id}`}
                className="space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
                  <div>
                    <h2
                      id={`faq-cat-heading-${category.id}`}
                      className="text-lg sm:text-xl font-serif font-bold text-foreground"
                    >
                      {category.label}
                    </h2>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </div>
                  <Badge variant="outline" className="w-fit text-[11px] font-mono">
                    {category.items.length}{" "}
                    {category.items.length === 1 ? "Question" : "Questions"}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {category.items.map((item) => {
                    const isOpen = Boolean(openIds[item.id]);
                    const buttonId = `overall-faq-btn-${item.id}`;
                    const panelId = `overall-faq-panel-${item.id}`;

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl bg-card shadow-2xs ring-1 ring-border/70 overflow-hidden"
                      >
                        <h3>
                          <button
                            id={buttonId}
                            type="button"
                            data-testid={buttonId}
                            aria-expanded={isOpen}
                            aria-controls={panelId}
                            onClick={() => toggleItem(item.id)}
                            className="flex w-full items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left text-sm sm:text-base font-semibold text-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary transition-colors"
                          >
                            <span>{item.question}</span>
                            <ChevronDown
                              className={`h-5 w-5 shrink-0 text-secondary transition-transform duration-200 motion-reduce:transition-none ${
                                isOpen ? "rotate-180" : ""
                              }`}
                              aria-hidden="true"
                            />
                          </button>
                        </h3>
                        <div
                          id={panelId}
                          role="region"
                          aria-labelledby={buttonId}
                          hidden={!isOpen}
                          className="px-5 sm:px-6 pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed"
                        >
                          {item.answer}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Helpful Pathway & Support Footer CTA */}
        <section
          aria-label="Additional learner resources"
          className="rounded-3xl bg-muted/45 p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
        >
          <div className="space-y-1.5 max-w-xl">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-foreground">
              Still have a question or ready to begin studying?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Explore our clinical study notes, compare NCLEX-RN and NCLEX-PN preparation plans, or reach out directly to our support team.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="sm" className="rounded-xl font-semibold">
              <Link href="/nclex-rn">
                <Compass className="mr-1.5 h-4 w-4" aria-hidden="true" />
                <span>NCLEX-RN Prep</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl font-semibold bg-card">
              <Link href="/nclex-pn">
                <span>NCLEX-PN Prep</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl font-semibold bg-card">
              <Link href="/study-guide">
                <BookOpen className="mr-1.5 h-4 w-4 text-secondary" aria-hidden="true" />
                <span>Study Guide</span>
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm" className="rounded-xl font-semibold">
              <Link href="/contact">
                <MessageSquare className="mr-1.5 h-4 w-4" aria-hidden="true" />
                <span>Contact Support</span>
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
