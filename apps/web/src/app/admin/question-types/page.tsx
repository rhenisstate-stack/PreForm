"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Layers,
  FileQuestion,
  HelpCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { BRAND } from "@/lib/brand";

interface QuestionTypeCatalogueItem {
  id: string;
  key: string;
  name: string;
  category: "Traditional" | "NGN" | "Clinical";
  scoringStrategy: "ExactMatch" | "PartialCredit" | "ManualReview";
  description: string;
  responseSchema: string;
  sampleUseCase: string;
}

const eighteenQuestionTypes: QuestionTypeCatalogueItem[] = [
  {
    id: "qt-1",
    key: "single-choice",
    name: "Single-Choice / Single-Answer",
    category: "Traditional",
    scoringStrategy: "ExactMatch",
    description: "Standard single-answer question requiring one correct option among 4 choices.",
    responseSchema: "string (single option key)",
    sampleUseCase: "Basic prioritization, recall of vital sign ranges, single best intervention.",
  },
  {
    id: "qt-2",
    key: "multiple-choice",
    name: "Multiple-Choice / Multiple-Answer",
    category: "Traditional",
    scoringStrategy: "ExactMatch",
    description: "Question format supporting one or more correct options.",
    responseSchema: "string[] (array of selected option keys)",
    sampleUseCase: "Safety checks, identifying common side effects of ACE inhibitors.",
  },
  {
    id: "qt-3",
    key: "sata",
    name: "Select All That Apply (SATA)",
    category: "Traditional",
    scoringStrategy: "PartialCredit",
    description: "NCLEX multi-select item evaluated using +/- scoring methodology.",
    responseSchema: "string[] (array of selected option keys)",
    sampleUseCase: "Clinical findings in severe hypocalcemia, post-op thyroidectomy precautions.",
  },
  {
    id: "qt-4",
    key: "checkbox",
    name: "Checkbox-Based Response",
    category: "Traditional",
    scoringStrategy: "PartialCredit",
    description: "Form-based interactive checklist for multidimensional assessment.",
    responseSchema: "string[] (array of checked item keys)",
    sampleUseCase: "Pre-operative surgical checklist items, PPE donning procedure.",
  },
  {
    id: "qt-5",
    key: "image-based",
    name: "Image-Based Question",
    category: "Clinical",
    scoringStrategy: "ExactMatch",
    description: "Clinical vignette paired with a high-resolution radiograph, ECG rhythm strip, or anatomy photo.",
    responseSchema: "string (selected diagnosis or hotspot coordinate)",
    sampleUseCase: "Identifying ventricular fibrillation on ECG strip or chest tube placement on CXR.",
  },
  {
    id: "qt-6",
    key: "multiple-image",
    name: "Multiple-Image Item",
    category: "Clinical",
    scoringStrategy: "ExactMatch",
    description: "Comparative visual exhibits for diagnostic identification and stage differentiation.",
    responseSchema: "string (selected image key)",
    sampleUseCase: "Staging pressure injuries (Stage 1 through 4, unstageable, DTI).",
  },
  {
    id: "qt-7",
    key: "drag-drop",
    name: "Drag-and-Drop",
    category: "NGN",
    scoringStrategy: "ExactMatch",
    description: "Interactive clinical priority classification from pool to targeted drop zones.",
    responseSchema: "Record<zoneKey, itemKey[]>",
    sampleUseCase: "Categorizing findings into Anticipated vs Contraindicated nursing interventions.",
  },
  {
    id: "qt-8",
    key: "ordering",
    name: "Ordering / Sequencing",
    category: "NGN",
    scoringStrategy: "ExactMatch",
    description: "Chronological arrangement of procedural steps or emergency resuscitation priorities.",
    responseSchema: "string[] (ordered list of step keys)",
    sampleUseCase: "Order of actions in blood transfusion reaction, tracheostomy suctioning steps.",
  },
  {
    id: "qt-9",
    key: "case-study",
    name: "NGN Case Study",
    category: "NGN",
    scoringStrategy: "PartialCredit",
    description: "6-item unfolding clinical judgment case study with split-pane EHR, provider notes, vitals, and labs.",
    responseSchema: "Composite case response per cognitive skill step",
    sampleUseCase: "Recognize Cues -> Analyze Cues -> Prioritize Hypotheses -> Generate Solutions -> Take Action -> Evaluate Outcomes.",
  },
  {
    id: "qt-10",
    key: "essay",
    name: "Essay / Extended Response",
    category: "Traditional",
    scoringStrategy: "ManualReview",
    description: "Freeform clinical reasoning reflection requiring academic instructor scoring.",
    responseSchema: "string (freeform text explanation)",
    sampleUseCase: "Formulating a patient discharge education plan for newly diagnosed Type 1 Diabetes.",
  },
  {
    id: "qt-11",
    key: "matching",
    name: "Matching",
    category: "Traditional",
    scoringStrategy: "ExactMatch",
    description: "Paired concept-to-intervention clinical matching.",
    responseSchema: "Record<sourceKey, targetKey>",
    sampleUseCase: "Matching pharmacology mechanism of action with therapeutic drug class.",
  },
  {
    id: "qt-12",
    key: "fill-blank",
    name: "Fill-in-the-Blank",
    category: "Traditional",
    scoringStrategy: "ExactMatch",
    description: "Direct textual or numeric entry for clinical parameters without multiple choice cues.",
    responseSchema: "string (exact text match normalized)",
    sampleUseCase: "Calculation of IV drop factor (gtt/min) or specifying a targeted laboratory analyte.",
  },
  {
    id: "qt-13",
    key: "matrix",
    name: "Matrix / Grid Response",
    category: "NGN",
    scoringStrategy: "PartialCredit",
    description: "Tabular multiple-response clinical evaluation matrix with rows and column headers.",
    responseSchema: "Record<rowKey, columnKey>",
    sampleUseCase: "Evaluating whether clinical findings indicate Heart Failure, COPD, or Pneumonia.",
  },
  {
    id: "qt-14",
    key: "numeric",
    name: "Numeric Response",
    category: "Traditional",
    scoringStrategy: "ExactMatch",
    description: "Dosage calculation and clinical measurement entry with exact rounding tolerance.",
    responseSchema: "number (floating point or integer)",
    sampleUseCase: "Heparin weight-based drip calculation rounded to the nearest tenth of a mL/hr.",
  },
  {
    id: "qt-15",
    key: "true-false",
    name: "True / False",
    category: "Traditional",
    scoringStrategy: "ExactMatch",
    description: "Binary clinical fact and safety validation.",
    responseSchema: "boolean",
    sampleUseCase: "Validating clinical contraindications before administering beta blockers.",
  },
  {
    id: "qt-16",
    key: "tabular",
    name: "Tabular Response",
    category: "NGN",
    scoringStrategy: "PartialCredit",
    description: "Data table evaluation for clinical interventions and client assessment trends.",
    responseSchema: "Record<rowId, selectedValues[]>",
    sampleUseCase: "Reviewing a 24-hour intake and output chart to assess acute kidney injury trajectory.",
  },
  {
    id: "qt-17",
    key: "short-answer",
    name: "Short-Answer Response",
    category: "Traditional",
    scoringStrategy: "ManualReview",
    description: "Concise clinical assessment entry with rubric-based keyword scoring.",
    responseSchema: "string (concise clinical response)",
    sampleUseCase: "Identifying the single most urgent nursing action for suspected pulmonary embolism.",
  },
  {
    id: "qt-18",
    key: "dynamic-lab",
    name: "Dynamic Lab-Value Response",
    category: "NGN",
    scoringStrategy: "ExactMatch",
    description: "Interactive laboratory value and trend analysis with reference range comparison.",
    responseSchema: "Record<analyteKey, clinicalTrendStatus>",
    sampleUseCase: "Interpreting serial arterial blood gases (ABGs) for uncompensated metabolic acidosis.",
  },
];

export default function QuestionTypesPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");

  const filteredTypes = eighteenQuestionTypes.filter((item) => {
    const matchesQuery =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Back to Admin & Header */}
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin Overview
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-mono font-semibold text-secondary">
                18 Formats Verified
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">
                Question-Type Registry
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Authoritative catalog of supported NCLEX question interactions, response schemas, and scoring strategies.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border border-border p-4 rounded-2xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search question types..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["All", "Traditional", "NGN", "Clinical"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 18 Question Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTypes.map((item, idx) => (
          <div
            key={item.id}
            className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between hover:border-secondary/40 transition-colors"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-secondary">
                  #{idx + 1} · {item.key}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {item.category}
                </span>
              </div>

              <h3 className="font-serif font-semibold text-foreground text-lg">
                {item.name}
              </h3>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.description}
              </p>

              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Scoring Model:</span>
                  <span className="font-mono font-medium text-foreground">{item.scoringStrategy}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Response Schema:</span>
                  <span className="font-mono text-xs text-secondary truncate max-w-[160px]">{item.responseSchema}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40">
              <p className="text-[11px] text-muted-foreground italic leading-snug">
                &ldquo;{item.sampleUseCase}&rdquo;
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
