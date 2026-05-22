import "server-only";

import { prisma } from "@/lib/prisma";
import { getExpectedChildAgesFromSearch } from "@/lib/flights/passenger-age-rules";
import type { FlightPassengerValidationContext } from "@/lib/flights/flight-passenger-booking-validation";

export async function loadFlightPassengerValidationContext(
  searchSessionId: string | null | undefined,
): Promise<FlightPassengerValidationContext> {
  const id = searchSessionId?.trim();
  if (!id) return {};

  const session = await prisma.flightSearchSession.findUnique({
    where: { id },
    select: { params_json: true, expires_at: true },
  });
  if (!session || session.expires_at.getTime() < Date.now()) {
    return {};
  }

  return {
    searchPassengers: getExpectedChildAgesFromSearch(session.params_json),
  };
}
