"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import type { z } from "zod";
import { adminJourneyInterestsQuerySchema } from "@/lib/validations/customer-journey.schema";
import { FUNNEL_STAGES, JOURNEY_PRODUCT_TYPES } from "@/lib/constants/customer-journey";
import PageHeader from "@/components/admin_ui/shared/page-header";
import DataTable, { type ColumnDef, type ActionMenuItem } from "@/components/admin_ui/shared/data-table";
import GenericFilter, { type FilterConfig } from "@/components/admin_ui/shared/generic-filter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/admin_ui/ui/sheet";
import { apiJson } from "@/lib/http/api-client";

export type JourneyListRow = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  product_type: string;
  product_ref: string;
  funnel_stage: string;
  title: string | null;
  route_label: string;
  dates_label: string;
  travelers_summary: string | null;
  price: string;
  last_seen: string;
  hours_since_last_seen: number;
  is_abandoned: boolean;
  contact_incomplete: boolean;
  converted_booking_id: string | null;
  event_count: number;
};

type ListQuery = z.infer<typeof adminJourneyInterestsQuerySchema>;

type TimelineResponse = {
  user: { id: string; name: string; email: string; phone: string | null };
  events: Array<{
    id: string;
    event_type: string;
    funnel_stage: string;
    product_type: string;
    product_ref: string;
    created_at: string;
  }>;
};

function formatStage(stage: string): string {
  return stage.replace(/_/g, " ");
}

