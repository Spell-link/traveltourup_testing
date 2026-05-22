"use client";

import type { FlightsDashboardData } from "@/lib/admin/admin-dashboard.types";
import { DashboardSection } from "@/components/admin/dashboard/dashboard-section";
import { DashboardKpiGrid } from "@/components/admin/dashboard/dashboard-kpi-card";
import { ChartCard } from "@/components/admin/dashboard/charts/chart-card";
import { TimeSeriesAreaChart } from "@/components/admin/dashboard/charts/time-series-area-chart";
import { DistributionPieChart } from "@/components/admin/dashboard/charts/distribution-pie-chart";
import { HorizontalBarChart } from "@/components/admin/dashboard/charts/horizontal-bar-chart";
import { StackedBarChart } from "@/components/admin/dashboard/charts/stacked-bar-chart";
import {
  bookingStatusChartConfig,
  flightRevenueStackChartConfig,
} from "@/lib/admin/dashboard-chart-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin_ui/ui/card";

type Props = { data: FlightsDashboardData };

export function FlightsAnalyticsSection({ data }: Props) {
  const ledgerConfig = {
    refund_initiated: { label: "Refund initiated", color: "#f59e0b" },
    refund_succeeded: { label: "Refund succeeded", color: "#059669" },
    refund_failed: { label: "Refund failed", color: "#ef4444" },
    order_failed: { label: "Order failed", color: "#ef4444" },
    cancel_confirmed: { label: "Cancel confirmed", color: "#8b5cf6" },
  };

  return (
    <DashboardSection
      title="Flights"
      description="Booking saga, payments, refunds, and operational health from production data."
      meta={data.meta}
    >
      <DashboardKpiGrid metrics={data.kpis} cols={4} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Booking volume" description="Stacked by booking status" tall>
          <TimeSeriesAreaChart
            data={data.bookingVolumeSeries}
            config={bookingStatusChartConfig}
            dataKeys={["confirmed", "pending", "cancelled", "failed"]}
            stacked
          />
        </ChartCard>
        <ChartCard
          title="Revenue breakdown"
          description="Customer charges vs commission, Duffel cost, and payment fees"
          tall
        >
          <StackedBarChart
            data={data.revenueStackSeries}
            config={flightRevenueStackChartConfig}
            dataKeys={["customer_revenue", "commission", "duffel_cost", "duffel_fee"]}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ChartCard title="Booking status">
          <DistributionPieChart data={data.bookingStatusMix} config={bookingStatusChartConfig} />
        </ChartCard>
        <ChartCard title="Payment status">
          <HorizontalBarChart data={data.paymentStatusMix} />
        </ChartCard>
        <ChartCard title="Payment intent funnel">
          <HorizontalBarChart data={data.paymentIntentFunnel} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Cancellations" description="Order cancellation status">
          <HorizontalBarChart data={data.cancellationMix} />
        </ChartCard>
        <ChartCard title="Refund attempts" description="Card refund settlement attempts">
          <HorizontalBarChart data={data.refundAttemptMix} />
        </ChartCard>
      </div>

      <ChartCard title="Financial ledger events" description="Money-moving saga events per period" tall>
        <StackedBarChart
          data={data.ledgerEventSeries}
          config={ledgerConfig}
          dataKeys={[
            "refund_initiated",
            "refund_succeeded",
            "refund_failed",
            "order_failed",
            "cancel_confirmed",
          ]}
        />
      </ChartCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OpsCard title="Orphan PIT queue" value={data.ops.orphanPitCount} href="/admin/flights/orphan-pit" />
        <OpsCard title="Post-capture failures" value={data.ops.postCaptureFailedCount} href="/admin/flights/orphan-pit" />
        <OpsCard title="Unprocessed webhooks" value={data.ops.unprocessedWebhooks} href="/admin/flights/webhooks" />
        <OpsCard title="Refund failed bookings" value={data.ops.refundFailedBookings} href="/admin/flights" />
      </div>
    </DashboardSection>
  );
}

function OpsCard({ title, value, href }: { title: string; value: number; href: string }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <a href={href} className="mt-2 inline-block text-xs text-primary hover:underline">
          Investigate →
        </a>
      </CardContent>
    </Card>
  );
}
