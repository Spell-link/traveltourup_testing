import type { BookingDetailDto, BookingListItemDto } from "@/lib/bookings/booking.types";
import { parseDuffelOrderDisplay } from "@/lib/flights/duffel-order-display";

type BookingLike = Pick<
  BookingListItemDto | BookingDetailDto,
  | "type"
  | "booking_ref_no"
  | "created_at"
  | "total_amount"
  | "currency"
  | "flight_booking"
  | "hotel_booking"
  | "car_booking"
  | "guest_data"
>;

function firstSliceFromItinerary(snapshot: unknown): {
  origin: string;
  destination: string;
  departLabel: string | null;
} | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const slices = (snapshot as { slices?: unknown }).slices;
  if (!Array.isArray(slices) || slices.length === 0) return null;
  const sl = slices[0];
  if (!sl || typeof sl !== "object") return null;
  let origin =
    typeof (sl as { origin_iata?: string }).origin_iata === "string"
      ? (sl as { origin_iata: string }).origin_iata
      : "";
  let dest =
    typeof (sl as { destination_iata?: string }).destination_iata === "string"
      ? (sl as { destination_iata: string }).destination_iata
      : "";
  let departLabel: string | null = null;
  const segs = (sl as { segments?: unknown }).segments;
  if (Array.isArray(segs) && segs[0] && typeof segs[0] === "object") {
    const d = (segs[0] as { departing_at?: string }).departing_at;
    if (typeof d === "string" && d.length >= 10) {
      departLabel = d.slice(0, 10);
    }
  }
  if ((!origin || !dest) && Array.isArray(segs) && segs.length > 0) {
    const first = segs[0] as {
      origin_iata?: string;
      origin?: { iata_code?: string };
    };
    const last = segs[segs.length - 1] as {
      destination_iata?: string;
      destination?: { iata_code?: string };
    };
    origin =
      origin ||
      (typeof first.origin_iata === "string" ? first.origin_iata : first.origin?.iata_code) ||
      "";
    dest =
      dest ||
      (typeof last.destination_iata === "string"
        ? last.destination_iata
        : last.destination?.iata_code) ||
      "";
  }
  if (!origin && !dest) return null;
  return { origin, destination: dest, departLabel };
}

function accommodationName(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const name = (snapshot as { name?: string }).name;
  if (typeof name === "string" && name.trim()) return name.trim();
  const loc = (snapshot as { location?: { name?: string } }).location;
  if (loc && typeof loc.name === "string" && loc.name.trim()) return loc.name.trim();
  return null;
}

/** Product line label for badges. */
export function bookingTypeLabel(type: string): string {
  const t = type.toLowerCase();
  if (t === "flight") return "Flight";
  if (t === "hotel") return "Hotel";
  if (t === "car") return "Car";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function bookingSummaryTitle(row: BookingLike): string {
  if (row.flight_booking) {
    const snap = row.flight_booking.itinerary_snapshot;
    const route = firstSliceFromItinerary(snap);
    if (route?.origin && route.destination) {
      return `${route.origin} → ${route.destination}`;
    }
    if (row.flight_booking.booking_reference) {
      return `Flight · PNR ${row.flight_booking.booking_reference}`;
    }
    return "Flight booking";
  }
  if (row.hotel_booking) {
    const name = accommodationName(row.hotel_booking.accommodation_snapshot);
    if (name) return name;
    if (row.hotel_booking.booking_reference) {
      return `Hotel · ${row.hotel_booking.booking_reference}`;
    }
    return "Hotel stay";
  }
  if (row.car_booking) {
    const p = row.car_booking.payload;
    if (p && typeof p === "object" && "vehicle_name" in p && typeof (p as { vehicle_name: unknown }).vehicle_name === "string") {
      return (p as { vehicle_name: string }).vehicle_name;
    }
    return "Car rental";
  }
  return `${bookingTypeLabel(row.type)} booking`;
}

/** Human route/title for profile booking detail breadcrumb (e.g. `JFK to LHR`). */
export function bookingBreadcrumbTitle(row: BookingLike): string {
  if (row.flight_booking) {
    const fb = row.flight_booking;
    const route = firstSliceFromItinerary(fb.itinerary_snapshot);
    if (route?.origin && route.destination) {
      return `${route.origin} to ${route.destination}`;
    }
    if ("order_raw" in fb && fb.order_raw) {
      try {
        const duffel = parseDuffelOrderDisplay(fb.order_raw, row.total_amount, row.currency);
        const seg = duffel?.slices[0]?.segments[0];
        if (seg?.originIata && seg?.destinationIata) {
          return `${seg.originIata} to ${seg.destinationIata}`;
        }
      } catch {
        /* fall through */
      }
    }
  }
  const summary = bookingSummaryTitle(row);
  return summary.includes(" → ") ? summary.replace(" → ", " to ") : summary;
}

export function bookingSummarySubtitle(row: BookingLike): string | null {
  if (row.flight_booking) {
    const snap = row.flight_booking.itinerary_snapshot;
    const route = firstSliceFromItinerary(snap);
    if (route?.departLabel) return `Departure ${route.departLabel}`;
    return row.flight_booking.booking_reference
      ? `PNR ${row.flight_booking.booking_reference}`
      : null;
  }
  if (row.hotel_booking) {
    return row.hotel_booking.booking_reference ? `Ref ${row.hotel_booking.booking_reference}` : null;
  }
  return null;
}

export function bookingSummaryDateIso(row: BookingLike): string {
  const c = row.created_at as unknown;
  if (typeof c === "string") return c;
  if (c instanceof Date) return c.toISOString();
  return "";
}
