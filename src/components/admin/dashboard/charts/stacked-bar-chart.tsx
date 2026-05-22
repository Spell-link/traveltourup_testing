"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/admin_ui/ui/chart";
import type { TimeSeriesPoint } from "@/lib/admin/admin-dashboard.types";
import { CHART_AXIS_LINE, CHART_GRID_STROKE, CHART_TICK } from "@/lib/admin/chart-theme";

type Props = {
  data: TimeSeriesPoint[];
  config: ChartConfig;
  dataKeys: string[];
};

export function StackedBarChart({ data, config, dataKeys }: Props) {
  if (!data.length) {
    return <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No data in range</p>;
  }
  return (
    <ChartContainer config={config} className="h-full w-full">
      <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={CHART_AXIS_LINE}
          tick={CHART_TICK}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(v) => String(v).slice(5)}
        />
        <YAxis tickLine={false} axisLine={CHART_AXIS_LINE} width={48} tick={CHART_TICK} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {dataKeys.map((key) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="stack"
            fill={`var(--color-${key})`}
            radius={[2, 2, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
