"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  bookingSummaryDateIso,
  bookingSummarySubtitle,
  bookingSummaryTitle,
  bookingTypeLabel,
} from "@/lib/bookings/booking-summary";
import type { BookingListItemDto } from "@/lib/bookings/booking.types";
import { listMyBookings } from "@/lib/http/bookings.client";
import PageHeader from "@/components/admin_ui/shared/page-header";
import DataTable, { type ColumnDef } from "@/components/admin_ui/shared/data-table";
import GenericFilter, { type FilterConfig } from "@/components/admin_ui/shared/generic-filter";
import FilterToggleButton from "@/components/admin_ui/ui/filter-toggle-button";

const DEFAULT_LIMIT = 10;

type BookingSortField = "created_at" | "total_amount" | "status" | "booking_ref_no";

type MyBookingsRow = {
  id: string;
  booking_ref_no: string;
  type: string;
  typeLabel: string;
  trip: string;
  departure: string;
  pnr: string;
  reference: string;
  booked: string;
  amount: string;
  status: string;
};

const SORT_COLUMN_TO_API: Partial<Record<keyof MyBookingsRow, BookingSortField>> = {
  booked: "created_at",
  amount: "total_amount",
  status: "status",
  reference: "booking_ref_no",
};

const API_SORT_TO_COLUMN: Record<BookingSortField, keyof MyBookingsRow> = {
  created_at: "booked",
  total_amount: "amount",
  status: "status",
  booking_ref_no: "reference",
};

