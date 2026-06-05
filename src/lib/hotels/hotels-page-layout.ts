import { recordToUrlSearchParams } from "@/lib/flights/flights-page-layout";
import { hasStaysSearchInUrl } from "@/lib/hotels/search-from-url";

/** `/hotels` default: tab + featured only (no Duffel results list). */
export type HotelsPageLayout = "browse" | "results";

const STAYS_RESULTS_PARAM = "stays_results";

/**
 * - `browse`: no results list (featured + search form only).
 * - `results`: show Duffel search results (`HotelsList`); uses `sessionStorage` key `ttu_stays_search`.
 */
export function getHotelsPageLayout(searchParams: URLSearchParams): HotelsPageLayout {
  const v = searchParams.get(STAYS_RESULTS_PARAM)?.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return "results";
  if (hasStaysSearchInUrl(searchParams)) return "results";
  return "browse";
}

export { recordToUrlSearchParams };
