"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { DashboardSnapshot } from "@/lib/admin/admin-dashboard.types";
import PageHeader from "@/components/admin_ui/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/admin_ui/ui/tabs";
import { DashboardDateRange } from "@/components/admin/dashboard/dashboard-date-range";
import { PlatformOverviewSection } from "@/components/admin/dashboard/sections/platform-overview-section";
import { FlightsAnalyticsSection } from "@/components/admin/dashboard/sections/flights-analytics-section";
import { UsersAnalyticsSection } from "@/components/admin/dashboard/sections/users-analytics-section";
import { HotelsAnalyticsSection } from "@/components/admin/dashboard/sections/hotels-analytics-section";
import { CarsAnalyticsSection } from "@/components/admin/dashboard/sections/cars-analytics-section";

type Props = {
  snapshot: DashboardSnapshot;
};

export function AdminDashboard({ snapshot }: Props) {
  const router = useRouter();
  const [isRefreshPending, startRefreshTransition] = useTransition();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Platform analytics — flights and users use live data; hotels and cars show preview metrics."
        showAddButton={false}
        showFilterButton={false}
        showRefreshButton
        onRefresh={() => {
          startRefreshTransition(() => router.refresh());
        }}
        isRefreshing={isRefreshPending}
      />

     

        <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <DashboardDateRange query={snapshot.query} rangeLabel={snapshot.rangeLabel} />
          <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/50 p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="flights">Flights</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="hotels">Hotels</TabsTrigger>
            <TabsTrigger value="cars">Cars</TabsTrigger>
          </TabsList>
        </div>
          <TabsContent value="overview">
            <PlatformOverviewSection snapshot={snapshot} />
          </TabsContent>
          <TabsContent value="flights">
            <FlightsAnalyticsSection data={snapshot.flights} />
          </TabsContent>
          <TabsContent value="users">
            <UsersAnalyticsSection data={snapshot.users} />
          </TabsContent>
          <TabsContent value="hotels">
            <HotelsAnalyticsSection data={snapshot.hotels} />
          </TabsContent>
          <TabsContent value="cars">
            <CarsAnalyticsSection data={snapshot.cars} />
          </TabsContent>
        </Tabs>
    </div>
  );
}
