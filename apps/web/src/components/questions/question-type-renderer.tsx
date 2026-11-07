"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Layers,
  ShieldCheck,
  Sparkles,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  getQuestionTypeDefinition,
  parseExhibitsJson,
  getDefaultStructuredContent,
} from "@/lib/question-types";

export interface RenderableQuestionOption {
  id?: string;
  optionKey: string;
  content: string;
  isCorrect?: boolean;
  rationale?: string | null;
  distractorRationale?: string | null;
  mediaUrl?: string | null;
  displayOrder?: number;
}

export interface QuestionTypeRendererProps {
  questionId?: string;
  questionCode?: string | null;
  questionTypeKey: string;
  stem: string;
  instructions?: string | null;
  clinicalScenario?: string | null;
  exhibitsJson?: string | null;
  structuredContentJson?: string | null;
  overallRationale?: string | null;
  options?: RenderableQuestionOption[];
  /**
   * "admin-preview": shows candidate controls + highlights correct answer key & rationales
   * "candidate-interactive": interactive learner mode without revealing answer keys
   * "candidate-review": post-submission review mode showing learner selection + correct keys
   */
  mode?: "admin-preview" | "candidate-interactive" | "candidate-review";
  selectedOptionIndices?: number[];
  onToggleOptionIndex?: (index: number) => void;
  structuredResponse?: Record<string, any>;
  onStructuredResponseChange?: (next: Record<string, any>) => void;
}

