export interface BlogAuthor {
  name: string;
  role: string;
  credentials: string;
  avatar?: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category:
    | "Next Gen NCLEX"
    | "Clinical Judgment"
    | "Pharmacology"
    | "Study Strategies"
    | "Nursing Licensure"
    | "NCLEX-RN"
    | "NCLEX-PN"
    | "Nursing Education";
  author: BlogAuthor;
  publishedAt: string;
  updatedAt?: string;
  readingTime: string;
  featuredImage: string;
  imageAlt: string;
  tags: string[];
  featured?: boolean;
  content: {
    lead: string;
    keyTakeaways: string[];
    sections: {
      id?: string;
      heading: string;
      body: string[];
      inlineImage?: {
        src: string;
        alt: string;
        caption?: string;
      };
      table?: {
        headers: string[];
        rows: string[][];
      };
      callout?: {
        title: string;
        text: string;
      };
    }[];
  };
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "understanding-the-next-generation-nclex",
    title: "Understanding the Next Generation NCLEX: Clinical Judgment, Item Types & Preparation Guide",
    excerpt:
      "A candidate guide to the NCSBN Clinical Judgment Measurement Model (NCJMM), unfolding case studies, bow-tie questions, and evidence-based partial-credit scoring.",
    category: "Next Gen NCLEX",
    featured: true,
    author: {
      name: "PrepFord Nurse Educator Team",
      role: "Clinical Curriculum & Testing Specialist",
      credentials: "MSN, RN, CNE",
    },
    publishedAt: "2026-10-24",
    updatedAt: "2026-10-28",
    readingTime: "9 min read",
    featuredImage: "/images/blog/prepford-ngn-article-hero.jpg",
    imageAlt: "Next Generation NCLEX study station showing interactive case study on tablet, clinical notes, and stethoscope",
    tags: ["Next Gen NCLEX", "Clinical Judgment", "Case Studies", "NCSBN", "Item Types", "Partial Credit"],
    content: {
      lead: "The Next Generation NCLEX (NGN) represents the most significant evolution in nursing licensure examination history since the transition to Computerized Adaptive Testing in 1994. Developed by the National Council of State Boards of Nursing (NCSBN), the NGN measures clinical judgment—the dynamic decision-making process nurses use to deliver safe, effective client care. In this comprehensive guide, our nurse educators break down the Clinical Judgment Measurement Model, the new interactive item types, the updated scoring methods, and practical study strategies for both RN and PN candidates.",
      keyTakeaways: [
        "The NGN measures the 6 cognitive operations of the NCSBN Clinical Judgment Measurement Model (NCJMM).",
        "Unfolding Case Studies present 6 sequential questions following an evolving patient scenario across time.",
        "Standalone items (Bow-tie and Trend items) test clinical judgment in rapid, focused clinical situations.",
        "Partial-credit scoring models (+/- and 0/1) award points for clinically valid choices while penalizing incorrect distractors on multiple response items.",
        "Success requires synthesizing electronic health record (EHR) data—vitals, nurse notes, orders, and labs—rather than relying solely on memorized facts.",
      ],
      sections: [
        {
          id: "why-the-nclex-changed",
          heading: "Why the NCLEX Changed: The Shift to Clinical Judgment",
          body: [
            "In previous iterations of the NCLEX examination, questions primarily evaluated knowledge recall, comprehension, and isolated application. However, extensive research conducted by the NCSBN revealed a critical safety gap: over 65% of novice nurse medical errors were linked to deficiencies in clinical judgment and decision-making under evolving patient conditions.",
            "In modern healthcare environments, newly licensed nurses care for clients with complex multisystem comorbidities immediately upon beginning clinical practice. To safeguard public health, the licensure exam had to evaluate not just what a nurse knows, but how a nurse reasons in real time when confronting clinical ambiguity.",
            "The result is the NCSBN Clinical Judgment Measurement Model (NCJMM), a six-step cognitive hierarchy that forms the backbone of every Next Generation NCLEX question.",
          ],
          callout: {
            title: "NCSBN Research Finding",
            text: "Practice analyses established that entry-level nurses make complex clinical decisions within their first 6 months of practice, often with limited supervision. Measuring clinical judgment directly was established as an imperative for candidate licensure and public safety.",
          },
        },
        {
          id: "the-six-cognitive-operations",
          heading: "The Six Cognitive Operations of the NCJMM",
          body: [
            "Layer 3 of the NCJMM establishes the six operational cognitive steps that candidates must navigate during each client interaction. Rather than presenting abstract theory, each unfolding case study on the exam moves through these exact six phases:",
            "1. Recognize Cues: Sifting through clinical data (vital signs, history, assessment findings, lab values) to pinpoint what findings are abnormal or clinically significant.",
            "2. Analyze Cues: Synthesizing multiple cues together to recognize clinical patterns (e.g. connecting fever, tachycardia, hypotension, and elevated WBC to systemic inflammatory response).",
            "3. Prioritize Hypotheses: Identifying which problem poses the greatest immediate life threat or requires the most urgent nursing intervention.",
            "4. Generate Solutions: Formulating safe, evidence-based care plans, recognizing contraindications, and determining desired patient outcomes.",
            "5. Take Action: Implementing specific nursing actions safely—administering medications, adjusting monitoring parameters, repositioning, or contacting interprofessional team members.",
            "6. Evaluate Outcomes: Re-evaluating client parameters following an intervention to identify whether the condition improved, remained stable, or worsened.",
          ],
          table: {
            headers: ["NCJMM Cognitive Step", "Clinical Question to Ask Yourself", "Typical NGN Item Type", "Scoring Rule"],
            rows: [
              ["1. Recognize Cues", "What information in this chart is abnormal or urgent?", "Highlighting text, Matrix Multiple-Choice", "+/- Scoring"],
              ["2. Analyze Cues", "What clinical complication do these cues suggest?", "Dropdown Cloze, Drag-and-Drop", "0/1 Scoring"],
              ["3. Prioritize Hypotheses", "Which client issue poses the greatest immediate risk?", "Multiple Response, Ranking", "0/1 or +/- Scoring"],
              ["4. Generate Solutions", "What interventions should be planned or avoided?", "Multiple Response (SATA)", "+/- Scoring"],
              ["5. Take Action", "How do I safely implement prescribed care?", "Matrix Grid, Bow-Tie", "+/- or 0/1 Scoring"],
              ["6. Evaluate Outcomes", "Did the patient improve or deteriorate following care?", "Matrix Grid, Single-Best Answer", "0/1 Scoring"],
            ],
          },
        },
        {
          id: "anatomy-of-unfolding-case-studies",
          heading: "Anatomy of an Unfolding Case Study",
          body: [
            "An unfolding case study consists of six consecutive questions tied to a single simulated client scenario. Candidates interact with an Electronic Health Record (EHR) interface featuring tabs for History and Physical, Vital Signs, Nurse's Notes, Provider Orders, and Diagnostic Reports.",
            "As you submit answers, time advances in the scenario. A new timestamp tab appears (e.g., 0800 hours initial assessment advances to 1030 hours post-intervention update). New clinical data becomes available, reflecting how real patient status evolves during a nursing shift.",
          ],
          inlineImage: {
            src: "/images/blog/prepford-ngn-article-hero.jpg",
            alt: "Clinical desk setup featuring Next Generation NCLEX case study study station",
            caption: "Figure 1: PrepFord simulated clinical study station with EHR multi-tab review and clinical notes.",
          },
        },
        {
          id: "understanding-the-scoring-models",
          heading: "Understanding the New NGN Scoring Rules: +/- and 0/1 Scoring",
          body: [
            "One of the greatest advancements in the NGN is the introduction of polytomous (partial-credit) scoring. Under the previous NCLEX standard, missing a single option on a five-option Select All That Apply (SATA) question resulted in 0 points for the entire item.",
            "On the NGN, candidates earn partial credit using two distinct scoring rules:",
            "• +/- Scoring (Plus/Minus Scoring): Used on multiple response questions where candidates are instructed to select all applicable options without a set limit. Each correct option selected awards +1 point; each incorrect distractor selected deducts -1 point. The minimum score for the question is 0 (scores never drop below zero).",
            "• 0/1 Scoring: Used on items where each correct response within a matrix or dropdown earns 1 point, and incorrect choices earn 0 points without penalty deduction.",
          ],
          callout: {
            title: "Golden Rule of NGN Multiple Response",
            text: "Never guess blindly on NGN Select All That Apply questions. If you know with certainty that 3 options are correct, choose those 3. Guessing a doubtful 4th option risks subtracting one of your earned points. Conservative, evidence-based selection maximizes your score.",
          },
        },
        {
          id: "standalone-ngn-items",
          heading: "Standalone NGN Items: Bow-Tie and Trend Questions",
          body: [
            "In addition to 6-question unfolding case studies, the NCLEX includes standalone NGN questions:",
            "• Bow-Tie Items: Visual clinical judgment puzzles where candidates drag the central primary condition into the middle, two priority nursing actions to the left wing, and two client monitoring parameters to the right wing.",
            "• Trend Items: Questions that present longitudinal client data (e.g. lab trends over 24 hours, blood pressure responses to titration) requiring candidates to recognize progressive decline or therapeutic response.",
          ],
        },
        {
          id: "preparation-strategies",
          heading: "Evidence-Based Preparation Strategies for RN and PN Candidates",
          body: [
            "1. Practice with Multi-Tab Case Studies: Familiarize yourself with navigating between EHR tabs without losing focus. Always check the newest timestamp tab first to see what has changed.",
            "2. Read Rationales for Both Correct and Incorrect Distractors: High-yield learning comes from understanding why plausible-sounding distractors are unsafe in specific clinical contexts.",
            "3. Master High-Alert Pharmacology: Anticoagulants, insulins, opioids, and potassium infusions frequently appear in NGN Take Action and Evaluate Outcomes items.",
            "4. Manage Exam Day Pacing: Allocate approximately 1.5 to 2 minutes per standard item, and 2 to 3 minutes for unfolding case study questions.",
          ],
        },
      ],
    },
  },
  {
    slug: "mastering-ngn-clinical-judgment-measurement-model",
    title: "Mastering the NGN Clinical Judgment Measurement Model (CJMM)",
    excerpt:
      "A candidate guide to understanding Layer 3 cognitive operations: Recognize Cues, Analyze Cues, Prioritize Hypotheses, Generate Solutions, Take Action, and Evaluate Outcomes.",
    category: "Clinical Judgment",
    author: {
      name: "PrepFord Nurse Educator Team",
      role: "Clinical Curriculum Specialist",
      credentials: "MSN, RN, CNE",
    },
    publishedAt: "2026-10-18",
    updatedAt: "2026-10-22",
    readingTime: "7 min read",
    featuredImage: "/images/illustrations/prepford-clinical-decision-making.png",
    imageAlt: "Clinical decision making diagram showing prioritization nodes and nursing interventions",
    tags: ["NGN", "CJMM", "Case Studies", "Clinical Judgment"],
    content: {
      lead: "The Next Generation NCLEX (NGN) fundamentally shifts assessment from simple factual recall to active clinical judgment. At the center of this transformation is the NCSBN Clinical Judgment Measurement Model (CJMM). Understanding how Layer 3 cognitive steps correspond directly to test questions is the most powerful strategy for both RN and PN candidates.",
      keyTakeaways: [
        "Layer 3 defines the 6 cognitive operations assessed in every unfolding NGN case study.",
        "Recognize Cues is about identifying relevant vs. irrelevant findings in patient charts.",
        "Generate Solutions and Take Action test safe interventions and contraindication awareness.",
        "Partial credit scoring (+/- scoring) means guessing wild answers can detract points; select only what is clinically supported.",
      ],
      sections: [
        {
          id: "understanding-six-steps",
          heading: "Understanding the Six Cognitive Steps",
          body: [
            "In clinical practice, a nurse does not encounter problems as isolated multiple-choice options. A patient presents with a dynamic constellation of signs, vital signs, history, and medication records. The CJMM captures this progression through 6 distinct cognitive steps.",
            "Each 6-question unfolding case study on the NCLEX moves chronologically through these steps. Knowing which step is being tested tells you exactly what type of thinking the question demands.",
          ],
          table: {
            headers: ["Cognitive Step", "Clinical Question to Ask Yourself", "Typical NGN Item Type"],
            rows: [
              ["1. Recognize Cues", "What data matters most right now?", "Highlighting text, matrix multiple choice"],
              ["2. Analyze Cues", "What could these cues indicate?", "Drag-and-drop, dropdown cloze"],
              ["3. Prioritize Hypotheses", "Which patient issue is most urgent?", "Ranking, multiple response"],
              ["4. Generate Solutions", "What interventions should be planned?", "Multiple response (select all that apply)"],
              ["5. Take Action", "How do I safely implement care?", "Matrix grid, dosage/administration"],
              ["6. Evaluate Outcomes", "Did the patient improve or deteriorate?", "Highlight table, single-best answer"],
            ],
          },
        },
        {
          id: "common-cue-pitfalls",
          heading: "Common Pitfalls in Cue Analysis",
          body: [
            "Many candidates struggle with step 2 (Analyze Cues) because they jump straight to interventions without synthesizing the clinical picture. A blood pressure drop combined with tachycardia might suggest hypovolemia, septic shock, or hemorrhage.",
            "Always link cues together into patterns before selecting a priority hypothesis. Look for trending parameters across time stamps in EHR tabs.",
          ],
          callout: {
            title: "Exam Strategy Tip",
            text: "When reading Electronic Health Record (EHR) tabs, look at the progression of vital signs across hours, not just the single most recent number. A heart rate rising from 78 to 118 bpm over 4 hours is far more urgent than an isolated reading of 100 bpm.",
          },
        },
      ],
    },
  },
  {
    slug: "high-alert-medications-nclex-pharmacology",
    title: "High-Alert Medications: Pharmacological Principles Every NCLEX Candidate Must Know",
    excerpt:
      "Key nursing considerations, black box warnings, antidote associations, and therapeutic monitoring for insulins, anticoagulants, opioids, and chemotherapeutic agents.",
    category: "Pharmacology",
    author: {
      name: "PrepFord Clinical Review Board",
      role: "Pharmacology & Nursing Faculty",
      credentials: "PharmD, MSN, RN",
    },
    publishedAt: "2026-10-14",
    updatedAt: "2026-10-19",
    readingTime: "8 min read",
    featuredImage: "/images/illustrations/prepford-pathophysiology-rationales.png",
    imageAlt: "Pharmacology study notes and pathophysiology mechanism diagrams",
    tags: ["Pharmacology", "High-Alert Meds", "Patient Safety", "Antidotes"],
    content: {
      lead: "High-alert medications bear a heightened risk of causing significant patient harm when used in error. For the NCLEX-RN and NCLEX-PN, questions involving these medications focus on independent verification, narrow therapeutic indices, safe monitoring, and immediate reversal protocols.",
      keyTakeaways: [
        "Memorize major antidote pairings (e.g., Protamine sulfate for Heparin, Naloxone for Opioids).",
        "Insulin administration requires double-check verification and monitoring peak onset times for hypoglycemia.",
        "Anticoagulation therapy requires continuous laboratory correlation (aPTT vs. PT/INR).",
        "Never administer intravenous potassium chloride (KCl) as an IV push.",
      ],
      sections: [
        {
          id: "essential-drug-classes",
          heading: "Essential High-Alert Drug Classes & Antidotes",
          body: [
            "High-alert medications regularly appear in prioritization and safe medication administration questions. Candidates are expected to recognize the early signs of toxicity, understand dose limits, and know the correct emergency antidote.",
          ],
          table: {
            headers: ["Medication / Class", "Primary Risk / Adverse Effect", "Monitoring / Antidote"],
            rows: [
              ["Heparin (Unfractionated)", "Bleeding, Heparin-Induced Thrombocytopenia (HIT)", "aPTT (1.5-2.5x normal); Antidote: Protamine sulfate"],
              ["Warfarin (Coumadin)", "Fatal hemorrhage, drug-drug interactions", "PT/INR (2.0-3.0 target); Antidote: Vitamin K / FFP"],
              ["Opioids (Morphine, Fentanyl)", "Respiratory depression (< 12 breaths/min)", "Respiratory status; Antidote: Naloxone (Narcan)"],
              ["Digoxin", "Cardiac dysrhythmias, visual disturbances", "Level (0.8-2.0 ng/mL); Antidote: Digoxin immune Fab"],
              ["Potassium Chloride (IV)", "Lethal dysrhythmias if infused rapidly", "Never IV push; max rate 10-20 mEq/hr via pump"],
            ],
          },
        },
        {
          id: "insulin-timing",
          heading: "Insulin Timing and Peak Windows",
          body: [
            "Hypoglycemia is most dangerous during the peak action window. NCLEX questions frequently assess whether a candidate knows when to provide a snack or recheck capillary glucose following administration of rapid-acting vs. intermediate-acting insulin.",
          ],
          callout: {
            title: "Rule of 15 for Hypoglycemia",
            text: "For conscious patients with blood glucose < 70 mg/dL: Administer 15 grams of fast-acting carbohydrate (e.g., 4 oz fruit juice), wait 15 minutes, and recheck. Repeat if still below target.",
          },
        },
      ],
    },
  },
  {
    slug: "prioritization-strategies-maslow-vs-abcs",
    title: "Prioritization Strategies: Distinguishing Maslow's Hierarchy from ABC Principles",
    excerpt:
      "When does an acute psychosocial cue override a stable physiological need? Deciding priority nursing actions using evidence-based frameworks.",
    category: "Clinical Judgment",
    author: {
      name: "PrepFord Nurse Educator Team",
      role: "Nurse Educator & Testing Coach",
      credentials: "MSN, RN, CNE",
    },
    publishedAt: "2026-10-10",
    readingTime: "6 min read",
    featuredImage: "/images/illustrations/prepford-rn-pathway-card.png",
    imageAlt: "Registered Nurse in clinical scrubs evaluating patient care prioritization",
    tags: ["Prioritization", "ABCs", "Maslow", "Clinical Decision Making"],
    content: {
      lead: "Prioritization questions are among the most discriminating items on both NCLEX-RN and NCLEX-PN examinations. Candidates often memorize rules like 'ABCs always come first' or 'Maslow Physiological precedes Safety' without understanding the clinical nuances of acute vs. chronic and unstable vs. stable.",
      keyTakeaways: [
        "Airway, Breathing, and Circulation (ABCs) supersede other needs only when a genuine, acute compromise exists.",
        "Acute changes always take precedence over chronic, longstanding baseline findings.",
        "Unstable patients (e.g., newly admitted, post-op within 12 hours, unexpected changes) must be assessed first.",
        "Expected disease findings are lower priority than unexpected systemic deteriorations.",
      ],
      sections: [
        {
          id: "hierarchy-frameworks",
          heading: "The Hierarchy of Prioritization Frameworks",
          body: [
            "When facing a question where four patients all seem to need attention, use a structured three-tier filter: first, is there an acute life threat to Airway, Breathing, or Circulation? Second, is the patient unstable versus stable? Third, apply Maslow's hierarchy for remaining physiological versus psychosocial needs.",
          ],
          table: {
            headers: ["Framework", "When to Apply", "Clinical Example"],
            rows: [
              ["ABCs", "Acute, life-threatening airway obstruction, hypoventilation, shock", "Stridor or cyanosis in anaphylaxis"],
              ["Acute vs. Chronic", "Differentiating new onset symptoms from established chronic disease", "Sudden confusion in elderly vs. 5-year Alzheimer baseline"],
              ["Unstable vs. Stable", "Allocating nurse attention across multiple clients", "Client 2 hours post-cholecystectomy vs. client ready for discharge"],
            ],
          },
        },
        {
          id: "expected-finding-trap",
          heading: "The 'Expected Finding' Trap",
          body: [
            "A frequent NCLEX distractor is an alarming-sounding symptom that is actually completely expected for that diagnosis. For instance, joint pain in osteoarthritis or a mild temperature elevation 6 hours post-surgery is expected; a sudden unilateral calf pain with dyspnea is unexpected and life-threatening.",
          ],
          callout: {
            title: "Remember",
            text: "Never prioritize a stable client with an expected manifestation over an unstable client with an unexpected finding, even if the stable client's condition sounds clinically severe.",
          },
        },
      ],
    },
  },
  {
    slug: "next-gen-nclex-case-studies-step-by-step",
    title: "Next Gen NCLEX Case Studies: Step-by-Step Clinical Decision Breakdown",
    excerpt:
      "How to navigate 6-part unfolding case studies without losing momentum or points on partial credit scoring items.",
    category: "Next Gen NCLEX",
    author: {
      name: "PrepFord Clinical Review Board",
      role: "Curriculum & Evaluation Specialist",
      credentials: "DNP, RN",
    },
    publishedAt: "2026-10-05",
    readingTime: "7 min read",
    featuredImage: "/images/illustrations/prepford-ehr-unfolding-case.png",
    imageAlt: "Electronic Health Record interface with vital sign flowsheets and nurse shift notes",
    tags: ["NGN", "Case Studies", "Partial Credit", "Scoring"],
    content: {
      lead: "Unfolding case studies test how well you process evolving patient scenarios across time. Unlike standalone questions, your decisions in question 3 can inform question 5. Learning how to navigate EHR tabs efficiently ensures you do not waste precious exam time rereading baseline data.",
      keyTakeaways: [
        "Case studies present 6 consecutive items tied to the same evolving client scenario.",
        "New EHR tabs (e.g., Progress Notes, Vital Signs, Orders, Labs) unlock as time advances.",
        "Scoring uses +/- rules for multiple-response and matrix items: positive points for correct cues, negative points for incorrect distractors.",
        "Do not over-select: only choose options you are confident are clinically supported.",
      ],
      sections: [
        {
          id: "ehr-tabs-progression",
          heading: "How EHR Tabs Unlock and Progress",
          body: [
            "In each case study, you begin with initial baseline information (e.g., 0800 hours). As you progress from recognizing cues to taking action and evaluating outcomes, new time stamps appear (e.g., 1000, 1200 hours). Always check the latest timestamp tab for updated lab results or provider orders.",
          ],
        },
        {
          id: "plus-minus-scoring-model",
          heading: "Mastering the +/- Scoring Model",
          body: [
            "On traditional NCLEX select-all-that-apply (SATA), missing one option meant zero credit. On NGN, partial credit is awarded. However, selecting an incorrect distractor deducts a point (down to a minimum score of 0 for that question).",
          ],
          callout: {
            title: "Scoring Strategy",
            text: "If you are certain about 3 options out of 6, but unsure about the 4th, do NOT guess the 4th option. A wrong guess cancels out one of your correct choices.",
          },
        },
      ],
    },
  },
  {
    slug: "pediatric-dosage-calculations-safe-administration",
    title: "Pediatric Dosage Calculations and Safe Medication Administration",
    excerpt:
      "Safe dose range verification, mg/kg/day formulas, fluid bolus thresholds, and avoiding arithmetic calculation errors under exam conditions.",
    category: "Pharmacology",
    author: {
      name: "PrepFord Nurse Educator Team",
      role: "Pediatric Clinical Educator",
      credentials: "MSN, RN, CPN",
    },
    publishedAt: "2026-09-28",
    readingTime: "6 min read",
    featuredImage: "/images/illustrations/prepford-study-guide-overview.png",
    imageAlt: "Pediatric nursing study guide and medication safe dosage calculation charts",
    tags: ["Pediatrics", "Dosage Calculations", "Pharmacology", "Patient Safety"],
    content: {
      lead: "Children are not simply miniature adults; pharmacokinetic variations in hepatic and renal maturation make pediatric patients particularly vulnerable to medication errors. NCLEX dosage calculation questions emphasize checking safe dose ranges before administering any dose.",
      keyTakeaways: [
        "Always convert pounds to kilograms first: Weight in lb / 2.2 = Weight in kg.",
        "Differentiate between total daily dose (mg/kg/day) and individual single doses (mg/kg/dose).",
        "Compare the prescribed dose against the safe manufacturer range before deciding to administer or clarify.",
        "Emergency pediatric fluid bolus standard: 20 mL/kg of isotonic crystalloid (0.9% Normal Saline).",
      ],
      sections: [
        {
          id: "verification-protocol",
          heading: "The 3-Step Verification Protocol",
          body: [
            "Step 1: Convert patient weight accurately to kilograms (round to tenths).",
            "Step 2: Calculate the minimum and maximum safe total daily and single dose range.",
            "Step 3: Compare prescribed dose against the safe parameters. If the dose falls outside the safe range, your primary nursing action is to hold the dose and notify the prescribing healthcare provider.",
          ],
        },
      ],
    },
  },
  {
    slug: "managing-nclex-test-anxiety-evidence-based-strategies",
    title: "Managing NCLEX Test Anxiety: Evidence-Based Cognitive and Study Techniques",
    excerpt:
      "Overcoming decision fatigue, pacing yourself through the adaptive test algorithm, and maintaining sharp clinical focus across 150 potential items.",
    category: "Study Strategies",
    author: {
      name: "PrepFord Nurse Educator Team",
      role: "Candidate Success Coach",
      credentials: "MSN, RN",
    },
    publishedAt: "2026-09-20",
    readingTime: "5 min read",
    featuredImage: "/landing-page-nurse.jpg",
    imageAlt: "Nursing student preparing calmly with laptop and study tools",
    tags: ["Study Strategies", "Test Anxiety", "Exam Day", "Mindset"],
    content: {
      lead: "Test anxiety is one of the most common factors that undermine capable nursing graduates on exam day. The Computerized Adaptive Testing (CAT) algorithm adapts to your performance, meaning every candidate receives questions near their threshold of difficulty.",
      keyTakeaways: [
        "The CAT exam feels challenging for everyone because it continuously probes your maximum ability level.",
        "The exam shutting off at 85 questions does not guarantee passing or failing; maintain composure for the full 150 items.",
        "Take scheduled micro-breaks: 30 seconds of diaphragmatic breathing resets sympathetic arousal.",
        "Focus on one item at a time; you cannot return to previously submitted questions.",
      ],
      sections: [
        {
          id: "understanding-cat-psychologically",
          heading: "Understanding the CAT Algorithm Psychologically",
          body: [
            "Many candidates feel discouraged because they encounter questions where they are unsure. This is normal. The algorithm aims to give you items you have approximately a 50% chance of answering correctly. Feeling challenged is evidence that the system is measuring your competence.",
          ],
        },
      ],
    },
  },
  {
    slug: "infection-control-and-transmission-based-precautions",
    title: "Infection Control & Transmission-Based Precautions: Core NCLEX Review",
    excerpt:
      "Contact, Droplet, and Airborne precautions cheat sheet, PPE donning and doffing sequence, and cohorting infectious patients safely.",
    category: "NCLEX-PN",
    author: {
      name: "PrepFord Clinical Review Board",
      role: "Infection Prevention Consultant",
      credentials: "MSN, RN, CIC",
    },
    publishedAt: "2026-09-12",
    readingTime: "6 min read",
    featuredImage: "/images/illustrations/prepford-pn-pathway-card.png",
    imageAlt: "Practical nurse reviewing infection control standards and client precautions",
    tags: ["Infection Control", "PPE", "Safety", "Airborne Precautions", "NCLEX-PN"],
    content: {
      lead: "Infection control questions appear across all client need categories. Knowing which organisms require which precautions and mastering the correct sequence for donning and doffing Personal Protective Equipment (PPE) are guaranteed high-yield concepts.",
      keyTakeaways: [
        "Airborne: Measles, Tuberculosis, Varicella (MTV) require N95 respirator and negative-pressure room.",
        "Droplet: Pertussis, Influenza, Meningitis, Rubella (PIMR) require surgical mask within 3-6 feet.",
        "Contact: C. diff, MRSA, VRE require gown and gloves; C. diff requires soap and water handwashing (alcohol gel is ineffective).",
        "PPE Doffing Sequence (alphabetical order): Gloves, Goggles/Shield, Gown, Mask/Respirator.",
      ],
      sections: [
        {
          id: "precautions-quick-reference",
          heading: "Transmission-Based Precautions Quick Reference",
          body: [
            "Use standard precautions for all patients. Transmission-based precautions are applied when standard precautions alone are insufficient to interrupt the transmission route.",
          ],
          table: {
            headers: ["Precaution Type", "Common Pathogens", "Required PPE & Room Setup"],
            rows: [
              ["Airborne", "Tuberculosis, Measles, Disseminated Varicella", "N95 respirator, Negative airflow room with HEPA filtration"],
              ["Droplet", "Influenza, Meningococcal meningitis, Pertussis", "Surgical mask, private room (or cohorted > 3 feet apart)"],
              ["Contact", "C. difficile, MRSA, VRE, Norovirus, Scabies", "Gown and gloves, dedicated patient equipment, soap and water for C. diff"],
            ],
          },
        },
      ],
    },
  },
  {
    slug: "nclex-rn-vs-nclex-pn-detailed-scoring-comparison",
    title: "NCLEX-RN vs. NCLEX-PN: Comprehensive Examination Plan & Scoring Comparison",
    excerpt:
      "Detailed breakdown of test plan category weights, scope of practice boundaries, and supervisory expectations between RN and PN licensure exams.",
    category: "Nursing Education",
    author: {
      name: "PrepFord Clinical Review Board",
      role: "Dean of Nursing Education",
      credentials: "PhD, RN, FAAN",
    },
    publishedAt: "2026-09-05",
    readingTime: "7 min read",
    featuredImage: "/landing-page1.jpg",
    imageAlt: "Comparative evaluation of NCLEX-RN and NCLEX-PN exam plans on digital displays",
    tags: ["NCLEX-RN", "NCLEX-PN", "Licensure", "Scope of Practice", "Nursing Education"],
    content: {
      lead: "While both examinations assess entry-level nursing competence using the CAT methodology, their test plans reflect distinct statutory scopes of practice. Understanding these core differences allows candidates to target their preparation effectively.",
      keyTakeaways: [
        "Management of Care (15-21% on RN) emphasizes leadership, delegation, and ethical oversight.",
        "Coordinated Care (18-24% on PN) focuses on clinical reporting, patient advocacy, and team collaboration.",
        "RN candidates are tested on comprehensive assessment and clinical care plan formulation.",
        "PN candidates are tested on data collection, implementing directed interventions, and focused reporting.",
      ],
      sections: [
        {
          id: "scope-of-practice",
          heading: "Scope of Practice in Test Scenarios",
          body: [
            "On the NCLEX-RN, questions often place the candidate in the role of charge nurse or primary nurse responsible for evaluating complex systemic data and delegating assignments.",
            "On the NCLEX-PN, items focus on safe care delivery within the practical nursing scope: administering medications under supervision, collecting routine vital and clinical data, and notifying the supervising RN or physician of acute changes.",
          ],
        },
      ],
    },
  },
  {
    slug: "delegation-rules-for-nursing-candidates",
    title: "Delegation Rules: What Can RNs Assign to LPNs/VNs and UAPs?",
    excerpt:
      "The 5 Rights of Delegation: clarifying nursing judgment tasks that cannot be delegated versus routine, predictable care activities.",
    category: "NCLEX-RN",
    author: {
      name: "PrepFord Nurse Educator Team",
      role: "Leadership & Management Educator",
      credentials: "MSN, RN, NE-BC",
    },
    publishedAt: "2026-08-28",
    readingTime: "6 min read",
    featuredImage: "/images/illustrations/prepford-readiness-analytics.png",
    imageAlt: "Clinical leadership and delegation matrix showing team assignments and responsibilities",
    tags: ["Delegation", "Management of Care", "LPN/VN", "UAP", "NCLEX-RN"],
    content: {
      lead: "Delegation questions consistently appear on every NCLEX-RN examination. The foundational principle is that a registered nurse can delegate tasks, but can never delegate ultimate professional nursing accountability.",
      keyTakeaways: [
        "The RN cannot delegate TAPE: Teaching, Assessment, Planning, and Evaluation.",
        "LPNs/VNs can care for stable clients with predictable outcomes, administer non-IV push medications, and perform sterile dressing changes.",
        "Unlicensed Assistive Personnel (UAP) can perform routine, non-invasive tasks: vital signs on stable clients, hygiene, ambulation, and I&O.",
        "The Five Rights of Delegation: Right Task, Right Circumstance, Right Person, Right Direction/Communication, Right Supervision/Evaluation.",
      ],
      sections: [
        {
          id: "delegation-matrix",
          heading: "Who Can Do What? Summary Matrix",
          body: [
            "Always evaluate the stability of the patient before deciding whether a task can be delegated to a team member.",
          ],
          table: {
            headers: ["Role", "Permitted Nursing Tasks", "Prohibited Tasks"],
            rows: [
              ["Registered Nurse (RN)", "Comprehensive assessment, clinical judgment, IV push meds, nursing diagnosis, teaching", "Accountability cannot be delegated away"],
              ["LPN / LVN", "Stable client care, oral/IM medications, tube feedings, sterile dressing changes", "Initial client assessment, nursing diagnosis, care plan formulation, discharge teaching"],
              ["UAP / Nurse Aide", "Vital signs on stable clients, bathing, feeding without swallowing difficulty, I&O", "Medication administration, sterile procedures, clinical assessment or judgment"],
            ],
          },
        },
      ],
    },
  },
];

