"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import type { FlightListDisplay } from "@/lib/flights/list-display";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import { getFlightSearchSessionOffersDeduped } from "@/lib/http/flights.client";
import { resolveFareOptionsFromSession } from "@/lib/flights/flight-search-offers-cache";
import { FlightItineraryDetailBody } from "@/components/flights/FlightItineraryDetailBody";
import { useTranslations, useLocale } from "next-intl";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { offerItineraryFingerprint } from "@/lib/flights/list-display";

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

    const cached = resolveFareOptionsFromSession(sid, offer);
    if (cached) {
      setFareOptions(cached);
      return;
    }

    let cancelled = false;
    getFlightSearchSessionOffersDeduped(sid)
      .then((res) => {
        if (cancelled) return;
        const fp = offerItineraryFingerprint(offer);
        const sib = res.offers.filter((o) => offerItineraryFingerprint(o) === fp);
        setFareOptions(
          sib.length
            ? sib.sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount))
            : [offer],
        );
      })
      .catch(() => {
        if (!cancelled) setFareOptions([offer]);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionFromUrl, offer]);

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

      <FlightItineraryDetailBody flight={flight} />
    </div>
  );
}
