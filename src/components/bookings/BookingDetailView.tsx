"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { BookingDetailDto } from "@/lib/bookings/booking.types";
import { bookingSummaryTitle, bookingBreadcrumbTitle, bookingTypeLabel } from "@/lib/bookings/booking-summary";
import { getBooking } from "@/lib/http/bookings.client";
import { BookingDetailLoading } from "@/components/bookings/BookingDetailSkeleton";
import { useBookingBreadcrumbProfileBookingTitle } from "@/components/shared/BookingBreadcrumbProfileBookingContext";
import { FlightBookingCancelPanel } from "@/components/bookings/FlightBookingCancelPanel";
import {
  HotelBookingCancelPanel,
  HotelPaymentSummary,
} from "@/components/bookings/HotelBookingCancelPanel";
import { BookingFlightExtrasPanel } from "@/components/bookings/BookingFlightExtrasPanel";
import { BookingFlightItineraryDetail } from "@/components/bookings/BookingFlightItineraryDetail";
import { FlightOrderDetailView } from "@/components/bookings/FlightOrderDetailView";
import { HotelOrderDetailView } from "@/components/bookings/HotelOrderDetailView";
import { FlightFinancialTimelinePanel } from "@/components/bookings/FlightFinancialTimelinePanel";
import { useLocale, useTranslations } from "next-intl";
import { useCurrency } from "@/components/providers/CurrencyProvider";

type FlightBookingDetail = NonNullable<BookingDetailDto["flight_booking"]>;
type HotelBookingDetail = NonNullable<BookingDetailDto["hotel_booking"]>;

type FlightTicketMeta = {
  ticket_ready?: boolean;
  ticket_generated_at?: string | null;
  ticket_generation_failed?: boolean;
};

