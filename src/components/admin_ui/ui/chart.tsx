"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: string;
    color?: string;
    icon?: React.ComponentType<{ className?: string }>;
  }
>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

export function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs text-muted-foreground",
          "[&_.recharts-cartesian-axis-tick_text]:fill-[var(--color-muted-foreground)]",
          "[&_.recharts-polar-angle-axis-tick_text]:fill-[var(--color-muted-foreground)]",
          "[&_.recharts-polar-radius-axis-tick_text]:fill-[var(--color-muted-foreground)]",
          "[&_.recharts-label]:fill-[var(--color-muted-foreground)]",
          "[&_.recharts-cartesian-grid_line]:stroke-[color-mix(in_srgb,var(--color-border)_50%,transparent)]",
          "[&_.recharts-cartesian-axis-line]:stroke-[var(--color-border)]",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-[var(--color-border)]",
          "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-layer]:outline-none",
          "[&_.recharts-radial-bar-background-sector]:fill-[var(--color-muted)]",
          "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-[var(--color-muted)]",
          "[&_.recharts-sector]:outline-none",
          "[&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <ChartThemeStyles id={chartId} />
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const entries = Object.entries(config).filter(([, v]) => v.color);
  if (!entries.length) return null;
  const css = entries
    .map(([key, item]) => `--color-${key}: ${item.color};`)
    .join("\n");
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[data-chart="${id}"]{${css}}`,
      }}
    />
  );
}

/** Ensures SVG axis/legend text follows light/dark theme tokens. */
function ChartThemeStyles({ id }: { id: string }) {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
[data-chart="${id}"] .recharts-cartesian-axis-tick text,
[data-chart="${id}"] .recharts-polar-angle-axis-tick text,
[data-chart="${id}"] .recharts-polar-radius-axis-tick text {
  fill: var(--color-muted-foreground) !important;
}
[data-chart="${id}"] .recharts-cartesian-grid line {
  stroke: color-mix(in srgb, var(--color-border) 50%, transparent);
}
[data-chart="${id}"] .recharts-cartesian-axis-line {
  stroke: var(--color-border);
}
`,
      }}
    />
  );
}

export const ChartTooltip = RechartsPrimitive.Tooltip;

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  className,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
  label?: string;
  labelFormatter?: (label: string) => string;
  className?: string;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;
  const displayLabel = labelFormatter && label ? labelFormatter(label) : label;
  return (
    <div
      className={cn(
        "grid min-w-[8rem] gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs shadow-md",
        className,
      )}
    >
      {displayLabel ? (
        <div className="font-medium text-foreground">{displayLabel}</div>
      ) : null}
      <div className="grid gap-1">
        {payload.map((item) => {
          const key = String(item.dataKey ?? item.name ?? "");
          const cfg = config[key];
          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{cfg?.label ?? item.name}</span>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ChartLegend = RechartsPrimitive.Legend;

export function ChartLegendContent({
  payload,
  className,
}: {
  payload?: Array<{ value?: string; color?: string }>;
  className?: string;
}) {
  const { config } = useChart();
  if (!payload?.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-4 pt-3", className)}>
      {payload.map((item) => {
        const key = String(item.value ?? "");
        const cfg = config[key];
        return (
          <div key={key} className="flex items-center gap-1.5 text-xs text-foreground/80">
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.color ?? cfg?.color }}
            />
            {cfg?.label ?? item.value}
          </div>
        );
      })}
    </div>
  );
}
