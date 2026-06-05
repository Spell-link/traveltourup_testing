import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { AppError, ValidationError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/response";
import { requireUserId } from "@/lib/authz/server";
import { getServerAuthz } from "@/lib/authz/session";
import { processStaysBookingCancel } from "@/lib/services/stays/stays-cancel.service";
import { staysBookingCancelBodySchema } from "@/lib/validations/stays.schema";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const bookingId = id?.trim();
    if (!bookingId) {
      throw new AppError(400, "Booking id is required.", "VALIDATION_ERROR");
    }

    const { userId, authz } = await getServerAuthz();
    const uid = await requireUserId(userId);

    const json = (await req.json()) as unknown;
    const parsed = staysBookingCancelBodySchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues);
    }

    const data = await processStaysBookingCancel({
      authz,
      userId: uid,
      bookingId,
      body: parsed.data,
    });

    return successResponse(data, 200);
  } catch (e) {
    return handleApiError(e);
  }
}
