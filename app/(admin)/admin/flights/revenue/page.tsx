import {
  getAdminFlightRevenueSummary,
  listAdminFlightBookingsWithRevenue,
} from "@/lib/services/admin/admin-flight-revenue.service";
import {
  adminFlightRevenueQuerySchema,
  parseAdminListLimit,
} from "@/lib/validations/admin-flights.schema";
import { firstSearchParam } from "@/lib/admin/search-params";
import {
  FlightRevenuePanel,
  type FlightRevenueListRow,
} from "@/components/admin/flights/flight-revenue-panel";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatMoney(amount: string, currency: string): string {
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return `${amount} ${currency}`;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(n);
  } catch {
    return `${amount} ${currency}`;
  }
}

export default async function AdminFlightRevenuePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const query = adminFlightRevenueQuerySchema.parse({
    q: firstSearchParam(sp.q) || undefined,
    status: firstSearchParam(sp.status) || undefined,
    currency: firstSearchParam(sp.currency) || undefined,
    from: firstSearchParam(sp.from) || undefined,
    to: firstSearchParam(sp.to) || undefined,
    page: firstSearchParam(sp.page) || undefined,
    limit: parseAdminListLimit(sp, firstSearchParam) || undefined,
    sort: firstSearchParam(sp.sort) || undefined,
    order: firstSearchParam(sp.order) || undefined,
  });

  const result = await listAdminFlightBookingsWithRevenue(query);
  const summary =
    query.from && query.to
      ? await getAdminFlightRevenueSummary({
          from: new Date(query.from),
          to: new Date(query.to),
          status: query.status,
          currency: query.currency,
        })
      : result.summary;

  const rows: FlightRevenueListRow[] = result.items
    .filter((row) => row.revenue != null)
    .map((row) => {
      const rev = row.revenue!;
      const cur = rev.currency;
      return {
        id: row.id,
        ref: row.booking_ref_no,
        status: row.status,
        paymentStatus: row.payment_status,
        customer: row.user_name ?? "—",
        customerPaid: formatMoney(rev.customer_paid, cur),
        duffelCost: formatMoney(rev.duffel_cost, cur),
        commission: formatMoney(rev.commission, cur),
        duffelFee: formatMoney(rev.duffel_payment_fee, cur),
        netCommission: formatMoney(rev.net_commission ?? rev.commission, cur),
        created: new Date(row.created_at).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      };
    });

  const displaySummary = summary ?? result.summary;

  return (
    <FlightRevenuePanel
      rows={rows}
      total={result.total}
      query={query}
      summary={displaySummary}
    />
  );
}
