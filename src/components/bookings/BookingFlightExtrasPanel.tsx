"use client";

import { useState } from "react";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/Button";
import type { BookingDetailDto } from "@/lib/bookings/booking.types";
import { postBookingItineraryRegenerate } from "@/lib/http/bookings.client";
import { useCurrency } from "@/components/providers/CurrencyProvider";

type FlightBookingDetail = NonNullable<BookingDetailDto["flight_booking"]>;
type FlightTicketMeta = {
  ticket_ready?: boolean;
  ticket_generated_at?: string | null;
  ticket_generation_failed?: boolean;
};

type Props = {
  fb: FlightBookingDetail & FlightTicketMeta;
  bookingId: string;
  bookingRefNo: string;
  showAdminTicketTools?: boolean;
  onRefresh?: () => Promise<void>;
};

/** Booking-only actions and metadata (PNR, PDF, extras) — separate from flight itinerary presentation. */
export function BookingFlightExtrasPanel({
  fb,
  bookingId,
  bookingRefNo,
  showAdminTicketTools = false,
  onRefresh,
}: Props) {
  const [regBusy, setRegBusy] = useState(false);
  const locale = useLocale();
  const { formatPrice } = useCurrency();

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-5">
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {fb.booking_reference ? (
          <>
            <dt className="text-muted-foreground">Airline PNR</dt>
            <dd className="font-medium text-foreground">{fb.booking_reference}</dd>
          </>
        ) : null}
        {fb.duffel_order_id ? (
          <>
            <dt className="text-muted-foreground">Order id</dt>
            <dd className="break-all font-mono text-xs text-foreground">{fb.duffel_order_id}</dd>
          </>
        ) : null}
      </dl>

      <div className="flex flex-col gap-2 border-t border-border/40 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Itinerary PDF</h3>
        {fb.ticket_ready ? (
          <>
            <a
              href={`/api/v1/bookings/${encodeURIComponent(bookingId)}/itinerary`}
              download={`TravelTourUp-Flight-Itinerary-${bookingRefNo.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`}
              className="inline-flex w-fit items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Download itinerary PDF
            </a>
            {fb.ticket_generated_at ? (
              <p className="text-xs text-muted-foreground">
                Generated {new Date(fb.ticket_generated_at).toLocaleString()}
              </p>
            ) : null}
          </>
        ) : fb.ticket_generation_failed ? (
          <p className="text-sm text-destructive">
            We couldn&apos;t generate your PDF automatically. Contact support with your booking reference.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your printable itinerary is being prepared. Refresh this page shortly — it is also included in your booking confirmation email when ready.
          </p>
        )}
        {showAdminTicketTools ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={regBusy}
              onClick={() => {
                void (async () => {
                  setRegBusy(true);
                  try {
                    await postBookingItineraryRegenerate(bookingId);
                    await onRefresh?.();
                  } catch {
                    /* surface via refresh */
                  } finally {
                    setRegBusy(false);
                  }
                })();
              }}
            >
              {regBusy ? "Regenerating…" : "Regenerate PDF"}
            </Button>
          </div>
        ) : null}
      </div>

      {fb.ancillaries && fb.ancillaries.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Extras</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {fb.ancillaries.map((a) => {
              const amt = Number.parseFloat(String(a.amount ?? ""));
              const cur = (a.currency ?? "USD").toUpperCase();
              const disp =
                Number.isFinite(amt) ? formatPrice(amt, cur, locale) : `${a.currency ?? ""} ${a.amount ?? "—"}`;
              return (
                <li key={a.id} className="flex justify-between gap-2 border-t border-border/40 pt-1">
                  <span className="capitalize text-foreground">{a.type.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground">{disp}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {fb.order_cancellations && fb.order_cancellations.length > 0 ? (
        <div className="rounded-lg bg-muted/30 p-3 text-sm">
          <p className="font-medium text-foreground">Cancellation</p>
          {fb.order_cancellations.map((c) => (
            <p key={c.id} className="mt-1 text-muted-foreground">
              Status: {c.status}
              {c.refund_amount
                ? ` · Refund ${formatPrice(Number.parseFloat(String(c.refund_amount)), (c.refund_currency ?? "USD").toUpperCase(), locale)}`
                : null}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
