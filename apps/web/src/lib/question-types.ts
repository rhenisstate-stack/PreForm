export type CanonicalQuestionTypeKey =
  | "single-choice"
  | "multiple-choice"
  | "sata"
  | "checkbox"
  | "image-based"
  | "multiple-image"
  | "drag-drop"
  | "ordering"
  | "case-study"
  | "essay"
  | "matching"
  | "fill-blank"
  | "matrix"
  | "numeric"
  | "true-false"
  | "tabular"
  | "short-answer"
  | "dynamic-lab";

export type QuestionTypeCategory = "Traditional" | "Clinical" | "NGN";

export interface CanonicalQuestionTypeDefinition {
  id: string;
  key: CanonicalQuestionTypeKey;
  label: string;
  shortLabel: string;
  category: QuestionTypeCategory;
  displayOrder: number;
  description: string;
  isOptionBased: boolean;
  allowsMultipleSelections: boolean;
  requiresSingleCorrectOption: boolean;
  supportsMediaOptions: boolean;
  supportsClinicalExhibits: boolean;
  implementationStatus: "GradingSupported" | "Catalogued";
  supportedScoringMode: "AutomaticExactMatch" | "NotImplemented";
  defaultInstructions: string;
}

export const CANONICAL_QUESTION_TYPES: readonly CanonicalQuestionTypeDefinition[] = [
  {
    id: "qt-1",
    key: "single-choice",
    label: "Single Choice (MCQ)",
    shortLabel: "Single Choice",
    category: "Traditional",
    displayOrder: 1,
    description: "Standard single-answer multiple-choice clinical question.",
    isOptionBased: true,
    allowsMultipleSelections: false,
    requiresSingleCorrectOption: true,
    supportsMediaOptions: false,
    supportsClinicalExhibits: true,
    implementationStatus: "GradingSupported",
    supportedScoringMode: "AutomaticExactMatch",
    defaultInstructions: "Select the single best nursing response.",
  },
  {
    id: "qt-2",
    key: "multiple-choice",
    label: "Multiple Choice",
    shortLabel: "Multiple Choice",
    category: "Traditional",
    displayOrder: 2,
    description: "Multiple-choice item supporting one or more keyed clinical options.",
    isOptionBased: true,
    allowsMultipleSelections: true,
    requiresSingleCorrectOption: false,
    supportsMediaOptions: false,
    supportsClinicalExhibits: true,
    implementationStatus: "GradingSupported",
    supportedScoringMode: "AutomaticExactMatch",
    defaultInstructions: "Select the appropriate clinical option(s).",
  },
  {
    id: "qt-3",
    key: "sata",
    label: "Select All That Apply (SATA)",
    shortLabel: "SATA",
    category: "Traditional",
    displayOrder: 3,
    description: "Multi-select clinical prioritization item where one or more options are correct.",
    isOptionBased: true,
    allowsMultipleSelections: true,
    requiresSingleCorrectOption: false,
    supportsMediaOptions: false,
    supportsClinicalExhibits: true,
    implementationStatus: "GradingSupported",
    supportedScoringMode: "AutomaticExactMatch",
    defaultInstructions: "Select all options that apply to this clinical scenario.",
  },
  {
    id: "qt-4",
    key: "checkbox",
    label: "Multiple True/False (Checkbox)",
    shortLabel: "Checkbox",
    category: "Traditional",
    displayOrder: 4,
    description: "Form-based multi-checkbox clinical verification item.",
    isOptionBased: true,
    allowsMultipleSelections: true,
    requiresSingleCorrectOption: false,
    supportsMediaOptions: false,
    supportsClinicalExhibits: true,
    implementationStatus: "GradingSupported",
    supportedScoringMode: "AutomaticExactMatch",
    defaultInstructions: "Check all verified clinical statements that apply.",
  },
  {
    id: "qt-5",
    key: "image-based",
    label: "Hot Spot / Image-Based",
    shortLabel: "Image-Based",
    category: "Clinical",
    displayOrder: 5,
    description: "Clinical scenario accompanied by diagnostic radiograph, ECG strip, or anatomical image exhibit.",
    isOptionBased: true,
    allowsMultipleSelections: false,
    requiresSingleCorrectOption: true,
    supportsMediaOptions: true,
    supportsClinicalExhibits: true,
    implementationStatus: "GradingSupported",
    supportedScoringMode: "AutomaticExactMatch",
    defaultInstructions: "Review the clinical image exhibit and select the correct option.",
  },
  {
    id: "qt-6",
    key: "multiple-image",
    label: "Multiple Image Selection",
    shortLabel: "Multiple-Image",
    category: "Clinical",
    displayOrder: 6,
    description: "Comparative visual exhibits for diagnostic or procedural identification.",
    isOptionBased: true,
    allowsMultipleSelections: true,
    requiresSingleCorrectOption: false,
    supportsMediaOptions: true,
    supportsClinicalExhibits: true,
    implementationStatus: "GradingSupported",
    supportedScoringMode: "AutomaticExactMatch",
    defaultInstructions: "Select all visual exhibits that match the clinical criteria.",
  },
  {
    id: "qt-7",
    key: "drag-drop",
    label: "Drag and Drop / Ordered Response",
    shortLabel: "Drag & Drop",
    category: "NGN",
    displayOrder: 7,
    description: "Interactive clinical priority classification and token-to-target drag-and-drop.",
    isOptionBased: false,
    allowsMultipleSelections: true,
    requiresSingleCorrectOption: false,
    supportsMediaOptions: false,
    supportsClinicalExhibits: true,
    implementationStatus: "Catalogued",
    supportedScoringMode: "NotImplemented",
    defaultInstructions: "Assign each clinical finding or intervention to its appropriate target category.",
  },
  {
    id: "qt-8",
    key: "ordering",
    label: "Sequence / Priority Ordering",
    shortLabel: "Ordering",
    category: "NGN",
    displayOrder: 8,
    description: "Step-by-step procedural or nursing intervention priority sequence.",
    isOptionBased: false,
    allowsMultipleSelections: false,
    requiresSingleCorrectOption: false,
    supportsMediaOptions: false,
    supportsClinicalExhibits: true,
    implementationStatus: "Catalogued",
    supportedScoringMode: "NotImplemented",
    defaultInstructions: "Place the nursing interventions in chronological priority order from first to last.",
  },
  {
    id: "qt-9",
    key: "case-study",
    label: "Unfolding Case Study (6-Item NGN)",
    shortLabel: "NGN Case Study",
    category: "NGN",
    displayOrder: 9,
    description: "Multi-part clinical unfolding case study with EHR tabs and 6 NCSBN CJMM items.",
    isOptionBased: false,
    allowsMultipleSelections: true,
    requiresSingleCorrectOption: false,
    supportsMediaOptions: false,
    supportsClinicalExhibits: true,
    implementationStatus: "Catalogued",
    supportedScoringMode: "NotImplemented",
    defaultInstructions: "Review the unfolding EHR tabs and complete each linked clinical judgment item.",
  },
  {
    id: "qt-10",
    key: "essay",
    label: "Essay / Free-Text Clinical Note",
    shortLabel: "Essay",
    category: "Traditional",
    displayOrder: 10,
    description: "Extended SBAR or clinical reasoning reflection evaluated against a structured rubric.",
    isOptionBased: false,
    allowsMultipleSelections: false,
    requiresSingleCorrectOption: false,
    supportsMediaOptions: false,
    supportsClinicalExhibits: true,
    implementationStatus: "Catalogued",
    supportedScoringMode: "NotImplemented",
    defaultInstructions: "Compose a structured clinical nursing note addressing all required assessment elements.",
  },
  {
    id: "qt-11",
    key: "matching",
    label: "Matching / Term-to-Definition",
    shortLabel: "Matching",
    category: "Traditional",
    displayOrder: 11,
    description: "Paired medication, concept, or pathophysiology matching interaction.",
    isOptionBased: false,
    allowsMultipleSelections: false,
    requiresSingleCorrectOption: false,
    supportsMediaOptions: false,
    supportsClinicalExhibits: true,
    implementationStatus: "Catalogued",
    supportedScoringMode: "NotImplemented",
    defaultInstructions: "Match each clinical item in the left column with its corresponding match on the right.",
  },
  {
    id: "qt-12",
    key: "fill-blank",
    label: "Fill-in-the-Blank / Cloze Drop-Down",
    shortLabel: "Fill-in-Blank / Cloze",
    category: "Traditional",
    displayOrder: 12,
    description: "Cloze sentence completion or direct textual/dropdown entry for clinical terms.",
    isOptionBased: false,
    allowsMultipleSelections: false,
    requiresSingleCorrectOption: false,
    supportsMediaOptions: false,
    supportsClinicalExhibits: true,
    implementationStatus: "Catalogued",
    supportedScoringMode: "NotImplemented",
    defaultInstructions: "Complete each blank in the clinical statement with the appropriate term or selection.",
  },
  {
    id: "qt-13",
    key: "matrix",
    label: "Matrix / Grid Multiple Response",
    shortLabel: "Matrix / Grid",
    category: "NGN",
    displayOrder: 13,
    description: "Tabular multiple-response clinical evaluation matrix mapping findings to conditions.",
    isOptionBased: false,
    allowsMultipleSelections: true,
    requiresSingleCorrectOption: false,
    supportsMediaOptions: false,
    supportsClinicalExhibits: true,
    implementationStatus: "Catalogued",
    supportedScoringMode: "NotImplemented",
    defaultInstructions: "For each clinical finding row, select the corresponding column(s) that apply.",
  },
  {
    id: "qt-14",
    key: "numeric",
    label: "Dosage Calculation / Numeric Entry",
    shortLabel: "Numeric Entry",
    category: "Traditional",
    displayOrder: 14,
    description: "Quantitative dosage calculation, IV drip rate, or intake/output measurement entry.",
    isOptionBased: false,
    allowsMultipleSelections: false,
    requiresSingleCorrectOption: false,
    supportsMediaOptions: false,
    supportsClinicalExhibits: true,
    implementationStatus: "Catalogued",
    supportedScoringMode: "NotImplemented",
    defaultInstructions: "Calculate the exact numeric value and round according to the specified clinical rule.",
  },
  {
    id: "qt-15",
    key: "true-false",
    label: "Clinical True / False",
    shortLabel: "True / False",
    category: "Traditional",
    displayOrder: 15,
    description: "Binary clinical fact and patient safety verification item.",
    isOptionBased: true,
    allowsMultipleSelections: false,
    requiresSingleCorrectOption: true,
    supportsMediaOptions: false,
    supportsClinicalExhibits: true,
    implementationStatus: "GradingSupported",
    supportedScoringMode: "AutomaticExactMatch",
    defaultInstructions: "Determine whether the clinical statement is True or False.",
  },
  {
    id: "qt-16",
    key: "tabular",
    label: "Chart / Exhibit Tabular Review",
    shortLabel: "Tabular Review",
    category: "NGN",
    displayOrder: 16,
    description: "Data table evaluation for Indicated / Contraindicated / Non-Essential clinical interventions.",
    isOptionBased: false,
    allowsMultipleSelections: true,
    requiresSingleCorrectOption: false,
    supportsMediaOptions: false,
    supportsClinicalExhibits: true,
    implementationStatus: "Catalogued",
    supportedScoringMode: "NotImplemented",
    defaultInstructions: "Review the clinical chart table and classify each intervention or finding.",
  },
  {
    id: "qt-17",
    key: "short-answer",
    label: "Short Focused Clinical Response",
    shortLabel: "Short Answer",
    category: "Traditional",
    displayOrder: 17,
    description: "Concise focused clinical assessment entry evaluated against accepted key phrases.",
    isOptionBased: false,
    allowsMultipleSelections: false,
    requiresSingleCorrectOption: false,
    supportsMediaOptions: false,
    supportsClinicalExhibits: true,
    implementationStatus: "Catalogued",
    supportedScoringMode: "NotImplemented",
    defaultInstructions: "Provide a concise clinical response in the field below.",
  },
  {
    id: "qt-18",
    key: "dynamic-lab",
    label: "Highlight Text / Bowtie / Dynamic Lab",
    shortLabel: "Bowtie / Dynamic Lab",
    category: "NGN",
    displayOrder: 18,
    description: "Interactive laboratory trend analysis, NGN Bowtie clinical reasoning, or highlight-text interaction.",
    isOptionBased: false,
    allowsMultipleSelections: true,
    requiresSingleCorrectOption: false,
    supportsMediaOptions: false,
    supportsClinicalExhibits: true,
    implementationStatus: "Catalogued",
    supportedScoringMode: "NotImplemented",
    defaultInstructions: "Analyze the dynamic laboratory values and complete the clinical reasoning targets.",
  },
] as const;

