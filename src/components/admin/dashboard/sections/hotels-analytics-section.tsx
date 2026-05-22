"use client";

import type { HotelsDashboardData } from "@/lib/admin/admin-dashboard.types";
import { DashboardSection } from "@/components/admin/dashboard/dashboard-section";
import { DashboardKpiGrid } from "@/components/admin/dashboard/dashboard-kpi-card";
import { ChartCard } from "@/components/admin/dashboard/charts/chart-card";
import { TimeSeriesAreaChart } from "@/components/admin/dashboard/charts/time-series-area-chart";
import { DistributionPieChart } from "@/components/admin/dashboard/charts/distribution-pie-chart";
import { HorizontalBarChart } from "@/components/admin/dashboard/charts/horizontal-bar-chart";
import {
  CHART_COLORS,
  hotelStarRatingChartConfig,
  hotelStatusChartConfig,
} from "@/lib/admin/dashboard-chart-config";

type Props = { data: HotelsDashboardData };

const bookingsConfig = {
  bookings: { label: "Bookings", color: CHART_COLORS.primary },
};

export function HotelsAnalyticsSection({ data }: Props) {
  return (
    <DashboardSection
      title="Hotels"
      description="Sample stays metrics until hotel booking analytics are connected to live data."
      meta={data.meta}
    >
      <DashboardKpiGrid metrics={data.kpis} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Bookings over time" tall>
          <TimeSeriesAreaChart
            data={data.bookingsSeries}
            config={bookingsConfig}
            dataKeys={["bookings"]}
          />
        </ChartCard>
        <ChartCard title="Revenue by destination">
          <HorizontalBarChart data={data.revenueByDestination} />
        </ChartCard>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Star rating mix">
          <DistributionPieChart data={data.starRatingMix} config={hotelStarRatingChartConfig} />
        </ChartCard>
        <ChartCard title="Booking status">
          <DistributionPieChart data={data.statusMix} config={hotelStatusChartConfig} />
        </ChartCard>
      </div>
    </DashboardSection>
  );
}
