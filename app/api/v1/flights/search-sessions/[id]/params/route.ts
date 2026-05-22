import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { AppError } from "@/lib/api/errors";
import { clientIpFromHeaders, rateLimitByKey } from "@/lib/api/rate-limit-ip";
import { successResponse } from "@/lib/api/response";
import { getServerAuthz } from "@/lib/authz/session";
import { isDuffelConfigured } from "@/lib/duffel/config";
import { prisma } from "@/lib/prisma";
import { getExpectedChildAgesFromSearch } from "@/lib/flights/passenger-age-rules";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const ANON_PER_MINUTE = 30;
const AUTH_PER_MINUTE = 90;

export async function GET(req: NextRequest, context: Ctx) {
  try {
    if (!isDuffelConfigured()) {
      throw new AppError(503, "Flight search is not configured.", "FLIGHTS_NOT_CONFIGURED");
    }

    const { userId } = await getServerAuthz();
    const ip = clientIpFromHeaders((n) => req.headers.get(n));
    const limitKey = userId ? `flight-session-params:user:${userId}` : `flight-session-params:ip:${ip}`;
    const max = userId ? AUTH_PER_MINUTE : ANON_PER_MINUTE;
    const rl = rateLimitByKey(limitKey, max);
    if (!rl.ok) {
      throw new AppError(429, "Too many requests.", "RATE_LIMITED");
    }

    const { id } = await context.params;
    if (!id?.trim()) throw new AppError(400, "Session id required.", "VALIDATION_ERROR");

    const session = await prisma.flightSearchSession.findUnique({
      where: { id: id.trim() },
      select: { params_json: true, expires_at: true },
    });
    if (!session) {
      throw new AppError(404, "Search session not found.", "NOT_FOUND");
    }
    if (session.expires_at.getTime() < Date.now()) {
      throw new AppError(410, "Search session expired. Run a new search.", "GONE");
    }

    const searchPassengers = getExpectedChildAgesFromSearch(session.params_json);

    return successResponse({
      passengers: searchPassengers,
      expires_at: session.expires_at.toISOString(),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
