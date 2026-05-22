"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/admin_ui/ui/chart";
import type { DistributionSlice } from "@/lib/admin/admin-dashboard.types";
import { CHART_AXIS_LINE, CHART_GRID_STROKE, CHART_TICK } from "@/lib/admin/chart-theme";
import { chartPaletteColor, withChartPalette } from "@/lib/admin/dashboard-chart-config";

type Props = {
  data: DistributionSlice[];
  config?: ChartConfig;
};

function resolveBarColor(
  entry: DistributionSlice,
  index: number,
  config: ChartConfig,
): string {
  return entry.fill ?? config[entry.name]?.color ?? chartPaletteColor(index);
}

export function HorizontalBarChart({ data, config = {} }: Props) {
  const colored = withChartPalette(data);
  if (!colored.length) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No data
      </p>
    );
  }

  const mergedConfig: ChartConfig = { value: { label: "Amount" }, ...config };
  colored.forEach((d, i) => {
    mergedConfig[d.name] = {
      label: d.name,
      color: resolveBarColor(d, i, mergedConfig),
    };
  });

  return (
    <ChartContainer config={mergedConfig} className="h-full w-full">
      <BarChart
        data={colored}
        layout="vertical"
        margin={{ left: 4, right: 16, top: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_STROKE} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={CHART_AXIS_LINE}
          tick={CHART_TICK}
        />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={CHART_AXIS_LINE}
          width={108}
          tick={CHART_TICK}
          tickFormatter={(v) => (String(v).length > 14 ? `${String(v).slice(0, 12)}…` : v)}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
          {colored.map((entry, i) => (
            <Cell key={entry.name} fill={resolveBarColor(entry, i, mergedConfig)} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