export const OPTION_BASED_QUESTION_TYPES = CANONICAL_QUESTION_TYPES.filter(
  (t) => t.isOptionBased
);

export const STRUCTURED_QUESTION_TYPES = CANONICAL_QUESTION_TYPES.filter(
  (t) => !t.isOptionBased
);

const LEGACY_KEY_ALIASES: Record<string, CanonicalQuestionTypeKey> = {
  "multiple-response": "sata",
  "drag-and-drop": "drag-drop",
  "ordered-response": "ordering",
  "hot-spot": "image-based",
  "fill-in-the-blank": "fill-blank",
};

export function normalizeQuestionTypeKey(key?: string | null): CanonicalQuestionTypeKey {
  if (!key) return "single-choice";
  const normalized = key.trim().toLowerCase();
  if (LEGACY_KEY_ALIASES[normalized]) {
    return LEGACY_KEY_ALIASES[normalized];
  }
  const found = CANONICAL_QUESTION_TYPES.find((t) => t.key === normalized);
  return found ? found.key : "single-choice";
}

export function getQuestionTypeDefinition(
  key?: string | null
): CanonicalQuestionTypeDefinition {
  const canonicalKey = normalizeQuestionTypeKey(key);
  return (
    CANONICAL_QUESTION_TYPES.find((t) => t.key === canonicalKey) ||
    CANONICAL_QUESTION_TYPES[0]
  );
}

