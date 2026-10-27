"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, ArrowRight, Sparkles, FileText, Activity, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DemoQuestion {
  id: string;
  clientInfo: string;
  scenario: string;
  vitals: { hr: string; bp: string; rr: string; spo2: string; temp: string };
  question: string;
  options: { id: string; text: string; correct: boolean; rationale: string }[];
  clinicalTakeaway: string;
}

const SAMPLE_QUESTION: DemoQuestion = {
  id: "ngn-demo-1",
  clientInfo: "62-year-old postoperative client • Day 1 Total Hip Arthroplasty",
  scenario:
    "The nurse responds to a client call light. The client is sitting upright, appearing anxious and diaphoretic. The client reports sudden-onset shortness of breath and sharp pleuritic chest discomfort.",
  vitals: {
    hr: "116 bpm (Sinus Tachycardia)",
    bp: "108/68 mmHg",
    rr: "28 breaths/min (Tachypnea)",
    spo2: "88% on ambient room air",
    temp: "37.2°C (99.0°F)",
  },
  question:
    "Based on the clinical assessment and physiological cues, which immediate nursing intervention should the nurse implement first?",
  options: [
    {
      id: "opt-1",
      text: "Administer the scheduled oral hydromorphone for operative surgical pain.",
      correct: false,
      rationale:
        "Administering CNS-depressant opioids in an acutely hypoxemic, tachypneic client without oxygen support can worsen respiratory depression and hypoventilation.",
    },
    {
      id: "opt-2",
      text: "Elevate the head of the bed to high-Fowler's and initiate supplemental oxygen via nasal cannula.",
      correct: true,
      rationale:
        "Applying the ABC (Airway, Breathing, Circulation) framework, acute hypoxemia (SpO2 88%) and sudden dyspnea require immediate position optimization to maximize diaphragmatic excursion and supplemental oxygen to relieve cellular hypoxia while preparing for emergency provider notification for suspected pulmonary embolism.",
    },
    {
      id: "opt-3",
      text: "Instruct the client to lie flat and perform 10 repetitions of sustained maximal inspiration on the spirometer.",
      correct: false,
      rationale:
        "A supine position compresses lung bases and increases the work of breathing during an acute hypoxemic episode. High-Fowler's is the priority position.",
    },
    {
      id: "opt-4",
      text: "Leave the bedside immediately to retrieve the paper chart and review intraoperative estimated blood loss.",
      correct: false,
      rationale:
        "An unstable client exhibiting severe hypoxemia and tachypnea must not be left unattended. Direct interventions and calling for emergency assistance take immediate priority.",
    },
  ],
  clinicalTakeaway:
    "NCSBN Clinical Judgment Step 4 (Generate Solutions): Prioritize immediate oxygenation and position support for emergent respiratory decompensation before secondary documentation tasks.",
};

