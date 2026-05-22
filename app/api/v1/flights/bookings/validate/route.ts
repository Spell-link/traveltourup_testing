import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { AppError, ValidationError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/response";
import { getServerAuthz } from "@/lib/authz/session";
import { isDuffelConfigured } from "@/lib/duffel/config";
import {
  collectFlightPassengerBookingIssues,
} from "@/lib/flights/flight-passenger-booking-validation";
import { loadFlightPassengerValidationContext } from "@/lib/flights/flight-checkout-validation-context";
import { refreshFlightOffer } from "@/lib/services/flights/flights-offer.service";
import {
  assertPassengersMatchOffer,
  flightCheckoutValidateBodySchema,
  normalizeFlightCheckoutContact,
  sanitizePassengerIdentityDocuments,
} from "@/lib/validations/flight-checkout.schema";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (!isDuffelConfigured()) {
      throw new AppError(503, "Flight bookings are not configured.", "FLIGHTS_NOT_CONFIGURED");
    }

    await getServerAuthz();

    const json = (await req.json()) as unknown;
    const parsed = flightCheckoutValidateBodySchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues);
    }

    const offer = await refreshFlightOffer(parsed.data.offer_id);
    assertPassengersMatchOffer(offer, parsed.data.passengers);

    const validationCtx = await loadFlightPassengerValidationContext(parsed.data.search_session_id);

    const contact = normalizeFlightCheckoutContact(parsed.data.contact);
    const passengers = parsed.data.passengers.map(sanitizePassengerIdentityDocuments);

    const issues = collectFlightPassengerBookingIssues(offer, passengers, {
      ...validationCtx,
      contact,
    });

    return successResponse({
      valid: issues.length === 0,
      issues: issues.map((iss) => ({
        path: iss.path,
        code: iss.code,
        values: iss.values ?? null,
      })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
