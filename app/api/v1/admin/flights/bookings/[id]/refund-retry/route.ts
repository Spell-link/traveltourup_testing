import { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { AppError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/response";
import { hasPermission } from "@/lib/authz";
import { ForbiddenError } from "@/lib/authz/errors";
import { requireUserId } from "@/lib/authz/server";
import { getServerAuthz } from "@/lib/authz/session";
import { isDuffelConfigured } from "@/lib/duffel/config";
import { bookingRepository } from "@/lib/db/repositories/booking.repository";
import { prisma } from "@/lib/prisma";
import { retryDuffelFlightRefundForBooking } from "@/lib/services/flights/flight-refund.service";
import { serializeBookingResponse } from "@/lib/services/booking.service";
import { bookingIdParamSchema } from "@/lib/validations/booking.schema";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const { userId, authz } = await getServerAuthz();
  await requireUserId(userId);
  if (!authz || !hasPermission(authz, "bookings:manage")) {
    throw new ForbiddenError();
  }
}

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    if (!isDuffelConfigured()) {
      throw new AppError(503, "Flight bookings are not configured.", "FLIGHTS_NOT_CONFIGURED");
    }

    await requireAdmin();
    const { id } = bookingIdParamSchema.parse(await context.params);

    const row = await bookingRepository.findById(id);
    if (!row) {
      throw new AppError(404, "Booking not found.", "NOT_FOUND");
    }
    if (row.type !== "flight" || !row.flightBooking) {
      throw new AppError(400, "Only flight bookings support refunds.", "VALIDATION_ERROR");
    }
    if (row.status !== "cancelled") {
      throw new AppError(409, "Booking must be cancelled before retrying a refund.", "BOOKING_NOT_CANCELLED");
    }

    const oc = await prisma.flightOrderCancellation.findFirst({
      where: { flight_booking_id: row.flightBooking.id, status: "confirmed" },
      orderBy: { id: "desc" },
    });
    if (!oc) {
      throw new AppError(400, "No confirmed cancellation found for this booking.", "NOT_FOUND");
    }
    if (oc.refund_to === "airline_credits") {
      throw new AppError(400, "This cancellation was refunded as airline credits.", "VALIDATION_ERROR");
    }

    const result = await retryDuffelFlightRefundForBooking({
      bookingId: row.id,
      flightOrderCancellationId: oc.id,
      refundTo: oc.refund_to,
      refundAmount: oc.refund_amount,
      refundCurrency: oc.refund_currency,
      bookingTotalAmount: row.total_amount,
      adminRetry: true,
    });

    const updated = await bookingRepository.findById(row.id);
    if (!updated) {
      throw new AppError(500, "Booking disappeared after refund retry.", "INTERNAL_ERROR");
    }

    return successResponse(
      {
        refund: result,
        booking: serializeBookingResponse(updated),
      },
      200,
    );
  } catch (e) {
    return handleApiError(e);
  }
}
