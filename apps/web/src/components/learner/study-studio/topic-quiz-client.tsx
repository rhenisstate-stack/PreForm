"use client";

import * as React from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  FileQuestion,
  Info,
  ListChecks,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CLINICAL_QUESTION_BANK,
  NCLEX_CLIENT_NEEDS,
  type ClinicalQuestionDefinition,
} from "@/lib/assessment-store";

/**
 * `/dashboard/study/quizzes` — quick unscored topic drills.
 *
 * These drills reuse the static PrepFort clinical question bank and are a
 * *complement* to the assessment engine: they never create learner attempts,
 * never affect the official performance trend, and every question shows its
 * clinical rationale immediately so the drill itself is the learning event.
 */

const QUESTIONS_PER_DRILL = 8;

function selectQuestions(domain: string): ClinicalQuestionDefinition[] {
  const bank =
    domain === "all" ? CLINICAL_QUESTION_BANK : CLINICAL_QUESTION_BANK.filter((q) => q.domain === domain);
  return bank.slice(0, QUESTIONS_PER_DRILL);
}

function isAnswerCorrect(
  question: ClinicalQuestionDefinition,
  selection: number | null | number[]
): boolean {
  if (question.questionType === "multi_select") {
    const chosen = Array.isArray(selection) ? selection : [];
    const key = question.correctAnswerIndices ?? [];
    return chosen.length === key.length && key.every((k) => chosen.includes(k));
  }
  return typeof selection === "number" && selection === question.correctAnswerIndex;
}

