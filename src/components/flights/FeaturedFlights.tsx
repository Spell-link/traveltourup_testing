import "server-only";

import { Suspense } from "react";
import { getCachedFeaturedFlightCards } from "@/lib/services/flights/featured-flights.service";
import { FeaturedFlightsShell } from "@/components/flights/FeaturedFlightsShell";
import { FeaturedFlightsGridSkeleton } from "@/components/flights/FlightSkeletons";
import { FeaturedFlightsGrid } from "@/components/flights/FeaturedFlightsGrid";

type Props = { bgColor?: string };

async function FeaturedFlightsCardsFromServer() {
  const cards = await getCachedFeaturedFlightCards();
  return <FeaturedFlightsGrid cards={cards} />;
}

/**
 * Server component: section chrome and hero render immediately; cached offers stream inside Suspense.
 * From `"use client"` pages, use {@link FeaturedFlightsWithFetch} or `GET /api/v1/flights/featured`.
 */
export default function FeaturedFlights({ bgColor = "bg-muted" }: Props) {
  return (
    <FeaturedFlightsShell
      bgColor={bgColor}
      cardsSlot={
        <Suspense fallback={<FeaturedFlightsGridSkeleton />}>
          <FeaturedFlightsCardsFromServer />
        </Suspense>
      }
    />
  );
}
