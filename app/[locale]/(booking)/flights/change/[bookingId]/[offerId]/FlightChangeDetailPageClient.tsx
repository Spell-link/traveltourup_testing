"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import FlightDetail from "@/views/FlightDetail";
import { FlightChangeDetailLoading } from "@/components/flights/FlightSkeletons";
import {
  orderChangeOfferToFlightOfferDto,
  orderChangeOfferToListDisplay,
} from "@/lib/flights/order-change-offer-adapter";
import type { FlightFlowContext } from "@/lib/flights/flight-flow-context";
import {
  patchFlightChangeSession,
  readFlightChangeSession,
} from "@/lib/flights/flight-change-session";
import { useFlightChangeHubData } from "@/lib/http/flight-change-swr";

type Props = { bookingId: string; offerId: string };

export default function FlightChangeDetailPageClient({ bookingId, offerId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Flights.change");

  const session = useMemo(() => readFlightChangeSession(bookingId), [bookingId]);
  const offer = useMemo(
    () => session?.offers?.find((o) => o.id === offerId) ?? null,
    [session, offerId],
  );
  const changeId = searchParams.get("change_id")?.trim() || session?.changeId || "";

  const { data: hub, isLoading: hubLoading } = useFlightChangeHubData(
    bookingId,
    session?.selectedSliceId,
  );

  useEffect(() => {
    if (!session) {
      router.replace(`/flights/change/${encodeURIComponent(bookingId)}`);
      return;
    }
    if (!offer) return;
    patchFlightChangeSession(bookingId, { selectedOfferId: offerId, changeId });
  }, [bookingId, offerId, session, offer, changeId, router]);

  const flight = offer ? orderChangeOfferToListDisplay(offer) : null;
  const offerDto = offer ? orderChangeOfferToFlightOfferDto(offer) : null;

  const paymentHref = useMemo(() => {
    const p = new URLSearchParams();
    if (changeId) p.set("change_id", changeId);
    p.set("offer_id", offerId);
    const qs = p.toString();
    return `/flights/change/${encodeURIComponent(bookingId)}/payment${qs ? `?${qs}` : ""}`;
  }, [bookingId, changeId, offerId]);

  const flowContext: FlightFlowContext | null = useMemo(() => {
    if (!hub?.originalBooking) return null;
    return {
      variant: "change-flight",
      bookingId,
      originalBooking: hub.originalBooking,
      changeId,
    };
  }, [hub, bookingId, changeId]);

  if (!session) {
    return <FlightChangeDetailLoading />;
  }

  if (!offer) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-center text-destructive">{t("offerNotFound")}</p>
      </div>
    );
  }

  if (hubLoading || !flight || !offerDto || !flowContext || !hub) {
    return <FlightChangeDetailLoading />;
  }

  return (
    <FlightDetail
      flight={flight}
      offer={offerDto}
      flowContext={flowContext}
      changeOffer={offer}
      beforeSnapshot={hub.booking.flight_booking?.itinerary_snapshot ?? null}
      sliceIndex={session.selectedSliceIndex ?? 0}
      bookingId={bookingId}
      bookingRefNo={hub.booking.booking_ref_no}
      changePaymentHref={paymentHref}
      quoteExpiresAt={session.quoteExpiresAt}
      beforeAmount={String(hub.booking.total_amount)}
      beforeCurrency={hub.booking.currency}
    />
  );
}
