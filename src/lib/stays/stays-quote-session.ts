import type { StaysCancellationStep, StaysQuoteDto } from "@/lib/api/stays-dto";
import { readStaysSearchFormSnapshot } from "@/lib/hotels/stays-search-snapshot";

/** sessionStorage key for Duffel quote + rate used across hotel detail → checkout. */
export const STAYS_QUOTE_SESSION_KEY = "ttu_stays_quote";

/** Refresh if quote expires within this window (Duffel rates are short-lived). */
export const STAYS_QUOTE_STALE_BUFFER_MS = 90_000;

export type StaysQuoteSession = {
  quote_id: string;
  rate_id: string;
  total_amount?: string;
  currency?: string;
  check_in?: string;
  check_out?: string;
  expires_at?: string | null;
  search_result_id?: string;
  adults?: number;
  children?: number;
  rooms?: number;
  hotel_name?: string;
  hotel_address?: string;
  room_name?: string;
  board_type?: string | null;
  payment_type?: string | null;
  cancellation_timeline?: StaysCancellationStep[];
  supported_loyalty_programme?: string | null;
  due_at_accommodation_amount?: string | null;
  due_at_accommodation_currency?: string | null;
};

export type StaysQuoteSessionContext = Partial<
  Omit<StaysQuoteSession, "quote_id" | "rate_id" | "expires_at">
>;

export function isStaysQuoteExpired(
  expiresAt: string | null | undefined,
  bufferMs: number = STAYS_QUOTE_STALE_BUFFER_MS,
): boolean {
  if (!expiresAt) return false;
  const exp = new Date(expiresAt).getTime();
  if (Number.isNaN(exp)) return false;
  return exp <= Date.now() + bufferMs;
}

export function readStaysQuoteSession(): StaysQuoteSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STAYS_QUOTE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StaysQuoteSession;
    if (!parsed?.quote_id || !parsed?.rate_id) return null;
    return parsed;
  } catch {
    return null;
  }
}

function occupancyFromSearch(): Pick<StaysQuoteSession, "adults" | "children" | "rooms"> {
  const snap = readStaysSearchFormSnapshot();
  return {
    adults: snap?.adults ?? 1,
    children: snap?.children ?? 0,
    rooms: snap?.rooms ?? 1,
  };
}

export function writeStaysQuoteSession(input: {
  quote: StaysQuoteDto;
  checkIn?: string;
  checkOut?: string;
  searchResultId?: string;
  context?: StaysQuoteSessionContext;
  /** When refreshing quote, merge with prior session so room/occupancy metadata is kept. */
  mergePrior?: boolean;
}): StaysQuoteSession {
  const prior = input.mergePrior !== false ? readStaysQuoteSession() : null;
  const occ = occupancyFromSearch();
  const session: StaysQuoteSession = {
    quote_id: input.quote.quote_id,
    rate_id: input.quote.rate_id ?? prior?.rate_id ?? "",
    total_amount: input.quote.total_amount ?? undefined,
    currency: input.quote.total_currency ?? undefined,
    check_in: input.checkIn ?? prior?.check_in,
    check_out: input.checkOut ?? prior?.check_out,
    expires_at: input.quote.expires_at,
    search_result_id: input.searchResultId ?? prior?.search_result_id,
    due_at_accommodation_amount:
      input.quote.due_at_accommodation_amount ?? prior?.due_at_accommodation_amount ?? null,
    due_at_accommodation_currency:
      input.quote.due_at_accommodation_currency ?? prior?.due_at_accommodation_currency ?? null,
    adults: input.context?.adults ?? prior?.adults ?? occ.adults,
    children: input.context?.children ?? prior?.children ?? occ.children,
    rooms: input.context?.rooms ?? prior?.rooms ?? occ.rooms,
    hotel_name: input.context?.hotel_name ?? prior?.hotel_name,
    hotel_address: input.context?.hotel_address ?? prior?.hotel_address,
    room_name: input.context?.room_name ?? prior?.room_name,
    board_type: input.context?.board_type ?? prior?.board_type ?? null,
    payment_type: input.context?.payment_type ?? prior?.payment_type ?? null,
    cancellation_timeline:
      input.context?.cancellation_timeline ?? prior?.cancellation_timeline,
    supported_loyalty_programme:
      input.context?.supported_loyalty_programme ?? prior?.supported_loyalty_programme ?? null,
  };
  if (typeof window !== "undefined" && session.rate_id) {
    sessionStorage.setItem(STAYS_QUOTE_SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

export function quoteToSidebar(session: StaysQuoteSession): {
  quoteId: string;
  rateId: string;
  totalAmount: string;
  currency: string;
  checkIn: string;
  checkOut: string;
  expiresAt: string | null;
} {
  return {
    quoteId: session.quote_id,
    rateId: session.rate_id,
    totalAmount: session.total_amount ?? "",
    currency: session.currency ?? "USD",
    checkIn: session.check_in ?? "",
    checkOut: session.check_out ?? "",
    expiresAt: session.expires_at ?? null,
  };
}

export function formatQuoteExpiryCountdown(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  const exp = new Date(expiresAt).getTime();
  if (Number.isNaN(exp)) return null;
  const sec = Math.max(0, Math.floor((exp - Date.now()) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function isDuffelRateUnavailableMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("rate unavailable") ||
    m.includes("rate_unavailable") ||
    m.includes("no longer available") ||
    m.includes("has expired")
  );
}
