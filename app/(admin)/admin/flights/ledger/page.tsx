import { listAdminFlightLedgerEvents } from "@/lib/services/flights/flight-ledger.service";
import { adminFlightLedgerQuerySchema } from "@/lib/validations/flight-ledger.schema";
import { getServerAuthz } from "@/lib/authz/session";
import {
  FlightLedgerList,
  type FlightLedgerListRow,
} from "@/components/admin/flights/flight-ledger-list";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function formatMoney(amount: string | null, currency: string | null): string {
  if (amount == null || amount === "") return "—";
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return `${amount} ${currency ?? ""}`.trim();
  const cur = currency?.toUpperCase() ?? "";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur || "USD",
      currencyDisplay: "narrowSymbol",
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${cur}`.trim();
  }
}

export default async function AdminFlightLedgerPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { authz } = await getServerAuthz();

  const query = adminFlightLedgerQuerySchema.parse({
    q: first(sp.q) || undefined,
    page: first(sp.page) || undefined,
    limit: first(sp.limit) || undefined,
    sort: first(sp.sort) || undefined,
    order: first(sp.order) || undefined,
    event_type: first(sp.event_type) || undefined,
    direction: first(sp.direction) || undefined,
    from: first(sp.from) || undefined,
    to: first(sp.to) || undefined,
  });

  const { items, total, page, limit } = await listAdminFlightLedgerEvents({ authz, query });

  const rows: FlightLedgerListRow[] = items.map((item) => ({
    id: item.id,
    created: new Date(item.created_at).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    userEmail: item.user?.email?.trim() ? item.user.email : "—",
    userName: item.user
      ? `${item.user.first_name} ${item.user.last_name}`.trim() || "—"
      : "—",
    bookingRef: item.booking.booking_ref_no,
    airlineRef: item.booking.airline_reference ?? "—",
    eventLabel: item.label,
    direction: item.direction,
    amount: formatMoney(item.amount, item.currency),
    bookingId: item.booking.id,
    userId: item.booking.user_id ?? "",
  }));

  return <FlightLedgerList rows={rows} total={total} query={{ ...query, page, limit }} />;
}
