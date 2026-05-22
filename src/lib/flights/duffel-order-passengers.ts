import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import { formatDuffelPhone } from "@/lib/validations/phone.schema";
import type { FlightCheckoutBookingBody, FlightCheckoutContactInput } from "@/lib/validations/flight-checkout.schema";
import {
  buildAdultToInfantDuffelLink,
  isAdultPassengerType,
  resolveInfantToAccompanyingAdultMap,
} from "@/lib/flights/infant-passenger-linking";

export type LeadContact = {
  email: string;
  phone_number: string;
};

/**
 * Resolve booking contact from explicit collective contact or legacy passenger rows.
 */
export function resolveLeadContact(
  passengers: FlightCheckoutBookingBody["passengers"],
  offer?: FlightOfferDTO | null,
  explicitContact?: FlightCheckoutContactInput | null,
): LeadContact | null {
  if (explicitContact) {
    const email = explicitContact.email.trim();
    const phone = formatDuffelPhone(explicitContact.phone_number);
    if (email && phone) return { email, phone_number: phone };
    return null;
  }

  if (passengers.length === 0) return null;

  const offerPaxById = new Map((offer?.passengers ?? []).map((p) => [p.id, p]));

  const withContact = passengers.filter((p) => {
    const row = p as { email?: string; phone_number?: string };
    const email = row.email?.trim() ?? "";
    const phone = formatDuffelPhone(row.phone_number ?? "");
    return email.length > 0 && phone != null;
  });

  if (withContact.length === 0) return null;

  const pick =
    withContact.find((p) => isAdultPassengerType(offerPaxById.get(p.passenger_id)?.type)) ??
    withContact[0];

  const row = pick as { email?: string; phone_number?: string };
  const email = row.email?.trim() ?? "";
  const phone = formatDuffelPhone(row.phone_number ?? "");
  if (!email || !phone) return null;

  return { email, phone_number: phone };
}

/** Map checkout passengers to Duffel `POST /air/orders` passenger objects. */
export function toDuffelOrderPassengers(
  passengers: FlightCheckoutBookingBody["passengers"],
  offer?: FlightOfferDTO | null,
  explicitContact?: FlightCheckoutContactInput | null,
): Record<string, unknown>[] {
  const lead = resolveLeadContact(passengers, offer, explicitContact);

  const infantToAdult =
    offer != null
      ? resolveInfantToAccompanyingAdultMap(
          offer,
          passengers.map((p) => ({
            passenger_id: p.passenger_id,
            accompanying_adult_id: p.accompanying_adult_id,
          })),
        )
      : new Map<string, string>();

  const adultToInfant = buildAdultToInfantDuffelLink(infantToAdult);

  return passengers.map((p) => {
    const row: Record<string, unknown> = {
      id: p.passenger_id,
      title: p.title,
      given_name: p.given_name,
      family_name: p.family_name,
      born_on: p.born_on,
      gender: p.gender,
    };

    if (lead) {
      row.email = lead.email;
      row.phone_number = lead.phone_number;
    } else {
      const legacy = p as { email?: string; phone_number?: string };
      if (legacy.email?.trim()) row.email = legacy.email.trim();
      const phone = formatDuffelPhone(legacy.phone_number ?? "");
      if (phone) row.phone_number = phone;
    }

    const linkedInfantId = adultToInfant.get(p.passenger_id);
    if (linkedInfantId) {
      row.infant_passenger_id = linkedInfantId;
    }

    if (p.identity_documents?.length) {
      row.identity_documents = p.identity_documents.map((doc) => ({
        type: doc.type,
        unique_identifier: doc.unique_identifier,
        issuing_country_code: doc.issuing_country_code,
        expires_on: doc.expires_on,
      }));
    }

    return row;
  });
}
