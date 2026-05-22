"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/admin_ui/ui/chart";
import type { DistributionSlice } from "@/lib/admin/admin-dashboard.types";
import { chartPaletteColor, withChartPalette } from "@/lib/admin/dashboard-chart-config";

type Props = {
  data: DistributionSlice[];
  config?: ChartConfig;
};

function resolveSliceColor(
  entry: DistributionSlice,
  index: number,
  config: ChartConfig,
): string {
  return entry.fill ?? config[entry.name]?.color ?? chartPaletteColor(index);
}

export function DistributionPieChart({ data, config = {} }: Props) {
  const colored = withChartPalette(data);
  if (!colored.length) {
    return (
      <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No data
      </p>
    );
  }

  const mergedConfig: ChartConfig = { ...config };
  colored.forEach((d, i) => {
    mergedConfig[d.name] = {
      label: config[d.name]?.label ?? d.name,
      color: resolveSliceColor(d, i, mergedConfig),
    };
  });

  return (
    <ChartContainer config={mergedConfig} className="mx-auto h-full max-h-[280px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent />} />
        <Pie
          data={colored}
          dataKey="value"
          nameKey="name"
          innerRadius="58%"
          outerRadius="82%"
          paddingAngle={3}
          stroke="var(--color-background)"
          strokeWidth={2}
        >
          {colored.map((entry, i) => (
            <Cell
              key={entry.name}
              fill={resolveSliceColor(entry, i, mergedConfig)}
            />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartContainer>
  );
}
