import { listAdminJourneyInterests } from "@/lib/services/journey/admin-journey.service";
import { adminJourneyInterestsQuerySchema } from "@/lib/validations/customer-journey.schema";
import { getServerAuthz } from "@/lib/authz/session";
import { JourneyList, type JourneyListRow } from "@/components/admin/journey";

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

export default async function AdminJourneyPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { authz } = await getServerAuthz();

  const query = adminJourneyInterestsQuerySchema.parse({
    page: first(sp.page) || undefined,
    limit: first(sp.limit) || undefined,
    stage: first(sp.stage) || undefined,
    product_type: first(sp.product_type) || undefined,
    abandoned_only: first(sp.abandoned_only) || undefined,
    from: first(sp.from) || undefined,
    to: first(sp.to) || undefined,
    sort: first(sp.sort) || undefined,
    order: first(sp.order) || undefined,
  });

  const { items, total, page, limit } = await listAdminJourneyInterests({ authz, query });

  const rows: JourneyListRow[] = items.map((item) => ({
    id: item.id,
    user_id: item.user_id,
    user_name: item.user_name,
    user_email: item.user_email,
    user_phone: item.user_phone,
    product_type: item.product_type,
    product_ref: item.product_ref,
    funnel_stage: item.funnel_stage,
    title: item.title,
    route_label: item.route_label,
    dates_label: item.dates_label,
    travelers_summary: item.travelers_summary,
    price: formatMoney(item.price_amount, item.price_currency),
    last_seen: new Date(item.last_seen_at).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    hours_since_last_seen: item.hours_since_last_seen,
    is_abandoned: item.is_abandoned,
    contact_incomplete: item.contact_incomplete,
    converted_booking_id: item.converted_booking_id,
    event_count: item.event_count,
  }));

  return <JourneyList rows={rows} total={total} query={{ ...query, page, limit }} />;
}
