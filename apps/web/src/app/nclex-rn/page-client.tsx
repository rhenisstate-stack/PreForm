"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ArrowRight,
  Stethoscope,
  BookOpen,
  HeartPulse,
  ClipboardCheck,
  BarChart3,
  FileText,
  Check,
  ChevronDown,
  RotateCcw,
  AlertCircle,
  Compass,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { getProductById, type Product } from "@/lib/products";
import { STUDY_GUIDE_CATEGORIES } from "@/lib/study-guide-data";
import { BRAND } from "@/lib/brand";
import { CourseFinderQuiz } from "@/components/home/course-finder";

type BillingDuration = "month" | "quarter";
type RnTierKey = "starter" | "pro" | "premium";

const PLAN_IDS_BY_DURATION: Record<BillingDuration, Record<RnTierKey, string>> = {
  month: {
    starter: "rn-starter",
    pro: "rn-pro",
    premium: "prep-premium",
  },
  quarter: {
    starter: "rn-starter-90",
    pro: "rn-pro-90",
    premium: "prep-premium-90",
  },
};

interface SampleOption {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
  rationale: string;
}

const SAMPLE_RN_QUESTION = {
  category: "Physiological Adaptation & Acute Care",
  topic: "Postoperative Cardiopulmonary Priority & Oxygenation",
  clientHeader: "Client: 68-year-old female | Post-Op Day 2: Total Hip Arthroplasty | Unit: Orthopedic Telemetry",
  vitals: "BP 136/84 mmHg • HR 114/min • RR 28/min • SpO₂ 88% on room air • Temp 37.3°C (99.1°F)",
  stem: "A nurse assesses a client two days after a right total hip arthroplasty who suddenly reports sharp pleuritic chest pain and shortness of breath. Lung auscultation reveals clear bilateral breath sounds, and the client appears anxious and tachypneic. Which nursing action is the immediate priority?",
  options: [
    {
      id: "A",
      label: "A",
      text: "Elevate the head of the bed to high-Fowler's position and apply supplemental oxygen.",
      isCorrect: true,
      rationale:
        "Correct. Sudden dyspnea, pleuritic chest pain, tachycardia, and hypoxemia (SpO₂ 88%) two days after orthopedic surgery are classic cues for a suspected pulmonary embolism. Applying the Airway and Breathing priority framework, the nurse must immediately optimize ventilation-perfusion matching by elevating the head of the bed and administering supplemental oxygen while summoning the rapid response or healthcare team.",
    },
    {
      id: "B",
      label: "B",
      text: "Obtain a 12-lead electrocardiogram (ECG) and draw a STAT venous D-dimer level.",
      isCorrect: false,
      rationale:
        "Incorrect. Although diagnostic testing helps evaluate acute cardiopulmonary events, leaving a hypoxic client (SpO₂ 88%) unassisted or delaying oxygen delivery to perform diagnostics violates the ABC priority framework.",
    },
    {
      id: "C",
      label: "C",
      text: "Prepare a weight-based unfractionated heparin bolus per facility protocol.",
      isCorrect: false,
      rationale:
        "Incorrect. Anticoagulation requires a confirmed provider order and diagnostic evaluation (especially in a recent postoperative joint replacement client with bleeding risk). Stabilizing oxygenation comes first.",
    },
    {
      id: "D",
      label: "D",
      text: "Instruct the client to perform ten sustained breaths using the bedside incentive spirometer.",
      isCorrect: false,
      rationale:
        "Incorrect. Incentive spirometry prevents postoperative atelectasis, but it will not correct acute hypoxemia from a suspected pulmonary embolism and increases respiratory fatigue in an acutely dyspneic client.",
    },
  ] as SampleOption[],
  takeaway:
    "When postoperative orthopedic clients develop sudden hypoxemia and pleuritic chest pain, prioritize immediate oxygenation and high-Fowler's positioning before diagnostic workups or pharmacological orders.",
};

interface FeatureHighlightTab {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
  previewBadge: string;
  previewTitle: string;
  previewLines: { label: string; value: string; status: string }[];
}

const FEATURE_HIGHLIGHT_TABS: FeatureHighlightTab[] = [
  {
    id: "qbank",
    label: "RN Question Practice",
    eyebrow: "Clinical Scenario Question Bank",
    title: "Practice NCLEX-RN prioritization, delegation, and acute care items",
    description:
      "Work through clinical scenario questions modeled around registered nurse responsibilities: unstable client prioritization, delegation to LPNs/UAPs, intravenous medication titration, and physiological adaptation.",
    bullets: [
      "Filter practice sessions by NCLEX-RN Client Needs category or nursing specialty",
      "Examine structured bedside vital signs, lab trends, and postoperative cues in each stem",
      "Practice distinguishing stable vs. unstable presentations before selecting an intervention",
    ],
    ctaLabel: "Open RN Practice Catalog",
    ctaHref: "/courses?programme=RN",
    previewBadge: "NCLEX-RN Item Format",
    previewTitle: "Management of Care & Prioritization Cue Check",
    previewLines: [
      { label: "Clinical Setting", value: "Medical-Surgical / Telemetry / ICU Step-Down", status: "Active" },
      { label: "RN Scope Focus", value: "Initial Assessment, IV Titration & Delegation", status: "Verified" },
      { label: "Question Structure", value: "Clinical Vignette + 4 Single-Best-Answer Options", status: "Ready" },
    ],
  },
  {
    id: "rationales",
    label: "Option-by-Option Rationales",
    eyebrow: "Deep Clinical Reasoning",
    title: "Understand why the priority intervention is right—and why each distractor is unsafe",
    description:
      "Every PrepFord practice question pairs the correct answer explanation with option-by-option distractor analysis so you learn to spot premature diagnostics, scope-of-practice errors, and delayed airway actions.",
    bullets: [
      "Detailed explanation for the keyed correct nursing intervention",
      "Specific clinical breakdown for every incorrect option (A, B, C, and D)",
      "Concise clinical judgment takeaway summarizing the nursing safety rule",
    ],
    ctaLabel: "Try the Sample Question Above",
    ctaHref: "#rn-question-experience",
    previewBadge: "Rationale Architecture",
    previewTitle: "Structured Correct & Distractor Review",
    previewLines: [
      { label: "Keyed Intervention", value: "Airway & oxygenation before diagnostic delays", status: "Correct" },
      { label: "Distractor Analysis", value: "Identifies scope, timing, or safety pitfalls", status: "Included" },
      { label: "Bedside Takeaway", value: "1-sentence clinical rule for rapid recall", status: "Included" },
    ],
  },
  {
    id: "study-guide",
    label: "7-Domain Study Guide",
    eyebrow: "Structured Nursing Reference Notes",
    title: "Connect every missed question directly to concise Nursing Study Guide notes",
    description:
      "Move seamlessly between question practice and PrepFord's 7-domain Nursing Study Guide covering Medical-Surgical, Pharmacology, Maternal & Newborn, Pediatrics, Mental Health, Fundamentals, and Leadership.",
    bullets: [
      `Organized into ${STUDY_GUIDE_CATEGORIES.length} core nursing categories with ${STUDY_GUIDE_CATEGORIES.reduce((acc, cat) => acc + cat.subjects.length, 0)} structured subject guides`,
      "Includes pathophysiology summaries, nursing priorities, and red-flag complications",
      "Built-in topic search, clinical alert callouts, essential nursing action items, and printable study notes",
    ],
    ctaLabel: "Browse the Nursing Study Guide",
    ctaHref: "/study-guide",
    previewBadge: "7 Nursing Domains",
    previewTitle: "Integrated Study Guide & Clinical Pearls",
    previewLines: [
      { label: "Medical-Surgical & Pharm", value: "Hemodynamics, Shock, Insulins & Anticoagulants", status: "Open Access" },
      { label: "Maternal, Peds & Psych", value: "Fetal Heart Monitoring, Growth & Crisis Safety", status: "Open Access" },
      { label: "Leadership & Delegation", value: "RN vs. LPN vs. UAP Scope & Triage Rules", status: "Open Access" },
    ],
  },
  {
    id: "workspace",
    label: "Domain Performance Workspace",
    eyebrow: "Readiness & Accuracy Tracking",
    title: "Monitor your accuracy across NCLEX-RN Client Needs domains",
    description:
      "Your PrepFord Student Workspace records completed practice exams, tracks domain-level accuracy, and surfaces your weakest subjects so your next study session targets real knowledge gaps.",
    bullets: [
      "Domain accuracy bars for Management of Care, Pharmacology, Risk Reduction, and Physiological Adaptation",
      "Server-scored timed assessments with immediate post-exam rationale review",
      "Resume in-progress exam attempts or launch targeted remediation sets from your dashboard",
    ],
    ctaLabel: "Explore Student Workspace",
    ctaHref: "/dashboard",
    previewBadge: "Student Workspace",
    previewTitle: "NCLEX-RN Client Needs Domain Breakdown",
    previewLines: [
      { label: "Management of Care & Leadership", value: "Prioritization, Delegation & Legal Ethics", status: "Tracked" },
      { label: "Pharmacological & Parenteral", value: "High-Alert IV Meds, Titration & Toxicity", status: "Tracked" },
      { label: "Physiological Adaptation", value: "Acute Hemodynamic & Respiratory Alterations", status: "Tracked" },
    ],
  },
];

