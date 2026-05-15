import Link from "next/link";
import PageHeader from "@/components/admin_ui/shared/page-header";
import { listAdminFlightOrphanPits } from "@/lib/services/admin/admin-flights.service";

export const dynamic = "force-dynamic";

export default async function AdminFlightOrphanPitPage() {
  const { orphan, post_capture_failed } = await listAdminFlightOrphanPits();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orphan PaymentIntents"
        subtitle="Money captured without a matching booking, or order failures after capture. Resolve before customer escalates."
      />

      <Link
        className="inline-block rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
        href="/admin/flights"
      >
        ← back to flights
      </Link>

      <section className="rounded-2xl border border-border bg-background p-4">
        <h3 className="text-sm font-semibold text-rose-700">
          Succeeded payment with no booking ({orphan.length})
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          PIT status = <code>succeeded</code>, last updated ≥10 min ago, no
          <code> booking_id</code>, no <code>order_failure_at</code>. Either the
          order succeeded but the link was missed (verify in Duffel dashboard
          and run a manual link), or the order never happened (issue a Duffel
          Refund manually).
        </p>
        <Table rows={orphan} variant="orphan" />
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <h3 className="text-sm font-semibold text-amber-700">
          Order failed after capture ({post_capture_failed.length})
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Saga compensation should have kicked in. If <code>order_failure_refund_status</code> is
          not <code>succeeded</code>/<code>pending</code>, retry from the
          customer&apos;s booking page or via Duffel dashboard.
        </p>
        <Table rows={post_capture_failed} variant="terminal" />
      </section>
    </div>
  );
}

type Row = Awaited<ReturnType<typeof listAdminFlightOrphanPits>>["orphan"][number];

function Table({ rows, variant }: { rows: Row[]; variant: "orphan" | "terminal" }) {
  if (rows.length === 0) {
    return (
      <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        Queue clear — nothing to investigate.
      </p>
    );
  }
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="py-1.5 pr-3">PIT (Duffel)</th>
            <th className="py-1.5 pr-3">Status</th>
            <th className="py-1.5 pr-3">Amount</th>
            <th className="py-1.5 pr-3">Offer id</th>
            {variant === "terminal" ? (
              <>
                <th className="py-1.5 pr-3">Failure code</th>
                <th className="py-1.5 pr-3">Refund</th>
              </>
            ) : null}
            <th className="py-1.5 pr-3">Updated</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border/60">
              <td className="py-1.5 pr-3">{r.duffel_intent_id}</td>
              <td className="py-1.5 pr-3">{r.status}</td>
              <td className="py-1.5 pr-3">
                {r.charge_amount} {r.charge_currency}
              </td>
              <td className="py-1.5 pr-3">{r.offer_id}</td>
              {variant === "terminal" ? (
                <>
                  <td className="py-1.5 pr-3">{r.order_failure_code ?? "—"}</td>
                  <td className="py-1.5 pr-3">
                    {r.order_failure_refund_id
                      ? `${r.order_failure_refund_id} (${r.order_failure_refund_status ?? "?"})`
                      : "none"}
                  </td>
                </>
              ) : null}
              <td className="py-1.5 pr-3">
                {new Date(r.updated_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
