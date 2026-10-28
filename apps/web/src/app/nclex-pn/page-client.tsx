"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
  FileCheck2,
  FileText,
  HelpCircle,
  Layers,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { STUDY_GUIDE_CATEGORIES } from "@/lib/study-guide-data";
import { getProductById, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { BRAND } from "@/lib/brand";

const PN_HERO_ECG_PATH =
  "M0,68 L140,68 L175,68 L192,48 L208,82 L226,18 L244,98 L262,56 L285,68 L520,68 L555,68 L572,48 L588,82 L606,18 L624,98 L642,56 L665,68 L900,68 L935,68 L952,48 L968,82 L986,18 L1004,98 L1022,56 L1045,68 L1260,68 L1295,68 L1312,48 L1328,82 L1346,18 L1364,98 L1382,56 L1405,68 L1440,68";

interface PnSampleQuestion {
  id: string;
  clientInfo: string;
  scenario: string;
  vitals: { hr: string; bp: string; rr: string; spo2: string };
  question: string;
  options: {
    id: string;
    key: string;
    text: string;
    correct: boolean;
    rationale: string;
  }[];
  clinicalTakeaway: string;
}

const PN_SAMPLE_QUESTION: PnSampleQuestion = {
  id: "pn-sample-postop-1",
  clientInfo: "68-year-old client • Postoperative Day 1 Abdominal Surgery • LPN Data Collection",
  scenario:
    "The licensed practical nurse (LPN) enters the room to collect bedside data on a client who received prescribed intravenous morphine 25 minutes ago. The client is difficult to arouse, has shallow respirations, and is lying supine.",
  vitals: {
    hr: "64 bpm (Regular)",
    bp: "104/62 mmHg",
    rr: "9 breaths/min (Shallow)",
    spo2: "89% on room air",
  },
  question:
    "Which action should the practical nurse take first while calling for immediate registered nurse and provider assistance?",
  options: [
    {
      id: "pn-opt-a",
      key: "A",
      text: "Document the respiratory rate in the electronic flowsheet and recheck vitals in 30 minutes.",
      correct: false,
      rationale:
        "Distractor rationale: Delaying intervention in a client with opioid-induced respiratory depression (RR 9 breaths/min, SpO2 89%) places the client at immediate risk for respiratory arrest.",
    },
    {
      id: "pn-opt-b",
      key: "B",
      text: "Stimulate the client, elevate the head of the bed, and apply supplemental oxygen per facility protocol.",
      correct: true,
      rationale:
        "Correct rationale: Following the airway and breathing priority framework, the practical nurse should immediately arouse/stimulate the client to encourage deep breathing, elevate the head of the bed to improve lung expansion, and support oxygenation while the team prepares prescribed naloxone.",
    },
    {
      id: "pn-opt-c",
      key: "C",
      text: "Encourage the client to drink warm water to help clear postoperative sedation.",
      correct: false,
      rationale:
        "Distractor rationale: Offering oral fluids to a lethargic, difficult-to-arouse client creates a high risk of pulmonary aspiration.",
    },
    {
      id: "pn-opt-d",
      key: "D",
      text: "Lower the head of the bed completely flat and place a warm blanket over the client.",
      correct: false,
      rationale:
        "Distractor rationale: A flat supine position restricts diaphragmatic excursion and worsens hypoventilation during opioid-induced respiratory depression.",
    },
  ],
  clinicalTakeaway:
    "NCLEX-PN Physiological Integrity & Safety: When collecting data on a client receiving opioid analgesia, a respiratory rate below 12 breaths/min accompanied by somnolence and SpO2 < 90% signals acute opioid toxicity requiring immediate airway/breathing support and prompt escalation.",
};

interface FeatureShowcaseItem {
  id: string;
  tabLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
  imageSrc: string;
  imageAlt: string;
}

const PN_SHOWCASE_FEATURES: FeatureShowcaseItem[] = [
  {
    id: "practice",
    tabLabel: "Question Practice",
    eyebrow: "Practical Nursing Question Bank",
    title: "Scenario-Based Practice Focused on LPN/LVN Scope of Care",
    description:
      "Practice single-best-answer and clinical scenario questions tailored to practical and vocational nursing responsibilities, including data collection, coordinated care, basic comfort, and medication safety.",
    bullets: [
      "Realistic Electronic Health Record (EHR) client vignettes and bedside vital sign tables",
      "Questions aligned with NCLEX-PN Client Needs categories",
      "Immediate feedback mode to reinforce safe practical nursing decisions",
    ],
    ctaLabel: "Browse PN Practice Courses",
    ctaHref: "/courses?programme=PN",
    imageSrc: "/images/illustrations/prepford-ehr-unfolding-case.png",
    imageAlt: "NCLEX-PN candidate reviewing a clinical scenario and vital signs",
  },
  {
    id: "rationales",
    tabLabel: "Answer Rationales",
    eyebrow: "Option-by-Option Explanations",
    title: "Understand Why the Correct Action Is Safe—and Why Distractors Are Not",
    description:
      "Every practice question in PrepFord includes clear rationales for both the correct option and each distractor, helping you build clinical reasoning instead of relying on rote memorization.",
    bullets: [
      "Clear explanation of the physiological principle behind the correct nursing action",
      "Option-by-option distractor rationales identifying common exam traps",
      "Concise clinical takeaways summarizing priority nursing rules",
    ],
    ctaLabel: "Try the Sample Question Above",
    ctaHref: "#pn-question-experience",
    imageSrc: "/images/illustrations/prepford-pathophysiology-rationales.png",
    imageAlt: "Detailed nursing answer rationale and distractor breakdown",
  },
  {
    id: "study-guide",
    tabLabel: "7-Domain Study Guide",
    eyebrow: "Structured Nursing Notes",
    title: "Reinforce Core Nursing Concepts with Searchable Clinical Notes",
    description:
      "Move seamlessly between question practice and PrepFord's 7-domain Nursing Study Guide. Review concise summaries of pathophysiology, medication safety alerts, and LPN delegation rules.",
    bullets: [
      "7 nursing domains: Pharmacology, Fundamentals, Med-Surg, Maternal-Newborn, Pediatrics, Mental Health, and Delegation",
      "Highlighted clinical alerts, exam tips, and pharmacology safety callouts",
      "Searchable topic directory with estimated reading times and difficulty tags",
    ],
    ctaLabel: "Open the Nursing Study Guide",
    ctaHref: "/study-guide",
    imageSrc: "/images/illustrations/prepford-study-guide-overview.png",
    imageAlt: "PrepFord Nursing Study Guide and pharmacology notes",
  },
  {
    id: "workspace",
    tabLabel: "Progress Workspace",
    eyebrow: "Domain Performance Review",
    title: "Track Completed Questions and Accuracy Across PN Client Needs",
    description:
      "Your PrepFord student workspace organizes your completed questions and accuracy by practical nursing domain so you can focus your study time where it matters most.",
    bullets: [
      "Dedicated NCLEX-PN workspace view tracking Coordinated Care, Pharmacology, Basic Care, and Safety",
      "Clear domain completion bars and accuracy percentages",
      "Direct links from each domain to targeted study modules and clinical notes",
    ],
    ctaLabel: "View Student Workspace",
    ctaHref: "/dashboard",
    imageSrc: "/images/illustrations/prepford-readiness-analytics.png",
    imageAlt: "PrepFord student workspace displaying NCLEX-PN domain progress",
  },
];

interface ComparisonRow {
  feature: string;
  starter: string | boolean;
  pro: string | boolean;
  premium: string | boolean;
}

const PN_COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: "Target Licensure Pathway",
    starter: "NCLEX-PN",
    pro: "NCLEX-PN",
    premium: "NCLEX-PN & NCLEX-RN",
  },
  {
    feature: "Available Access Durations",
    starter: "30-Day or 90-Day",
    pro: "30-Day or 90-Day",
    premium: "30-Day or 90-Day",
  },
  {
    feature: "30-Day Monthly Price (USD)",
    starter: "$29",
    pro: "$59",
    premium: "$89",
  },
  {
    feature: "90-Day Quarterly Price (USD)",
    starter: "$75 (Save $12)",
    pro: "$149 (Save $28)",
    premium: "$229 (Save $38)",
  },
  {
    feature: "Practical Nursing Question Practice",
    starter: "Foundational sample set",
    pro: "Full PN question bank",
    premium: "Full PN + RN question banks",
  },
  {
    feature: "Option-by-Option Clinical & Distractor Rationales",
    starter: true,
    pro: true,
    premium: true,
  },
  {
    feature: "7-Domain Nursing Study Guide & Clinical Notes",
    starter: true,
    pro: true,
    premium: true,
  },
  {
    feature: "Timed Readiness Assessments Included",
    starter: false,
    pro: "3 Assessments Included",
    premium: "3 Assessments Included",
  },
  {
    feature: "Client Needs Domain Progress Tracking",
    starter: "Basic tracking",
    pro: "Full domain analytics",
    premium: "Full PN & RN analytics",
  },
  {
    feature: "Priority Educator Email Support",
    starter: false,
    pro: false,
    premium: true,
  },
];

