"use client";

import Link from "next/link";
import PageHeader from "@/components/admin_ui/shared/page-header";
import DataTable, { type ColumnDef } from "@/components/admin_ui/shared/data-table";
import { AdminFlightRefundRetryButton } from "@/components/admin/flights/admin-flight-refund-retry-button";
import { FlightNavLinks } from "@/components/admin/flights/flight-nav-links";
import type { AdminFlightSagaDetail } from "@/lib/admin/admin-flights.types";
import type { ReconciliationLine } from "@/lib/payments/flight-revenue-breakdown";

const EVENT_LABELS: Record<string, string> = {
  intent_created: "PaymentIntent created",
  intent_succeeded: "Payment captured",
  intent_failed: "Payment failed",
  order_placed: "Order placed",
  order_failed: "Order failed (after capture)",
  refund_initiated: "Refund initiated",
  refund_succeeded: "Refund succeeded",
  refund_failed: "Refund failed",
  cancel_quoted: "Cancellation quoted",
  cancel_confirmed: "Cancellation confirmed",
  change_quoted: "Change quoted",
  change_confirmed: "Change confirmed",
};

type PitRow = {
  id: string;
  duffelId: string;
  status: string;
  charge: string;
  offer: string;
  markup: string;
  orderFailure: string;
};

type CancelRow = {
  id: string;
  duffelId: string;
  status: string;
  refund: string;
  refundTo: string;
  quoteExpires: string;
  confirmed: string;
};

type RefundRow = {
  id: string;
  duffelRefund: string;
  status: string;
  amount: string;
  error: string;
  updated: string;
};

export type FlightSagaDetailViewProps = {
  detail: AdminFlightSagaDetail;
};

function mapPitRows(detail: AdminFlightSagaDetail): PitRow[] {
  return detail.payment_intents.map((p) => ({
    id: p.id,
    duffelId: p.duffel_intent_id,
    status: p.status,
    charge: `${p.charge_amount} ${p.charge_currency}`,
    offer: `${p.offer_amount} ${p.offer_currency}`,
    markup: p.markup_amount,
    orderFailure: p.order_failure_at
      ? `${p.order_failure_code ?? "FAILED"}${p.order_failure_refund_id ? ` · refund ${p.order_failure_refund_id} (${p.order_failure_refund_status ?? "?"})` : " · no refund"}`
      : "—",
  }));
}

function mapCancelRows(detail: AdminFlightSagaDetail): CancelRow[] {
  return detail.cancellations.map((c) => ({
    id: c.id,
    duffelId: c.duffel_cancellation_id,
    status: c.status,
    refund: c.refund_amount ? `${c.refund_amount} ${c.refund_currency ?? ""}` : "—",
    refundTo: c.refund_to ?? "—",
    quoteExpires: c.quote_expires_at ? new Date(c.quote_expires_at).toLocaleString() : "—",
    confirmed: c.confirmed_at ? new Date(c.confirmed_at).toLocaleString() : "—",
  }));
}

function mapRefundRows(detail: AdminFlightSagaDetail): RefundRow[] {
  return detail.refund_attempts.map((r) => ({
    id: r.id,
    duffelRefund: r.duffel_refund_id ?? "—",
    status: r.status,
    amount: r.amount ? `${r.amount} ${r.currency ?? ""}` : "—",
    error: r.error_code ?? "—",
    updated: new Date(r.updated_at).toLocaleString(),
  }));
}

const pitColumns: ColumnDef<PitRow>[] = [
  { key: "duffelId", label: "Duffel id", className: "font-mono text-xs" },
  { key: "status", label: "Status", className: "font-mono text-xs" },
  { key: "charge", label: "Charge", className: "font-mono text-xs" },
  { key: "offer", label: "Offer", className: "font-mono text-xs" },
  { key: "markup", label: "Markup", className: "font-mono text-xs" },
  { key: "orderFailure", label: "Order failure", className: "font-mono text-xs" },
];

