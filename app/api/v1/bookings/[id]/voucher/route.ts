import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { AppError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/response";
import { requireUserId } from "@/lib/authz/server";
import { hasPermission } from "@/lib/authz";
import { getServerAuthz } from "@/lib/authz/session";
import { bookingRepository } from "@/lib/db/repositories/booking.repository";
import { hotelConfirmationDownloadFilename } from "@/lib/hotels/confirmation-pdf.constants";
import { prisma } from "@/lib/prisma";
import { buildHotelConfirmationPdfBufferFromBooking } from "@/lib/services/stays/hotel-confirmation-pdf-input";
import { ensureHotelVoucherAndNotify } from "@/lib/services/stays/hotel-voucher-document.service";
import { bookingIdParamSchema } from "@/lib/validations/booking.schema";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

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

    const hb = row.hotelBooking;
    if (!hb || row.type !== "hotel") {
      throw new AppError(409, "Hotel confirmation PDF is not available.", "VOUCHER_NOT_READY");
    }

    if (!hb.stays_raw && !hb.accommodation_snapshot) {
      throw new AppError(409, "Hotel confirmation PDF is not ready yet.", "VOUCHER_NOT_READY");
    }

    const pdfBuffer = await buildHotelConfirmationPdfBufferFromBooking(row, hb);
    const filename = hotelConfirmationDownloadFilename(row.booking_ref_no);

    await prisma.hotelBooking.update({
      where: { id: hb.id },
      data: {
        confirmation_pdf_generation_failed_at: null,
        confirmation_pdf_error: null,
      },
    });

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

    await ensureHotelVoucherAndNotify(id, { force: true });
    return successResponse({ ok: true }, 200);
  } catch (error) {
    return handleApiError(error);
  }
}
