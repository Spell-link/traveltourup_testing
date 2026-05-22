"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { FlightManageBookingMenu } from "@/components/bookings/FlightManageBookingMenu";
import { BookingItineraryExportButton } from "@/components/bookings/BookingItineraryExportButton";
import { FlightBookingCancelPanel } from "@/components/bookings/FlightBookingCancelPanel";
import { FlightBookingChangeHistory } from "@/components/bookings/FlightBookingChangeHistory";
import { FlightFinancialTimelinePanel } from "@/components/bookings/FlightFinancialTimelinePanel";
import { BookingDuffelPassengersSection } from "@/components/bookings/BookingDuffelPassengersSection";
import { BookingDuffelPolicyCards } from "@/components/bookings/BookingDuffelPolicyCards";
import { BookingFlightItineraryDetail } from "@/components/bookings/BookingFlightItineraryDetail";
import { DetailPageLayout } from "@/components/shared/DetailPageLayout";
import { FlightOrderBillingSummary } from "@/components/flights/FlightOrderBillingSummary";
import { FlightOrderSummarySidebar } from "@/components/flights/FlightOrderSummarySidebar";
import { Button } from "@/components/ui/Button";
import type { BookingDetailDto } from "@/lib/bookings/booking.types";
import { evaluateFlightChangePolicy } from "@/lib/flights/flight-change-policy";
import { parseDuffelOrderDisplay } from "@/lib/flights/duffel-order-display";
import { postBookingItineraryRegenerate } from "@/lib/http/bookings.client";

type FlightBookingDetail = NonNullable<BookingDetailDto["flight_booking"]>;
type FlightTicketMeta = {
  ticket_ready?: boolean;
  ticket_generated_at?: string | null;
  ticket_generation_failed?: boolean;
};