interface PnFaqItem {
  id: string;
  question: string;
  answer: string;
}

const PN_FAQS: PnFaqItem[] = [
  {
    id: "faq-purpose",
    question: "What is PrepFord's NCLEX-PN preparation pathway designed for?",
    answer:
      "PrepFord's NCLEX-PN pathway is built for practical and vocational nursing candidates (LPN and LVN students) preparing for the National Council Licensure Examination for Practical Nurses. It focuses on practical nursing scope of care, including focused client data collection, coordinated care, basic care and comfort, safety, and pharmacological therapies.",
  },
  {
    id: "faq-resources",
    question: "What learning resources are currently available for NCLEX-PN candidates?",
    answer:
      "Candidates have access to scenario-based single-best-answer practice questions with bedside vital sign exhibits, option-by-option clinical and distractor rationales, a searchable 7-domain Nursing Study Guide with clinical alerts, timed readiness assessments, and a student workspace that tracks accuracy across Client Needs domains.",
  },
  {
    id: "faq-study-guide",
    question: "How do students access the Nursing Study Guide and subject notes?",
    answer:
      "You can browse the Nursing Study Guide directly from the top navigation bar or via the Study Guide links on this page. It is organized into 7 core nursing subjects—Medical-Surgical, Pharmacology, Maternal-Newborn, Pediatrics, Mental Health, Fundamentals, and Leadership & Delegation—each with readable clinical summaries and priority takeaways.",
  },
  {
    id: "faq-durations",
    question: "How do subscription durations and plan entitlements work?",
    answer:
      "PrepFord offers 30-Day Monthly Access and 90-Day Quarterly Access across our Starter Review, Complete Preparation (Pro), and RN & PN All-Access plans, plus a standalone One-Time NCLEX-PN Readiness Assessment Pack ($39 USD). Selecting a plan and duration adds that exact product to your cart so your account entitlement matches the plan you choose.",
  },
  {
    id: "faq-after-purchase",
    question: "What happens after purchasing a study plan?",
    answer:
      "When you select a plan on this page, it is added to your PrepFord shopping cart. If you are not yet signed in, you will be prompted to sign in or create your candidate account before confirming checkout. Once confirmed, your study access is activated and accessible through your Student Workspace and Profile page.",
  },
  {
    id: "faq-support",
    question: "Where can students obtain help with their account or study plan?",
    answer:
      "You can visit our Help & FAQ page (/faq) for additional platform answers or reach our team directly through the Contact Us page (/contact) for account, billing, or institutional inquiries.",
  },
];

