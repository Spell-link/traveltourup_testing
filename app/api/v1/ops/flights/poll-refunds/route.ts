import "server-only";
import { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { assertOpsAuthorised } from "@/lib/api/ops-auth";
import { successResponse } from "@/lib/api/response";
import { getRequestId } from "@/lib/obs/request-id";
import { pollPendingCompensationRefunds, pollPendingFlightRefunds } from "@/lib/services/flights/flight-ops.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    assertOpsAuthorised((name) => req.headers.get(name));
    const requestId = getRequestId((name) => req.headers.get(name));
    const cancellationRefunds = await pollPendingFlightRefunds({ requestId });
    const compensationRefunds = await pollPendingCompensationRefunds({ requestId });
    return successResponse(
      {
        request_id: requestId,
        cancellation_refunds: cancellationRefunds,
        compensation_refunds: compensationRefunds,
      },
      200,
    );
  } catch (e) {
    return handleApiError(e);
  }
}
