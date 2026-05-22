import { z } from "zod";
import { AppError } from "@/lib/api/errors";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import { flightOrderServicesSchema } from "@/lib/validations/flight-ancillaries.schema";
import { formatDuffelPhone } from "@/lib/validations/phone.schema";

const duffelTitle = z.enum(["mr", "mrs", "ms", "miss", "dr"]);

export const duffelIdentityDocumentTypeSchema = z.enum([
  "passport",
  "tax_id",
  "known_traveler_number",
  "passenger_redress_number",
]);

export type DuffelIdentityDocumentType = z.infer<typeof duffelIdentityDocumentTypeSchema>;

export const flightCheckoutIdentityDocumentSchema = z.object({
  type: duffelIdentityDocumentTypeSchema,
  unique_identifier: z.string().min(1).max(64),
  issuing_country_code: z.string().regex(/^[A-Z]{2}$/),
  expires_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type FlightCheckoutIdentityDocument = z.infer<typeof flightCheckoutIdentityDocumentSchema>;

/** Duffel dashboard: one email + phone for the whole booking (not per passenger). */
export const flightCheckoutContactInputSchema = z.object({
  email: z.string().max(128),
  phone_number: z.string().max(32),
});

export type FlightCheckoutContactInput = z.infer<typeof flightCheckoutContactInputSchema>;

export function normalizeFlightCheckoutContact(
  contact: FlightCheckoutContactInput,
): FlightCheckoutContactInput {
  const email = contact.email.trim();
  const phone = formatDuffelPhone(contact.phone_number) ?? "";
  return { email, phone_number: phone };
}

/** Strict contact for confirmed bookings (POST /bookings). */
export const flightCheckoutContactSchema = z
  .object({
    email: z.string().email().max(128),
    phone_number: z.string().min(1).max(32),
  })
  .superRefine((data, ctx) => {
    if (!formatDuffelPhone(data.phone_number)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phone number must be a valid international number in E.164 format (e.g. +442080160509).",
        path: ["phone_number"],
      });
    }
  })
  .transform((data) => ({
    email: data.email.trim(),
    phone_number: formatDuffelPhone(data.phone_number)!,
  }));

export type FlightCheckoutContact = z.infer<typeof flightCheckoutContactSchema>;

export const flightCheckoutPassengerSchema = z.object({
  passenger_id: z.string().regex(/^pas_/),
  title: duffelTitle,
  given_name: z.string().min(1).max(64),
  family_name: z.string().min(1).max(64),
  born_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(["m", "f"]),
  /** Infant checkout rows: accompanying adult id (mapped to Duffel `infant_passenger_id` on the adult at order time). */
  accompanying_adult_id: z.string().regex(/^pas_/).optional(),
  identity_documents: z.array(flightCheckoutIdentityDocumentSchema).optional(),
});

/** Lenient passenger rows for pre-payment validate (business rules return issues, not HTTP 400). */
export const flightCheckoutValidatePassengerSchema = z.object({
  passenger_id: z.string().regex(/^pas_/),
  title: duffelTitle.optional().default("mr"),
  given_name: z.string().max(64).optional().default(""),
  family_name: z.string().max(64).optional().default(""),
  born_on: z.string().max(10).optional().default(""),
  gender: z.enum(["m", "f"]).optional().default("m"),
  accompanying_adult_id: z.string().regex(/^pas_/).optional(),
  identity_documents: z
    .array(
      z.object({
        type: duffelIdentityDocumentTypeSchema.optional().default("passport"),
        unique_identifier: z.string().max(64).optional().default(""),
        issuing_country_code: z.string().max(2).optional().default(""),
        expires_on: z.string().max(10).optional().default(""),
      }),
    )
    .optional(),
});

export type FlightCheckoutValidatePassenger = z.infer<typeof flightCheckoutValidatePassengerSchema>;

export const flightCheckoutBookingBodySchema = z
  .object({
    offer_id: z.string().min(1).max(128),
    contact: flightCheckoutContactSchema,
    /** Required when `order_mode` is `pay_now` (default). Omit for `hold`. */
    payment_intent_id: z.string().regex(/^pit_/).optional(),
    /** `hold` creates a Duffel hold order without PaymentIntent (behind `FLIGHT_HOLD_BACKEND`). */
    order_mode: z.enum(["pay_now", "hold"]).optional().default("pay_now"),
    passengers: z.array(flightCheckoutPassengerSchema).min(1),
    services: flightOrderServicesSchema.optional().default([]),
    /** Optional: loads child ages from search session for age validation. */
    search_session_id: z.string().min(1).max(128).optional(),
  })
  .superRefine((data, ctx) => {
    const mode = data.order_mode ?? "pay_now";
    if (mode === "pay_now" && !data.payment_intent_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "payment_intent_id is required for pay_now orders",
        path: ["payment_intent_id"],
      });
    }
    if (mode === "hold" && data.payment_intent_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "payment_intent_id must not be set for hold orders",
        path: ["payment_intent_id"],
      });
    }
  });

export type FlightCheckoutBookingBody = z.infer<typeof flightCheckoutBookingBodySchema>;

/**
 * Pre-payment passenger validation (before PaymentIntent exists).
 * Omits `payment_intent_id` / pay-now booking rules — those apply only on POST /bookings.
 */
export const flightCheckoutValidateBodySchema = z.object({
  offer_id: z.string().min(1).max(128),
  contact: flightCheckoutContactInputSchema,
  passengers: z.array(flightCheckoutValidatePassengerSchema).min(1),
  services: flightOrderServicesSchema.optional().default([]),
  search_session_id: z.string().min(1).max(128).optional(),
});

export type FlightCheckoutValidateBody = z.infer<typeof flightCheckoutValidateBodySchema>;

/** Strip incomplete passport rows so partial UI state does not fail strict Zod on booking. */
export function sanitizePassengerIdentityDocuments<
  T extends {
    identity_documents?: Array<{
      type?: string;
      unique_identifier?: string;
      issuing_country_code?: string;
      expires_on?: string;
    }>;
  },
>(passenger: T): T {
  const docs = passenger.identity_documents;
  if (!docs?.length) return passenger;

  const complete = docs.filter(
    (d) =>
      d.unique_identifier?.trim() &&
      /^[A-Z]{2}$/.test(d.issuing_country_code ?? "") &&
      /^\d{4}-\d{2}-\d{2}$/.test(d.expires_on ?? ""),
  );

  if (complete.length === 0) {
    const { identity_documents: _removed, ...rest } = passenger;
    return rest as T;
  }

  return { ...passenger, identity_documents: complete as T["identity_documents"] };
}

/** Ensures each offer passenger has exactly one checkout row and ids match. */
export function assertPassengersMatchOffer(
  offer: FlightOfferDTO,
  passengers: Array<{ passenger_id: string }>,
): void {
  const offerIds = new Set(offer.passengers.map((p) => p.id).sort());
  const bodyIds = new Set(passengers.map((p) => p.passenger_id).sort());
  if (offerIds.size === 0) {
    throw new AppError(400, "Offer has no passengers; cannot book.", "VALIDATION_ERROR");
  }
  if (offerIds.size !== bodyIds.size || ![...offerIds].every((id) => bodyIds.has(id))) {
    throw new AppError(
      400,
      "Passenger list must match offer passengers exactly.",
      "PASSENGER_MISMATCH",
    );
  }
}
