"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plane,
  Building2,
  Tag,
  XCircle,
  RefreshCw,
  Luggage,
  Wifi,
  UtensilsCrossed,
  Tv,
  Coffee,
  Wine,
  ShoppingBag,
  Gamepad2,
  Wind,
  Clock,
  Check,
} from "lucide-react";
import type { FlightListDisplay } from "@/lib/flights/list-display";
import { offerItineraryFingerprint } from "@/lib/flights/list-display";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import { getFlightSearchSessionOffers } from "@/lib/http/flights.client";
import { DetailKeyGrid } from "@/components/shared/DetailKeyGrid";
import { DetailFeaturesGrid } from "@/components/shared/DetailFeaturesGrid";
import { useTranslations, useLocale } from "next-intl";
import { useCurrency } from "@/components/providers/CurrencyProvider";

const AIRLINE_DESCRIPTIONS: Record<string, string> = {
  Saudia:
    "Saudia is the flag carrier of Saudi Arabia, offering premium service across the Middle East and beyond. Known for modern fleet and excellent hospitality.",
  "Pakistan International Airlines":
    "Pakistan International Airlines (PIA) connects Pakistan with the world. With decades of experience, PIA offers reliable service on regional and international routes.",
  Emirates:
    "Emirates is one of the world's leading airlines, renowned for luxury inflight experience, extensive route network, and award-winning service.",
  "Qatar Airways":
    "Qatar Airways is a five-star airline offering world-class comfort and service. Based in Doha, it connects passengers to over 160 destinations worldwide.",
  "Etihad Airways":
    "Etihad Airways is the national airline of the UAE, providing premium travel experience with innovative cabins and exceptional service.",
  Flydubai:
    "Flydubai is a low-cost carrier based in Dubai, offering affordable travel across the Middle East, Africa, and Asia with modern aircraft.",
};

const INFLIGHT_FEATURES: Record<string, { icon: React.ReactNode; label: string }> = {
  wifi: { icon: <Wifi className="w-4 h-4" />, label: "Wi-Fi" },
  meals: { icon: <UtensilsCrossed className="w-4 h-4" />, label: "Meals" },
  entertainment: { icon: <Tv className="w-4 h-4" />, label: "Entertainment" },
  luxury: { icon: <Plane className="w-4 h-4" />, label: "Premium Cabin" },
};

const ALL_INFLIGHT_ICONS = [
  { icon: <Wifi className="w-4 h-4" />, label: "Wi-Fi" },
  { icon: <Tv className="w-4 h-4" />, label: "Entertainment" },
  { icon: <Tv className="w-4 h-4" />, label: "Television" },
  { icon: <Wind className="w-4 h-4" />, label: "Air Conditioning" },
  { icon: <Coffee className="w-4 h-4" />, label: "Drinks" },
  { icon: <Gamepad2 className="w-4 h-4" />, label: "Games" },
  { icon: <Coffee className="w-4 h-4" />, label: "Coffee" },
  { icon: <Wine className="w-4 h-4" />, label: "Wines" },
  { icon: <ShoppingBag className="w-4 h-4" />, label: "Shopping" },
];

function formatFlightDate(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const month = months[parseInt(m || "1", 10) - 1];
  const [h, min] = timeStr.split(":");
  const hour = parseInt(h || "0", 10);
  const ampm = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 || 12;
  return `${d} ${month} ${y}, ${hour12}:${min || "00"} ${ampm}`;
}

function fareLabelFromOffer(o: FlightOfferDTO): string {
  const brands = o.slices
    .flatMap((s) => s.segments.map((seg) => seg.fare_brand_name))
    .filter(Boolean) as string[];
  if (brands.length) return [...new Set(brands)].join(" · ");
  const c = o.slices[0]?.segments[0]?.cabin_class;
  return c ? c.replace(/_/g, " ") : "Fare option";
}

export interface FlightDetailContentProps {
  flight: FlightListDisplay;
  offer: FlightOfferDTO;
}

