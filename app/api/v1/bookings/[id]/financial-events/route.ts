import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { successResponse } from "@/lib/api/response";
import { requireUserId } from "@/lib/authz/server";
import { getServerAuthz } from "@/lib/authz/session";
import { REQUEST_ID_HEADER, getRequestId } from "@/lib/obs/request-id";
import { listBookingFinancialEvents } from "@/lib/services/flights/flight-financial-events.service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const requestId = getRequestId((name) => req.headers.get(name));
  try {
    const { userId, authz } = await getServerAuthz();
    const uid = await requireUserId(userId);
    const { id } = await ctx.params;

    const events = await listBookingFinancialEvents({
      authz,
      userId: uid,
      bookingId: id,
    });

    const res = successResponse({ booking_id: id, events }, 200);
    res.headers.set(REQUEST_ID_HEADER, requestId);
    return res;
  } catch (e) {
    const res = handleApiError(e);
    res.headers.set(REQUEST_ID_HEADER, requestId);
    return res;
  }
}
