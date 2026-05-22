/** Theme-aware Recharts styling — use CSS variables, never hsl(var(--hex)). */

export const CHART_TICK = {
  fill: "var(--color-muted-foreground)",
  fontSize: 12,
};

export const CHART_AXIS_LINE = {
  stroke: "var(--color-border)",
};

export const CHART_GRID_STROKE = "color-mix(in srgb, var(--color-border) 50%, transparent)";
