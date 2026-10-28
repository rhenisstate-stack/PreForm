/**
 * PrepFord Assessment Data & Persistence Store
 * Provides typed data models, realistic clinical scenarios, performance tier calculations,
 * and localStorage persistence for completed learner tests and reference cohort benchmarks.
 */

export type PerformanceTier = "Very High" | "High" | "Borderline" | "Low";
export type QuestionType = "single_choice" | "multi_select";

export interface ClinicalQuestionDefinition {
  id: string;
  stem: string;
  domain: string;
  subdomain?: string;
  questionType: QuestionType;
  options: string[];
  correctAnswerIndex?: number; // For single_choice
  correctAnswerIndices?: number[]; // For multi_select
  rationale: string;
}

export interface QuestionReviewItem {
  id: string;
  questionNumber: number;
  stem: string;
  domain: string;
  subdomain?: string;
  questionType: QuestionType;
  userAnswerIndex?: number; // Single-choice selection (-1 if unanswered)
  userAnswerIndices?: number[]; // Multi-select selections ([] if unanswered)
  correctAnswerIndex?: number; // Single-choice key
  correctAnswerIndices?: number[]; // Multi-select keys
  options: string[];
  rationale: string;
  isCorrect: boolean;
  scoreAwarded: number; // 0 to 1
  isUnanswered: boolean;
}

export interface DomainPerformance {
  domain: string;
  scorePercent: number;
  totalQuestions: number;
  correctCount: number;
}

