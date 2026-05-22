"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { BOOKING_FINANCIAL_EVENT_TYPES } from "@/lib/constants/booking-states";
import { listMyFlightLedgerEvents, type MyFlightLedgerItem } from "@/lib/http/flight-ledger.client";
import {
  customerEventLabel,
  FLIGHT_LEDGER_DIRECTION_FILTERS,
  type FinancialEventDirection,
} from "@/lib/services/flights/flight-financial-event-direction";
import PageHeader from "@/components/admin_ui/shared/page-header";
import DataTable, { type ColumnDef } from "@/components/admin_ui/shared/data-table";
import GenericFilter, { type FilterConfig } from "@/components/admin_ui/shared/generic-filter";
import FilterToggleButton from "@/components/admin_ui/ui/filter-toggle-button";

const DEFAULT_LIMIT = 10;

type LedgerSortField = "created_at";

type ProfileFlightLedgerRow = {
  id: string;
  bookingId: string;
  created: string;
  bookingRef: string;
  airlineRef: string;
  eventLabel: string;
  direction: FinancialEventDirection;
  amount: string;
};

const SORT_COLUMN_TO_API: Partial<Record<keyof ProfileFlightLedgerRow, LedgerSortField>> = {
  created: "created_at",
};

const API_SORT_TO_COLUMN: Record<LedgerSortField, keyof ProfileFlightLedgerRow> = {
  created_at: "created",
};

function directionBadgeClass(d: FinancialEventDirection): string {
  if (d === "debit") return "bg-amber-500/15 text-amber-800 dark:text-amber-200";
  if (d === "credit") return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
  return "bg-muted text-muted-foreground";
}

