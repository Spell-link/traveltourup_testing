import {
  guestSlotsFromSession,
  requiredGuestCount,
  type StaysCheckoutGuestSlotKind,
} from "@/lib/stays/stays-checkout-occupancy";
import type { StaysQuoteSession } from "@/lib/stays/stays-quote-session";
import { staysCheckoutGuestSchema } from "@/lib/validations/stays.schema";

export type StaysGuestIssue = { path: string; message: string };

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function ageYearsAt(bornOn: string, atYmd: string): number {
  const b = new Date(`${bornOn}T12:00:00.000Z`);
  const a = new Date(`${atYmd}T12:00:00.000Z`);
  let age = a.getUTCFullYear() - b.getUTCFullYear();
  const m = a.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && a.getUTCDate() < b.getUTCDate())) age -= 1;
  return age;
}

function trimName(value: string): string {
  return value.trim();
}

function validateGuestRow(
  guest: { given_name?: string; family_name?: string; born_on?: string },
  index: number,
  kind: StaysCheckoutGuestSlotKind,
  issues: StaysGuestIssue[],
  atYmd: string,
): { given_name: string; family_name: string; born_on?: string } | null {
  const given = trimName(guest.given_name ?? "");
  const family = trimName(guest.family_name ?? "");
  const born = (guest.born_on ?? "").trim();

  if (!given) {
    issues.push({ path: `guests.${index}.given_name`, message: "Given name is required" });
  }
  if (!family) {
    issues.push({ path: `guests.${index}.family_name`, message: "Family name is required" });
  }

  const needsDob = kind === "lead_adult" || kind === "child";
  if (needsDob) {
    if (!born || !isoDate.test(born)) {
      issues.push({ path: `guests.${index}.born_on`, message: "Date of birth is required (YYYY-MM-DD)" });
    } else {
      const d = new Date(`${born}T12:00:00.000Z`);
      if (d.getTime() > Date.now()) {
        issues.push({ path: `guests.${index}.born_on`, message: "Date of birth cannot be in the future" });
      } else if (kind === "lead_adult" && ageYearsAt(born, atYmd) < 18) {
        issues.push({
          path: `guests.${index}.born_on`,
          message: "Lead guest must be at least 18 years old",
        });
      } else if (kind === "child" && ageYearsAt(born, atYmd) >= 18) {
        issues.push({ path: `guests.${index}.born_on`, message: "Child guest must be under 18 years old" });
      }
    }
  } else if (born && isoDate.test(born)) {
    const d = new Date(`${born}T12:00:00.000Z`);
    if (d.getTime() > Date.now()) {
      issues.push({ path: `guests.${index}.born_on`, message: "Date of birth cannot be in the future" });
    }
  }

  if (!given || !family) return null;
  if (needsDob && (!born || !isoDate.test(born))) return null;

  return {
    given_name: given,
    family_name: family,
    ...(born && isoDate.test(born) ? { born_on: born } : {}),
  };
}

export function collectStaysCheckoutGuestIssues(
  input: unknown,
  quoteSession?: StaysQuoteSession | null,
): StaysGuestIssue[] {
  const raw = input as Record<string, unknown>;
  const expected = requiredGuestCount({
    adults: quoteSession?.adults,
    children: quoteSession?.children,
    rooms: quoteSession?.rooms,
  });
  const slots = guestSlotsFromSession(quoteSession ?? null);
  const issues: StaysGuestIssue[] = [];
  const atYmd = new Date().toISOString().slice(0, 10);

  const guestsRaw = Array.isArray(raw.guests) ? raw.guests : [];
  if (guestsRaw.length !== expected) {
    issues.push({
      path: "guests",
      message: `Enter details for all ${expected} guests`,
    });
  }

  const normalizedGuests: { given_name: string; family_name: string; born_on: string }[] = [];
  for (let i = 0; i < expected; i++) {
    const kind = slots[i]?.kind ?? (i === 0 ? "lead_adult" : "adult");
    const row = validateGuestRow(
      (guestsRaw[i] as Record<string, unknown>) ?? {},
      i,
      kind,
      issues,
      atYmd,
    );
    if (row) {
      normalizedGuests.push({
        given_name: row.given_name,
        family_name: row.family_name,
        born_on: row.born_on ?? (kind === "lead_adult" ? "1990-01-01" : ""),
      });
    }
  }

  if (issues.length > 0) return issues;

  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const phone = typeof raw.phone_number === "string" ? raw.phone_number.trim() : "";
  const special =
    typeof raw.accommodation_special_requests === "string"
      ? raw.accommodation_special_requests
      : undefined;
  const loyalty =
    typeof raw.loyalty_programme_account_number === "string"
      ? raw.loyalty_programme_account_number.trim()
      : undefined;

  const strict = staysCheckoutGuestSchema.safeParse({
    email,
    phone_number: phone,
    guests: normalizedGuests.map((g, i) => {
      const kind = slots[i]?.kind ?? "adult";
      const base = { given_name: g.given_name, family_name: g.family_name };
      if (kind === "lead_adult" || kind === "child" || g.born_on) {
        return { ...base, born_on: g.born_on };
      }
      return base;
    }),
    accommodation_special_requests: special || undefined,
    loyalty_programme_account_number: loyalty || undefined,
  });

  if (!strict.success) {
    return strict.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
  }

  return [];
}

/** Normalize guest payload for API (omit empty born_on on additional adults). */
export function normalizeStaysCheckoutGuestPayload(
  input: {
    email: string;
    phone_number: string;
    guests: Array<{ given_name: string; family_name: string; born_on?: string }>;
    accommodation_special_requests?: string;
    loyalty_programme_account_number?: string;
  },
  quoteSession: StaysQuoteSession | null,
): {
  email: string;
  phone_number: string;
  guests: Array<{ given_name: string; family_name: string; born_on?: string }>;
  accommodation_special_requests?: string;
  loyalty_programme_account_number?: string;
} {
  const slots = guestSlotsFromSession(quoteSession);
  return {
    email: input.email.trim(),
    phone_number: input.phone_number.trim(),
    guests: input.guests.map((g, i) => {
      const kind = slots[i]?.kind ?? "adult";
      const base = {
        given_name: g.given_name.trim(),
        family_name: g.family_name.trim(),
      };
      const born = (g.born_on ?? "").trim();
      if (kind === "adult" && !born) return base;
      if (born) return { ...base, born_on: born };
      if (kind === "lead_adult") return { ...base, born_on: "1990-01-01" };
      return base;
    }),
    accommodation_special_requests: input.accommodation_special_requests?.trim() || undefined,
    loyalty_programme_account_number: input.loyalty_programme_account_number?.trim() || undefined,
  };
}
