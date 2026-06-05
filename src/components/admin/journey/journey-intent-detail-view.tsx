"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AlertTriangle, ArrowLeft, Copy, ExternalLink, Mail, Phone, User } from "lucide-react";
import type { AdminJourneyInterestDetail } from "@/lib/services/journey/admin-journey.service";
import { formatTravelersSummary } from "@/lib/journey/journey-trip-snapshot";
import { Button } from "@/components/admin_ui/ui/button";

function formatStage(stage: string): string {
  return stage.replace(/_/g, " ");
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  "product.viewed": "Viewed product",
  "product.enriched": "Trip details loaded",
  "checkout.clicked": "Clicked checkout",
  "checkout.started": "Started checkout",
  "payment.prepared": "Payment prepared",
  "booking.confirmed": "Booking confirmed",
  "booking.change_started": "Flight change requested",
  "booking.changed": "Flight change confirmed",
  "booking.cancelled": "Booking cancelled",
};

function formatEventType(eventType: string): string {
  return EVENT_TYPE_LABELS[eventType] ?? eventType;
}

function formatEventDetail(properties: unknown): string | null {
  if (!properties || typeof properties !== "object") return null;
  const p = properties as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof p.booking_ref_no === "string") parts.push(`Ref ${p.booking_ref_no}`);
  if (typeof p.refund_amount === "string" && typeof p.refund_currency === "string") {
    parts.push(`Refund ${p.refund_amount} ${p.refund_currency}`);
  }
  if (typeof p.duffel_order_change_id === "string") parts.push(`Change ${p.duffel_order_change_id.slice(0, 12)}…`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function funnelStageBadge(stage: string): string {
  if (stage === "booking_cancelled") return "Booking cancelled";
  if (stage === "booking_changed") return "Flight changed after booking";
  if (stage === "booking_confirmed") return "Booking confirmed";
  return `Stopped at ${formatStage(stage)}`;
}

function formatMoney(amount: string | null, currency: string | null): string {
  if (!amount) return "—";
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return `${amount} ${currency ?? ""}`.trim();
  const cur = currency?.toUpperCase() ?? "USD";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(n);
  } catch {
    return `${n.toFixed(2)} ${cur}`;
  }
}

