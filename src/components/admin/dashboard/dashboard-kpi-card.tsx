import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin_ui/ui/card";
import { cn } from "@/lib/utils";
import type { KpiMetric } from "@/lib/admin/admin-dashboard.types";

const variantBorder: Record<NonNullable<KpiMetric["variant"]>, string> = {
  default: "border-border",
  success: "border-emerald-200 dark:border-emerald-900",
  warning: "border-amber-200 dark:border-amber-900",
  danger: "border-rose-200 dark:border-rose-900",
};

export function DashboardKpiCard({ metric }: { metric: KpiMetric }) {
  const v = metric.variant ?? "default";
  return (
    <Card className={cn("shadow-sm", variantBorder[v])}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{metric.value}</p>
        {metric.subtitle ? (
          <p className="mt-1 text-xs text-muted-foreground">{metric.subtitle}</p>
        ) : null}
        {metric.trend ? (
          <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">{metric.trend}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

const kpiGridCols: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
};

export function DashboardKpiGrid({
  metrics,
  cols = 4,
}: {
  metrics: KpiMetric[];
  cols?: 2 | 3 | 4 | 5;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-4", kpiGridCols[cols] ?? kpiGridCols[4])}>
      {metrics.map((m) => (
        <DashboardKpiCard key={m.id} metric={m} />
      ))}
    </div>
  );
}