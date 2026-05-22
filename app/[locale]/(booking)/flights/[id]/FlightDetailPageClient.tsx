"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import FlightDetail from "@/views/FlightDetail";
import { FlightDetailLoading } from "@/components/flights/FlightSkeletons";
import { getFlightOfferDeduped } from "@/lib/http/flights.client";
import { writeFlightOfferSnapshot } from "@/lib/flights/flight-offer-snapshot";
import { flightOfferToListDisplay } from "@/lib/flights/list-display";
import type { FlightListDisplay } from "@/lib/flights/list-display";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";

export default function FlightDetailPageClient() {
  const toffer = useTranslations("Flights.offerDetail");
  const params = useParams();
  const rawId = typeof params?.id === "string" ? params.id : "";
  const id = rawId.trim();

  const [flight, setFlight] = useState<FlightListDisplay | null>(null);
  const [offerDto, setOfferDto] = useState<FlightOfferDTO | null>(null);
  const [error, setError] = useState<string | null>(() => (!id ? "Invalid offer" : null));
  const [loading, setLoading] = useState(() => Boolean(id));

  useEffect(() => {
    if (!id) {
      setError("Invalid offer");
      setFlight(null);
      setOfferDto(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setError(null);
    setFlight(null);
    setOfferDto(null);
    setLoading(true);
    getFlightOfferDeduped(id)
      .then((res) => {
        if (cancelled) return;
        setFlight(flightOfferToListDisplay(res.offer));
        setOfferDto(res.offer);
        writeFlightOfferSnapshot(res.offer);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e?.message ?? "Could not load this offer");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const errorMessage = useMemo(() => {
    if (!error) return "";
    if (error === "Invalid offer") return toffer("invalidOffer");
    if (error === "Could not load this offer") return toffer("couldNotLoadOffer");
    if (error === "This offer is no longer available.") return toffer("expiredMessage");
    return error;
  }, [error, toffer]);

  if (error) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-foreground mb-2">{toffer("unavailableTitle")}</h1>
        <p className="text-muted-foreground">{errorMessage}</p>
        <p className="text-sm text-muted-foreground mt-4">{toffer("returnToSearchHint")}</p>
      </div>
    );
  }

  if (loading || flight === null || offerDto === null || String(flight.id) !== id) {
    return <FlightDetailLoading />;
  }

  return <FlightDetail flight={flight} offer={offerDto} />;
}
