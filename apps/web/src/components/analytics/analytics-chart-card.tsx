"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChartLoadingState, ChartEmptyState, ChartErrorState } from "./chart-states";

export interface AnalyticsChartCardProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  heightClass?: string;
  className?: string;
  contentClassName?: string;
  footer?: React.ReactNode;
}

export function AnalyticsChartCard({
  title,
  description,
  actions,
  children,
  loading = false,
  error = null,
  empty = false,
  emptyTitle,
  emptyDescription,
  onRetry,
  heightClass = "h-72",
  className,
  contentClassName,
  footer,
}: AnalyticsChartCardProps) {
  return (
    <Card
      className={cn(
        "flex flex-col border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden",
        className
      )}
      data-testid="analytics-chart-card"
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 pt-5 px-6">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold tracking-tight text-foreground">
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-xs text-muted-foreground">
              {description}
            </CardDescription>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </CardHeader>

      <CardContent className={cn("px-6 pb-6 pt-0 flex-1", contentClassName)}>
        {loading ? (
          <ChartLoadingState heightClass={heightClass} />
        ) : error ? (
          <ChartErrorState message={error} onRetry={onRetry} heightClass={heightClass} />
        ) : empty ? (
          <ChartEmptyState
            title={emptyTitle}
            description={emptyDescription}
            heightClass={heightClass}
          />
        ) : (
          <div className={cn("w-full", heightClass)}>{children}</div>
        )}

        {footer && <div className="mt-4 border-t border-border/40 pt-3">{footer}</div>}
      </CardContent>
    </Card>
  );
}
