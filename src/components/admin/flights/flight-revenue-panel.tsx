"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import type { z } from "zod";
import { adminFlightRevenueQuerySchema } from "@/lib/validations/admin-flights.schema";
import type { AdminFlightRevenueSummary } from "@/lib/admin/admin-flight-revenue.types";
import PageHeader from "@/components/admin_ui/shared/page-header";
import DataTable, { type ColumnDef } from "@/components/admin_ui/shared/data-table";
import GenericFilter, { type FilterConfig } from "@/components/admin_ui/shared/generic-filter";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/admin/flights/flight-admin-badges";
import { FlightNavLinks } from "@/components/admin/flights/flight-nav-links";
import { DashboardKpiGrid } from "@/components/admin/dashboard/dashboard-kpi-card";
import type { KpiMetric } from "@/lib/admin/admin-dashboard.types";

export type FlightRevenueListRow = {
  id: string;
  ref: string;
  status: string;
  paymentStatus: string;
  customer: string;
  customerPaid: string;
  duffelCost: string;
  commission: string;
  duffelFee: string;
  netCommission: string;
  created: string;
};

type ListQuery = z.infer<typeof adminFlightRevenueQuerySchema>;

export type FlightRevenuePanelProps = {
  rows: FlightRevenueListRow[];
  total: number;
  query: ListQuery;
  summary: AdminFlightRevenueSummary | null;
};