function GuestDetailsFallback({ guest }: { guest: unknown }) {
  if (guest == null || typeof guest !== "object") return null;
  const o = guest as Record<string, unknown>;
  const passengers = o.passengers;
  if (!Array.isArray(passengers) || passengers.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Passengers</h2>
      <ul className="mt-4 space-y-3 text-sm">
        {passengers.map((pItem: unknown, i: number) => {
          const p = pItem && typeof pItem === "object" ? (pItem as Record<string, unknown>) : null;
          const name = p
            ? [p.given_name, p.family_name]
                .filter((x): x is string => typeof x === "string" && x.length > 0)
                .join(" ")
            : "";
          const born = p && typeof p.born_on === "string" ? p.born_on : null;
          const email = p && typeof p.email === "string" ? p.email : null;
          const phone = p && typeof p.phone_number === "string" ? p.phone_number : null;
          return (
            <li key={i} className="rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
              <p className="font-medium text-foreground">{name || `Adult ${i + 1}`}</p>
              {born ? <p className="text-xs text-muted-foreground">DOB {born}</p> : null}
              {email ? <p className="mt-1 text-xs text-muted-foreground">{email}</p> : null}
              {phone ? <p className="text-xs text-muted-foreground">{phone}</p> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function FlightOrderDetailView({
  row,
  bookingId,
  showAdminTicketTools,
  paymentStatusLabel,
  onRefresh,
}: {
  row: BookingDetailDto;
  bookingId: string;
  showAdminTicketTools?: boolean;
  paymentStatusLabel?: string;
  onRefresh: () => Promise<void>;
}) {
  const fb = row.flight_booking as (FlightBookingDetail & FlightTicketMeta) | null;
  const searchParams = useSearchParams();
  const changeConfirmed = searchParams.get("change") === "confirmed";
  const [regBusy, setRegBusy] = useState(false);
  const [cancelOpenQuote, setCancelOpenQuote] = useState<(() => void) | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const registerCancelActions = useCallback((actions: { openQuote: () => void; busy: boolean }) => {
    setCancelOpenQuote(() => actions.openQuote);
    setCancelBusy(actions.busy);
  }, []);

  const duffel = useMemo(
    () =>
      fb?.order_raw
        ? parseDuffelOrderDisplay(fb.order_raw, row.total_amount, row.currency)
        : null,
    [fb?.order_raw, row.total_amount, row.currency],
  );

  if (!fb) return null;

  const isConfirmed = row.status === "confirmed";
  const changePolicy = useMemo(
    () => evaluateFlightChangePolicy(fb.order_raw),
    [fb.order_raw],
  );
  const canChange =
    isConfirmed && Boolean(fb.duffel_order_id) && changePolicy.allowed;
  const canCancel = isConfirmed && Boolean(fb.duffel_order_id);

  const pageTitle = duffel?.bookingReference ?? fb.booking_reference ?? row.booking_ref_no;
  const pageSubtitle = duffel
    ? `Order id: ${duffel.orderId}`
    : fb.duffel_order_id
      ? `Order id: ${fb.duffel_order_id}`
      : null;

  return (
    <div className="-mx-2 sm:mx-0">
      {changeConfirmed ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          <div>
            <p className="font-medium text-foreground">Flight change confirmed</p>
            <p className="text-sm text-muted-foreground">Your updated itinerary is shown below.</p>
          </div>
        </div>
      ) : null}

      <div className=" flex flex-wrap items-start justify-between gap-4 p-4 md:p-8 pb-0 md:pb-0">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">{pageTitle}</h1>
          {pageSubtitle ? <p className="mt-1 font-mono text-xs text-muted-foreground">{pageSubtitle}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!fb.ticket_generation_failed ? (
            <BookingItineraryExportButton
              bookingId={bookingId}
              bookingRefNo={row.booking_ref_no}
              ticketReady={Boolean(fb.ticket_ready)}
            />
          ) : null}
          <FlightManageBookingMenu
            bookingId={bookingId}
            canChange={canChange}
            changeBlockedReason={canChange ? undefined : changePolicy.message}
            canCancel={canCancel}
            onRequestCancelQuote={() => cancelOpenQuote?.()}
            cancelBusy={cancelBusy}
          />
        </div>
      </div>

      <DetailPageLayout
        mainContent={
          <div className="space-y-6">
            <BookingFlightItineraryDetail
              itinerarySnapshot={fb.itinerary_snapshot}
              orderRaw={fb.order_raw}
              totalAmount={duffel?.billing.totalAmount ?? row.total_amount}
              currency={duffel?.billing.currency ?? row.currency}
            />

            {duffel ? <BookingDuffelPolicyCards policies={duffel.policies} /> : null}

            {duffel ? (
              <BookingDuffelPassengersSection
                passengers={duffel.passengers}
                adultCount={duffel.adultCount}
              />
            ) : row.guest_data ? (
              <GuestDetailsFallback guest={row.guest_data} />
            ) : null}

            <FlightOrderBillingSummary
              totalAmount={duffel?.billing.totalAmount ?? row.total_amount}
              currency={duffel?.billing.currency ?? row.currency}
              baseAmount={duffel?.billing.baseAmount}
              taxAmount={duffel?.billing.taxAmount}
            />

            {!fb.ticket_ready && !fb.ticket_generation_failed ? (
              <p className="text-sm text-muted-foreground">
                Your printable itinerary PDF is being prepared. Refresh shortly or check your confirmation email for the attachment.
              </p>
            ) : null}
            {fb.ticket_generation_failed ? (
              <p className="text-sm text-destructive">
                We couldn&apos;t generate your PDF automatically. Contact support with your booking reference.
              </p>
            ) : null}
            {showAdminTicketTools ? (
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
                      await onRefresh();
                    } finally {
                      setRegBusy(false);
                    }
                  })();
                }}
              >
                {regBusy ? "Regenerating…" : "Regenerate PDF"}
              </Button>
            ) : null}

            {fb.ancillaries && fb.ancillaries.length > 0 ? (
              <section className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Extras</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {fb.ancillaries.map((a) => (
                    <li key={a.id} className="flex justify-between gap-2 border-t border-border/40 pt-2">
                      <span className="capitalize text-foreground">{a.type.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground">
                        {a.currency} {a.amount}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <FlightBookingChangeHistory bookingId={bookingId} />

            <FlightBookingCancelPanel
              bookingId={bookingId}
              bookingRefNo={row.booking_ref_no}
              status={row.status}
              paymentStatus={row.payment_status}
              hasDuffelOrder={Boolean(fb.duffel_order_id)}
              onBookingRefresh={onRefresh}
              embedded
              onActionsReady={registerCancelActions}
            />

            <FlightFinancialTimelinePanel bookingId={bookingId} />
          </div>
        }
        sidebarContent={
          <FlightOrderSummarySidebar
            bookingRefNo={row.booking_ref_no}
            status={row.status}
            paymentStatus={row.payment_status}
            totalAmount={duffel?.billing.totalAmount ?? row.total_amount}
            currency={duffel?.billing.currency ?? row.currency}
            airlinePnr={duffel?.bookingReference ?? fb.booking_reference}
            duffelOrderId={duffel?.orderId ?? fb.duffel_order_id}
            itinerarySnapshot={fb.itinerary_snapshot}
            paymentStatusLabel={paymentStatusLabel}
            airlineName={duffel?.ownerName}
            airlineLogoUrl={duffel?.ownerLogoUrl}
            orderCreatedAt={duffel?.createdAt}
          />
        }
      />
    </div>
  );
}