const cancelColumns: ColumnDef<CancelRow>[] = [
  { key: "duffelId", label: "Duffel id", className: "font-mono text-xs" },
  { key: "status", label: "Status", className: "font-mono text-xs" },
  { key: "refund", label: "Refund", className: "font-mono text-xs" },
  { key: "refundTo", label: "Refund to", className: "font-mono text-xs" },
  { key: "quoteExpires", label: "Quote expires", className: "text-xs whitespace-nowrap" },
  { key: "confirmed", label: "Confirmed", className: "text-xs whitespace-nowrap" },
];

const refundColumns: ColumnDef<RefundRow>[] = [
  { key: "duffelRefund", label: "Duffel refund", className: "font-mono text-xs" },
  { key: "status", label: "Status", className: "font-mono text-xs" },
  { key: "amount", label: "Amount", className: "font-mono text-xs" },
  { key: "error", label: "Error", className: "font-mono text-xs" },
  { key: "updated", label: "Updated", className: "text-xs whitespace-nowrap" },
];

type ReconRow = {
  type: string;
  label: string;
  reference: string;
  description: string;
  amount: string;
  impact: string;
  at: string;
};

const reconColumns: ColumnDef<ReconRow>[] = [
  { key: "label", label: "Type", className: "text-xs font-medium" },
  { key: "reference", label: "Reference", className: "font-mono text-xs max-w-[140px] truncate" },
  { key: "description", label: "Description", className: "text-xs text-muted-foreground" },
  { key: "amount", label: "Amount", className: "tabular-nums text-xs text-right" },
  { key: "impact", label: "Balance", className: "tabular-nums text-xs text-right font-medium" },
  { key: "at", label: "When", className: "text-xs text-muted-foreground whitespace-nowrap" },
];

function mapReconRows(lines: ReconciliationLine[]): ReconRow[] {
  return lines.map((l) => ({
    type: l.type,
    label: l.label,
    reference: l.reference ?? "—",
    description: l.description,
    amount: `${l.amount} ${l.currency}`,
    impact: l.balance_impact,
    at: new Date(l.at).toLocaleString(),
  }));
}

const tableProps = {
  NoOfCards: 0,
  showViewToggle: false,
  enablePermissionChecking: false,
  actions: { view: { enabled: false }, delete: { enabled: false }, edit: { enabled: false } },
} as const;

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={mono ? "font-mono text-xs" : "text-foreground"}>{v}</dd>
    </div>
  );
}