export function FlightRevenuePanel({ rows, total, query, summary }: FlightRevenuePanelProps) {
  const router = useRouter();
  const [isListPending, startListTransition] = useTransition();
  const [isRefreshPending, startRefreshTransition] = useTransition();
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const navigate = useCallback(
    (href: string) => {
      startListTransition(() => router.push(href));
    },
    [router, startListTransition],
  );

  const buildQs = useCallback(
    (overrides: Partial<ListQuery>) => {
      const q = { ...query, ...overrides };
      const u = new URLSearchParams();
      u.set("page", String(q.page));
      u.set("limit", String(q.limit));
      if (q.q) u.set("q", q.q);
      if (q.status) u.set("status", q.status);
      if (q.currency) u.set("currency", q.currency);
      if (q.from) u.set("from", q.from);
      if (q.to) u.set("to", q.to);
      u.set("sort", q.sort);
      u.set("order", q.order);
      return u.toString();
    },
    [query],
  );

  const filterConfig: FilterConfig = useMemo(
    () => ({
      fields: [
        { key: "q", label: "Search", type: "text", cols: 12, mdCols: 4 },
        {
          key: "status",
          label: "Status",
          type: "select",
          cols: 12,
          mdCols: 3,
          options: [
            { value: "all", label: "All" },
            { value: "confirmed", label: "confirmed" },
            { value: "cancelled", label: "cancelled" },
            { value: "pending", label: "pending" },
            { value: "failed", label: "failed" },
          ],
        },
        { key: "currency", label: "Currency", type: "text", placeholder: "USD", cols: 12, mdCols: 2 },
        { key: "from", label: "From", type: "date", cols: 12, mdCols: 2 },
        { key: "to", label: "To", type: "date", cols: 12, mdCols: 2 },
      ],
      defaultValues: { q: "", status: "all", currency: "", from: "", to: "" },
    }),
    [],
  );

  const appliedFilters = useMemo(
    () => ({
      q: query.q ?? "",
      status: query.status ?? "all",
      currency: query.currency ?? "",
      from: query.from ? query.from.slice(0, 10) : "",
      to: query.to ? query.to.slice(0, 10) : "",
    }),
    [query],
  );

  const onFilterChange = useCallback(
    (filters: Record<string, unknown>) => {
      const u = new URLSearchParams();
      u.set("page", "1");
      u.set("limit", String(query.limit));
      const qq = String(filters.q ?? "").trim();
      if (qq) u.set("q", qq);
      const st = String(filters.status ?? "all");
      if (st && st !== "all") u.set("status", st);
      const cur = String(filters.currency ?? "").trim().toUpperCase();
      if (cur.length === 3) u.set("currency", cur);
      const from = String(filters.from ?? "").trim();
      if (from) u.set("from", new Date(`${from}T00:00:00.000Z`).toISOString());
      const to = String(filters.to ?? "").trim();
      if (to) u.set("to", new Date(`${to}T23:59:59.999Z`).toISOString());
      u.set("sort", query.sort);
      u.set("order", query.order);
      navigate(`/admin/flights/revenue?${u.toString()}`);
    },
    [navigate, query.limit, query.order, query.sort],
  );

  const kpis: KpiMetric[] = summary
    ? [
        {
          id: "customer",
          title: "Customer revenue",
          value: `${summary.customer_revenue} ${summary.currency}`,
        },
        {
          id: "commission",
          title: "Gross commission",
          value: `${summary.commission} ${summary.currency}`,
          variant: "success",
        },
        {
          id: "net",
          title: "Net commission",
          value: `${summary.net_commission} ${summary.currency}`,
        },
        {
          id: "fees",
          title: "Duffel fees",
          value: `${summary.duffel_fees} ${summary.currency}`,
        },
        {
          id: "cost",
          title: "Duffel cost",
          value: `${summary.duffel_cost} ${summary.currency}`,
          subtitle: `${summary.booking_count} bookings with PIT`,
        },
      ]
    : [];

  const columns: ColumnDef<FlightRevenueListRow>[] = useMemo(
    () => [
      {
        key: "ref",
        label: "Ref",
        render: (_v, row) => (
          <Link className="text-primary hover:underline font-mono text-xs" href={`/admin/flights/${row.id}`}>
            {row.ref}
          </Link>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (_v, row) => <BookingStatusBadge status={row.status} />,
      },
      {
        key: "paymentStatus",
        label: "Payment",
        render: (_v, row) => <PaymentStatusBadge status={row.paymentStatus} />,
      },
      { key: "customer", label: "Customer" },
      { key: "customerPaid", label: "Customer paid", className: "tabular-nums text-right text-xs" },
      { key: "duffelCost", label: "Duffel cost", className: "tabular-nums text-right text-xs text-muted-foreground" },
      { key: "commission", label: "Commission", className: "tabular-nums text-right text-xs font-medium text-emerald-700 dark:text-emerald-400" },
      { key: "duffelFee", label: "Duffel fee", className: "tabular-nums text-right text-xs text-muted-foreground" },
      { key: "netCommission", label: "Net commission", className: "tabular-nums text-right text-xs" },
      { key: "created", label: "Created", className: "text-xs text-muted-foreground whitespace-nowrap" },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Revenue & reconciliation"
        subtitle="Per-order economics from PaymentIntent snapshots — mirrors Duffel dashboard line items."
        showAddButton={false}
        showFilterButton
        isFilterExpanded={isFilterExpanded}
        onFilterToggle={() => setIsFilterExpanded((v) => !v)}
        showRefreshButton
        onRefresh={() => startRefreshTransition(() => router.refresh())}
        isRefreshing={isRefreshPending}
      >
        {isFilterExpanded ? (
          <GenericFilter
            config={filterConfig}
            values={appliedFilters}
            onFilterChange={onFilterChange}
            collapsible={false}
            presentation="inline"
          />
        ) : null}
      </PageHeader>

      <FlightNavLinks current="revenue" />

      {summary?.multi_currency_note ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">{summary.multi_currency_note}</p>
      ) : null}

      {kpis.length > 0 ? <DashboardKpiGrid metrics={kpis} cols={5} /> : null}

      <DataTable<FlightRevenueListRow>
        data={rows}
        columns={columns}
        loading={isListPending || isRefreshPending}
        totalCount={total}
        currentPage={query.page}
        pageSize={query.limit}
        NoOfCards={0}
        showViewToggle={false}
        enablePermissionChecking={false}
        onPageChange={(page) => navigate(`/admin/flights/revenue?${buildQs({ page })}`)}
        onPageSizeChange={(limit) => navigate(`/admin/flights/revenue?${buildQs({ page: 1, limit })}`)}
        emptyMessage="No bookings with succeeded payment intents in this range."
        actions={{
          view: { enabled: false },
          delete: { enabled: false },
          edit: { onClick: (row) => router.push(`/admin/flights/${row.id}`) },
        }}
      />
    </div>
  );
}
