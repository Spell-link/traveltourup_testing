import { listAdminDuffelWebhooks } from "@/lib/services/admin/admin-flights.service";
import {
  adminFlightWebhookListQuerySchema,
  parseAdminListLimit,
} from "@/lib/validations/admin-flights.schema";
import { firstSearchParam } from "@/lib/admin/search-params";
import {
  FlightWebhookList,
  type FlightWebhookListRow,
} from "@/components/admin/flights/flight-webhook-list";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminFlightWebhooksPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const query = adminFlightWebhookListQuerySchema.parse({
    type: firstSearchParam(sp.type) || undefined,
    page: firstSearchParam(sp.page) || undefined,
    limit: parseAdminListLimit(sp, firstSearchParam) || undefined,
    sort: firstSearchParam(sp.sort) || undefined,
    order: firstSearchParam(sp.order) || undefined,
  });

  const result = await listAdminDuffelWebhooks(query);

  const rows: FlightWebhookListRow[] = result.items.map((row) => ({
    id: row.id,
    type: row.type,
    eventId: row.event_id,
    received: new Date(row.received_at).toLocaleString(),
    processed: row.processed_at ? new Date(row.processed_at).toLocaleString() : "—",
    error: row.error ?? "",
  }));

  return <FlightWebhookList rows={rows} total={result.total} query={query} />;
}
