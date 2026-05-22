import type { FlightOrderChangeOffer } from "@/lib/http/flights.client";
import type { StoredFlightAncillaries } from "@/lib/flights/flight-detail-session";

export type FlightChangeAncillaries = StoredFlightAncillaries;

export type FlightChangeSession = {
  selectedSliceId: string;
  origin: string;
  destination: string;
  departureDate: string;
  cabinClass: string;
  changeId?: string;
  offers?: FlightOrderChangeOffer[];
  selectedOfferId?: string;
  quoteExpiresAt?: string | null;
  bookingRefNo?: string;
  searchSummary?: {
    route: string;
    dateLabel: string;
    passengerCount: number;
  };
  selectedSliceIndex?: number;
  paymentIntentId?: string;
  clientToken?: string;
  customerCharge?: { amount: string; currency: string };
  beforeChangeAmount?: string;
  beforeChangeCurrency?: string;
  ancillaries?: FlightChangeAncillaries;
};

function storageKey(bookingId: string): string {
  return `ttu_flight_change_${bookingId}`;
}

export function readFlightChangeSession(bookingId: string): FlightChangeSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(bookingId));
    if (!raw) return null;
    return JSON.parse(raw) as FlightChangeSession;
  } catch {
    return null;
  }
}

export function writeFlightChangeSession(bookingId: string, data: FlightChangeSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(storageKey(bookingId), JSON.stringify(data));
}

export function patchFlightChangeSession(
  bookingId: string,
  patch: Partial<FlightChangeSession>,
): FlightChangeSession | null {
  const prev = readFlightChangeSession(bookingId);
  if (!prev) return null;
  const next = { ...prev, ...patch };
  writeFlightChangeSession(bookingId, next);
  return next;
}

export function clearFlightChangeSession(bookingId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(storageKey(bookingId));
}

/** Sort offers by change cost ascending (Duffel default). */
export function sortChangeOffersByCost(offers: FlightOrderChangeOffer[]): FlightOrderChangeOffer[] {
  return [...offers].sort((a, b) => {
    const da = Number.parseFloat(a.change_total_amount ?? "0");
    const db = Number.parseFloat(b.change_total_amount ?? "0");
    const na = Number.isFinite(da) ? da : 0;
    const nb = Number.isFinite(db) ? db : 0;
    return na - nb;
  });
}

export function parseChangeDelta(offer: FlightOrderChangeOffer): number {
  const n = Number.parseFloat(offer.change_total_amount ?? "0");
  return Number.isFinite(n) ? n : 0;
}
