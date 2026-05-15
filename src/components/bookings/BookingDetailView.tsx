"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";
import type { BookingDetailDto } from "@/lib/bookings/booking.types";
import {
  bookingSummaryTitle,
  bookingSummarySubtitle,
  bookingTypeLabel,
} from "@/lib/bookings/booking-summary";
import { getBooking } from "@/lib/http/bookings.client";
import { FlightBookingCancelPanel } from "@/components/bookings/FlightBookingCancelPanel";
import { FlightBookingChangePanel } from "@/components/bookings/FlightBookingChangePanel";
import { FlightFinancialTimelinePanel } from "@/components/bookings/FlightFinancialTimelinePanel";
import { useLocale } from "next-intl";
import { useCurrency } from "@/components/providers/CurrencyProvider";

type FlightBookingDetail = NonNullable<BookingDetailDto["flight_booking"]>;
type HotelBookingDetail = NonNullable<BookingDetailDto["hotel_booking"]>;

function formatIsoDateTime(iso: string | null | undefined): { date: string; time: string } | null {
  if (!iso || typeof iso !== "string" || iso.length < 16) return null;
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

function ItineraryFromSnapshot({ snapshot }: { snapshot: unknown }) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const slices = (snapshot as { slices?: unknown }).slices;
  if (!Array.isArray(slices) || slices.length === 0) return null;
  return (
    <div className="mt-3 space-y-3 text-sm">
      {slices.map((sl, i) => {
        if (!sl || typeof sl !== "object") return null;
        const origin =
          typeof (sl as { origin_iata?: string }).origin_iata === "string"
            ? (sl as { origin_iata: string }).origin_iata
            : "";
        const dest =
          typeof (sl as { destination_iata?: string }).destination_iata === "string"
            ? (sl as { destination_iata: string }).destination_iata
            : "";
        const segs = (sl as { segments?: unknown }).segments;
        if (!Array.isArray(segs) || segs.length === 0) {
          return (
            <div key={i} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <span className="font-medium text-foreground">
                {origin || "—"} → {dest || "—"}
              </span>
            </div>
          );
        }
        return (
          <div key={i} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <p className="font-medium text-foreground">
              {origin || "—"} → {dest || "—"}
            </p>
            <ul className="mt-2 space-y-1.5 border-t border-border/40 pt-2 text-xs text-muted-foreground">
              {segs.map((seg, j) => {
                if (!seg || typeof seg !== "object") return null;
                const s = seg as {
                  departing_at?: string | null;
                  arriving_at?: string | null;
                  origin_iata?: string;
                  destination_iata?: string;
                  marketing_carrier_name?: string | null;
                  flight_number?: string | null;
                };
                const dep = formatIsoDateTime(s.departing_at ?? undefined);
                const arr = formatIsoDateTime(s.arriving_at ?? undefined);
                const fn =
                  s.marketing_carrier_name && s.flight_number
                    ? `${s.marketing_carrier_name} ${s.flight_number}`
                    : s.flight_number
                      ? `Flight ${s.flight_number}`
                      : null;
                const leg =
                  s.origin_iata && s.destination_iata ? `${s.origin_iata} → ${s.destination_iata}` : null;
                return (
                  <li key={j} className="text-foreground">
                    {fn ? <span className="font-medium">{fn}</span> : null}
                    {leg ? <span className={fn ? " ml-2 text-muted-foreground" : ""}>{leg}</span> : null}
                    {dep ? (
                      <span className="mt-0.5 block text-muted-foreground">
                        Depart {dep.date} {dep.time}
                        {arr ? ` · Arrive ${arr.date} ${arr.time}` : null}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function FlightSections({ fb }: { fb: FlightBookingDetail }) {
  const locale = useLocale();
  const { formatPrice } = useCurrency();
  const sub = bookingSummarySubtitle({
    type: "flight",
    booking_ref_no: "",
    created_at: new Date(0),
    flight_booking: fb,
    hotel_booking: null,
    car_booking: null,
    guest_data: null,
  });
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Flight</h2>
      {sub ? <p className="mt-2 text-sm text-foreground">{sub}</p> : null}
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
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
      <ItineraryFromSnapshot snapshot={fb.itinerary_snapshot} />
      {fb.ancillaries && fb.ancillaries.length > 0 ? (
        <div className="mt-4">
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
                <span className="text-muted-foreground">
                  {disp}
                </span>
              </li>
            );
            })}
          </ul>
        </div>
      ) : null}
      {fb.order_cancellations && fb.order_cancellations.length > 0 ? (
        <div className="mt-4 rounded-lg bg-muted/30 p-3 text-sm">
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
    </section>
  );
}

function HotelSections({ hb }: { hb: HotelBookingDetail }) {
  const snap = hb.accommodation_snapshot;
  const name =
    snap && typeof snap === "object" && typeof (snap as { name?: string }).name === "string"
      ? (snap as { name: string }).name
      : null;
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Hotel</h2>
      {name ? <p className="mt-2 font-medium text-foreground">{name}</p> : null}
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {hb.booking_reference ? (
          <>
            <dt className="text-muted-foreground">Confirmation</dt>
            <dd className="font-medium text-foreground">{hb.booking_reference}</dd>
          </>
        ) : null}
        {hb.duffel_booking_id ? (
          <>
            <dt className="text-muted-foreground">Stay booking id</dt>
            <dd className="break-all font-mono text-xs text-foreground">{hb.duffel_booking_id}</dd>
          </>
        ) : null}
      </dl>
    </section>
  );
}

function CarSections({ cb }: { cb: NonNullable<BookingDetailDto["car_booking"]> }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Car rental</h2>
      {cb.payload != null ? (
        <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-muted/40 p-3 text-xs text-foreground">
          {JSON.stringify(cb.payload, null, 2)}
        </pre>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No extra details stored for this booking.</p>
      )}
    </section>
  );
}

function GuestDetails({ guest }: { guest: unknown }) {
  if (guest == null) return null;
  if (typeof guest === "object" && guest !== null) {
    const o = guest as Record<string, unknown>;
    const passengers = o.passengers;
    if (Array.isArray(passengers) && passengers.length > 0) {
      return (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Travelers</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {passengers.map((pItem: unknown, i: number) => {
              const p = pItem && typeof pItem === "object" ? (pItem as Record<string, unknown>) : null;
              const name = p
                ? [p.given_name, p.family_name]
                    .filter((x): x is string => typeof x === "string" && x.length > 0)
                    .join(" ")
                : "";
              const born = p && typeof p.born_on === "string" ? p.born_on : null;
              const pid = p && typeof p.passenger_id === "string" ? p.passenger_id : null;
              return (
                <li key={pid ?? i} className="rounded-lg bg-muted/30 px-3 py-2">
                  <span className="font-medium text-foreground">{name || "Passenger"}</span>
                  {born ? <span className="text-muted-foreground"> · DOB {born}</span> : null}
                  {pid ? (
                    <span className="mt-0.5 block font-mono text-xs text-muted-foreground">{pid}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      );
    }
    const email = o.email;
    const phone = o.phone_number;
    const guests = o.guests;
    if (typeof email === "string" || typeof phone === "string") {
      return (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Contact & guests
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            {typeof email === "string" ? (
              <>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="text-foreground">{email}</dd>
              </>
            ) : null}
            {typeof phone === "string" ? (
              <>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="text-foreground">{phone}</dd>
              </>
            ) : null}
          </dl>
          {Array.isArray(guests) && guests.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm">
              {guests.map((gItem: unknown, i: number) => {
                const g = gItem && typeof gItem === "object" ? (gItem as Record<string, unknown>) : null;
                const name = g
                  ? [g.given_name, g.family_name]
                      .filter((x): x is string => typeof x === "string" && x.length > 0)
                      .join(" ")
                  : "";
                const born = g && typeof g.born_on === "string" ? g.born_on : null;
                return (
                  <li key={i} className="rounded-lg bg-muted/30 px-3 py-2">
                    {name || "Guest"}
                    {born ? <span className="text-muted-foreground"> · DOB {born}</span> : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      );
    }
  }
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Guest data</h2>
      <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-muted/40 p-3 text-xs">
        {JSON.stringify(guest, null, 2)}
      </pre>
    </section>
  );
}

export function BookingDetailView({ bookingId }: { bookingId: string }) {
  const [row, setRow] = useState<BookingDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const locale = useLocale();
  const { formatPrice } = useCurrency();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const b = await getBooking(bookingId);
        if (!cancelled) setRow(b);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load booking");
          setRow(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  if (error || !row) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-card p-8 text-center">
        <p className="text-destructive">{error ?? "Not found"}</p>
        <Link
          href="/profile/bookings"
          className="mt-4 inline-block font-semibold text-primary hover:underline"
        >
          Back to bookings
        </Link>
      </div>
    );
  }

  const title = bookingSummaryTitle(row);
  const created =
    row.created_at instanceof Date
      ? row.created_at.toLocaleString()
      : typeof row.created_at === "string"
        ? new Date(row.created_at).toLocaleString()
        : "";

  return (
    <div className="space-y-8">
      <div>
        <p className="mt-3 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {bookingTypeLabel(row.type)}
        </p>
        <h1 className="mt-2 font-heading text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reference <span className="font-medium text-foreground">{row.booking_ref_no}</span>
          {created ? <span> · Booked {created}</span> : null}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Status</h2>
          <p className="mt-2 capitalize text-foreground">{row.status}</p>
          <p className="mt-1 text-sm text-muted-foreground">Payment: {row.payment_status}</p>
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Total</h2>
          <p className="mt-2 text-xl font-bold text-primary">
            {(() => {
              const n = Number.parseFloat(String(row.total_amount));
              return Number.isFinite(n)
                ? formatPrice(n, row.currency, locale)
                : `${row.currency} ${row.total_amount}`;
            })()}
          </p>
        </section>
      </div>

      {row.flight_booking ? <FlightSections fb={row.flight_booking} /> : null}
      {row.type === "flight" && row.flight_booking ? (
        <>
          <FlightBookingCancelPanel
            bookingId={row.id}
            status={row.status}
            paymentStatus={row.payment_status}
            hasDuffelOrder={Boolean(row.flight_booking.duffel_order_id)}
            onBookingRefresh={async () => {
              const b = await getBooking(bookingId);
              setRow(b);
            }}
          />
          <FlightBookingChangePanel
            bookingId={row.id}
            bookingStatus={row.status}
            onChangeConfirmed={async () => {
              const b = await getBooking(bookingId);
              setRow(b);
            }}
          />
          <FlightFinancialTimelinePanel bookingId={row.id} />
        </>
      ) : null}
      {row.hotel_booking ? <HotelSections hb={row.hotel_booking} /> : null}
      {row.car_booking ? <CarSections cb={row.car_booking} /> : null}
      {row.guest_data ? <GuestDetails guest={row.guest_data} /> : null}
    </div>
  );
}
