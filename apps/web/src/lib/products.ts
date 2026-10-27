export interface Product {
  id: string;
  name: string;
  description: string;
  pathway: "RN" | "PN" | "Both";
  planType: "starter" | "pro" | "premium" | "readiness";
  price: number;
  currency: string;
  billingInterval: "month" | "one-time";
  features: string[];
  popular?: boolean;
}

export const PRODUCTS: Product[] = [
  {
    id: "rn-pro",
    name: "NCLEX-RN Complete Preparation",
    description: "Full question bank, readiness assessments, and progress tracking for registered nurse candidates.",
    pathway: "RN",
    planType: "pro",
    price: 59,
    currency: "USD",
    billingInterval: "month",
    features: [
      "3,500+ original NGN-style questions",
      "Detailed clinical answer rationales",
      "Unlimited CAT practice exams",
      "3 server-scored readiness assessments",
      "Topic-level clinical judgment analytics",
    ],
    popular: true,
  },
  {
    id: "pn-pro",
    name: "NCLEX-PN Complete Preparation",
    description: "Full question bank, readiness assessments, and progress tracking for practical/vocational nurse candidates.",
    pathway: "PN",
    planType: "pro",
    price: 59,
    currency: "USD",
    billingInterval: "month",
    features: [
      "2,800+ practical nursing questions",
      "Detailed clinical answer rationales",
      "Adaptive CAT simulation exams",
      "3 server-scored readiness assessments",
      "Coordinated care & reporting analytics",
    ],
    popular: true,
  },
  {
    id: "rn-starter",
    name: "NCLEX-RN Starter Review",
    description: "Essential study tools and sample question bank for registered nurse licensure candidates.",
    pathway: "RN",
    planType: "starter",
    price: 29,
    currency: "USD",
    billingInterval: "month",
    features: [
      "Access to sample NGN questions",
      "Detailed answer rationales",
      "Basic progress tracking",
      "Mobile and desktop access",
    ],
  },
  {
    id: "pn-starter",
    name: "NCLEX-PN Starter Review",
    description: "Essential study tools and sample question bank for practical nurse candidates.",
    pathway: "PN",
    planType: "starter",
    price: 29,
    currency: "USD",
    billingInterval: "month",
    features: [
      "Access to sample PN questions",
      "Detailed answer rationales",
      "Basic progress tracking",
      "Mobile and desktop access",
    ],
  },
  {
    id: "prep-premium",
    name: "NCLEX-RN & PN All-Access",
    description: "Comprehensive multi-pathway suite with advanced NGN unfolding case studies and study plans.",
    pathway: "Both",
    planType: "premium",
    price: 89,
    currency: "USD",
    billingInterval: "month",
    features: [
      "Full question access (RN & PN tracks)",
      "Unfolding 6-part NGN case studies",
      "Personalized daily study routine",
      "Priority educator email support",
      "High-alert pharmacology review pack",
    ],
  },
  {
    id: "rn-readiness",
    name: "NCLEX-RN Readiness Assessment Pack",
    description: "3 full-length server-scored simulated adaptive exams with predictive scoring reports.",
    pathway: "RN",
    planType: "readiness",
    price: 39,
    currency: "USD",
    billingInterval: "one-time",
    features: [
      "3 timed, realistic CAT practice tests",
      "Topic breakdown and readiness score",
      "Predictive likelihood of passing indicator",
      "Full rationale review for every question",
    ],
  },
  {
    id: "pn-readiness",
    name: "NCLEX-PN Readiness Assessment Pack",
    description: "3 full-length simulated adaptive exams with practical nursing scoring feedback.",
    pathway: "PN",
    planType: "readiness",
    price: 39,
    currency: "USD",
    billingInterval: "one-time",
    features: [
      "3 timed, realistic CAT practice tests",
      "Client needs category score report",
      "Predictive readiness assessment",
      "Full rationale review for every question",
    ],
  },
];

export function getAllProducts(): Product[] {
  return PRODUCTS;
}

export function getProductById(id: string): Product | undefined {
  if (!id) return undefined;
  const normalizedId = id.trim().toLowerCase();

  // Handle plan aliases from query params (e.g. ?plan=pro, ?plan=starter, ?programme=RN)
  if (normalizedId === "pro") return PRODUCTS.find((p) => p.id === "rn-pro");
  if (normalizedId === "starter") return PRODUCTS.find((p) => p.id === "rn-starter");
  if (normalizedId === "premium") return PRODUCTS.find((p) => p.id === "prep-premium");
  if (normalizedId === "rn") return PRODUCTS.find((p) => p.id === "rn-pro");
  if (normalizedId === "pn") return PRODUCTS.find((p) => p.id === "pn-pro");

  return PRODUCTS.find((p) => p.id.toLowerCase() === normalizedId);
}
