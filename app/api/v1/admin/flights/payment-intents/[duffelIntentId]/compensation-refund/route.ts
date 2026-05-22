import { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { AppError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/response";
import { hasPermission } from "@/lib/authz";
import { ForbiddenError } from "@/lib/authz/errors";
import { requireUserId } from "@/lib/authz/server";
import { getServerAuthz } from "@/lib/authz/session";
import { isDuffelConfigured } from "@/lib/duffel/config";
import { retryCompensationRefundForPit } from "@/lib/services/flights/flight-refund.service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ duffelIntentId: string }> };

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
    const { duffelIntentId } = await context.params;
    if (!duffelIntentId?.startsWith("pit_")) {
      throw new AppError(400, "Invalid payment intent id.", "VALIDATION_ERROR");
    }

    const result = await retryCompensationRefundForPit({
      duffelIntentId,
      adminRetry: true,
    });

    return successResponse(result, 200);
  } catch (e) {
    return handleApiError(e);
  }
}
