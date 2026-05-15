import Link from "next/link";
import PageHeader from "@/components/admin_ui/shared/page-header";
import { listAdminFlightBookings } from "@/lib/services/admin/admin-flights.service";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "pending":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "cancelled":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "failed":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}

function paymentBadgeClass(status: string): string {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "refund_processing":
    case "refund_pending":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "refunded":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case "partially_refunded":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case "refund_failed":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "credit_issued":
      return "bg-indigo-50 text-indigo-700 ring-indigo-200";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}

export default async function AdminFlightsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = Number(first(sp.page) ?? 1);
  const pageSize = Number(first(sp.page_size) ?? 25);
  const status = first(sp.status);
  const q = first(sp.q);

  const result = await listAdminFlightBookings({ page, page_size: pageSize, status, q });
  const totalPages = Math.max(1, Math.ceil(result.total / result.page_size));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Flight bookings"
        subtitle="Saga-aware view: search by booking ref / order id / airline PNR. Click a row for the full timeline."
      />

      <form className="flex flex-wrap gap-2" method="GET">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search booking ref, order id, airline PNR…"
          className="w-72 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="pending">pending</option>
          <option value="confirmed">confirmed</option>
          <option value="cancelled">cancelled</option>
          <option value="failed">failed</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          Filter
        </button>
        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <Link className="rounded-md border border-border px-3 py-1.5 hover:bg-muted" href="/admin/flights/pricing-rules">
            Pricing rules
          </Link>
          <Link className="rounded-md border border-border px-3 py-1.5 hover:bg-muted" href="/admin/flights/orphan-pit">
            Orphan PIT queue
          </Link>
          <Link className="rounded-md border border-border px-3 py-1.5 hover:bg-muted" href="/admin/flights/webhooks">
            Webhooks
          </Link>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Ref</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Payment</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Order / PNR</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No flight bookings found.
                </td>
              </tr>
            ) : (
              result.items.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link className="text-primary hover:underline" href={`/admin/flights/${row.id}`}>
                      {row.booking_ref_no}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ring-1 ${statusBadgeClass(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ring-1 ${paymentBadgeClass(row.payment_status)}`}>
                      {row.payment_status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{row.user_name ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    <div>{row.duffel_order_id ?? "—"}</div>
                    <div>{row.airline_pnr ?? ""}</div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.total_amount} {row.currency}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {result.page} of {totalPages} — {result.total} bookings
        </span>
        <div className="flex gap-2">
          {result.page > 1 ? (
            <Link
              className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
              href={`?page=${result.page - 1}&page_size=${result.page_size}${status ? `&status=${status}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            >
              Previous
            </Link>
          ) : null}
          {result.page < totalPages ? (
            <Link
              className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
              href={`?page=${result.page + 1}&page_size=${result.page_size}${status ? `&status=${status}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