export function FreeDemoSection() {
  const [selectedOptionId, setSelectedOptionId] = React.useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const handleSubmit = () => {
    if (!selectedOptionId) return;
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setSelectedOptionId(null);
    setIsSubmitted(false);
  };

  return (
    <section id="demo" className="scroll-mt-20 py-20 px-4 sm:px-6 lg:py-28 lg:px-8 bg-background border-t border-border">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center lg:max-w-3xl lg:mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Interactive Learning Sandbox</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-foreground">
            Try PrepFord Free
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Experience authentic Next Generation NCLEX clinical judgment with an interactive case scenario. Test your reasoning and review the complete clinical rationale—no credit card or account required.
          </p>
        </div>

        {/* Demo Question Interactive Container */}
        <div className="mt-12 max-w-4xl mx-auto">
          <Card className="border-border bg-card shadow-lg overflow-hidden">
            {/* Case EHR Header */}
            <div className="bg-muted/70 px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-secondary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Electronic Health Record (EHR) — Clinical Case Study
                </span>
              </div>
              <Badge variant="outline" className="text-xs font-medium border-border">
                {SAMPLE_QUESTION.clientInfo}
              </Badge>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Clinical Scenario Box */}
              <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-5 space-y-4">
                <p className="text-sm sm:text-base text-foreground leading-relaxed">
                  {SAMPLE_QUESTION.scenario}
                </p>

                {/* Vitals Grid */}
                <div className="pt-2 border-t border-secondary/15">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-secondary mb-2">
                    <Activity className="h-3.5 w-3.5" />
                    <span>Bedside Vitals Assessment:</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-background/80 p-2 rounded-md border border-border">
                      <span className="text-muted-foreground block text-[11px]">Heart Rate:</span>
                      <span className="font-semibold text-foreground">{SAMPLE_QUESTION.vitals.hr}</span>
                    </div>
                    <div className="bg-background/80 p-2 rounded-md border border-border">
                      <span className="text-muted-foreground block text-[11px]">Blood Pressure:</span>
                      <span className="font-semibold text-foreground">{SAMPLE_QUESTION.vitals.bp}</span>
                    </div>
                    <div className="bg-background/80 p-2 rounded-md border border-border">
                      <span className="text-muted-foreground block text-[11px]">Respirations:</span>
                      <span className="font-semibold text-destructive">{SAMPLE_QUESTION.vitals.rr}</span>
                    </div>
                    <div className="bg-background/80 p-2 rounded-md border border-border">
                      <span className="text-muted-foreground block text-[11px]">SpO2 Saturation:</span>
                      <span className="font-semibold text-destructive">{SAMPLE_QUESTION.vitals.spo2}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Question Prompt */}
              <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-serif font-bold text-foreground">
                  {SAMPLE_QUESTION.question}
                </h3>

                {/* Option Choices */}
                <div className="space-y-2.5" role="radiogroup" aria-label="Question options">
                  {SAMPLE_QUESTION.options.map((option, idx) => {
                    const isSelected = selectedOptionId === option.id;
                    let optionStyle = "border-border hover:bg-muted/50 text-foreground";

                    if (isSubmitted) {
                      if (option.correct) {
                        optionStyle = "border-emerald-600 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 font-medium";
                      } else if (isSelected && !option.correct) {
                        optionStyle = "border-destructive bg-destructive/10 text-destructive";
                      } else {
                        optionStyle = "border-border/60 opacity-60";
                      }
                    } else if (isSelected) {
                      optionStyle = "border-secondary bg-secondary/10 text-foreground font-medium ring-1 ring-secondary";
                    }

                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={isSubmitted}
                        onClick={() => setSelectedOptionId(option.id)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3.5 ${optionStyle}`}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold mt-0.5">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <div className="flex-1">
                          <span className="text-sm sm:text-base leading-relaxed block">
                            {option.text}
                          </span>
                          {/* Show rationale if submitted */}
                          {isSubmitted && (
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground border-t border-current/20 pt-2">
                              <strong className="text-foreground">Clinical Rationale: </strong>
                              {option.rationale}
                            </p>
                          )}
                        </div>
                        {isSubmitted && option.correct && (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        )}
                        {isSubmitted && isSelected && !option.correct && (
                          <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Controls */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border">
                {!isSubmitted ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedOptionId}
                    size="lg"
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 shadow-sm"
                  >
                    Submit Clinical Response
                  </Button>
                ) : (
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      size="sm"
                      className="font-medium"
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Try Question Again
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Sample 1 of 1 • Full question bank has 3,500+ NGN items.
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Ready to practice more?
                  </span>
                  <Button
                    asChild
                    variant="default"
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold text-xs shadow-xs"
                  >
                    <Link href="/sign-up">
                      Create Free Account
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Clinical Takeaway Banner */}
              {isSubmitted && (
                <div className="rounded-lg border border-secondary/30 bg-secondary/10 p-4 text-xs text-foreground">
                  <p className="font-semibold text-secondary flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-4 w-4" />
                    Clinical Judgment Takeaway:
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    {SAMPLE_QUESTION.clinicalTakeaway}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
