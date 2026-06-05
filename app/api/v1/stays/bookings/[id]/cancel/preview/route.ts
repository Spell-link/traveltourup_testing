import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { successResponse } from "@/lib/api/response";
import { requireUserId } from "@/lib/authz/server";
import { getServerAuthz } from "@/lib/authz/session";
import { getStaysBookingCancelPreview } from "@/lib/services/stays/stays-cancel-preview.service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const bookingId = id?.trim();
    if (!bookingId) {
      return handleApiError(new Error("Booking id is required."));
    }

    const { userId, authz } = await getServerAuthz();
    const uid = await requireUserId(userId);

    const data = await getStaysBookingCancelPreview({
      authz,
      userId: uid,
      bookingId,
    });

    return successResponse(data, 200);
  } catch (e) {
    return handleApiError(e);
  }
}
