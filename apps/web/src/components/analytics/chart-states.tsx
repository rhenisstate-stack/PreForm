"use client";

import * as React from "react";
import { AlertCircle, BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ChartLoadingStateProps {
  heightClass?: string;
  message?: string;
}

export function ChartLoadingState({
  heightClass = "h-64",
  message = "Loading analytics visualization...",
}: ChartLoadingStateProps) {
  return (
    <div
      className={`w-full ${heightClass} flex flex-col items-center justify-center rounded-xl bg-muted/20 border border-border/40 animate-pulse`}
      data-testid="chart-loading-state"
    >
      <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
      <span className="text-xs font-mono text-muted-foreground">{message}</span>
    </div>
  );
}

export interface ChartEmptyStateProps {
  heightClass?: string;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export function ChartEmptyState({
  heightClass = "h-64",
  title = "No Data Available in Selected Window",
  description = "No operational or assessment activity was recorded for the chosen filters. Try widening the date range.",
  actionText,
  onAction,
}: ChartEmptyStateProps) {
  return (
    <div
      className={`w-full ${heightClass} flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-6 text-center bg-muted/10`}
      data-testid="chart-empty-state"
    >
      <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground mb-2">
        <BarChart3 className="h-5 w-5 opacity-70" />
      </div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAction}
          className="mt-3 text-xs h-7 font-medium"
        >
          {actionText}
        </Button>
      )}
    </div>
  );
}

export interface ChartErrorStateProps {
  heightClass?: string;
  error?: string | null;
  message?: string | null;
  onRetry?: () => void;
}

export function ChartErrorState({
  heightClass = "h-64",
  error,
  message,
  onRetry,
}: ChartErrorStateProps) {
  const displayError = message || error || "Failed to load visualization data";
  return (
    <div
      className={`w-full ${heightClass} flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center`}
      data-testid="chart-error-state"
    >
      <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h4 className="text-sm font-semibold text-foreground">Analytics Error</h4>
      <p className="text-xs text-muted-foreground max-w-sm mt-1">{displayError}</p>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-3 text-xs h-7 font-medium inline-flex items-center gap-1.5"
        >
          <RefreshCw className="h-3 w-3" /> Retry Query
        </Button>
      )}
    </div>
  );
}
