import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { ValidationError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/response";
import { requireUserId } from "@/lib/authz/server";
import { getServerAuthz } from "@/lib/authz/session";
import { REQUEST_ID_HEADER, getRequestId } from "@/lib/obs/request-id";
import { listMyFlightLedgerEvents } from "@/lib/services/flights/flight-ledger.service";
import { myFlightLedgerQuerySchema } from "@/lib/validations/flight-ledger.schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const requestId = getRequestId((name) => req.headers.get(name));
  try {
    const { userId, authz } = await getServerAuthz();
    const uid = await requireUserId(userId);
    const sp = req.nextUrl.searchParams;
    const parsed = myFlightLedgerQuerySchema.safeParse({
      page: sp.get("page") ?? undefined,
      limit: sp.get("limit") ?? undefined,
      sort: sp.get("sort") ?? undefined,
      order: sp.get("order") ?? undefined,
      event_type: sp.get("event_type") ?? undefined,
      direction: sp.get("direction") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues);
    }

    const data = await listMyFlightLedgerEvents({
      authz,
      userId: uid,
      query: parsed.data,
    });
    const res = successResponse(data, 200);
    res.headers.set(REQUEST_ID_HEADER, requestId);
    return res;
  } catch (e) {
    const res = handleApiError(e);
    res.headers.set(REQUEST_ID_HEADER, requestId);
    return res;
  }
}
