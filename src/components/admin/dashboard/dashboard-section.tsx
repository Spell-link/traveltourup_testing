import { Badge } from "@/components/admin_ui/ui/badge";
import type { DataSourceMeta } from "@/lib/admin/admin-dashboard.types";

type Props = {
  title: string;
  description?: string;
  meta?: DataSourceMeta;
  children: React.ReactNode;
};

export function DashboardSection({ title, description, meta, children }: Props) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {meta?.source === "mock" ? (
          <Badge variant="secondary">{meta.label ?? "Preview data"}</Badge>
        ) : meta?.source === "live" ? (
          <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400">
            Live data
          </Badge>
        ) : null}
      </div>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {children}
    </section>
  );
}
