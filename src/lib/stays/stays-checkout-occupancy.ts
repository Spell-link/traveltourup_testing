import type { StaysQuoteSession } from "@/lib/stays/stays-quote-session";

/** Default child age used in search when per-child ages are not collected (see HotelsTab). */
export const STAYS_SEARCH_DEFAULT_CHILD_AGE = 8;

export type StaysCheckoutGuestSlotKind = "lead_adult" | "adult" | "child";

export type StaysCheckoutGuestSlot = {
  index: number;
  kind: StaysCheckoutGuestSlotKind;
};

export function requiredGuestCount(input: {
  adults?: number;
  children?: number;
  rooms?: number;
}): number {
  const adults = Math.max(1, input.adults ?? 1);
  const children = Math.max(0, input.children ?? 0);
  const rooms = Math.max(1, input.rooms ?? 1);
  return Math.max(adults + children, rooms, 1);
}

export function guestSlotsFromSession(session: StaysQuoteSession | null): StaysCheckoutGuestSlot[] {
  const adults = Math.max(1, session?.adults ?? 1);
  const children = Math.max(0, session?.children ?? 0);
  const count = requiredGuestCount({
    adults: session?.adults,
    children: session?.children,
    rooms: session?.rooms,
  });
  const slots: StaysCheckoutGuestSlot[] = [];
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      slots.push({ index: i, kind: "lead_adult" });
    } else if (i < adults) {
      slots.push({ index: i, kind: "adult" });
    } else if (i < adults + children) {
      slots.push({ index: i, kind: "child" });
    } else {
      slots.push({ index: i, kind: "adult" });
    }
  }
  return slots;
}

/** Suggested DOB for a child slot (search default age). */
export function defaultChildBornOn(atDate: string = new Date().toISOString().slice(0, 10)): string {
  const d = new Date(`${atDate}T12:00:00.000Z`);
  d.setUTCFullYear(d.getUTCFullYear() - STAYS_SEARCH_DEFAULT_CHILD_AGE);
  return d.toISOString().slice(0, 10);
}

export type StaysCheckoutGuestFormRow = {
  given_name: string;
  family_name: string;
  born_on: string;
};

export function emptyGuestRows(count: number, session: StaysQuoteSession | null): StaysCheckoutGuestFormRow[] {
  const slots = guestSlotsFromSession(session);
  return Array.from({ length: count }, (_, i) => {
    const kind = slots[i]?.kind ?? (i === 0 ? "lead_adult" : "adult");
    return {
      given_name: "",
      family_name: "",
      born_on: kind === "child" ? defaultChildBornOn() : i === 0 ? "1990-01-01" : "",
    };
  });
}
