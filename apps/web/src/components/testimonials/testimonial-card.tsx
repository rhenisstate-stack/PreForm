"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Quote, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { TestimonialAvatar } from "@/components/testimonials/testimonial-avatar";

export interface TestimonialData {
  id: string;
  displayName: string;
  pathway: "RN" | "PN" | "Both";
  quote: string;
  avatarUrl?: string | null;
  outcomeVerified?: boolean;
  createdAt?: string;
  studyFocus?: string;
  role?: string;
}

interface TestimonialCardProps {
  testimonial: TestimonialData;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
  className?: string;
}

export function TestimonialCard({
  testimonial,
  isExpanded = false,
  onToggleExpand,
  className = "",
}: TestimonialCardProps) {
  const { id, displayName, pathway, quote, avatarUrl, outcomeVerified, createdAt, studyFocus, role } = testimonial;

  const isLong = quote.length > 180;
  const displayQuote = isExpanded || !isLong ? quote : `${quote.slice(0, 180)}…`;

  const pathwayLabel = pathway === "Both" ? "NCLEX-RN & PN" : `NCLEX-${pathway}`;
  const isAnonymous = displayName.toLowerCase().includes("anonymous") || displayName.toLowerCase().includes("candidate");

  return (
    <Card
      className={`border-border/80 bg-card flex flex-col justify-between hover:border-secondary/50 transition-all shadow-xs hover:shadow-md ${className}`}
    >
      <CardContent className="pt-6 pb-6 flex flex-col justify-between h-full space-y-4">
        <div className="space-y-3">
          {/* Header: Quote Icon & Badges */}
          <div className="flex items-center justify-between gap-2">
            <Quote className="h-6 w-6 text-secondary/40 shrink-0" aria-hidden="true" />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-bold text-foreground">
                {pathwayLabel}
              </span>
              {outcomeVerified && (
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-[11px] gap-1 px-1.5 py-0"
                >
                  <CheckCircle className="h-3 w-3" />
                  <span>Verified Outcome</span>
                </Badge>
              )}
            </div>
          </div>

          {/* Quote Body */}
          <p className="text-sm text-foreground leading-relaxed italic">
            &ldquo;{displayQuote}&rdquo;
          </p>

          {/* Expand/Collapse Control */}
          {isLong && onToggleExpand && (
            <button
              type="button"
              onClick={() => onToggleExpand(id)}
              aria-expanded={isExpanded}
              aria-controls={`testimonial-quote-${id}`}
              className="inline-flex items-center gap-1 text-xs text-secondary hover:underline font-medium pt-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-secondary rounded"
            >
              <span>{isExpanded ? "Show less" : "Read full reflection"}</span>
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {/* Footer: Candidate Profile & Metadata */}
        <div className="pt-4 border-t border-border/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <TestimonialAvatar
                src={avatarUrl}
                displayName={displayName}
                isAnonymous={isAnonymous}
                size="sm"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {displayName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {role || "Candidate"}{studyFocus ? ` • ${studyFocus}` : ""}
                </p>
              </div>
            </div>
            {createdAt && (
              <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                {createdAt}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
