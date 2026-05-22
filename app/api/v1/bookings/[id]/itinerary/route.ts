import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { AppError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/response";
import { requireUserId } from "@/lib/authz/server";
import { hasPermission } from "@/lib/authz";
import { getServerAuthz } from "@/lib/authz/session";
import { bookingRepository } from "@/lib/db/repositories/booking.repository";
import { flightItineraryDownloadFilename } from "@/lib/flights/itinerary-pdf.constants";
import { buildFlightItineraryPdfBufferFromBooking } from "@/lib/services/flights/flight-itinerary-pdf-input";
import { ensureFlightTicketAndNotify } from "@/lib/services/flights/flight-ticket-document.service";
import { bookingIdParamSchema } from "@/lib/validations/booking.schema";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Streams the PDF through our origin with `Content-Disposition: attachment` so the browser
 * downloads the file (OTA-style) instead of opening a redirect URL in-tab.
 */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { userId, authz } = await getServerAuthz();
    await requireUserId(userId);
    if (!authz) {
      throw new AppError(403, "Forbidden.", "FORBIDDEN");
    }

    const { id } = bookingIdParamSchema.parse(await ctx.params);

    const canReadAll = hasPermission(authz, "bookings:read_all");
    if (!canReadAll && !hasPermission(authz, "bookings:read_own")) {
      throw new AppError(403, "Forbidden.", "FORBIDDEN");
    }

    const row = await bookingRepository.findById(id);
    if (!row) {
      throw new AppError(404, "Booking not found.", "NOT_FOUND");
    }
    if (!canReadAll && row.user_id !== userId) {
      throw new AppError(403, "Forbidden.", "FORBIDDEN");
    }

    const fb = row.flightBooking;
    if (!fb?.itinerary_snapshot) {
      throw new AppError(409, "Itinerary PDF is not ready yet.", "TICKET_NOT_READY");
    }

    const pdfBuffer = await buildFlightItineraryPdfBufferFromBooking(row, fb);
    const filename = flightItineraryDownloadFilename(row.booking_ref_no);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(_req: NextRequest, ctx: RouteContext) {
  try {
    const { userId, authz } = await getServerAuthz();
    await requireUserId(userId);
    if (!authz || !hasPermission(authz, "bookings:manage")) {
      throw new AppError(403, "Forbidden.", "FORBIDDEN");
    }

    const { id } = bookingIdParamSchema.parse(await ctx.params);

    const row = await bookingRepository.findById(id);
    if (!row) {
      throw new AppError(404, "Booking not found.", "NOT_FOUND");
    }

    if (row.type !== "flight" || !row.flightBooking) {
      throw new AppError(400, "Only flight bookings have itinerary PDFs.", "VALIDATION_ERROR");
    }

    await ensureFlightTicketAndNotify(id, { force: true, sendStandaloneItineraryEmail: true });

    return successResponse({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
