"use client";

import * as React from "react";
import { Bookmark } from "lucide-react";
import { QueryClientContext } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useQuestionFlag } from "@/lib/use-question-flag";

interface QuestionFlagButtonProps {
  questionId: string;
  attemptId?: string;
  initialFlagged?: boolean;
  className?: string;
}

function ConnectedQuestionFlagButton({
  questionId,
  attemptId,
  initialFlagged = false,
  className = "",
}: QuestionFlagButtonProps) {
  const { isFlagged, toggleFlag, isPending } = useQuestionFlag({
    questionId,
    attemptId,
    initialFlagged,
  });

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleFlag}
      disabled={isPending}
      aria-pressed={isFlagged}
      aria-label={isFlagged ? "Unflag question for review" : "Flag question for review"}
      className={`gap-1.5 text-xs font-medium transition-colors ${
        isFlagged
          ? "bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/25 border border-amber-500/30"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      } ${className}`}
    >
      <Bookmark
        className={`h-4 w-4 transition-transform ${isFlagged ? "fill-amber-500 text-amber-500 scale-105" : ""}`}
        aria-hidden="true"
      />
      <span>{isFlagged ? "Flagged for Review" : "Flag for Review"}</span>
    </Button>
  );
}

function LocalQuestionFlagButton({
  initialFlagged = false,
  className = "",
}: QuestionFlagButtonProps) {
  const [isFlagged, setIsFlagged] = React.useState(initialFlagged);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setIsFlagged(!isFlagged)}
      aria-pressed={isFlagged}
      aria-label={isFlagged ? "Unflag question for review" : "Flag question for review"}
      className={`gap-1.5 text-xs font-medium transition-colors ${
        isFlagged
          ? "bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/25 border border-amber-500/30"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      } ${className}`}
    >
      <Bookmark
        className={`h-4 w-4 transition-transform ${isFlagged ? "fill-amber-500 text-amber-500 scale-105" : ""}`}
        aria-hidden="true"
      />
      <span>{isFlagged ? "Flagged for Review" : "Flag for Review"}</span>
    </Button>
  );
}

export function QuestionFlagButton(props: QuestionFlagButtonProps) {
  const queryContext = React.useContext(QueryClientContext);
  if (!queryContext) {
    return <LocalQuestionFlagButton {...props} />;
  }
  return <ConnectedQuestionFlagButton {...props} />;
}
