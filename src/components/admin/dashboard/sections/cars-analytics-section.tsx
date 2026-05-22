"use client";

import type { CarsDashboardData } from "@/lib/admin/admin-dashboard.types";
import { DashboardSection } from "@/components/admin/dashboard/dashboard-section";
import { DashboardKpiGrid } from "@/components/admin/dashboard/dashboard-kpi-card";
import { ChartCard } from "@/components/admin/dashboard/charts/chart-card";
import { TimeSeriesAreaChart } from "@/components/admin/dashboard/charts/time-series-area-chart";
import { DistributionPieChart } from "@/components/admin/dashboard/charts/distribution-pie-chart";
import { HorizontalBarChart } from "@/components/admin/dashboard/charts/horizontal-bar-chart";
import {
  CHART_COLORS,
  carTransmissionChartConfig,
  carWeekdayChartConfig,
} from "@/lib/admin/dashboard-chart-config";

type Props = { data: CarsDashboardData };

const rentalsConfig = {
  rentals: { label: "Rentals", color: CHART_COLORS.primary },
};

export function CarsAnalyticsSection({ data }: Props) {
  return (
    <DashboardSection
      title="Cars"
      description="Sample rental metrics until car bookings are connected to live data."
      meta={data.meta}
    >
      <DashboardKpiGrid metrics={data.kpis} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Rentals over time" tall>
          <TimeSeriesAreaChart
            data={data.rentalsSeries}
            config={rentalsConfig}
            dataKeys={["rentals"]}
          />
        </ChartCard>
        <ChartCard title="Revenue by airport">
          <HorizontalBarChart data={data.revenueByAirport} />
        </ChartCard>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Transmission">
          <DistributionPieChart data={data.transmissionMix} config={carTransmissionChartConfig} />
        </ChartCard>
        <ChartCard title="Weekday vs weekend">
          <DistributionPieChart data={data.weekdayWeekendMix} config={carWeekdayChartConfig} />
        </ChartCard>
      </div>
    </DashboardSection>
  );
}
