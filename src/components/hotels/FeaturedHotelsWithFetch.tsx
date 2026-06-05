"use client";

import FeaturedHotels, { type FeaturedHotel } from "@/components/hotels/FeaturedHotels";
import { staysFeaturedCardToFeaturedHotel } from "@/lib/stays/stays-ui-map";
import { useFeaturedStaysQuery } from "@/lib/http/featured-swr";

export interface FeaturedHotelsWithFetchProps {
  /** Static fallback when API empty or Stays not configured */
  fallbackHotels: FeaturedHotel[];
  featuredAd?: { image?: string | { src: string } };
  bgColor?: string;
  mainPading?: string;
}
/**
 * Loads cached featured Stays via shared SWR (`GET /api/v1/stays/featured`); falls back to `fallbackHotels`.
 */
export default function FeaturedHotelsWithFetch({
  fallbackHotels,
  featuredAd,
  bgColor = "bg-muted",
  mainPading = "py-10",
}: FeaturedHotelsWithFetchProps) {
  const { data, error, isLoading } = useFeaturedStaysQuery();
console.log("this is featured hotels with fetch", data, error, isLoading);
  if (isLoading) {
    return <FeaturedHotels loading featuredAd={featuredAd} bgColor={bgColor} />;
  }

  let hotelsFromApi: FeaturedHotel[] = [];
  if (!error && data?.cards && Array.isArray(data.cards) && data.cards.length > 0) {
    hotelsFromApi = data.cards.map((c, i) =>
      staysFeaturedCardToFeaturedHotel(c, i) as FeaturedHotel,
    );
  }

  const display = hotelsFromApi.length > 0 ? hotelsFromApi : fallbackHotels;
  return <FeaturedHotels hotels={display} featuredAd={featuredAd} bgColor={bgColor} mainPading={mainPading} />;
}