export function getAllBlogPosts(): BlogPost[] {
  return BLOG_POSTS;
}

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  if (slug === "blog-next-generation-nclex") {
    return BLOG_POSTS.find((p) => p.slug === "understanding-the-next-generation-nclex");
  }
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getRelatedPosts(currentSlug: string, limit = 2): BlogPost[] {
  const current = getBlogPostBySlug(currentSlug);
  const actualSlug = current ? current.slug : currentSlug;
  if (!current) return BLOG_POSTS.slice(0, limit);

  return BLOG_POSTS.filter((p) => p.slug !== actualSlug && p.category === current.category)
    .concat(BLOG_POSTS.filter((p) => p.slug !== actualSlug && p.category !== current.category))
    .slice(0, limit);
}

export function getAllCategories(): string[] {
  return [
    "All",
    "Next Gen NCLEX",
    "Clinical Judgment",
    "Pharmacology",
    "Study Strategies",
    "NCLEX-RN",
    "NCLEX-PN",
    "Nursing Education",
  ];
}

export interface PaginatedResult {
  posts: BlogPost[];
  totalPosts: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export function getPaginatedPosts(
  page = 1,
  pageSize = 4,
  category = "All",
  search = ""
): PaginatedResult {
  let filtered = BLOG_POSTS;

  if (category && category !== "All") {
    filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }

  if (search && search.trim().length > 0) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  const totalPosts = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalPosts / pageSize));
  const validPage = Math.min(Math.max(1, page), totalPages);

  const startIdx = (validPage - 1) * pageSize;
  const paginatedPosts = filtered.slice(startIdx, startIdx + pageSize);

  return {
    posts: paginatedPosts,
    totalPosts,
    totalPages,
    currentPage: validPage,
    pageSize,
  };
}