const RN_TESTIMONIALS = [
  {
    id: "rn-1",
    quote:
      "The clinical rationales helped me stop memorizing isolated facts and start thinking through priority nursing actions. Breaking down why each distractor was unsafe changed how I approached multisystem questions.",
    author: "Alex R., BSN",
    role: "NCLEX-RN Candidate",
    focus: "Physiological Adaptation & Prioritization",
  },
  {
    id: "rn-2",
    quote:
      "Having the Study Guide organized right alongside the question bank made my daily review sessions much calmer. Whenever I missed a pharmacology question, I could review the exact medication class notes in minutes.",
    author: "Jordan M., RN",
    role: "Registered Nurse Pathway",
    focus: "Pharmacology & Parenteral Therapies",
  },
  {
    id: "rn-3",
    quote:
      "The interface stays clean and distraction-free in both light and dark modes, which made a huge difference during late-evening study blocks after clinical rotations.",
    author: "Morgan L., BSN",
    role: "NCLEX-RN Candidate",
    focus: "Management of Care & Delegation",
  },
  {
    id: "rn-4",
    quote:
      "I appreciated that the readiness assessments gave me a straightforward breakdown by nursing domain instead of overwhelming charts. I knew right away to spend my final two weeks on maternal-newborn and endocrine care.",
    author: "Casey P., ADN",
    role: "NCLEX-RN Candidate",
    focus: "Domain Readiness & Remediation",
  },
];

function buildHealthySinusEcgPath(): string {
  const baselineY = 62;
  const cycleWidth = 360;
  const cycles = 4;
  const segments: string[] = [`M 0 ${baselineY}`];

  for (let i = 0; i < cycles; i++) {
    const x0 = i * cycleWidth;
    // Isoelectric baseline lead-in before P wave
    const pStart = x0 + 55;
    // P wave: smooth rounded atrial depolarization dome (duration 28u, peak y=51)
    const pPeak = pStart + 14;
    const pEnd = pStart + 28;
    // PR segment: brief AV nodal conduction pause at baseline (16u)
    const qStart = pEnd + 16;
    // QRS complex: narrow, crisp ventricular depolarization (22u total)
    const qDip = qStart + 4;
    const rPeak = qStart + 10;
    const sDip = qStart + 16;
    const jPoint = qStart + 22;
    // ST segment: flat isoelectric segment (20u)
    const tStart = jPoint + 20;
    // T wave: smooth, slightly asymmetric ventricular repolarization dome (44u, peak y=43)
    const tPeak = tStart + 24;
    const tEnd = tStart + 44;
    // TP baseline interval (diastole) to end of cardiac cycle
    const cycleEnd = x0 + cycleWidth;

    segments.push(
      `L ${pStart} ${baselineY}`,
      `C ${pStart + 5} ${baselineY}, ${pPeak - 6} 51, ${pPeak} 51`,
      `C ${pPeak + 6} 51, ${pEnd - 5} ${baselineY}, ${pEnd} ${baselineY}`,
      `L ${qStart} ${baselineY}`,
      `L ${qDip} 69`,
      `L ${rPeak} 14`,
      `L ${sDip} 80`,
      `L ${jPoint} ${baselineY}`,
      `L ${tStart} ${baselineY}`,
      `C ${tStart + 8} ${baselineY}, ${tPeak - 9} 43, ${tPeak} 43`,
      `C ${tPeak + 8} 43, ${tEnd - 6} ${baselineY}, ${tEnd} ${baselineY}`,
      `L ${cycleEnd} ${baselineY}`
    );
  }

  return segments.join(" ");
}

const RN_HERO_HEALTHY_ECG_PATH = buildHealthySinusEcgPath();

function buildRnFaqItems() {
  const starterMonth = getProductById("rn-starter");
  const starterQuarter = getProductById("rn-starter-90");
  const proMonth = getProductById("rn-pro");
  const proQuarter = getProductById("rn-pro-90");
  const bundleMonth = getProductById("prep-premium");
  const bundleQuarter = getProductById("prep-premium-90");
  const readiness = getProductById("rn-readiness");

  const starterMonthlyPrice = starterMonth?.price ?? 29;
  const starterQuarterlyPrice = starterQuarter?.price ?? 75;
  const starterQuarterlyOriginal = starterQuarter?.originalPrice ?? starterMonthlyPrice * 3;
  const starterSavings = starterQuarterlyOriginal - starterQuarterlyPrice;

  const proMonthlyPrice = proMonth?.price ?? 59;
  const proQuarterlyPrice = proQuarter?.price ?? 149;
  const proQuarterlyOriginal = proQuarter?.originalPrice ?? proMonthlyPrice * 3;
  const proSavings = proQuarterlyOriginal - proQuarterlyPrice;

  const bundleMonthlyPrice = bundleMonth?.price ?? 89;
  const bundleQuarterlyPrice = bundleQuarter?.price ?? 229;
  const bundleQuarterlyOriginal = bundleQuarter?.originalPrice ?? bundleMonthlyPrice * 3;
  const bundleSavings = bundleQuarterlyOriginal - bundleQuarterlyPrice;

  const readinessPrice = readiness?.price ?? 39;

  const domainCount = STUDY_GUIDE_CATEGORIES.length;
  const totalSubjectCount = STUDY_GUIDE_CATEGORIES.reduce(
    (sum, cat) => sum + cat.subjects.length,
    0
  );
  const domainTitles = STUDY_GUIDE_CATEGORIES.map((cat) => cat.title).join(", ");

  return [
    {
      id: "faq-rn-what-is-included",
      question: "What resources are included in PrepFord's NCLEX-RN preparation platform?",
      answer: `PrepFord's NCLEX-RN preparation platform brings together an RN clinical practice question bank with option-by-option rationales, a ${domainCount}-domain Nursing Study Guide covering ${totalSubjectCount} structured subject guides, timed readiness assessment packs, and a Student Workspace for organizing your exam review.`,
    },
    {
      id: "faq-rn-plans-difference",
      question:
        "How do NCLEX-RN Starter Review, Complete Preparation (Pro), and RN & PN All-Access differ?",
      answer: `${starterMonth?.name ?? "NCLEX-RN Starter Review"} ($${starterMonthlyPrice}/month or $${starterQuarterlyPrice}/quarter) includes foundational RN practice questions, full answer rationales, ${domainCount}-domain Study Guide access, and basic topic progress tracking. ${proMonth?.name ?? "NCLEX-RN Complete Preparation"} ($${proMonthlyPrice}/month or $${proQuarterlyPrice}/quarter) adds the full NCLEX-RN question bank, full-length practice exams, 3 readiness assessments, and topic-level accuracy tracking. ${bundleMonth?.name ?? "NCLEX-RN & PN All-Access"} ($${bundleMonthlyPrice}/month or $${bundleQuarterlyPrice}/quarter) includes both RN and PN question banks, multi-step clinical scenario items, and priority educator email support.`,
    },
    {
      id: "faq-rn-durations",
      question: "What is the difference between 30-day monthly and 90-day quarterly access?",
      answer:
        "Both durations provide identical feature access within your chosen tier. The 30-Day Monthly Access option is tailored for candidates in their final 2 to 4 weeks before exam day, while the 90-Day Quarterly Access option provides a full three-month study window at a lower effective monthly rate.",
    },
    {
      id: "faq-rn-quarterly-savings",
      question: "How is the 90-day quarterly price and saving calculated?",
      answer: `Each 90-day quarterly plan is compared directly against three consecutive 30-day monthly terms in the PrepFord catalog: Starter Review is $${starterQuarterlyPrice} instead of $${starterQuarterlyOriginal} (saving $${starterSavings}), Complete Preparation is $${proQuarterlyPrice} instead of $${proQuarterlyOriginal} (saving $${proSavings}), and RN & PN All-Access is $${bundleQuarterlyPrice} instead of $${bundleQuarterlyOriginal} (saving $${bundleSavings}).`,
    },
    {
      id: "faq-rn-all-access-bundle",
      question: "What does the NCLEX-RN & PN All-Access plan cover?",
      answer: `The ${bundleMonth?.name ?? "NCLEX-RN & PN All-Access"} plan ($${bundleMonthlyPrice}/month or $${bundleQuarterlyPrice}/quarter) is designed for bridge-program students (LPN-to-RN/BSN), dual-pathway cohorts, and nursing tutors who want simultaneous access to both the NCLEX-RN and NCLEX-PN question banks, Study Guide notes, readiness assessments, and priority educator email support.`,
    },
    {
      id: "faq-rn-readiness-pack",
      question: "What is the NCLEX-RN Readiness Assessment Pack, and how is it purchased?",
      answer: `The ${readiness?.name ?? "NCLEX-RN Readiness Assessment Pack"} is a standalone $${readinessPrice} one-time purchase that includes 3 timed, full-length RN readiness assessments, a Client Needs domain score breakdown, and complete post-exam rationale review. You can add it directly to your cart from this page without purchasing a monthly or quarterly plan.`,
    },
    {
      id: "faq-rn-study-guide-domains",
      question: "What nursing domains are included in the Study Guide?",
      answer: `The PrepFord Nursing Study Guide at /study-guide organizes ${totalSubjectCount} clinical subject guides across ${domainCount} core nursing domains: ${domainTitles}. You can browse the domain hubs and clinical review notes directly in your browser.`,
    },
    {
      id: "faq-rn-questions-rationales",
      question: "How do the clinical practice questions and answer rationales work?",
      answer:
        "Each practice item presents a patient scenario with relevant vital signs, laboratory findings, or bedside observations. After you submit your answer, PrepFord displays the physiological and safety rationale for the correct nursing intervention alongside clear explanations of why each distractor option is unsafe, premature, or lower priority.",
    },
    {
      id: "faq-rn-ngn-clinical-judgment",
      question: "How does PrepFord support clinical judgment and NGN preparation?",
      answer:
        "PrepFord structures its clinical vignettes and Study Guide notes around the six cognitive steps of the NCSBN Clinical Judgment Measurement Model: recognizing cues, analyzing cues, prioritizing hypotheses, generating solutions, taking priority nursing action, and evaluating patient outcomes.",
    },
    {
      id: "faq-rn-progress-tracking",
      question: "How can students track their study progress?",
      answer:
        "Signed-in learners can open the Learner Dashboard (/dashboard) to resume their most recent study activity, switch between NCLEX-RN and NCLEX-PN pathways, and view active plan status. Note that server-synced question bank telemetry and scored readiness assessment history are in active backend development, so personal accuracy percentages are not displayed until live attempt data is connected.",
    },
    {
      id: "faq-rn-checkout-activation",
      question: "How does access begin after selecting a study plan?",
      answer:
        "Selecting any study plan or the Readiness Assessment Pack adds that exact catalog item to your PrepFord Cart (/cart). Proceeding through Checkout currently uses Phase 4 developer sandbox entitlement activation—your selected plan is linked immediately to your signed-in account in the Learner Dashboard (/dashboard) and Profile (/profile) without charging a live payment card.",
    },
    {
      id: "faq-rn-cart-pending-payment",
      question: "What happens if an item remains in the cart or payment has not been completed?",
      answer:
        "Your selected plan stays saved in your browser's PrepFord Cart (/cart) so you can review your selection, switch between 30-day and 90-day durations, or sign in before completing checkout. Plan entitlements are only activated on your account once checkout confirmation is completed.",
    },
    {
      id: "faq-rn-account-access",
      question: "How can users access their account after logging in?",
      answer:
        "After signing in at /sign-in, you land directly on the authenticated Learner Dashboard (/dashboard)—or on the specific internal page you requested, such as /cart—with top-header navigation giving you direct access to Study Guides (/study-guide), Courses (/courses), Cart (/cart), and Profile (/profile).",
    },
    {
      id: "faq-rn-troubleshooting-auth",
      question: "What should a user do if access or sign-in is not working?",
      answer:
        "First, confirm that you are using the email address associated with your PrepFord account and that cookies and local storage are enabled in your browser. If a newly selected plan does not appear on /dashboard, verify that checkout was completed at /checkout or reach out to our team via /contact.",
    },
    {
      id: "faq-rn-support",
      question: "How can users contact support?",
      answer:
        "You can reach our academic and technical support team anytime through the Contact Support page (/contact) for help with study plans, account access, or nursing content questions, or browse general platform questions at /faq.",
    },
    {
      id: "faq-rn-exam-outcomes-disclaimer",
      question: "What should users know about exam outcomes and pass guarantees?",
      answer:
        "PrepFord is an independent nursing education resource and is not affiliated with or endorsed by NCSBN. Individual NCLEX-RN outcomes depend on each candidate's accredited nursing education and clinical preparation; PrepFord does not offer pass guarantees, pass-rate promises, or official exam score predictions.",
    },
  ];
}

