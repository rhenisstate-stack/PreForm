"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ChartEmptyState } from "./chart-states";

export interface BarSeriesConfig {
  key: string;
  name: string;
  color?: string;
  stackId?: string;
  radius?: [number, number, number, number];
}

export interface BarComparisonChartProps {
  data: Record<string, any>[];
  xKey?: string;
  series: BarSeriesConfig[];
  height?: number | string;
  yAxisFormatter?: (value: number) => string;
  xAxisFormatter?: (value: string) => string;
  emptyMessage?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  layout?: "horizontal" | "vertical";
}

const defaultColors = [
  "#142B4A", // Prepford navy
  "#0D9488", // Teal
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#3B82F6", // Blue
  "#10B981", // Emerald
];

export function BarComparisonChart({
  data,
  xKey = "name",
  series,
  height = "100%",
  yAxisFormatter,
  xAxisFormatter,
  emptyMessage = "No comparative data points available.",
  showLegend = true,
  showGrid = true,
  layout = "horizontal",
}: BarComparisonChartProps) {
  if (!data || data.length === 0) {
    return <ChartEmptyState heightClass="h-full min-h-[220px]" description={emptyMessage} />;
  }

  const isVertical = layout === "vertical";

  const formatVal = (val: number) => {
    if (yAxisFormatter) return yAxisFormatter(val);
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return val.toString();
  };

  return (
    <div className="w-full h-full min-h-[220px]" data-testid="bar-comparison-chart-container">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={layout}
          margin={{ top: 10, right: 10, left: isVertical ? 20 : -10, bottom: 0 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={!isVertical}
              vertical={isVertical}
              stroke="hsl(var(--border))"
              opacity={0.4}
            />
          )}

          {isVertical ? (
            <>
              <XAxis
                type="number"
                tickFormatter={formatVal}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey={xKey}
                tickFormatter={xAxisFormatter}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))", opacity: 0.6 }}
                width={85}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={xKey}
                tickFormatter={xAxisFormatter}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))", opacity: 0.6 }}
                dy={8}
              />
              <YAxis
                tickFormatter={formatVal}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dx={-4}
              />
            </>
          )}

          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-xl border border-border/80 bg-popover/95 p-3 text-popover-foreground shadow-md backdrop-blur-sm text-xs">
                  <div className="font-semibold text-foreground border-b border-border/40 pb-1.5 mb-2">
                    {label}
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
                          {formatVal(Number(p.value))}
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

          {series.map((s, idx) => {
            const color = s.color || defaultColors[idx % defaultColors.length];
            const radius = s.radius || (s.stackId ? [0, 0, 0, 0] : [4, 4, 0, 0]);

            return (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill={color}
                stackId={s.stackId}
                radius={radius}
                maxBarSize={48}
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