export function isOptionBasedQuestionType(key?: string | null): boolean {
  return getQuestionTypeDefinition(key).isOptionBased;
}

export function isMultiSelectOptionType(key?: string | null): boolean {
  const def = getQuestionTypeDefinition(key);
  return def.isOptionBased && def.allowsMultipleSelections;
}

export interface ClinicalExhibitTab {
  id: string;
  title: string;
  content: string;
}

export function parseExhibitsJson(json?: string | null): ClinicalExhibitTab[] {
  if (!json || !json.trim()) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed.map((item, idx) => ({
        id: String(item?.id || `exhibit-${idx + 1}`),
        title: String(item?.title || item?.label || `Exhibit ${idx + 1}`),
        content: String(item?.content || item?.body || ""),
      }));
    }
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.tabs)) {
      return parsed.tabs.map((item: any, idx: number) => ({
        id: String(item?.id || `exhibit-${idx + 1}`),
        title: String(item?.title || item?.label || `Exhibit ${idx + 1}`),
        content: String(item?.content || item?.body || ""),
      }));
    }
  } catch {
    // Ignore parse error
  }
  return [];
}

export function getDefaultStructuredContent(typeKey: CanonicalQuestionTypeKey): Record<string, any> {
  switch (typeKey) {
    case "drag-drop":
      return {
        prompt: "Drag each clinical finding into the appropriate target category.",
        categories: ["Priority Intervention", "Routine Monitoring"],
        items: [
          { id: "dd-1", text: "Administer IV epinephrine 0.3 mg IM", targetCategory: "Priority Intervention" },
          { id: "dd-2", text: "Reassess vital signs every 15 minutes", targetCategory: "Routine Monitoring" },
        ],
        correctOrder: ["dd-1", "dd-2"],
      };
    case "ordering":
      return {
        prompt: "Place the nursing steps in sequential priority order.",
        steps: [
          "Verify healthcare provider prescription and client allergies",
          "Perform hand hygiene and identify client using two identifiers",
          "Administer medication via prescribed route and monitor response",
        ],
        correctOrder: [0, 1, 2],
      };
    case "case-study":
      return {
        scenarioTitle: "Unfolding Clinical Case Study",
        cjmmItems: [
          {
            itemNumber: 1,
            cjmmStep: "Recognize Cues",
            stem: "Which two clinical findings require immediate follow-up?",
            options: ["BP 84/50 mmHg", "SpO2 89% on room air", "Temp 37.0 C (98.6 F)"],
            correctAnswers: ["BP 84/50 mmHg", "SpO2 89% on room air"],
          },
          {
            itemNumber: 2,
            cjmmStep: "Analyze Cues",
            stem: "The client's findings are most consistent with which acute complication?",
            options: ["Septic shock", "Uncomplicated UTI"],
            correctAnswers: ["Septic shock"],
          },
          {
            itemNumber: 3,
            cjmmStep: "Prioritize Hypotheses",
            stem: "Which physiological risk is the highest priority?",
            options: ["Inadequate tissue perfusion", "Mild anxiety"],
            correctAnswers: ["Inadequate tissue perfusion"],
          },
          {
            itemNumber: 4,
            cjmmStep: "Generate Solutions",
            stem: "Which prescription should the nurse anticipate first?",
            options: ["0.9% Sodium Chloride 30 mL/kg IV bolus", "Oral acetaminophen"],
            correctAnswers: ["0.9% Sodium Chloride 30 mL/kg IV bolus"],
          },
          {
            itemNumber: 5,
            cjmmStep: "Take Action",
            stem: "Which action should the nurse implement before initiating broad-spectrum antibiotics?",
            options: ["Obtain two sets of blood cultures", "Ambulate client in hallway"],
            correctAnswers: ["Obtain two sets of blood cultures"],
          },
          {
            itemNumber: 6,
            cjmmStep: "Evaluate Outcomes",
            stem: "Which finding indicates that resuscitation is effective?",
            options: ["MAP >= 65 mmHg and urine output >= 30 mL/hr", "Heart rate 128/min"],
            correctAnswers: ["MAP >= 65 mmHg and urine output >= 30 mL/hr"],
          },
        ],
      };
    case "essay":
      return {
        rubricCriteria: [
          "Situation: Identifies acute change in client status",
          "Background: Summarizes pertinent clinical history and medications",
          "Assessment: Reports vital signs and physical exam findings",
          "Recommendation: States clear provider notification request",
        ],
        minWords: 40,
        maxWords: 300,
        sampleResponse:
          "SBAR Note: Client experienced acute onset dyspnea with SpO2 88% on room air; requesting immediate bedside evaluation and ABG order.",
      };
    case "matching":
      return {
        pairs: [
          { id: "m-1", term: "Naloxone", definition: "Opioid receptor antagonist" },
          { id: "m-2", term: "Flumazenil", definition: "Benzodiazepine reversal agent" },
          { id: "m-3", term: "Protamine sulfate", definition: "Heparin antidote" },
        ],
        distractors: ["Oral potassium binder"],
      };
    case "fill-blank":
      return {
        templateText:
          "Before administering digoxin, the nurse must auscultate the {{blank_1}} pulse for {{blank_2}} full second(s) and withhold if below 60/min.",
        blanks: [
          {
            id: "blank_1",
            label: "Blank 1",
            acceptedAnswers: ["apical"],
            dropdownOptions: ["apical", "radial", "carotid"],
          },
          {
            id: "blank_2",
            label: "Blank 2",
            acceptedAnswers: ["60", "sixty"],
            dropdownOptions: ["60", "30", "15"],
          },
        ],
        caseSensitive: false,
      };
    case "matrix":
      return {
        selectionMode: "multi-per-row",
        rows: ["Hypotension (BP 82/48 mmHg)", "Jugular venous distention", "Muffled heart sounds"],
        columns: ["Cardiac Tamponade", "Hypovolemic Shock"],
        correctCells: ["0:0", "0:1", "1:0", "2:0"],
      };
    case "numeric":
      return {
        correctValue: 125,
        tolerance: 0,
        unit: "mL/hr",
        decimalPlaces: 0,
        formulaHint: "Total Volume (1000 mL) / Time (8 hr) = 125 mL/hr",
      };
    case "tabular":
      return {
        tableTitle: "Emergency Department Orders & Diagnostic Findings",
        headers: ["Nursing Intervention", "Indicated", "Contraindicated", "Non-Essential"],
        findings: [
          {
            finding: "Initiate continuous cardiac monitoring",
            classification: "Indicated",
          },
          {
            finding: "Administer beta-blocker to client in complete heart block",
            classification: "Contraindicated",
          },
        ],
      };
    case "short-answer":
      return {
        acceptedKeywords: ["epinephrine", "intramuscular", "airway"],
        maxCharacters: 250,
        sampleAnswer: "Administer intramuscular epinephrine into the anterolateral thigh and maintain airway patency.",
      };
    case "dynamic-lab":
      return {
        interactionMode: "bowtie",
        labValues: [
          { parameter: "Serum Potassium (K+)", value: "6.4 mEq/L", referenceRange: "3.5 - 5.0 mEq/L", flag: "High (Critical)" },
          { parameter: "Serum Creatinine", value: "2.8 mg/dL", referenceRange: "0.6 - 1.2 mg/dL", flag: "High" },
        ],
        potentialConditions: ["Acute Hyperkalemia", "Hypokalemic Alkalosis", "Diabetes Insipidus"],
        correctCondition: "Acute Hyperkalemia",
        actionsToTake: [
          "Administer IV calcium gluconate per protocol",
          "Place client on continuous 12-lead ECG telemetry",
          "Administer IV potassium chloride bolus",
          "Restrict all cardiac monitoring",
        ],
        correctActions: [
          "Administer IV calcium gluconate per protocol",
          "Place client on continuous 12-lead ECG telemetry",
        ],
        parametersToMonitor: [
          "T-wave morphology and QRS duration on ECG",
          "Repeat serum potassium levels",
          "Urine specific gravity only",
          "Pupillary light reflex",
        ],
        correctParameters: [
          "T-wave morphology and QRS duration on ECG",
          "Repeat serum potassium levels",
        ],
      };
    default:
      return {};
  }
}

