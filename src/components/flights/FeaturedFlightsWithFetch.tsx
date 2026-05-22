"use client";

import type { FlightCardData } from "@/components/ui/Card";
import { FeaturedFlightsShell } from "@/components/flights/FeaturedFlightsShell";
import { FeaturedFlightsGridSkeleton } from "@/components/flights/FlightSkeletons";
import { FeaturedFlightsGrid } from "@/components/flights/FeaturedFlightsGrid";
import { useFeaturedFlightCardsQuery } from "@/lib/http/featured-swr";

/**
 * Client-side featured flights via shared SWR cache (`GET /api/v1/flights/featured`).
 * Navigations (e.g. locale change) reuse cached data instead of refetching per mount.
 */
export default function FeaturedFlightsWithFetch({ bgColor = "bg-muted" }: { bgColor?: string }) {
  const { data, error, isLoading } = useFeaturedFlightCardsQuery();

  const cards: FlightCardData[] | null =
    isLoading ? null : error ? [] : (data ?? []);

  return (
    <FeaturedFlightsShell
      bgColor={bgColor}
      cardsSlot={
        cards === null ? (
          <FeaturedFlightsGridSkeleton />
        ) : (
          <FeaturedFlightsGrid cards={cards} />
        )
      }
    />
  );
}
