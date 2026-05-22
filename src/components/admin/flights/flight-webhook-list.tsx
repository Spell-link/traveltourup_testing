"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import type { z } from "zod";
import { adminFlightWebhookListQuerySchema } from "@/lib/validations/admin-flights.schema";
import PageHeader from "@/components/admin_ui/shared/page-header";
import DataTable, { type ColumnDef } from "@/components/admin_ui/shared/data-table";
import GenericFilter, { type FilterConfig } from "@/components/admin_ui/shared/generic-filter";
import { FlightNavLinks } from "@/components/admin/flights/flight-nav-links";

export type FlightWebhookListRow = {
  id: string;
  type: string;
  eventId: string;
  received: string;
  processed: string;
  error: string;
};

type ListQuery = z.infer<typeof adminFlightWebhookListQuerySchema>;

export type FlightWebhookListProps = {
  rows: FlightWebhookListRow[];
  total: number;
  query: ListQuery;
};

export function FlightWebhookList({ rows, total, query }: FlightWebhookListProps) {
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
      if (q.type) u.set("type", q.type);
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
          key: "type",
          label: "Event type",
          type: "text",
          placeholder: "payment_intent.succeeded / order.created …",
          cols: 12,
          mdCols: 8,
        },
      ],
      defaultValues: { type: "" },
    }),
    [],
  );

  const appliedFilters = useMemo(() => ({ type: query.type ?? "" }), [query.type]);

  const onFilterChange = useCallback(
    (filters: Record<string, unknown>) => {
      const u = new URLSearchParams();
      u.set("page", "1");
      u.set("limit", String(query.limit));
      const t = String(filters.type ?? "").trim();
      if (t) u.set("type", t);
      u.set("sort", query.sort);
      u.set("order", query.order);
      navigate(`/admin/flights/webhooks?${u.toString()}`);
    },
    [navigate, query.limit, query.order, query.sort],
  );

  const hasActiveFilters = Boolean((appliedFilters.type ?? "").trim());
  const activeFiltersCount = hasActiveFilters ? 1 : 0;

  const columns: ColumnDef<FlightWebhookListRow>[] = useMemo(
    () => [
      { key: "type", label: "Type", sortable: true, className: "font-mono text-xs" },
      { key: "eventId", label: "Event id", sortable: false, className: "font-mono text-xs text-muted-foreground" },
      { key: "received", label: "Received", sortable: true, className: "text-xs whitespace-nowrap" },
      { key: "processed", label: "Processed", sortable: false, className: "text-xs whitespace-nowrap" },
      {
        key: "error",
        label: "Error",
        sortable: false,
        className: "text-xs text-rose-700 max-w-[240px] truncate",
        render: (_v, row) => row.error || "—",
      },
    ],
    [],
  );

  const sortColumn = (query.sort === "type" ? "type" : "received") as keyof FlightWebhookListRow;
  const sortDirection = query.order;

  const onSort = useCallback(
    (column: keyof FlightWebhookListRow, direction: "asc" | "desc") => {
      const sortField = column === "type" ? "type" : "received_at";
      navigate(
        `/admin/flights/webhooks?${buildQs({ page: 1, sort: sortField as ListQuery["sort"], order: direction })}`,
      );
    },
    [buildQs, navigate],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Duffel webhooks"
        subtitle="Read-only audit log of every Duffel webhook we have received."
        showAddButton={false}
        showFilterButton
        hasActiveFilters={hasActiveFilters}
        isFilterExpanded={isFilterExpanded}
        onFilterToggle={() => setIsFilterExpanded((v) => !v)}
        activeFiltersCount={activeFiltersCount}
        filterText="Filter webhooks"
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

      <FlightNavLinks current="webhooks" />

      <DataTable<FlightWebhookListRow>
        data={rows}
        columns={columns}
        loading={isListPending || isRefreshPending}
        totalCount={total}
        currentPage={query.page}
        pageSize={query.limit}
        NoOfCards={0}
        onPageChange={(page) => navigate(`/admin/flights/webhooks?${buildQs({ page })}`)}
        onPageSizeChange={(limit) => navigate(`/admin/flights/webhooks?${buildQs({ page: 1, limit })}`)}
        onSort={onSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        showViewToggle={false}
        enablePermissionChecking={false}
        emptyMessage="No webhook events recorded."
        actions={{
          view: { enabled: false },
          delete: { enabled: false },
          edit: { enabled: false },
        }}
      />
    </div>
  );
}
