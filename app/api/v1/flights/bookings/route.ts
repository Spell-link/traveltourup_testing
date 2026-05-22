import { after, NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { AppError, ValidationError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/response";
import { requireUserId } from "@/lib/authz/server";
import { getServerAuthz } from "@/lib/authz/session";
import { isDuffelConfigured } from "@/lib/duffel/config";
import { logger } from "@/lib/obs/logger";
import { REQUEST_ID_HEADER, getRequestId } from "@/lib/obs/request-id";
import {
  createDuffelHoldFlightBooking,
  createDuffelInstantFlightBooking,
} from "@/lib/services/flights/flights-booking.service";
import { flightCheckoutBookingBodySchema } from "@/lib/validations/flight-checkout.schema";
import { notifyFlightBookingConfirmed } from "@/lib/services/flights/flight-booking-notify.service";

export const dynamic = "force-dynamic";

const BOOKING_IDEMPOTENCY_HEADER = "idempotency-key";

function withCorrelationHeader<R extends NextResponse<unknown>>(res: R, requestId: string): R {
  res.headers.set(REQUEST_ID_HEADER, requestId);
  return res;
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId((name) => req.headers.get(name));
  const log = logger.withContext({ request_id: requestId });
  try {
    if (!isDuffelConfigured()) {
      throw new AppError(503, "Flight bookings are not configured.", "FLIGHTS_NOT_CONFIGURED");
    }

    const { userId, authz } = await getServerAuthz();
    const uid = await requireUserId(userId);

    const json = (await req.json()) as unknown;
    const parsed = flightCheckoutBookingBodySchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues);
    }

    const idem = req.headers.get(BOOKING_IDEMPOTENCY_HEADER)?.trim() || null;
    if (idem && idem.length > 128) {
      throw new AppError(400, "Idempotency-Key is too long.", "VALIDATION_ERROR");
    }

    log.info("Flight booking request received", {
      user_id: uid,
      booking_id: null,
      pit_id: parsed.data.payment_intent_id ?? null,
      duffel_order_id: null,
      error_code: parsed.data.order_mode,
    });

    const booking =
      parsed.data.order_mode === "hold"
        ? await createDuffelHoldFlightBooking({
            authz,
            userId: uid,
            body: parsed.data,
            idempotencyKey: idem,
          })
        : await createDuffelInstantFlightBooking({
            authz,
            userId: uid,
            body: parsed.data,
            idempotencyKey: idem,
          });

    const bookingId = typeof booking.id === "string" ? booking.id : null;
    if (bookingId) {
      after(() => {
        void notifyFlightBookingConfirmed(bookingId).catch((err) => {
          log.warn("Flight booking confirmation job failed", { error: String(err) });
        });
      });
    }

    return withCorrelationHeader(successResponse(booking, 201), requestId);
  } catch (e) {
    const code = e instanceof AppError ? e.code ?? "ERROR" : "ERROR";
    log.warn("Flight booking request failed", { error_code: code });
    return withCorrelationHeader(handleApiError(e), requestId);
  }
}
