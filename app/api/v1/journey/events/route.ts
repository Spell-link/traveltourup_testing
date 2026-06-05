import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { AppError, ValidationError } from "@/lib/api/errors";
import { rateLimitByKey } from "@/lib/api/rate-limit-ip";
import { successResponse } from "@/lib/api/response";
import { requireUserId } from "@/lib/authz/server";
import { getServerAuthz } from "@/lib/authz/session";
import { recordJourneyEvent } from "@/lib/services/journey/customer-journey.service";
import { journeyEventBodySchema } from "@/lib/validations/customer-journey.schema";

export const dynamic = "force-dynamic";

const PER_MINUTE = 120;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await getServerAuthz();
    const uid = await requireUserId(userId);

    const rl = rateLimitByKey(`journey-events:user:${uid}`, PER_MINUTE);
    if (!rl.ok) {
      throw new AppError(429, "Too many requests. Please try again shortly.", "RATE_LIMITED");
    }

    const json = (await req.json()) as unknown;
    const parsed = journeyEventBodySchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues);
    }

    const body = parsed.data;
    const preserveStage =
      body.event_type === "product.enriched" || (json as { preserve_stage?: boolean }).preserve_stage === true;

    await recordJourneyEvent({
      userId: uid,
      eventType: body.event_type,
      productType: body.product_type,
      productRef: body.product_ref,
      stage: body.stage,
      properties: body.properties ?? null,
      clientEventId: body.client_event_id ?? null,
      title: body.title ?? null,
      subtitle: body.subtitle ?? null,
      priceAmount: body.price_amount ?? null,
      priceCurrency: body.price_currency ?? null,
      searchContext: body.search_context ?? null,
      tripSnapshot: body.trip_snapshot ?? null,
      preserveStage,
    });

    return successResponse({ ok: true }, 200);
  } catch (e) {
    return handleApiError(e);
  }
}
