/**
 * PrepFord Assessment Data & Persistence Store
 * Provides typed data models, realistic clinical scenarios, performance tier calculations,
 * and localStorage persistence for completed learner tests and reference cohort benchmarks.
 */

export type PerformanceTier = "Very High" | "High" | "Borderline" | "Low";

export interface QuestionReviewItem {
  id: string;
  questionNumber: number;
  stem: string;
  domain: string;
  subdomain?: string;
  userAnswerIndex: number;
  correctAnswerIndex: number;
  options: string[];
  rationale: string;
  isCorrect: boolean;
}

export interface DomainPerformance {
  domain: string;
  scorePercent: number;
  totalQuestions: number;
  correctCount: number;
}

export interface CompletedAssessmentAttempt {
  id: string;
  name: string; // e.g. "Tutored CAT 7"
  type: "tutored_cat" | "rat";
  date: string; // Formatted date string, e.g. "Oct 24, 2026"
  timestamp: number; // Unix timestamp for sorting
  scorePercent: number; // 0 - 100
  performanceTier: PerformanceTier;
  totalQuestions: number;
  correctCount: number;
  durationMinutes: number;
  domains: DomainPerformance[];
  questions: QuestionReviewItem[];
  isSampleData?: boolean;
}

/**
 * Classifies score percentage into standard NCLEX readiness tiers:
 * - Very High: >= 75% (Strong pass probability)
 * - High: 65% - 74% (Pass probability on target)
 * - Borderline: 55% - 64% (Near passing threshold standard)
 * - Low: < 55% (Remediation recommended)
 */
export function getPerformanceTier(scorePercent: number): PerformanceTier {
  if (scorePercent >= 75) return "Very High";
  if (scorePercent >= 65) return "High";
  if (scorePercent >= 55) return "Borderline";
  return "Low";
}

export function getTierShortCode(tier: PerformanceTier): string {
  switch (tier) {
    case "Very High":
      return "VH";
    case "High":
      return "H";
    case "Borderline":
      return "B";
    case "Low":
      return "L";
  }
}

export function getTierStyles(tier: PerformanceTier): {
  badgeBg: string;
  badgeBorder: string;
  accentHex: string;
  label: string;
  shortCode: string;
} {
  switch (tier) {
    case "Very High":
      return {
        badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        badgeBorder: "border-emerald-500/30",
        accentHex: "#10b981",
        label: "Very High",
        shortCode: "VH",
      };
    case "High":
      return {
        badgeBg: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
        badgeBorder: "border-teal-500/30",
        accentHex: "#0d9488",
        label: "High",
        shortCode: "H",
      };
    case "Borderline":
      return {
        badgeBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
        badgeBorder: "border-amber-500/30",
        accentHex: "#f59e0b",
        label: "Borderline",
        shortCode: "B",
      };
    case "Low":
      return {
        badgeBg: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
        badgeBorder: "border-rose-500/30",
        accentHex: "#ef4444",
        label: "Low",
        shortCode: "L",
      };
  }
}

/**
 * Standard NCLEX Client Needs categories for question attribution
 */
export const NCLEX_CLIENT_NEEDS = [
  "Safe and Effective Care Environment: Management of Care",
  "Safe and Effective Care Environment: Safety and Infection Control",
  "Health Promotion and Maintenance",
  "Psychosocial Integrity",
  "Physiological Integrity: Basic Care and Comfort",
  "Physiological Integrity: Pharmacological and Parenteral Therapies",
  "Physiological Integrity: Reduction of Risk Potential",
  "Physiological Integrity: Physiological Adaptation",
] as const;

/**
 * High-yield question bank for interactive test reviews and realistic simulation
 */
