"use client";

import type { UsersDashboardData } from "@/lib/admin/admin-dashboard.types";
import { DashboardSection } from "@/components/admin/dashboard/dashboard-section";
import { DashboardKpiGrid } from "@/components/admin/dashboard/dashboard-kpi-card";
import { ChartCard } from "@/components/admin/dashboard/charts/chart-card";
import { TimeSeriesAreaChart } from "@/components/admin/dashboard/charts/time-series-area-chart";
import { DistributionPieChart } from "@/components/admin/dashboard/charts/distribution-pie-chart";

type Props = { data: UsersDashboardData };

const regConfig = {
  registrations: { label: "Registrations", color: "#0e90c7" },
};

const bookersConfig = {
  bookers: { label: "Active bookers", color: "#059669" },
};

export function UsersAnalyticsSection({ data }: Props) {
  return (
    <DashboardSection
      title="Users"
      description="Registrations and flight bookers in the selected period."
      meta={data.meta}
    >
      <DashboardKpiGrid metrics={data.kpis} cols={2} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="New registrations" tall>
          <TimeSeriesAreaChart
            data={data.registrationSeries}
            config={regConfig}
            dataKeys={["registrations"]}
          />
        </ChartCard>
        <ChartCard title="Customers with flight bookings" description="Distinct bookers per period" tall>
          <TimeSeriesAreaChart
            data={data.activeBookersSeries}
            config={bookersConfig}
            dataKeys={["bookers"]}
          />
        </ChartCard>
      </div>
      <ChartCard title="Role distribution">
        <DistributionPieChart data={data.roleDistribution} />
      </ChartCard>
    </DashboardSection>
  );
}