export function FlightDetailContent({ flight, offer }: FlightDetailContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionFromUrl = searchParams.get("search_session")?.trim() || null;
  const tf = useTranslations("Flights.detail");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const { formatPrice } = useCurrency();

  const [fareOptions, setFareOptions] = useState<FlightOfferDTO[]>([offer]);

  useEffect(() => {
    setFareOptions([offer]);
  }, [offer.id]);

  useEffect(() => {
    const sid =
      sessionFromUrl ??
      (typeof window !== "undefined" ? sessionStorage.getItem("flightSearchSessionId") : null);
    if (!sid) {
      setFareOptions([offer]);
      return;
    }
    let cancelled = false;
    getFlightSearchSessionOffers(sid)
      .then((res) => {
        if (cancelled) return;
        const fp = offerItineraryFingerprint(offer);
        const sib = res.offers.filter((o) => offerItineraryFingerprint(o) === fp);
        setFareOptions(sib.length ? sib.sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount)) : [offer]);
      })
      .catch(() => {
        if (!cancelled) setFareOptions([offer]);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionFromUrl, offer]);

  const takeoffFull = formatFlightDate(flight.departureDate, flight.departureTime);
  const arrivalFull = formatFlightDate(flight.departureDate, flight.arrivalTime);
  const airlineDesc =
    AIRLINE_DESCRIPTIONS[flight.airline] ??
    `${flight.airline} offers reliable service with modern aircraft and professional crew.`;

  const cabinLabel =
    flight.fareBrandName ??
    offer.slices[0]?.segments[0]?.cabin_class?.replace(/_/g, " ") ??
    "Economy";

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
        value: flight.refundable ? tc("freeCancellation") : tf("valueNonRefundableFee"),
      },
      {
        icon: <RefreshCw className="w-5 h-5" />,
        label: tf("labelFlightChange"),
        value: flight.refundable ? tf("valueFreeChange") : tf("valueFeeApplies"),
      },
      {
        icon: <Luggage className="w-5 h-5" />,
        label: tf("labelSeatsBaggage"),
        value: flight.baggage,
      },
      {
        icon: <UtensilsCrossed className="w-5 h-5" />,
        label: tf("labelInflightFeatures"),
        value: flight.amenities.map((a) => INFLIGHT_FEATURES[a]?.label ?? a).join(", "),
      },
      {
        icon: <Tag className="w-5 h-5" />,
        label: tf("labelTotal"),
        value: formatPrice(Number(flight.price), flight.currency ?? "USD", locale),
      },
    ],
    [flight, tf, tc, cabinLabel, formatPrice, locale],
  );

  const features =
    flight.amenities.length > 0
      ? flight.amenities.map((a) => INFLIGHT_FEATURES[a] ?? { icon: <Plane className="w-4 h-4" />, label: a })
      : ALL_INFLIGHT_ICONS.slice(0, 6);

  const goToOffer = (o: FlightOfferDTO) => {
    const q = sessionFromUrl ? `?search_session=${encodeURIComponent(sessionFromUrl)}` : "";
    router.push(`/flights/${encodeURIComponent(o.id)}${q}`);
  };

  return (
    <div className="space-y-8">
      {fareOptions.length > 1 ? (
        <section className="rounded-2xl border border-border bg-card/50 p-4 md:p-6">
          <h2 className="mb-3 text-lg font-bold text-foreground">Fare options (same itinerary)</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Choose a fare brand or cabin. Pricing updates the offer you take to checkout.
          </p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {fareOptions.map((o) => {
              const selected = o.id === offer.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => goToOffer(o)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    selected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-input bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{fareLabelFromOffer(o)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatPrice(Number.parseFloat(o.total_amount), o.total_currency, locale)} total
                      </p>
                    </div>
                    {selected ? <Check className="h-5 w-5 shrink-0 text-primary" /> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          {flight.departureAirport} to {flight.arrivalAirport}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">
            {flight.stops === 0 ? "Nonstop" : "Connecting"} flight
          </span>
          <span className="px-3 py-1 rounded-lg bg-amber-400 text-amber-950 font-bold text-sm">
            {flight.stops === 0 ? "Direct" : `${flight.stops} Stop${flight.stops > 1 ? "s" : ""}`}
          </span>
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
      </div>

      <div>
        <DetailKeyGrid items={keyDetails} columns={3} />
      </div>

      <div className="pt-4 md:pt-8 border-t border-border mb-0 pb-2">
        <h2 className="text-xl font-bold text-foreground mb-2 md:mb-4">About {flight.airline}</h2>
        <p className="text-muted-foreground leading-relaxed">{airlineDesc}</p>
      </div>

      <DetailFeaturesGrid
        title={tf("inflightSectionTitle")}
        description={tf("inflightSectionDescription")}
        features={features}
      />
    </div>
  );
}

export { FlightDetailContentSkeleton } from "./FlightDetailSkeleton";