export const CLINICAL_QUESTION_BANK: Omit<QuestionReviewItem, "id" | "questionNumber" | "userAnswerIndex" | "isCorrect">[] = [
  {
    stem: "A client with acute decompensated heart failure is prescribed furosemide 40 mg IV push. Before administration, which laboratory result is most critical for the nurse to verify?",
    domain: "Physiological Integrity: Pharmacological and Parenteral Therapies",
    subdomain: "Fluid and Electrolyte Balance",
    correctAnswerIndex: 1,
    options: [
      "Serum sodium 138 mEq/L",
      "Serum potassium 3.1 mEq/L",
      "Serum calcium 9.2 mg/dL",
      "Blood urea nitrogen (BUN) 18 mg/dL",
    ],
    rationale:
      "Furosemide is a potent loop diuretic that causes renal excretion of potassium, sodium, and water. A baseline potassium level of 3.1 mEq/L indicates hypokalemia. Administering furosemide without potassium repletion could precipitate life-threatening cardiac dysrhythmias (e.g., ventricular tachycardia or fibrillation). Normal serum potassium is 3.5–5.0 mEq/L.",
  },
  {
    stem: "The nurse receives change-of-shift report on four adult clients. Which client should the nurse assess first?",
    domain: "Safe and Effective Care Environment: Management of Care",
    subdomain: "Prioritization of Care",
    correctAnswerIndex: 2,
    options: [
      "A client 2 days postoperative following a hemicolectomy reporting surgical site pain rated 6/10",
      "A client with chronic kidney disease whose scheduled hemodialysis is delayed by 45 minutes",
      "A client with asthma who was wheezing earlier and now has a silent chest with respiratory rate of 34 breaths/min",
      "A client with type 2 diabetes whose pre-meal capillary glucose reading is 190 mg/dL",
    ],
    rationale:
      "A 'silent chest' in an asthmatic client previously exhibiting wheezing indicates critical airway constriction and respiratory exhaustion with little to no air movement. This is an impending respiratory arrest emergency requiring immediate intervention. Using the ABC (Airway, Breathing, Circulation) framework, this client is the highest priority.",
  },
  {
    stem: "A client receiving a continuous IV infusion of regular insulin for diabetic ketoacidosis (DKA) has a current capillary blood glucose of 220 mg/dL. Which prescription should the nurse anticipate next?",
    domain: "Physiological Integrity: Physiological Adaptation",
    subdomain: "Endocrine Emergencies",
    correctAnswerIndex: 0,
    options: [
      "Add 5% dextrose to the IV infusion fluid while maintaining insulin titration",
      "Discontinue the insulin infusion immediately and transition to subcutaneous sliding scale",
      "Double the hourly rate of the insulin infusion until glucose reaches 110 mg/dL",
      "Administer 25 grams of 50% dextrose via rapid IV bolus",
    ],
    rationale:
      "In DKA management, when serum blood glucose decreases to approximately 200–250 mg/dL, dextrose (e.g., D5W with 0.45% NS) is added to the IV solution. This prevents rapid hypoglycemia and cerebral edema while permitting continued insulin administration to resolve remaining ketoacidosis and clear serum ketones.",
  },
  {
    stem: "A nurse is caring for a client with neutropenia following high-dose chemotherapy (absolute neutrophil count 450/mm³). Which nursing intervention is essential to include in the plan of care?",
    domain: "Safe and Effective Care Environment: Safety and Infection Control",
    subdomain: "Neutropenic Precautions",
    correctAnswerIndex: 3,
    options: [
      "Instruct the client to consume fresh unpeeled fruits and raw vegetables to promote peristalsis",
      "Keep fresh flowers and potted plants in the client's room to enhance emotional well-being",
      "Take rectal temperatures every 4 hours to detect early hypothermia",
      "Avoid standing water, eliminate raw produce and flowers, and enforce meticulous hand hygiene for all staff and visitors",
    ],
    rationale:
      "Clients with severe neutropenia (ANC < 500/mm³) have severely compromised immune defenses. Protective isolation includes eliminating vectors for opportunistic pathogens such as fresh flowers, stagnant water, and unwashed raw produce. Rectal temperatures and enemas are strictly contraindicated due to mucosal trauma and systemic bacteremia risks.",
  },
  {
    stem: "A nurse is preparing discharge education for a client newly prescribed warfarin. Which statement by the client indicates an accurate understanding of dietary management?",
    domain: "Physiological Integrity: Pharmacological and Parenteral Therapies",
    subdomain: "Anticoagulation Therapy",
    correctAnswerIndex: 1,
    options: [
      "I must completely avoid all green leafy vegetables for the duration of my warfarin therapy",
      "I will keep my intake of green leafy vegetables consistent from day to day and avoid sudden large changes",
      "I can double my warfarin dose if I eat an extra serving of spinach or broccoli",
      "Drinking green tea and cranberry juice in large quantities will safely enhance my blood thinning",
    ],
    rationale:
      "Warfarin is a vitamin K antagonist. Clients do not need to eliminate vitamin K foods entirely; doing so can lead to nutritional deficiencies and erratic INR fluctuations. Instead, clients are instructed to maintain consistent day-to-day dietary vitamin K intake so the prescriber can titrate the dose accurately.",
  },
  {
    stem: "A client who underwent an open thyroidectomy 18 hours ago reports numbness and tingling around the mouth and fingers. The nurse observes involuntary carpopedal spasm when inflating the blood pressure cuff. Which medication should the nurse have immediately available?",
    domain: "Physiological Integrity: Reduction of Risk Potential",
    subdomain: "Postoperative Complications",
    correctAnswerIndex: 2,
    options: [
      "Potassium chloride IV infusion",
      "Sodium bicarbonate 8.4% ampule",
      "Calcium gluconate 10% IV solution",
      "Magnesium sulfate 50% solution",
    ],
    rationale:
      "During thyroid surgery, the parathyroid glands may be inadvertently traumatized, devascularized, or excised, resulting in acute hypoparathyroidism and hypocalcemia. Perioral paresthesias and a positive Trousseau sign (carpal spasm with cuff inflation) are classic signs of tetany. Emergency IV calcium gluconate must be immediately accessible to avert laryngeal spasm and seizures.",
  },
  {
    stem: "The nurse is reviewing laboratory results for an adult client with suspected acute pancreatitis. Which pair of enzyme elevations is most characteristic of this diagnosis?",
    domain: "Physiological Integrity: Reduction of Risk Potential",
    subdomain: "Gastrointestinal Assessment",
    correctAnswerIndex: 0,
    options: [
      "Elevated serum lipase and amylase",
      "Elevated troponin I and CK-MB",
      "Elevated aspartate aminotransferase (AST) and alkaline phosphatase",
      "Elevated blood urea nitrogen and creatinine",
    ],
    rationale:
      "Acute pancreatitis is characterized by autodigestion of pancreatic tissue by prematurely activated digestive enzymes. Serum amylase rises within hours and returns to baseline in 3–5 days, while serum lipase remains elevated for 7–14 days and is more specific to pancreatic tissue. Troponin is cardiac; AST/ALP are hepatic; BUN/creatinine are renal.",
  },
];

