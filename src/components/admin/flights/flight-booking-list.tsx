"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import type { z } from "zod";
import { adminFlightBookingListQuerySchema } from "@/lib/validations/admin-flights.schema";
import PageHeader from "@/components/admin_ui/shared/page-header";
import DataTable, { type ColumnDef } from "@/components/admin_ui/shared/data-table";
import GenericFilter, { type FilterConfig } from "@/components/admin_ui/shared/generic-filter";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/admin/flights/flight-admin-badges";
import { FlightNavLinks } from "@/components/admin/flights/flight-nav-links";

export type FlightBookingListRow = {
  id: string;
  ref: string;
  status: string;
  paymentStatus: string;
  customer: string;
  orderPnr: string;
  airlineTotal: string;
  customerPaid: string;
  duffelCost: string;
  commission: string;
  duffelFee: string;
  estimated: boolean;
  created: string;
};

type ListQuery = z.infer<typeof adminFlightBookingListQuerySchema>;

export type FlightBookingListProps = {
  rows: FlightBookingListRow[];
  total: number;
  query: ListQuery;
  statsCards?: Array<{ title: string; value: string }>;
  summaryNote?: string;
};

export function FlightBookingList({
  rows,
  total,
  query,
  statsCards,
  summaryNote,
}: FlightBookingListProps) {
  const router = useRouter();
  const [isListPending, startListTransition] = useTransition();
  const [isRefreshPending, startRefreshTransition] = useTransition();
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const navigate = useCallback(
    (href: string) => {
      startListTransition(() => {
        router.push(href);
      });
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
      if (q.from) u.set("from", q.from);
      if (q.to) u.set("to", q.to);
      u.set("sort", q.sort);
      u.set("order", q.order);
      return u.toString();
    },
    [query],
  );

  const onRefresh = useCallback(() => {
    startRefreshTransition(() => {
      router.refresh();
    });
  }, [router, startRefreshTransition]);

  const filterConfig: FilterConfig = useMemo(
    () => ({
      fields: [
        {
          key: "q",
          label: "Search",
          type: "text",
          placeholder: "Booking ref, order id, airline PNR…",
          cols: 12,
          mdCols: 4,
        },
        {
          key: "status",
          label: "Status",
          type: "select",
          cols: 12,
          mdCols: 4,
          options: [
            { value: "all", label: "All statuses" },
            { value: "pending", label: "pending" },
            { value: "confirmed", label: "confirmed" },
            { value: "cancelled", label: "cancelled" },
            { value: "failed", label: "failed" },
          ],
        },
        {
          key: "from",
          label: "From",
          type: "date",
          cols: 12,
          mdCols: 2,
        },
        {
          key: "to",
          label: "To",
          type: "date",
          cols: 12,
          mdCols: 2,
        },
      ],
      defaultValues: { q: "", status: "all", from: "", to: "" },
    }),
    [],
  );

  const appliedFilters = useMemo(
    () => ({
      q: query.q ?? "",
      status: query.status ?? "all",
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
      const from = String(filters.from ?? "").trim();
      if (from) u.set("from", new Date(`${from}T00:00:00.000Z`).toISOString());
      const to = String(filters.to ?? "").trim();
      if (to) u.set("to", new Date(`${to}T23:59:59.999Z`).toISOString());
      u.set("sort", query.sort);
      u.set("order", query.order);
      navigate(`/admin/flights?${u.toString()}`);
    },
    [navigate, query.limit, query.order, query.sort],
  );

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean((appliedFilters.q ?? "").trim()) ||
      appliedFilters.status !== "all" ||
      Boolean(appliedFilters.from) ||
      Boolean(appliedFilters.to)
    );
  }, [appliedFilters]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if ((appliedFilters.q ?? "").trim()) n += 1;
    if (appliedFilters.status !== "all") n += 1;
    if (appliedFilters.from) n += 1;
    if (appliedFilters.to) n += 1;
    return n;
  }, [appliedFilters]);

  const columns: ColumnDef<FlightBookingListRow>[] = useMemo(
    () => [
      {
        key: "ref",
        label: "Ref",
        sortable: true,
        className: "font-mono text-xs font-medium",
        render: (_v, row) => (
          <Link className="text-primary hover:underline" href={`/admin/flights/${row.id}`}>
            {row.ref}
          </Link>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (_v, row) => <BookingStatusBadge status={row.status} />,
      },
      {
        key: "paymentStatus",
        label: "Payment",
        sortable: false,
        render: (_v, row) => <PaymentStatusBadge status={row.paymentStatus} />,
      },
      { key: "customer", label: "Customer", sortable: false },
      {
        key: "orderPnr",
        label: "Order / PNR",
        sortable: false,
        className: "font-mono text-xs text-muted-foreground max-w-[160px]",
      },
      {
        key: "customerPaid",
        label: "Customer paid",
        sortable: false,
        className: "tabular-nums text-right text-xs",
        render: (_v, row) => (
          <span>
            {row.customerPaid}
            {row.estimated ? (
              <span className="ml-1 text-[10px] text-muted-foreground">est.</span>
            ) : null}
          </span>
        ),
      },
      {
        key: "duffelCost",
        label: "Duffel cost",
        sortable: false,
        className: "tabular-nums text-right text-xs text-muted-foreground",
      },
      {
        key: "commission",
        label: "Commission",
        sortable: false,
        className: "tabular-nums text-right text-xs font-medium text-emerald-700 dark:text-emerald-400",
      },
      {
        key: "duffelFee",
        label: "Duffel fee",
        sortable: false,
        className: "tabular-nums text-right text-xs text-muted-foreground",
      },
      {
        key: "airlineTotal",
        label: "Airline total",
        sortable: false,
        className: "tabular-nums text-right text-xs text-muted-foreground",
      },
      { key: "created", label: "Created", sortable: true, className: "text-muted-foreground whitespace-nowrap text-xs" },
    ],
    [],
  );

  const sortColumn = (
    query.sort === "booking_ref_no" ? "ref" : query.sort === "status" ? "status" : "created"
  ) as keyof FlightBookingListRow;
  const sortDirection = query.order;

  const onSort = useCallback(
    (column: keyof FlightBookingListRow, direction: "asc" | "desc") => {
      const sortField =
        column === "ref"
          ? "booking_ref_no"
          : column === "created"
            ? "created_at"
            : column === "status"
              ? "status"
              : "created_at";
      navigate(
        `/admin/flights?${buildQs({ page: 1, sort: sortField as ListQuery["sort"], order: direction })}`,
      );
    },
    [buildQs, navigate],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Flight bookings"
        subtitle="Revenue per booking from PaymentIntent snapshots. Click a row for reconciliation detail."
        showAddButton={false}
        showFilterButton
        hasActiveFilters={hasActiveFilters}
        isFilterExpanded={isFilterExpanded}
        onFilterToggle={() => setIsFilterExpanded((v) => !v)}
        activeFiltersCount={activeFiltersCount}
        filterText="Filter bookings"
        clearFiltersText="Clear filters"
        showRefreshButton
        onRefresh={onRefresh}
        isRefreshing={isRefreshPending}
      >
        {isFilterExpanded && (
          <GenericFilter
            config={filterConfig}
            values={appliedFilters}
            onFilterChange={onFilterChange}
            collapsible={false}
            presentation="inline"
            title="Filters"
            clearText="Reset"
          />
        )}
      </PageHeader>

      <FlightNavLinks current="bookings" />

      {summaryNote ? (
        <p className="text-xs text-muted-foreground">{summaryNote}</p>
      ) : null}

      <DataTable<FlightBookingListRow>
        data={rows}
        columns={columns}
        loading={isListPending || isRefreshPending}
        totalCount={total}
        currentPage={query.page}
        pageSize={query.limit}
        statsCards={statsCards}
        NoOfCards={0}
        onPageChange={(page) => navigate(`/admin/flights?${buildQs({ page })}`)}
        onPageSizeChange={(limit) => navigate(`/admin/flights?${buildQs({ page: 1, limit })}`)}
        onSort={onSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        showViewToggle={true}
        enablePermissionChecking={false}
        emptyMessage="No flight bookings match your filters."
        actions={{
          view: { enabled: false },
          delete: { enabled: false },
          edit: {
            onClick: (row) => router.push(`/admin/flights/${row.id}`),
          },
        }}
      />
    </div>
  );
}