export interface CompletedAssessmentAttempt {
  id: string;
  name: string; // e.g. "Tutored CAT 1"
  type: "tutored_cat" | "rat";
  date: string; // Formatted date string, e.g. "Oct 28, 2026"
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
 * Classifies score percentage into standard PrepFord assessment readiness tiers:
 * - Very High: >= 75% (Advanced readiness tier - solid foundational mastery across assessed domains)
 * - High: 65% - 74% (Proficient readiness tier - on target with PrepFord practice benchmark)
 * - Borderline: 55% - 64% (Developing readiness tier - targeted review recommended in low-scoring domains)
 * - Low: < 55% (Remediation recommended - foundational clinical concept reinforcement advised)
 *
 * Boundaries are mutually exclusive and cover every possible integer score from 0% to 100%.
 */
export function getPerformanceTier(scorePercent: number): PerformanceTier {
  if (scorePercent >= 75) return "Very High";
  if (scorePercent >= 65) return "High";
  if (scorePercent >= 55) return "Borderline";
  return "Low";
}

export function getTierDescription(tier: PerformanceTier): string {
  switch (tier) {
    case "Very High":
      return "Advanced readiness tier (score >= 75%) — Demonstrates solid conceptual mastery across evaluated nursing domains.";
    case "High":
      return "Proficient readiness tier (score 65%–74%) — On target with PrepFord practice benchmark; maintain balanced study.";
    case "Borderline":
      return "Developing readiness tier (score 55%–64%) — Near practice benchmark; targeted review recommended in lower-scoring domains.";
    case "Low":
      return "Remediation recommended (score < 55%) — Review foundational pathophysiology and pharmacology study guides.";
  }
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
  description: string;
} {
  switch (tier) {
    case "Very High":
      return {
        badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        badgeBorder: "border-emerald-500/30",
        accentHex: "#10b981",
        label: "Very High",
        shortCode: "VH",
        description: getTierDescription("Very High"),
      };
    case "High":
      return {
        badgeBg: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
        badgeBorder: "border-teal-500/30",
        accentHex: "#0d9488",
        label: "High",
        shortCode: "H",
        description: getTierDescription("High"),
      };
    case "Borderline":
      return {
        badgeBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
        badgeBorder: "border-amber-500/30",
        accentHex: "#f59e0b",
        label: "Borderline",
        shortCode: "B",
        description: getTierDescription("Borderline"),
      };
    case "Low":
      return {
        badgeBg: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
        badgeBorder: "border-rose-500/30",
        accentHex: "#ef4444",
        label: "Low",
        shortCode: "L",
        description: getTierDescription("Low"),
      };
  }
}

/**
 * All eight standard NCSBN Client Needs categories represented in PrepFord
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
 * High-yield question bank for interactive test reviews and realistic simulation.
 * Covers all 8 NCSBN Client Needs categories and includes Select All That Apply (SATA).
 */
export const CLINICAL_QUESTION_BANK: ClinicalQuestionDefinition[] = [
  {
    id: "q-furosemide-k",
    stem: "A client with acute decompensated heart failure is prescribed furosemide 40 mg IV push. Before administration, which laboratory result is most critical for the nurse to verify?",
    domain: "Physiological Integrity: Pharmacological and Parenteral Therapies",
    subdomain: "Fluid and Electrolyte Balance",
    questionType: "single_choice",
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
    id: "q-prioritization-silent-chest",
    stem: "The nurse receives change-of-shift report on four adult clients. Which client should the nurse assess first?",
    domain: "Safe and Effective Care Environment: Management of Care",
    subdomain: "Prioritization of Care",
    questionType: "single_choice",
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
    id: "q-dka-dextrose",
    stem: "A client receiving a continuous IV infusion of regular insulin for diabetic ketoacidosis (DKA) has a current capillary blood glucose of 220 mg/dL. Which prescription should the nurse anticipate next?",
    domain: "Physiological Integrity: Physiological Adaptation",
    subdomain: "Endocrine Emergencies",
    questionType: "single_choice",
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
    id: "q-neutropenia-precautions",
    stem: "A nurse is caring for a client with neutropenia following high-dose chemotherapy (absolute neutrophil count 450/mm³). Which nursing intervention is essential to include in the plan of care?",
    domain: "Safe and Effective Care Environment: Safety and Infection Control",
    subdomain: "Neutropenic Precautions",
    questionType: "single_choice",
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
    id: "q-developmental-6month",
    stem: "A clinic nurse is conducting a 6-month well-child assessment. Which developmental milestone should the nurse expect an infant of this age to demonstrate?",
    domain: "Health Promotion and Maintenance",
    subdomain: "Growth and Development",
    questionType: "single_choice",
    correctAnswerIndex: 0,
    options: [
      "Transfers objects from hand to hand and rolls from back to front",
      "Uses a neat pincer grasp to pick up small objects",
      "Walks while holding onto furniture (cruising)",
      "Speaks four to six distinct words with intent",
    ],
    rationale:
      "At 6 months, expected gross and fine motor milestones include rolling back to front (and front to back), sitting with brief support, and transferring small objects from one hand to the other. A neat pincer grasp emerges around 9–10 months; cruising occurs between 9–12 months; speaking multiple recognizable words typically occurs around 12–18 months.",
  },
  {
    id: "q-therapeutic-suicide-assessment",
    stem: "A client with major depressive disorder is admitted to an inpatient psychiatric unit. During the initial nursing interview, the client sighs deeply and says, 'My family would be so much better off without me. Everything feels completely hopeless.' Which response by the nurse is most therapeutic?",
    domain: "Psychosocial Integrity",
    subdomain: "Crisis Intervention & Therapeutic Communication",
    questionType: "single_choice",
    correctAnswerIndex: 2,
    options: [
      "You shouldn't feel that way; your family loves you and wants you to get better.",
      "Why do you feel hopeless when you have a comprehensive treatment plan here?",
      "It sounds like you are carrying a tremendous burden right now. Are you having thoughts of killing yourself?",
      "Let us focus on positive things today; dwelling on hopelessness makes you feel worse.",
    ],
    rationale:
      "The nurse must acknowledge the client's emotional pain directly with empathy and immediately evaluate suicide risk using direct, unambiguous language. Asking 'Are you having thoughts of killing yourself?' does not plant ideas and is essential for safety. False reassurance (option A), 'why' questions that provoke defensiveness (option B), and minimizing emotions (option D) are non-therapeutic.",
  },
  {
    id: "q-pressure-injury-prevention",
    stem: "A nurse is developing a plan of care to prevent pressure injuries in an older adult client who is bedbound and malnourished following a cerebrovascular accident. Which intervention is most appropriate to include?",
    domain: "Physiological Integrity: Basic Care and Comfort",
    subdomain: "Mobility and Skin Integrity",
    questionType: "single_choice",
    correctAnswerIndex: 1,
    options: [
      "Vigorously massage reddened areas over bony prominences every 2 hours",
      "Reposition the client at least every 2 hours and maintain the head of the bed at or below 30 degrees unless contraindicated",
      "Place a donut-shaped foam ring directly under the client's sacral area",
      "Maintain the client in a high Fowler (90-degree) position throughout the day",
    ],
    rationale:
      "Frequent repositioning at least every 2 hours relieves localized capillary pressure. Keeping the head of the bed at or below 30 degrees minimizes shear and friction forces on the sacrum. Massaging reddened tissue (option A) traumatizes fragile capillaries and accelerates tissue necrosis; donut rings (option C) cause localized venous congestion and ischemia; prolonged 90-degree elevation (option D) maximizes sacral shear pressure.",
  },
  {
    id: "q-warfarin-vitamin-k",
    stem: "A nurse is preparing discharge education for a client newly prescribed warfarin. Which statement by the client indicates an accurate understanding of dietary management?",
    domain: "Physiological Integrity: Pharmacological and Parenteral Therapies",
    subdomain: "Anticoagulation Therapy",
    questionType: "single_choice",
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
    id: "q-thyroidectomy-tetany",
    stem: "A client who underwent an open thyroidectomy 18 hours ago reports numbness and tingling around the mouth and fingers. The nurse observes involuntary carpopedal spasm when inflating the blood pressure cuff. Which medication should the nurse have immediately available?",
    domain: "Physiological Integrity: Reduction of Risk Potential",
    subdomain: "Postoperative Complications",
    questionType: "single_choice",
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
    id: "q-pancreatitis-enzymes",
    stem: "The nurse is reviewing laboratory results for an adult client with suspected acute pancreatitis. Which pair of enzyme elevations is most characteristic of this diagnosis?",
    domain: "Physiological Integrity: Reduction of Risk Potential",
    subdomain: "Gastrointestinal Assessment",
    questionType: "single_choice",
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
  {
    id: "q-mi-clinical-findings-sata",
    stem: "A nurse in the emergency department is evaluating an adult client presenting with acute coronary ischemia. Which clinical assessment findings and diagnostic results are consistent with this condition? (Select all that apply.)",
    domain: "Physiological Integrity: Physiological Adaptation",
    subdomain: "Cardiovascular Emergencies",
    questionType: "multi_select",
    correctAnswerIndices: [0, 1, 2, 4],
    options: [
      "Crushing substernal chest pressure that radiates to the left shoulder and jaw",
      "Diaphoresis, nausea, and feeling of impending doom",
      "ST-segment elevation or T-wave inversion on 12-lead ECG",
      "Chest discomfort relieved by leaning forward in a tripod position",
      "Elevated serum cardiac troponin I level",
      "Bilateral lower-extremity 3+ pitting edema that resolves with elevation",
    ],
    rationale:
      "Hallmark indicators of acute myocardial ischemia/infarction include substernal chest pain radiating to the left arm/jaw, autonomic symptoms (diaphoresis, nausea, dyspnea), ischemic ECG changes (ST elevation/depression, T-wave inversion), and cardiac biomarker elevation (troponin I/T). Chest discomfort relieved by leaning forward (option D) is classic for acute pericarditis. Dependent pitting edema (option F) reflects chronic venous congestion or right-sided heart failure, not acute coronary syndrome.",
  },
];

export interface ScoreQuestionResult {
  isCorrect: boolean;
  scoreAwarded: number; // 0 to 1
  isUnanswered: boolean;
}

/**
 * Evaluates a single question against submitted user answers.
 * Handles single-choice and multi-select (SATA) items, explicit scoring rules, and unanswered states.
 */
export function scoreQuestion(
  q: ClinicalQuestionDefinition,
  userAnswer?: { selectedOptionIndex?: number; selectedOptionIndices?: number[] }
): ScoreQuestionResult {
  if (q.questionType === "multi_select") {
    const selected = userAnswer?.selectedOptionIndices ?? [];
    if (!selected || selected.length === 0) {
      return { isCorrect: false, scoreAwarded: 0, isUnanswered: true };
    }

    const correct = (q.correctAnswerIndices ?? []).slice().sort((a, b) => a - b);
    const sortedUser = selected.slice().sort((a, b) => a - b);

    // Exact Match rule (all correct options chosen, zero incorrect distractors chosen)
    const isExactMatch =
      correct.length === sortedUser.length &&
      correct.every((val, idx) => val === sortedUser[idx]);

    // NGN +/- partial credit methodology (+1 for correct key, -1 for incorrect distractor, floor at 0)
    let points = 0;
    for (const opt of sortedUser) {
      if (correct.includes(opt)) points += 1;
      else points -= 1;
    }
    const clampedPoints = Math.max(0, points);
    const partialScore = correct.length > 0 ? clampedPoints / correct.length : 0;

    return {
      isCorrect: isExactMatch,
      scoreAwarded: isExactMatch ? 1 : Number(partialScore.toFixed(2)),
      isUnanswered: false,
    };
  } else {
    // Single choice
    const selected = userAnswer?.selectedOptionIndex;
    if (selected === undefined || selected === null || selected === -1) {
      return { isCorrect: false, scoreAwarded: 0, isUnanswered: true };
    }

    const isCorrect = selected === q.correctAnswerIndex;
    return {
      isCorrect,
      scoreAwarded: isCorrect ? 1 : 0,
      isUnanswered: false,
    };
  }
}

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
    questions: CLINICAL_QUESTION_BANK.slice(0, 7).map((q, idx) => {
      const isCorrect = idx !== 2 && idx !== 5;
      const userAnswerIndex = isCorrect ? (q.correctAnswerIndex ?? 0) : ((q.correctAnswerIndex ?? 0) + 1) % 4;
      return {
        ...q,
        id: `q-07-${idx + 1}`,
        questionNumber: idx + 1,
        userAnswerIndex,
        userAnswerIndices: q.questionType === "multi_select" ? (isCorrect ? q.correctAnswerIndices : [0]) : undefined,
        isCorrect,
        scoreAwarded: isCorrect ? 1 : 0,
        isUnanswered: false,
      };
    }),
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
    questions: CLINICAL_QUESTION_BANK.slice(0, 7).map((q, idx) => ({
      ...q,
      id: `q-06-${idx + 1}`,
      questionNumber: idx + 1,
      userAnswerIndex: q.correctAnswerIndex ?? 0,
      userAnswerIndices: q.correctAnswerIndices,
      isCorrect: true,
      scoreAwarded: 1,
      isUnanswered: false,
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
    questions: CLINICAL_QUESTION_BANK.slice(0, 7).map((q, idx) => {
      const isCorrect = idx % 3 !== 0;
      const userAnswerIndex = isCorrect ? (q.correctAnswerIndex ?? 0) : ((q.correctAnswerIndex ?? 0) + 1) % 4;
      return {
        ...q,
        id: `q-05-${idx + 1}`,
        questionNumber: idx + 1,
        userAnswerIndex,
        userAnswerIndices: q.questionType === "multi_select" ? (isCorrect ? q.correctAnswerIndices : [0]) : undefined,
        isCorrect,
        scoreAwarded: isCorrect ? 1 : 0,
        isUnanswered: false,
      };
    }),
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
    questions: CLINICAL_QUESTION_BANK.slice(0, 5).map((q, idx) => {
      const isCorrect = idx % 2 !== 0;
      const userAnswerIndex = isCorrect ? (q.correctAnswerIndex ?? 0) : ((q.correctAnswerIndex ?? 0) + 1) % 4;
      return {
        ...q,
        id: `q-04-${idx + 1}`,
        questionNumber: idx + 1,
        userAnswerIndex,
        userAnswerIndices: q.questionType === "multi_select" ? (isCorrect ? q.correctAnswerIndices : [0]) : undefined,
        isCorrect,
        scoreAwarded: isCorrect ? 1 : 0,
        isUnanswered: false,
      };
    }),
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
    questions: CLINICAL_QUESTION_BANK.slice(0, 7).map((q, idx) => {
      const isCorrect = idx !== 1;
      const userAnswerIndex = isCorrect ? (q.correctAnswerIndex ?? 0) : ((q.correctAnswerIndex ?? 0) + 2) % 4;
      return {
        ...q,
        id: `q-03-${idx + 1}`,
        questionNumber: idx + 1,
        userAnswerIndex,
        userAnswerIndices: q.questionType === "multi_select" ? (isCorrect ? q.correctAnswerIndices : [0]) : undefined,
        isCorrect,
        scoreAwarded: isCorrect ? 1 : 0,
        isUnanswered: false,
      };
    }),
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
    questions: CLINICAL_QUESTION_BANK.slice(0, 7).map((q, idx) => {
      const isCorrect = idx % 2 !== 1;
      const userAnswerIndex = isCorrect ? (q.correctAnswerIndex ?? 0) : ((q.correctAnswerIndex ?? 0) + 1) % 4;
      return {
        ...q,
        id: `q-02-${idx + 1}`,
        questionNumber: idx + 1,
        userAnswerIndex,
        userAnswerIndices: q.questionType === "multi_select" ? (isCorrect ? q.correctAnswerIndices : [0]) : undefined,
        isCorrect,
        scoreAwarded: isCorrect ? 1 : 0,
        isUnanswered: false,
      };
    }),
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
    questions: CLINICAL_QUESTION_BANK.slice(0, 7).map((q, idx) => {
      const isCorrect = idx % 2 !== 0;
      const userAnswerIndex = isCorrect ? (q.correctAnswerIndex ?? 0) : ((q.correctAnswerIndex ?? 0) + 1) % 4;
      return {
        ...q,
        id: `q-01-${idx + 1}`,
        questionNumber: idx + 1,
        userAnswerIndex,
        userAnswerIndices: q.questionType === "multi_select" ? (isCorrect ? q.correctAnswerIndices : [0]) : undefined,
        isCorrect,
        scoreAwarded: isCorrect ? 1 : 0,
        isUnanswered: false,
      };
    }),
  },
];

/**
 * Storage helpers for learner-specific attempts.
 * Uses strictly namespaced keys by learner user ID.
 */
const STORAGE_PREFIX = "prepford_assessment_attempts_";

/**
 * Validates deserialized attempts at runtime before returning or rendering them.
 */
export function isValidAssessmentAttempt(obj: unknown): obj is CompletedAssessmentAttempt {
  if (!obj || typeof obj !== "object") return false;
  const a = obj as Record<string, unknown>;
  if (typeof a.id !== "string" || !a.id.trim()) return false;
  if (typeof a.name !== "string" || !a.name.trim()) return false;
  if (a.type !== "tutored_cat" && a.type !== "rat") return false;
  if (typeof a.date !== "string") return false;
  if (typeof a.timestamp !== "number" || isNaN(a.timestamp)) return false;
  if (typeof a.scorePercent !== "number" || isNaN(a.scorePercent)) return false;
  if (a.scorePercent < 0 || a.scorePercent > 100) return false;
  if (typeof a.performanceTier !== "string") return false;
  if (!["Very High", "High", "Borderline", "Low"].includes(a.performanceTier)) return false;
  if (typeof a.totalQuestions !== "number" || isNaN(a.totalQuestions)) return false;
  if (typeof a.correctCount !== "number" || isNaN(a.correctCount)) return false;
  if (!Array.isArray(a.domains)) return false;
  if (!Array.isArray(a.questions)) return false;
  return true;
}

export function getStoredAttempts(userId?: string): CompletedAssessmentAttempt[] {
  if (typeof window === "undefined") return [];
  // Strict account isolation: if no authenticated userId is provided, return empty array to prevent data bleed
  if (!userId || typeof userId !== "string" || !userId.trim()) return [];
  const key = `${STORAGE_PREFIX}${userId.trim()}`;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidAssessmentAttempt);
  } catch (err) {
    console.error("Failed to read assessment attempts from localStorage", err);
    return [];
  }
}

export function saveStoredAttempt(userId: string | undefined, attempt: CompletedAssessmentAttempt): void {
  if (typeof window === "undefined") return;
  if (!userId || typeof userId !== "string" || !userId.trim()) return;
  if (!isValidAssessmentAttempt(attempt)) {
    console.warn("Attempted to save invalid assessment attempt, skipping", attempt);
    return;
  }
  const key = `${STORAGE_PREFIX}${userId.trim()}`;
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
  if (!userId || typeof userId !== "string" || !userId.trim()) return;
  const key = `${STORAGE_PREFIX}${userId.trim()}`;
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.error("Failed to clear assessment attempts", err);
  }
}

