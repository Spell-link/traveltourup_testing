"use client";

import Link from "next/link";
import type { DashboardSnapshot } from "@/lib/admin/admin-dashboard.types";
import { DashboardKpiCard } from "@/components/admin/dashboard/dashboard-kpi-card";
import { ChartCard } from "@/components/admin/dashboard/charts/chart-card";
import { TimeSeriesAreaChart } from "@/components/admin/dashboard/charts/time-series-area-chart";
import { bookingStatusChartConfig } from "@/lib/admin/dashboard-chart-config";

type Props = { snapshot: DashboardSnapshot };

export function PlatformOverviewSection({ snapshot }: Props) {
  const { overview, flights } = snapshot;
  const overviewKpis = [
    { id: "gmv", title: "Customer revenue", value: overview.flightGmv, subtitle: overview.primaryCurrency },
    { id: "bookings", title: "Flight bookings", value: String(overview.totalFlightBookings) },
    { id: "users", title: "New users", value: String(overview.newUsers) },
    {
      id: "conversion",
      title: "Search conversion",
      value: `${overview.searchConversionPct.toFixed(1)}%`,
    },
    {
      id: "ops",
      title: "Ops alerts",
      value: String(overview.opsAlerts),
      variant: overview.opsAlerts > 0 ? ("warning" as const) : ("default" as const),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {overviewKpis.map((m) => (
          <DashboardKpiCard key={m.id} metric={m} />
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/admin/flights" className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
          Flights
        </Link>
        <Link href="/admin/flights/revenue" className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
          Revenue
        </Link>
        <Link href="/admin/flights/ledger" className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
          Ledger
        </Link>
        <Link href="/admin/users" className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
          Users
        </Link>
        <Link href="/admin/bookings" className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
          Bookings
        </Link>
      </div>

      <ChartCard
        title="Flight booking volume"
        description="Live bookings by status — use the Flights tab for full analytics."
        tall
      >
        <TimeSeriesAreaChart
          data={flights.bookingVolumeSeries}
          config={bookingStatusChartConfig}
          dataKeys={["confirmed", "pending", "cancelled", "failed"]}
          stacked
        />
      </ChartCard>
    </div>
  );
}
