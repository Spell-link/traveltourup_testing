"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import PageHeader from "@/components/admin_ui/shared/page-header";
import DataTable, { type ColumnDef } from "@/components/admin_ui/shared/data-table";
import { AdminCompensationRefundButton } from "@/components/admin/flights/admin-compensation-refund-button";
import { FlightNavLinks } from "@/components/admin/flights/flight-nav-links";

export type OrphanPitRow = {
  id: string;
  duffelIntentId: string;
  status: string;
  amount: string;
  offerId: string;
  failureCode: string;
  refundInfo: string;
  updated: string;
  showCompensation: boolean;
  compensationLabel: string;
};

export type FlightOrphanPitViewProps = {
  orphan: OrphanPitRow[];
  postCaptureFailed: OrphanPitRow[];
  autoRefundEnabled: boolean;
};

const tableProps = {
  NoOfCards: 0,
  showViewToggle: false,
  enablePermissionChecking: false,
  actions: { view: { enabled: false }, delete: { enabled: false }, edit: { enabled: false } },
} as const;

function buildColumns(variant: "orphan" | "terminal"): ColumnDef<OrphanPitRow>[] {
  const base: ColumnDef<OrphanPitRow>[] = [
    { key: "duffelIntentId", label: "PIT (Duffel)", className: "font-mono text-xs" },
    { key: "status", label: "Status", className: "font-mono text-xs" },
    { key: "amount", label: "Amount", className: "font-mono text-xs" },
    { key: "offerId", label: "Offer id", className: "font-mono text-xs" },
  ];
  if (variant === "terminal") {
    base.push(
      { key: "failureCode", label: "Failure code", className: "font-mono text-xs" },
      { key: "refundInfo", label: "Refund", className: "font-mono text-xs" },
    );
  }
  base.push(
    { key: "updated", label: "Updated", className: "text-xs whitespace-nowrap" },
    {
      key: "id",
      label: "Actions",
      render: (_v, row) =>
        row.showCompensation ? (
          <AdminCompensationRefundButton
            duffelIntentId={row.duffelIntentId}
            label={row.compensationLabel}
          />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  );
  return base;
}

function OrphanSection({
  title,
  description,
  rows,
  variant,
  tone,
}: {
  title: string;
  description: string;
  rows: OrphanPitRow[];
  variant: "orphan" | "terminal";
  tone: "rose" | "amber";
}) {
  const columns = useMemo(() => buildColumns(variant), [variant]);
  const toneClass = tone === "rose" ? "text-rose-700 dark:text-rose-300" : "text-amber-700 dark:text-amber-300";

  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-background p-4">
        <h3 className={`text-sm font-semibold ${toneClass}`}>{title}</h3>
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          Queue clear — nothing to investigate.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-background p-4 space-y-3">
      <div>
        <h3 className={`text-sm font-semibold ${toneClass}`}>{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <DataTable<OrphanPitRow>
        data={rows}
        columns={columns}
        totalCount={rows.length}
        currentPage={1}
        pageSize={Math.max(rows.length, 1)}
        emptyMessage="Queue clear."
        {...tableProps}
      />
    </section>
  );
}

export function FlightOrphanPitView({ orphan, postCaptureFailed, autoRefundEnabled }: FlightOrphanPitViewProps) {
  const router = useRouter();
  const [isRefreshPending, startRefreshTransition] = useTransition();

  const onRefresh = useCallback(() => {
    startRefreshTransition(() => {
      router.refresh();
    });
  }, [router, startRefreshTransition]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orphan PaymentIntents"
        subtitle="Money captured without a matching booking, or order failures after capture."
        showAddButton={false}
        showFilterButton={false}
        showRefreshButton
        onRefresh={onRefresh}
        isRefreshing={isRefreshPending}
      />

      <FlightNavLinks current="orphan" />

      <p className="text-xs text-muted-foreground">
        Orphan auto-refund cron:{" "}
        <code>
          {autoRefundEnabled ? "enabled (FLIGHT_ORPHAN_PIT_AUTO_REFUND=1)" : "disabled"}
        </code>
      </p>

      <OrphanSection
        title={`Succeeded payment with no booking (${orphan.length})`}
        description="PIT status = succeeded, stale ≥10 min, no booking_id. Verify in Duffel or issue a manual refund."
        rows={orphan}
        variant="orphan"
        tone="rose"
      />

      <OrphanSection
        title={`Order failed after capture (${postCaptureFailed.length})`}
        description="Saga compensation should have run. Retry refund when order_failure_refund_status is not succeeded/completed."
        rows={postCaptureFailed}
        variant="terminal"
        tone="amber"
      />
    </div>
  );
}