export interface QuestionValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateQuestionPayload(input: {
  questionTypeKey: string;
  stem: string;
  options: Array<{ optionKey: string; content: string; isCorrect: boolean; mediaUrl?: string }>;
  structuredContentJson?: string;
  exhibitsJson?: string;
}): QuestionValidationResult {
  const errors: Record<string, string> = {};
  const def = getQuestionTypeDefinition(input.questionTypeKey);

  if (!input.stem || !input.stem.trim()) {
    errors.stem = "Question clinical stem is required.";
  }

  if (input.exhibitsJson && input.exhibitsJson.trim()) {
    try {
      JSON.parse(input.exhibitsJson);
    } catch {
      errors.exhibitsJson = "Clinical Exhibits JSON is malformed.";
    }
  }

  if (def.isOptionBased) {
    const validOptions = input.options.filter(
      (o) => (o.content && o.content.trim().length > 0) || (o.mediaUrl && o.mediaUrl.trim().length > 0)
    );
    if (def.key === "true-false") {
      if (validOptions.length !== 2) {
        errors.options = "True / False questions require exactly 2 options (True and False).";
      }
    } else if (validOptions.length < 2) {
      errors.options = `${def.label} requires at least 2 non-empty answer options.`;
    }

    const correctCount = validOptions.filter((o) => o.isCorrect).length;
    if (def.requiresSingleCorrectOption && correctCount !== 1) {
      errors.correctAnswer = `${def.label} requires exactly 1 correct option (currently ${correctCount} selected).`;
    } else if (!def.requiresSingleCorrectOption && correctCount < 1) {
      errors.correctAnswer = `${def.label} requires at least 1 correct option.`;
    }
  } else {
    if (!input.structuredContentJson || !input.structuredContentJson.trim()) {
      errors.structuredContentJson = `${def.label} requires structured configuration content.`;
    } else {
      try {
        const parsed = JSON.parse(input.structuredContentJson);
        if (!parsed || typeof parsed !== "object") {
          errors.structuredContentJson = "Structured configuration must be a valid JSON object.";
        }
      } catch {
        errors.structuredContentJson = "Structured configuration contains invalid JSON syntax.";
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
