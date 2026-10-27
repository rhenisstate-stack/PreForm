"use client";

import * as React from "react";
import { evaluatePasswordStrength, MIN_ZXCVBN_SCORE } from "@/lib/validation/auth";
import { ShieldAlert, ShieldCheck, AlertCircle } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password?: string;
  id?: string;
}

export function PasswordStrengthIndicator({
  password = "",
  id = "password-strength",
}: PasswordStrengthIndicatorProps) {
  const strength = React.useMemo(() => {
    return evaluatePasswordStrength(password);
  }, [password]);

  if (!password) {
    return null;
  }

  const isAcceptable = strength.score >= MIN_ZXCVBN_SCORE;

  return (
    <div id={id} className="space-y-2 mt-2" aria-live="polite">
      {/* Visual meter bar (4 segments) */}
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => {
          const filled = strength.score >= step;
          let segmentColor = "bg-muted";
          if (filled) {
            if (strength.score === 1) segmentColor = "bg-destructive";
            else if (strength.score === 2) segmentColor = "bg-amber-500";
            else if (strength.score === 3) segmentColor = "bg-teal-600";
            else segmentColor = "bg-emerald-600";
          }
          return (
            <div
              key={step}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${segmentColor}`}
            />
          );
        })}
      </div>

      {/* Label and Score Details */}
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          {isAcceptable ? (
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
          ) : (
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
          )}
          <span>Strength: <strong className="font-semibold">{strength.label}</strong></span>
        </span>
        <span className="text-[11px] text-muted-foreground">
          {isAcceptable ? "Meets security baseline" : "Minimum: Strong"}
        </span>
      </div>

      {/* Warning and Suggestions */}
      {(strength.warning || strength.suggestions.length > 0) && !isAcceptable && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-2.5 text-[11px] text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900/50 space-y-1">
          {strength.warning && (
            <div className="flex items-start gap-1.5 font-medium">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
              <span>{strength.warning}</span>
            </div>
          )}
          {strength.suggestions.map((suggestion, idx) => (
            <p key={idx} className="pl-5 leading-normal opacity-90">
              • {suggestion}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
