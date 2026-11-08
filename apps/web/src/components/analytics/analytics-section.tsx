"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";

export interface AnalyticsSectionProps {
  id?: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badgeText?: string;
  badgeVariant?: "default" | "secondary" | "outline";
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AnalyticsSection({
  id,
  title,
  description,
  icon: Icon,
  badgeText,
  badgeVariant = "outline",
  actions,
  children,
  className = "",
}: AnalyticsSectionProps) {
  const headingId = id ? `${id}-heading` : undefined;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`space-y-4 ${className}`}
      data-testid={id ? `analytics-section-${id}` : "analytics-section"}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-secondary shrink-0" aria-hidden="true" />}
            <h2
              id={headingId}
              className="text-lg font-serif font-bold tracking-tight text-foreground"
            >
              {title}
            </h2>
            {badgeText && (
              <Badge variant={badgeVariant} className="text-[10px] uppercase font-mono py-0 px-1.5">
                {badgeText}
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">{actions}</div>}
      </div>

      <div className="pt-1">{children}</div>
    </section>
  );
}
