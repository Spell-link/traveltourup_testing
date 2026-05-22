"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import type { z } from "zod";
import { adminFlightLedgerQuerySchema } from "@/lib/validations/flight-ledger.schema";
import PageHeader from "@/components/admin_ui/shared/page-header";
import DataTable, { type ColumnDef, type ActionMenuItem } from "@/components/admin_ui/shared/data-table";
import GenericFilter, { type FilterConfig } from "@/components/admin_ui/shared/generic-filter";
import { FlightNavLinks } from "@/components/admin/flights/flight-nav-links";

export type FlightLedgerListRow = {
  id: string;
  created: string;
  userEmail: string;
  userName: string;
  bookingRef: string;
  airlineRef: string;
  eventLabel: string;
  direction: string;
  amount: string;
  bookingId: string;
  userId: string;
};

type ListQuery = z.infer<typeof adminFlightLedgerQuerySchema>;

export type FlightLedgerListProps = {
  rows: FlightLedgerListRow[];
  total: number;
  query: ListQuery;
};

function directionBadgeClass(d: string): string {
  if (d === "debit") return "font-medium text-amber-700 dark:text-amber-300";
  if (d === "credit") return "font-medium text-emerald-700 dark:text-emerald-300";
  return "text-muted-foreground";
}

export function FlightLedgerList({ rows, total, query }: FlightLedgerListProps) {
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
      if (q.event_type) u.set("event_type", q.event_type);
      if (q.direction) u.set("direction", q.direction);
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

  const eventTypeOptions = useMemo(
    () => [
      { value: "all", label: "All types" },
      { value: "intent_created", label: "intent created" },
      { value: "intent_succeeded", label: "intent succeeded" },
      { value: "intent_failed", label: "intent failed" },
      { value: "order_placed", label: "order placed" },
      { value: "order_failed", label: "order failed" },
      { value: "refund_initiated", label: "refund initiated" },
      { value: "refund_succeeded", label: "refund succeeded" },
      { value: "refund_failed", label: "refund failed" },
      { value: "cancel_quoted", label: "cancel quoted" },
      { value: "cancel_confirmed", label: "cancel confirmed" },
      { value: "change_quoted", label: "change quoted" },
      { value: "change_confirmed", label: "change confirmed" },
    ],
    [],
  );

  const filterConfig: FilterConfig = useMemo(
    () => ({
      fields: [
        {
          key: "q",
          label: "Search",
          type: "text",
          placeholder: "Ref, PNR, name…",
          cols: 12,
          mdCols: 6,
        },
        {
          key: "event_type",
          label: "Event type",
          type: "select",
          cols: 12,
          mdCols: 6,
          options: eventTypeOptions,
        },
        {
          key: "direction",
          label: "Debit / credit",
          type: "select",
          cols: 12,
          mdCols: 4,
          options: [
            { value: "all", label: "All" },
            { value: "debit", label: "Debit" },
            { value: "credit", label: "Credit" },
            { value: "neutral", label: "Neutral" },
          ],
        },
        {
          key: "from",
          label: "From date",
          type: "text",
          placeholder: "YYYY-MM-DD",
          cols: 12,
          mdCols: 4,
        },
        {
          key: "to",
          label: "To date",
          type: "text",
          placeholder: "YYYY-MM-DD",
          cols: 12,
          mdCols: 4,
        },
      ],
      defaultValues: {
        q: "",
        event_type: "all",
        direction: "all",
        from: "",
        to: "",
      },
    }),
    [eventTypeOptions],
  );

  const appliedFilters = useMemo(
    () => ({
      q: query.q ?? "",
      event_type: query.event_type ?? "all",
      direction: query.direction ?? "all",
      from: query.from ?? "",
      to: query.to ?? "",
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
      const et = String(filters.event_type ?? "all");
      if (et !== "all") u.set("event_type", et);
      const dir = String(filters.direction ?? "all");
      if (dir !== "all") u.set("direction", dir);
      const from = String(filters.from ?? "").trim();
      if (from) u.set("from", from);
      const to = String(filters.to ?? "").trim();
      if (to) u.set("to", to);
      u.set("sort", query.sort);
      u.set("order", query.order);
      navigate(`/admin/flights/ledger?${u.toString()}`);
    },
    [navigate, query.limit, query.order, query.sort],
  );

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean((appliedFilters.q ?? "").trim()) ||
      appliedFilters.event_type !== "all" ||
      appliedFilters.direction !== "all" ||
      Boolean((appliedFilters.from ?? "").trim()) ||
      Boolean((appliedFilters.to ?? "").trim())
    );
  }, [appliedFilters]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if ((appliedFilters.q ?? "").trim()) n += 1;
    if (appliedFilters.event_type !== "all") n += 1;
    if (appliedFilters.direction !== "all") n += 1;
    if ((appliedFilters.from ?? "").trim()) n += 1;
    if ((appliedFilters.to ?? "").trim()) n += 1;
    return n;
  }, [appliedFilters]);

  const columns: ColumnDef<FlightLedgerListRow>[] = useMemo(
    () => [
      { key: "created", label: "Time", sortable: true, className: "whitespace-nowrap text-muted-foreground" },
      { key: "userEmail", label: "User", sortable: false, className: "max-w-[200px] truncate" },
      { key: "bookingRef", label: "Booking", sortable: false, className: "font-medium" },
      { key: "eventLabel", label: "Event", sortable: false, className: "text-muted-foreground" },
      {
        key: "direction",
        label: "Flow",
        sortable: false,
        className: "capitalize",
        render: (_v, row) => (
          <span className={directionBadgeClass(row.direction)}>{row.direction}</span>
        ),
      },
      { key: "amount", label: "Amount", sortable: false, className: "tabular-nums text-right" },
    ],
    [],
  );

  const sortColumn = "created" as keyof FlightLedgerListRow;
  const sortDirection = query.order;

  const onSort = useCallback(
    (_column: keyof FlightLedgerListRow, direction: "asc" | "desc") => {
      navigate(
        `/admin/flights/ledger?${buildQs({ page: 1, sort: "created_at", order: direction })}`,
      );
    },
    [buildQs, navigate],
  );

  const openUserAction: ActionMenuItem<FlightLedgerListRow> = {
    label: "Open user",
    icon: <ExternalLink className="h-4 w-4" />,
    onClick: (row) => {
      if (!row.userId) return;
      navigate(`/admin/users/${row.userId}`);
    },
  };

  const openBookingAction: ActionMenuItem<FlightLedgerListRow> = {
    label: "View booking",
    icon: <ExternalLink className="h-4 w-4" />,
    onClick: (row) => {
      navigate(`/admin/bookings/${row.bookingId}`);
    },
  };

  /** Saga ops timeline lives under /admin/flights/:id (bookings module is generic CRUD). */
  const sagaViewAction: ActionMenuItem<FlightLedgerListRow> = {
    label: "Saga view",
    icon: <ExternalLink className="h-4 w-4" />,
    onClick: (row) => {
      navigate(`/admin/flights/${row.bookingId}`);
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flight financial ledger"
        subtitle="Append-only flight money events (charges, refunds, cancellations, changes). Filter by user, booking, type, or date."
        showAddButton={false}
        showFilterButton
        hasActiveFilters={hasActiveFilters}
        isFilterExpanded={isFilterExpanded}
        onFilterToggle={() => setIsFilterExpanded((v) => !v)}
        activeFiltersCount={activeFiltersCount}
        filterText="Filter ledger"
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

      <FlightNavLinks current="ledger" />

      <DataTable<FlightLedgerListRow>
        data={rows}
        columns={columns}
        loading={isListPending || isRefreshPending}
        totalCount={total}
        currentPage={query.page}
        pageSize={query.limit}
        NoOfCards={0}
        onPageChange={(page) => navigate(`/admin/flights/ledger?${buildQs({ page })}`)}
        onPageSizeChange={(limit) => navigate(`/admin/flights/ledger?${buildQs({ page: 1, limit })}`)}
        onSort={onSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        showViewToggle={true}
        enablePermissionChecking={false}
        emptyMessage="No ledger events match your filters."
        actions={{
          view: { enabled: false },
          delete: { enabled: false },
          edit: {
            onClick: (row) => router.push(`/admin/bookings/${row.bookingId}`),
          },
        }}
        customActions={[sagaViewAction, openBookingAction, openUserAction]}
      />
    </div>
  );
}
