"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
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
  leftKey: string;
  rightKey: string;
};

export function DualMetricLineChart({ data, config, leftKey, rightKey }: Props) {
  if (!data.length) {
    return <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No data in range</p>;
  }
  return (
    <ChartContainer config={config} className="h-full w-full">
      <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
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
        <YAxis yAxisId="left" tickLine={false} axisLine={CHART_AXIS_LINE} width={56} tick={CHART_TICK} tickMargin={8} />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickLine={false}
          axisLine={CHART_AXIS_LINE}
          width={56}
          tick={CHART_TICK}
          tickMargin={8}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey={leftKey}
          stroke={`var(--color-${leftKey})`}
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey={rightKey}
          stroke={`var(--color-${rightKey})`}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