/**
 * 7 Reference cohort attempts matching the Naxlex reference screenshot
 * (Tutored CAT 1 through Tutored CAT 7)
 */
export const SAMPLE_BENCHMARK_ATTEMPTS: CompletedAssessmentAttempt[] = [
  {
    id: "tcat-07",
    name: "Tutored CAT 7",
    type: "tutored_cat",
    date: "Oct 24, 2026",
    timestamp: 1729756800000,
    scorePercent: 70,
    performanceTier: "High",
    totalQuestions: 65,
    correctCount: 46,
    durationMinutes: 52,
    isSampleData: true,
    domains: [
      { domain: "Management of Care", scorePercent: 74, totalQuestions: 15, correctCount: 11 },
      { domain: "Pharmacology & Parenteral", scorePercent: 71, totalQuestions: 14, correctCount: 10 },
      { domain: "Physiological Adaptation", scorePercent: 67, totalQuestions: 12, correctCount: 8 },
      { domain: "Reduction of Risk Potential", scorePercent: 75, totalQuestions: 12, correctCount: 9 },
      { domain: "Safety & Infection Control", scorePercent: 67, totalQuestions: 12, correctCount: 8 },
    ],
    questions: CLINICAL_QUESTION_BANK.map((q, idx) => ({
      ...q,
      id: `q-07-${idx + 1}`,
      questionNumber: idx + 1,
      userAnswerIndex: idx === 2 || idx === 5 ? (q.correctAnswerIndex + 1) % 4 : q.correctAnswerIndex,
      isCorrect: idx !== 2 && idx !== 5,
    })),
  },
  {
    id: "tcat-06",
    name: "Tutored CAT 6",
    type: "tutored_cat",
    date: "Oct 22, 2026",
    timestamp: 1729584000000,
    scorePercent: 88,
    performanceTier: "Very High",
    totalQuestions: 85,
    correctCount: 75,
    durationMinutes: 68,
    isSampleData: true,
    domains: [
      { domain: "Management of Care", scorePercent: 90, totalQuestions: 20, correctCount: 18 },
      { domain: "Pharmacology & Parenteral", scorePercent: 85, totalQuestions: 20, correctCount: 17 },
      { domain: "Physiological Adaptation", scorePercent: 89, totalQuestions: 19, correctCount: 17 },
      { domain: "Reduction of Risk Potential", scorePercent: 87, totalQuestions: 15, correctCount: 13 },
      { domain: "Safety & Infection Control", scorePercent: 91, totalQuestions: 11, correctCount: 10 },
    ],
    questions: CLINICAL_QUESTION_BANK.map((q, idx) => ({
      ...q,
      id: `q-06-${idx + 1}`,
      questionNumber: idx + 1,
      userAnswerIndex: q.correctAnswerIndex,
      isCorrect: true,
    })),
  },
  {
    id: "tcat-05",
    name: "Tutored CAT 5",
    type: "tutored_cat",
    date: "Oct 19, 2026",
    timestamp: 1729324800000,
    scorePercent: 68,
    performanceTier: "High",
    totalQuestions: 65,
    correctCount: 44,
    durationMinutes: 50,
    isSampleData: true,
    domains: [
      { domain: "Management of Care", scorePercent: 67, totalQuestions: 15, correctCount: 10 },
      { domain: "Pharmacology & Parenteral", scorePercent: 71, totalQuestions: 14, correctCount: 10 },
      { domain: "Physiological Adaptation", scorePercent: 64, totalQuestions: 14, correctCount: 9 },
      { domain: "Reduction of Risk Potential", scorePercent: 67, totalQuestions: 12, correctCount: 8 },
      { domain: "Safety & Infection Control", scorePercent: 70, totalQuestions: 10, correctCount: 7 },
    ],
    questions: CLINICAL_QUESTION_BANK.map((q, idx) => ({
      ...q,
      id: `q-05-${idx + 1}`,
      questionNumber: idx + 1,
      userAnswerIndex: idx % 3 === 0 ? (q.correctAnswerIndex + 1) % 4 : q.correctAnswerIndex,
      isCorrect: idx % 3 !== 0,
    })),
  },
  {
    id: "tcat-04",
    name: "Tutored CAT 4",
    type: "tutored_cat",
    date: "Oct 15, 2026",
    timestamp: 1728979200000,
    scorePercent: 62,
    performanceTier: "Borderline",
    totalQuestions: 40,
    correctCount: 25,
    durationMinutes: 35,
    isSampleData: true,
    domains: [
      { domain: "Management of Care", scorePercent: 60, totalQuestions: 10, correctCount: 6 },
      { domain: "Pharmacology & Parenteral", scorePercent: 60, totalQuestions: 10, correctCount: 6 },
      { domain: "Physiological Adaptation", scorePercent: 67, totalQuestions: 9, correctCount: 6 },
      { domain: "Reduction of Risk Potential", scorePercent: 64, totalQuestions: 11, correctCount: 7 },
    ],
    questions: CLINICAL_QUESTION_BANK.slice(0, 5).map((q, idx) => ({
      ...q,
      id: `q-04-${idx + 1}`,
      questionNumber: idx + 1,
      userAnswerIndex: idx % 2 === 0 ? (q.correctAnswerIndex + 1) % 4 : q.correctAnswerIndex,
      isCorrect: idx % 2 !== 0,
    })),
  },
  {
    id: "tcat-03",
    name: "Tutored CAT 3",
    type: "tutored_cat",
    date: "Oct 11, 2026",
    timestamp: 1728633600000,
    scorePercent: 75,
    performanceTier: "Very High",
    totalQuestions: 75,
    correctCount: 56,
    durationMinutes: 58,
    isSampleData: true,
    domains: [
      { domain: "Management of Care", scorePercent: 76, totalQuestions: 17, correctCount: 13 },
      { domain: "Pharmacology & Parenteral", scorePercent: 75, totalQuestions: 16, correctCount: 12 },
      { domain: "Physiological Adaptation", scorePercent: 73, totalQuestions: 15, correctCount: 11 },
      { domain: "Reduction of Risk Potential", scorePercent: 78, totalQuestions: 14, correctCount: 11 },
      { domain: "Safety & Infection Control", scorePercent: 69, totalQuestions: 13, correctCount: 9 },
    ],
    questions: CLINICAL_QUESTION_BANK.map((q, idx) => ({
      ...q,
      id: `q-03-${idx + 1}`,
      questionNumber: idx + 1,
      userAnswerIndex: idx === 1 ? (q.correctAnswerIndex + 2) % 4 : q.correctAnswerIndex,
      isCorrect: idx !== 1,
    })),
  },
  {
    id: "tcat-02",
    name: "Tutored CAT 2",
    type: "tutored_cat",
    date: "Oct 06, 2026",
    timestamp: 1728201600000,
    scorePercent: 60,
    performanceTier: "Borderline",
    totalQuestions: 65,
    correctCount: 39,
    durationMinutes: 48,
    isSampleData: true,
    domains: [
      { domain: "Management of Care", scorePercent: 57, totalQuestions: 14, correctCount: 8 },
      { domain: "Pharmacology & Parenteral", scorePercent: 62, totalQuestions: 13, correctCount: 8 },
      { domain: "Physiological Adaptation", scorePercent: 64, totalQuestions: 14, correctCount: 9 },
      { domain: "Reduction of Risk Potential", scorePercent: 58, totalQuestions: 12, correctCount: 7 },
      { domain: "Safety & Infection Control", scorePercent: 58, totalQuestions: 12, correctCount: 7 },
    ],
    questions: CLINICAL_QUESTION_BANK.map((q, idx) => ({
      ...q,
      id: `q-02-${idx + 1}`,
      questionNumber: idx + 1,
      userAnswerIndex: idx % 2 === 1 ? (q.correctAnswerIndex + 1) % 4 : q.correctAnswerIndex,
      isCorrect: idx % 2 !== 1,
    })),
  },
  {
    id: "tcat-01",
    name: "Tutored CAT 1",
    type: "tutored_cat",
    date: "Sep 28, 2026",
    timestamp: 1727510400000,
    scorePercent: 54,
    performanceTier: "Low",
    totalQuestions: 60,
    correctCount: 32,
    durationMinutes: 45,
    isSampleData: true,
    domains: [
      { domain: "Management of Care", scorePercent: 50, totalQuestions: 12, correctCount: 6 },
      { domain: "Pharmacology & Parenteral", scorePercent: 54, totalQuestions: 13, correctCount: 7 },
      { domain: "Physiological Adaptation", scorePercent: 53, totalQuestions: 15, correctCount: 8 },
      { domain: "Reduction of Risk Potential", scorePercent: 55, totalQuestions: 11, correctCount: 6 },
      { domain: "Safety & Infection Control", scorePercent: 56, totalQuestions: 9, correctCount: 5 },
    ],
    questions: CLINICAL_QUESTION_BANK.map((q, idx) => ({
      ...q,
      id: `q-01-${idx + 1}`,
      questionNumber: idx + 1,
      userAnswerIndex: idx % 2 === 0 ? (q.correctAnswerIndex + 1) % 4 : q.correctAnswerIndex,
      isCorrect: idx % 2 !== 0,
    })),
  },
];

