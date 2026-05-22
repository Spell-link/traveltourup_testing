import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import { ValidationError } from "@/lib/api/errors";
import type {
  FlightCheckoutBookingBody,
  FlightCheckoutContactInput,
  FlightCheckoutValidatePassenger,
} from "@/lib/validations/flight-checkout.schema";
import {
  getOfferAdultPassengerIds,
  getOfferPassengerType,
  isAdultPassengerType,
  isInfantPassengerType,
  isOfferAdultPassengerId,
  resolveInfantToAccompanyingAdultMap,
} from "@/lib/flights/infant-passenger-linking";
import {
  getExpectedChildAgesFromSearch,
  validatePassengerAgesForOffer,
  type SearchPassengerAgeContext,
} from "@/lib/flights/passenger-age-rules";
import { formatDuffelPhone } from "@/lib/validations/phone.schema";

export type FlightPassengerIssueCode =
  | "given_name_required"
  | "family_name_required"
  | "born_on_format"
  | "born_on_after_itinerary_max"
  | "lead_email_invalid"
  | "lead_phone_required"
  | "lead_phone_e164"
  | "infant_adult_required"
  | "infant_adult_invalid"
  | "infant_adult_duplicate"
  | "passport_required"
  | "passport_number_required"
  | "passport_country_required"
  | "passport_expires_on_format"
  | "passport_expires_before_travel_end"
  | "child_age_mismatch_return"
  | "infant_age_invalid"
  | "adult_age_invalid";

export type FlightPassengerIssue = {
  path: (string | number)[];
  code: FlightPassengerIssueCode;
  /** ISO date YYYY-MM-DD when relevant */
  values?: {
    maxBornOn?: string;
    minExpiresOn?: string;
    expectedAge?: number;
    actualAge?: number;
  };
};

function addCalendarDaysUtc(ymd: string, deltaDays: number): string {
  const parts = ymd.split("-").map((x) => Number.parseInt(x, 10));
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

/** Earliest segment departure calendar day (UTC) on the offer. */
export function getEarliestFlightDepartureYmd(offer: FlightOfferDTO): string | null {
  let min: string | null = null;
  for (const s of offer.slices) {
    for (const seg of s.segments) {
      if (!seg.departing_at) continue;
      const ymd = seg.departing_at.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) continue;
      if (min === null || ymd < min) min = ymd;
    }
  }
  return min;
}

/** Latest segment arrival calendar day (UTC) on the offer. */
export function getLatestFlightArrivalYmd(offer: FlightOfferDTO): string | null {
  let max: string | null = null;
  for (const s of offer.slices) {
    for (const seg of s.segments) {
      if (!seg.arriving_at) continue;
      const ymd = seg.arriving_at.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) continue;
      if (max === null || ymd > max) max = ymd;
    }
  }
  return max;
}

/**
 * Latest allowed `born_on` for Duffel / airline age rules (inclusive).
 * Matches typical Duffel message: date of birth must be on or before (first departure − 1 day).
 */