function FlightSections({
  fb,
  bookingId,
  bookingRefNo,
  totalAmount,
  currency,
  showAdminTicketTools = false,
  onRefresh,
}: {
  fb: FlightBookingDetail & FlightTicketMeta;
  bookingId: string;
  bookingRefNo: string;
  totalAmount: string | number;
  currency: string;
  showAdminTicketTools?: boolean;
  onRefresh?: () => Promise<void>;
}) {
  return (
    <div className="space-y-8">
      <BookingFlightItineraryDetail
        itinerarySnapshot={fb.itinerary_snapshot}
        orderRaw={fb.order_raw}
        totalAmount={totalAmount}
        currency={currency}
      />
      <BookingFlightExtrasPanel
        fb={fb}
        bookingId={bookingId}
        bookingRefNo={bookingRefNo}
        showAdminTicketTools={showAdminTicketTools}
        onRefresh={onRefresh}
      />
    </div>
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

function flightPaymentCopy(
  t: ReturnType<typeof useTranslations<"BookingMoney">>,
  paymentStatus: string,
) {
  const lKey = `paymentStatusLabel.${paymentStatus}`;
  const hKey = `paymentStatusHint.${paymentStatus}`;
  return {
    label: t.has(lKey) ? t(lKey) : paymentStatus.replace(/_/g, " "),
    hint: t.has(hKey) ? t(hKey) : null,
  };
}

function hotelUsesRichDetailView(row: BookingDetailDto): boolean {
  if (row.type !== "hotel" || !row.hotel_booking) return false;
  if (row.status !== "confirmed" && row.status !== "cancelled") return false;
  return Boolean(row.hotel_booking.stays_raw ?? row.hotel_booking.accommodation_snapshot);
}

export function BookingDetailView({
  bookingId,
  backHref = "/profile/bookings",
  backLabel = "Back to bookings",
  showAdminTicketTools = false,
}: {
  bookingId: string;
  backHref?: string;
  backLabel?: string;
  /** When true, show admin-only actions (e.g. regenerate itinerary PDF). */
  showAdminTicketTools?: boolean;
}) {
  const [row, setRow] = useState<BookingDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const locale = useLocale();
  const { formatPrice } = useCurrency();
  const tMoney = useTranslations("BookingMoney");
  const { setProfileBookingCrumbLabel } = useBookingBreadcrumbProfileBookingTitle();

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

  useEffect(() => {
    if (!row) return;
    setProfileBookingCrumbLabel(bookingBreadcrumbTitle(row));
  }, [row, setProfileBookingCrumbLabel]);

  if (loading) {
    return <BookingDetailLoading />;
  }

  if (error || !row) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-card p-8 text-center">
        <p className="text-destructive">{error ?? "Not found"}</p>
        <Link
          href={backHref}
          className="mt-4 inline-block font-semibold text-primary hover:underline"
        >
          {backLabel}
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

  const flightPay = row.type === "flight" ? flightPaymentCopy(tMoney, row.payment_status) : null;
  const hotelPay = row.type === "hotel" ? flightPaymentCopy(tMoney, row.payment_status) : null;

  const refreshBooking = async () => {
    const b = await getBooking(bookingId);
    setRow(b);
  };

  if (row.type === "flight" && row.flight_booking && row.status === "confirmed") {
    return (
      <div className="space-y-4">
        <FlightOrderDetailView
          row={row}
          bookingId={bookingId}
          showAdminTicketTools={showAdminTicketTools}
          paymentStatusLabel={flightPay?.label}
          onRefresh={refreshBooking}
        />
      </div>
    );
  }

  if (hotelUsesRichDetailView(row)) {
    return (
      <div className="space-y-4">
        <HotelOrderDetailView
          row={row}
          bookingId={bookingId}
          showAdminVoucherTools={showAdminTicketTools}
          paymentStatusLabel={hotelPay?.label}
          onRefresh={refreshBooking}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
          {row.type === "flight" && flightPay ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                {tMoney("statusHeading")}:{" "}
                <span className="font-medium text-foreground">{flightPay.label}</span>
              </p>
              {flightPay.hint ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{flightPay.hint}</p>
              ) : null}
              <p className="mt-3 text-xs">
                <Link href="/profile/flight-activity" className="font-medium text-primary hover:underline">
                  {tMoney("ledgerCta")}
                </Link>
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Payment: {row.payment_status}</p>
          )}
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          {/* <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Total</h2> */}
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

      {row.flight_booking ? (
        <FlightSections
          fb={row.flight_booking}
          bookingId={row.id}
          bookingRefNo={row.booking_ref_no}
          totalAmount={row.total_amount}
          currency={row.currency}
          showAdminTicketTools={showAdminTicketTools}
          onRefresh={async () => {
            const b = await getBooking(bookingId);
            setRow(b);
          }}
        />
      ) : null}
      {row.type === "flight" && row.flight_booking && row.status !== "confirmed" ? (
        <>
          <FlightBookingCancelPanel
            bookingId={row.id}
            bookingRefNo={row.booking_ref_no}
            status={row.status}
            paymentStatus={row.payment_status}
            hasDuffelOrder={Boolean(row.flight_booking.duffel_order_id)}
            onBookingRefresh={refreshBooking}
          />
          <FlightFinancialTimelinePanel bookingId={row.id} />
        </>
      ) : null}
      {row.hotel_booking ? <HotelSections hb={row.hotel_booking} /> : null}
      {row.type === "hotel" && row.hotel_booking && row.status !== "confirmed" ? (
        <>
          <HotelPaymentSummary guestData={row.guest_data} />
          <HotelBookingCancelPanel
            bookingId={row.id}
            bookingRefNo={row.booking_ref_no}
            status={row.status}
            paymentStatus={row.payment_status}
            hasDuffelBooking={Boolean(row.hotel_booking.duffel_booking_id)}
            onBookingRefresh={refreshBooking}
          />
        </>
      ) : null}
      {row.car_booking ? <CarSections cb={row.car_booking} /> : null}
      {row.guest_data ? <GuestDetails guest={row.guest_data} /> : null}
    </div>
  );
}