export function FlightSagaDetailView({ detail }: FlightSagaDetailViewProps) {
  const { booking, financial_events, revenue, reconciliation, pit_revenue } = detail;
  const pitRows = mapPitRows(detail);
  const cancelRows = mapCancelRows(detail);
  const refundRows = mapRefundRows(detail);
  const reconRows = mapReconRows(reconciliation);
  const duffelDashboardOrderUrl = booking.duffel_order_id
    ? `https://app.duffel.com/orders/${booking.duffel_order_id}`
    : null;
  const duffelDashboardPitUrl = pit_revenue?.duffel_intent_id
    ? `https://app.duffel.com/payments/payment-intents/${pit_revenue.duffel_intent_id}`
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Flight ${booking.booking_ref_no}`}
        subtitle={`${booking.status} · payment ${booking.payment_status} · ${booking.total_amount} ${booking.currency}`}
        showAddButton={false}
        showFilterButton={false}
      />

      <FlightNavLinks current="bookings" />

      {revenue ? (
        <section className="rounded-2xl border border-border bg-background p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Financial summary</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {duffelDashboardOrderUrl ? (
                <a
                  href={duffelDashboardOrderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Duffel order
                </a>
              ) : null}
              {duffelDashboardPitUrl ? (
                <a
                  href={duffelDashboardPitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Duffel payment
                </a>
              ) : null}
            </div>
          </div>
          {revenue.estimated ? (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Fee amounts estimated (legacy booking without full pricing snapshot).
            </p>
          ) : null}
          <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <Row k="Customer paid" v={`${revenue.customer_paid} ${revenue.currency}`} mono />
            <Row k="Duffel cost" v={`${revenue.duffel_cost} ${revenue.currency}`} mono />
            <Row k="Commission" v={`${revenue.commission} ${revenue.currency}`} mono />
            <Row k="Duffel Payments fee" v={`${revenue.duffel_payment_fee} ${revenue.currency}`} mono />
            <Row k="Airline order total" v={`${booking.total_amount} ${booking.currency}`} mono />
            {revenue.net_commission ? (
              <Row k="Net commission" v={`${revenue.net_commission} ${revenue.currency}`} mono />
            ) : null}
            {pit_revenue?.duffel_reported_fees_amount ? (
              <Row
                k="Duffel reported fee"
                v={`${pit_revenue.duffel_reported_fees_amount} ${revenue.currency}`}
                mono
              />
            ) : null}
          </dl>
        </section>
      ) : null}

      {reconRows.length > 0 ? (
        <section className="rounded-2xl border border-border bg-background p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Balance reconciliation</h3>
          <p className="text-xs text-muted-foreground">
            Line items aligned with the Duffel merchant dashboard (order debit, fees, payment, cancellation credit).
          </p>
          <DataTable<ReconRow>
            data={reconRows}
            columns={reconColumns}
            totalCount={reconRows.length}
            currentPage={1}
            pageSize={Math.max(reconRows.length, 1)}
            emptyMessage="No reconciliation lines."
            {...tableProps}
          />
        </section>
      ) : null}

      {booking.status === "cancelled" && booking.payment_status === "refund_failed" ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-300">Refund failed</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            The automatic card refund did not complete. Retry settlement via Duffel Payments Refunds API.
          </p>
          <AdminFlightRefundRetryButton bookingId={booking.id} />
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-background p-4">
          <h3 className="text-sm font-semibold text-foreground">Booking</h3>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row k="Booking id" v={booking.id} mono />
            <Row k="Customer" v={booking.user_name ?? "—"} />
            <Row k="Duffel order id" v={booking.duffel_order_id ?? "—"} mono />
            <Row k="Airline PNR" v={booking.airline_pnr ?? "—"} mono />
            <Row k="Offer id" v={booking.offer_id ?? "—"} mono />
            <Row
              k="Live mode"
              v={booking.live_mode == null ? "—" : booking.live_mode ? "yes" : "no (test)"}
            />
            <Row k="Created" v={new Date(booking.created_at).toLocaleString()} />
            <Row k="Updated" v={new Date(booking.updated_at).toLocaleString()} />
          </dl>
          <Link
            href={`/admin/bookings/${booking.id}`}
            className="mt-3 inline-block text-sm text-primary hover:underline"
          >
            Open in bookings module
          </Link>
          {/* Ledger links to /admin/bookings; saga ops live at /admin/flights/:id */}
        </section>

        <section className="rounded-2xl border border-border bg-background p-4">
          <h3 className="text-sm font-semibold text-foreground">Saga timeline</h3>
          {financial_events.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No ledger events recorded yet.</p>
          ) : (
            <ol className="mt-4 space-y-3 border-l border-border/40 pl-4 text-sm">
              {financial_events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary/70" />
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{EVENT_LABELS[e.type] ?? e.type}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </span>
                  </div>
                  {e.amount && e.currency ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {e.amount} {e.currency}
                    </p>
                  ) : null}
                  {e.payload ? (
                    <pre className="mt-1 overflow-auto rounded-md bg-muted/30 p-2 text-[11px] leading-snug text-muted-foreground">
                      {JSON.stringify(e.payload, null, 2)}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-background p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Payment intents</h3>
        <DataTable<PitRow>
          data={pitRows}
          columns={pitColumns}
          totalCount={pitRows.length}
          currentPage={1}
          pageSize={Math.max(pitRows.length, 1)}
          emptyMessage="No payment intents."
          {...tableProps}
        />
      </section>

      <section className="rounded-2xl border border-border bg-background p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Order cancellations</h3>
        <DataTable<CancelRow>
          data={cancelRows}
          columns={cancelColumns}
          totalCount={cancelRows.length}
          currentPage={1}
          pageSize={Math.max(cancelRows.length, 1)}
          emptyMessage="No cancellations."
          {...tableProps}
        />
      </section>

      <section className="rounded-2xl border border-border bg-background p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Refund attempts</h3>
        <DataTable<RefundRow>
          data={refundRows}
          columns={refundColumns}
          totalCount={refundRows.length}
          currentPage={1}
          pageSize={Math.max(refundRows.length, 1)}
          emptyMessage="No refund attempts."
          {...tableProps}
        />
      </section>
    </div>
  );
}
