/**
 * PrepFord Study Guide & Clinical Nursing Notes
 * Reference structure inspired by Rhenis Nursing notes taxonomy.
 */

export interface StudyGuideSection {
  heading: string;
  body: string;
  keyPoints?: string[];
  clinicalAlert?: {
    type: "critical" | "exam-tip" | "pharmacology";
    title: string;
    text: string;
  };
}

export interface StudyGuideSubject {
  id: string;
  slug: string;
  title: string;
  summary: string;
  readTime: string;
  difficulty: "Fundamental" | "High-Yield" | "Advanced";
  clinicalKeyTakeaways: string[];
  sections: StudyGuideSection[];
}

export interface StudyGuideCategory {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  badge: string;
  iconName: string;
  colorTheme: string;
  subjects: StudyGuideSubject[];
}

export const STUDY_GUIDE_CATEGORIES: StudyGuideCategory[] = [
  {
    id: "cat-med-surg",
    slug: "medical-surgical",
    title: "Medical-Surgical Nursing",
    shortTitle: "Med-Surg",
    description: "In-depth pathophysiology, clinical cues, diagnostic laboratory trends, and prioritized nursing actions for adult client alterations.",
    badge: "High-Yield Core",
    iconName: "Stethoscope",
    colorTheme: "teal",
    subjects: [
      {
        id: "subj-cardio",
        slug: "cardiovascular-disorders",
        title: "Cardiovascular Disorders & Heart Failure",
        summary: "Hemodynamic pathophysiology of left vs right-sided heart failure, cardiogenic shock cues, BNP biomarkers, and preload/afterload reduction strategies.",
        readTime: "9 min read",
        difficulty: "High-Yield",
        clinicalKeyTakeaways: [
          "Left-sided HF manifests as pulmonary congestion (crackles, dyspnea, orthopnea, paroxysmal nocturnal dyspnea).",
          "Right-sided HF manifests as systemic venous congestion (jugular venous distension, dependent peripheral edema, hepatomegaly, ascites).",
          "B-type Natriuretic Peptide (BNP) > 100 pg/mL signals ventricular stretch and acute decompensation.",
          "Weight monitoring benchmark: Report weight gain > 2–3 lbs in 24 hours or > 5 lbs in one week immediately.",
        ],
        sections: [
          {
            heading: "1. Pathophysiology and Differential Clinical Cues",
            body: "Heart failure represents the inability of the myocardial pump to sustain adequate cardiac output for metabolic tissue demands. Left ventricular dysfunction results in retrograde hydrostatic pressure elevation across pulmonary capillaries, forcing fluid transudation into alveoli. In contrast, right ventricular dysfunction leads to systemic venous pooling.",
            keyPoints: [
              "Left-sided failure signs: Bibasilar crackles, tachypnea, pink frothy sputum, S3 gallop, dry hacking cough.",
              "Right-sided failure signs: Peripheral pitting edema, elevated JVD at 45 degrees, abdominal bloating, RUQ tenderness.",
            ],
            clinicalAlert: {
              type: "critical",
              title: "Priority Nursing Alert: Pulmonary Edema",
              text: "Acute alveolar flooding produces severe air hunger and blood-tinged, pink frothy sputum. Immediate priority interventions: High Fowler position with legs dependent, high-flow supplemental oxygen, IV loop diuretics, and sublingual/IV nitroglycerin to drop preload.",
            },
          },
          {
            heading: "2. Pharmacotherapy & Nursing Considerations",
            body: "Pharmacologic management centers on neurohormonal inhibition and hemodynamic optimization. ACE inhibitors and ARBs attenuate ventricular remodeling. Beta-blockers (carvedilol, metoprolol succinate) reduce sympathetic drive but must only be started when the patient is euvolemic.",
            keyPoints: [
              "Furosemide / Bumetanide: Monitor for hypokalemia (potassium < 3.5 mEq/L) which sensitizes the myocardium to lethal arrhythmias and digitalis toxicity.",
              "Spironolactone (Aldosterone Antagonist): Spares potassium; closely track for hyperkalemia and renal insufficiency (serum creatinine > 2.0 mg/dL).",
              "Digoxin (Inotrope): Therapeutic range is 0.5–0.9 ng/mL for HF. Check apical pulse for 60 full seconds prior to administration; hold if pulse < 60 bpm in adults.",
            ],
            clinicalAlert: {
              type: "exam-tip",
              title: "NCLEX High-Yield Trap",
              text: "Early signs of digoxin toxicity are gastrointestinal (anorexia, nausea, vomiting) and neurologic (fatigue, headache, visual yellow/green halos). Hypokalemia markedly increases digitalis toxicity risk even at 'normal' blood levels.",
            },
          },
        ],
      },
      {
        id: "subj-resp",
        slug: "respiratory-compromise",
        title: "Respiratory Compromise & Acute ARDS",
        summary: "Arterial blood gas (ABG) interpretation, acute respiratory distress syndrome (ARDS) refractory hypoxemia, and mechanical ventilation safety rules.",
        readTime: "8 min read",
        difficulty: "High-Yield",
        clinicalKeyTakeaways: [
          "Refractory hypoxemia (PaO2 remains low despite 100% FiO2) is the hallmark indicator of ARDS.",
          "Prone positioning significantly improves ventilation-perfusion matching by recruiting dorsal lung regions.",
          "Uncompensated respiratory acidosis presents with low pH (< 7.35) and high PaCO2 (> 45 mmHg) commonly seen in opioid overdose or COPD exacerbations.",
        ],
        sections: [
          {
            heading: "1. Acute Respiratory Failure vs. ARDS",
            body: "Type I (hypoxemic) respiratory failure involves PaO2 < 60 mmHg on room air, while Type II (hypercapnic) involves PaCO2 > 50 mmHg with pH < 7.35. ARDS develops following direct (aspiration, pneumonia) or indirect (sepsis, pancreatitis) pulmonary insult, causing diffuse alveolar-capillary membrane permeability.",
            keyPoints: [
              "Hallmark triad of ARDS: Bilateral alveolar infiltrates ('white out' on CXR), refractory hypoxemia, and normal pulmonary capillary wedge pressure (< 18 mmHg).",
              "Ventilator bundle: Head of bed elevated 30–45 degrees, daily sedation vacation, peptic ulcer prophylaxis, and DVT prophylaxis.",
            ],
          },
        ],
      },
      {
        id: "subj-endocrine",
        slug: "endocrine-emergencies",
        title: "Endocrine Emergencies: DKA vs. HHS",
        summary: "Comprehensive comparison of Diabetic Ketoacidosis (DKA) and Hyperosmolar Hyperglycemic State (HHS), potassium replacement protocols, and fluid resuscitation priorities.",
        readTime: "7 min read",
        difficulty: "High-Yield",
        clinicalKeyTakeaways: [
          "DKA (Type 1 DM): Rapid onset, glucose 250–500 mg/dL, positive serum ketones, metabolic acidosis (pH < 7.30), Kussmaul respirations, fruity breath.",
          "HHS (Type 2 DM): Insidious onset, severe hyperglycemia (glucose > 600 mg/dL), negative/trace ketones, severe dehydration and hyperosmolality (> 320 mOsm/kg).",
          "First priority in both is rapid IV fluid resuscitation (0.9% Normal Saline) to restore circulating volume prior to insulin administration.",
          "Check serum potassium before starting regular insulin drip; if K+ < 3.3 mEq/L, hold insulin and infuse potassium to avoid life-threatening cardiac arrest.",
        ],
        sections: [
          {
            heading: "1. Fluid & Electrolyte Resuscitation Hierarchy",
            body: "Intravenous rehydration expands extracellular fluid volume and reduces counter-regulatory stress hormones. Regular insulin must be given via infusion pump. Once blood glucose falls to 200–250 mg/dL, add 5% Dextrose (D5W) to the IV fluids to prevent cerebral edema and acute hypoglycemia.",
          },
        ],
      },
    ],
  },
  {
    id: "cat-pharm",
    slug: "pharmacology",
    title: "Pharmacology & Medication Safety",
    shortTitle: "Pharmacology",
    description: "Drug classes, mechanisms of action, high-alert medication protocols, specific antidotes, and clinical nursing safety implications.",
    badge: "Core Science",
    iconName: "Pill",
    colorTheme: "emerald",
    subjects: [
      {
        id: "subj-antidotes",
        slug: "critical-antidotes",
        title: "High-Yield Clinical Antidotes & Toxicities",
        summary: "Rapid reference guide to life-saving antidotes, reversal agents, toxic ingestion protocols, and nursing monitoring parameters.",
        readTime: "6 min read",
        difficulty: "Fundamental",
        clinicalKeyTakeaways: [
          "Opioids (morphine, fentanyl, oxycodone) -> Naloxone (Narcan). Note: Naloxone half-life is shorter than most opioids; monitor for re-sedation.",
          "Warfarin (Coumadin) -> Vitamin K (Phytonadione) and Fresh Frozen Plasma (FFP) for acute bleeding.",
          "Heparin / Enoxaparin -> Protamine Sulfate.",
          "Acetaminophen (Tylenol) -> N-Acetylcysteine (Mucomyst) within 8 hours of ingestion.",
          "Benzodiazepines -> Flumazenil (Romazicon) (Caution: Can precipitate acute seizures in dependent patients).",
        ],
        sections: [
          {
            heading: "1. Medication Reversal Protocols",
            body: "Reversal agents must be administered based on immediate clinical symptoms rather than laboratory delays. Repeated dosing of Naloxone is frequently required because the half-life of Naloxone is approximately 30 to 90 minutes, whereas long-acting opioids like methadone can persist for 24 to 36 hours.",
          },
        ],
      },
      {
        id: "subj-cardio-meds",
        slug: "cardiovascular-medications",
        title: "Cardiovascular Pharmacotherapy",
        summary: "Antihypertensives, ACE inhibitors, ARBs, Beta-Blockers, Calcium Channel Blockers, and antiarrhythmics with crucial assessment parameters.",
        readTime: "8 min read",
        difficulty: "High-Yield",
        clinicalKeyTakeaways: [
          "ACE inhibitors (-pril): Risk of angioedema (life-threatening airway obstruction), dry cough (switch to ARB), and hyperkalemia.",
          "Beta-Blockers (-lol): Negative inotrope and chronotrope; hold if HR < 60 bpm or SBP < 100 mmHg. Non-selective beta-blockers (propranolol) contraindicated in asthma.",
          "Nitroglycerin: Vasodilator; max 3 doses taken 5 minutes apart for chest pain; contraindicated within 24–48 hours of PDE-5 inhibitors (sildenafil).",
        ],
        sections: [
          {
            heading: "1. Hemodynamic Nursing Checks",
            body: "Never abruptly discontinue antihypertensive medications due to the danger of rebound hypertensive crisis. Teach patients to rise slowly from seated or lying positions to mitigate orthostatic hypotension.",
          },
        ],
      },
    ],
  },
  {
    id: "cat-maternal",
    slug: "maternal-newborn",
    title: "Maternal & Newborn Nursing",
    shortTitle: "OB / Newborn",
    description: "Antepartum assessment, intrapartum labor complications, fetal heart monitoring deceleration rules, and neonatal APGAR evaluation.",
    badge: "Specialty",
    iconName: "Baby",
    colorTheme: "amber",
    subjects: [
      {
        id: "subj-fetal-monitoring",
        slug: "fetal-heart-monitoring",
        title: "Fetal Heart Rate (FHR) Monitoring & VEAL CHOP",
        summary: "Deceleration patterns, variability categories, intrauterine resuscitation techniques, and immediate obstetric interventions.",
        readTime: "7 min read",
        difficulty: "High-Yield",
        clinicalKeyTakeaways: [
          "Variable decelerations -> Cord compression (Turn patient to lateral position).",
          "Early decelerations -> Head compression (Normal physiologic finding; no intervention needed).",
          "Accelerations -> Oxygenation / OK (Reassuring sign of fetal well-being).",
          "Late decelerations -> Placental insufficiency (Emergency: Turn to left side, stop oxytocin, 8–10 L O2 via non-rebreather, IV fluid bolus).",
        ],
        sections: [
          {
            heading: "1. VEAL CHOP Clinical Mnemonics",
            body: "Late decelerations begin after the peak of the uterine contraction and return to baseline after the contraction ends. They indicate compromised uteroplacental perfusion and necessitate immediate intrauterine resuscitation.",
          },
        ],
      },
    ],
  },
  {
    id: "cat-peds",
    slug: "pediatrics",
    title: "Pediatrics & Child Health",
    shortTitle: "Pediatrics",
    description: "Pediatric developmental milestones, congenital cardiac defects (cyanotic vs acyanotic), and childhood respiratory emergencies.",
    badge: "Specialty",
    iconName: "HeartPulse",
    colorTheme: "sky",
    subjects: [
      {
        id: "subj-epiglottitis",
        slug: "epiglottitis-vs-croup",
        title: "Epiglottitis vs. Laryngotracheobronchitis (Croup)",
        summary: "Emergency differentiation between viral croup (barking cough) and bacterial epiglottitis (tripod, drooling, absence of cough), and airway preservation rules.",
        readTime: "6 min read",
        difficulty: "High-Yield",
        clinicalKeyTakeaways: [
          "Epiglottitis is a medical emergency characterized by the 4 D's: Drooling, Dysphagia, Dysphonia, Distressed inspiratory stridor.",
          "NEVER inspect the throat with a tongue blade or swab when epiglottitis is suspected—this can cause complete laryngospasm and fatal airway occlusion.",
          "Keep child calm in parent's lap in tripod position and prepare for emergency endotracheal intubation or tracheostomy.",
        ],
        sections: [
          {
            heading: "1. Critical Airway Protocol",
            body: "Epiglottitis is primarily caused by Haemophilus influenzae type B (Hib). Children appear toxic, restless, and agitated with absence of cough. Contrast this with Croup, which presents with low-grade fever, inspiratory stridor, and a characteristic brassy 'seal-bark' cough treated with cool mist and nebulized epinephrine.",
          },
        ],
      },
    ],
  },
  {
    id: "cat-mental-health",
    slug: "mental-health",
    title: "Mental Health Nursing",
    shortTitle: "Mental Health",
    description: "Therapeutic communication techniques, psychotropic medications, mood disorders, substance withdrawal protocols, and crisis de-escalation.",
    badge: "Core Domain",
    iconName: "BrainCircuit",
    colorTheme: "purple",
    subjects: [
      {
        id: "subj-therapeutic-comm",
        slug: "therapeutic-communication",
        title: "Therapeutic Communication & De-escalation",
        summary: "Non-judgmental techniques, reflecting feelings, setting clear boundaries, and recognizing non-therapeutic responses on the NCLEX.",
        readTime: "7 min read",
        difficulty: "Fundamental",
        clinicalKeyTakeaways: [
          "Avoid 'Why' questions—they make the client defensive and imply blame.",
          "Never offer false reassurance ('Everything will be fine').",
          "Focus on the client's current feelings ('It sounds like you are feeling overwhelmed right now').",
          "For clients experiencing hallucinations, acknowledge their feelings without validating the false perception ('I believe you hear voices, but I do not hear them').",
        ],
        sections: [
          {
            heading: "1. Communication Strategies in Psychiatric Care",
            body: "Therapeutic communication requires active listening, broad openings, and open-ended questions. In acute psychosis, validate the client's emotion while gently reinforcing reality. For aggressive behavior, ensure safety, maintain an exit path, and use calm, low-tone verbal de-escalation before considering chemical or physical restraints.",
          },
        ],
      },
    ],
  },
  {
    id: "cat-fundamentals",
    slug: "fundamentals",
    title: "Fundamentals & Patient Safety",
    shortTitle: "Fundamentals",
    description: "Infection control, contact/droplet/airborne isolation precautions, fluid and electrolyte balance, and sterile technique principles.",
    badge: "Foundation",
    iconName: "ShieldAlert",
    colorTheme: "rose",
    subjects: [
      {
        id: "subj-isolation-precautions",
        slug: "isolation-precautions",
        title: "Transmission-Based Isolation Precautions",
        summary: "Airborne, Droplet, and Contact precautions breakdown, PPE donning and doffing sequence, and negative-pressure room requirements.",
        readTime: "6 min read",
        difficulty: "High-Yield",
        clinicalKeyTakeaways: [
          "Airborne (MTV: Measles, TB, Varicella/Shingles): Negative-pressure room, N95 respirator mask, door kept closed at all times.",
          "Droplet (PIMP: Pertussis, Influenza, Meningitis, Pneumonia): Surgical mask within 3 feet, private room or cohort.",
          "Contact (MRS. WEE: MRSA, VRE, C. difficile, Scabies): Gloves and gown. For C. diff, use soap and water (alcohol sanitizer is ineffective against spores).",
          "Donning sequence: Gown -> Mask -> Goggles/Shield -> Gloves.",
          "Doffing sequence (alphabetical): Gloves -> Goggles -> Gown -> Mask (remove N95 outside the room).",
        ],
        sections: [
          {
            heading: "1. PPE Sequencing & Environmental Safety",
            body: "Standard precautions apply to all patient interactions where exposure to blood, body fluids, non-intact skin, or mucous membranes is anticipated. Transmission-based precautions are implemented in addition to standard precautions based on suspected or confirmed pathogens.",
          },
        ],
      },
    ],
  },
  {
    id: "cat-leadership",
    slug: "leadership-delegation",
    title: "Leadership, Delegation & Priority",
    shortTitle: "Delegation",
    description: "Five rights of delegation, scope of practice distinctions between RN, LPN/VN, and UAP, and mass casualty disaster triage.",
    badge: "Management",
    iconName: "Layers",
    colorTheme: "indigo",
    subjects: [
      {
        id: "subj-delegation-rules",
        slug: "rn-lpn-uap-delegation",
        title: "Scope of Practice & Delegation Rules",
        summary: "Clear legal boundaries: What the RN must NEVER delegate (TAPE: Teaching, Assessment, Planning, Evaluating), and appropriate tasks for LPNs and UAPs.",
        readTime: "7 min read",
        difficulty: "High-Yield",
        clinicalKeyTakeaways: [
          "Do NOT delegate TAPE: Teaching, initial Assessment, Planning of care, or Evaluation of outcomes.",
          "LPN/LVN Scope: Stable clients with predictable outcomes, routine medication administration (excluding IV push in most jurisdictions), sterile dressing changes, monitoring ongoing findings.",
          "UAP Scope: Routine ADLs, vital signs on stable patients, intake & output, ambulation, basic hygiene and comfort care.",
          "Triage Rule: The patient who is unstable, experiencing an acute change in status, or receiving a new medication/blood product must always be assigned to the RN.",
        ],
        sections: [
          {
            heading: "1. The 5 Rights of Delegation",
            body: "The 5 Rights: Right Task, Right Circumstance, Right Person, Right Direction/Communication, and Right Supervision/Evaluation. The RN retains ultimate legal accountability for the clinical outcome when delegating nursing tasks.",
          },
        ],
      },
    ],
  },
];

export function getCategoryBySlug(slug: string): StudyGuideCategory | undefined {
  return STUDY_GUIDE_CATEGORIES.find((cat) => cat.slug.toLowerCase() === slug.toLowerCase());
}

export function getSubjectBySlugs(categorySlug: string, subjectSlug: string): { category: StudyGuideCategory; subject: StudyGuideSubject } | undefined {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return undefined;
  const subject = category.subjects.find((s) => s.slug.toLowerCase() === subjectSlug.toLowerCase());
  if (!subject) return undefined;
  return { category, subject };
}
