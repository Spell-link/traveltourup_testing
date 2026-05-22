import "server-only";
import { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { assertOpsAuthorised } from "@/lib/api/ops-auth";
import { successResponse } from "@/lib/api/response";
import { getRequestId } from "@/lib/obs/request-id";
import { expireStaleOrderChangeQuotes } from "@/lib/services/flights/flight-ops.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    assertOpsAuthorised((name) => req.headers.get(name));
    const requestId = getRequestId((name) => req.headers.get(name));
    const result = await expireStaleOrderChangeQuotes({ requestId });
    return successResponse({ request_id: requestId, ...result }, 200);
  } catch (e) {
    return handleApiError(e);
  }
}