export function JourneyList({
  rows,
  total,
  query,
}: {
  rows: JourneyListRow[];
  total: number;
  query: ListQuery;
}) {
  const router = useRouter();
  const [isListPending, startListTransition] = useTransition();
  const [isRefreshPending, startRefreshTransition] = useTransition();
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [timelineUserId, setTimelineUserId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

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
      if (q.stage) u.set("stage", q.stage);
      if (q.product_type) u.set("product_type", q.product_type);
      if (q.abandoned_only) u.set("abandoned_only", "true");
      if (q.sort) {
        u.set("sort", q.sort);
        u.set("order", q.order);
      }
      return u.toString();
    },
    [query],
  );

  const openTimeline = useCallback(async (userId: string) => {
    setTimelineUserId(userId);
    setTimelineLoading(true);
    setTimeline(null);
    try {
      const data = await apiJson<TimelineResponse>(
        `/api/v1/admin/journey/users/${encodeURIComponent(userId)}/timeline`,
      );
      setTimeline(data);
    } catch {
      setTimeline(null);
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  const filterConfig: FilterConfig = useMemo(
    () => ({
      fields: [
        {
          key: "product_type",
          label: "Product",
          type: "select",
          cols: 12,
          mdCols: 4,
          options: [
            { value: "all", label: "All products" },
            ...JOURNEY_PRODUCT_TYPES.map((t) => ({ value: t, label: t })),
          ],
        },
        {
          key: "stage",
          label: "Stage",
          type: "select",
          cols: 12,
          mdCols: 4,
          options: [
            { value: "all", label: "All stages" },
            ...FUNNEL_STAGES.filter((s) => s !== "abandoned").map((s) => ({
              value: s,
              label: formatStage(s),
            })),
          ],
        },
        {
          key: "abandoned_only",
          label: "Abandoned only",
          type: "select",
          cols: 12,
          mdCols: 4,
          options: [
            { value: "false", label: "All intents" },
            { value: "true", label: "Abandoned only" },
          ],
        },
      ],
      defaultValues: {
        product_type: "all",
        stage: "all",
        abandoned_only: "false",
      },
    }),
    [],
  );

  const appliedFilters = useMemo(
    () => ({
      product_type: query.product_type ?? "all",
      stage: query.stage ?? "all",
      abandoned_only: query.abandoned_only ? "true" : "false",
    }),
    [query],
  );

  const onFilterChange = useCallback(
    (filters: Record<string, unknown>) => {
      navigate(
        `/admin/journey?${buildQs({
          page: 1,
          product_type:
            filters.product_type === "all"
              ? undefined
              : (String(filters.product_type) as ListQuery["product_type"]),
          stage:
            filters.stage === "all" ? undefined : (String(filters.stage) as ListQuery["stage"]),
          abandoned_only: String(filters.abandoned_only) === "true",
        })}`,
      );
    },
    [buildQs, navigate],
  );

  const hasActiveFilters =
    appliedFilters.product_type !== "all" ||
    appliedFilters.stage !== "all" ||
    appliedFilters.abandoned_only === "true";

  const activeFiltersCount = [
    appliedFilters.product_type !== "all",
    appliedFilters.stage !== "all",
    appliedFilters.abandoned_only === "true",
  ].filter(Boolean).length;

  const onRefresh = useCallback(() => {
    startRefreshTransition(() => router.refresh());
  }, [router, startRefreshTransition]);

  const viewIntentAction: ActionMenuItem<JourneyListRow> = {
    label: "View intent detail",
    icon: <ExternalLink className="h-4 w-4" />,
    onClick: (row) => navigate(`/admin/journey/${row.id}`),
  };

  const columns: ColumnDef<JourneyListRow>[] = useMemo(
    () => [
      {
        key: "user_name",
        label: "Customer",
        render: (_value, row) => (
          <div className="min-w-0">
            <button
              type="button"
              className="text-left text-primary hover:underline"
              onClick={() => void openTimeline(row.user_id)}
            >
              {row.user_name}
            </button>
            <p className="truncate text-xs text-muted-foreground">{row.user_email}</p>
          </div>
        ),
      },
      {
        key: "route_label",
        label: "Route / property",
        render: (_value, row) => (
          <div className="min-w-0">
            <div className="font-medium capitalize">{row.product_type}</div>
            <div className="truncate text-xs">{row.route_label}</div>
          </div>
        ),
      },
      { key: "dates_label", label: "Dates" },
      {
        key: "travelers_summary",
        label: "Travelers",
        render: (v) => (v ? String(v) : "—"),
      },
      {
        key: "funnel_stage",
        label: "Stage",
        render: (_value, row) => (
          <div>
            <span className="capitalize">
              {formatStage(row.funnel_stage)}
              {row.is_abandoned ? " · abandoned" : ""}
            </span>
            {row.event_count > 0 && (
              <p className="text-xs text-muted-foreground">
                {row.event_count} event{row.event_count === 1 ? "" : "s"}
              </p>
            )}
          </div>
        ),
      },
      { key: "price", label: "Price" },
      {
        key: "hours_since_last_seen",
        label: "Urgency",
        render: (_value, row) => (
          <span className={row.is_abandoned ? "font-medium text-amber-700 dark:text-amber-400" : ""}>
            {row.hours_since_last_seen}h ago
          </span>
        ),
      },
      { key: "last_seen", label: "Last seen" },
      {
        key: "converted_booking_id",
        label: "Booking",
        render: (_value, row) =>
          row.converted_booking_id ? (
            <Link href={`/admin/bookings/${row.converted_booking_id}`} className="text-primary hover:underline">
              View
            </Link>
          ) : (
            "—"
          ),
      },
    ],
    [openTimeline],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer journey"
        subtitle="Abandoned booking intents with route, dates, and travelers. Requires admin.journey:read."
        showAddButton={false}
        showFilterButton
        hasActiveFilters={hasActiveFilters}
        isFilterExpanded={isFilterExpanded}
        onFilterToggle={() => setIsFilterExpanded((v) => !v)}
        activeFiltersCount={activeFiltersCount}
        filterText="Filter intents"
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

      <DataTable<JourneyListRow>
        data={rows}
        columns={columns}
        loading={isListPending || isRefreshPending}
        totalCount={total}
        currentPage={query.page}
        pageSize={query.limit}
        NoOfCards={0}
        onPageChange={(page) => navigate(`/admin/journey?${buildQs({ page })}`)}
        onPageSizeChange={(limit) => navigate(`/admin/journey?${buildQs({ page: 1, limit })}`)}
        onRowClick={(row) => navigate(`/admin/journey/${row.id}`)}
        enablePermissionChecking={false}
        emptyMessage="No journey intents match your filters."
        actions={{ view: { enabled: false }, delete: { enabled: false }, edit: { enabled: false } }}
        customActions={[viewIntentAction]}
      />

      <Sheet open={timelineUserId != null} onOpenChange={(open) => !open && setTimelineUserId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Customer timeline (all products)</SheetTitle>
          </SheetHeader>
          {timelineLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
          {!timelineLoading && timeline && (
            <div className="mt-4 space-y-4">
              <div className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium">{timeline.user.name}</p>
                <p>{timeline.user.email || "No email"}</p>
                <p>{timeline.user.phone || "No phone on file"}</p>
              </div>
              <ol className="space-y-3 border-s border-border ps-4">
                {timeline.events.map((ev) => (
                  <li key={ev.id} className="relative text-sm">
                    <span className="absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    <p className="font-medium capitalize">{formatStage(ev.funnel_stage)}</p>
                    <p className="text-muted-foreground">{ev.event_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString()} · {ev.product_type}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
