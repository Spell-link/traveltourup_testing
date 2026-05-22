import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import type { FlightCheckoutBookingBody } from "@/lib/validations/flight-checkout.schema";
import type { FlightPassengerIssue } from "@/lib/flights/flight-passenger-booking-validation";
import type { flightSearchBodySchema } from "@/lib/validations/flights.schema";
import type { z } from "zod";

export type SearchPassengerAgeContext =
  | { type: "adult" }
  | { type: "child"; age: number }
  | { type: "infant_without_seat" };

type FlightSearchBody = z.infer<typeof flightSearchBodySchema>;

/** Extract search passenger list from persisted session params_json. */
export function getExpectedChildAgesFromSearch(
  paramsJson: unknown,
): SearchPassengerAgeContext[] | null {
  if (!paramsJson || typeof paramsJson !== "object") return null;
  const passengers = (paramsJson as FlightSearchBody).passengers;
  if (!Array.isArray(passengers) || passengers.length === 0) return null;
  return passengers.map((p) => {
    if (p.type === "child") {
      return { type: "child" as const, age: typeof p.age === "number" ? p.age : 8 };
    }
    if (p.type === "infant_without_seat") {
      return { type: "infant_without_seat" as const };
    }
    return { type: "adult" as const };
  });
}

function ageAtDateUtc(bornOnYmd: string, onYmd: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bornOnYmd) || !/^\d{4}-\d{2}-\d{2}$/.test(onYmd)) return null;
  const [by, bm, bd] = bornOnYmd.split("-").map(Number);
  const [oy, om, od] = onYmd.split("-").map(Number);
  let age = oy - by;
  if (om < bm || (om === bm && od < bd)) age -= 1;
  return age;
}

function getLastSliceDepartureYmd(offer: FlightOfferDTO): string | null {
  const lastSlice = offer.slices[offer.slices.length - 1];
  if (!lastSlice) return null;
  let min: string | null = null;
  for (const seg of lastSlice.segments) {
    if (!seg.departing_at) continue;
    const ymd = seg.departing_at.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) continue;
    if (min === null || ymd < min) min = ymd;
  }
  return min;
}

function getFirstDepartureYmd(offer: FlightOfferDTO): string | null {
  const firstSlice = offer.slices[0];
  if (!firstSlice?.segments[0]?.departing_at) return null;
  const ymd = firstSlice.segments[0].departing_at.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
}

/**
 * Validate passenger ages against offer types and search criteria.
 * Child age is checked at last-slice departure (return leg for round trips).
 */
export function validatePassengerAgesForOffer(
  offer: FlightOfferDTO,
  passengers: FlightCheckoutBookingBody["passengers"],
  searchPassengers: SearchPassengerAgeContext[] | null,
): FlightPassengerIssue[] {
  const issues: FlightPassengerIssue[] = [];
  const firstDep = getFirstDepartureYmd(offer);
  const lastSliceDep = getLastSliceDepartureYmd(offer) ?? firstDep;

  passengers.forEach((p, i) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.born_on)) return;

    const offerType = offer.passengers[i]?.type?.toLowerCase() ?? "adult";
    const searchType = searchPassengers?.[i]?.type ?? offerType;

    if (firstDep) {
      const ageFirst = ageAtDateUtc(p.born_on, firstDep);
      if (ageFirst != null) {
        if (
          (offerType === "infant" || offerType === "infant_without_seat") &&
          ageFirst >= 2
        ) {
          issues.push({ path: ["passengers", i, "born_on"], code: "infant_age_invalid" });
        }
        if (offerType === "adult" && ageFirst < 18) {
          issues.push({ path: ["passengers", i, "born_on"], code: "adult_age_invalid" });
        }
      }
    }

    if (offerType === "child" || searchType === "child") {
      const checkDate = lastSliceDep ?? firstDep;
      if (!checkDate) return;

      const searchPax = searchPassengers?.[i];
      const expectedAge = searchPax?.type === "child" ? searchPax.age : undefined;

      const actualAge = ageAtDateUtc(p.born_on, checkDate);
      if (actualAge == null) return;

      if (expectedAge != null && actualAge !== expectedAge) {
        issues.push({
          path: ["passengers", i, "born_on"],
          code: "child_age_mismatch_return",
          values: { expectedAge, actualAge },
        });
      } else if (actualAge < 2 || actualAge > 17) {
        issues.push({
          path: ["passengers", i, "born_on"],
          code: "child_age_mismatch_return",
          values: { expectedAge: expectedAge ?? 8, actualAge },
        });
      }
    }
  });

  return issues;
}
