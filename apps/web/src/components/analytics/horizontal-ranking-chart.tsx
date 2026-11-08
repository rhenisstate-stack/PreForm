"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ChartEmptyState } from "./chart-states";

export interface RankingItem {
  id?: string | number;
  label: string;
  value: number; // typically percentage 0-100 or a count
  maxValue?: number; // default 100 for percentage
  sublabel?: string;
  status?: "mastered" | "developing" | "needs_improvement" | "unassessed";
  color?: string;
  benchmark?: number; // e.g. 75%
}

export interface HorizontalRankingChartProps {
  items: RankingItem[];
  valueFormatter?: (value: number) => string;
  benchmark?: number; // Global benchmark line (e.g. 75)
  benchmarkLabel?: string;
  sortBy?: "desc" | "asc" | "none";
  maxItems?: number;
  emptyMessage?: string;
  className?: string;
}

export function HorizontalRankingChart({
  items,
  valueFormatter = (val) => `${val.toFixed(0)}%`,
  benchmark,
  benchmarkLabel = "Target Pass Line",
  sortBy = "desc",
  maxItems,
  emptyMessage = "No categorical performance metrics recorded.",
  className,
}: HorizontalRankingChartProps) {
  if (!items || items.length === 0) {
    return <ChartEmptyState heightClass="h-full min-h-[220px]" description={emptyMessage} />;
  }

  const sortedItems = React.useMemo(() => {
    let list = [...items];
    if (sortBy === "desc") {
      list.sort((a, b) => b.value - a.value);
    } else if (sortBy === "asc") {
      list.sort((a, b) => a.value - b.value);
    }
    if (maxItems) {
      list = list.slice(0, maxItems);
    }
    return list;
  }, [items, sortBy, maxItems]);

  const getStatusBadge = (item: RankingItem) => {
    if (item.status) {
      switch (item.status) {
        case "mastered":
          return <Badge variant="success" className="text-[10px] py-0 px-2">Mastered</Badge>;
        case "developing":
          return <Badge variant="secondary" className="text-[10px] py-0 px-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">Developing</Badge>;
        case "needs_improvement":
          return <Badge variant="destructive" className="text-[10px] py-0 px-2">Focus Area</Badge>;
        case "unassessed":
        default:
          return <Badge variant="outline" className="text-[10px] py-0 px-2 text-muted-foreground">Unassessed</Badge>;
      }
    }

    if (benchmark !== undefined) {
      if (item.value >= benchmark) {
        return <Badge variant="success" className="text-[10px] py-0 px-2">Above Target</Badge>;
      } else if (item.value >= benchmark - 15) {
        return <Badge variant="secondary" className="text-[10px] py-0 px-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">Near Target</Badge>;
      } else {
        return <Badge variant="destructive" className="text-[10px] py-0 px-2">Below Target</Badge>;
      }
    }

    return null;
  };

  const getBarColor = (item: RankingItem) => {
    if (item.color) return item.color;
    if (item.status === "mastered") return "bg-teal-600 dark:bg-teal-500";
    if (item.status === "developing") return "bg-amber-500";
    if (item.status === "needs_improvement") return "bg-rose-500";
    if (item.status === "unassessed") return "bg-muted-foreground/30";

    if (benchmark !== undefined) {
      if (item.value >= benchmark) return "bg-teal-600 dark:bg-teal-500";
      if (item.value >= benchmark - 15) return "bg-amber-500";
      return "bg-rose-500";
    }

    return "bg-[#142B4A] dark:bg-blue-400";
  };

  return (
    <div className={cn("w-full space-y-4", className)} data-testid="horizontal-ranking-chart">
      {benchmark !== undefined && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pb-1 border-b border-border/40">
          <span>Client Need / Curriculum Domain</span>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>{benchmarkLabel}: <strong className="font-mono text-foreground">{benchmark}%</strong></span>
          </div>
        </div>
      )}

      <div className="space-y-3.5">
        {sortedItems.map((item, idx) => {
          const max = item.maxValue || 100;
          const percentage = Math.min(Math.max((item.value / max) * 100, 0), 100);
          const barColor = getBarColor(item);

          return (
            <div key={item.id || idx} className="space-y-1.5 group">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {item.label}
                  </span>
                  {getStatusBadge(item)}
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono">
                  {item.sublabel && (
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      {item.sublabel}
                    </span>
                  )}
                  <span className="font-bold text-foreground text-sm">
                    {valueFormatter(item.value)}
                  </span>
                </div>
              </div>

              {/* Progress bar container with benchmark tick */}
              <div className="relative w-full h-2.5 bg-muted/60 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", barColor)}
                  style={{ width: `${percentage}%` }}
                />
                {benchmark !== undefined && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-foreground/60 z-10"
                    style={{ left: `${(benchmark / max) * 100}%` }}
                    title={`${benchmarkLabel}: ${benchmark}%`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