export function QuestionTypeRenderer({
  questionTypeKey,
  stem,
  instructions,
  clinicalScenario,
  exhibitsJson,
  structuredContentJson,
  overallRationale,
  options = [],
  mode = "admin-preview",
  selectedOptionIndices = [],
  onToggleOptionIndex,
  structuredResponse: externalStructuredResponse,
  onStructuredResponseChange,
}: QuestionTypeRendererProps) {
  const typeDef = getQuestionTypeDefinition(questionTypeKey);
  const exhibits = React.useMemo(() => parseExhibitsJson(exhibitsJson), [exhibitsJson]);
  const [activeExhibitId, setActiveExhibitId] = React.useState<string>(
    exhibits[0]?.id || ""
  );

  React.useEffect(() => {
    if (exhibits.length > 0 && !exhibits.some((e) => e.id === activeExhibitId)) {
      setActiveExhibitId(exhibits[0].id);
    }
  }, [exhibits, activeExhibitId]);

  const parsedStructured = React.useMemo<Record<string, any>>(() => {
    if (structuredContentJson && structuredContentJson.trim()) {
      try {
        const parsed = JSON.parse(structuredContentJson);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      } catch {
        // Fallback to default structure if malformed in draft preview
      }
    }
    return getDefaultStructuredContent(typeDef.key);
  }, [structuredContentJson, typeDef.key]);

  const [localSelectedIndices, setLocalSelectedIndices] = React.useState<number[]>(
    selectedOptionIndices
  );
  const [localStructuredResponse, setLocalStructuredResponse] = React.useState<
    Record<string, any>
  >(externalStructuredResponse || {});

  const effectiveSelectedIndices = onToggleOptionIndex
    ? selectedOptionIndices
    : localSelectedIndices;

  const effectiveStructuredResponse = onStructuredResponseChange
    ? externalStructuredResponse || {}
    : localStructuredResponse;

  const updateStructuredResponse = (patch: Record<string, any>) => {
    const next = { ...effectiveStructuredResponse, ...patch };
    if (onStructuredResponseChange) {
      onStructuredResponseChange(next);
    } else {
      setLocalStructuredResponse(next);
    }
  };

  const handleOptionClick = (idx: number) => {
    if (onToggleOptionIndex) {
      onToggleOptionIndex(idx);
      return;
    }
    if (typeDef.allowsMultipleSelections) {
      setLocalSelectedIndices((prev) =>
        prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
      );
    } else {
      setLocalSelectedIndices([idx]);
    }
  };

  const showAnswerKey = mode === "admin-preview" || mode === "candidate-review";

  return (
    <div
      data-testid={`question-renderer-${typeDef.key}`}
      className="w-full max-w-none space-y-5"
    >
      {/* Question Type Header Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="text-[11px] font-mono bg-primary/5 text-primary border-primary/20"
          >
            <Layers className="h-3 w-3 mr-1" />
            {typeDef.label} ({typeDef.key})
          </Badge>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {typeDef.category}
          </Badge>
          {typeDef.allowsMultipleSelections ? (
            <Badge
              variant="outline"
              className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
            >
              Multi-Select Response
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              Single Response
            </Badge>
          )}
        </div>
      </div>

      {/* Clinical Scenario & Exhibits Split or Stacked Workspace */}
      {(clinicalScenario || exhibits.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 rounded-xl border border-border bg-muted/20 p-4">
          {clinicalScenario && (
            <div
              className={
                exhibits.length > 0 ? "lg:col-span-6 space-y-2" : "lg:col-span-12 space-y-2"
              }
            >
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                <FileText className="h-3.5 w-3.5" />
                Clinical Scenario / Patient Vignette
              </div>
              <div
                data-testid="renderer-clinical-scenario"
                className="rounded-lg border border-border bg-background p-3.5 text-sm leading-relaxed whitespace-pre-wrap"
              >
                {clinicalScenario}
              </div>
            </div>
          )}

          {exhibits.length > 0 && (
            <div
              className={
                clinicalScenario ? "lg:col-span-6 space-y-2" : "lg:col-span-12 space-y-2"
              }
            >
              <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-2">
                {exhibits.map((exhibit) => (
                  <Button
                    key={exhibit.id}
                    type="button"
                    size="sm"
                    variant={activeExhibitId === exhibit.id ? "default" : "outline"}
                    onClick={() => setActiveExhibitId(exhibit.id)}
                    className="h-7 text-xs"
                  >
                    {exhibit.title}
                  </Button>
                ))}
              </div>
              {exhibits
                .filter((e) => e.id === activeExhibitId)
                .map((exhibit) => (
                  <div
                    key={exhibit.id}
                    data-testid="renderer-exhibit-content"
                    className="rounded-lg border border-border bg-background p-3.5 text-xs font-mono leading-relaxed whitespace-pre-wrap"
                  >
                    {exhibit.content}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Question Stem & Instructions */}
      <div className="rounded-xl border border-border bg-slate-50/70 dark:bg-slate-900/50 p-5 space-y-2">
        <p className="text-sm sm:text-base font-medium text-foreground leading-relaxed whitespace-pre-wrap">
          {stem}
        </p>
        <p className="text-xs italic text-muted-foreground">
          {instructions || typeDef.defaultInstructions}
        </p>
      </div>

      {/* Type-Specific Interactive / Preview Area */}
      {typeDef.isOptionBased ? (
        <div className="space-y-2.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {typeDef.key === "multiple-image" || typeDef.key === "image-based"
              ? "Visual Clinical Exhibits & Response Options"
              : "Candidate Option Choices"}
          </Label>
          <div
            className={
              typeDef.key === "multiple-image"
                ? "grid grid-cols-1 md:grid-cols-2 gap-3"
                : "space-y-2.5"
            }
          >
            {options.map((opt, idx) => {
              const isSelected = effectiveSelectedIndices.includes(idx);
              const isCorrect = Boolean(opt.isCorrect);
              const optionLetter = opt.optionKey || String.fromCharCode(65 + idx);

              return (
                <div
                  key={opt.id || `${optionLetter}_${idx}`}
                  onClick={() => handleOptionClick(idx)}
                  role={typeDef.allowsMultipleSelections ? "checkbox" : "radio"}
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleOptionClick(idx);
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-start gap-3 cursor-pointer transition-all ${
                    showAnswerKey && isCorrect
                      ? "border-emerald-500/50 bg-emerald-50/60 dark:bg-emerald-950/25 text-emerald-950 dark:text-emerald-100"
                      : isSelected
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                      : "border-border bg-card hover:bg-muted/40 text-foreground"
                  }`}
                >
                  <span
                    className={`h-6 w-6 flex items-center justify-center text-xs font-bold shrink-0 ${
                      typeDef.allowsMultipleSelections ? "rounded-md" : "rounded-full"
                    } ${
                      showAnswerKey && isCorrect
                        ? "bg-emerald-600 text-white"
                        : isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {optionLetter}
                  </span>
                  <div className="flex-1 space-y-2">
                    <div className="font-medium leading-relaxed">{opt.content}</div>
                    {opt.mediaUrl && (
                      <div className="rounded-lg border border-border bg-muted/30 p-2 space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                          <ImageIcon className="h-3.5 w-3.5 text-primary" />
                          <span>Exhibit Media: {opt.mediaUrl}</span>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={opt.mediaUrl}
                          alt={`Option ${optionLetter} clinical exhibit`}
                          className="max-h-48 rounded object-contain"
                        />
                      </div>
                    )}
                    {showAnswerKey && isCorrect && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Correct Key (Admin Preview)
                      </span>
                    )}
                    {showAnswerKey && opt.rationale && (
                      <div className="text-xs text-muted-foreground mt-1 pl-2.5 border-l-2 border-emerald-500/50">
                        {opt.rationale}
                      </div>
                    )}
                    {showAnswerKey && !isCorrect && opt.distractorRationale && (
                      <div className="text-xs text-muted-foreground mt-1 pl-2.5 border-l-2 border-amber-500/50">
                        Distractor Rationale: {opt.distractorRationale}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          data-testid={`structured-renderer-${typeDef.key}`}
          className="rounded-xl border border-border bg-card p-5 space-y-4"
        >
          {/* qt-7: Drag and Drop */}
          {typeDef.key === "drag-drop" && (
            <div className="space-y-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Interactive Drag-and-Drop Classification
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Draggable Clinical Items</Label>
                  {(Array.isArray(parsedStructured.items) ? parsedStructured.items : []).map(
                    (item: any, idx: number) => {
                      const label = typeof item === "string" ? item : item.text || item.label || `Item ${idx + 1}`;
                      const target = typeof item === "object" ? item.targetCategory : null;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-2.5 text-xs"
                        >
                          <span>{label}</span>
                          {showAnswerKey && target && (
                            <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                              Target: {target}
                            </Badge>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Target Categories</Label>
                  {(Array.isArray(parsedStructured.categories)
                    ? parsedStructured.categories
                    : ["Priority Intervention", "Routine Monitoring"]
                  ).map((cat: string, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 text-xs font-semibold"
                    >
                      {cat}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* qt-8: Ordering / Sequencing */}
          {typeDef.key === "ordering" && (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sequential Priority Ordering
              </div>
              {(() => {
                const rawSteps: string[] = Array.isArray(parsedStructured.steps)
                  ? parsedStructured.steps
                  : Array.isArray(parsedStructured.items)
                  ? parsedStructured.items.map((x: any) => (typeof x === "string" ? x : x.text || ""))
                  : [];
                const currentOrder: string[] =
                  effectiveStructuredResponse.orderedSteps || rawSteps;

                const moveStep = (fromIdx: number, direction: -1 | 1) => {
                  const toIdx = fromIdx + direction;
                  if (toIdx < 0 || toIdx >= currentOrder.length) return;
                  const next = [...currentOrder];
                  const [moved] = next.splice(fromIdx, 1);
                  next.splice(toIdx, 0, moved);
                  updateStructuredResponse({ orderedSteps: next });
                };

                return (
                  <div className="space-y-2">
                    {currentOrder.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3 text-xs sm:text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <Badge className="font-mono">{idx + 1}</Badge>
                          <span>{step}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            disabled={idx === 0}
                            onClick={() => moveStep(idx, -1)}
                            aria-label={`Move step ${idx + 1} up`}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            disabled={idx === currentOrder.length - 1}
                            onClick={() => moveStep(idx, 1)}
                            aria-label={`Move step ${idx + 1} down`}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* qt-9: NGN Unfolding Case Study (6-Item) */}
          {typeDef.key === "case-study" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Unfolding NGN 6-Item Clinical Judgment Case Study
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {(Array.isArray(parsedStructured.cjmmItems) ? parsedStructured.cjmmItems : []).length} Linked CJMM Items
                </Badge>
              </div>
              <div className="space-y-3">
                {(Array.isArray(parsedStructured.cjmmItems) ? parsedStructured.cjmmItems : []).map(
                  (sub: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-border bg-muted/15 p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          Item {sub.itemNumber || idx + 1}: {sub.cjmmStep || "Clinical Judgment"}
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm font-medium">{sub.stem}</p>
                      {Array.isArray(sub.options) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {sub.options.map((optText: string, oIdx: number) => {
                            const isSubCorrect =
                              Array.isArray(sub.correctAnswers) &&
                              sub.correctAnswers.includes(optText);
                            return (
                              <div
                                key={oIdx}
                                className={`rounded border p-2 text-xs flex items-center justify-between ${
                                  showAnswerKey && isSubCorrect
                                    ? "border-emerald-500/50 bg-emerald-500/10 font-semibold"
                                    : "border-border bg-background"
                                }`}
                              >
                                <span>{optText}</span>
                                {showAnswerKey && isSubCorrect && (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* qt-10: Essay / Free-Text Clinical Note */}
          {typeDef.key === "essay" && (
            <div className="space-y-3">
              <Label htmlFor="essay-response-input" className="text-xs font-semibold">
                Clinical Nursing Note / Extended Response
              </Label>
              <textarea
                id="essay-response-input"
                rows={5}
                value={effectiveStructuredResponse.essayText || ""}
                onChange={(e) => updateStructuredResponse({ essayText: e.target.value })}
                placeholder="Enter structured SBAR or clinical reasoning response..."
                className="w-full rounded-lg border border-input bg-background p-3 text-sm"
              />
              {showAnswerKey && Array.isArray(parsedStructured.rubricCriteria) && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1.5">
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Evaluation Rubric Criteria ({parsedStructured.minWords || 40}–{parsedStructured.maxWords || 300} words):
                  </div>
                  <ul className="list-disc pl-5 text-xs space-y-1">
                    {parsedStructured.rubricCriteria.map((crit: string, idx: number) => (
                      <li key={idx}>{crit}</li>
                    ))}
                  </ul>
                  {parsedStructured.sampleResponse && (
                    <p className="text-xs italic pt-1 text-muted-foreground">
                      Exemplar: {parsedStructured.sampleResponse}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* qt-11: Matching */}
          {typeDef.key === "matching" && (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Clinical Concept-to-Intervention Matching
              </div>
              <div className="space-y-2">
                {(Array.isArray(parsedStructured.pairs) ? parsedStructured.pairs : []).map(
                  (pair: any, idx: number) => (
                    <div
                      key={pair.id || idx}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center rounded-lg border border-border bg-muted/20 p-3 text-xs sm:text-sm"
                    >
                      <div className="font-semibold">{pair.term || pair.leftPrompt}</div>
                      <div className="rounded border border-emerald-500/30 bg-background p-2 text-xs">
                        {showAnswerKey
                          ? pair.definition || pair.rightMatch
                          : effectiveStructuredResponse[`match_${idx}`] || "Select matching clinical item..."}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* qt-12: Fill-in-the-Blank / Cloze Drop-Down */}
          {typeDef.key === "fill-blank" && (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cloze / Fill-in-the-Blank Clinical Completion
              </div>
              {parsedStructured.templateText && (
                <div className="rounded-lg border border-border bg-muted/20 p-3.5 text-sm leading-relaxed">
                  {parsedStructured.templateText}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Array.isArray(parsedStructured.blanks) ? parsedStructured.blanks : []).map(
                  (blank: any, idx: number) => (
                    <div key={blank.id || idx} className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        {blank.label || `Blank ${idx + 1}`}
                      </Label>
                      {Array.isArray(blank.dropdownOptions) && blank.dropdownOptions.length > 0 ? (
                        <select
                          aria-label={blank.label || `Blank ${idx + 1}`}
                          value={effectiveStructuredResponse[blank.id || `blank_${idx}`] || ""}
                          onChange={(e) =>
                            updateStructuredResponse({
                              [blank.id || `blank_${idx}`]: e.target.value,
                            })
                          }
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                        >
                          <option value="">Select response...</option>
                          {blank.dropdownOptions.map((opt: string, oIdx: number) => (
                            <option key={oIdx} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={effectiveStructuredResponse[blank.id || `blank_${idx}`] || ""}
                          onChange={(e) =>
                            updateStructuredResponse({
                              [blank.id || `blank_${idx}`]: e.target.value,
                            })
                          }
                          placeholder="Enter clinical term..."
                        />
                      )}
                      {showAnswerKey && Array.isArray(blank.acceptedAnswers) && (
                        <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                          Accepted Key: {blank.acceptedAnswers.join(" | ")}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* qt-13: Matrix / Grid Multiple Response */}
          {typeDef.key === "matrix" && (
            <div className="space-y-3 overflow-x-auto">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Clinical Evaluation Matrix Grid
              </div>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="p-2.5 text-left font-semibold">Clinical Finding</th>
                    {(Array.isArray(parsedStructured.columns) ? parsedStructured.columns : []).map(
                      (col: string, cIdx: number) => (
                        <th key={cIdx} className="p-2.5 text-center font-semibold">
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(parsedStructured.rows) ? parsedStructured.rows : []).map(
                    (row: string, rIdx: number) => (
                      <tr key={rIdx} className="border-b border-border">
                        <td className="p-2.5 font-medium">{row}</td>
                        {(Array.isArray(parsedStructured.columns)
                          ? parsedStructured.columns
                          : []
                        ).map((_: string, cIdx: number) => {
                          const cellKey = `${rIdx}:${cIdx}`;
                          const isKeyCorrect =
                            Array.isArray(parsedStructured.correctCells) &&
                            parsedStructured.correctCells.includes(cellKey);
                          const selectedCells: string[] =
                            effectiveStructuredResponse.selectedCells || [];
                          const isCellChecked = selectedCells.includes(cellKey);

                          return (
                            <td key={cIdx} className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                aria-label={`${row} - column ${cIdx + 1}`}
                                checked={showAnswerKey ? isKeyCorrect || isCellChecked : isCellChecked}
                                onChange={() => {
                                  const next = isCellChecked
                                    ? selectedCells.filter((k) => k !== cellKey)
                                    : [...selectedCells, cellKey];
                                  updateStructuredResponse({ selectedCells: next });
                                }}
                                className="h-4 w-4 accent-emerald-600"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* qt-14: Numeric / Dosage Calculation */}
          {typeDef.key === "numeric" && (
            <div className="space-y-3">
              <Label htmlFor="numeric-calc-input" className="text-xs font-semibold">
                Dosage / Clinical Calculation Entry ({parsedStructured.unit || "units"})
              </Label>
              <div className="flex items-center gap-3 max-w-md">
                <Input
                  id="numeric-calc-input"
                  type="number"
                  step="any"
                  value={effectiveStructuredResponse.numericValue ?? ""}
                  onChange={(e) =>
                    updateStructuredResponse({ numericValue: e.target.value })
                  }
                  placeholder="Enter calculated value..."
                />
                <Badge variant="secondary" className="text-xs font-mono shrink-0">
                  {parsedStructured.unit || "mL/hr"}
                </Badge>
              </div>
              {showAnswerKey && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs space-y-1">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300">
                    Correct Key: {parsedStructured.correctValue} {parsedStructured.unit || ""}{" "}
                    (Tolerance: +/- {parsedStructured.tolerance ?? 0})
                  </div>
                  {parsedStructured.formulaHint && (
                    <div className="text-muted-foreground font-mono">
                      Formula: {parsedStructured.formulaHint}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* qt-16: Tabular Review */}
          {typeDef.key === "tabular" && (
            <div className="space-y-3 overflow-x-auto">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {parsedStructured.tableTitle || "Chart / Exhibit Tabular Classification"}
              </div>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="p-2.5 text-left font-semibold">Intervention / Finding</th>
                    <th className="p-2.5 text-left font-semibold">Clinical Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(parsedStructured.findings) ? parsedStructured.findings : []).map(
                    (f: any, idx: number) => (
                      <tr key={idx} className="border-b border-border">
                        <td className="p-2.5 font-medium">{f.finding}</td>
                        <td className="p-2.5">
                          {showAnswerKey ? (
                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                              {f.classification}
                            </Badge>
                          ) : (
                            <select
                              aria-label={`Classification for ${f.finding}`}
                              value={effectiveStructuredResponse[`tab_${idx}`] || ""}
                              onChange={(e) =>
                                updateStructuredResponse({ [`tab_${idx}`]: e.target.value })
                              }
                              className="h-8 rounded border border-input bg-background px-2 text-xs"
                            >
                              <option value="">Select classification...</option>
                              <option value="Indicated">Indicated</option>
                              <option value="Contraindicated">Contraindicated</option>
                              <option value="Non-Essential">Non-Essential</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* qt-17: Short-Answer Response */}
          {typeDef.key === "short-answer" && (
            <div className="space-y-3">
              <Label htmlFor="short-answer-input" className="text-xs font-semibold">
                Concise Focused Clinical Response (Max {parsedStructured.maxCharacters || 250} chars)
              </Label>
              <Input
                id="short-answer-input"
                maxLength={parsedStructured.maxCharacters || 250}
                value={effectiveStructuredResponse.shortAnswerText || ""}
                onChange={(e) =>
                  updateStructuredResponse({ shortAnswerText: e.target.value })
                }
                placeholder="Type concise clinical response..."
              />
              {showAnswerKey && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs space-y-1">
                  {Array.isArray(parsedStructured.acceptedKeywords) && (
                    <div className="font-semibold text-emerald-800 dark:text-emerald-300">
                      Accepted Key Phrases: {parsedStructured.acceptedKeywords.join(", ")}
                    </div>
                  )}
                  {parsedStructured.sampleAnswer && (
                    <div className="text-muted-foreground">
                      Exemplar: {parsedStructured.sampleAnswer}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* qt-18: Dynamic Lab / Bowtie / Highlight */}
          {typeDef.key === "dynamic-lab" && (
            <div className="space-y-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dynamic Laboratory Panel & NGN Bowtie Clinical Reasoning
              </div>
              {Array.isArray(parsedStructured.labValues) && parsedStructured.labValues.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr>
                        <th className="p-2 text-left">Parameter</th>
                        <th className="p-2 text-left">Client Value</th>
                        <th className="p-2 text-left">Reference Range</th>
                        <th className="p-2 text-left">Clinical Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedStructured.labValues.map((lv: any, idx: number) => (
                        <tr key={idx} className="border-b border-border">
                          <td className="p-2 font-medium">{lv.parameter}</td>
                          <td className="p-2 font-mono font-bold text-rose-600 dark:text-rose-400">
                            {lv.value}
                          </td>
                          <td className="p-2 font-mono text-muted-foreground">
                            {lv.referenceRange}
                          </td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-[10px]">
                              {lv.flag}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
                  <div className="text-xs font-bold">Actions to Take (2)</div>
                  {(Array.isArray(parsedStructured.correctActions)
                    ? parsedStructured.correctActions
                    : []
                  ).map((act: string, idx: number) => (
                    <div key={idx} className="text-xs rounded bg-background p-2 border border-border">
                      {act}
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3 flex flex-col justify-center items-center text-center space-y-1">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">
                    Potential Condition
                  </div>
                  <div className="text-sm font-bold text-primary">
                    {parsedStructured.correctCondition || "Acute Clinical Condition"}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
                  <div className="text-xs font-bold">Parameters to Monitor (2)</div>
                  {(Array.isArray(parsedStructured.correctParameters)
                    ? parsedStructured.correctParameters
                    : []
                  ).map((param: string, idx: number) => (
                    <div key={idx} className="text-xs rounded bg-background p-2 border border-border">
                      {param}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overall Clinical Rationale */}
      {showAnswerKey && overallRationale && (
        <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-800/50 bg-teal-50/40 dark:bg-teal-950/20 space-y-1.5">
          <h4 className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Authoritative Clinical Rationale (Educator / Reviewer Verification)
          </h4>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {overallRationale}
          </p>
        </div>
      )}
    </div>
  );
}
