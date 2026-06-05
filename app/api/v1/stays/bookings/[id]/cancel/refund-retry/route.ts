import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { successResponse } from "@/lib/api/response";
import { requireUserId } from "@/lib/authz/server";
import { getServerAuthz } from "@/lib/authz/session";
import { processStaysBookingRefundRetry } from "@/lib/services/stays/stays-cancel.service";
import { bookingIdParamSchema } from "@/lib/validations/booking.schema";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { userId, authz } = await getServerAuthz();
    const uid = await requireUserId(userId);
    const { id } = bookingIdParamSchema.parse(await context.params);

    const booking = await processStaysBookingRefundRetry({
      authz,
      userId: uid,
      bookingId: id,
    });

    return successResponse({ booking }, 200);
  } catch (e) {
    return handleApiError(e);
  }
}