/**
 * Storage helpers for learner-specific attempts
 */
const STORAGE_PREFIX = "prepford_assessment_attempts_";

export function getStoredAttempts(userId?: string): CompletedAssessmentAttempt[] {
  if (typeof window === "undefined") return [];
  const key = `${STORAGE_PREFIX}${userId || "guest"}`;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to read assessment attempts from localStorage", err);
    return [];
  }
}

export function saveStoredAttempt(userId: string | undefined, attempt: CompletedAssessmentAttempt): void {
  if (typeof window === "undefined") return;
  const key = `${STORAGE_PREFIX}${userId || "guest"}`;
  try {
    const existing = getStoredAttempts(userId);
    const updated = [attempt, ...existing.filter((a) => a.id !== attempt.id)];
    window.localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save assessment attempt to localStorage", err);
  }
}

export function clearStoredAttempts(userId?: string): void {
  if (typeof window === "undefined") return;
  const key = `${STORAGE_PREFIX}${userId || "guest"}`;
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.error("Failed to clear assessment attempts", err);
  }
}

/**
 * Creates a completed assessment attempt from user-submitted answers
 */
export function createCompletedAttempt(options: {
  testType: "tutored_cat" | "rat";
  attemptNumber: number;
  questionCount: number;
  userAnswers: { questionIndex: number; selectedOptionIndex: number }[];
}): CompletedAssessmentAttempt {
  const { testType, attemptNumber, questionCount, userAnswers } = options;
  const bankSlice = CLINICAL_QUESTION_BANK.slice(0, Math.min(questionCount, CLINICAL_QUESTION_BANK.length));

  let correctCount = 0;
  const questions: QuestionReviewItem[] = bankSlice.map((q, idx) => {
    const submitted = userAnswers.find((a) => a.questionIndex === idx);
    const userAnswerIndex = submitted !== undefined ? submitted.selectedOptionIndex : 0;
    const isCorrect = userAnswerIndex === q.correctAnswerIndex;
    if (isCorrect) correctCount += 1;

    return {
      ...q,
      id: `attempt-q-${idx + 1}`,
      questionNumber: idx + 1,
      userAnswerIndex,
      isCorrect,
    };
  });

  const total = questions.length || 1;
  const scorePercent = Math.round((correctCount / total) * 100);
  const performanceTier = getPerformanceTier(scorePercent);

  // Group into domains
  const domainMap = new Map<string, { total: number; correct: number }>();
  for (const q of questions) {
    const entry = domainMap.get(q.domain) || { total: 0, correct: 0 };
    entry.total += 1;
    if (q.isCorrect) entry.correct += 1;
    domainMap.set(q.domain, entry);
  }

  const domains: DomainPerformance[] = Array.from(domainMap.entries()).map(([domain, data]) => ({
    domain,
    scorePercent: Math.round((data.correct / data.total) * 100),
    totalQuestions: data.total,
    correctCount: data.correct,
  }));

  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const prefix = testType === "tutored_cat" ? "Tutored CAT" : "Readiness Test";

  return {
    id: `attempt-${Date.now()}`,
    name: `${prefix} ${attemptNumber}`,
    type: testType,
    date: dateFormatted,
    timestamp: Date.now(),
    scorePercent,
    performanceTier,
    totalQuestions: total,
    correctCount,
    durationMinutes: Math.max(5, Math.round(total * 0.8)),
    domains,
    questions,
    isSampleData: false,
  };
}
