import "server-only";

import type { JourneyTripSnapshot } from "@/lib/journey/journey-trip-snapshot";

type SearchSessionParams = {
  slices?: Array<{ origin?: string; destination?: string; departure_date?: string }>;
  passengers?: Array<{ type?: string }>;
  cabin_class?: string;
  trip?: string;
};

/** Extract trip fields from persisted flight search session params_json. */
export function tripSnapshotPatchFromFlightSearchSession(
  paramsJson: unknown,
): Partial<JourneyTripSnapshot> | null {
  if (!paramsJson || typeof paramsJson !== "object") return null;
  const p = paramsJson as SearchSessionParams;
  const patch: Partial<JourneyTripSnapshot> = {};

  const slice0 = p.slices?.[0];
  const slice1 = p.slices?.[1];
  if (slice0?.origin) {
    patch.origin_code = slice0.origin;
    patch.origin_label = slice0.origin;
  }
  if (slice0?.destination) {
    patch.destination_code = slice0.destination;
    patch.destination_label = slice0.destination;
  }
  if (slice0?.departure_date) patch.start_date = slice0.departure_date;
  if (slice1?.departure_date) patch.end_date = slice1.departure_date;

  if (p.trip === "round_trip") patch.trip_type = "round_trip";
  else if (p.trip === "multi_city" || (p.slices?.length ?? 0) >= 3) patch.trip_type = "multi_city";
  else if (p.slices?.length === 1) patch.trip_type = "one_way";

  if (p.cabin_class) patch.cabin_class = p.cabin_class;

  let adults = 0;
  let children = 0;
  let infants = 0;
  for (const pass of p.passengers ?? []) {
    const t = (pass.type ?? "adult").toLowerCase();
    if (t.includes("infant")) infants += 1;
    else if (t.includes("child")) children += 1;
    else adults += 1;
  }
  if (adults + children + infants > 0) {
    patch.adults = Math.max(adults, 1);
    patch.children = children;
    patch.infants = infants;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}
