import { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { AppError, ValidationError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/response";
import { requireUserId } from "@/lib/authz/server";
import { getServerAuthz } from "@/lib/authz/session";
import { isDuffelConfigured } from "@/lib/duffel/config";
import {
  listOrderChangesForBooking,
  requestOrderChangeQuote,
} from "@/lib/services/flights/flight-order-change.service";
import { flightOrderChangeQuoteBodySchema } from "@/lib/validations/flight-order-change.schema";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    if (!isDuffelConfigured()) {
      throw new AppError(503, "Flight bookings are not configured.", "FLIGHTS_NOT_CONFIGURED");
    }
    const { userId, authz } = await getServerAuthz();
    const uid = await requireUserId(userId);
    const { id } = await ctx.params;
    const items = await listOrderChangesForBooking({
      authz,
      userId: uid,
      bookingId: id,
    });
    return successResponse({ booking_id: id, order_changes: items });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    if (!isDuffelConfigured()) {
      throw new AppError(503, "Flight bookings are not configured.", "FLIGHTS_NOT_CONFIGURED");
    }
    const { userId, authz } = await getServerAuthz();
    const uid = await requireUserId(userId);
    const { id } = await ctx.params;
    const json = (await req.json()) as unknown;
    const parsed = flightOrderChangeQuoteBodySchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues);
    }
    const result = await requestOrderChangeQuote({
      authz,
      userId: uid,
      bookingId: id,
      body: parsed.data,
    });
    return successResponse(result, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
