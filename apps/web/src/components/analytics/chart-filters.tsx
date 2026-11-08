"use client";

import * as React from "react";

export type TimeRangeOption = "today" | "7d" | "30d" | "90d" | "1y" | "all";

export interface ChartDateRangeFilterProps {
  value: TimeRangeOption;
  onChange: (value: TimeRangeOption) => void;
  options?: Array<{ key: TimeRangeOption; label: string }>;
  disabled?: boolean;
}

const DEFAULT_OPTIONS: Array<{ key: TimeRangeOption; label: string }> = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "90d", label: "90 Days" },
  { key: "1y", label: "1 Year" },
  { key: "all", label: "All Time" },
];

export function ChartDateRangeFilter({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  disabled = false,
}: ChartDateRangeFilterProps) {
  return (
    <div
      className="inline-flex items-center rounded-xl bg-muted/60 p-1 border border-border/60"
      role="group"
      aria-label="Filter by time range"
      data-testid="chart-date-range-filter"
    >
      {options.map((opt) => {
        const isSelected = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.key)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              isSelected
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground disabled:opacity-50"
            }`}
            aria-pressed={isSelected}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export interface PathwayToggleFilterProps {
  value: "all" | "rn" | "pn";
  onChange: (value: "all" | "rn" | "pn") => void;
  disabled?: boolean;
}

export function PathwayToggleFilter({ value, onChange, disabled }: PathwayToggleFilterProps) {
  return (
    <div
      className="inline-flex items-center rounded-xl bg-muted/60 p-1 border border-border/60"
      role="group"
      aria-label="Filter by NCLEX pathway"
      data-testid="pathway-toggle-filter"
    >
      {[
        { key: "all", label: "All Pathways" },
        { key: "rn", label: "NCLEX-RN" },
        { key: "pn", label: "NCLEX-PN" },
      ].map((opt) => (
        <button
          key={opt.key}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.key as "all" | "rn" | "pn")}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
            value === opt.key
              ? "bg-card text-foreground shadow-2xs font-semibold"
              : "text-muted-foreground hover:text-foreground disabled:opacity-50"
          }`}
          aria-pressed={value === opt.key}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
