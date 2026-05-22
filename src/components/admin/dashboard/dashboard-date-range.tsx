"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { AdminDashboardQuery } from "@/lib/validations/admin-dashboard.schema";
import { Button } from "@/components/admin_ui/ui/button";

const RANGES: { value: AdminDashboardQuery["range"]; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "ytd", label: "YTD" },
];

type Props = {
  query: AdminDashboardQuery;
  rangeLabel: string;
};

export function DashboardDateRange({ query, rangeLabel }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const navigate = useCallback(
    (patch: Partial<AdminDashboardQuery>) => {
      const q = { ...query, ...patch };
      const u = new URLSearchParams();
      u.set("range", q.range);
      u.set("granularity", q.granularity);
      startTransition(() => {
        router.push(`/admin?${u.toString()}`);
      });
    },
    [query, router, startTransition],
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">{rangeLabel}</span>
      <div className="inline-flex rounded-md border border-border p-0.5">
        {RANGES.map((r) => (
          <Button
            key={r.value}
            type="button"
            size="sm"
            variant={query.range === r.value ? "default" : "ghost"}
            className="h-8 px-3"
            disabled={pending}
            onClick={() => navigate({ range: r.value })}
          >
            {r.label}
          </Button>
        ))}
      </div>
      <div className="inline-flex rounded-md border border-border p-0.5">
        <Button
          type="button"
          size="sm"
          variant={query.granularity === "day" ? "default" : "ghost"}
          className="h-8 px-3"
          disabled={pending}
          onClick={() => navigate({ granularity: "day" })}
        >
          Daily
        </Button>
        <Button
          type="button"
          size="sm"
          variant={query.granularity === "week" ? "default" : "ghost"}
          className="h-8 px-3"
          disabled={pending}
          onClick={() => navigate({ granularity: "week" })}
        >
          Weekly
        </Button>
      </div>
    </div>
  );
}
