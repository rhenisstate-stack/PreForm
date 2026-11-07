"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  Code2,
  FileSpreadsheet,
} from "lucide-react";
import {
  getQuestionTypeDefinition,
  getDefaultStructuredContent,
  parseExhibitsJson,
  type ClinicalExhibitTab,
} from "@/lib/question-types";

export interface EditableQuestionOption {
  id?: string;
  optionKey: string;
  content: string;
  isCorrect: boolean;
  rationale: string;
  distractorRationale: string;
  mediaUrl: string;
}

export interface QuestionTypeEditorProps {
  questionTypeKey: string;
  options: EditableQuestionOption[];
  onOptionsChange: (options: EditableQuestionOption[]) => void;
  structuredContentJson: string;
  onStructuredContentJsonChange: (json: string) => void;
  exhibitsJson: string;
  onExhibitsJsonChange: (json: string) => void;
  validationErrors?: Record<string, string>;
}

export function QuestionTypeEditor({
  questionTypeKey,
  options,
  onOptionsChange,
  structuredContentJson,
  onStructuredContentJsonChange,
  exhibitsJson,
  onExhibitsJsonChange,
  validationErrors = {},
}: QuestionTypeEditorProps) {
  const typeDef = getQuestionTypeDefinition(questionTypeKey);
  const [showRawJson, setShowRawJson] = React.useState(false);

  // Ensure True/False questions default to 2 options ("True" / "False")
  React.useEffect(() => {
    if (typeDef.key === "true-false" && options.length !== 2) {
      onOptionsChange([
        {
          optionKey: "A",
          content: options[0]?.content?.trim() || "True",
          isCorrect: options[0]?.isCorrect ?? true,
          rationale: options[0]?.rationale || "",
          distractorRationale: options[0]?.distractorRationale || "",
          mediaUrl: options[0]?.mediaUrl || "",
        },
        {
          optionKey: "B",
          content: options[1]?.content?.trim() || "False",
          isCorrect: options[0]?.isCorrect ? false : (options[1]?.isCorrect ?? false),
          rationale: options[1]?.rationale || "",
          distractorRationale: options[1]?.distractorRationale || "",
          mediaUrl: options[1]?.mediaUrl || "",
        },
      ]);
    }
  }, [typeDef.key]);

  // Parse structured content safely while preserving unknown keys
  const parsedStructured = React.useMemo<Record<string, any>>(() => {
    if (structuredContentJson && structuredContentJson.trim()) {
      try {
        const parsed = JSON.parse(structuredContentJson);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      } catch {
        // Return fallback while user edits raw JSON
      }
    }
    return getDefaultStructuredContent(typeDef.key);
  }, [structuredContentJson, typeDef.key]);

  const updateStructuredField = (patch: Record<string, any>) => {
    const base = { ...parsedStructured, ...patch };
    onStructuredContentJsonChange(JSON.stringify(base, null, 2));
  };

  // Exhibits JSON helper
  const exhibitTabs = React.useMemo<ClinicalExhibitTab[]>(
    () => parseExhibitsJson(exhibitsJson),
    [exhibitsJson]
  );

  const handleAddExhibitTab = () => {
    const next: ClinicalExhibitTab[] = [
      ...exhibitTabs,
      {
        id: `exhibit-${exhibitTabs.length + 1}`,
        title:
          exhibitTabs.length === 0
            ? "Nurses' Notes"
            : exhibitTabs.length === 1
            ? "Vital Signs"
            : exhibitTabs.length === 2
            ? "Laboratory Results"
            : `Exhibit ${exhibitTabs.length + 1}`,
        content: "0800: Client alert and oriented x4. Vital signs stable.",
      },
    ];
    onExhibitsJsonChange(JSON.stringify(next, null, 2));
  };

  const handleUpdateExhibitTab = (
    idx: number,
    field: keyof ClinicalExhibitTab,
    value: string
  ) => {
    const next = [...exhibitTabs];
    next[idx] = { ...next[idx], [field]: value };
    onExhibitsJsonChange(JSON.stringify(next, null, 2));
  };

  const handleRemoveExhibitTab = (idx: number) => {
    const next = exhibitTabs.filter((_, i) => i !== idx);
    onExhibitsJsonChange(next.length > 0 ? JSON.stringify(next, null, 2) : "");
  };

  const handleAddOption = () => {
    if (typeDef.key === "true-false") return;
    const nextKey = String.fromCharCode(65 + options.length);
    onOptionsChange([
      ...options,
      {
        optionKey: nextKey,
        content: "",
        isCorrect: false,
        rationale: "",
        distractorRationale: "",
        mediaUrl: "",
      },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    if (typeDef.key === "true-false" || options.length <= 2) return;
    const updated = options
      .filter((_, i) => i !== index)
      .map((o, idx) => ({
        ...o,
        optionKey: String.fromCharCode(65 + idx),
      }));
    onOptionsChange(updated);
  };

  const handleOptionFieldChange = (
    index: number,
    field: keyof EditableQuestionOption,
    value: any
  ) => {
    if (field === "isCorrect" && value === true && typeDef.requiresSingleCorrectOption) {
      const updated = options.map((opt, idx) => ({
        ...opt,
        isCorrect: idx === index,
      }));
      onOptionsChange(updated);
      return;
    }
    const updated = [...options];
    updated[index] = { ...updated[index], [field]: value };
    onOptionsChange(updated);
  };

  return (
    <div
      data-testid={`question-type-editor-${typeDef.key}`}
      className="space-y-6"
    >
      {/* Clinical Exhibits (EHR Tabs) Section — Preserves & Edits ExhibitsJson */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Clinical Exhibits / EHR Chart Tabs (Optional)
            </h3>
            <p className="text-xs text-muted-foreground">
              Configure tabbed Nurses&apos; Notes, Vital Signs, Lab Results, or Diagnostic Orders (`exhibitsJson`).
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAddExhibitTab}
            data-testid="add-exhibit-tab-btn"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add EHR Exhibit Tab
          </Button>
        </div>

        {validationErrors.exhibitsJson && (
          <p className="text-xs font-medium text-destructive">
            {validationErrors.exhibitsJson}
          </p>
        )}

        {exhibitTabs.length > 0 && (
          <div className="space-y-3 pt-2">
            {exhibitTabs.map((tab, idx) => (
              <div
                key={tab.id || idx}
                className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <Input
                    aria-label={`Exhibit ${idx + 1} Title`}
                    value={tab.title}
                    onChange={(e) =>
                      handleUpdateExhibitTab(idx, "title", e.target.value)
                    }
                    placeholder="Tab Title (e.g., Nurses' Notes, Vital Signs)"
                    className="h-8 text-xs font-semibold max-w-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveExhibitTab(idx)}
                    className="h-7 text-xs text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Remove Tab
                  </Button>
                </div>
                <textarea
                  aria-label={`Exhibit ${idx + 1} Content`}
                  rows={2}
                  value={tab.content}
                  onChange={(e) =>
                    handleUpdateExhibitTab(idx, "content", e.target.value)
                  }
                  placeholder="Enter timestamped clinical findings or lab values..."
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs font-mono"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Type-Specific Configuration Card */}
      {typeDef.isOptionBased ? (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                {typeDef.label} — Answer Options & Scoring Key
              </h2>
              <p className="text-xs text-muted-foreground">
                {typeDef.key === "true-false"
                  ? "Binary True / False clinical verification (2 options required, 1 correct key)."
                  : typeDef.requiresSingleCorrectOption
                  ? "Single-keyed response: mark exactly one option as the correct answer."
                  : "Multi-select response: mark one or more options as correct."}
              </p>
            </div>
            {typeDef.key !== "true-false" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddOption}
                data-testid="add-option-btn"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Option
              </Button>
            )}
          </div>

          {(validationErrors.options || validationErrors.correctAnswer) && (
            <div
              data-testid="option-validation-error"
              className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs font-medium text-destructive"
            >
              {validationErrors.options || validationErrors.correctAnswer}
            </div>
          )}

          <div className="space-y-3">
            {options.map((opt, idx) => (
              <div
                key={idx}
                className={`rounded-xl border p-4 space-y-3 transition-colors ${
                  opt.isCorrect
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-border bg-muted/20"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                      <input
                        type={typeDef.requiresSingleCorrectOption ? "radio" : "checkbox"}
                        name="correct-option-key"
                        aria-label={`Mark Option ${opt.optionKey} Correct`}
                        checked={opt.isCorrect}
                        onChange={(e) =>
                          handleOptionFieldChange(idx, "isCorrect", e.target.checked)
                        }
                        className="h-4 w-4 rounded border-input accent-emerald-600"
                      />
                      <Badge
                        variant={opt.isCorrect ? "default" : "outline"}
                        className="font-mono"
                      >
                        Option {opt.optionKey}
                      </Badge>
                      {opt.isCorrect && (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Correct Key
                        </span>
                      )}
                    </label>
                  </div>

                  {typeDef.key !== "true-false" && options.length > 2 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveOption(idx)}
                      className="text-destructive hover:text-destructive h-7 px-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div>
                  <Input
                    aria-label={`Option ${opt.optionKey} Text`}
                    value={opt.content}
                    onChange={(e) =>
                      handleOptionFieldChange(idx, "content", e.target.value)
                    }
                    placeholder={`Enter Option ${opt.optionKey} text...`}
                    required={typeDef.isOptionBased}
                  />
                </div>

                {/* Media URL field for image-based / multiple-image (and available for any option with visual exhibit) */}
                {(typeDef.supportsMediaOptions || Boolean(opt.mediaUrl)) && (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <ImageIcon className="h-3 w-3 text-primary" />
                      Option {opt.optionKey} Clinical Image / Exhibit URL
                    </Label>
                    <Input
                      aria-label={`Option ${opt.optionKey} Image URL`}
                      value={opt.mediaUrl}
                      onChange={(e) =>
                        handleOptionFieldChange(idx, "mediaUrl", e.target.value)
                      }
                      placeholder="https://cdn.prepford.com/exhibits/ecg-lead-ii.png"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">
                      Option Rationale (Why Correct)
                    </Label>
                    <Input
                      aria-label={`Option ${opt.optionKey} Rationale`}
                      value={opt.rationale}
                      onChange={(e) =>
                        handleOptionFieldChange(idx, "rationale", e.target.value)
                      }
                      placeholder="Explain why this option is clinically accurate..."
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">
                      Distractor Analysis (Why Incorrect)
                    </Label>
                    <Input
                      aria-label={`Option ${opt.optionKey} Distractor Rationale`}
                      value={opt.distractorRationale}
                      onChange={(e) =>
                        handleOptionFieldChange(
                          idx,
                          "distractorRationale",
                          e.target.value
                        )
                      }
                      placeholder="Explain clinical misconception if chosen..."
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                {typeDef.label} — Type-Specific Configuration
              </h2>
              <p className="text-xs text-muted-foreground">{typeDef.description}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowRawJson((prev) => !prev)}
              data-testid="toggle-raw-json-btn"
            >
              <Code2 className="h-3.5 w-3.5 mr-1.5" />
              {showRawJson ? "Hide Raw JSON" : "Inspect JSON"}
            </Button>
          </div>

          {validationErrors.structuredContentJson && (
            <div
              data-testid="structured-validation-error"
              className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs font-medium text-destructive"
            >
              {validationErrors.structuredContentJson}
            </div>
          )}

          {/* qt-7: Drag and Drop Builder */}
          {typeDef.key === "drag-drop" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="dd-categories-input" className="text-xs font-semibold">
                  Target Categories (comma-separated)
                </Label>
                <Input
                  id="dd-categories-input"
                  value={
                    Array.isArray(parsedStructured.categories)
                      ? parsedStructured.categories.join(", ")
                      : "Priority Intervention, Routine Monitoring"
                  }
                  onChange={(e) =>
                    updateStructuredField({
                      categories: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Draggable Clinical Items</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const items = Array.isArray(parsedStructured.items)
                        ? [...parsedStructured.items]
                        : [];
                      items.push({
                        id: `dd-${items.length + 1}`,
                        text: "",
                        targetCategory:
                          parsedStructured.categories?.[0] || "Priority Intervention",
                      });
                      updateStructuredField({ items });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Draggable Item
                  </Button>
                </div>
                {(Array.isArray(parsedStructured.items) ? parsedStructured.items : []).map(
                  (item: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-7">
                        <Input
                          aria-label={`Draggable Item ${idx + 1} Text`}
                          value={typeof item === "string" ? item : item.text || ""}
                          onChange={(e) => {
                            const items = [...(parsedStructured.items || [])];
                            items[idx] =
                              typeof item === "string"
                                ? { id: `dd-${idx + 1}`, text: e.target.value }
                                : { ...item, text: e.target.value };
                            updateStructuredField({ items });
                          }}
                          placeholder="Clinical item text..."
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <Input
                          aria-label={`Draggable Item ${idx + 1} Target Category`}
                          value={typeof item === "object" ? item.targetCategory || "" : ""}
                          onChange={(e) => {
                            const items = [...(parsedStructured.items || [])];
                            items[idx] = {
                              ...(typeof item === "object" ? item : { text: item }),
                              targetCategory: e.target.value,
                            };
                            updateStructuredField({ items });
                          }}
                          placeholder="Target category..."
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            const items = (parsedStructured.items || []).filter(
                              (_: any, i: number) => i !== idx
                            );
                            updateStructuredField({ items });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* qt-8: Ordering / Sequencing Builder */}
          {typeDef.key === "ordering" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Sequential Priority Steps (in authoritative correct order)
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const steps = Array.isArray(parsedStructured.steps)
                      ? [...parsedStructured.steps, ""]
                      : ["Step 1", "Step 2"];
                    updateStructuredField({
                      steps,
                      correctOrder: steps.map((_: any, i: number) => i),
                    });
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Sequence Step
                </Button>
              </div>
              {(Array.isArray(parsedStructured.steps) ? parsedStructured.steps : []).map(
                (step: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono shrink-0">
                      Step {idx + 1}
                    </Badge>
                    <Input
                      aria-label={`Sequence Step ${idx + 1}`}
                      value={step}
                      onChange={(e) => {
                        const steps = [...(parsedStructured.steps || [])];
                        steps[idx] = e.target.value;
                        updateStructuredField({ steps });
                      }}
                      placeholder={`Enter clinical step ${idx + 1}...`}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        const steps = (parsedStructured.steps || []).filter(
                          (_: any, i: number) => i !== idx
                        );
                        updateStructuredField({
                          steps,
                          correctOrder: steps.map((_: any, i: number) => i),
                        });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                )
              )}
            </div>
          )}

          {/* qt-9: NGN Unfolding Case Study (6-Item) Builder */}
          {typeDef.key === "case-study" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cs-title-input" className="text-xs font-semibold">
                  Unfolding Case Study Title
                </Label>
                <Input
                  id="cs-title-input"
                  value={parsedStructured.scenarioTitle || ""}
                  onChange={(e) =>
                    updateStructuredField({ scenarioTitle: e.target.value })
                  }
                  placeholder="e.g., Acute Postoperative Hemorrhage & Shock"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-semibold">
                  6 Linked NCSBN Clinical Judgment Measurement Model (CJMM) Items
                </Label>
                {(Array.isArray(parsedStructured.cjmmItems)
                  ? parsedStructured.cjmmItems
                  : []
                ).map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono text-xs">
                        Item {idx + 1}: {item.cjmmStep || `Step ${idx + 1}`}
                      </Badge>
                    </div>
                    <Input
                      aria-label={`Case Study Item ${idx + 1} Stem`}
                      value={item.stem || ""}
                      onChange={(e) => {
                        const cjmmItems = [...(parsedStructured.cjmmItems || [])];
                        cjmmItems[idx] = { ...item, stem: e.target.value };
                        updateStructuredField({ cjmmItems });
                      }}
                      placeholder={`Enter Item ${idx + 1} prompt...`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* qt-10: Essay Builder */}
          {typeDef.key === "essay" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="essay-min-words" className="text-xs font-semibold">
                    Minimum Word Count
                  </Label>
                  <Input
                    id="essay-min-words"
                    type="number"
                    value={parsedStructured.minWords ?? 40}
                    onChange={(e) =>
                      updateStructuredField({ minWords: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="essay-max-words" className="text-xs font-semibold">
                    Maximum Word Count
                  </Label>
                  <Input
                    id="essay-max-words"
                    type="number"
                    value={parsedStructured.maxWords ?? 300}
                    onChange={(e) =>
                      updateStructuredField({ maxWords: Number(e.target.value) || 300 })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="essay-sample-response" className="text-xs font-semibold">
                  Exemplar Clinical Response / SBAR Note
                </Label>
                <textarea
                  id="essay-sample-response"
                  rows={3}
                  value={parsedStructured.sampleResponse || ""}
                  onChange={(e) =>
                    updateStructuredField({ sampleResponse: e.target.value })
                  }
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs"
                />
              </div>
            </div>
          )}

          {/* qt-11: Matching Builder */}
          {typeDef.key === "matching" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Term-to-Definition Clinical Pairs
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const pairs = Array.isArray(parsedStructured.pairs)
                      ? [...parsedStructured.pairs]
                      : [];
                    pairs.push({
                      id: `m-${pairs.length + 1}`,
                      term: "",
                      definition: "",
                    });
                    updateStructuredField({ pairs });
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Matching Pair
                </Button>
              </div>
              {(Array.isArray(parsedStructured.pairs) ? parsedStructured.pairs : []).map(
                (pair: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-5">
                      <Input
                        aria-label={`Matching Pair ${idx + 1} Term`}
                        value={pair.term || ""}
                        onChange={(e) => {
                          const pairs = [...(parsedStructured.pairs || [])];
                          pairs[idx] = { ...pair, term: e.target.value };
                          updateStructuredField({ pairs });
                        }}
                        placeholder="Clinical term / medication..."
                      />
                    </div>
                    <div className="sm:col-span-6">
                      <Input
                        aria-label={`Matching Pair ${idx + 1} Definition`}
                        value={pair.definition || ""}
                        onChange={(e) => {
                          const pairs = [...(parsedStructured.pairs || [])];
                          pairs[idx] = { ...pair, definition: e.target.value };
                          updateStructuredField({ pairs });
                        }}
                        placeholder="Matching mechanism / intervention..."
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const pairs = (parsedStructured.pairs || []).filter(
                            (_: any, i: number) => i !== idx
                          );
                          updateStructuredField({ pairs });
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* qt-12: Fill-in-the-Blank / Cloze Builder */}
          {typeDef.key === "fill-blank" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cloze-template-input" className="text-xs font-semibold">
                  Cloze Template Sentence (use {"{{blank_1}}"} tokens)
                </Label>
                <textarea
                  id="cloze-template-input"
                  rows={2}
                  value={parsedStructured.templateText || ""}
                  onChange={(e) =>
                    updateStructuredField({ templateText: e.target.value })
                  }
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Blank Answer Keys</Label>
                {(Array.isArray(parsedStructured.blanks) ? parsedStructured.blanks : []).map(
                  (blank: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        aria-label={`Blank ${idx + 1} Accepted Answers`}
                        value={
                          Array.isArray(blank.acceptedAnswers)
                            ? blank.acceptedAnswers.join(", ")
                            : ""
                        }
                        onChange={(e) => {
                          const blanks = [...(parsedStructured.blanks || [])];
                          blanks[idx] = {
                            ...blank,
                            acceptedAnswers: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          };
                          updateStructuredField({ blanks });
                        }}
                        placeholder="Accepted answer(s), comma-separated"
                      />
                      <Input
                        aria-label={`Blank ${idx + 1} Dropdown Options`}
                        value={
                          Array.isArray(blank.dropdownOptions)
                            ? blank.dropdownOptions.join(", ")
                            : ""
                        }
                        onChange={(e) => {
                          const blanks = [...(parsedStructured.blanks || [])];
                          blanks[idx] = {
                            ...blank,
                            dropdownOptions: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          };
                          updateStructuredField({ blanks });
                        }}
                        placeholder="Dropdown options, comma-separated"
                      />
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* qt-13: Matrix / Grid Multiple Response Builder */}
          {typeDef.key === "matrix" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="matrix-rows-input" className="text-xs font-semibold">
                    Matrix Rows (comma-separated findings)
                  </Label>
                  <Input
                    id="matrix-rows-input"
                    value={
                      Array.isArray(parsedStructured.rows)
                        ? parsedStructured.rows.join(", ")
                        : ""
                    }
                    onChange={(e) =>
                      updateStructuredField({
                        rows: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="matrix-cols-input" className="text-xs font-semibold">
                    Matrix Columns (comma-separated conditions)
                  </Label>
                  <Input
                    id="matrix-cols-input"
                    value={
                      Array.isArray(parsedStructured.columns)
                        ? parsedStructured.columns.join(", ")
                        : ""
                    }
                    onChange={(e) =>
                      updateStructuredField({
                        columns: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
              </div>

              {/* Interactive Answer Key Grid */}
              {Array.isArray(parsedStructured.rows) &&
                Array.isArray(parsedStructured.columns) && (
                  <div className="overflow-x-auto rounded-lg border border-border p-3">
                    <div className="text-xs font-semibold mb-2">
                      Click cells to toggle Correct Matrix Answer Key:
                    </div>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="p-2 text-left">Finding Row</th>
                          {parsedStructured.columns.map((col: string, cIdx: number) => (
                            <th key={cIdx} className="p-2 text-center">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedStructured.rows.map((row: string, rIdx: number) => (
                          <tr key={rIdx} className="border-b border-border">
                            <td className="p-2 font-medium">{row}</td>
                            {parsedStructured.columns.map((_: string, cIdx: number) => {
                              const cellKey = `${rIdx}:${cIdx}`;
                              const currentCells: string[] = Array.isArray(
                                parsedStructured.correctCells
                              )
                                ? parsedStructured.correctCells
                                : [];
                              const checked = currentCells.includes(cellKey);
                              return (
                                <td key={cIdx} className="p-2 text-center">
                                  <input
                                    type="checkbox"
                                    aria-label={`Matrix Key ${row} - ${cIdx}`}
                                    checked={checked}
                                    onChange={() => {
                                      const next = checked
                                        ? currentCells.filter((c) => c !== cellKey)
                                        : [...currentCells, cellKey];
                                      updateStructuredField({ correctCells: next });
                                    }}
                                    className="h-4 w-4 accent-emerald-600"
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          )}

          {/* qt-14: Numeric / Dosage Calculation Builder */}
          {typeDef.key === "numeric" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="numeric-target-value" className="text-xs font-semibold">
                  Target Numeric Value
                </Label>
                <Input
                  id="numeric-target-value"
                  type="number"
                  step="any"
                  value={parsedStructured.correctValue ?? 0}
                  onChange={(e) =>
                    updateStructuredField({
                      correctValue: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="numeric-tolerance" className="text-xs font-semibold">
                  Acceptable Tolerance (+/-)
                </Label>
                <Input
                  id="numeric-tolerance"
                  type="number"
                  step="any"
                  value={parsedStructured.tolerance ?? 0}
                  onChange={(e) =>
                    updateStructuredField({
                      tolerance: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="numeric-unit" className="text-xs font-semibold">
                  Measurement Unit
                </Label>
                <Input
                  id="numeric-unit"
                  value={parsedStructured.unit || ""}
                  onChange={(e) => updateStructuredField({ unit: e.target.value })}
                  placeholder="e.g., mL/hr, mg, mcg/kg/min"
                />
              </div>
              <div className="sm:col-span-3">
                <Label htmlFor="numeric-formula-hint" className="text-xs font-semibold">
                  Calculation Formula Walkthrough
                </Label>
                <Input
                  id="numeric-formula-hint"
                  value={parsedStructured.formulaHint || ""}
                  onChange={(e) =>
                    updateStructuredField({ formulaHint: e.target.value })
                  }
                  placeholder="e.g., Dose Ordered / Dose on Hand x Volume = mL"
                />
              </div>
            </div>
          )}

          {/* qt-16: Tabular Review Builder */}
          {typeDef.key === "tabular" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="tabular-title-input" className="text-xs font-semibold">
                  Clinical Table Title
                </Label>
                <Input
                  id="tabular-title-input"
                  value={parsedStructured.tableTitle || ""}
                  onChange={(e) =>
                    updateStructuredField({ tableTitle: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Tabular Findings & Classifications
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const findings = Array.isArray(parsedStructured.findings)
                        ? [...parsedStructured.findings]
                        : [];
                      findings.push({
                        finding: "",
                        classification: "Indicated",
                      });
                      updateStructuredField({ findings });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Finding Row
                  </Button>
                </div>
                {(Array.isArray(parsedStructured.findings)
                  ? parsedStructured.findings
                  : []
                ).map((f: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-8">
                      <Input
                        aria-label={`Tabular Finding ${idx + 1}`}
                        value={f.finding || ""}
                        onChange={(e) => {
                          const findings = [...(parsedStructured.findings || [])];
                          findings[idx] = { ...f, finding: e.target.value };
                          updateStructuredField({ findings });
                        }}
                        placeholder="Intervention or clinical finding..."
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <select
                        aria-label={`Tabular Classification ${idx + 1}`}
                        value={f.classification || "Indicated"}
                        onChange={(e) => {
                          const findings = [...(parsedStructured.findings || [])];
                          findings[idx] = { ...f, classification: e.target.value };
                          updateStructuredField({ findings });
                        }}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                      >
                        <option value="Indicated">Indicated</option>
                        <option value="Contraindicated">Contraindicated</option>
                        <option value="Non-Essential">Non-Essential</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* qt-17: Short-Answer Response Builder */}
          {typeDef.key === "short-answer" && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="sa-keywords-input" className="text-xs font-semibold">
                  Accepted Clinical Keywords / Phrases (comma-separated)
                </Label>
                <Input
                  id="sa-keywords-input"
                  value={
                    Array.isArray(parsedStructured.acceptedKeywords)
                      ? parsedStructured.acceptedKeywords.join(", ")
                      : ""
                  }
                  onChange={(e) =>
                    updateStructuredField({
                      acceptedKeywords: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="sa-sample-answer" className="text-xs font-semibold">
                  Exemplar Clinical Answer
                </Label>
                <Input
                  id="sa-sample-answer"
                  value={parsedStructured.sampleAnswer || ""}
                  onChange={(e) =>
                    updateStructuredField({ sampleAnswer: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {/* qt-18: Dynamic Lab / Bowtie / Highlight Builder */}
          {typeDef.key === "dynamic-lab" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="bowtie-condition-input" className="text-xs font-semibold">
                  Bowtie Center Target: Primary Potential Condition
                </Label>
                <Input
                  id="bowtie-condition-input"
                  value={parsedStructured.correctCondition || ""}
                  onChange={(e) =>
                    updateStructuredField({ correctCondition: e.target.value })
                  }
                  placeholder="e.g., Acute Hyperkalemia"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="bowtie-actions-input" className="text-xs font-semibold">
                    Correct Actions to Take (comma-separated)
                  </Label>
                  <Input
                    id="bowtie-actions-input"
                    value={
                      Array.isArray(parsedStructured.correctActions)
                        ? parsedStructured.correctActions.join(", ")
                        : ""
                    }
                    onChange={(e) =>
                      updateStructuredField({
                        correctActions: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="bowtie-params-input" className="text-xs font-semibold">
                    Correct Parameters to Monitor (comma-separated)
                  </Label>
                  <Input
                    id="bowtie-params-input"
                    value={
                      Array.isArray(parsedStructured.correctParameters)
                        ? parsedStructured.correctParameters.join(", ")
                        : ""
                    }
                    onChange={(e) =>
                      updateStructuredField({
                        correctParameters: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Synchronized Structured Content JSON Editor */}
          <div className={showRawJson ? "space-y-1.5 pt-2 border-t border-border" : "space-y-1.5"}>
            <Label htmlFor="structured-content-json-textarea" className="text-xs font-semibold">
              Structured Content Payload (`StructuredContentJson`)
            </Label>
            <textarea
              id="structured-content-json-textarea"
              data-testid="structured-content-json-textarea"
              rows={showRawJson ? 8 : 4}
              value={structuredContentJson}
              onChange={(e) => onStructuredContentJsonChange(e.target.value)}
              placeholder='{"prompt": "...", "items": [...], "correctOrder": [...]}'
              className="w-full rounded-lg border border-input bg-background p-3 text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      )}
    </div>
  );
}