export function getMaxPassengerBornOnYmdForOffer(offer: FlightOfferDTO): string | null {
  const earliest = getEarliestFlightDepartureYmd(offer);
  if (!earliest) return null;
  return addCalendarDaysUtc(earliest, -1);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Index of lead passenger row for contact validation (first adult in offer order, else 0). */
export function getLeadPassengerIndex(offer: FlightOfferDTO): number {
  const idx = offer.passengers.findIndex((p) => p.type?.toLowerCase() === "adult");
  return idx >= 0 ? idx : 0;
}

function issueToApiMessage(issue: FlightPassengerIssue): string {
  switch (issue.code) {
    case "given_name_required":
      return "Given name is required.";
    case "family_name_required":
      return "Family name is required.";
    case "born_on_format":
      return "Date of birth must be a valid YYYY-MM-DD.";
    case "born_on_after_itinerary_max":
      return `Date of birth must be on or before ${issue.values?.maxBornOn ?? "the last allowable day"} for this itinerary.`;
    case "lead_email_invalid":
      return "A valid email is required for booking contact.";
    case "lead_phone_required":
      return "Phone number is required for booking contact (carrier / Duffel rules).";
    case "lead_phone_e164":
      return "Enter a valid mobile or landline number with country code (e.g. +442080160509).";
    case "infant_adult_required":
      return "Each infant must travel with an accompanying adult.";
    case "infant_adult_invalid":
      return "Select a valid accompanying adult for this infant.";
    case "infant_adult_duplicate":
      return "Each adult can accompany only one lap infant. Choose a different adult.";
    case "passport_required":
      return "Passport details are required for this itinerary.";
    case "passport_number_required":
      return "Passport number is required.";
    case "passport_country_required":
      return "Passport issuing country is required.";
    case "passport_expires_on_format":
      return "Passport expiry must be a valid YYYY-MM-DD.";
    case "passport_expires_before_travel_end":
      return `Passport must be valid after ${issue.values?.minExpiresOn ?? "the end of your trip"}.`;
    case "child_age_mismatch_return":
      return `Passenger must be ${issue.values?.expectedAge ?? "the expected"} years old on the return flight date (search criteria).`;
    case "infant_age_invalid":
      return "Infant must be under 2 years old on the first departure date.";
    case "adult_age_invalid":
      return "Adult must be at least 18 years old on the first departure date.";
    default: {
      const _ex: never = issue.code;
      return String(_ex);
    }
  }
}

function validatePassportIssues(
  offer: FlightOfferDTO,
  passengers: Array<Pick<FlightCheckoutValidatePassenger, "identity_documents">>,
): FlightPassengerIssue[] {
  if (!offer.passenger_identity_documents_required) return [];

  const issues: FlightPassengerIssue[] = [];
  const travelEndYmd = getLatestFlightArrivalYmd(offer);
  const supported = new Set(
    (offer.supported_passenger_identity_document_types ?? []).map((t) => t.toLowerCase()),
  );
  const docType = supported.has("passport") ? "passport" : "passport";

  passengers.forEach((p, i) => {
    const docs = p.identity_documents ?? [];
    const passport = docs.find((d) => d.type === docType) ?? docs[0];

    if (!passport) {
      issues.push({ path: ["passengers", i, "identity_documents"], code: "passport_required" });
      return;
    }

    if (!passport.unique_identifier?.trim()) {
      issues.push({
        path: ["passengers", i, "identity_documents", 0, "unique_identifier"],
        code: "passport_number_required",
      });
    }

    if (!/^[A-Z]{2}$/.test(passport.issuing_country_code ?? "")) {
      issues.push({
        path: ["passengers", i, "identity_documents", 0, "issuing_country_code"],
        code: "passport_country_required",
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(passport.expires_on ?? "")) {
      issues.push({
        path: ["passengers", i, "identity_documents", 0, "expires_on"],
        code: "passport_expires_on_format",
      });
    } else if (travelEndYmd && passport.expires_on <= travelEndYmd) {
      issues.push({
        path: ["passengers", i, "identity_documents", 0, "expires_on"],
        code: "passport_expires_before_travel_end",
        values: { minExpiresOn: travelEndYmd },
      });
    }
  });

  return issues;
}

export type FlightPassengerValidationContext = {
  searchPassengers?: SearchPassengerAgeContext[] | null;
  contact?: FlightCheckoutContactInput;
};

/**
 * Collect passenger / contact issues for an offer + payload (same shape as API body).
 */
export function collectFlightPassengerBookingIssues(
  offer: FlightOfferDTO,
  passengers: FlightCheckoutValidatePassenger[],
  context?: FlightPassengerValidationContext,
): FlightPassengerIssue[] {
  const issues: FlightPassengerIssue[] = [];
  const maxBornTravel = getMaxPassengerBornOnYmdForOffer(offer);

  passengers.forEach((p, i) => {
    if (!p.given_name?.trim()) {
      issues.push({ path: ["passengers", i, "given_name"], code: "given_name_required" });
    }
    if (!p.family_name?.trim()) {
      issues.push({ path: ["passengers", i, "family_name"], code: "family_name_required" });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.born_on)) {
      issues.push({ path: ["passengers", i, "born_on"], code: "born_on_format" });
    } else if (maxBornTravel && p.born_on > maxBornTravel) {
      issues.push({
        path: ["passengers", i, "born_on"],
        code: "born_on_after_itinerary_max",
        values: { maxBornOn: maxBornTravel },
      });
    }

    const offerPax = offer.passengers[i];
    const offerType = getOfferPassengerType(offer, p.passenger_id, i) ?? offerPax?.type;
    if (isInfantPassengerType(offerType)) {
      const adultId = p.accompanying_adult_id?.trim();
      if (!adultId) {
        issues.push({
          path: ["passengers", i, "accompanying_adult_id"],
          code: "infant_adult_required",
        });
      } else if (!isOfferAdultPassengerId(offer, adultId)) {
        issues.push({
          path: ["passengers", i, "accompanying_adult_id"],
          code: "infant_adult_invalid",
        });
      }
    }
  });

  const adultAssignmentCount = new Map<string, number>();
  passengers.forEach((p, i) => {
    const offerType = getOfferPassengerType(offer, p.passenger_id, i);
    if (!isInfantPassengerType(offerType)) return;
    const adultId = p.accompanying_adult_id?.trim();
    if (!adultId) return;
    adultAssignmentCount.set(adultId, (adultAssignmentCount.get(adultId) ?? 0) + 1);
  });
  passengers.forEach((p, i) => {
    const offerType = getOfferPassengerType(offer, p.passenger_id, i);
    if (!isInfantPassengerType(offerType)) return;
    const adultId = p.accompanying_adult_id?.trim();
    if (adultId && (adultAssignmentCount.get(adultId) ?? 0) > 1) {
      issues.push({
        path: ["passengers", i, "accompanying_adult_id"],
        code: "infant_adult_duplicate",
      });
    }
  });

  const infantLinks = resolveInfantToAccompanyingAdultMap(offer, passengers);
  const infantCount = offer.passengers.filter((p) => isInfantPassengerType(p.type)).length;
  if (infantCount > 0 && infantLinks.size < infantCount) {
    issues.push({
      path: ["passengers"],
      code: "infant_adult_required",
    });
  }

  const adultIds = new Set(getOfferAdultPassengerIds(offer));
  if (infantCount > adultIds.size) {
    issues.push({
      path: ["passengers"],
      code: "infant_adult_required",
    });
  }

  const contact = context?.contact;
  const email = contact?.email?.trim() ?? "";
  if (!email || !EMAIL_RE.test(email)) {
    issues.push({ path: ["contact", "email"], code: "lead_email_invalid" });
  }

  const phoneRaw = contact?.phone_number?.trim() ?? "";
  if (!phoneRaw) {
    issues.push({ path: ["contact", "phone_number"], code: "lead_phone_required" });
  } else if (!formatDuffelPhone(phoneRaw)) {
    issues.push({ path: ["contact", "phone_number"], code: "lead_phone_e164" });
  }

  issues.push(...validatePassportIssues(offer, passengers));

  const searchCtx =
    context?.searchPassengers ??
    getExpectedChildAgesFromSearch(null);
  issues.push(...validatePassengerAgesForOffer(offer, passengers, searchCtx));

  return issues;
}

export function assertFlightPassengersReadyForDuffelOrder(
  offer: FlightOfferDTO,
  passengers: FlightCheckoutBookingBody["passengers"],
  context?: FlightPassengerValidationContext,
): void {
  const issues = collectFlightPassengerBookingIssues(offer, passengers, context);
  if (issues.length === 0) return;
  throw new ValidationError(
    issues.map((iss) => ({
      path: iss.path,
      message: issueToApiMessage(iss),
      code: iss.code,
    })),
  );
}
