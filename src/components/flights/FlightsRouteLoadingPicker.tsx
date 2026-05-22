"use client";

import { useSearchParams } from "next/navigation";

import {
  FlightListPageSkeleton,
  FlightsHubPageSkeleton,
} from "@/components/flights/FlightSkeletons";
import { getFlightsPageLayout } from "@/lib/flights/flights-page-layout";

/** Picks hub vs results skeleton based on URL search params (route loading.tsx). */
export function FlightsRouteLoadingPicker() {
  const searchParams = useSearchParams();
  const layout = getFlightsPageLayout(new URLSearchParams(searchParams.toString()));

  if (layout === "results") {
    return <FlightListPageSkeleton />;
  }

  return <FlightsHubPageSkeleton />;
}
