import { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { AppError, ValidationError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/response";
import { requireUserId } from "@/lib/authz/server";
import { getServerAuthz } from "@/lib/authz/session";
import { isDuffelConfigured } from "@/lib/duffel/config";
import { confirmOrderChangeForBooking } from "@/lib/services/flights/flight-order-change.service";
import { flightOrderChangeConfirmBodySchema } from "@/lib/validations/flight-order-change.schema";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; changeId: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    if (!isDuffelConfigured()) {
      throw new AppError(503, "Flight bookings are not configured.", "FLIGHTS_NOT_CONFIGURED");
    }
    const { userId, authz } = await getServerAuthz();
    const uid = await requireUserId(userId);
    const { id, changeId } = await ctx.params;

    const json = (await req.json()) as unknown;
    const parsed = flightOrderChangeConfirmBodySchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues);
    }

    const result = await confirmOrderChangeForBooking({
      authz,
      userId: uid,
      bookingId: id,
      orderChangeId: changeId,
      body: parsed.data,
    });
    return successResponse(result);
  } catch (e) {
    return handleApiError(e);
  }
}
