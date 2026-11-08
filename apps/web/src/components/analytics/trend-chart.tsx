"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { ChartEmptyState } from "./chart-states";
import { BrandedChartTooltip } from "./chart-tooltip";

export interface TrendSeriesConfig {
  key: string;
  name: string;
  color?: string;
  fillOpacity?: number;
  type?: "area" | "line";
  strokeDasharray?: string;
}

export interface TrendChartProps {
  data: Record<string, any>[];
  xKey?: string;
  series: TrendSeriesConfig[];
  height?: number | string;
  yAxisFormatter?: (value: number) => string;
  xAxisFormatter?: (value: string) => string;
  targetBenchmark?: { value: number; label: string; color?: string };
  emptyMessage?: string;
  showLegend?: boolean;
  showGrid?: boolean;
}

const defaultColors = [
  "#0D9488", // Medical teal
  "#142B4A", // Prepford navy
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#EC4899", // Rose
];

export function TrendChart({
  data,
  xKey = "date",
  series,
  height = "100%",
  yAxisFormatter,
  xAxisFormatter,
  targetBenchmark,
  emptyMessage = "No trend data points found for this selection.",
  showLegend = true,
  showGrid = true,
}: TrendChartProps) {
  if (!data || data.length === 0) {
    return <ChartEmptyState heightClass="h-full min-h-[220px]" description={emptyMessage} />;
  }

  // Format default x-axis dates if needed
  const formatX = xAxisFormatter || ((val: string) => {
    if (!val) return "";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return `${d.getMonth() + 1}/${d.getDate()}`;
    } catch {
      return val;
    }
  });

  const formatY = yAxisFormatter || ((val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return val.toString();
  });

  return (
    <div className="w-full h-full min-h-[220px]" data-testid="trend-chart-container">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            {series.map((s, idx) => {
              const color = s.color || defaultColors[idx % defaultColors.length];
              const gradId = `gradient-${s.key}-${idx}`;
              return (
                <linearGradient key={gradId} id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={s.fillOpacity ?? 0.35} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                </linearGradient>
              );
            })}
          </defs>

          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
          )}

          <XAxis
            dataKey={xKey}
            tickFormatter={formatX}
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "hsl(var(--border))", opacity: 0.6 }}
            dy={8}
          />

          <YAxis
            tickFormatter={formatY}
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dx={-4}
          />

          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-xl border border-border/80 bg-popover/95 p-3 text-popover-foreground shadow-md backdrop-blur-sm text-xs">
                  <div className="font-semibold text-foreground border-b border-border/40 pb-1.5 mb-2">
                    {label ? formatX(label) : "Point Data"}
                  </div>
                  <div className="space-y-1">
                    {payload.map((p, i) => (
                      <div key={i} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: p.color }}
                          />
                          <span className="text-muted-foreground">{p.name}:</span>
                        </div>
                        <span className="font-mono font-semibold text-foreground">
                          {formatY ? formatY(Number(p.value)) : Number(p.value).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }}
          />

          {showLegend && (
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ fontSize: "11px", paddingBottom: "12px" }}
            />
          )}

          {targetBenchmark && (
            <ReferenceLine
              y={targetBenchmark.value}
              stroke={targetBenchmark.color || "#10B981"}
              strokeDasharray="4 4"
              label={{
                value: targetBenchmark.label,
                fill: targetBenchmark.color || "#10B981",
                fontSize: 10,
                position: "insideTopRight",
              }}
            />
          )}

          {series.map((s, idx) => {
            const color = s.color || defaultColors[idx % defaultColors.length];
            const gradId = `gradient-${s.key}-${idx}`;

            if (s.type === "line") {
              return (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray={s.strokeDasharray}
                  dot={{ r: 3, fill: color, strokeWidth: 1 }}
                  activeDot={{ r: 5, stroke: "hsl(var(--background))", strokeWidth: 2 }}
                />
              );
            }

            return (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={color}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#${gradId})`}
                dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
                activeDot={{ r: 5, stroke: "hsl(var(--background))", strokeWidth: 2 }}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