function formatMoney(amount: string | null, currency: string | null): string {
  if (amount == null || amount === "") return "—";
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return `${amount} ${currency ?? ""}`.trim();
  const cur = currency?.toUpperCase() ?? "";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur || "USD",
      currencyDisplay: "narrowSymbol",
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${cur}`.trim();
  }
}

function formatCreatedDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapLedgerToRow(item: MyFlightLedgerItem): ProfileFlightLedgerRow {
  return {
    id: item.id,
    bookingId: item.booking.id,
    created: formatCreatedDate(item.created_at),
    bookingRef: item.booking.booking_ref_no,
    airlineRef: item.booking.airline_reference ?? "—",
    eventLabel: item.label,
    direction: item.direction,
    amount: formatMoney(item.amount, item.currency),
  };
}

export type ProfileFlightLedgerPanelProps = {
  standalone?: boolean;
  syncUrl?: boolean;
  showFullscreen?: boolean;
  showHeader?: boolean;
};

export function ProfileFlightLedgerPanel({
  standalone = false,
  syncUrl = false,
  showFullscreen = false,
  showHeader = false,
}: ProfileFlightLedgerPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const readUrlQuery = useCallback(() => {
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || DEFAULT_LIMIT));
    const directionRaw = searchParams.get("direction") ?? "";
    const eventTypeRaw = searchParams.get("event_type") ?? "";
    const from = (searchParams.get("from") ?? "").trim();
    const to = (searchParams.get("to") ?? "").trim();
    const sort = (searchParams.get("sort") as LedgerSortField) || "created_at";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";
    return {
      page,
      limit,
      direction: directionRaw && directionRaw !== "all" ? directionRaw : "",
      eventType: eventTypeRaw && eventTypeRaw !== "all" ? eventTypeRaw : "",
      from,
      to,
      sort: sort === "created_at" ? sort : "created_at",
      order: order as "asc" | "desc",
    };
  }, [searchParams]);

  const urlQuery = syncUrl ? readUrlQuery() : null;

  const [page, setPage] = useState(urlQuery?.page ?? 1);
  const [limit, setLimit] = useState(urlQuery?.limit ?? DEFAULT_LIMIT);
  const [directionFilter, setDirectionFilter] = useState(urlQuery?.direction ?? "");
  const [eventTypeFilter, setEventTypeFilter] = useState(urlQuery?.eventType ?? "");
  const [fromFilter, setFromFilter] = useState(urlQuery?.from ?? "");
  const [toFilter, setToFilter] = useState(urlQuery?.to ?? "");
  const [sort, setSort] = useState<LedgerSortField>(urlQuery?.sort ?? "created_at");
  const [order, setOrder] = useState<"asc" | "desc">(urlQuery?.order ?? "desc");

  const [rows, setRows] = useState<ProfileFlightLedgerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!syncUrl) return;
    const q = readUrlQuery();
    setPage(q.page);
    setLimit(q.limit);
    setDirectionFilter(q.direction);
    setEventTypeFilter(q.eventType);
    setFromFilter(q.from);
    setToFilter(q.to);
    setSort(q.sort);
    setOrder(q.order);
  }, [syncUrl, readUrlQuery]);

  const syncToUrl = useCallback(
    (overrides: {
      page?: number;
      limit?: number;
      direction?: string;
      eventType?: string;
      from?: string;
      to?: string;
      sort?: LedgerSortField;
      order?: "asc" | "desc";
    }) => {
      if (!syncUrl) return;
      const next = {
        page: overrides.page ?? page,
        limit: overrides.limit ?? limit,
        direction: overrides.direction ?? directionFilter,
        eventType: overrides.eventType ?? eventTypeFilter,
        from: overrides.from ?? fromFilter,
        to: overrides.to ?? toFilter,
        sort: overrides.sort ?? sort,
        order: overrides.order ?? order,
      };
      const u = new URLSearchParams();
      u.set("page", String(next.page));
      u.set("limit", String(next.limit));
      if (next.direction) u.set("direction", next.direction);
      if (next.eventType) u.set("event_type", next.eventType);
      if (next.from.trim()) u.set("from", next.from.trim());
      if (next.to.trim()) u.set("to", next.to.trim());
      if (next.sort !== "created_at" || next.order !== "desc") {
        u.set("sort", next.sort);
        u.set("order", next.order);
      }
      const qs = u.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [
      syncUrl,
      page,
      limit,
      directionFilter,
      eventTypeFilter,
      fromFilter,
      toFilter,
      sort,
      order,
      pathname,
      router,
    ],
  );

  const applyQueryPatch = useCallback(
    (patch: {
      page?: number;
      limit?: number;
      direction?: string;
      eventType?: string;
      from?: string;
      to?: string;
      sort?: LedgerSortField;
      order?: "asc" | "desc";
    }) => {
      if (patch.page !== undefined) setPage(patch.page);
      if (patch.limit !== undefined) setLimit(patch.limit);
      if (patch.direction !== undefined) setDirectionFilter(patch.direction);
      if (patch.eventType !== undefined) setEventTypeFilter(patch.eventType);
      if (patch.from !== undefined) setFromFilter(patch.from);
      if (patch.to !== undefined) setToFilter(patch.to);
      if (patch.sort !== undefined) setSort(patch.sort);
      if (patch.order !== undefined) setOrder(patch.order);
      syncToUrl(patch);
    },
    [syncToUrl],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listMyFlightLedgerEvents({
        page,
        limit,
        sort,
        order,
        ...(directionFilter ? { direction: directionFilter } : {}),
        ...(eventTypeFilter ? { event_type: eventTypeFilter } : {}),
        ...(fromFilter.trim() ? { from: fromFilter.trim() } : {}),
        ...(toFilter.trim() ? { to: toFilter.trim() } : {}),
      });
      setRows(res.data.map(mapLedgerToRow));
      setTotal(res.meta.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load flight payment history.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [page, limit, directionFilter, eventTypeFilter, fromFilter, toFilter, sort, order]);

  useEffect(() => {
    void load();
  }, [load]);

  const eventTypeOptions = useMemo(
    () => [
      { value: "all", label: "All types" },
      ...BOOKING_FINANCIAL_EVENT_TYPES.map((t) => ({
        value: t,
        label: customerEventLabel(t),
      })),
    ],
    [],
  );

  const filterConfig: FilterConfig = useMemo(
    () => ({
      fields: [
        {
          key: "event_type",
          label: "Event type",
          type: "select",
          cols: 12,
          mdCols: 3,
          options: eventTypeOptions,
        },
        {
          key: "direction",
          label: "Direction",
          type: "select",
          cols: 12,
          mdCols: 3,
          options: [
            { value: "all", label: "All" },
            ...FLIGHT_LEDGER_DIRECTION_FILTERS.map((d) => ({
              value: d,
              label: d.charAt(0).toUpperCase() + d.slice(1),
            })),
          ],
        },
        {
          key: "from",
          label: "From date",
          type: "date",
          placeholder: "YYYY-MM-DD",
          cols: 12,
          mdCols: 3,
        },
        {
          key: "to",
          label: "To date",
          type: "date",
          placeholder: "YYYY-MM-DD",
          cols: 12,
          mdCols: 3,
        },
      ],
      defaultValues: { event_type: "all", direction: "all", from: "", to: "" },
    }),
    [eventTypeOptions],
  );

  const appliedFilters = useMemo(
    () => ({
      event_type: eventTypeFilter || "all",
      direction: directionFilter || "all",
      from: fromFilter,
      to: toFilter,
    }),
    [eventTypeFilter, directionFilter, fromFilter, toFilter],
  );

  const onFilterChange = useCallback(
    (filters: Record<string, unknown>) => {
      const eventTypeVal = String(filters.event_type ?? "all");
      const directionVal = String(filters.direction ?? "all");
      applyQueryPatch({
        page: 1,
        eventType: eventTypeVal === "all" ? "" : eventTypeVal,
        direction: directionVal === "all" ? "" : directionVal,
        from: String(filters.from ?? "").trim(),
        to: String(filters.to ?? "").trim(),
      });
    },
    [applyQueryPatch],
  );

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(eventTypeFilter) ||
      Boolean(directionFilter) ||
      Boolean(fromFilter.trim()) ||
      Boolean(toFilter.trim())
    );
  }, [eventTypeFilter, directionFilter, fromFilter, toFilter]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (eventTypeFilter) n += 1;
    if (directionFilter) n += 1;
    if (fromFilter.trim()) n += 1;
    if (toFilter.trim()) n += 1;
    return n;
  }, [eventTypeFilter, directionFilter, fromFilter, toFilter]);

  const columns: ColumnDef<ProfileFlightLedgerRow>[] = useMemo(() => {
    const all: ColumnDef<ProfileFlightLedgerRow>[] = [
      {
        key: "created",
        label: "Date",
        sortable: true,
        className: "whitespace-nowrap text-muted-foreground",
      },
      { key: "bookingRef", label: "Booking", sortable: false, className: "font-medium" },
      {
        key: "airlineRef",
        label: "Airline ref",
        sortable: false,
        className: "text-muted-foreground whitespace-nowrap",
      },
      { key: "eventLabel", label: "Type", sortable: false, className: "text-muted-foreground" },
      {
        key: "direction",
        label: "Flow",
        sortable: false,
        render: (_value, row) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${directionBadgeClass(row.direction)}`}
          >
            {row.direction}
          </span>
        ),
      },
      {
        key: "amount",
        label: "Amount",
        sortable: false,
        className: "tabular-nums text-right font-medium whitespace-nowrap",
      },
    ];
    if (!standalone) {
      return all.filter((col) => col.key !== "airlineRef");
    }
    return all;
  }, [standalone]);

  const sortColumn = API_SORT_TO_COLUMN[sort];
  const sortDirection = order;

  const onSort = useCallback(
    (column: keyof ProfileFlightLedgerRow, direction: "asc" | "desc") => {
      const apiSort = SORT_COLUMN_TO_API[column];
      if (!apiSort) return;
      applyQueryPatch({ page: 1, sort: apiSort, order: direction });
    },
    [applyQueryPatch],
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    void load();
  }, [load]);

  const filterPanel = isFilterExpanded ? (
    <GenericFilter
      config={filterConfig}
      values={appliedFilters}
      onFilterChange={onFilterChange}
      collapsible={false}
      presentation="inline"
      title="Filters"
      clearText="Reset"
    />
  ) : null;

  const title = standalone ? "Flight payments & refunds" : "Flight payments & refunds";
  const subtitle = standalone
    ? "Debits (charges) and credits (refunds) across your flight bookings. Each line matches the timeline on the booking detail page."
    : "Money movements for flights only. Open a booking to cancel, change, or download documents.";

  return (
    <div className="space-y-6">
      {showHeader ? (
        <PageHeader
          title={title}
          subtitle={subtitle}
          showAddButton={false}
          showFilterButton
          hasActiveFilters={hasActiveFilters}
          isFilterExpanded={isFilterExpanded}
          onFilterToggle={() => setIsFilterExpanded((v) => !v)}
          activeFiltersCount={activeFiltersCount}
          filterText="Filter payments"
          clearFiltersText="Clear filters"
          showRefreshButton
          onRefresh={onRefresh}
          isRefreshing={isRefreshing || loading}
          fullScreenMode={showFullscreen ? "fullscreen-keep-layout" : "hide-layout"}
        >
          {filterPanel}
        </PageHeader>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-foreground">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              {!standalone ? (
                <Link
                  href="/profile/flight-activity"
                  className="rounded-sm border border-primary px-2 py-1 text-primary hover:bg-primary hover:text-muted"
                >
                  Open full-page list
                </Link>
              ) : null}
              <FilterToggleButton
                hasActiveFilters={hasActiveFilters}
                isExpanded={isFilterExpanded}
                onToggle={() => setIsFilterExpanded((v) => !v)}
                activeFiltersCount={activeFiltersCount}
                filterText="Filter payments"
                clearText="Clear filters"
              />
            </div>
          </div>
          {filterPanel}
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <DataTable<ProfileFlightLedgerRow>
        data={rows}
        columns={columns}
        loading={loading || isRefreshing}
        totalCount={total}
        currentPage={page}
        pageSize={limit}
        NoOfCards={0}
        onPageChange={(p) => applyQueryPatch({ page: p })}
        onPageSizeChange={(nextLimit) => applyQueryPatch({ page: 1, limit: nextLimit })}
        onSort={onSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        showViewToggle
        enablePermissionChecking={false}
        emptyMessage="No flight payment events yet. When you book or receive a refund, entries appear here."
        tableWrapperClassName="overflow-x-auto"
        getRowId={(row) => row.id}
        actions={{
          view: { enabled: false },
          delete: { enabled: false },
          edit: {
            label: "View booking",
            onClick: (row) =>
              router.push(`/profile/bookings/${encodeURIComponent(row.bookingId)}#payments`),
          },
        }}
      />
    </div>
  );
}
