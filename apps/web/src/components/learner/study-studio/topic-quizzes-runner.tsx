"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  FileQuestion,
  Flag,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  studyService,
  TopicQuizAttempt,
  TopicQuizQuestion,
  TopicQuizResults,
} from "@/lib/study-client-service";
import { aiStudyService } from "@/lib/ai-study-service";
import { notify as toast } from "@/lib/notifications";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TopicQuizzesRunner() {
  const [programme, setProgramme] = React.useState<string>("rn");
  const [attempt, setAttempt] = React.useState<TopicQuizAttempt | null>(null);
  const [results, setResults] = React.useState<TopicQuizResults | null>(null);
  const [currentIndex, setCurrentIndex] = React.useState<number>(0);
  const [selectedOptions, setSelectedOptions] = React.useState<number[]>([]);
  const [checkedAnswer, setCheckedAnswer] = React.useState<boolean>(false);
  const [checkResult, setCheckResult] = React.useState<any>(null);
  const [flaggedQuestions, setFlaggedQuestions] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState<boolean>(false);
  const [submitting, setSubmitting] = React.useState<boolean>(false);

  // Config modal
  const [isConfigOpen, setIsConfigOpen] = React.useState<boolean>(false);
  const [quizTitle, setQuizTitle] = React.useState<string>("Pharmacology & Clinical Priorities Drill");
  const [questionCount, setQuestionCount] = React.useState<number>(5);
  const [immediateFeedback, setImmediateFeedback] = React.useState<boolean>(true);

  const startQuiz = async () => {
    try {
      setLoading(true);
      const res = await studyService.startQuizAttempt({
        title: quizTitle,
        programme,
        questionCount,
        immediateFeedback,
      });

      setAttempt(res.attempt);
      setCurrentIndex(0);
      setSelectedOptions([]);
      setCheckedAnswer(false);
      setCheckResult(null);
      setFlaggedQuestions(new Set());
      setResults(null);
      setIsConfigOpen(false);

      toast.success(`Started topic quiz with ${res.attempt.totalQuestions} questions.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to start quiz attempt.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (checkedAnswer && immediateFeedback) return;
    // For single-choice, replace selection
    setSelectedOptions([idx]);
  };

  const handleCheckImmediate = async () => {
    if (!attempt || selectedOptions.length === 0 || submitting) return;
    const currentQ = attempt.questions[currentIndex];

    try {
      setSubmitting(true);
      const res = await studyService.submitQuizResponse(
        attempt.id,
        currentQ.id,
        selectedOptions,
        15,
        flaggedQuestions.has(currentQ.id)
      );

      setCheckedAnswer(true);
      setCheckResult(res.response);
    } catch (err: any) {
      toast.error(err.message || "Failed to check response.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = async () => {
    if (!attempt) return;
    if (!checkedAnswer && selectedOptions.length > 0) {
      const currentQ = attempt.questions[currentIndex];
      await studyService.submitQuizResponse(
        attempt.id,
        currentQ.id,
        selectedOptions,
        15,
        flaggedQuestions.has(currentQ.id)
      );
    }

    if (currentIndex + 1 < attempt.questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOptions([]);
      setCheckedAnswer(false);
      setCheckResult(null);
    } else {
      // Complete quiz
      try {
        setSubmitting(true);
        const res = await studyService.completeQuizAttempt(attempt.id);
        setResults(res.results);
        toast.success("Quiz completed!");
      } catch (err: any) {
        toast.error(err.message || "Failed to complete quiz.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const toggleFlag = (qId: string) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const handleSaveMissedToDeck = async () => {
    if (!results || results.missedQuestions.length === 0) return;
    try {
      setLoading(true);
      const deckRes = await studyService.createDeck({
        name: `Missed Questions: ${attempt?.title || "Drill"}`,
        description: `Generated from ${results.missedQuestions.length} missed quiz questions.`,
        programme,
      });

      for (const q of results.missedQuestions) {
        await studyService.createCard(deckRes.deck.id, {
          front: q.stem,
          back: q.options[q.correctAnswerIndices?.[0] ?? 0]?.text || "Review rationale",
          explanation: q.rationale || "Clinical priority",
          difficulty: "high_yield",
        });
      }

      toast.success(`Saved ${results.missedQuestions.length} flashcards to new deck.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create flashcards from missed questions.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRationaleAsNote = async (q: TopicQuizQuestion) => {
    try {
      await studyService.createNote({
        title: `Clinical Rationale: ${q.stem.slice(0, 50)}...`,
        contentJson: JSON.stringify({
          schema: "prepford-note-v1",
          html: `
            <h3>Question</h3>
            <p>${q.stem}</p>
            ${q.clinicalScenario ? `<blockquote>${q.clinicalScenario}</blockquote>` : ""}
            <h4>Clinical Rationale</h4>
            <p>${q.rationale || "Rationale"}</p>
          `,
        }),
        contentPlainText: `${q.stem}\n\nRationale:\n${q.rationale}`,
        programme,
        tags: ["quiz-review", "high-yield"],
      });

      toast.success("Saved explanation to personal study notes.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save note.");
    }
  };

  const currentQ = attempt?.questions[currentIndex];

  return (
    <div data-testid="topic-quizzes-runner" className="space-y-6 max-w-4xl mx-auto">
      {/* ── Top Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-teal-600" />
            <h1 className="font-serif font-bold text-xl text-foreground">Topic Quizzes & Drills</h1>
            <Badge variant="outline" className="text-xs uppercase">
              Canonical Question Bank
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Targeted clinical practice drills with immediate explanations and Client Needs breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Programme selector */}
          <div className="flex rounded-lg bg-muted p-0.5 text-xs">
            {["rn", "pn"].map((p) => (
              <button
                key={p}
                onClick={() => setProgramme(p)}
                className={`px-3 py-1 font-medium rounded-md uppercase transition-all ${
                  programme === p ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <Button onClick={() => setIsConfigOpen(true)} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs gap-1.5">
            <Play className="h-3.5 w-3.5" />
            <span>New Drill</span>
          </Button>
        </div>
      </div>

      {/* ── Active Quiz or Results or Empty ── */}
      {results ? (
        /* Results Report */
        <div data-testid="quiz-results-report" className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600">
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="font-serif font-bold text-2xl text-foreground">Quiz Results</h2>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-bold text-teal-600">{results.attempt.scorePercentage}%</span>
              <span className="text-sm text-muted-foreground">
                ({results.attempt.correctCount}/{results.attempt.totalQuestions} Correct)
              </span>
            </div>
          </div>

          {/* Breakdown by Client Need */}
          {Object.keys(results.performanceByClientNeed).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Client Needs Breakdown</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(results.performanceByClientNeed).map(([cn, pct]) => (
                  <div key={cn} className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between text-xs">
                    <span className="capitalize text-foreground font-medium">{cn.replace(/-/g, " ")}</span>
                    <Badge variant={pct >= 75 ? "default" : "destructive"} className="text-xs">
                      {pct}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missed questions section */}
          {results.missedQuestions.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Review Missed Questions ({results.missedQuestions.length})
                </h4>
                <Button onClick={handleSaveMissedToDeck} size="sm" variant="outline" className="gap-1.5 text-xs text-teal-700 dark:text-teal-300">
                  <Copy className="h-3.5 w-3.5" />
                  <span>Generate Flashcards from Missed</span>
                </Button>
              </div>

              <div className="space-y-3">
                {results.missedQuestions.map((mq, i) => (
                  <div key={i} className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-foreground">{mq.stem}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSaveRationaleAsNote(mq)}
                        className="text-[11px] h-7 gap-1 text-teal-700 dark:text-teal-300"
                      >
                        <BookOpen className="h-3 w-3" />
                        <span>Save as Note</span>
                      </Button>
                    </div>
                    {mq.rationale && (
                      <p className="text-muted-foreground leading-relaxed italic border-t border-rose-500/20 pt-2">
                        Clinical Rationale: {mq.rationale}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-3 pt-4">
            <Button onClick={() => setIsConfigOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl">
              Start Another Drill
            </Button>
            <Link href="/dashboard/study">
              <Button variant="outline" className="rounded-xl">
                Studio Overview
              </Button>
            </Link>
          </div>
        </div>
      ) : attempt && currentQ ? (
        /* Active Quiz Question Canvas */
        <div className="space-y-6">
          {/* Palette & Progress */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-border bg-card">
            <span className="text-xs font-semibold text-foreground">
              Question {currentIndex + 1} of {attempt.questions.length}
            </span>

            {/* Question indicators */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {attempt.questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isFlagged = flaggedQuestions.has(q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setSelectedOptions([]);
                      setCheckedAnswer(false);
                      setCheckResult(null);
                    }}
                    className={`h-7 w-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                      isCurrent
                        ? "bg-teal-600 text-white"
                        : isFlagged
                        ? "bg-amber-500/20 text-amber-700 border border-amber-500/50"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleFlag(currentQ.id)}
              className={`h-8 gap-1 text-xs ${flaggedQuestions.has(currentQ.id) ? "text-amber-500" : "text-muted-foreground"}`}
            >
              <Flag className="h-3.5 w-3.5" />
              <span>{flaggedQuestions.has(currentQ.id) ? "Flagged" : "Flag"}</span>
            </Button>
          </div>

          {/* Question Card */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-xs">
            {/* Clinical Scenario Vignette */}
            {currentQ.clinicalScenario && (
              <div className="p-4 rounded-xl border border-border bg-muted/30 text-xs text-muted-foreground leading-relaxed">
                <span className="font-bold text-foreground block mb-1">Clinical Scenario:</span>
                {currentQ.clinicalScenario}
              </div>
            )}

            {/* Question Stem */}
            <h3 className="font-serif font-bold text-lg sm:text-xl text-foreground leading-snug">
              {currentQ.stem}
            </h3>

            {/* Options */}
            <div className="space-y-2.5">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = selectedOptions.includes(optIdx);
                const isCorrect = checkResult?.correctAnswerIndices?.includes(optIdx);
                const isWrongSelection = checkedAnswer && isSelected && !isCorrect;

                let cardStyle = "border-border hover:border-border hover:bg-muted/30";
                if (checkedAnswer) {
                  if (isCorrect) cardStyle = "border-emerald-500/60 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 font-semibold";
                  else if (isWrongSelection) cardStyle = "border-rose-500/60 bg-rose-500/10 text-rose-950 dark:text-rose-100";
                } else if (isSelected) {
                  cardStyle = "border-teal-600 bg-teal-500/10 text-teal-950 dark:text-teal-100 font-semibold";
                }

                return (
                  <div
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 text-xs leading-relaxed ${cardStyle}`}
                  >
                    <span className="h-5 w-5 rounded-full border border-current flex items-center justify-center shrink-0 text-[11px] font-bold">
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="flex-1">{opt.text}</span>
                    {checkedAnswer && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                    {checkedAnswer && isWrongSelection && <XCircle className="h-4 w-4 text-rose-600 shrink-0" />}
                  </div>
                );
              })}
            </div>

            {/* Immediate feedback rationale banner */}
            {checkedAnswer && checkResult && (
              <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-500/5 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  {checkResult.isCorrect ? (
                    <Badge className="bg-emerald-600 text-white text-xs">Correct Assessment</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">Clinical Opportunity</Badge>
                  )}
                  <span className="text-xs font-semibold text-foreground">Clinical Rationale:</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {checkResult.rationale || "Rationale confirms that the chosen priority is supported by standard NCLEX guidelines."}
                </p>
              </div>
            )}

            {/* Navigation / Next Button */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => {
                  setCurrentIndex((prev) => prev - 1);
                  setSelectedOptions([]);
                  setCheckedAnswer(false);
                  setCheckResult(null);
                }}
              >
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {!checkedAnswer && immediateFeedback ? (
                  <Button
                    onClick={handleCheckImmediate}
                    disabled={selectedOptions.length === 0 || submitting}
                    className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs gap-1.5"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Check Rationale</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleNextQuestion}
                    className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs gap-1.5"
                  >
                    <span>{currentIndex + 1 === attempt.questions.length ? "Submit Quiz" : "Next Question"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty / Idle State */
        <div className="p-8 sm:p-12 rounded-2xl border border-border bg-card text-center space-y-4 shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600">
            <FileQuestion className="h-8 w-8" />
          </div>
          <h2 className="font-serif font-bold text-2xl text-foreground">Active Topic Quizzes</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Test clinical reasoning against canonical NCLEX questions with immediate explanations and domain scoring.
          </p>
          <div className="pt-2">
            <Button onClick={() => setIsConfigOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2 px-6 py-2.5">
              <Play className="h-4 w-4" />
              <span>Configure New Drill</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── Dialog: Quiz Config ── */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Topic Quiz Drill</DialogTitle>
            <DialogDescription>
              Select question count and feedback mode for this practice drill.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Drill Title</label>
              <Input
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="e.g. Pharmacology Priority Drill"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Number of Questions</label>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map((c) => (
                  <button
                    key={c}
                    onClick={() => setQuestionCount(c)}
                    className={`flex-1 py-1.5 rounded-lg border text-center font-medium ${
                      questionCount === c
                        ? "border-teal-600 bg-teal-500/10 text-teal-700 dark:text-teal-300"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
              <div>
                <span className="font-semibold text-foreground block">Immediate Clinical Rationales</span>
                <span className="text-[11px] text-muted-foreground">Show rationale and explanations immediately after answering</span>
              </div>
              <input
                type="checkbox"
                checked={immediateFeedback}
                onChange={(e) => setImmediateFeedback(e.target.checked)}
                className="h-4 w-4 rounded text-teal-600"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
              Cancel
            </Button>
            <Button onClick={startQuiz} className="bg-teal-600 hover:bg-teal-700 text-white">
              Launch Drill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
