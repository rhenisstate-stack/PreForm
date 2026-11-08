"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface AnalyticsKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  changePercent?: number | null;
  changeLabel?: string;
  invertTrendColor?: boolean; // If true, negative is green and positive is red (e.g. failure rate)
  variant?: "default" | "primary" | "teal" | "emerald" | "amber" | "violet" | "rose";
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

const variantStyles: Record<string, { iconBg: string; iconColor: string; borderAccent?: string }> = {
  default: {
    iconBg: "bg-muted/80 text-muted-foreground",
    iconColor: "text-foreground",
  },
  primary: {
    iconBg: "bg-[#142B4A]/10 dark:bg-[#142B4A]/40 text-[#142B4A] dark:text-blue-300",
    iconColor: "text-[#142B4A] dark:text-blue-300",
  },
  teal: {
    iconBg: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
  emerald: {
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  violet: {
    iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  rose: {
    iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
};

export function AnalyticsKpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  changePercent,
  changeLabel,
  invertTrendColor = false,
  variant = "default",
  loading = false,
  className,
  onClick,
}: AnalyticsKpiCardProps) {
  if (loading) {
    return (
      <Card
        className={cn("p-5 border-border/60 bg-card/60 backdrop-blur-sm", className)}
        data-testid="analytics-kpi-card-loading"
      >
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <div className="mt-3">
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="mt-2">
          <Skeleton className="h-3 w-36" />
        </div>
      </Card>
    );
  }

  const vStyle = variantStyles[variant] || variantStyles.default;

  // Determine trend badge
  let trendBadge: React.ReactNode = null;
  if (typeof changePercent === "number" && !isNaN(changePercent)) {
    const isZero = Math.abs(changePercent) < 0.01;
    const isPositive = changePercent > 0;
    const isGood = invertTrendColor ? !isPositive : isPositive;

    const badgeColor = isZero
      ? "bg-muted text-muted-foreground"
      : isGood
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";

    const TrendIcon = isZero ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;

    trendBadge = (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold border",
          badgeColor
        )}
      >
        <TrendIcon className="h-3 w-3" />
        <span>{Math.abs(changePercent).toFixed(1)}%</span>
      </span>
    );
  }

  return (
    <Card
      className={cn(
        "p-5 border-border/60 bg-card/60 backdrop-blur-sm transition-all hover:border-border hover:shadow-sm",
        onClick && "cursor-pointer hover:bg-card/90",
        className
      )}
      onClick={onClick}
      data-testid="analytics-kpi-card"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground line-clamp-1">
          {title}
        </span>
        {Icon && (
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg p-2", vStyle.iconBg)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        {trendBadge}
      </div>

      {(subtitle || changeLabel) && (
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1">
          {changeLabel && <span className="font-medium text-foreground/80 mr-1">{changeLabel}</span>}
          {subtitle}
        </p>
      )}
    </Card>
  );
}
