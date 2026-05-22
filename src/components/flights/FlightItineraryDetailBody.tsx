"use client";

import React, { useMemo } from "react";
import {
  Plane,
  Building2,
  Tag,
  XCircle,
  RefreshCw,
  Luggage,
  UtensilsCrossed,
  Clock,
} from "lucide-react";
import type { FlightListDisplay } from "@/lib/flights/list-display";
import {
  AIRLINE_DESCRIPTIONS,
  ALL_INFLIGHT_ICONS,
  formatFlightDate,
  INFLIGHT_FEATURES,
} from "@/lib/flights/flight-detail-shared";
import { DetailKeyGrid } from "@/components/shared/DetailKeyGrid";
import { DetailFeaturesGrid } from "@/components/shared/DetailFeaturesGrid";
import { useTranslations, useLocale } from "next-intl";
import { useCurrency } from "@/components/providers/CurrencyProvider";

export interface FlightItineraryDetailBodyProps {
  flight: FlightListDisplay;
  /** When set, overrides `flight.price` / `flight.currency` for the Total row. */
  totalAmount?: string | number;
  totalCurrency?: string;
  /** Booking detail: hide offer-marketing sections; use Duffel order copy. */
  bookingMode?: boolean;
  headerSubtitle?: string;
  journeyMetaLine?: string;
  changePolicyText?: string;
  refundPolicyText?: string;
}

/**
 * Read-only flight itinerary presentation (route header, timeline, key grid, about, amenities).
 * Shared by offer detail and booking detail views.
 */
export function FlightItineraryDetailBody({
  flight,
  totalAmount,
  totalCurrency,
  bookingMode = false,
  headerSubtitle,
  journeyMetaLine,
  changePolicyText,
  refundPolicyText,
}: FlightItineraryDetailBodyProps) {
  const tf = useTranslations("Flights.detail");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const { formatPrice } = useCurrency();

  const takeoffFull = formatFlightDate(flight.departureDate, flight.departureTime);
  const arrivalFull = formatFlightDate(flight.departureDate, flight.arrivalTime);
  const airlineDesc =
    AIRLINE_DESCRIPTIONS[flight.airline] ??
    `${flight.airline} offers reliable service with modern aircraft and professional crew.`;

  const cabinLabel = flight.fareBrandName ?? "Economy";

  const totalN =
    totalAmount != null ? Number.parseFloat(String(totalAmount)) : flight.price;
  const totalCur = (totalCurrency ?? flight.currency ?? "USD").toUpperCase();
  const totalDisplay = Number.isFinite(totalN)
    ? formatPrice(totalN, totalCur, locale)
    : formatPrice(flight.price, flight.currency ?? "USD", locale);

  const keyDetails = useMemo(
    () => [
      {
        icon: <Building2 className="w-5 h-5" />,
        label: tf("labelAirline"),
        value: flight.airline,
      },
      {
        icon: <Plane className="w-5 h-5" />,
        label: tf("labelFlightType"),
        value: flight.stops === 0 ? tf("valueNonstop") : tf("valueStopCount", { count: flight.stops }),
      },
      {
        icon: <Tag className="w-5 h-5" />,
        label: tf("labelFareCabin"),
        value: cabinLabel,
      },
      {
        icon: <XCircle className="w-5 h-5" />,
        label: tf("labelCancellation"),
        value:
          bookingMode && refundPolicyText
            ? refundPolicyText
            : flight.refundable
              ? tc("freeCancellation")
              : tf("valueNonRefundableFee"),
      },
      {
        icon: <RefreshCw className="w-5 h-5" />,
        label: tf("labelFlightChange"),
        value:
          bookingMode && changePolicyText
            ? changePolicyText
            : flight.refundable
              ? tf("valueFreeChange")
              : tf("valueFeeApplies"),
      },
      {
        icon: <Luggage className="w-5 h-5" />,
        label: tf("labelSeatsBaggage"),
        value: flight.baggage,
      },
      ...(bookingMode
        ? []
        : [
            {
              icon: <UtensilsCrossed className="w-5 h-5" />,
              label: tf("labelInflightFeatures"),
              value: flight.amenities.map((a) => INFLIGHT_FEATURES[a]?.label ?? a).join(", "),
            },
          ]),
      {
        icon: <Tag className="w-5 h-5" />,
        label: tf("labelTotal"),
        value: totalDisplay,
      },
    ],
    [flight, tf, tc, cabinLabel, totalDisplay, bookingMode, changePolicyText, refundPolicyText],
  );

  const features =
    !bookingMode && flight.amenities.length > 0
      ? flight.amenities.map((a) => INFLIGHT_FEATURES[a] ?? { icon: <Plane className="w-4 h-4" />, label: a })
      : ALL_INFLIGHT_ICONS.slice(0, 6);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          {flight.departureAirport} to {flight.arrivalAirport}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {headerSubtitle ? (
            <span className="text-muted-foreground">{headerSubtitle}</span>
          ) : (
            <>
              <span className="text-muted-foreground">
                {flight.stops === 0 ? "Nonstop" : "Connecting"} flight
              </span>
              <span className="px-3 py-1 rounded-lg bg-amber-400 text-amber-950 font-bold text-sm">
                {flight.stops === 0 ? "Direct" : `${flight.stops} Stop${flight.stops > 1 ? "s" : ""}`}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="py-6 border-y border-border">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm font-bold text-foreground mb-1">Flight Take off</div>
            <div className="text-sm text-muted-foreground">{takeoffFull}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {flight.departureAirport} • T{flight.departureTerminal}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <Clock className="w-8 h-8 text-primary mb-2" />
            <span className="font-bold text-foreground">{flight.duration}</span>
          </div>
          <div>
            <div className="text-sm font-bold text-foreground mb-1">Flight Landing</div>
            <div className="text-sm text-muted-foreground">{arrivalFull}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {flight.arrivalAirport} • T{flight.arrivalTerminal}
            </div>
          </div>
        </div>
        <p className="text-center font-semibold text-foreground mt-4">Total flight time: {flight.duration}</p>
        {journeyMetaLine ? (
          <p className="mt-4 text-center text-xs text-muted-foreground">{journeyMetaLine}</p>
        ) : null}
      </div>

      {!bookingMode ? (
        <div>
          <DetailKeyGrid items={keyDetails} columns={3} />
        </div>
      ) : null}

      {!bookingMode ? (
        <>
          <div className="pt-4 md:pt-8 border-t border-border mb-0 pb-2">
            <h2 className="text-xl font-bold text-foreground mb-2 md:mb-4">About {flight.airline}</h2>
            <p className="text-muted-foreground leading-relaxed">{airlineDesc}</p>
          </div>

          <DetailFeaturesGrid
            title={tf("inflightSectionTitle")}
            description={tf("inflightSectionDescription")}
            features={features}
          />
        </>
      ) : null}
    </div>
  );
}
