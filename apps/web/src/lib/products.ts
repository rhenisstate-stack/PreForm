export interface Product {
  id: string;
  slug?: string;
  name: string;
  description: string;
  audience?: string;
  pathway: "RN" | "PN" | "Both";
  planType: "starter" | "pro" | "premium" | "readiness";
  price: number;
  originalPrice?: number;
  currency: string;
  billingInterval: "month" | "quarter" | "one-time";
  durationLabel?: string;
  features: string[];
  popular?: boolean;
  // Admin-managed card appearance & governance properties
  bgColour?: string;
  accentColour?: string;
  textColour?: string;
  badgeText?: string;
  displayOrder?: number;
  isActive?: boolean;
  entitlements?: ("rn" | "pn")[];
}

export const PRODUCTS: Product[] = [
  {
    id: "rn-pro",
    slug: "nclex-rn-pro",
    name: "NCLEX-RN Complete Preparation",
    description:
      "Full question bank, readiness assessments, and progress tracking for registered nurse candidates.",
    audience: "Registered Nurse (RN) licensure candidates seeking comprehensive preparation.",
    pathway: "RN",
    planType: "pro",
    price: 59,
    currency: "USD",
    billingInterval: "month",
    durationLabel: "30-Day Monthly Access",
    features: [
      "Full NCLEX-RN practice question bank",
      "Detailed clinical & distractor answer rationales",
      "Full-length practice exams",
      "3 readiness assessments included",
      "Topic-level performance & accuracy tracking",
    ],
    popular: true,
    badgeText: "Most Popular for RN",
    displayOrder: 1,
    isActive: true,
    entitlements: ["rn"],
  },
  {
    id: "rn-pro-90",
    slug: "nclex-rn-pro-90",
    name: "NCLEX-RN Complete Preparation (90-Day)",
    description:
      "90-day quarterly access to the full NCLEX-RN question bank, readiness assessments, Study Guide notes, and domain progress tracking.",
    audience: "Registered Nurse (RN) candidates following a 1 to 3 month structured study schedule.",
    pathway: "RN",
    planType: "pro",
    price: 149,
    originalPrice: 177,
    currency: "USD",
    billingInterval: "quarter",
    durationLabel: "90-Day Quarterly Access",
    features: [
      "Full NCLEX-RN practice question bank (90 days)",
      "Detailed clinical & distractor answer rationales",
      "7-domain Nursing Study Guide & clinical notes",
      "3 readiness assessments included",
      "Topic-level performance & accuracy tracking",
    ],
    popular: true,
    badgeText: "Most Popular for RN",
    displayOrder: 2,
    isActive: true,
    entitlements: ["rn"],
  },
  {
    id: "pn-pro",
    slug: "nclex-pn-pro",
    name: "NCLEX-PN Complete Preparation",
    description:
      "Full question bank, readiness assessments, and progress tracking for practical/vocational nurse candidates.",
    audience: "LPN and LVN candidates preparing for practical/vocational nursing licensure.",
    pathway: "PN",
    planType: "pro",
    price: 59,
    currency: "USD",
    billingInterval: "month",
    durationLabel: "30-Day Monthly Access",
    features: [
      "Full NCLEX-PN practice question bank",
      "Option-by-option clinical & distractor rationales",
      "7-domain Nursing Study Guide & clinical notes",
      "3 readiness assessments included",
      "Coordinated care & Client Needs progress tracking",
    ],
    popular: true,
    badgeText: "Recommended for PN Candidates",
    displayOrder: 3,
    isActive: true,
    entitlements: ["pn"],
  },
  {
    id: "pn-pro-90",
    slug: "nclex-pn-pro-90",
    name: "NCLEX-PN Complete Preparation (90-Day)",
    description:
      "90-day quarterly access to the full NCLEX-PN question bank, readiness assessments, Study Guide notes, and progress tracking.",
    audience: "LPN and LVN candidates following a 1 to 3 month structured study schedule.",
    pathway: "PN",
    planType: "pro",
    price: 149,
    originalPrice: 177,
    currency: "USD",
    billingInterval: "quarter",
    durationLabel: "90-Day Quarterly Access",
    features: [
      "Full NCLEX-PN practice question bank (90 days)",
      "Option-by-option clinical & distractor rationales",
      "7-domain Nursing Study Guide & clinical notes",
      "3 readiness assessments included",
      "Coordinated care & Client Needs progress tracking",
    ],
    popular: true,
    badgeText: "Recommended for PN Candidates",
    displayOrder: 4,
    isActive: true,
    entitlements: ["pn"],
  },
  {
    id: "rn-starter",
    slug: "nclex-rn-starter",
    name: "NCLEX-RN Starter Review",
    description:
      "Essential study tools and sample question bank for registered nurse licensure candidates.",
    audience: "RN candidates beginning early topic review or supplemental practice.",
    pathway: "RN",
    planType: "starter",
    price: 29,
    currency: "USD",
    billingInterval: "month",
    durationLabel: "30-Day Monthly Access",
    features: [
      "Access to foundational RN practice questions",
      "Detailed answer rationales",
      "7-domain Nursing Study Guide access",
      "Basic topic progress tracking",
    ],
    displayOrder: 5,
    isActive: true,
    entitlements: ["rn"],
  },
  {
    id: "rn-starter-90",
    slug: "nclex-rn-starter-90",
    name: "NCLEX-RN Starter Review (90-Day)",
    description:
      "90-day quarterly access to essential NCLEX-RN study tools, sample question practice, and clinical rationales.",
    audience: "RN candidates building foundational nursing knowledge over a full academic term.",
    pathway: "RN",
    planType: "starter",
    price: 75,
    originalPrice: 87,
    currency: "USD",
    billingInterval: "quarter",
    durationLabel: "90-Day Quarterly Access",
    features: [
      "Access to foundational RN practice questions (90 days)",
      "Detailed answer rationales",
      "7-domain Nursing Study Guide access",
      "Basic topic progress tracking",
    ],
    displayOrder: 6,
    isActive: true,
    entitlements: ["rn"],
  },
  {
    id: "pn-starter",
    slug: "nclex-pn-starter",
    name: "NCLEX-PN Starter Review",
    description:
      "Essential study tools and sample question bank for practical nurse candidates.",
    audience: "LPN/LVN students seeking foundational question practice and study notes.",
    pathway: "PN",
    planType: "starter",
    price: 29,
    currency: "USD",
    billingInterval: "month",
    durationLabel: "30-Day Monthly Access",
    features: [
      "Access to foundational PN practice questions",
      "Detailed answer & distractor rationales",
      "7-domain Nursing Study Guide & notes",
      "Basic topic progress tracking",
    ],
    displayOrder: 7,
    isActive: true,
    entitlements: ["pn"],
  },
  {
    id: "pn-starter-90",
    slug: "nclex-pn-starter-90",
    name: "NCLEX-PN Starter Review (90-Day)",
    description:
      "90-day quarterly access to essential NCLEX-PN study tools, sample question practice, and clinical rationales.",
    audience: "LPN/LVN students building foundational nursing knowledge over a full term.",
    pathway: "PN",
    planType: "starter",
    price: 75,
    originalPrice: 87,
    currency: "USD",
    billingInterval: "quarter",
    durationLabel: "90-Day Quarterly Access",
    features: [
      "Access to foundational PN practice questions (90 days)",
      "Detailed answer & distractor rationales",
      "7-domain Nursing Study Guide & notes",
      "Basic topic progress tracking",
    ],
    displayOrder: 8,
    isActive: true,
    entitlements: ["pn"],
  },
  {
    id: "prep-premium",
    slug: "nclex-all-access",
    name: "NCLEX-RN & PN All-Access",
    description:
      "Comprehensive multi-pathway suite with both RN and PN question banks, clinical scenarios, and study plans.",
    audience: "Candidates or bridging students who want full access to both RN and PN pathways.",
    pathway: "Both",
    planType: "premium",
    price: 89,
    currency: "USD",
    billingInterval: "month",
    durationLabel: "30-Day Monthly Access",
    features: [
      "Full question bank access (both PN & RN tracks)",
      "Multi-step clinical scenario practice items",
      "Structured daily study routine & domain tracking",
      "Priority educator email support",
      "High-alert pharmacology & Study Guide notes",
    ],
    badgeText: "Dual Pathway Suite",
    displayOrder: 9,
    isActive: true,
    entitlements: ["rn", "pn"],
  },
  {
    id: "prep-premium-90",
    slug: "nclex-all-access-90",
    name: "NCLEX-RN & PN All-Access (90-Day)",
    description:
      "90-day quarterly access to both NCLEX-PN and NCLEX-RN pathways, clinical scenarios, and priority support.",
    audience: "Candidates seeking extended multi-pathway preparation and educator support.",
    pathway: "Both",
    planType: "premium",
    price: 229,
    originalPrice: 267,
    currency: "USD",
    billingInterval: "quarter",
    durationLabel: "90-Day Quarterly Access",
    features: [
      "Full question bank access (both PN & RN tracks for 90 days)",
      "Multi-step clinical scenario practice items",
      "Structured daily study routine & domain tracking",
      "Priority educator email support",
      "High-alert pharmacology & Study Guide notes",
    ],
    badgeText: "Best Value Dual Pathway",
    displayOrder: 10,
    isActive: true,
    entitlements: ["rn", "pn"],
  },
  {
    id: "rn-readiness",
    slug: "nclex-rn-readiness",
    name: "NCLEX-RN Readiness Assessment Pack",
    description:
      "3 full-length server-scored practice assessments with domain-level scoring reports.",
    audience: "RN candidates who want standalone timed readiness assessments before exam day.",
    pathway: "RN",
    planType: "readiness",
    price: 39,
    currency: "USD",
    billingInterval: "one-time",
    durationLabel: "One-Time Assessment Pack",
    features: [
      "3 timed, full-length RN practice assessments",
      "Topic breakdown and domain score report",
      "Readiness performance summary",
      "Full rationale review for every question",
    ],
    displayOrder: 11,
    isActive: true,
    entitlements: ["rn"],
  },
  {
    id: "pn-readiness",
    slug: "nclex-pn-readiness",
    name: "NCLEX-PN Readiness Assessment Pack",
    description:
      "3 full-length practical nursing readiness assessments with Client Needs category scoring feedback.",
    audience: "PN candidates looking to benchmark their exam readiness with standalone timed assessments.",
    pathway: "PN",
    planType: "readiness",
    price: 39,
    currency: "USD",
    billingInterval: "one-time",
    durationLabel: "One-Time Assessment Pack",
    features: [
      "3 timed, full-length PN practice assessments",
      "Client Needs category score report",
      "Readiness performance summary",
      "Full rationale review for every question",
    ],
    displayOrder: 12,
    isActive: true,
    entitlements: ["pn"],
  },
];

export function getAllProducts(): Product[] {
  return PRODUCTS.filter((p) => p.isActive !== false);
}

export function getProductById(id: string): Product | undefined {
  if (!id) return undefined;
  const normalizedId = id.trim().toLowerCase();

  // Handle plan aliases from query params (e.g. ?plan=pro, ?plan=starter, ?programme=RN)
  if (normalizedId === "pro") return PRODUCTS.find((p) => p.id === "rn-pro");
  if (normalizedId === "starter") return PRODUCTS.find((p) => p.id === "rn-starter");
  if (normalizedId === "premium") return PRODUCTS.find((p) => p.id === "prep-premium");
  if (normalizedId === "all-access") return PRODUCTS.find((p) => p.id === "prep-premium");
  if (normalizedId === "rn") return PRODUCTS.find((p) => p.id === "rn-pro");
  if (normalizedId === "pn") return PRODUCTS.find((p) => p.id === "pn-pro");

  return PRODUCTS.find(
    (p) => p.id.toLowerCase() === normalizedId || (p.slug && p.slug.toLowerCase() === normalizedId)
  );
}
