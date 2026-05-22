"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

import { FlightChangeBreadcrumb } from "@/components/flights/FlightChangeBreadcrumb";
import { BookingSidebar } from "@/components/shared/BookingSidebar";
import { DetailPageLayout } from "@/components/shared/DetailPageLayout";
import { FlightChangeConfirmPaySkeleton, FlightChangePaymentLoading } from "@/components/flights/FlightSkeletons";
import {
  orderChangeOfferToFlightOfferDto,
  orderChangeOfferToListDisplay,
} from "@/lib/flights/order-change-offer-adapter";
import type { FlightFlowContext } from "@/lib/flights/flight-flow-context";
import {
  clearFlightChangeSession,
  readFlightChangeSession,
} from "@/lib/flights/flight-change-session";
import { useFlightChangeHubData } from "@/lib/http/flight-change-swr";

const FlightChangeConfirmPay = dynamic(
  () =>
    import("@/components/flights/FlightChangeConfirmPay").then((m) => m.FlightChangeConfirmPay),
  { ssr: false, loading: () => <FlightChangeConfirmPaySkeleton /> },
);

type Props = { bookingId: string };

/**
 * Order-change payment entry — mirrors {@link FlightPaymentEntry} layout shell.
 */
export function FlightChangePaymentEntry({ bookingId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const changeIdParam = searchParams.get("change_id")?.trim() ?? "";
  const offerIdParam = searchParams.get("offer_id")?.trim() ?? "";

  const session = useMemo(() => readFlightChangeSession(bookingId), [bookingId]);
  const changeId = changeIdParam || session?.changeId || "";
  const offerId = offerIdParam || session?.selectedOfferId || "";
  const offer = session?.offers?.find((o) => o.id === offerId) ?? null;

  const { data: hub, isLoading: hubLoading } = useFlightChangeHubData(
    bookingId,
    session?.selectedSliceId,
  );

  useEffect(() => {
    if (!session || !(changeIdParam || session.changeId) || !(offerIdParam || session.selectedOfferId)) {
      router.replace(`/flights/change/${encodeURIComponent(bookingId)}`);
    }
  }, [bookingId, changeIdParam, offerIdParam, session, router]);

  const flowContext: FlightFlowContext | null = useMemo(() => {
    if (!hub?.originalBooking) return null;
    return {
      variant: "change-flight",
      bookingId,
      originalBooking: hub.originalBooking,
      changeId,
    };
  }, [hub, bookingId, changeId]);

  const flight = offer ? orderChangeOfferToListDisplay(offer) : null;
  const offerDto = offer ? orderChangeOfferToFlightOfferDto(offer) : null;

  const bookingItem = useMemo(
    () =>
      flight
        ? {
            id: flight.id,
            price: flight.price,
            currency: flight.currency,
            airline: flight.airline,
            flightNumber: flight.flightNumber,
            departureAirport: flight.departureAirport,
            arrivalAirport: flight.arrivalAirport,
            departureTime: flight.departureTime,
            arrivalTime: flight.arrivalTime,
          }
        : null,
    [flight],
  );

  const onSuccess = useCallback(() => {
    clearFlightChangeSession(bookingId);
    router.push(`/profile/bookings/${encodeURIComponent(bookingId)}?change=confirmed`);
  }, [bookingId, router]);

  const snapshot = hub?.booking.flight_booking?.itinerary_snapshot ?? null;
  const loading = hubLoading || !session || !offer || !changeId || !offerId || !flight || !offerDto || !bookingItem;

  if (loading) {
    return <FlightChangePaymentLoading />;
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <div className="flex-grow pt-12 pb-12 sm:px-4">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <FlightChangeBreadcrumb
            bookingId={bookingId}
            bookingRefNo={session.bookingRefNo ?? bookingId}
            step="payment"
          />
          <DetailPageLayout
            mainContent={
              <FlightChangeConfirmPay
                bookingId={bookingId}
                changeId={changeId}
                offer={offer}
                offerId={offerId}
                bookingRefNo={session.bookingRefNo ?? ""}
                beforeAmount={session.beforeChangeAmount ?? "0"}
                beforeCurrency={session.beforeChangeCurrency ?? offer.change_total_currency ?? "USD"}
                itinerarySnapshot={snapshot}
                selectedSliceIndex={session.selectedSliceIndex ?? 0}
                onSuccess={onSuccess}
              />
            }
            sidebarContent={
              <BookingSidebar
                item={bookingItem}
                type="flight"
                flightOffer={offerDto}
                flowContext={flowContext ?? undefined}
                changeOffer={offer}
                beforeChangeAmount={session.beforeChangeAmount}
                beforeChangeCurrency={session.beforeChangeCurrency}
                quoteExpiresAt={session.quoteExpiresAt}
              />
            }
          />
        </div>
      </div>
    </div>
  );
}
