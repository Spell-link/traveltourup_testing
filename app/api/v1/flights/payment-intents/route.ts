import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { AppError, ValidationError } from "@/lib/api/errors";
import { clientIpFromHeaders, rateLimitByKey } from "@/lib/api/rate-limit-ip";
import { successResponse } from "@/lib/api/response";
import { getServerAuthz } from "@/lib/authz/session";
import { isDuffelConfigured } from "@/lib/duffel/config";
import { createFlightCheckoutPaymentIntent } from "@/lib/services/flights/flight-payment-intent.service";
import { createFlightPaymentIntentBodySchema } from "@/lib/validations/flight-payment.schema";

export const dynamic = "force-dynamic";

const ANON_PER_MINUTE = 20;
const AUTH_PER_MINUTE = 40;

const IDEMPOTENCY_HEADER = "idempotency-key";

export async function POST(req: NextRequest) {
  try {
    if (!isDuffelConfigured()) {
      throw new AppError(503, "Flight payments are not configured.", "FLIGHTS_NOT_CONFIGURED");
    }

    const { userId } = await getServerAuthz();
    const ip = clientIpFromHeaders((n) => req.headers.get(n));
    const limitKey = userId
      ? `flight-pit:user:${userId}`
      : `flight-pit:ip:${ip}`;
    const max = userId ? AUTH_PER_MINUTE : ANON_PER_MINUTE;
    const rl = rateLimitByKey(limitKey, max);
    if (!rl.ok) {
      throw new AppError(429, "Too many requests. Please try again shortly.", "RATE_LIMITED");
    }

    const json = (await req.json()) as unknown;
    const parsed = createFlightPaymentIntentBodySchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues);
    }

    const idem = req.headers.get(IDEMPOTENCY_HEADER)?.trim() || null;
    if (idem && idem.length > 128) {
      throw new AppError(400, "Idempotency-Key is too long.", "VALIDATION_ERROR");
    }

    const data = await createFlightCheckoutPaymentIntent({
      offerId: parsed.data.offer_id.trim(),
      idempotencyKey: idem,
      services: parsed.data.services,
      userId,
    });

    return successResponse(data, 200);
  } catch (e) {
    return handleApiError(e);
  }
}