function formatTs(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function JourneyIntentDetailView({ data }: { data: AdminJourneyInterestDetail }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const { interest, snapshot, user, funnel_steps, events, outreach_summary, detail_path, related_product_refs } =
    data;

  const journeyDays = Math.max(
    1,
    Math.ceil(
      (new Date(interest.last_seen_at).getTime() - new Date(interest.first_seen_at).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  const copyOutreach = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(outreach_summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [outreach_summary]);

  const customerDetailHref = detail_path ? `/en${detail_path.startsWith("/") ? detail_path : `/${detail_path}`}` : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => router.push("/admin/journey")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to journey queue
        </Button>
        {interest.is_abandoned && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            Abandoned · {interest.hours_since_last_seen}h ago
          </span>
        )}
        <span className="rounded-full border border-border px-3 py-1 text-xs capitalize">
          {funnelStageBadge(interest.funnel_stage)}
        </span>
        <span className="text-xs text-muted-foreground">
          {interest.event_count} event{interest.event_count === 1 ? "" : "s"} · {journeyDays} day
          {journeyDays === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <User className="h-5 w-5" />
            Customer contact
          </h2>
          {interest.contact_incomplete && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Contact details incomplete — verify email or phone before outreach.
            </div>
          )}
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{user.name}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <dt className="sr-only">Email</dt>
                <dd>{user.email || "—"}</dd>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <dt className="sr-only">Phone</dt>
                <dd>{user.phone || "—"}</dd>
              </div>
            </div>
            <div>
              <dt className="text-muted-foreground">Currency / country</dt>
              <dd>
                {user.currency_id}
                {user.country_code ? ` · ${user.country_code}` : ""}
              </dd>
            </div>
          </dl>
          <div className="mt-4">
            <Link href={`/admin/users/${user.id}`} className="text-sm text-primary hover:underline">
              Open customer profile
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Trip summary</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Product</dt>
              <dd className="font-medium capitalize">{interest.product_type}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{interest.product_type === "hotel" ? "Property" : "Route"}</dt>
              <dd className="font-medium">{interest.route_label}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dates</dt>
              <dd>{interest.dates_label}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Travelers</dt>
              <dd>{interest.travelers_summary ?? (snapshot ? formatTravelersSummary(snapshot) : "—")}</dd>
            </div>
            {snapshot?.trip_type && (
              <div>
                <dt className="text-muted-foreground">Trip type</dt>
                <dd className="capitalize">{snapshot.trip_type.replace(/_/g, " ")}</dd>
              </div>
            )}
            {snapshot?.cabin_class && (
              <div>
                <dt className="text-muted-foreground">Cabin</dt>
                <dd className="capitalize">{snapshot.cabin_class.replace(/_/g, " ")}</dd>
              </div>
            )}
            {snapshot?.room_name && (
              <div>
                <dt className="text-muted-foreground">Room</dt>
                <dd>{snapshot.room_name}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Quoted price</dt>
              <dd className="font-medium">{formatMoney(interest.price_amount, interest.price_currency)}</dd>
            </div>
            {snapshot?.offer_expires_at && (
              <div>
                <dt className="text-muted-foreground">Offer expires</dt>
                <dd>{formatTs(snapshot.offer_expires_at)}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Latest product ref</dt>
              <dd className="break-all font-mono text-xs">{interest.product_ref}</dd>
            </div>
            {related_product_refs.length > 1 && (
              <div>
                <dt className="text-muted-foreground">Linked refs</dt>
                <dd className="text-xs text-muted-foreground">
                  {related_product_refs.length} identifiers across this trip (search result, quote, etc.)
                </dd>
              </div>
            )}
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            {customerDetailHref && (
              <Link
                href={customerDetailHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Open product page
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
            {interest.converted_booking_id && (
              <Link
                href={`/admin/bookings/${interest.converted_booking_id}`}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View booking
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Funnel progress</h2>
        <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
          {funnel_steps.map((step) => (
            <li
              key={step.stage}
              className={`flex min-w-[140px] flex-col rounded-lg border px-3 py-2 text-sm ${
                step.current
                  ? "border-primary bg-primary/5 font-medium"
                  : step.reached
                    ? "border-border"
                    : "border-dashed border-muted text-muted-foreground"
              }`}
            >
              <span className="capitalize">{step.label}</span>
              <span className="text-xs text-muted-foreground">{step.at ? formatTs(step.at) : "—"}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          First seen {formatTs(interest.first_seen_at)} · Last activity {formatTs(interest.last_seen_at)}
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Outreach snippet</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => void copyOutreach()}>
            <Copy className="mr-1 h-4 w-4" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{outreach_summary}</p>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Event timeline</h2>
            <p className="text-sm text-muted-foreground">
              Full funnel history for this trip — newest activity updates the list stage.
            </p>
          </div>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events recorded for this trip.</p>
        ) : (
          <ol className="space-y-0">
            {events.map((ev, idx) => {
              const detail = formatEventDetail(ev.properties);
              const isLast = idx === events.length - 1;
              return (
                <li key={ev.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {!isLast && (
                    <span
                      className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-border"
                      aria-hidden
                    />
                  )}
                  <span
                    className={`relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                      ev.funnel_stage === interest.funnel_stage && idx === events.length - 1
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-medium">{formatEventType(ev.event_type)}</p>
                      <span className="rounded-full bg-background px-2 py-0.5 text-xs capitalize text-muted-foreground">
                        {formatStage(ev.funnel_stage)}
                      </span>
                    </div>
                    {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{formatTs(ev.created_at)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
