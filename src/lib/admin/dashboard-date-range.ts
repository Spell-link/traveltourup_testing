import type { TimeSeriesPoint } from "@/lib/admin/admin-dashboard.types";
import type { AdminDashboardQuery } from "@/lib/validations/admin-dashboard.schema";

export type ResolvedDashboardRange = {
  from: Date;
  to: Date;
  label: string;
};

export function resolveDashboardRange(query: AdminDashboardQuery): ResolvedDashboardRange {
  const to = new Date();
  const from = new Date(to);

  switch (query.range) {
    case "7d":
      from.setUTCDate(from.getUTCDate() - 7);
      return { from, to, label: "Last 7 days" };
    case "90d":
      from.setUTCDate(from.getUTCDate() - 90);
      return { from, to, label: "Last 90 days" };
    case "ytd":
      from.setUTCMonth(0, 1);
      from.setUTCHours(0, 0, 0, 0);
      return { from, to, label: "Year to date" };
    case "30d":
    default:
      from.setUTCDate(from.getUTCDate() - 30);
      return { from, to, label: "Last 30 days" };
  }
}

/** Cap buckets; auto week granularity for long ranges when still on day. */
export function effectiveGranularity(
  query: AdminDashboardQuery,
  from: Date,
  to: Date,
): "day" | "week" {
  if (query.granularity === "week") return "week";
  const days = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  return days > 90 ? "week" : "day";
}

export function pgTruncUnit(granularity: "day" | "week"): "day" | "week" {
  return granularity;
}

export function formatBucketDate(d: Date, granularity: "day" | "week"): string {
  if (granularity === "week") {
    return d.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

export function fillTimeSeriesGaps(
  points: TimeSeriesPoint[],
  from: Date,
  to: Date,
  granularity: "day" | "week",
  keys: string[],
): TimeSeriesPoint[] {
  const map = new Map(points.map((p) => [p.date, p]));
  const out: TimeSeriesPoint[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  const step = granularity === "week" ? 7 : 1;

  while (cursor <= to) {
    const key = formatBucketDate(cursor, granularity);
    const existing = map.get(key);
    const row: TimeSeriesPoint = { date: key };
    for (const k of keys) {
      row[k] = existing?.[k] ?? 0;
    }
    out.push(row);
    cursor.setUTCDate(cursor.getUTCDate() + step);
    if (out.length > 120) break;
  }
  return out;
}
