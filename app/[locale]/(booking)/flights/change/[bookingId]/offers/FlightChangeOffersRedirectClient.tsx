"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

import { FlightChangeRedirectLoading } from "@/components/flights/FlightSkeletons";
import { buildFlightChangeSearchUrl } from "@/lib/flights/flights-change-page-layout";
import { readFlightChangeSession } from "@/lib/flights/flight-change-session";

type Props = { bookingId: string };

/** Legacy `/offers` route → unified change hub results URL. */
export default function FlightChangeOffersRedirectClient({ bookingId }: Props) {
  const router = useRouter();

  useEffect(() => {
    const session = readFlightChangeSession(bookingId);
    if (session?.origin && session.destination && session.departureDate && session.selectedSliceId) {
      router.replace(
        buildFlightChangeSearchUrl(bookingId, {
          origin: session.origin,
          destination: session.destination,
          departure_date: session.departureDate,
          slice_id: session.selectedSliceId,
          cabin_class: session.cabinClass || "economy",
          adults: "1",
          children: "0",
          infants: "0",
        }),
      );
      return;
    }
    router.replace(`/flights/change/${encodeURIComponent(bookingId)}`);
  }, [bookingId, router]);

  return <FlightChangeRedirectLoading />;
}
