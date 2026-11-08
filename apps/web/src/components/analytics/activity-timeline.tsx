"use client";

import * as React from "react";
import {
  User,
  GraduationCap,
  CreditCard,
  FileCheck,
  ShieldAlert,
  Activity,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ChartEmptyState } from "./chart-states";

export interface ActivityEvent {
  id: string | number;
  actor: string;
  action: string;
  category: "User" | "Assessment" | "Monetization" | "Content" | "Security" | "System" | string;
  description?: string;
  timestamp: string | Date;
  status?: "success" | "warning" | "error" | "info";
}

export interface ActivityTimelineProps {
  events: ActivityEvent[];
  maxEvents?: number;
  emptyMessage?: string;
  className?: string;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  User: User,
  Assessment: GraduationCap,
  Monetization: CreditCard,
  Content: FileCheck,
  Security: ShieldAlert,
  System: Activity,
};

const categoryBadgeColors: Record<string, string> = {
  User: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  Assessment: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  Monetization: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Content: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  Security: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  System: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

export function ActivityTimeline({
  events,
  maxEvents = 10,
  emptyMessage = "No recent audit or activity events logged.",
  className,
}: ActivityTimelineProps) {
  if (!events || events.length === 0) {
    return <ChartEmptyState heightClass="h-full min-h-[200px]" description={emptyMessage} />;
  }

  const displayEvents = events.slice(0, maxEvents);

  const formatTime = (ts: string | Date) => {
    try {
      const d = typeof ts === "string" ? new Date(ts) : ts;
      if (isNaN(d.getTime())) return String(ts);

      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return String(ts);
    }
  };

  return (
    <div className={cn("space-y-4", className)} data-testid="activity-timeline">
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
        {displayEvents.map((event) => {
          const Icon = categoryIcons[event.category] || Activity;
          const badgeClass =
            categoryBadgeColors[event.category] ||
            "bg-muted text-muted-foreground border-border/40";

          return (
            <div key={event.id} className="relative group">
              {/* Timeline marker */}
              <div className="absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background border-2 border-primary/60 group-hover:border-primary transition-colors">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn("text-[10px] py-0 px-2 font-medium border", badgeClass)}>
                    <Icon className="h-3 w-3 mr-1 inline-block" />
                    {event.category}
                  </Badge>
                  <span className="font-semibold text-foreground">{event.action}</span>
                  <span className="text-muted-foreground">by</span>
                  <span className="font-mono text-foreground/80 bg-muted/60 px-1.5 py-0.5 rounded text-[11px]">
                    {event.actor}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-muted-foreground font-mono text-[11px] shrink-0">
                  <Clock className="h-3 w-3 opacity-60" />
                  <span>{formatTime(event.timestamp)}</span>
                </div>
              </div>

              {event.description && (
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed pl-1">
                  {event.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
