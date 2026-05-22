"use client";

import { useDebouncedSuggestionFetch } from "@/lib/hooks/useDebouncedSuggestionFetch";
import { getFlightAirports, type AirportSuggestionDto } from "@/lib/http/flights.client";

/**
 * Duffel-dashboard-style debounced airport lookup (min 2 chars; aborts stale requests).
 */
export function useDuffelAirportSuggest(
  open: boolean,
  query: string,
): { rows: AirportSuggestionDto[]; loading: boolean } {
  return useDebouncedSuggestionFetch<AirportSuggestionDto>({
    open,
    query,
    fetcher: async (q, signal) => {
      const r = await getFlightAirports({ q, limit: 22 }, { signal });
      return r.airports ?? [];
    },
  });
}