function formatBookedDate(iso: string): string {
  if (!iso || iso.length < 10) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function mapBookingToRow(b: BookingListItemDto): MyBookingsRow {
  const dateStr = bookingSummaryDateIso(b);
  return {
    id: b.id,
    booking_ref_no: b.booking_ref_no,
    type: b.type,
    typeLabel: bookingTypeLabel(b.type),
    trip: bookingSummaryTitle(b),
    departure: bookingSummarySubtitle(b) ?? "—",
    pnr:
      b.type === "flight" && b.flight_booking?.booking_reference
        ? b.flight_booking.booking_reference
        : "—",
    reference: b.booking_ref_no,
    booked: formatBookedDate(dateStr),
    amount: `${b.currency} ${b.total_amount}`,
    status: b.status,
  };
}

export type MyBookingsTableProps = {
  highlightRef?: string | null;
  standalone?: boolean;
  syncUrl?: boolean;
  showFullscreen?: boolean;
  showHeader?: boolean;
};

export function MyBookingsTable({
  highlightRef = null,
  standalone = false,
  syncUrl = false,
  showFullscreen = false,
  showHeader = false,
}: MyBookingsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const readUrlQuery = useCallback(() => {
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || DEFAULT_LIMIT));
    const typeRaw = searchParams.get("type") ?? "";
    const statusRaw = searchParams.get("status") ?? "";
    const q = (searchParams.get("q") ?? "").trim();
    const sort = (searchParams.get("sort") as BookingSortField) || "created_at";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";
    return {
      page,
      limit,
      type: typeRaw && typeRaw !== "all" ? typeRaw : "",
      status: statusRaw && statusRaw !== "all" ? statusRaw : "",
      q,
      sort: ["created_at", "total_amount", "status", "booking_ref_no"].includes(sort)
        ? sort
        : "created_at",
      order: order as "asc" | "desc",
    };
  }, [searchParams]);

  const urlQuery = syncUrl ? readUrlQuery() : null;

  const [page, setPage] = useState(urlQuery?.page ?? 1);
  const [limit, setLimit] = useState(urlQuery?.limit ?? DEFAULT_LIMIT);
  const [typeFilter, setTypeFilter] = useState(urlQuery?.type ?? "");
  const [statusFilter, setStatusFilter] = useState(urlQuery?.status ?? "");
  const [searchQ, setSearchQ] = useState(urlQuery?.q ?? "");
  const [sort, setSort] = useState<BookingSortField>(urlQuery?.sort ?? "created_at");
  const [order, setOrder] = useState<"asc" | "desc">(urlQuery?.order ?? "desc");

  const [rows, setRows] = useState<MyBookingsRow[]>([]);
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
    setTypeFilter(q.type);
    setStatusFilter(q.status);
    setSearchQ(q.q);
    setSort(q.sort);
    setOrder(q.order);
  }, [syncUrl, readUrlQuery]);

  const syncToUrl = useCallback(
    (overrides: {
      page?: number;
      limit?: number;
      type?: string;
      status?: string;
      q?: string;
      sort?: BookingSortField;
      order?: "asc" | "desc";
    }) => {
      if (!syncUrl) return;
      const next = {
        page: overrides.page ?? page,
        limit: overrides.limit ?? limit,
        type: overrides.type ?? typeFilter,
        status: overrides.status ?? statusFilter,
        q: overrides.q ?? searchQ,
        sort: overrides.sort ?? sort,
        order: overrides.order ?? order,
      };
      const u = new URLSearchParams();
      u.set("page", String(next.page));
      u.set("limit", String(next.limit));
      if (next.type) u.set("type", next.type);
      if (next.status) u.set("status", next.status);
      if (next.q.trim()) u.set("q", next.q.trim());
      if (next.sort !== "created_at" || next.order !== "desc") {
        u.set("sort", next.sort);
        u.set("order", next.order);
      }
      if (highlightRef) u.set("highlight", highlightRef);
      const qs = u.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [
      syncUrl,
      page,
      limit,
      typeFilter,
      statusFilter,
      searchQ,
      sort,
      order,
      highlightRef,
      pathname,
      router,
    ],
  );

  const applyQueryPatch = useCallback(
    (patch: {
      page?: number;
      limit?: number;
      type?: string;
      status?: string;
      q?: string;
      sort?: BookingSortField;
      order?: "asc" | "desc";
    }) => {
      if (patch.page !== undefined) setPage(patch.page);
      if (patch.limit !== undefined) setLimit(patch.limit);
      if (patch.type !== undefined) setTypeFilter(patch.type);
      if (patch.status !== undefined) setStatusFilter(patch.status);
      if (patch.q !== undefined) setSearchQ(patch.q);
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
      const res = await listMyBookings({
        page,
        limit,
        sort,
        order,
        ...(typeFilter ? { type: typeFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(searchQ.trim() ? { q: searchQ.trim() } : {}),
      });
      setRows(res.data.map(mapBookingToRow));
      setTotal(res.meta.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bookings");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [page, limit, typeFilter, statusFilter, searchQ, sort, order]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!highlightRef || loading) return;
    const match = rows.find(
      (r) => r.id === highlightRef || r.booking_ref_no === highlightRef,
    );
    const targetId = match?.id ?? highlightRef;
    const el = document.querySelector<HTMLElement>(`[data-row-id="${targetId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightRef, loading, rows]);

  const filterConfig: FilterConfig = useMemo(
    () => ({
      fields: [
        {
          key: "q",
          label: "Search",
          type: "text",
          placeholder: "Booking reference…",
          cols: 12,
          mdCols: 6,
        },
        {
          key: "type",
          label: "Booking type",
          type: "select",
          cols: 12,
          mdCols: 3,
          options: [
            { value: "all", label: "All types" },
            { value: "flight", label: "Flights" },
            { value: "hotel", label: "Hotels" },
            { value: "car", label: "Cars" },
          ],
        },
        {
          key: "status",
          label: "Status",
          type: "select",
          cols: 12,
          mdCols: 3,
          options: [
            { value: "all", label: "All statuses" },
            { value: "pending", label: "Pending" },
            { value: "confirmed", label: "Confirmed" },
            { value: "cancelled", label: "Cancelled" },
          ],
        },
      ],
      defaultValues: { q: "", type: "all", status: "all" },
    }),
    [],
  );

  const appliedFilters = useMemo(
    () => ({
      q: searchQ,
      type: typeFilter || "all",
      status: statusFilter || "all",
    }),
    [searchQ, typeFilter, statusFilter],
  );

  const onFilterChange = useCallback(
    (filters: Record<string, unknown>) => {
      const qq = String(filters.q ?? "").trim();
      const typeVal = String(filters.type ?? "all");
      const statusVal = String(filters.status ?? "all");
      applyQueryPatch({
        page: 1,
        q: qq,
        type: typeVal === "all" ? "" : typeVal,
        status: statusVal === "all" ? "" : statusVal,
      });
    },
    [applyQueryPatch],
  );

  const hasActiveFilters = useMemo(() => {
    return Boolean(searchQ.trim()) || Boolean(typeFilter) || Boolean(statusFilter);
  }, [searchQ, typeFilter, statusFilter]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (searchQ.trim()) n += 1;
    if (typeFilter) n += 1;
    if (statusFilter) n += 1;
    return n;
  }, [searchQ, typeFilter, statusFilter]);

  const columns: ColumnDef<MyBookingsRow>[] = useMemo(() => {
    const all: ColumnDef<MyBookingsRow>[] = [
      {
        key: "typeLabel",
        label: "Type",
        sortable: false,
        render: (value) => (
          <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {String(value)}
          </span>
        ),
      },
      { key: "trip", label: "Trip", sortable: false, className: "font-medium min-w-[140px]" },
      {
        key: "departure",
        label: "Departure",
        sortable: false,
        className: "text-muted-foreground whitespace-nowrap",
      },
      { key: "pnr", label: "PNR", sortable: false, className: "text-muted-foreground whitespace-nowrap" },
      {
        key: "reference",
        label: "Reference",
        sortable: true,
        className: "text-muted-foreground whitespace-nowrap",
      },
      { key: "booked", label: "Booked", sortable: true, className: "text-muted-foreground whitespace-nowrap" },
      { key: "amount", label: "Amount", sortable: true, className: "font-medium whitespace-nowrap" },
      {
        key: "status",
        label: "Status",
        sortable: true,
        className: "capitalize text-muted-foreground whitespace-nowrap",
      },
    ];
    // Profile embed only — full page (/profile/bookings) keeps all columns.
    if (!standalone) {
      return all.filter((col) => col.key !== "pnr" && col.key !== "reference");
    }
    return all;
  }, [standalone]);

  const sortColumn = useMemo((): keyof MyBookingsRow => {
    const col = API_SORT_TO_COLUMN[sort];
    if (!standalone && col === "reference") return "booked";
    return col;
  }, [sort, standalone]);
  const sortDirection = order;

  const onSort = useCallback(
    (column: keyof MyBookingsRow, direction: "asc" | "desc") => {
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

  const title = standalone ? "My bookings" : "My orders";
  const subtitle = standalone
    ? "Flights, hotels, and car rentals in one place."
    : "View and open your trip confirmations.";

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
          filterText="Filter orders"
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
          <div className="flex flex-col md:flex-row gap-2 md:gap-0 justify-between">
            <div>
            <h2 className="font-heading text-xl font-bold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <div className="flex items-center gap-2">

            {!standalone ? (
           
                <Link href="/profile/bookings" className="text-primary hover:bg-primary hover:text-muted border border-primary rounded-sm px-2 py-1 w-full md:w-auto">
                  Open full-page list
                </Link>
            
            ) : null}
         
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <FilterToggleButton
            className="w-full md:w-auto"
              hasActiveFilters={hasActiveFilters}
              isExpanded={isFilterExpanded}
              onToggle={() => setIsFilterExpanded((v) => !v)}
              activeFiltersCount={activeFiltersCount}
              filterText="Filter orders"
              clearText="Clear filters"
            />
          </div>
          {filterPanel}
            </div>
            </div>
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <DataTable<MyBookingsRow>
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
        emptyMessage="No bookings yet. When you complete a purchase, it will appear here."
        tableWrapperClassName="overflow-x-auto"
        getRowId={(row) => row.id}
        getRowClassName={(row) =>
          highlightRef && (row.booking_ref_no === highlightRef || row.id === highlightRef)
            ? "border-primary/40 bg-primary/5 ring-2 ring-primary/25"
            : ""
        }
        actions={{
          view: { enabled: false },
          delete: { enabled: false },
          edit: {
            label: "View details",
            onClick: (row) => router.push(`/profile/bookings/${encodeURIComponent(row.id)}`),
          },
        }}
      />
    </div>
  );
}
