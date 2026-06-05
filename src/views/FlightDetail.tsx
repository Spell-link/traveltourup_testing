"use client";

import React, { useEffect } from "react";
import { DetailPageLayout } from "@/components/shared/DetailPageLayout";
import { BookingSidebar } from "@/components/shared/BookingSidebar";
import { FlightDetailContent } from "@/components/flights/FlightDetailContent";
import { FlightOfferExpiryCountdown } from "@/components/flights/FlightOfferExpiryCountdown";
import { FlightChangeBreadcrumb } from "@/components/flights/FlightChangeBreadcrumb";
import { FlightOrderJourneyTimeline } from "@/components/flights/FlightOrderJourneyTimeline";
import { useBookingBreadcrumbFlightLabels } from "@/components/shared/BookingBreadcrumbFlightContext";
import { buildFlightDetailBreadcrumbLabels } from "@/lib/flights/flight-detail-breadcrumb";
import {
  defaultFlowContext,
  isChangeFlightFlow,
  type FlightFlowContext,
} from "@/lib/flights/flight-flow-context";
import type { FlightListDisplay } from "@/lib/flights/list-display";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import type { FlightOrderChangeOffer } from "@/lib/http/flights.client";
import { useTranslations } from "next-intl";

export interface FlightDetailProps {
  flight: FlightListDisplay;
  offer: FlightOfferDTO;
  flowContext?: FlightFlowContext;
  /** Raw Duffel order change offer (change flow). */
  changeOffer?: FlightOrderChangeOffer;
  /** Original booking itinerary snapshot for old-leg comparison. */
  beforeSnapshot?: unknown;
  sliceIndex?: number;
  bookingId?: string;
  bookingRefNo?: string;
  changePaymentHref?: string;
  quoteExpiresAt?: string | null;
  beforeAmount?: string;
  beforeCurrency?: string;
}

/**
 * Flight detail page view.
 * Uses DetailPageLayout with FlightDetailContent and BookingSidebar.
 * When `flowContext.variant === "change-flight"`, shows old vs new itinerary.
 */
export default function FlightDetail({
  flight,
  offer,
  flowContext: flowContextProp,
  changeOffer,
  beforeSnapshot,
  sliceIndex = 0,
  bookingId = "",
  bookingRefNo = "",
  changePaymentHref,
  quoteExpiresAt,
  beforeAmount,
  beforeCurrency,
}: FlightDetailProps) {
  const flowContext = defaultFlowContext(flowContextProp);
  const isChange = isChangeFlightFlow(flowContext);
  const tChange = useTranslations("Flights.change");
  const { setFlightDetailLabels, resetFlightDetailLabels } = useBookingBreadcrumbFlightLabels();

  useEffect(() => {
    if (isChange) return;
    const { route, title } = buildFlightDetailBreadcrumbLabels(flight);
    setFlightDetailLabels({ route, title });
    return () => resetFlightDetailLabels();
  }, [flight, isChange, setFlightDetailLabels, resetFlightDetailLabels]);

  const bookingItem = {
    id: flight.id,
    price: flight.price,
    currency: flight.currency,
    airline: flight.airline,
    flightNumber: flight.flightNumber,
    departureAirport: flight.departureAirport,
    arrivalAirport: flight.arrivalAirport,
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
  };

  const mainContent = (
    <div>
      {flight.expires_at ? (
        <FlightOfferExpiryCountdown expires_at={flight.expires_at} />
      ) : null}
      {isChange && beforeSnapshot ? (
        <div className="mb-6 space-y-6">
          <h1 className="text-xl font-bold text-foreground">{tChange("reviewChange")}</h1>
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {tChange("currentBooking")}
            </h2>
            <div className="mt-3">
              <FlightOrderJourneyTimeline snapshot={beforeSnapshot} sliceIndex={sliceIndex} />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {tChange("newItinerary")}
            </h2>
            <div className="mt-3">
              <FlightDetailContent flight={flight} offer={offer} />
            </div>
          </div>
        </div>
      ) : (
        <FlightDetailContent flight={flight} offer={offer} />
      )}
    </div>
  );

  const sidebar = (
    <BookingSidebar
      item={bookingItem}
      type="flight"
      flightOffer={offer}
      flowContext={flowContext}
      changeOffer={changeOffer ?? null}
      beforeChangeAmount={beforeAmount}
      beforeChangeCurrency={beforeCurrency}
      quoteExpiresAt={quoteExpiresAt}
      changePaymentHref={changePaymentHref}
    />
  );

  if (isChange && bookingId) {
    return (
      <div className="bg-muted">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <FlightChangeBreadcrumb
            bookingId={bookingId}
            bookingRefNo={bookingRefNo}
            step="offers"
          />
          <DetailPageLayout mainContent={mainContent} sidebarContent={sidebar} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted">
      <DetailPageLayout mainContent={mainContent} sidebarContent={sidebar} />
    </div>
  );
}
