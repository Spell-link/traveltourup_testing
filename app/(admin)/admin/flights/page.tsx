import { listAdminFlightBookingsWithRevenue } from "@/lib/services/admin/admin-flight-revenue.service";
import {
  adminFlightBookingListQuerySchema,
  parseAdminListLimit,
} from "@/lib/validations/admin-flights.schema";
import { firstSearchParam } from "@/lib/admin/search-params";
import {
  FlightBookingList,
  type FlightBookingListRow,
} from "@/components/admin/flights/flight-booking-list";

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

export default async function AdminFlightsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const query = adminFlightBookingListQuerySchema.parse({
    q: firstSearchParam(sp.q) || undefined,
    status: firstSearchParam(sp.status) || undefined,
    from: firstSearchParam(sp.from) || undefined,
    to: firstSearchParam(sp.to) || undefined,
    page: firstSearchParam(sp.page) || undefined,
    limit: parseAdminListLimit(sp, firstSearchParam) || undefined,
    sort: firstSearchParam(sp.sort) || undefined,
    order: firstSearchParam(sp.order) || undefined,
  });

  const result = await listAdminFlightBookingsWithRevenue(query);

  const rows: FlightBookingListRow[] = result.items.map((row) => {
    const rev = row.revenue;
    const cur = rev?.currency ?? row.currency;
    return {
      id: row.id,
      ref: row.booking_ref_no,
      status: row.status,
      paymentStatus: row.payment_status,
      customer: row.user_name ?? "—",
      orderPnr: [row.duffel_order_id ?? "—", row.airline_pnr ?? ""].filter(Boolean).join("\n"),
      airlineTotal: formatMoney(row.airline_total, row.currency),
      customerPaid: rev ? formatMoney(rev.customer_paid, cur) : "—",
      duffelCost: rev ? formatMoney(rev.duffel_cost, cur) : "—",
      commission: rev ? formatMoney(rev.commission, cur) : "—",
      duffelFee: rev ? formatMoney(rev.duffel_payment_fee, cur) : "—",
      estimated: rev?.estimated ?? false,
      created: new Date(row.created_at).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  });

  const summary = result.summary;
  const statsCards = summary
    ? [
        {
          title: "Customer revenue",
          value: formatMoney(summary.customer_revenue, summary.currency),
        },
        {
          title: "Commission",
          value: formatMoney(summary.commission, summary.currency),
        },
        {
          title: "Duffel fees",
          value: formatMoney(summary.duffel_fees, summary.currency),
        },
        {
          title: "Duffel cost",
          value: formatMoney(summary.duffel_cost, summary.currency),
        },
      ]
    : undefined;

  return (
    <FlightBookingList
      rows={rows}
      total={result.total}
      query={query}
      statsCards={statsCards}
      summaryNote={summary?.multi_currency_note}
    />
  );
}