export function TopicQuizClient() {
  // "all" | one of NCLEX_CLIENT_NEEDS
  const [domain, setDomain] = React.useState<string>("all");
  const [drill, setDrill] = React.useState<ClinicalQuestionDefinition[] | null>(null);
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [singleSelection, setSingleSelection] = React.useState<number | null>(null);
  const [multiSelection, setMultiSelection] = React.useState<number[]>([]);
  const [checked, setChecked] = React.useState(false);
  const [answers, setAnswers] = React.useState<Record<number, boolean>>({});

  const startDrill = (selectedDomain: string) => {
    const questions = selectQuestions(selectedDomain);
    if (questions.length === 0) return;
    setDrill(questions);
    setQuestionIndex(0);
    setSingleSelection(null);
    setMultiSelection([]);
    setChecked(false);
    setAnswers({});
  };

  const currentQuestion = drill?.[questionIndex] ?? null;
  const currentSelection = currentQuestion?.questionType === "multi_select" ? multiSelection : singleSelection;

  const checkAnswer = () => {
    if (!currentQuestion || checked) return;
    const correct = isAnswerCorrect(currentQuestion, currentSelection);
    setAnswers((prev) => ({ ...prev, [questionIndex]: correct }));
    setChecked(true);
  };

  const nextQuestion = () => {
    if (!drill) return;
    setQuestionIndex((idx) => Math.min(idx + 1, drill.length));
    setSingleSelection(null);
    setMultiSelection([]);
    setChecked(false);
  };

  const finishDrill = () => {
    setDrill(null);
    setQuestionIndex(0);
    setChecked(false);
    setAnswers({});
  };

  const correctCount = Object.values(answers).filter(Boolean).length;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
            <FileQuestion className="h-3.5 w-3.5" />
            <span>Topic Quizzes</span>
          </span>
          <Badge variant="outline" className="font-mono text-xs uppercase">
            Unscored practice drills
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">
          Quick drills, immediate rationales.
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Short practice sets ordered by NCLEX client-need domain. Each question reveals its clinical
          rationale with the answer, so the drill itself is the study session.
        </p>
      </section>

      {/* Setup */}
      {!drill && (
        <section data-testid="study-quiz-setup" className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="study-quiz-domain" className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Client-Need Domain
            </label>
            <select
              id="study-quiz-domain"
              data-testid="study-quiz-domain-select"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full max-w-xl rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All domains ({CLINICAL_QUESTION_BANK.length} questions available)</option>
              {NCLEX_CLIENT_NEEDS.map((need) => {
                const count = CLINICAL_QUESTION_BANK.filter((q) => q.domain === need).length;
                return (
                  <option key={need} value={need} disabled={count === 0}>
                    {need} ({count} available)
                  </option>
                );
              })}
            </select>
          </div>
          <Button
            type="button"
            data-testid="study-quiz-start-btn"
            onClick={() => startDrill(domain)}
            className="bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl"
          >
            <span>Start drill</span>
          </Button>
        </section>
      )}

      {/* Active drill */}
      {drill && currentQuestion && (
        <section data-testid="study-quiz-question" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-1 border-b border-border/50">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/20">
                {currentQuestion.domain}
              </span>
              {currentQuestion.questionType === "multi_select" ? (
                <span className="inline-flex items-center gap-1 font-mono px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold text-[11px] border border-sky-500/20">
                  <ListChecks className="h-3 w-3" /> Select All That Apply (SATA)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-500/20">
                  <CircleDot className="h-3 w-3" /> Single Choice
                </span>
              )}
            </div>
            <span className="text-muted-foreground font-mono font-medium">
              {questionIndex + 1} / {drill.length}
            </span>
          </div>

          <p className="text-sm sm:text-base md:text-[17px] font-sans font-medium text-foreground leading-relaxed sm:leading-7 max-w-3xl">
            {currentQuestion.stem}
          </p>

          <div className="space-y-2.5" role={currentQuestion.questionType === "multi_select" ? "group" : "radiogroup"} aria-label="Question options">
            {currentQuestion.options.map((opt, optIdx) => {
              const isSelected =
                currentQuestion.questionType === "multi_select"
                  ? multiSelection.includes(optIdx)
                  : singleSelection === optIdx;
              const isCorrectChoice =
                currentQuestion.questionType === "multi_select"
                  ? (currentQuestion.correctAnswerIndices ?? []).includes(optIdx)
                  : currentQuestion.correctAnswerIndex === optIdx;

              let optionClass = "border-border hover:bg-muted/70 text-muted-foreground hover:text-foreground";
              if (checked && isCorrectChoice) {
                optionClass = "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 font-semibold";
              } else if (checked && isSelected && !isCorrectChoice) {
                optionClass = "border-rose-500 bg-rose-500/10 text-rose-800 dark:text-rose-200";
              } else if (!checked && isSelected) {
                optionClass = "border-teal-500 bg-teal-500/10 text-foreground ring-1 ring-teal-500";
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  disabled={checked}
                  role={currentQuestion.questionType === "multi_select" ? "checkbox" : "radio"}
                  aria-checked={isSelected}
                  data-testid={`study-quiz-option-${optIdx}`}
                  onClick={() => {
                    if (checked) return;
                    if (currentQuestion.questionType === "multi_select") {
                      setMultiSelection((prev) =>
                        prev.includes(optIdx)
                          ? prev.filter((i) => i !== optIdx)
                          : [...prev, optIdx].sort((a, b) => a - b)
                      );
                    } else {
                      setSingleSelection(optIdx);
                    }
                  }}
                  className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-start gap-3.5 ${optionClass}`}
                >
                  <span
                    className={`h-5 w-5 ${
                      currentQuestion.questionType === "multi_select" ? "rounded-md" : "rounded-full"
                    } border border-current flex items-center justify-center text-[10px] shrink-0 font-mono mt-0.5 ${
                      isSelected ? "bg-teal-600 text-white border-teal-600 font-bold" : ""
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span className="flex-1 leading-relaxed">{opt}</span>
                  {checked && isCorrectChoice && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-label="Correct answer" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Immediate rationale */}
          {checked && (
            <div className="space-y-3">
              <div
                data-testid="study-quiz-verdict"
                className={`rounded-xl border p-3.5 text-xs flex items-center gap-2 font-semibold ${
                  isAnswerCorrect(currentQuestion, currentSelection)
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                }`}
              >
                {isAnswerCorrect(currentQuestion, currentSelection) ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Correct
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Incorrect — study the rationale and move on
                  </>
                )}
              </div>
              <div className="rounded-xl bg-teal-500/10 border border-teal-500/25 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-teal-700 dark:text-teal-300 shrink-0" />
                  <h4 className="font-serif font-bold text-sm text-teal-900 dark:text-teal-200">
                    Clinical Rationale
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                  {currentQuestion.rationale}
                </p>
              </div>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  Client-Safety Takeaway
                </p>
                <p className="leading-relaxed">
                  Prioritize acute physiologic instability before chronic, stable findings — then confirm
                  why non-urgent assessments must wait.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              disabled={questionIndex === 0 || checked}
              onClick={() => setQuestionIndex((idx) => Math.max(0, idx - 1))}
              className="rounded-xl text-xs"
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              <span>Previous</span>
            </Button>
            <div className="flex items-center gap-2">
              {!checked ? (
                <Button
                  type="button"
                  data-testid="study-quiz-check-btn"
                  onClick={checkAnswer}
                  disabled={
                    currentQuestion.questionType === "multi_select"
                      ? multiSelection.length === 0
                      : singleSelection === null
                  }
                  className="bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold"
                >
                  Check answer
                </Button>
              ) : questionIndex < drill.length - 1 ? (
                <Button type="button" onClick={nextQuestion} className="bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold">
                  <span>Next question</span>
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button type="button" onClick={finishDrill} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold">
                  <CheckCircle2 className="ml-1 h-4 w-4" />
                  <span>Finish drill</span>
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Drill summary */}
      {drill && !currentQuestion && (
        <section data-testid="study-quiz-summary" className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-6 space-y-3">
          <h2 className="font-serif font-bold text-xl text-foreground">Drill complete</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You answered {correctCount} of {answeredCount} checked questions correctly in this drill.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" />
            Quick drills are unscored practice aids — results are not saved to your official assessment
            history or performance trend. Take a Tutored CAT or Readiness Test on the dashboard for
            graded, tracked assessments.
          </p>
          <Button
            type="button"
            onClick={() => setDrill(null)}
            variant="outline"
            className="rounded-xl"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            <span>Start another drill</span>
          </Button>
        </section>
      )}
    </div>
  );
}
