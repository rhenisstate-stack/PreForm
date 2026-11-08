"use client";

import * as React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { ChartEmptyState } from "./chart-states";

export interface DonutDataItem {
  name: string;
  value: number;
  color?: string;
  percentage?: number;
}

export interface DonutDistributionChartProps {
  data: DonutDataItem[];
  centerLabel?: string;
  centerValue?: string | number;
  height?: number | string;
  innerRadius?: number | string;
  outerRadius?: number | string;
  emptyMessage?: string;
  showLegend?: boolean;
}

const defaultPalette = [
  "#142B4A", // Prepford navy
  "#0D9488", // Medical teal
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#EC4899", // Rose
  "#64748B", // Slate
];

export function DonutDistributionChart({
  data,
  centerLabel,
  centerValue,
  height = "100%",
  innerRadius = "68%",
  outerRadius = "88%",
  emptyMessage = "No distribution data available.",
  showLegend = true,
}: DonutDistributionChartProps) {
  const total = React.useMemo(() => {
    return data?.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0) || 0;
  }, [data]);

  if (!data || data.length === 0 || total === 0) {
    return <ChartEmptyState heightClass="h-full min-h-[220px]" description={emptyMessage} />;
  }

  const enrichedData = data.map((d, idx) => ({
    ...d,
    color: d.color || defaultPalette[idx % defaultPalette.length],
    percentage: d.percentage ?? (total > 0 ? (d.value / total) * 100 : 0),
  }));

  const displayCenterValue = centerValue !== undefined ? centerValue : total.toLocaleString();

  return (
    <div className="w-full h-full min-h-[220px] flex flex-col md:flex-row items-center justify-center gap-6" data-testid="donut-chart-container">
      <div className="relative w-full max-w-[240px] aspect-square flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={enrichedData}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={3}
              dataKey="value"
            >
              {enrichedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as DonutDataItem;
                const pct = d.percentage ? d.percentage.toFixed(1) : ((d.value / total) * 100).toFixed(1);
                return (
                  <div className="rounded-xl border border-border/80 bg-popover/95 p-3 text-popover-foreground shadow-md backdrop-blur-sm text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="font-semibold text-foreground">{d.name}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-4 font-mono">
                      <span className="text-muted-foreground">{d.value.toLocaleString()} items</span>
                      <span className="font-bold text-foreground">{pct}%</span>
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label & value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {displayCenterValue}
          </span>
          {centerLabel && (
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mt-0.5">
              {centerLabel}
            </span>
          )}
        </div>
      </div>

      {/* Legend list */}
      {showLegend && (
        <div className="w-full md:w-auto flex-1 max-w-xs space-y-2">
          {enrichedData.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-none">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-muted-foreground font-medium">{item.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 font-mono">
                <span className="text-foreground/80">{item.value.toLocaleString()}</span>
                <span className="w-12 text-right font-semibold text-muted-foreground">
                  {item.percentage ? item.percentage.toFixed(1) : ((item.value / total) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
