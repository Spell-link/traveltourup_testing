"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, RefreshCcw } from "lucide-react";
import { Link } from "@/i18n/navigation";

type SerializedFinancialEvent = {
  id: string;
  type: string;
  amount: string | null;
  currency: string | null;
  payload: unknown;
  created_at: string;
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function eventLabel(t: ReturnType<typeof useTranslations<"BookingMoney">>, type: string): string {
  const key = `events.${type}` as const;
  return t.has(key) ? t(key) : type;
}

/**
 * Customer-visible money timeline for a flight booking. Each row is one
 * append-only `BookingFinancialEvent` written by the saga, refund poller, or
 * webhook handlers. Useful when a refund is `pending` or when the order
 * failed after capture and the user wants to see exactly what happened.
 */
export function FlightFinancialTimelinePanel({
  bookingId,
}: {
  bookingId: string;
}) {
  const t = useTranslations("BookingMoney");
  const [events, setEvents] = useState<SerializedFinancialEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/bookings/${encodeURIComponent(bookingId)}/financial-events`, {
        method: "GET",
        cache: "no-store",
      });
      const body = (await res.json()) as
        | { success: true; data: { booking_id: string; events: SerializedFinancialEvent[] } }
        | { success: false; message?: string };
      if (!res.ok || body.success === false) {
        throw new Error(("message" in body && body.message) || `HTTP ${res.status}`);
      }
      const visible = body.data.events.filter(
        (e) =>
          e.type !== "change_quoted" ||
          (Boolean(e.amount) && Boolean(e.currency)),
      );
      setEvents(visible);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("timelineLoadError"));
    } finally {
      setLoading(false);
    }
  }, [bookingId, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (events !== null && events.length === 0 && !loading && !error) {
    return null;
  }

  return (
    <section
      id="payments"
      className="mt-6 rounded-2xl border border-border/60 bg-background p-4 sm:p-6"
      aria-labelledby="flight-payment-timeline-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 id="flight-payment-timeline-heading" className="text-base font-semibold text-foreground">
          {t("paymentTimelineTitle")}
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/profile/flight-activity"
            className="text-xs font-medium text-primary hover:underline"
          >
            {t("ledgerCta")}
          </Link>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5" />
            )}
            {t("refresh")}
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("ledgerCtaShort")}</p>

      {error ? (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      ) : null}

      {events && events.length > 0 ? (
        <ol className="mt-4 space-y-3 border-l border-border/40 pl-4">
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary/70" />
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{eventLabel(t, e.type)}</p>
                <span className="text-xs text-muted-foreground">
                  {formatRelative(e.created_at)}
                </span>
              </div>
              {e.amount && e.currency ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {e.amount} {e.currency}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