export function NCLEXPNPageClient() {
  const router = useRouter();
  const cart = useCart();
  const auth = useAuth();
  const isAuthenticated = auth?.isAuthenticated ?? false;

  // Section 3: Interactive Sample Question State
  const [selectedOptionId, setSelectedOptionId] = React.useState<string | null>(null);
  const [isQuestionSubmitted, setIsQuestionSubmitted] = React.useState(false);

  // Section 5: Interactive Feature Showcase Tab State
  const [activeFeatureIdx, setActiveFeatureIdx] = React.useState(0);
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  // Section 6: Plan Duration & Checkout Handoff State
  const [selectedDuration, setSelectedDuration] = React.useState<"month" | "quarter">("month");
  const [submittingPlanId, setSubmittingPlanId] = React.useState<string | null>(null);
  const [planError, setPlanError] = React.useState<string | null>(null);
  const [addedPlanId, setAddedPlanId] = React.useState<string | null>(null);

  // Section 10: Accessible FAQ Accordion State
  const [openFaqId, setOpenFaqId] = React.useState<string | null>(PN_FAQS[0].id);

  // Resolve real products from canonical catalog based on selectedDuration
  const pnPlans = React.useMemo(() => {
    const ids =
      selectedDuration === "month"
        ? ["pn-starter", "pn-pro", "prep-premium"]
        : ["pn-starter-90", "pn-pro-90", "prep-premium-90"];
    return ids
      .map((id) => getProductById(id))
      .filter((p): p is Product => Boolean(p));
  }, [selectedDuration]);

  const readinessPack = React.useMemo(() => getProductById("pn-readiness"), []);

  const handleQuestionSubmit = () => {
    if (!selectedOptionId) return;
    setIsQuestionSubmitted(true);
  };

  const handleQuestionReset = () => {
    setSelectedOptionId(null);
    setIsQuestionSubmitted(false);
  };

  const handleFeatureTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    const count = PN_SHOWCASE_FEATURES.length;
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % count;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + count) % count;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = count - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      setActiveFeatureIdx(nextIndex);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  const handleSelectProduct = (productId: string) => {
    if (submittingPlanId) return; // Prevent duplicate submissions
    setPlanError(null);
    setSubmittingPlanId(productId);

    const added = cart.addItem(productId);
    if (!added) {
      setPlanError("Unable to select that plan right now. Please try again.");
      setSubmittingPlanId(null);
      return;
    }

    setAddedPlanId(productId);
    router.push(`/cart?add=${encodeURIComponent(productId)}`);
  };

  const activeFeature = PN_SHOWCASE_FEATURES[activeFeatureIdx];

  return (
    <div className="w-full overflow-x-hidden bg-background text-foreground">
      {/* =====================================================================
          SECTION 1: IMMERSIVE NCLEX-PN HERO
      ===================================================================== */}
      <section
        data-testid="nclex-pn-hero"
        aria-labelledby="nclex-pn-hero-heading"
        className="relative isolate w-full min-h-[580px] lg:min-h-[650px] flex items-center overflow-hidden bg-gradient-to-b from-slate-100/95 via-teal-50/45 to-background dark:from-slate-950 dark:via-slate-900/90 dark:to-background pt-12 pb-24 sm:pt-16 sm:pb-28 lg:pt-20 lg:pb-32"
      >
        {/* Subtle Ambient Backlight (decorative, pointer-events-none) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden"
        >
          <div className="absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-teal-500/10 dark:bg-teal-400/10 blur-3xl" />
          <div className="absolute bottom-12 -left-24 h-80 w-80 rounded-full bg-primary/5 dark:bg-primary/10 blur-3xl" />
        </div>

        {/* Continuous Full-Width Left-to-Right Animated ECG/Heartbeat Line */}
        <div
          aria-hidden="true"
          data-testid="pn-hero-heartbeat"
          className="absolute inset-x-0 bottom-3 sm:bottom-5 z-10 w-full pointer-events-none select-none overflow-hidden"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between text-[11px] font-mono text-teal-800/75 dark:text-teal-300/80 mb-1">
            <span className="inline-flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 motion-safe:animate-heartbeat" />
              PREPFORD PRACTICAL NURSING RHYTHM • LEAD II
            </span>
            <span className="font-semibold text-teal-700 dark:text-emerald-300">
              LPN / LVN PATHWAY • LEFT-TO-RIGHT PULSE
            </span>
          </div>
          <svg
            className="w-full h-14 sm:h-16 lg:h-20 block"
            viewBox="0 0 1440 120"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              data-testid="pn-hero-ecg-baseline"
              d={PN_HERO_ECG_PATH}
              pathLength={1000}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-teal-700/20 dark:text-teal-400/25"
            />
            <path
              data-testid="pn-hero-ecg-pulse-ltr"
              d={PN_HERO_ECG_PATH}
              pathLength={1000}
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-teal-600 dark:text-teal-300 drop-shadow-[0_0_6px_rgba(13,148,136,0.45)] dark:drop-shadow-[0_0_8px_rgba(45,212,191,0.75)] motion-safe:animate-ecg-ltr"
            />
          </svg>
        </div>

        {/* Hero Foreground Content */}
        <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Brand Pill, Heading, Copy, Resource Summary, CTAs */}
            <div className="lg:col-span-6 text-left flex flex-col items-start">
              <div className="inline-flex items-center gap-2.5 rounded-full bg-teal-500/12 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={BRAND.logo.assetPath}
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4 rounded-sm object-contain"
                />
                <span>NCLEX-PN Exam Preparation • LPN &amp; LVN Pathway</span>
              </div>

              <h1
                id="nclex-pn-hero-heading"
                className="mt-5 text-3xl font-serif font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.2rem] leading-[1.12]"
              >
                Prepare for the NCLEX-PN with Structured Practice and Clinical Clarity
              </h1>

              <p className="mt-5 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
                Build confidence for practical and vocational nursing licensure with PrepFord&apos;s scenario-based NCLEX-PN practice questions, option-by-option clinical rationales, and 7-domain Nursing Study Guide.
              </p>

              {/* Real Available Resource Highlights */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm font-medium text-foreground/90 w-full max-w-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
                  <span>Practical Nursing Scenario Questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
                  <span>Option-by-Option Clinical Rationales</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
                  <span>7-Domain Nursing Study Guide &amp; Notes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
                  <span>Timed Readiness Assessment Packs</span>
                </div>
              </div>

              {/* Primary & Secondary CTAs */}
              <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-start gap-3.5 w-full sm:w-auto">
                <Button
                  size="lg"
                  asChild
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md px-7 py-6 text-base rounded-xl"
                >
                  <a href="#pn-study-plans">
                    <Compass className="mr-2 h-5 w-5" />
                    Explore Study Plans
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="w-full sm:w-auto font-semibold px-7 py-6 text-base border-2 border-input rounded-xl bg-card/90 text-foreground backdrop-blur-xs hover:bg-muted hover:text-foreground shadow-sm"
                >
                  <Link href="/study-guide">
                    <BookOpen className="mr-2 h-5 w-5 text-secondary" />
                    Explore Study Guide
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  asChild
                  className="w-full sm:w-auto font-semibold px-5 py-6 text-sm text-foreground hover:text-secondary rounded-xl"
                >
                  <a href="#pn-question-experience">
                    Try Free Sample Question →
                  </a>
                </Button>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Independent preparation platform. Not affiliated with or endorsed by NCSBN.
              </p>
            </div>

            {/* Right Column: Integrated Nursing Visual (Softly Blended, No Boxed Card) */}
            <div className="lg:col-span-6 relative">
              <div className="relative mx-auto max-w-xl lg:max-w-none">
                <div
                  aria-hidden="true"
                  className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-tr from-teal-500/20 via-primary/10 to-transparent blur-2xl pointer-events-none select-none"
                />
                <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/illustrations/prepford-pn-pathway-card.png"
                    alt="Practical nursing student reviewing patient care charts and medication safety notes"
                    data-testid="pn-hero-image"
                    className="w-full h-[340px] sm:h-[420px] lg:h-[460px] object-contain sm:object-cover object-center"
                  />
                  <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-center justify-between gap-2 text-xs text-white/95">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 font-semibold text-slate-100">
                      <Stethoscope className="h-3.5 w-3.5 text-teal-300" />
                      Focused on LPN / LVN Clinical Scope
                    </span>
                    <span className="rounded-full bg-teal-600/90 backdrop-blur-md px-3 py-1 font-mono text-[11px] text-white font-semibold">
                      Coordinated Care • Safety • Pharmacology
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: LEARNING BENEFITS AND CORE CAPABILITIES
      ===================================================================== */}
      <section
        data-testid="pn-learning-benefits"
        aria-labelledby="pn-learning-benefits-heading"
        className="w-full py-20 px-4 sm:px-6 lg:py-28 lg:px-8 bg-background"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Why Prepare with PrepFord
            </p>
            <h2
              id="pn-learning-benefits-heading"
              className="mt-3 text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Built Around How Practical Nursing Candidates Actually Study
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              Instead of overwhelming you with disconnected study materials, PrepFord connects scenario-based question practice, clear answer rationales, and structured nursing notes in one continuous workflow.
            </p>
          </div>

          {/* Editorial 4-Pillar Feature Flow (Open Layout, No Boxed Card Wrappers) */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-14">
            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/12 text-secondary">
                <FileCheck2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="space-y-2.5">
                <h3 className="text-xl font-serif font-bold text-foreground">
                  NCLEX-PN Style Practice Questions
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Practice clinical scenarios written for the LPN/LVN role—emphasizing focused client data collection, recognizing acute changes in status, safe medication administration, and appropriate reporting to the registered nurse or provider.
                </p>
                <Link
                  href="/courses?programme=PN"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-secondary hover:underline"
                >
                  Explore PN Question Practice
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/12 text-secondary">
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="space-y-2.5">
                <h3 className="text-xl font-serif font-bold text-foreground">
                  Answer Explanations &amp; Distractor Rationales
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Reviewing why an answer is right is only half the learning process. Every PrepFord question explains the clinical reasoning for the correct option alongside clear rationales for why each distractor is less appropriate or unsafe.
                </p>
                <a
                  href="#pn-question-experience"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-secondary hover:underline"
                >
                  Try an Interactive Rationale Below
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/12 text-secondary">
                <BookOpen className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="space-y-2.5">
                <h3 className="text-xl font-serif font-bold text-foreground">
                  Nursing Study Guide &amp; Subject Notes
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Access structured clinical notes across 7 core nursing domains—including Pharmacology, Fundamentals, Medical-Surgical, Maternal-Newborn, Pediatrics, Mental Health, and Leadership &amp; Delegation.
                </p>
                <Link
                  href="/study-guide"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-secondary hover:underline"
                >
                  Browse Nursing Study Guide
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/12 text-secondary">
                <BarChart3 className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="space-y-2.5">
                <h3 className="text-xl font-serif font-bold text-foreground">
                  Progress Tracking &amp; Readiness Review
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Monitor completed questions and accuracy percentages across practical nursing Client Needs domains in your student workspace, and benchmark your preparation with timed readiness assessments.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-secondary hover:underline"
                >
                  Open Student Workspace
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 3: QUESTION-BANK EXPERIENCE AND NGN READINESS
      ===================================================================== */}
      <section
        id="pn-question-experience"
        data-testid="pn-question-experience"
        aria-labelledby="pn-question-experience-heading"
        className="scroll-mt-20 w-full py-20 px-4 sm:px-6 lg:py-28 lg:px-8 bg-muted/35"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Left Editorial Explanation of Question Model & Gap Identification */}
            <div className="lg:col-span-5 space-y-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Question-Bank Experience &amp; Clinical Reasoning
              </p>
              <h2
                id="pn-question-experience-heading"
                className="text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl leading-tight"
              >
                Practice With Realistic Clinical Scenarios and Option-Level Rationales
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                PrepFord&apos;s question engine presents clinical scenarios with bedside vital signs and client context, followed by single-best-answer decision items designed to test practical nursing judgment.
              </p>

              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                    <span>1. Recognize Clinical Cues in Context</span>
                  </h3>
                  <p className="text-sm text-muted-foreground pl-6 leading-relaxed">
                    Evaluate client history, postoperative status, and bedside vital signs before selecting your nursing action.
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                    <span>2. Pinpoint Knowledge Gaps With Distractor Analysis</span>
                  </h3>
                  <p className="text-sm text-muted-foreground pl-6 leading-relaxed">
                    Immediately after submitting an answer, review both the correct rationale and the specific reason each distractor is unsafe or lower priority.
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />
                    <span>3. Reinforce With Linked Study Notes</span>
                  </h3>
                  <p className="text-sm text-muted-foreground pl-6 leading-relaxed">
                    Use each question&apos;s clinical takeaway to guide your follow-up review in the Nursing Study Guide.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-sm"
                >
                  <Link href="/courses?programme=PN">
                    Explore PN Question Bank
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="font-semibold rounded-xl"
                >
                  <Link href="/study-guide/pharmacology">
                    Review Pharmacology Notes
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Interactive PN Question Preview */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl bg-card shadow-xl overflow-hidden">
                <div className="bg-muted/70 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-secondary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Interactive NCLEX-PN Sample Item
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs font-medium">
                    {PN_SAMPLE_QUESTION.clientInfo}
                  </Badge>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                  {/* Clinical Scenario & Vitals */}
                  <div className="rounded-2xl bg-secondary/5 p-5 space-y-4">
                    <p className="text-sm sm:text-base text-foreground leading-relaxed">
                      {PN_SAMPLE_QUESTION.scenario}
                    </p>

                    <div className="pt-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-secondary mb-2">
                        <Activity className="h-3.5 w-3.5" />
                        <span>Bedside Vital Signs Exhibit:</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div className="bg-background/90 p-2.5 rounded-xl">
                          <span className="text-muted-foreground block text-[11px]">Heart Rate</span>
                          <span className="font-semibold text-foreground">{PN_SAMPLE_QUESTION.vitals.hr}</span>
                        </div>
                        <div className="bg-background/90 p-2.5 rounded-xl">
                          <span className="text-muted-foreground block text-[11px]">Blood Pressure</span>
                          <span className="font-semibold text-foreground">{PN_SAMPLE_QUESTION.vitals.bp}</span>
                        </div>
                        <div className="bg-background/90 p-2.5 rounded-xl">
                          <span className="text-muted-foreground block text-[11px]">Respirations</span>
                          <span className="font-semibold text-destructive">{PN_SAMPLE_QUESTION.vitals.rr}</span>
                        </div>
                        <div className="bg-background/90 p-2.5 rounded-xl">
                          <span className="text-muted-foreground block text-[11px]">SpO2</span>
                          <span className="font-semibold text-destructive">{PN_SAMPLE_QUESTION.vitals.spo2}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Question Stem & Options */}
                  <div className="space-y-3">
                    <h3 className="text-base sm:text-lg font-serif font-bold text-foreground">
                      {PN_SAMPLE_QUESTION.question}
                    </h3>

                    <div
                      className="space-y-2.5"
                      role="radiogroup"
                      aria-label="NCLEX-PN sample question options"
                    >
                      {PN_SAMPLE_QUESTION.options.map((option) => {
                        const isSelected = selectedOptionId === option.id;
                        let optionStyle =
                          "bg-background/70 hover:bg-muted/60 text-foreground ring-1 ring-border/70";

                        if (isQuestionSubmitted) {
                          if (option.correct) {
                            optionStyle =
                              "bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-600 font-medium";
                          } else if (isSelected && !option.correct) {
                            optionStyle =
                              "bg-destructive/10 text-destructive ring-2 ring-destructive";
                          } else {
                            optionStyle = "bg-background/40 opacity-75 ring-1 ring-border/40";
                          }
                        } else if (isSelected) {
                          optionStyle =
                            "bg-secondary/10 text-foreground font-medium ring-2 ring-secondary";
                        }

                        return (
                          <button
                            key={option.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            disabled={isQuestionSubmitted}
                            onClick={() => setSelectedOptionId(option.id)}
                            className={`w-full text-left p-4 rounded-2xl transition-all flex items-start gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${optionStyle}`}
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold mt-0.5">
                              {option.key}
                            </span>
                            <div className="flex-1">
                              <span className="text-sm sm:text-base leading-relaxed block">
                                {option.text}
                              </span>
                              {isQuestionSubmitted && (
                                <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground pt-2">
                                  <strong className="text-foreground">Rationale: </strong>
                                  {option.rationale}
                                </p>
                              )}
                            </div>
                            {isQuestionSubmitted && option.correct && (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            )}
                            {isQuestionSubmitted && isSelected && !option.correct && (
                              <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interactive Question Controls */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {!isQuestionSubmitted ? (
                      <Button
                        type="button"
                        onClick={handleQuestionSubmit}
                        disabled={!selectedOptionId}
                        size="lg"
                        className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-7 rounded-xl shadow-sm"
                      >
                        Check Answer &amp; View Rationale
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleQuestionReset}
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto font-semibold rounded-xl"
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        Reset Sample Question
                      </Button>
                    )}

                    <a
                      href="#pn-study-plans"
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-secondary hover:underline"
                    >
                      <span>Unlock Full PN Question Practice</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {isQuestionSubmitted && (
                    <div
                      role="status"
                      className="rounded-2xl bg-secondary/10 p-4 text-xs text-foreground space-y-1"
                    >
                      <p className="font-semibold text-secondary flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4" />
                        Clinical Takeaway:
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        {PN_SAMPLE_QUESTION.clinicalTakeaway}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 4: STUDY RESOURCES AND TEACHING EXPERIENCE
      ===================================================================== */}
      <section
        data-testid="pn-study-resources"
        aria-labelledby="pn-study-resources-heading"
        className="w-full py-20 px-4 sm:px-6 lg:py-28 lg:px-8 bg-background"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Visual & Editorial Context */}
            <div className="lg:col-span-5 space-y-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Study Resources &amp; Concept Reinforcement
              </p>
              <h2
                id="pn-study-resources-heading"
                className="text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl leading-tight"
              >
                Reinforce Practical Nursing Concepts With the 7-Domain Study Guide
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                When a practice question highlights a topic you need to review, PrepFord&apos;s Nursing Study Guide gives you structured subject notes organized by clinical domain—complete with key takeaways, pharmacology warnings, and priority nursing alerts.
              </p>

              <div className="rounded-3xl overflow-hidden shadow-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/illustrations/prepford-study-guide-overview.png"
                  alt="Practical nursing candidate studying clinical notes and pharmacology guides"
                  className="w-full h-60 sm:h-64 object-contain sm:object-cover"
                  loading="lazy"
                />
              </div>

              <div className="pt-2">
                <Button
                  asChild
                  size="lg"
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-sm"
                >
                  <Link href="/study-guide">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Open Full Nursing Study Guide
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Real Study Guide Categories & Subject Links */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Available Nursing Study Guide Domains ({STUDY_GUIDE_CATEGORIES.length})
                </h3>
                <Link
                  href="/study-guide"
                  className="text-xs font-semibold text-secondary hover:underline"
                >
                  View all topics →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {STUDY_GUIDE_CATEGORIES.map((category) => (
                  <div
                    key={category.id}
                    data-testid={`pn-study-domain-${category.slug}`}
                    className="rounded-2xl bg-card/85 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="rounded-full bg-secondary/12 px-2.5 py-0.5 text-[11px] font-semibold text-secondary">
                          {category.badge}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {category.subjects.length}{" "}
                          {category.subjects.length === 1 ? "Topic" : "Topics"}
                        </span>
                      </div>

                      <h4 className="text-base font-serif font-bold text-foreground">
                        <Link
                          href={`/study-guide/${category.slug}`}
                          className="hover:text-secondary transition-colors"
                        >
                          {category.title}
                        </Link>
                      </h4>

                      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {category.description}
                      </p>

                      {category.subjects[0] && (
                        <Link
                          href={`/study-guide/${category.slug}/${category.subjects[0].slug}`}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-foreground/85 hover:text-secondary transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5 text-secondary shrink-0" />
                          <span className="truncate">{category.subjects[0].title}</span>
                        </Link>
                      )}
                    </div>

                    <div className="mt-4 pt-2">
                      <Link
                        href={`/study-guide/${category.slug}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline"
                      >
                        Study {category.shortTitle} Notes
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 5: LEARNING FEATURES SHOWCASE
      ===================================================================== */}
      <section
        data-testid="pn-features-showcase"
        aria-labelledby="pn-features-showcase-heading"
        className="w-full py-20 px-4 sm:px-6 lg:py-28 lg:px-8 bg-card/50"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Platform Capabilities Showcase
            </p>
            <h2
              id="pn-features-showcase-heading"
              className="mt-3 text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Practical Tools Supporting Every Stage of Your NCLEX-PN Prep
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              Explore the core learning tools included in PrepFord. Use the tabs below to inspect how each capability supports your exam preparation.
            </p>
          </div>

          {/* Accessible Interactive Tablist */}
          <div
            role="tablist"
            aria-label="PrepFord NCLEX-PN learning features"
            className="mt-10 flex flex-wrap items-center justify-center gap-2.5"
          >
            {PN_SHOWCASE_FEATURES.map((feature, idx) => {
              const isSelected = activeFeatureIdx === idx;
              return (
                <button
                  key={feature.id}
                  ref={(el) => {
                    tabRefs.current[idx] = el;
                  }}
                  id={`pn-feature-tab-${feature.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`pn-feature-panel-${feature.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setActiveFeatureIdx(idx)}
                  onKeyDown={(e) => handleFeatureTabKeyDown(e, idx)}
                  className={`rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isSelected
                      ? "bg-secondary text-secondary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {feature.tabLabel}
                </button>
              );
            })}
          </div>

          {/* Active Feature Tabpanel */}
          <div
            id={`pn-feature-panel-${activeFeature.id}`}
            role="tabpanel"
            aria-labelledby={`pn-feature-tab-${activeFeature.id}`}
            className="mt-8 rounded-3xl bg-card shadow-xl overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[420px]">
              <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                    <Layers className="h-3.5 w-3.5" />
                    {activeFeature.eyebrow}
                  </span>

                  <h3 className="text-2xl sm:text-3xl font-serif font-bold text-foreground leading-snug">
                    {activeFeature.title}
                  </h3>

                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {activeFeature.description}
                  </p>

                  <ul className="space-y-2.5 pt-2">
                    {activeFeature.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4">
                  <Button
                    asChild
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-sm"
                  >
                    <Link href={activeFeature.ctaHref}>
                      {activeFeature.ctaLabel}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-6 relative min-h-[280px] sm:min-h-[340px] bg-muted overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeFeature.imageSrc}
                  alt={activeFeature.imageAlt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 6: PRODUCT SELECTION AND SUBSCRIPTION PLANS
      ===================================================================== */}
      <section
        id="pn-study-plans"
        data-testid="pn-study-plans"
        aria-labelledby="pn-study-plans-heading"
        className="scroll-mt-20 w-full py-20 px-4 sm:px-6 lg:py-28 lg:px-8 bg-background"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
              NCLEX-PN Study Plans &amp; Pricing
            </p>
            <h2
              id="pn-study-plans-heading"
              className="mt-3 text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Choose the NCLEX-PN Plan That Fits Your Study Timeline
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              Select your preferred access duration below. Every plan includes immediate access to PrepFord&apos;s Nursing Study Guide and option-by-option answer rationales.
            </p>

            {/* Interactive Duration Selector */}
            <div
              role="group"
              aria-label="Select subscription access duration"
              className="mt-8 inline-flex items-center gap-1.5 rounded-2xl bg-muted p-1.5"
            >
              <button
                type="button"
                data-testid="duration-toggle-month"
                aria-pressed={selectedDuration === "month"}
                onClick={() => setSelectedDuration("month")}
                className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selectedDuration === "month"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                30-Day Monthly Access
              </button>
              <button
                type="button"
                data-testid="duration-toggle-quarter"
                aria-pressed={selectedDuration === "quarter"}
                onClick={() => setSelectedDuration("quarter")}
                className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selectedDuration === "quarter"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>90-Day Quarterly Access</span>
                <span className="rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">
                  Save up to $38
                </span>
              </button>
            </div>
          </div>

          {planError && (
            <div
              role="alert"
              className="mt-6 max-w-xl mx-auto rounded-xl bg-destructive/10 p-4 text-center text-xs font-medium text-destructive"
            >
              {planError}
            </div>
          )}

          {/* Plan Cards Grid */}
          <div className="mt-14 grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {pnPlans.map((plan) => {
              const isSubmitting = submittingPlanId === plan.id;
              const isAdded = addedPlanId === plan.id;
              const savings =
                plan.originalPrice && plan.originalPrice > plan.price
                  ? plan.originalPrice - plan.price
                  : null;

              return (
                <Card
                  key={plan.id}
                  data-testid={`pn-plan-card-${plan.planType}`}
                  className={`flex flex-col h-full relative rounded-3xl bg-card transition-shadow hover:shadow-xl ${
                    plan.popular ? "ring-2 ring-secondary shadow-lg" : "shadow-md"
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-4 py-1 text-xs font-semibold text-secondary-foreground shadow-sm">
                      Recommended for PN Candidates
                    </Badge>
                  )}

                  <CardHeader className="p-6 sm:p-8 pb-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className="border-secondary/30 bg-secondary/10 text-secondary text-xs font-semibold"
                      >
                        {plan.pathway === "Both" ? "PN + RN Dual Track" : "NCLEX-PN Pathway"}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {plan.durationLabel}
                      </span>
                    </div>

                    <CardTitle className="text-2xl font-serif font-bold text-foreground">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                      {plan.audience ?? plan.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="px-6 sm:px-8 pt-2 flex-1 space-y-6">
                    {/* Price Display */}
                    <div className="rounded-2xl bg-muted/50 p-4">
                      <div className="flex items-baseline gap-2">
                        <span
                          data-testid={`pn-plan-price-${plan.planType}`}
                          className="text-4xl font-serif font-bold text-foreground"
                        >
                          ${plan.price}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {plan.currency} / {plan.billingInterval === "quarter" ? "90 days" : "month"}
                        </span>
                        {plan.originalPrice && (
                          <span className="text-xs text-muted-foreground line-through ml-auto">
                            ${plan.originalPrice}
                          </span>
                        )}
                      </div>
                      {savings && (
                        <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          Save ${savings} USD compared to 3 separate monthly renewals
                        </p>
                      )}
                    </div>

                    {/* Features List */}
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-foreground block mb-3">
                        Included in this plan:
                      </span>
                      <ul className="space-y-2.5">
                        {plan.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90"
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>

                  <CardFooter className="p-6 sm:p-8 pt-4 flex flex-col gap-3">
                    <Button
                      type="button"
                      size="lg"
                      disabled={Boolean(submittingPlanId)}
                      data-testid={`select-plan-${plan.id}`}
                      onClick={() => handleSelectProduct(plan.id)}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-sm h-12 px-4 inline-flex items-center justify-center"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
                      {isSubmitting || isAdded ? (
                        <span>Adding to Cart...</span>
                      ) : (
                        <>
                          <span className="truncate">
                            Choose {plan.planType === "pro" ? "Complete Prep" : plan.planType === "starter" ? "Starter Review" : "All-Access"}
                          </span>
                          <span className="sr-only">for {plan.name} at ${plan.price} {plan.currency}</span>
                        </>
                      )}
                    </Button>
                    <p className="text-[11px] text-center text-muted-foreground">
                      Single-seat candidate license • Manage anytime in account settings
                    </p>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 7: PLAN COMPARISON
      ===================================================================== */}
      <section
        data-testid="pn-plan-comparison"
        aria-labelledby="pn-plan-comparison-heading"
        className="w-full py-20 px-4 sm:px-6 lg:py-24 lg:px-8 bg-muted/35"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Side-by-Side Plan Comparison
            </p>
            <h2
              id="pn-plan-comparison-heading"
              className="mt-3 text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Compare Available NCLEX-PN Study Plans
            </h2>
            <p className="mt-4 text-sm sm:text-base text-muted-foreground">
              Review the exact features, durations, and entitlements included in each PrepFord subscription tier.
            </p>
          </div>

          <div className="mt-12 rounded-3xl bg-card shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left border-collapse">
                <thead>
                  <tr className="bg-muted/70 text-foreground">
                    <th scope="col" className="py-4 px-6 text-xs font-bold uppercase tracking-wider">
                      Included Capability
                    </th>
                    <th scope="col" className="py-4 px-6 text-xs font-bold uppercase tracking-wider">
                      PN Starter Review
                    </th>
                    <th
                      scope="col"
                      className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-secondary"
                    >
                      PN Complete Prep (Pro)
                    </th>
                    <th scope="col" className="py-4 px-6 text-xs font-bold uppercase tracking-wider">
                      RN &amp; PN All-Access
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-xs sm:text-sm">
                  {PN_COMPARISON_ROWS.map((row) => (
                    <tr key={row.feature} className="hover:bg-muted/30 transition-colors">
                      <th scope="row" className="py-4 px-6 font-medium text-foreground">
                        {row.feature}
                      </th>
                      <td className="py-4 px-6 text-muted-foreground">
                        {typeof row.starter === "boolean" ? (
                          row.starter ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <Check className="h-4 w-4" aria-hidden="true" />
                              <span>Included</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )
                        ) : (
                          row.starter
                        )}
                      </td>
                      <td className="py-4 px-6 font-medium text-foreground bg-secondary/5">
                        {typeof row.pro === "boolean" ? (
                          row.pro ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <Check className="h-4 w-4" aria-hidden="true" />
                              <span>Included</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )
                        ) : (
                          row.pro
                        )}
                      </td>
                      <td className="py-4 px-6 text-muted-foreground">
                        {typeof row.premium === "boolean" ? (
                          row.premium ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <Check className="h-4 w-4" aria-hidden="true" />
                              <span>Included</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )
                        ) : (
                          row.premium
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 8: STANDALONE ASSESSMENT PRODUCT (NCLEX-PN READINESS PACK)
      ===================================================================== */}
      {readinessPack && (
        <section
          data-testid="pn-standalone-assessment"
          aria-labelledby="pn-standalone-assessment-heading"
          className="w-full py-20 px-4 sm:px-6 lg:py-24 lg:px-8 bg-background"
        >
          <div className="mx-auto max-w-7xl">
            <div className="rounded-3xl bg-card shadow-lg p-6 sm:p-10 lg:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-secondary text-secondary-foreground text-xs font-semibold">
                      Standalone Assessment Product
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground">
                      {readinessPack.durationLabel} • No Recurring Subscription Required
                    </span>
                  </div>

                  <h2
                    id="pn-standalone-assessment-heading"
                    className="text-2xl sm:text-3xl font-serif font-bold text-foreground"
                  >
                    {readinessPack.name}
                  </h2>

                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                    {readinessPack.description} Ideal for practical nursing candidates who already have a study routine and want standalone timed assessments with full rationale review before exam day.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {readinessPack.features.map((feat) => (
                      <div key={feat} className="flex items-center gap-2 text-xs sm:text-sm text-foreground/90">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-4 rounded-2xl bg-muted/60 p-6 text-center space-y-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                      One-Time Pack Price
                    </span>
                    <div className="mt-1 flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-serif font-bold text-foreground">
                        ${readinessPack.price}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {readinessPack.currency}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="lg"
                    disabled={Boolean(submittingPlanId)}
                    data-testid="select-plan-pn-readiness"
                    onClick={() => handleSelectProduct(readinessPack.id)}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-sm h-12 px-4 inline-flex items-center justify-center"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
                    {submittingPlanId === readinessPack.id ? (
                      <span>Adding Pack...</span>
                    ) : (
                      <>
                        <span className="truncate">Add Assessment Pack</span>
                        <span className="sr-only">for ${readinessPack.price}</span>
                      </>
                    )}
                  </Button>

                  <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-secondary shrink-0" />
                    <span>Note: 3 assessments are already included in PN Complete Prep</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          SECTION 9: FINAL CTA
      ===================================================================== */}
      <section
        data-testid="pn-final-cta"
        aria-labelledby="pn-final-cta-heading"
        className="w-full py-20 px-4 sm:px-6 lg:py-24 lg:px-8 bg-background"
      >
        <div className="mx-auto max-w-7xl">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0F766E] via-[#115E59] to-[#142B4A] dark:from-[#0F293A] dark:via-[#0D3B38] dark:to-[#0B1220] shadow-xl">
            <div className="relative px-6 py-16 lg:px-12 lg:py-20 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-200">
                Take Your Next Step With PrepFord
              </p>
              <h2
                id="pn-final-cta-heading"
                className="mt-3 text-3xl font-serif font-semibold tracking-tight text-white sm:text-4xl"
              >
                Start Preparing for Your NCLEX-PN Exam Today
              </h2>
              <p className="mt-5 max-w-2xl mx-auto text-white/90 text-base sm:text-lg leading-relaxed">
                Select a study plan tailored to your exam timeline, explore the 7-domain Nursing Study Guide, or create your candidate account to begin practicing.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4">
                <Button
                  size="lg"
                  asChild
                  className="w-full sm:w-auto bg-white text-[#142B4A] hover:bg-slate-100 hover:text-[#142B4A] font-semibold shadow-md rounded-xl px-7"
                >
                  <a href="#pn-study-plans">Choose a PN Study Plan</a>
                </Button>

                <Button
                  size="lg"
                  asChild
                  className="w-full sm:w-auto bg-teal-400 text-slate-950 hover:bg-teal-300 hover:text-slate-950 font-semibold shadow-md rounded-xl px-7"
                >
                  <Link href="/study-guide">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Browse Study Guide
                  </Link>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="w-full sm:w-auto bg-white/10 border-white/80 text-white hover:bg-white/20 hover:text-white font-semibold rounded-xl px-7"
                >
                  {isAuthenticated ? (
                    <Link href="/dashboard">Open Student Workspace</Link>
                  ) : (
                    <Link href="/sign-up">Create Free Account</Link>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 10: FAQS
      ===================================================================== */}
      <section
        data-testid="pn-faq-section"
        aria-labelledby="pn-faq-heading"
        className="w-full pt-12 pb-24 px-4 sm:px-6 lg:pt-16 lg:pb-32 lg:px-8 bg-background"
      >
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
              NCLEX-PN Frequently Asked Questions
            </p>
            <h2
              id="pn-faq-heading"
              className="mt-3 text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Answers to Common NCLEX-PN Preparation Questions
            </h2>
            <p className="mt-4 text-sm sm:text-base text-muted-foreground">
              Clear answers about PrepFord&apos;s practical nursing study resources, subscription durations, and account access.
            </p>
          </div>

          <div className="mt-12 space-y-3">
            {PN_FAQS.map((item) => {
              const isOpen = openFaqId === item.id;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-card shadow-xs overflow-hidden"
                >
                  <h3>
                    <button
                      type="button"
                      id={`faq-trigger-${item.id}`}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${item.id}`}
                      onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                      className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left text-base font-serif font-bold text-foreground hover:text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex items-center gap-3">
                        <HelpCircle className="h-4 w-4 text-secondary shrink-0" aria-hidden="true" />
                        <span>{item.question}</span>
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-secondary" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  </h3>
                  {isOpen && (
                    <div
                      id={`faq-panel-${item.id}`}
                      role="region"
                      aria-labelledby={`faq-trigger-${item.id}`}
                      className="px-6 pb-5 pt-0 text-sm text-muted-foreground leading-relaxed pl-13"
                    >
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-10 text-center text-xs sm:text-sm text-muted-foreground">
            Have another question? Visit our{" "}
            <Link href="/faq" className="font-semibold text-secondary hover:underline">
              Full FAQ Directory
            </Link>{" "}
            or{" "}
            <Link href="/contact" className="font-semibold text-secondary hover:underline">
              Contact Our Support Team
            </Link>
            .
          </div>
        </div>
      </section>
    </div>
  );
}
