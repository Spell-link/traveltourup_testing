import type { SelectedHotelLocation } from "@/components/hotels/HotelsTab";
import { staysSearchFromUrl } from "@/lib/hotels/search-from-url";

export type HydratedStaysFormState = {
  checkInDate: string;
  checkOutDate: string;
  rooms: number;
  adults: number;
  children: number;
  nationality: string;
  selectedDestination: SelectedHotelLocation | null;
  currentMonth: number;
  currentYear: number;
};

function monthYearFromYmd(
  ymd: string,
  fallback: { month: number; year: number },
): { month: number; year: number } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return fallback;
  const [ys, ms] = ymd.split("-");
  const y = parseInt(ys ?? "", 10);
  const m = parseInt(ms ?? "", 10);
  if (Number.isNaN(y) || Number.isNaN(m)) return fallback;
  return { month: m - 1, year: y };
}

/**
 * Maps `/hotels?…` back to `HotelsTab` controlled fields.
 * Returns `null` when the URL does not describe a runnable stays search.
 */
export function hydrateStaysFormFromUrl(sp: URLSearchParams): HydratedStaysFormState | null {
  const parsed = staysSearchFromUrl(sp);
  if (!parsed) return null;

  const { context } = parsed;
  const nationality = sp.get("nationality")?.trim().toUpperCase() || "US";
  const { month, year } = monthYearFromYmd(context.check_in_date, {
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });

  let selectedDestination: SelectedHotelLocation | null = null;
  if (context.destination) {
    if (context.destination.kind === "popular") {
      selectedDestination = {
        kind: "popular",
        code: context.destination.code,
        name: context.destination.name,
        country: context.destination.country,
      };
    } else {
      selectedDestination = {
        kind: "place",
        id: context.destination.id,
        name: context.destination.name,
        city_name: context.destination.city_name,
        iata_code: context.destination.iata_code,
        latitude: context.destination.latitude,
        longitude: context.destination.longitude,
        radius: context.destination.radius,
      };
    }
  }

  return {
    checkInDate: context.check_in_date,
    checkOutDate: context.check_out_date,
    rooms: context.rooms,
    adults: context.adults,
    children: context.children,
    nationality,
    selectedDestination,
    currentMonth: month,
    currentYear: year,
  };
}
