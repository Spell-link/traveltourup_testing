import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { AppError, ValidationError } from "@/lib/api/errors";
import { clientIpFromHeaders, rateLimitByKey } from "@/lib/api/rate-limit-ip";
import { successResponse } from "@/lib/api/response";
import { requireUserId } from "@/lib/authz/server";
import { getServerAuthz } from "@/lib/authz/session";
import { isDuffelConfigured } from "@/lib/duffel/config";
import { isStripeConfigured } from "@/lib/payments/stripe-client";
import { createStaysCheckoutPrepare } from "@/lib/services/stays/stays-checkout-prepare.service";
import { staysCheckoutPrepareBodySchema } from "@/lib/validations/stays.schema";

export const dynamic = "force-dynamic";

const IDEMPOTENCY_HEADER = "idempotency-key";
const PER_MINUTE = 30;

export async function POST(req: NextRequest) {
  try {
    if (!isDuffelConfigured()) {
      throw new AppError(503, "Stays are not configured.", "STAYS_NOT_CONFIGURED");
    }
    if (!isStripeConfigured()) {
      throw new AppError(503, "Stripe payments are not configured.", "STRIPE_NOT_CONFIGURED");
    }

    const { userId, authz } = await getServerAuthz();
    const uid = await requireUserId(userId);

    const ip = clientIpFromHeaders((n) => req.headers.get(n));
    const rl = rateLimitByKey(`stays-prepare:user:${uid}:${ip}`, PER_MINUTE);
    if (!rl.ok) {
      throw new AppError(429, "Too many requests. Please try again shortly.", "RATE_LIMITED");
    }

    const json = (await req.json()) as unknown;
    const parsed = staysCheckoutPrepareBodySchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues);
    }

    const idem = req.headers.get(IDEMPOTENCY_HEADER)?.trim() || null;
    if (idem && idem.length > 128) {
      throw new AppError(400, "Idempotency-Key is too long.", "VALIDATION_ERROR");
    }

    const data = await createStaysCheckoutPrepare({
      authz,
      userId: uid,
      body: parsed.data,
      idempotencyKey: idem,
    });

    return successResponse(data, 200);
  } catch (e) {
    return handleApiError(e);
  }
}
