import type { JourneyProductType } from "@/lib/constants/customer-journey";
import { funnelStageRank } from "@/lib/services/journey/customer-journey.core";

export type TripUnitKeyInput = {
  product_type: string;
  product_ref: string;
  title?: string | null;
  origin_label?: string | null;
  destination_label?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  trip_type?: string | null;
};

function norm(value: string | null | undefined): string {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

/** Stable identity for one customer trip intent (same property/route + dates). */
export function buildTripUnitKey(input: TripUnitKeyInput): string {
  const ref = input.product_ref.trim();
  const start = input.start_date?.trim() ?? "";
  const end = input.end_date?.trim() ?? "";

  if (input.product_type === "hotel") {
    const property = norm(input.title) || norm(input.origin_label) || norm(input.destination_label);
    if (property && start) {
      return `hotel:${property}:${start}:${end}`;
    }
  }

  if (input.product_type === "flight") {
    const origin = norm(input.origin_label);
    const dest = norm(input.destination_label);
    if ((origin || dest) && start) {
      const tripType = norm(input.trip_type);
      return `flight:${origin}:${dest}:${start}:${end}:${tripType}`;
    }
  }

  return `ref:${ref}`;
}

export type InterestLike = {
  id: string;
  funnel_stage: string;
  last_seen_at: Date;
  first_seen_at: Date;
  product_ref: string;
  converted_booking_id: string | null;
};

/** Pick the row that best represents the current state of a trip unit group. */
export function pickPrimaryInterest<T extends InterestLike>(rows: T[]): T {
  return rows.reduce((best, row) => {
    const bestRank = funnelStageRank(best.funnel_stage);
    const rowRank = funnelStageRank(row.funnel_stage);
    if (rowRank > bestRank) return row;
    if (rowRank < bestRank) return best;
    return row.last_seen_at > best.last_seen_at ? row : best;
  });
}

export function mergeInterestGroup<T extends InterestLike>(rows: T[]): T {
  if (rows.length === 1) return rows[0]!;
  const primary = pickPrimaryInterest(rows);
  const firstSeen = rows.reduce(
    (min, r) => (r.first_seen_at < min ? r.first_seen_at : min),
    rows[0]!.first_seen_at,
  );
  const converted = rows.find((r) => r.converted_booking_id)?.converted_booking_id ?? null;
  return {
    ...primary,
    first_seen_at: firstSeen,
    converted_booking_id: converted ?? primary.converted_booking_id,
  };
}

export function groupInterestsByTripUnit<
  T extends InterestLike & { user_id: string; product_type: string; trip_unit_key: string },
>(rows: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = `${row.user_id}|${row.product_type}|${row.trip_unit_key}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return [...groups.values()].map((g) => mergeInterestGroup(g));
}

export function productTypeAsJourney(value: string): JourneyProductType {
  if (value === "hotel" || value === "flight" || value === "car") return value;
  return "flight";
}
