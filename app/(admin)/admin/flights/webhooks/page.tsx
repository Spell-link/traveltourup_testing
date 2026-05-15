import Link from "next/link";
import PageHeader from "@/components/admin_ui/shared/page-header";
import { listAdminDuffelWebhooks } from "@/lib/services/admin/admin-flights.service";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function AdminFlightWebhooksPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = Number(first(sp.page) ?? 1);
  const pageSize = Number(first(sp.page_size) ?? 25);
  const type = first(sp.type);

  const result = await listAdminDuffelWebhooks({ page, page_size: pageSize, type });
  const totalPages = Math.max(1, Math.ceil(result.total / result.page_size));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Duffel webhooks"
        subtitle="Read-only audit log of every Duffel webhook we have received. Search by event type."
      />

      <Link
        className="inline-block rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
        href="/admin/flights"
      >
        ← back to flights
      </Link>

      <form className="flex flex-wrap gap-2" method="GET">
        <input
          type="text"
          name="type"
          defaultValue={type ?? ""}
          placeholder="payment_intent.succeeded / order.created / refund.succeeded …"
          className="w-96 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          Filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Event id</th>
              <th className="px-3 py-2">Received</th>
              <th className="px-3 py-2">Processed</th>
              <th className="px-3 py-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  No webhook events recorded.
                </td>
              </tr>
            ) : (
              result.items.map((row) => (
                <tr key={row.id} className="border-t border-border/60 align-top">
                  <td className="px-3 py-2 font-mono text-xs">{row.type}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {row.event_id}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {new Date(row.received_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.processed_at ? new Date(row.processed_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-rose-700">
                    {row.error ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {result.page} of {totalPages} — {result.total} events
        </span>
        <div className="flex gap-2">
          {result.page > 1 ? (
            <Link
              className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
              href={`?page=${result.page - 1}&page_size=${result.page_size}${type ? `&type=${encodeURIComponent(type)}` : ""}`}
            >
              Previous
            </Link>
          ) : null}
          {result.page < totalPages ? (
            <Link
              className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
              href={`?page=${result.page + 1}&page_size=${result.page_size}${type ? `&type=${encodeURIComponent(type)}` : ""}`}
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