const RN_FAQ_ITEMS = buildRnFaqItems();

export function NCLEXRNPageClient() {
  const router = useRouter();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();

  // Section 2: Interactive product & duration selector state
  const [selectedDuration, setSelectedDuration] = React.useState<BillingDuration>("quarter");
  const [selectedTier, setSelectedTier] = React.useState<RnTierKey>("pro");
  const [submittingPlanId, setSubmittingPlanId] = React.useState<string | null>(null);
  const [selectionError, setSelectionError] = React.useState<string | null>(null);

  // Section 5: Interactive sample question state
  const [selectedOptionId, setSelectedOptionId] = React.useState<string | null>(null);
  const [isQuestionSubmitted, setIsQuestionSubmitted] = React.useState(false);

  // Section 7: Feature highlights active tab state
  const [activeFeatureTab, setActiveFeatureTab] = React.useState<string>(FEATURE_HIGHLIGHT_TABS[0].id);

  // Section 16: FAQ open item state
  const [openFaqId, setOpenFaqId] = React.useState<string | null>(RN_FAQ_ITEMS[0].id);

  const activePlans = React.useMemo(() => {
    const ids = PLAN_IDS_BY_DURATION[selectedDuration];
    return (["starter", "pro", "premium"] as RnTierKey[])
      .map((tier) => ({
        tier,
        product: getProductById(ids[tier]),
      }))
      .filter((entry): entry is { tier: RnTierKey; product: Product } => Boolean(entry.product));
  }, [selectedDuration]);

  const activeSelectedProduct = React.useMemo(() => {
    const id = PLAN_IDS_BY_DURATION[selectedDuration][selectedTier];
    return getProductById(id) ?? getProductById("rn-pro");
  }, [selectedDuration, selectedTier]);

  const activeQuarterlySavings = React.useMemo(() => {
    const quarterlyId = PLAN_IDS_BY_DURATION.quarter[selectedTier];
    const quarterlyProduct = getProductById(quarterlyId);
    if (
      quarterlyProduct &&
      typeof quarterlyProduct.originalPrice === "number" &&
      quarterlyProduct.originalPrice > quarterlyProduct.price
    ) {
      return quarterlyProduct.originalPrice - quarterlyProduct.price;
    }
    return null;
  }, [selectedTier]);

  const handleDurationKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
        e.preventDefault();
        const nextDuration: BillingDuration =
          e.key === "Home"
            ? "month"
            : e.key === "End"
              ? "quarter"
              : selectedDuration === "month"
                ? "quarter"
                : "month";
        setSelectedDuration(nextDuration);
        const targetTestId =
          nextDuration === "month" ? "rn-duration-toggle-month" : "rn-duration-toggle-quarter";
        const targetBtn = document.querySelector<HTMLButtonElement>(
          `[data-testid="${targetTestId}"]`
        );
        targetBtn?.focus();
      }
    },
    [selectedDuration]
  );

  const readinessProduct = React.useMemo(() => getProductById("rn-readiness"), []);

  const handleSelectPlan = React.useCallback(
    (productId: string) => {
      if (submittingPlanId) return;
      setSelectionError(null);

      const product = getProductById(productId);
      if (!product) {
        setSelectionError("The selected study plan could not be found. Please refresh and try again.");
        return;
      }

      setSubmittingPlanId(product.id);
      try {
        addItem(product.id);
        router.push(`/cart?add=${encodeURIComponent(product.id)}`);
        setTimeout(() => setSubmittingPlanId(null), 600);
      } catch {
        setSelectionError("Unable to add plan to cart right now. Please try again.");
        setSubmittingPlanId(null);
      }
    },
    [addItem, router, submittingPlanId]
  );

  const handleCheckSampleAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOptionId) return;
    setIsQuestionSubmitted(true);
  };

  const handleResetSampleQuestion = () => {
    setSelectedOptionId(null);
    setIsQuestionSubmitted(false);
  };

  const handleFeatureTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = FEATURE_HIGHLIGHT_TABS.length;
    let nextIndex: number | null = null;

    if (e.key === "ArrowRight") {
      nextIndex = (index + 1) % count;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (index - 1 + count) % count;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = count - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = FEATURE_HIGHLIGHT_TABS[nextIndex];
      setActiveFeatureTab(nextTab.id);
      const nextButton = document.getElementById(`rn-feature-tab-${nextTab.id}`);
      nextButton?.focus();
    }
  };

  const selectedSampleOption = SAMPLE_RN_QUESTION.options.find((o) => o.id === selectedOptionId);
  const currentFeatureTab =
    FEATURE_HIGHLIGHT_TABS.find((tab) => tab.id === activeFeatureTab) ?? FEATURE_HIGHLIGHT_TABS[0];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-secondary/20">
      {/* =====================================================================
          SECTION 1: IMMERSIVE HERO
         ===================================================================== */}
      <section
        data-testid="nclex-rn-hero"
        aria-labelledby="nclex-rn-hero-heading"
        className="relative w-full overflow-hidden bg-gradient-to-b from-background via-background to-muted/30 pt-10 pb-20 lg:pt-16 lg:pb-28"
      >
        {/* Subtle ambient radial illumination */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 left-1/4 h-96 w-96 rounded-full bg-secondary/10 blur-3xl dark:bg-secondary/15"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl dark:bg-primary/20"
        />

        {/* Full-viewport-width animated ECG / heartbeat line traveling left-to-right */}
        <div
          data-testid="rn-hero-heartbeat"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-3 sm:bottom-5 z-10 w-full overflow-hidden select-none"
        >
          <svg
            viewBox="0 0 1440 96"
            fill="none"
            preserveAspectRatio="none"
            className="h-14 sm:h-16 lg:h-20 w-full block"
          >
            <defs>
              <linearGradient id="rn-ecg-edge-fade" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="white" stopOpacity="0" />
                <stop offset="5%" stopColor="white" stopOpacity="1" />
                <stop offset="95%" stopColor="white" stopOpacity="1" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
              <mask id="rn-ecg-edge-mask">
                <rect x="0" y="0" width="1440" height="96" fill="url(#rn-ecg-edge-fade)" />
              </mask>
            </defs>

            <g mask="url(#rn-ecg-edge-mask)">
              <path
                data-testid="rn-hero-ecg-baseline"
                d={RN_HERO_HEALTHY_ECG_PATH}
                pathLength={1000}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-teal-700/25 dark:text-teal-400/25"
              />
              <path
                data-testid="rn-hero-ecg-pulse-ltr"
                d={RN_HERO_HEALTHY_ECG_PATH}
                pathLength={1000}
                stroke="currentColor"
                strokeWidth="3.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="220 280"
                className="text-teal-600 dark:text-teal-300 drop-shadow-[0_0_8px_rgba(13,148,136,0.55)] dark:drop-shadow-[0_0_10px_rgba(45,212,191,0.85)] animate-ecg-ltr motion-safe:animate-ecg-ltr"
              />
            </g>
          </svg>
        </div>

        <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
            {/* Left Column: Brand identity, Headline, Value Prop, Primary & Secondary CTAs */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-3 rounded-full bg-secondary/10 px-4 py-1.5 text-xs font-semibold text-secondary ring-1 ring-secondary/20">
                <Image
                  src={BRAND.logo.assetPath}
                  alt=""
                  width={22}
                  height={22}
                  className="h-5 w-5 rounded-sm object-contain"
                />
                <span>PrepFord Registered Nursing • NCLEX-RN Pathway</span>
              </div>

              <h1
                id="nclex-rn-hero-heading"
                className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.08]"
              >
                Prepare for the{" "}
                <span className="text-secondary underline decoration-secondary/30 decoration-2 underline-offset-8">
                  NCLEX-RN
                </span>{" "}
                with Clinical Clarity and Structured Practice.
              </h1>

              <p className="max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
                Build registered-nurse clinical judgment with PrepFord&apos;s NCLEX-RN practice question
                bank, option-by-option correct and distractor rationales, 7-domain Nursing Study Guide,
                and Client Needs readiness tracking.
              </p>

              {/* Key verified capability pills */}
              <ul
                aria-label="Available NCLEX-RN preparation tools"
                className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 pt-1 text-sm text-foreground/90"
              >
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                  <span>Clinical scenario &amp; prioritization questions</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                  <span>Option-by-option clinical &amp; distractor rationales</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                  <span>7-domain Nursing Study Guide &amp; reference notes</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                  <span>Server-scored readiness assessments &amp; analytics</span>
                </li>
              </ul>

              {/* Primary and secondary CTAs */}
              <div className="flex flex-wrap items-center gap-3.5 pt-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-7 h-12 rounded-xl shadow-md"
                >
                  <a href="#rn-study-plans">
                    Explore Study Plans
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-xl px-6 font-semibold border-border/80 bg-background/80 hover:bg-muted"
                >
                  <Link href="/study-guide">
                    <BookOpen className="mr-2 h-4 w-4 text-secondary" aria-hidden="true" />
                    Explore Study Guide
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="h-12 rounded-xl px-5 font-semibold text-foreground hover:text-secondary"
                >
                  <a href="#rn-question-experience">Try Free Sample Question</a>
                </Button>
              </div>

              {/* Pathway switcher note for LPN/LVN visitors */}
              <p className="text-xs text-muted-foreground pt-1">
                Preparing for practical or vocational nursing licensure instead?{" "}
                <Link
                  href="/nclex-pn"
                  className="font-semibold text-secondary underline-offset-4 hover:underline"
                >
                  Switch to the NCLEX-PN Pathway →
                </Link>
              </p>
            </div>

            {/* Right Column: Integrated Healthcare Visual Composition (no boxy card frame) */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Soft organic backdrop glow */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-4 rounded-[2.5rem] bg-gradient-to-tr from-secondary/20 via-primary/10 to-transparent blur-2xl"
                />

                {/* Main nursing image blended naturally */}
                <div className="relative overflow-hidden rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl">
                  <Image
                    src="/images/illustrations/prepford-rn-pathway-card.png"
                    alt="Registered nurse candidate reviewing acute care clinical notes and NCLEX-RN practice scenarios"
                    width={640}
                    height={720}
                    priority
                    className="h-[380px] sm:h-[440px] w-full object-contain sm:object-cover object-center"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent"
                  />

                  {/* Floating Clinical Telemetry Overlay Badge */}
                  <div className="absolute top-4 left-4 right-4 sm:right-auto flex items-center gap-3 rounded-2xl bg-background/90 dark:bg-card/90 backdrop-blur-md px-4 py-2.5 shadow-lg">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                      <HeartPulse className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
                        Clinical Judgment Focus
                      </p>
                      <p className="text-xs font-medium text-foreground">
                        Acute Prioritization, Delegation &amp; Pharmacology
                      </p>
                    </div>
                  </div>

                  {/* Bottom Integrated Resource Summary Strip */}
                  <div className="absolute bottom-4 inset-x-4 rounded-2xl bg-background/95 dark:bg-card/95 backdrop-blur-md p-4 shadow-lg">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          Structured RN Exam Preparation
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Question Bank • Rationales • 7-Domain Study Guide • Readiness Pack
                        </p>
                      </div>
                      <Badge className="bg-secondary text-secondary-foreground shrink-0">
                        RN Pathway
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: PRODUCT-SELECTION EXPERIENCE (STUDY PLANS & DURATION)
         ===================================================================== */}
      <section
        id="rn-study-plans"
        data-testid="rn-study-plans"
        aria-labelledby="rn-study-plans-heading"
        className="py-20 lg:py-28 bg-muted/25"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
                Step-by-Step Plan Selection
              </p>
              <h2
                id="rn-study-plans-heading"
                className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
              >
                Choose Your NCLEX-RN Study Plan &amp; Access Duration
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Select your preferred access duration and plan tier below. Every option connects
                directly to PrepFord&apos;s verified product catalog and unlocks immediate access upon
                checkout.
              </p>
            </div>

            {/* Step 1: Access Duration Selector */}
            <div className="w-full lg:w-auto">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1. Select Access Duration
              </p>
              <div
                role="group"
                aria-label="Select access duration"
                className="flex flex-col sm:inline-flex sm:flex-row w-full sm:w-auto gap-1.5 rounded-2xl bg-card/95 p-1.5 shadow-sm ring-1 ring-border"
              >
                <button
                  type="button"
                  data-testid="rn-duration-toggle-month"
                  aria-pressed={selectedDuration === "month"}
                  onClick={() => setSelectedDuration("month")}
                  onKeyDown={handleDurationKeyDown}
                  className={`group relative inline-flex items-center justify-center sm:justify-start gap-2.5 rounded-xl px-4 py-2.5 text-xs sm:text-sm transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    selectedDuration === "month"
                      ? "bg-primary text-primary-foreground font-bold shadow-sm ring-1 ring-primary/80"
                      : "bg-transparent text-muted-foreground font-medium hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors motion-reduce:transition-none ${
                      selectedDuration === "month"
                        ? "border-primary-foreground/90 bg-primary-foreground/20 text-primary-foreground"
                        : "border-muted-foreground/40 bg-background/60"
                    }`}
                  >
                    {selectedDuration === "month" && (
                      <CheckCircle2 className="h-3 w-3 stroke-[2.5]" />
                    )}
                  </span>
                  <span>30-Day Monthly Access</span>
                </button>

                <button
                  type="button"
                  data-testid="rn-duration-toggle-quarter"
                  aria-pressed={selectedDuration === "quarter"}
                  onClick={() => setSelectedDuration("quarter")}
                  onKeyDown={handleDurationKeyDown}
                  className={`group relative inline-flex flex-wrap items-center justify-center sm:justify-start gap-2.5 rounded-xl px-4 py-2.5 text-xs sm:text-sm transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    selectedDuration === "quarter"
                      ? "bg-primary text-primary-foreground font-bold shadow-sm ring-1 ring-primary/80"
                      : "bg-transparent text-muted-foreground font-medium hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors motion-reduce:transition-none ${
                      selectedDuration === "quarter"
                        ? "border-primary-foreground/90 bg-primary-foreground/20 text-primary-foreground"
                        : "border-muted-foreground/40 bg-background/60"
                    }`}
                  >
                    {selectedDuration === "quarter" && (
                      <CheckCircle2 className="h-3 w-3 stroke-[2.5]" />
                    )}
                  </span>
                  <span>90-Day Quarterly Access</span>
                  {activeQuarterlySavings !== null && (
                    <span
                      data-testid="rn-duration-quarterly-savings"
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-tight transition-colors motion-reduce:transition-none ${
                        selectedDuration === "quarter"
                          ? "bg-secondary text-secondary-foreground shadow-2xs"
                          : "bg-secondary/15 text-secondary ring-1 ring-secondary/25"
                      }`}
                    >
                      Save ${activeQuarterlySavings}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {selectionError && (
            <div
              role="alert"
              className="mt-6 flex items-center gap-2.5 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{selectionError}</span>
            </div>
          )}

          {/* Step 2: Plan Tier Cards */}
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {activePlans.map(({ tier, product }) => {
              const isRecommended = tier === "pro";
              const isSelected = selectedTier === tier;
              const isSubmitting = submittingPlanId === product.id;
              const savings =
                product.originalPrice && product.originalPrice > product.price
                  ? product.originalPrice - product.price
                  : null;

              return (
                <div
                  key={product.id}
                  data-testid={`rn-plan-card-${tier}`}
                  onClick={() => setSelectedTier(tier)}
                  className={`relative flex flex-col justify-between rounded-3xl p-7 sm:p-8 transition-all cursor-pointer ${
                    isRecommended
                      ? "bg-card text-card-foreground shadow-xl ring-2 ring-secondary"
                      : isSelected
                        ? "bg-card text-card-foreground shadow-lg ring-2 ring-primary/60"
                        : "bg-card/90 text-card-foreground shadow-md ring-1 ring-border/60 hover:ring-border"
                  }`}
                >
                  <div className="flex-1 flex flex-col">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                        {product.durationLabel ??
                          (product.billingInterval === "quarter"
                            ? "90-Day Quarterly Access"
                            : "30-Day Monthly Access")}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {isRecommended && (
                          <Badge className="bg-secondary text-secondary-foreground font-semibold">
                            Most Popular for RN
                          </Badge>
                        )}
                        {isSelected && (
                          <Badge variant="outline" className="border-primary/40 text-foreground font-semibold">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </div>

                    <h3 className="mt-4 font-serif text-2xl font-bold text-foreground">
                      {product.name}
                    </h3>

                    <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed min-h-[40px]">
                      {product.description}
                    </p>

                    {/* Dynamic Price Display */}
                    <div className="mt-6 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span
                        data-testid={`rn-plan-price-${tier}`}
                        className="font-serif text-4xl font-bold tracking-tight text-foreground"
                      >
                        ${product.price}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        USD / {product.billingInterval === "quarter" ? "90 days" : "30 days"}
                      </span>
                      {product.originalPrice && (
                        <span className="text-xs text-muted-foreground line-through">
                          ${product.originalPrice}
                        </span>
                      )}
                    </div>

                    {savings ? (
                      <p className="mt-1.5 text-xs font-semibold text-secondary">
                        Save ${savings} compared to three separate 30-day renewals
                      </p>
                    ) : (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        30-day access • Switch to 90-day quarterly above to compare savings
                      </p>
                    )}

                    <ul className="mt-6 space-y-3 text-sm text-foreground/90 flex-1">
                      {product.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                          <CheckCircle2
                            className="mt-0.5 h-4 w-4 shrink-0 text-secondary"
                            aria-hidden="true"
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-4">
                    <Button
                      type="button"
                      size="lg"
                      data-testid={`select-plan-${product.id}`}
                      disabled={Boolean(submittingPlanId)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTier(tier);
                        handleSelectPlan(product.id);
                      }}
                      className={`w-full h-12 rounded-xl font-semibold px-4 inline-flex items-center justify-center ${
                        isRecommended
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      }`}
                    >
                      {isSubmitting ? (
                        <span>Adding to Cart...</span>
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="truncate">
                            Choose {tier === "pro" ? "Complete Prep" : tier === "starter" ? "Starter Review" : "All-Access"}
                          </span>
                          <span className="sr-only">for {product.name} at ${product.price}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step 3: Interactive Configuration Summary Bar */}
          {activeSelectedProduct && (
            <div
              data-testid="rn-selected-plan-summary"
              className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl bg-background p-5 sm:p-6 shadow-sm ring-1 ring-border/70 lg:flex-row lg:items-center"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                    Active Configuration
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {activeSelectedProduct.durationLabel}
                  </Badge>
                </div>
                <p className="font-serif text-lg font-bold text-foreground">
                  {activeSelectedProduct.name} — ${activeSelectedProduct.price} USD
                </p>
                <p className="text-xs text-muted-foreground">
                  Includes immediate access to your selected NCLEX-RN resources after checkout.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <Button
                  type="button"
                  size="lg"
                  data-testid="rn-summary-continue-cta"
                  disabled={Boolean(submittingPlanId)}
                  onClick={() => handleSelectPlan(activeSelectedProduct.id)}
                  className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl"
                >
                  Continue to Checkout (${activeSelectedProduct.price})
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
                <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  <a href="#rn-plan-comparison">Compare Plan Features ↓</a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          SECTION 3: PLAN COMPARISON TABLE
         ===================================================================== */}
      <section
        id="rn-plan-comparison"
        data-testid="rn-plan-comparison"
        aria-labelledby="rn-plan-comparison-heading"
        className="py-20 lg:py-24 bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
              Side-by-Side Comparison
            </p>
            <h2
              id="rn-plan-comparison-heading"
              className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Compare NCLEX-RN Preparation Plans
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Every plan includes PrepFord&apos;s option-by-option answer rationales and 7-domain
              Nursing Study Guide. Compare question bank depth, readiness assessments, and pathway
              coverage below.
            </p>
          </div>

          <div className="mt-10 overflow-x-auto rounded-3xl bg-card shadow-sm ring-1 ring-border/70">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <caption className="sr-only">
                Comparison of PrepFord NCLEX-RN Starter Review, Complete Preparation (Pro), and RN &amp; PN All-Access plans
              </caption>
              <thead>
                <tr className="border-b border-border/70 bg-muted/40">
                  <th scope="col" className="py-5 pl-6 pr-4 font-serif text-base font-bold text-foreground">
                    Included Capability
                  </th>
                  <th scope="col" className="px-4 py-5 font-serif text-base font-bold text-foreground">
                    <div>NCLEX-RN Starter Review</div>
                    <div className="mt-1 font-sans text-xs font-medium text-muted-foreground">
                      $29 / 30d • $75 / 90d
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-5 font-serif text-base font-bold text-secondary bg-secondary/5"
                  >
                    <div>NCLEX-RN Complete Prep (Pro)</div>
                    <div className="mt-1 font-sans text-xs font-semibold text-secondary">
                      $59 / 30d • $149 / 90d
                    </div>
                  </th>
                  <th scope="col" className="py-5 pl-4 pr-6 font-serif text-base font-bold text-foreground">
                    <div>NCLEX-RN &amp; PN All-Access</div>
                    <div className="mt-1 font-sans text-xs font-medium text-muted-foreground">
                      $89 / 30d • $229 / 90d
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <tr>
                  <th scope="row" className="py-4 pl-6 pr-4 font-medium text-foreground">
                    Target Licensure Pathway
                  </th>
                  <td className="px-4 py-4 text-muted-foreground">NCLEX-RN</td>
                  <td className="px-4 py-4 font-semibold text-foreground bg-secondary/5">NCLEX-RN</td>
                  <td className="py-4 pl-4 pr-6 text-muted-foreground">Both NCLEX-RN &amp; NCLEX-PN</td>
                </tr>
                <tr>
                  <th scope="row" className="py-4 pl-6 pr-4 font-medium text-foreground">
                    Practice Question Bank Access
                  </th>
                  <td className="px-4 py-4 text-muted-foreground">Foundational RN question set</td>
                  <td className="px-4 py-4 font-semibold text-foreground bg-secondary/5">
                    Full NCLEX-RN question bank
                  </td>
                  <td className="py-4 pl-4 pr-6 text-muted-foreground">
                    Full RN &amp; PN question banks
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-4 pl-6 pr-4 font-medium text-foreground">
                    Clinical &amp; Distractor Answer Rationales
                  </th>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      <Check className="h-4 w-4 text-secondary" aria-hidden="true" /> Included
                    </span>
                  </td>
                  <td className="px-4 py-4 bg-secondary/5">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                      <Check className="h-4 w-4 text-secondary" aria-hidden="true" /> Included
                    </span>
                  </td>
                  <td className="py-4 pl-4 pr-6">
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      <Check className="h-4 w-4 text-secondary" aria-hidden="true" /> Included
                    </span>
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-4 pl-6 pr-4 font-medium text-foreground">
                    7-Domain Nursing Study Guide &amp; Notes
                  </th>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      <Check className="h-4 w-4 text-secondary" aria-hidden="true" /> Full access
                    </span>
                  </td>
                  <td className="px-4 py-4 bg-secondary/5">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                      <Check className="h-4 w-4 text-secondary" aria-hidden="true" /> Full access
                    </span>
                  </td>
                  <td className="py-4 pl-4 pr-6">
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      <Check className="h-4 w-4 text-secondary" aria-hidden="true" /> Full access
                    </span>
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-4 pl-6 pr-4 font-medium text-foreground">
                    Timed Readiness Assessments Included
                  </th>
                  <td className="px-4 py-4 text-muted-foreground">Available via $39 Readiness Pack</td>
                  <td className="px-4 py-4 font-semibold text-foreground bg-secondary/5">
                    3 Readiness Assessments Included
                  </td>
                  <td className="py-4 pl-4 pr-6 text-muted-foreground">
                    Multi-step clinical scenarios &amp; assessments
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-4 pl-6 pr-4 font-medium text-foreground">
                    Client Needs Domain Performance Analytics
                  </th>
                  <td className="px-4 py-4 text-muted-foreground">Basic topic progress</td>
                  <td className="px-4 py-4 font-semibold text-foreground bg-secondary/5">
                    Full domain &amp; topic accuracy tracking
                  </td>
                  <td className="py-4 pl-4 pr-6 text-muted-foreground">
                    Full RN + PN domain tracking
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-4 pl-6 pr-4 font-medium text-foreground">
                    Priority Educator Email Support
                  </th>
                  <td className="px-4 py-4 text-muted-foreground">Standard support</td>
                  <td className="px-4 py-4 text-muted-foreground bg-secondary/5">Standard support</td>
                  <td className="py-4 pl-4 pr-6 font-semibold text-foreground">
                    Priority educator support
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 4: STUDENT PROGRESS AND LEARNING JOURNEY
         ===================================================================== */}
      <section
        data-testid="rn-student-progress"
        aria-labelledby="rn-student-progress-heading"
        className="py-20 lg:py-24 bg-muted/25"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6 space-y-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
                Consistent Clinical Growth
              </p>
              <h2
                id="rn-student-progress-heading"
                className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
              >
                How Nursing Candidates Build Exam Confidence with PrepFord
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Preparing for registered nurse licensure requires more than memorizing isolated lab
                values. PrepFord connects concept review, acute care prioritization questions, and
                post-question rationale analysis so every study session strengthens bedside clinical
                judgment.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                <div className="rounded-2xl bg-card p-5 shadow-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                    <Stethoscope className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-3 font-serif text-base font-bold text-foreground">
                    Recognize Unstable Cues Early
                  </h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Practice identifying vital sign shifts, postoperative complications, and high-alert
                    medication toxicities before choosing an action.
                  </p>
                </div>

                <div className="rounded-2xl bg-card p-5 shadow-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                    <Compass className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-3 font-serif text-base font-bold text-foreground">
                    Eliminate Unsafe Distractors
                  </h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Learn why tempting distractors fail—such as delegating initial RN assessments or
                    delaying oxygen for routine diagnostic tests.
                  </p>
                </div>
              </div>
            </div>

            {/* Clinical Reasoning & Study Loop Breakdown (non-duplicative of Section 14) */}
            <div className="lg:col-span-6 space-y-4">
              <div className="rounded-3xl bg-card p-6 sm:p-7 shadow-md ring-1 ring-border/50 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-xs font-medium text-secondary border-secondary/30">
                    Step 1 • Clinical Cue Synthesis
                  </Badge>
                  <span className="text-xs text-muted-foreground">Bedside Vignettes</span>
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Connect Vital Signs &amp; Lab Trends Before Selecting an Action
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Rather than testing isolated definitions, each RN practice stem pairs client history with live vital sign trends so you practice distinguishing expected postoperative findings from acute cardiopulmonary or hemodynamic decompensation.
                </p>
              </div>

              <div className="rounded-3xl bg-card p-6 sm:p-7 shadow-md ring-1 ring-border/50 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-xs font-medium text-secondary border-secondary/30">
                    Step 2 • Targeted Study Guide Remediation
                  </Badge>
                  <span className="text-xs text-muted-foreground">7 Nursing Domains</span>
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Turn Every Missed Question Into High-Yield Concept Review
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  After reviewing the option-by-option rationale, jump directly into the corresponding Nursing Study Guide topic to reinforce pharmacological antidotes, isolation rules, or RN delegation boundaries.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 5: FEATURE — PRACTICE QUESTIONS AND ANSWER RATIONALES
         ===================================================================== */}
      <section
        id="rn-question-experience"
        data-testid="rn-question-experience"
        aria-labelledby="rn-question-experience-heading"
        className="py-20 lg:py-28 bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
              Interactive RN Question Walkthrough
            </p>
            <h2
              id="rn-question-experience-heading"
              className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Experience a Real NCLEX-RN Clinical Scenario &amp; Rationale Breakdown
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Test your clinical prioritization on the sample item below. Select an option and click{" "}
              <strong className="font-semibold text-foreground">Check Answer &amp; View Rationale</strong>{" "}
              to inspect both the correct clinical explanation and every distractor rationale.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Interactive Question Workbench */}
            <div className="lg:col-span-7 rounded-3xl bg-card p-6 sm:p-8 shadow-lg ring-1 ring-border/70">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Badge className="bg-secondary text-secondary-foreground">NCLEX-RN Sample</Badge>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {SAMPLE_RN_QUESTION.category}
                  </span>
                </div>
                <span className="text-xs font-medium text-secondary">{SAMPLE_RN_QUESTION.topic}</span>
              </div>

              {/* Simulated EHR Client Header & Vitals */}
              <div className="mt-4 rounded-2xl bg-muted/60 p-4 space-y-1.5 text-xs">
                <p className="font-semibold text-foreground">{SAMPLE_RN_QUESTION.clientHeader}</p>
                <p className="font-mono text-muted-foreground">{SAMPLE_RN_QUESTION.vitals}</p>
              </div>

              <form onSubmit={handleCheckSampleAnswer} className="mt-5 space-y-5">
                <fieldset className="space-y-3">
                  <legend className="text-sm sm:text-base font-medium text-foreground leading-relaxed mb-3">
                    {SAMPLE_RN_QUESTION.stem}
                  </legend>

                  {SAMPLE_RN_QUESTION.options.map((opt) => {
                    const isChecked = selectedOptionId === opt.id;
                    let stateClasses = "bg-background hover:bg-muted/50 ring-1 ring-border/80";

                    if (isQuestionSubmitted) {
                      if (opt.isCorrect) {
                        stateClasses =
                          "bg-emerald-500/10 ring-2 ring-emerald-500/60 text-foreground";
                      } else if (isChecked && !opt.isCorrect) {
                        stateClasses =
                          "bg-destructive/10 ring-2 ring-destructive/60 text-foreground";
                      }
                    } else if (isChecked) {
                      stateClasses = "bg-secondary/10 ring-2 ring-secondary text-foreground";
                    }

                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-start gap-3.5 rounded-2xl p-4 transition-all ${stateClasses}`}
                      >
                        <input
                          type="radio"
                          name="rn-sample-question"
                          value={opt.id}
                          checked={isChecked}
                          onChange={() => setSelectedOptionId(opt.id)}
                          className="mt-1 h-4 w-4 accent-secondary"
                        />
                        <div className="text-xs sm:text-sm leading-relaxed">
                          <span className="font-bold text-foreground mr-1.5">{opt.label}.</span>
                          <span className="text-foreground/95">{opt.text}</span>
                        </div>
                      </label>
                    );
                  })}
                </fieldset>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={!selectedOptionId}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl"
                  >
                    Check Answer &amp; View Rationale
                  </Button>

                  {isQuestionSubmitted && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResetSampleQuestion}
                      className="rounded-xl text-xs"
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      Reset Sample Question
                    </Button>
                  )}
                </div>
              </form>
            </div>

            {/* Option-by-Option Rationale Panel */}
            <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl bg-muted/35 p-6 sm:p-8 ring-1 ring-border/60">
              {!isQuestionSubmitted ? (
                <div className="my-auto space-y-4 text-left">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                    <ClipboardCheck className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-foreground">
                    How PrepFord Rationales Strengthen RN Clinical Reasoning
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Select an answer option on the left and submit your response to inspect the full
                    option-by-option clinical rationale panel.
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-foreground/90 pt-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                      <span>Immediate verification of your selected intervention</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                      <span>Detailed explanation for Option A, Option B, Option C, and Option D</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                      <span>Bedside clinical judgment takeaway rule</span>
                    </li>
                  </ul>
                </div>
              ) : (
                <div data-testid="rn-sample-rationale-panel" className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      className={
                        selectedSampleOption?.isCorrect
                          ? "bg-emerald-600 text-white"
                          : "bg-destructive text-destructive-foreground"
                      }
                    >
                      {selectedSampleOption?.isCorrect
                        ? `Option ${selectedSampleOption.id} is Correct`
                        : `Option ${selectedSampleOption?.id} is Incorrect — Option A is Priority`}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground">
                      Full Rationale Review
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {SAMPLE_RN_QUESTION.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`rounded-2xl p-3.5 text-xs leading-relaxed ${
                          opt.isCorrect
                            ? "bg-emerald-500/10 ring-1 ring-emerald-500/40"
                            : "bg-background/90 ring-1 ring-border/60"
                        }`}
                      >
                        <p className="font-bold text-foreground mb-1">
                          Option {opt.label}: {opt.isCorrect ? "Priority Nursing Action" : "Distractor Analysis"}
                        </p>
                        <p className="text-muted-foreground">{opt.rationale}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl bg-secondary/10 p-3.5 text-xs">
                    <p className="font-bold text-secondary uppercase tracking-wider">
                      Clinical Judgment Takeaway
                    </p>
                    <p className="mt-1 text-foreground/90 leading-relaxed">
                      {SAMPLE_RN_QUESTION.takeaway}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  Want full question bank access?
                </span>
                <Link
                  href="/courses?programme=RN"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline"
                >
                  <span>Browse RN Practice Catalog</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 6: ASSESSMENTS, PROGRESS, AND READINESS
         ===================================================================== */}
      <section
        data-testid="rn-assessments-progress"
        aria-labelledby="rn-assessments-progress-heading"
        className="py-20 lg:py-24 bg-muted/25"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
                Readiness Assessments &amp; Analytics
              </p>
              <h2
                id="rn-assessments-progress-heading"
                className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
              >
                Track Your Accuracy Across NCLEX-RN Client Needs Domains
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                PrepFord&apos;s Student Workspace and server-scored readiness assessments break down
                your performance across core registered nursing domains—so you can see which subjects
                are solid and which topics need targeted Study Guide remediation before exam day.
              </p>

              <ul className="space-y-3 pt-2 text-sm text-foreground/90">
                <li className="flex items-start gap-2.5">
                  <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                  <span>
                    <strong>Domain-Level Accuracy Tracking:</strong> Monitor performance in Management
                    of Care, Pharmacology, Reduction of Risk Potential, and Physiological Adaptation.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <ClipboardCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-secondary"
                    aria-hidden="true"
                  />
                  <span>
                    <strong>Timed Readiness Assessments:</strong> Complete full-length practice exams
                    with server-side scoring and post-exam rationale review.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                  <span>
                    <strong>Direct Topic Remediation:</strong> Jump straight from low-scoring domains
                    into matching Nursing Study Guide notes.
                  </span>
                </li>
              </ul>

              <div className="flex flex-wrap items-center gap-3 pt-3">
                <Button asChild className="bg-primary text-primary-foreground rounded-xl font-semibold">
                  <Link href={isAuthenticated ? "/dashboard" : "#rn-study-plans"}>
                    {isAuthenticated ? "Open Student Workspace" : "Choose an RN Study Plan"}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl font-semibold">
                  <a href="#rn-standalone-assessment">View $39 Readiness Assessment Pack</a>
                </Button>
              </div>
            </div>

            {/* Simulated Domain Performance Workspace Preview Card */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl bg-card p-6 sm:p-8 shadow-lg ring-1 ring-border/70 space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                      Student Workspace Preview
                    </p>
                    <h3 className="font-serif text-lg font-bold text-foreground">
                      NCLEX-RN Client Needs Domain Breakdown
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Sample Domain Report
                  </Badge>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      domain: "Management of Care & Leadership",
                      focus: "Prioritization, Delegation, Legal & Ethical Practice",
                      pct: 82,
                      tag: "Strong",
                    },
                    {
                      domain: "Pharmacological & Parenteral Therapies",
                      focus: "High-Alert Medications, IV Titration & Adverse Effects",
                      pct: 74,
                      tag: "On Track",
                    },
                    {
                      domain: "Reduction of Risk Potential",
                      focus: "Lab Interpretation, Diagnostic Prep & Post-Op Monitoring",
                      pct: 78,
                      tag: "On Track",
                    },
                    {
                      domain: "Physiological Adaptation & Acute Care",
                      focus: "Hemodynamic Instability, Sepsis & Respiratory Failure",
                      pct: 66,
                      tag: "Review Recommended",
                    },
                  ].map((row) => (
                    <div key={row.domain} className="rounded-2xl bg-muted/40 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-foreground">{row.domain}</span>
                        <span className="font-mono font-semibold text-secondary">
                          {row.pct}% • {row.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{row.focus}</p>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-secondary"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 7: FEATURE HIGHLIGHTS (INTERACTIVE TABBED SHOWCASE)
         ===================================================================== */}
      <section
        data-testid="rn-feature-highlights"
        aria-labelledby="rn-feature-highlights-heading"
        className="py-20 lg:py-28 bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
              Platform Capabilities
            </p>
            <h2
              id="rn-feature-highlights-heading"
              className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Everything Built Into Your NCLEX-RN Preparation Environment
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Explore the core tools included in PrepFord&apos;s registered nursing platform. Use the
              tabs below (or Left/Right arrow keys) to inspect each feature.
            </p>
          </div>

          {/* Accessible Tablist */}
          <div
            role="tablist"
            aria-label="NCLEX-RN platform features"
            className="mt-8 flex flex-wrap gap-2 rounded-2xl bg-muted/50 p-1.5"
          >
            {FEATURE_HIGHLIGHT_TABS.map((tab, index) => {
              const isSelected = tab.id === currentFeatureTab.id;
              return (
                <button
                  key={tab.id}
                  id={`rn-feature-tab-${tab.id}`}
                  role="tab"
                  type="button"
                  aria-selected={isSelected}
                  aria-controls={`rn-feature-panel-${tab.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setActiveFeatureTab(tab.id)}
                  onKeyDown={(e) => handleFeatureTabKeyDown(e, index)}
                  className={`flex-1 min-w-[180px] rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Active Tab Panel */}
          <div
            id={`rn-feature-panel-${currentFeatureTab.id}`}
            role="tabpanel"
            aria-labelledby={`rn-feature-tab-${currentFeatureTab.id}`}
            className="mt-8 grid grid-cols-1 gap-8 rounded-3xl bg-card p-7 sm:p-10 shadow-md ring-1 ring-border/70 lg:grid-cols-12 lg:items-center"
          >
            <div className="lg:col-span-7 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                {currentFeatureTab.eyebrow}
              </p>
              <h3 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
                {currentFeatureTab.title}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {currentFeatureTab.description}
              </p>

              <ul className="space-y-2.5 pt-2 text-sm text-foreground/90">
                {currentFeatureTab.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2.5">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-secondary"
                      aria-hidden="true"
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-3">
                <Button asChild className="bg-primary text-primary-foreground rounded-xl font-semibold">
                  <Link href={currentFeatureTab.ctaHref}>
                    {currentFeatureTab.ctaLabel}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-2xl bg-muted/40 p-6 space-y-4 ring-1 ring-border/60">
              <div className="flex items-center justify-between gap-2">
                <Badge className="bg-secondary text-secondary-foreground">
                  {currentFeatureTab.previewBadge}
                </Badge>
                <span className="text-xs text-muted-foreground">Verified Capability</span>
              </div>
              <h4 className="font-serif text-lg font-bold text-foreground">
                {currentFeatureTab.previewTitle}
              </h4>
              <div className="space-y-3">
                {currentFeatureTab.previewLines.map((line) => (
                  <div
                    key={line.label}
                    className="rounded-xl bg-background p-3.5 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {line.label}
                      </p>
                      <p className="text-xs font-medium text-foreground mt-0.5">{line.value}</p>
                    </div>
                    <Badge variant="outline" className="text-[11px] shrink-0">
                      {line.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 8: NEXT GENERATION NCLEX (NGN) CLINICAL JUDGMENT READINESS
         ===================================================================== */}
      <section
        data-testid="rn-ngn-readiness"
        aria-labelledby="rn-ngn-readiness-heading"
        className="py-20 lg:py-24 bg-muted/25"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
              Clinical Judgment Measurement Model (CJMM)
            </p>
            <h2
              id="rn-ngn-readiness-heading"
              className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Structured Around the Six Cognitive Steps of Next Generation NCLEX Clinical Judgment
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              PrepFord&apos;s clinical scenario stems, bedside vital sign exhibits, and answer
              rationales train the exact cognitive progression tested on modern NCLEX-RN examinations.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                step: "Step 01",
                title: "Recognize Cues",
                description:
                  "Identify abnormal vital signs, sudden lab shifts, and high-risk postoperative or maternal-newborn assessment findings in the clinical vignette.",
              },
              {
                step: "Step 02",
                title: "Analyze Cues",
                description:
                  "Connect clusters of bedside findings to underlying pathophysiology—such as distinguishing hypovolemic shock from cardiogenic overload.",
              },
              {
                step: "Step 03",
                title: "Prioritize Hypotheses",
                description:
                  "Determine which physiological risk poses the most immediate threat to client survival or safety using Airway, Breathing, Circulation, and Safety frameworks.",
              },
              {
                step: "Step 04",
                title: "Generate Solutions",
                description:
                  "Identify evidence-based nursing interventions, appropriate RN vs. LPN/UAP delegation boundaries, and anticipated provider prescriptions.",
              },
              {
                step: "Step 05",
                title: "Take Priority Action",
                description:
                  "Select the single most urgent bedside nursing intervention—avoiding distractors that delay care for non-urgent documentation or routine diagnostics.",
              },
              {
                step: "Step 06",
                title: "Evaluate Outcomes",
                description:
                  "Verify whether the intervention restored hemodynamic or respiratory stability and recognize early signs of treatment toxicity.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/60 space-y-2.5"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                  {item.step}
                </span>
                <h3 className="font-serif text-lg font-bold text-foreground">{item.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 9: STUDY GUIDE INTEGRATION (7 NURSING DOMAINS)
         ===================================================================== */}
      <section
        data-testid="rn-study-guide-integration"
        aria-labelledby="rn-study-guide-integration-heading"
        className="py-20 lg:py-28 bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
                Connected Reference Library
              </p>
              <h2
                id="rn-study-guide-integration-heading"
                className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
              >
                Explore All 7 Domains in the PrepFord Nursing Study Guide
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Reinforce your question bank sessions with concise, high-yield nursing notes organized
                by clinical specialty. Every category below links directly to working Study Guide
                subject pages.
              </p>
            </div>

            <Button asChild variant="outline" size="lg" className="rounded-xl font-semibold">
              <Link href="/study-guide">
                Open Full Nursing Study Guide
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {STUDY_GUIDE_CATEGORIES.map((category) => (
              <div
                key={category.slug}
                data-testid={`rn-study-guide-card-${category.slug}`}
                className="flex flex-col justify-between rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/60 hover:ring-secondary/50 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-xs text-secondary border-secondary/30">
                      {category.badge}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {category.subjects.length}{" "}
                      {category.subjects.length === 1 ? "Subject Guide" : "Subject Guides"}
                    </span>
                  </div>

                  <h3 className="font-serif text-xl font-bold text-foreground">{category.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {category.description}
                  </p>

                  <ul className="space-y-1.5 pt-2 text-xs text-foreground/90">
                    {category.subjects.slice(0, 3).map((subj) => (
                      <li key={subj.slug}>
                        <Link
                          href={`/study-guide/${category.slug}/${subj.slug}`}
                          className="inline-flex items-center gap-1.5 hover:text-secondary hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5 text-secondary shrink-0" aria-hidden="true" />
                          <span>{subj.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-border/50">
                  <Link
                    href={`/study-guide/${category.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline"
                  >
                    <span>Explore {category.shortTitle} Notes</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 11: MULTI-STEP LEARNING-PROGRAM SHOWCASE
          (Note: Section 10 Live Webinars/Tutoring intentionally omitted as PrepFord
          is a self-paced question bank, Study Guide, and readiness assessment platform.)
         ===================================================================== */}
      <section
        data-testid="rn-learning-journey"
        aria-labelledby="rn-learning-journey-heading"
        className="py-20 lg:py-24 bg-muted/25"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
              4-Stage Study Workflow
            </p>
            <h2
              id="rn-learning-journey-heading"
              className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              A Structured Daily Routine From Concept Review to Exam Readiness
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Follow a repeatable four-stage cycle designed to build durable clinical reasoning without
              overwhelming study schedules.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                stage: "Stage 01",
                title: "Review Core Nursing Concepts",
                description:
                  "Start each study block in the 7-domain Nursing Study Guide to review pathophysiology, priority interventions, and red-flag complications.",
                ctaLabel: "Open Study Guide",
                ctaHref: "/study-guide",
              },
              {
                stage: "Stage 02",
                title: "Practice Clinical Scenario Items",
                description:
                  "Apply what you reviewed on NCLEX-RN clinical scenario questions testing prioritization, delegation, and acute care decision-making.",
                ctaLabel: "Try Sample Question",
                ctaHref: "#rn-question-experience",
              },
              {
                stage: "Stage 03",
                title: "Analyze Option & Distractor Rationales",
                description:
                  "Inspect both the correct explanation and every distractor rationale so you understand the clinical safety rule behind every question.",
                ctaLabel: "Browse RN Practice",
                ctaHref: "/courses?programme=RN",
              },
              {
                stage: "Stage 04",
                title: "Track Domain Accuracy & Remediate",
                description:
                  "Complete server-scored readiness assessments and use your Student Workspace domain report to guide your next study block.",
                ctaLabel: "Choose Study Plan",
                ctaHref: "#rn-study-plans",
              },
            ].map((item) => (
              <div
                key={item.stage}
                className="flex flex-col justify-between rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/60"
              >
                <div className="space-y-3">
                  <Badge className="bg-secondary/15 text-secondary font-semibold">
                    {item.stage}
                  </Badge>
                  <h3 className="font-serif text-lg font-bold text-foreground">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <div className="mt-6 pt-3">
                  <Link
                    href={item.ctaHref}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline"
                  >
                    <span>{item.ctaLabel}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 12: PRODUCT RECOMMENDATION QUIZ
         ===================================================================== */}
      <div data-testid="rn-recommendation-quiz" className="bg-background">
        <CourseFinderQuiz />
      </div>

      {/* =====================================================================
          SECTION 13: STANDALONE ASSESSMENT PRODUCT (RN READINESS PACK)
         ===================================================================== */}
      {readinessProduct && (
        <section
          id="rn-standalone-assessment"
          data-testid="rn-standalone-assessment"
          aria-labelledby="rn-standalone-assessment-heading"
          className="py-20 lg:py-24 bg-muted/25"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-card p-8 sm:p-10 lg:p-12 shadow-lg ring-1 ring-border/70">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-secondary text-secondary-foreground">
                      Standalone One-Time Pack
                    </Badge>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      No Recurring Subscription Required
                    </span>
                  </div>

                  <h2
                    id="rn-standalone-assessment-heading"
                    className="font-serif text-2xl sm:text-3xl font-bold text-foreground"
                  >
                    {readinessProduct.name}
                  </h2>

                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {readinessProduct.description}{" "}
                    {readinessProduct.audience}
                  </p>

                  <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 pt-2 text-xs sm:text-sm text-foreground/90">
                    {readinessProduct.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="lg:col-span-4 rounded-2xl bg-muted/50 p-6 text-left lg:text-center space-y-4 ring-1 ring-border/60">
                  <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                    {readinessProduct.durationLabel ?? "One-Time Assessment Pack"}
                  </p>
                  <div className="flex items-baseline lg:justify-center gap-1.5">
                    <span className="font-serif text-4xl font-bold text-foreground">
                      ${readinessProduct.price}
                    </span>
                    <span className="text-xs text-muted-foreground">USD one-time</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Includes 3 timed RN assessments + full rationale review
                  </p>
                  <Button
                    type="button"
                    size="lg"
                    data-testid="select-plan-rn-readiness"
                    disabled={Boolean(submittingPlanId)}
                    onClick={() => handleSelectPlan(readinessProduct.id)}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl h-12 px-4 inline-flex items-center justify-center"
                  >
                    {submittingPlanId === readinessProduct.id ? (
                      <span>Adding to Cart...</span>
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">Add Readiness Pack</span>
                        <span className="sr-only">for ${readinessProduct.price}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          SECTION 14: STUDENT TESTIMONIALS AND STORIES
         ===================================================================== */}
      <section
        data-testid="rn-testimonials"
        aria-labelledby="rn-testimonials-heading"
        className="py-20 lg:py-24 bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-end">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
                Student Reflections
              </p>
              <h2
                id="rn-testimonials-heading"
                className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
              >
                What NCLEX-RN Candidates Value About PrepFord
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Read how registered nursing candidates use PrepFord&apos;s question rationales,
                7-domain Study Guide, and domain readiness reports during exam preparation.
              </p>
            </div>

            <Link
              href="/testimonials"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-secondary hover:underline"
            >
              <span>View All Student Reflections</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {RN_TESTIMONIALS.map((item) => (
              <blockquote
                key={item.id}
                className="flex flex-col justify-between rounded-3xl bg-card p-6 sm:p-7 shadow-sm ring-1 ring-border/60"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <Badge variant="outline" className="text-xs text-secondary border-secondary/30">
                      {item.focus}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{item.role}</span>
                  </div>
                  <p className="text-sm sm:text-base text-foreground/90 leading-relaxed italic">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </div>
                <footer className="mt-4 pt-3 border-t border-border/40 text-xs font-semibold text-foreground">
                  — {item.author}
                </footer>
              </blockquote>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Illustrative candidate study perspectives highlighting how PrepFord&apos;s question
            bank, option-by-option rationales, and 7-domain Study Guide support daily preparation. Individual exam outcomes depend on each candidate&apos;s
            nursing education and preparation.
          </p>
        </div>
      </section>

      {/* =====================================================================
          SECTION 15: FINAL CTA
         ===================================================================== */}
      <section
        data-testid="rn-final-cta"
        aria-labelledby="rn-final-cta-heading"
        className="py-20 lg:py-24 bg-gradient-to-br from-primary/10 via-secondary/10 to-background"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <Badge className="bg-secondary text-secondary-foreground">
            Start Your NCLEX-RN Preparation Today
          </Badge>

          <h2
            id="rn-final-cta-heading"
            className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
          >
            Ready to Organize Your NCLEX-RN Study Routine?
          </h2>

          <p className="mx-auto max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            Choose a 30-day or 90-day NCLEX-RN study plan, explore our open-access 7-domain Nursing
            Study Guide, or jump into your Student Workspace.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Button
              asChild
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-12 px-7 rounded-xl shadow-md"
            >
              <a href="#rn-study-plans">
                Choose an RN Study Plan
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-6 rounded-xl font-semibold bg-background/80"
            >
              <Link href="/study-guide">Browse Study Guide</Link>
            </Button>

            <Button
              asChild
              variant="ghost"
              size="lg"
              className="h-12 px-5 rounded-xl font-semibold"
            >
              <Link href={isAuthenticated ? "/dashboard" : "/sign-up"}>
                {isAuthenticated ? "Open Student Workspace" : "Create Free Account"}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 16: FREQUENTLY ASKED QUESTIONS (ACCESSIBLE ACCORDION)
         ===================================================================== */}
      <section
        id="rn-faq"
        data-testid="rn-faq-section"
        aria-labelledby="rn-faq-heading"
        className="py-20 lg:py-28 bg-background"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
              NCLEX-RN Frequently Asked Questions
            </p>
            <h2
              id="rn-faq-heading"
              className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Answers About PrepFord&apos;s NCLEX-RN Resources &amp; Study Plans
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Have additional questions? Visit our{" "}
              <Link href="/faq" className="font-semibold text-secondary hover:underline">
                Full FAQ
              </Link>{" "}
              or{" "}
              <Link href="/contact" className="font-semibold text-secondary hover:underline">
                Contact Support
              </Link>
              .
            </p>
          </div>

          <div className="mt-10 space-y-3">
            {RN_FAQ_ITEMS.map((item) => {
              const isOpen = openFaqId === item.id;
              const buttonId = `rn-faq-btn-${item.id}`;
              const panelId = `rn-faq-panel-${item.id}`;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-card shadow-xs ring-1 ring-border/60 overflow-hidden"
                >
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-sm sm:text-base font-semibold text-foreground hover:bg-muted/40 transition-colors"
                    >
                      <span>{item.question}</span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-secondary transition-transform duration-200 ${
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
                    className="px-6 pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed"
                  >
                    {item.answer}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