/**
 * Creates a completed assessment attempt from user-submitted answers.
 * Implements strict scoring, correct answer checking, multi-select evaluation,
 * and handles unanswered questions without default false-positive credit.
 */
export function createCompletedAttempt(options: {
  testType: "tutored_cat" | "rat";
  attemptNumber: number;
  questionCount: number;
  userAnswers: {
    questionIndex: number;
    selectedOptionIndex?: number;
    selectedOptionIndices?: number[];
  }[];
}): CompletedAssessmentAttempt {
  const { testType, attemptNumber, questionCount, userAnswers } = options;

  if (questionCount <= 0) {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const prefix = testType === "tutored_cat" ? "Tutored CAT" : "Readiness Test";
    return {
      id: `attempt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `${prefix} ${attemptNumber}`,
      type: testType,
      date: dateFormatted,
      timestamp: Date.now(),
      scorePercent: 0,
      performanceTier: "Low",
      totalQuestions: 0,
      correctCount: 0,
      durationMinutes: 0,
      domains: [],
      questions: [],
      isSampleData: false,
    };
  }

  // Populate questions up to questionCount by slicing or cycling from CLINICAL_QUESTION_BANK
  const selectedBankItems: ClinicalQuestionDefinition[] = [];
  for (let i = 0; i < questionCount; i++) {
    const bankItem = CLINICAL_QUESTION_BANK[i % CLINICAL_QUESTION_BANK.length];
    selectedBankItems.push(bankItem);
  }

  let correctCount = 0;

  const questions: QuestionReviewItem[] = selectedBankItems.map((q, idx) => {
    const submitted = userAnswers.find((a) => a.questionIndex === idx);
    const scoreResult = scoreQuestion(q, submitted);

    if (scoreResult.isCorrect) correctCount += 1;

    return {
      ...q,
      id: `attempt-q-${idx + 1}-${q.id}`,
      questionNumber: idx + 1,
      userAnswerIndex: submitted?.selectedOptionIndex !== undefined ? submitted.selectedOptionIndex : -1,
      userAnswerIndices: submitted?.selectedOptionIndices ?? [],
      isCorrect: scoreResult.isCorrect,
      scoreAwarded: scoreResult.scoreAwarded,
      isUnanswered: scoreResult.isUnanswered,
    };
  });

  const total = questions.length;
  // Calculate score percentage based on exact correct items or scoreAwarded
  const scorePercent = Math.min(100, Math.max(0, Math.round((correctCount / total) * 100)));
  const performanceTier = getPerformanceTier(scorePercent);

  // Group performance into domains
  const domainMap = new Map<string, { total: number; correct: number }>();
  for (const q of questions) {
    const entry = domainMap.get(q.domain) || { total: 0, correct: 0 };
    entry.total += 1;
    if (q.isCorrect) entry.correct += 1;
    domainMap.set(q.domain, entry);
  }

  const domains: DomainPerformance[] = Array.from(domainMap.entries()).map(([domain, data]) => ({
    domain,
    scorePercent: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
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
  const uniqueId = `attempt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  return {
    id: uniqueId,
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
