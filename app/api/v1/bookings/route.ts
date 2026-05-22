import { NextRequest } from "next/server";
import { getServerAuthz } from "@/lib/authz/session";
import { requireUserId } from "@/lib/authz/server";
import { handleApiError } from "@/lib/api/error-handler";
import { paginatedResponse, successResponse } from "@/lib/api/response";
import { createBooking, listBookings } from "@/lib/services/booking.service";
import { bookingQuerySchema, createBookingSchema } from "@/lib/validations/booking.schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { userId, authz } = await getServerAuthz();
    await requireUserId(userId);

    const { searchParams } = new URL(req.url);
    /** `searchParams.get` returns `null` when missing; Zod `.optional()` expects `undefined`, not `null`. */
    const qp = (raw: string | null) => (raw === null || raw === "" ? undefined : raw);
    const query = bookingQuerySchema.parse({
      status: qp(searchParams.get("status")),
      type: qp(searchParams.get("type")),
      page: qp(searchParams.get("page")),
      limit: qp(searchParams.get("limit")),
      q: qp(searchParams.get("q")),
      sort: qp(searchParams.get("sort")),
      order: qp(searchParams.get("order")),
    });

    const result = await listBookings({
      authz,
      requestingUserId: userId!,
      query,
    });

    return paginatedResponse(result.items, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, authz } = await getServerAuthz();
    await requireUserId(userId);

    const body = await req.json();
    const data = createBookingSchema.parse(body);
    const booking = await createBooking({
      authz,
      requestingUserId: userId!,
      body: data,
    });
    return successResponse(booking, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
