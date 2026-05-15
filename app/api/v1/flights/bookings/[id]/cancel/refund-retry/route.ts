import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { AppError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/response";
import { requireUserId } from "@/lib/authz/server";
import { getServerAuthz } from "@/lib/authz/session";
import { isDuffelConfigured } from "@/lib/duffel/config";
import { processDuffelFlightBookingRefundRetry } from "@/lib/services/flights/flight-cancel.service";
import { bookingIdParamSchema } from "@/lib/validations/booking.schema";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    if (!isDuffelConfigured()) {
      throw new AppError(503, "Flight bookings are not configured.", "FLIGHTS_NOT_CONFIGURED");
    }

    const { userId, authz } = await getServerAuthz();
    const uid = await requireUserId(userId);

    const { id } = bookingIdParamSchema.parse(await context.params);

    const data = await processDuffelFlightBookingRefundRetry({
      authz,
      userId: uid,
      bookingId: id,
    });

    return successResponse(data, 200);
  } catch (e) {
    return handleApiError(e);
  }
}
