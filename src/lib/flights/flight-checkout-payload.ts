import type { FlightCheckoutBookingBody, FlightCheckoutValidateBody } from "@/lib/validations/flight-checkout.schema";
import {
  normalizeFlightCheckoutContact,
  sanitizePassengerIdentityDocuments,
} from "@/lib/validations/flight-checkout.schema";
import type { CheckoutContactState, PassengerFormRow } from "@/components/flights/checkout/checkout-types";

function mapPassengerRow(p: PassengerFormRow): FlightCheckoutBookingBody["passengers"][number] {
  const base = {
    passenger_id: p.passenger_id,
    title: p.title,
    given_name: p.given_name.trim(),
    family_name: p.family_name.trim(),
    born_on: p.born_on,
    gender: p.gender,
    ...(p.accompanying_adult_id?.trim()
      ? { accompanying_adult_id: p.accompanying_adult_id.trim() }
      : {}),
  };

  const passport = p.identity_documents[0];
  const hasPassport =
    passport &&
    passport.unique_identifier.trim() &&
    /^[A-Z]{2}$/.test(passport.issuing_country_code) &&
    /^\d{4}-\d{2}-\d{2}$/.test(passport.expires_on);

  if (!hasPassport) return base;

  return {
    ...base,
    identity_documents: [
      {
        type: passport.type,
        unique_identifier: passport.unique_identifier.trim(),
        issuing_country_code: passport.issuing_country_code,
        expires_on: passport.expires_on,
      },
    ],
  };
}

export function buildFlightCheckoutContact(contact: CheckoutContactState) {
  return normalizeFlightCheckoutContact({
    email: contact.email,
    phone_number: contact.phone_number,
  });
}

/** Passenger rows only — contact is collective (Duffel dashboard pattern). */
export function buildFlightCheckoutPassengerPayload(
  passengers: PassengerFormRow[],
): FlightCheckoutBookingBody["passengers"] {
  return passengers.map((p) => sanitizePassengerIdentityDocuments(mapPassengerRow(p)));
}

export function buildFlightCheckoutValidateBody(input: {
  offer_id: string;
  contact: CheckoutContactState;
  passengers: PassengerFormRow[];
  services?: FlightCheckoutValidateBody["services"];
  search_session_id?: string | null;
}): FlightCheckoutValidateBody {
  return {
    offer_id: input.offer_id,
    contact: buildFlightCheckoutContact(input.contact),
    passengers: input.passengers.map((p) => mapPassengerRow(p)),
    services: input.services ?? [],
    ...(input.search_session_id?.trim() ? { search_session_id: input.search_session_id.trim() } : {}),
  };
}
