import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { AppError } from "@/lib/api/errors";
import { clientIpFromHeaders, rateLimitByKey } from "@/lib/api/rate-limit-ip";
import { getServerAuthz } from "@/lib/authz/session";
import { duffelFetch } from "@/lib/duffel/client";
import { isDuffelConfigured } from "@/lib/duffel/config";

/**
 * Issues a short-lived Duffel `component_client_key` used by `@duffel/components`
 * (`DuffelPayments`, etc.). Authenticated only so anonymous callers cannot mint
 * keys against our Duffel organisation. Response shape is kept backward
 * compatible with `HotelCheckoutDuffel`: `{ client_key }`.
 */
export const dynamic = "force-dynamic";

const AUTH_PER_MINUTE = 30;

type DuffelComponentKeyResponse = {
  data?: { component_client_key?: string };
};

export async function GET(req: NextRequest) {
  try {
    if (!isDuffelConfigured()) {
      throw new AppError(503, "Flights are not configured.", "FLIGHTS_NOT_CONFIGURED");
    }

    const { userId } = await getServerAuthz();
    if (!userId) {
      throw new AppError(401, "Authentication required.", "UNAUTHORIZED");
    }

    const ip = clientIpFromHeaders((n) => req.headers.get(n));
    const limitKey = `duffel-client-key:user:${userId}:${ip}`;
    const rl = rateLimitByKey(limitKey, AUTH_PER_MINUTE);
    if (!rl.ok) {
      throw new AppError(429, "Too many requests. Please try again shortly.", "RATE_LIMITED");
    }

    const result = await duffelFetch<DuffelComponentKeyResponse>(
      "/identity/component_client_keys",
      { method: "POST", body: JSON.stringify({}) },
    );
    const clientKey = result?.data?.component_client_key;
    if (!clientKey) {
      throw new AppError(502, "Could not obtain Duffel client key.", "UPSTREAM_ERROR");
    }

    return NextResponse.json({ client_key: clientKey }, { status: 200 });
  } catch (e) {
    return handleApiError(e);
  }
}
