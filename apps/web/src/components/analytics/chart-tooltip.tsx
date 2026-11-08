"use client";

import * as React from "react";

export interface ChartTooltipItem {
  label: string;
  value: number | string;
  color?: string;
  format?: "number" | "percent" | "currency" | "minutes";
}

export interface BrandedChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  items?: ChartTooltipItem[];
  title?: string;
  currencySymbol?: string;
}

export function BrandedChartTooltip({
  active,
  payload,
  label,
  items,
  title,
  currencySymbol = "$",
}: BrandedChartTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const headerText = title || label || payload[0]?.payload?.label || payload[0]?.payload?.date;

  const formatVal = (val: any, fmt?: string) => {
    const num = typeof val === "number" ? val : parseFloat(val);
    if (isNaN(num)) return val;
    switch (fmt) {
      case "percent":
        return `${num.toFixed(1)}%`;
      case "currency":
        return `${currencySymbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case "minutes":
        return `${Math.round(num)} min`;
      case "number":
      default:
        return num.toLocaleString();
    }
  };

  return (
    <div
      className="rounded-xl border border-border bg-popover/95 p-3 shadow-md backdrop-blur-xs text-xs space-y-1.5 min-w-[140px]"
      data-testid="branded-chart-tooltip"
    >
      {headerText && (
        <p className="font-semibold text-foreground border-b border-border/60 pb-1 text-[11px]">
          {headerText}
        </p>
      )}
      <div className="space-y-1 pt-0.5">
        {payload.map((entry, idx) => {
          const color = entry.color || entry.fill || entry.stroke || "#0D9488";
          const dataKey = entry.name || entry.dataKey;
          const val = entry.value;

          return (
            <div key={`tip-${idx}`} className="flex items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="text-muted-foreground truncate">{dataKey}:</span>
              </div>
              <span className="font-mono font-semibold text-foreground shrink-0">
                {typeof val === "number" && (dataKey.toLowerCase().includes("percent") || dataKey.toLowerCase().includes("rate"))
                  ? `${val.toFixed(1)}%`
                  : typeof val === "number" && (dataKey.toLowerCase().includes("revenue") || dataKey.toLowerCase().includes("sales") || dataKey.toLowerCase().includes("gross") || dataKey.toLowerCase().includes("refund"))
                  ? `${currencySymbol}${val.toFixed(2)}`
                  : typeof val === "number"
                  ? val.toLocaleString()
                  : val}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
