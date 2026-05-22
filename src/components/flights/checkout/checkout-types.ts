import type { FlightCheckoutIdentityDocument } from "@/lib/validations/flight-checkout.schema";

export type PassengerFormRow = {
  passenger_id: string;
  title: "mr" | "mrs" | "ms" | "miss" | "dr";
  given_name: string;
  family_name: string;
  born_on: string;
  gender: "m" | "f";
  email: string;
  phone_number: string;
  /** Infant rows only: accompanying adult passenger id (`pas_…`). */
  accompanying_adult_id?: string;
  identity_documents: FlightCheckoutIdentityDocument[];
};

export function emptyPassportDoc(): FlightCheckoutIdentityDocument {
  return {
    type: "passport",
    unique_identifier: "",
    issuing_country_code: "",
    expires_on: "",
  };
}

export function emptyPassengerRow(pid: string, accompanyingAdultId?: string): PassengerFormRow {
  return {
    passenger_id: pid,
    title: "mr",
    given_name: "",
    family_name: "",
    born_on: "",
    gender: "m",
    email: "",
    phone_number: "",
    ...(accompanyingAdultId ? { accompanying_adult_id: accompanyingAdultId } : {}),
    identity_documents: [emptyPassportDoc()],
  };
}

export type CheckoutContactState = {
  email: string;
  phone_number: string;
};

export function emptyContactState(initial?: Partial<CheckoutContactState>): CheckoutContactState {
  return {
    email: initial?.email ?? "",
    phone_number: initial?.phone_number ?? "",
  };
}
