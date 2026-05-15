import { notFound } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/admin_ui/shared/page-header";
import { getAdminFlightSagaDetail } from "@/lib/services/admin/admin-flights.service";

export const dynamic = "force-dynamic";

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

export default async function AdminFlightDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAdminFlightSagaDetail(id);
  if (!detail) notFound();

  const { booking, payment_intents, cancellations, refund_attempts, financial_events } = detail;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Flight ${booking.booking_ref_no}`}
        subtitle={`${booking.status} · payment ${booking.payment_status} · ${booking.total_amount} ${booking.currency}`}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-background p-4">
          <h3 className="text-sm font-semibold text-foreground">Booking</h3>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row k="Booking id" v={booking.id} mono />
            <Row k="Customer" v={booking.user_name ?? "—"} />
            <Row k="Duffel order id" v={booking.duffel_order_id ?? "—"} mono />
            <Row k="Airline PNR" v={booking.airline_pnr ?? "—"} mono />
            <Row k="Offer id" v={booking.offer_id ?? "—"} mono />
            <Row k="Live mode" v={booking.live_mode == null ? "—" : booking.live_mode ? "yes" : "no (test)"} />
            <Row k="Created" v={new Date(booking.created_at).toLocaleString()} />
            <Row k="Updated" v={new Date(booking.updated_at).toLocaleString()} />
          </dl>
          <Link
            href={`/admin/bookings/${booking.id}`}
            className="mt-3 inline-block text-sm text-primary hover:underline"
          >
            ↗ open in bookings module
          </Link>
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
                    <p className="font-medium text-foreground">
                      {EVENT_LABELS[e.type] ?? e.type}
                    </p>
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

      <section className="rounded-2xl border border-border bg-background p-4">
        <h3 className="text-sm font-semibold text-foreground">Payment intents</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1.5 pr-3">Duffel id</th>
                <th className="py-1.5 pr-3">Status</th>
                <th className="py-1.5 pr-3">Charge</th>
                <th className="py-1.5 pr-3">Offer</th>
                <th className="py-1.5 pr-3">Markup</th>
                <th className="py-1.5 pr-3">Order failure</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {payment_intents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-3 text-center text-muted-foreground">
                    No payment intents.
                  </td>
                </tr>
              ) : (
                payment_intents.map((p) => (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="py-1.5 pr-3">{p.duffel_intent_id}</td>
                    <td className="py-1.5 pr-3">{p.status}</td>
                    <td className="py-1.5 pr-3">{p.charge_amount} {p.charge_currency}</td>
                    <td className="py-1.5 pr-3">{p.offer_amount} {p.offer_currency}</td>
                    <td className="py-1.5 pr-3">{p.markup_amount}</td>
                    <td className="py-1.5 pr-3">
                      {p.order_failure_at ? (
                        <span>
                          {p.order_failure_code ?? "FAILED"}
                          {p.order_failure_refund_id
                            ? ` · refund ${p.order_failure_refund_id} (${p.order_failure_refund_status ?? "?"})`
                            : " · no refund"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <h3 className="text-sm font-semibold text-foreground">Order cancellations</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1.5 pr-3">Duffel id</th>
                <th className="py-1.5 pr-3">Status</th>
                <th className="py-1.5 pr-3">Refund</th>
                <th className="py-1.5 pr-3">Refund to</th>
                <th className="py-1.5 pr-3">Quote expires</th>
                <th className="py-1.5 pr-3">Confirmed</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {cancellations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-3 text-center text-muted-foreground">
                    No cancellations.
                  </td>
                </tr>
              ) : (
                cancellations.map((c) => (
                  <tr key={c.id} className="border-t border-border/60">
                    <td className="py-1.5 pr-3">{c.duffel_cancellation_id}</td>
                    <td className="py-1.5 pr-3">{c.status}</td>
                    <td className="py-1.5 pr-3">
                      {c.refund_amount ? `${c.refund_amount} ${c.refund_currency ?? ""}` : "—"}
                    </td>
                    <td className="py-1.5 pr-3">{c.refund_to ?? "—"}</td>
                    <td className="py-1.5 pr-3">
                      {c.quote_expires_at ? new Date(c.quote_expires_at).toLocaleString() : "—"}
                    </td>
                    <td className="py-1.5 pr-3">
                      {c.confirmed_at ? new Date(c.confirmed_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <h3 className="text-sm font-semibold text-foreground">Refund attempts</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1.5 pr-3">Duffel refund</th>
                <th className="py-1.5 pr-3">Status</th>
                <th className="py-1.5 pr-3">Amount</th>
                <th className="py-1.5 pr-3">Error</th>
                <th className="py-1.5 pr-3">Updated</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {refund_attempts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-3 text-center text-muted-foreground">
                    No refund attempts.
                  </td>
                </tr>
              ) : (
                refund_attempts.map((r) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="py-1.5 pr-3">{r.duffel_refund_id ?? "—"}</td>
                    <td className="py-1.5 pr-3">{r.status}</td>
                    <td className="py-1.5 pr-3">
                      {r.amount ? `${r.amount} ${r.currency ?? ""}` : "—"}
                    </td>
                    <td className="py-1.5 pr-3">{r.error_code ?? "—"}</td>
                    <td className="py-1.5 pr-3">{new Date(r.updated_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={mono ? "font-mono text-xs" : "text-foreground"}>{v}</dd>
    </div>
  );
}
